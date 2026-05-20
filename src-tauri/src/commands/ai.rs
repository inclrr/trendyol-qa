use crate::ai::gemini::GeminiClient;
use crate::ai::openrouter::OpenRouterClient;
use crate::ai::prompt::{base_system_prompt, build_answer_prompt, build_training_prompt};
use crate::ai::rag::{fetch_similar, format_context};
use crate::ai::{AiModel, AiProvider, GenerationRequest};
use crate::commands::questions::fetch_history_for_training;
use crate::commands::secrets;
use crate::errors::{AppError, AppResult};
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderRow {
    pub id: Option<i64>,
    pub provider: String,
    pub display_name: String,
    pub selected_model: Option<String>,
    pub base_url: Option<String>,
    pub active: bool,
    pub created_at: i64,
    pub has_api_key: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpsertProviderPayload {
    pub provider: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "selectedModel")]
    pub selected_model: Option<String>,
    #[serde(rename = "baseUrl")]
    pub base_url: Option<String>,
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
}

fn row_to_provider(row: &rusqlite::Row) -> rusqlite::Result<(AiProviderRow, String)> {
    let provider: String = row.get(1)?;
    let p = AiProviderRow {
        id: Some(row.get(0)?),
        provider: provider.clone(),
        display_name: row.get(2)?,
        selected_model: row.get(3)?,
        base_url: row.get(4)?,
        active: row.get::<_, i64>(5)? != 0,
        created_at: row.get(6)?,
        has_api_key: false,
    };
    Ok((p, provider))
}

#[tauri::command]
pub async fn list_ai_providers(state: State<'_, Arc<AppState>>) -> AppResult<Vec<AiProviderRow>> {
    let conn = state.db.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, provider, display_name, selected_model, base_url, active, created_at \
         FROM ai_providers ORDER BY provider",
    )?;
    let rows: Vec<(AiProviderRow, String)> = stmt
        .query_map([], row_to_provider)?
        .filter_map(|r| r.ok())
        .collect();
    let result = rows
        .into_iter()
        .map(|(mut p, prov)| {
            p.has_api_key = secrets::read_ai_key(&prov).is_ok();
            p
        })
        .collect();
    Ok(result)
}

#[tauri::command]
pub async fn upsert_ai_provider(
    state: State<'_, Arc<AppState>>,
    payload: UpsertProviderPayload,
) -> AppResult<AiProviderRow> {
    let now = Utc::now().timestamp_millis();
    let conn = state.db.get()?;
    // selected_model null geldiyse mevcut değeri koru, dolu geldiyse override.
    // COALESCE'i kaldırdık çünkü bazı durumlarda davranış bekleneceği gibi olmuyordu —
    // değeri SQL tarafında değil, app tarafında karar verip belirgin gönderiyoruz.
    let current_model: Option<String> = conn
        .query_row(
            "SELECT selected_model FROM ai_providers WHERE provider = ?1",
            params![payload.provider],
            |r| r.get(0),
        )
        .unwrap_or(None);
    let final_model = payload
        .selected_model
        .clone()
        .or(current_model);
    log::info!(
        "upsert_ai_provider: provider={} selected_model={:?} base_url={:?}",
        payload.provider,
        final_model,
        payload.base_url
    );
    conn.execute(
        "INSERT INTO ai_providers (provider, display_name, selected_model, base_url, active, created_at) \
         VALUES (?1, ?2, ?3, ?4, 0, ?5) \
         ON CONFLICT(provider) DO UPDATE SET \
            display_name = excluded.display_name, \
            selected_model = excluded.selected_model, \
            base_url = excluded.base_url",
        params![
            payload.provider,
            payload.display_name,
            final_model,
            payload.base_url,
            now
        ],
    )?;
    if let Some(key) = payload.api_key {
        if !key.trim().is_empty() {
            secrets::save_ai_key(&payload.provider, &key)?;
        }
    }
    let row = conn.query_row(
        "SELECT id, provider, display_name, selected_model, base_url, active, created_at \
         FROM ai_providers WHERE provider = ?1",
        params![payload.provider],
        |r| row_to_provider(r),
    )?;
    let (mut p, prov) = row;
    p.has_api_key = secrets::read_ai_key(&prov).is_ok();
    Ok(p)
}

#[tauri::command]
pub async fn set_active_provider(
    state: State<'_, Arc<AppState>>,
    provider: String,
) -> AppResult<()> {
    let conn = state.db.get()?;
    conn.execute("UPDATE ai_providers SET active = 0", [])?;
    conn.execute(
        "UPDATE ai_providers SET active = 1 WHERE provider = ?1",
        params![provider],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn delete_ai_provider(
    state: State<'_, Arc<AppState>>,
    provider: String,
) -> AppResult<()> {
    let conn = state.db.get()?;
    conn.execute("DELETE FROM ai_providers WHERE provider = ?1", params![provider])?;
    let _ = secrets::delete_ai_key(&provider);
    Ok(())
}

fn build_provider(
    provider: &str,
    base_url: Option<String>,
    api_key: String,
) -> AppResult<Box<dyn AiProvider>> {
    match provider {
        "gemini" => Ok(Box::new(GeminiClient::new(api_key)?)),
        "openrouter" => Ok(Box::new(OpenRouterClient::new(api_key, base_url)?)),
        "ollama" => Ok(Box::new(crate::ai::ollama::OllamaClient::new(base_url)?)),
        other => Err(AppError::Validation(format!(
            "Bilinmeyen AI sağlayıcı: {}",
            other
        ))),
    }
}

fn get_provider_row(state: &AppState, provider: &str) -> AppResult<(String, Option<String>)> {
    let conn = state.db.get()?;
    let (_, base_url): (i64, Option<String>) = conn
        .query_row(
            "SELECT id, base_url FROM ai_providers WHERE provider = ?1",
            params![provider],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| AppError::Validation(format!("{} sağlayıcısı yapılandırılmamış.", provider)))?;
    // Ollama yerel; API key gerekmez. Diğer sağlayıcılar için key zorunlu.
    let api_key = if provider == "ollama" {
        secrets::read_ai_key(provider).unwrap_or_default()
    } else {
        secrets::read_ai_key(provider)?
    };
    Ok((api_key, base_url))
}

fn get_active_provider(state: &AppState) -> AppResult<(String, String, Option<String>, Option<String>)> {
    let conn = state.db.get()?;
    let row = conn
        .query_row(
            "SELECT provider, selected_model, base_url FROM ai_providers WHERE active = 1 LIMIT 1",
            [],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?, r.get::<_, Option<String>>(2)?)),
        )
        .map_err(|_| AppError::Validation("Aktif bir AI sağlayıcı yok.".into()))?;
    let api_key = if row.0 == "ollama" {
        secrets::read_ai_key(&row.0).unwrap_or_default()
    } else {
        secrets::read_ai_key(&row.0)?
    };
    Ok((row.0, api_key, row.1, row.2))
}

#[tauri::command]
pub async fn get_ai_key_masked(provider: String) -> AppResult<Option<String>> {
    match secrets::read_ai_key(&provider) {
        Ok(key) => {
            let n = key.chars().count();
            if n <= 8 {
                Ok(Some("•".repeat(n)))
            } else {
                let prefix: String = key.chars().take(4).collect();
                let suffix: String = key.chars().skip(n.saturating_sub(4)).collect();
                Ok(Some(format!("{}…{} ({} karakter)", prefix, suffix, n)))
            }
        }
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub async fn check_ollama_health(base_url: Option<String>) -> AppResult<bool> {
    crate::ai::ollama::check_health(base_url).await
}

#[tauri::command]
pub async fn list_models(
    state: State<'_, Arc<AppState>>,
    provider: String,
) -> AppResult<Vec<AiModel>> {
    let (api_key, base_url) = get_provider_row(&state, &provider)?;
    let client = build_provider(&provider, base_url, api_key)?;
    client.list_models().await
}

#[derive(Debug, Deserialize)]
pub struct GenerateAnswerPayload {
    #[serde(rename = "questionId")]
    pub question_id: i64,
    #[serde(rename = "modelOverride")]
    pub model_override: Option<String>,
}

/// Arka plan AI cevap üretici. Scheduler tarafından her yeni soru için çağrılır.
/// Hata olursa logger uyarısı verir, panik atmaz. Sonuç draft_ai_answer'a yazılır.
pub async fn generate_draft_for_question(
    state: Arc<AppState>,
    question_id: i64,
) -> AppResult<()> {
    let (provider, api_key, selected_model, base_url) = get_active_provider(&state)?;
    let model = selected_model.ok_or_else(|| AppError::Validation("Model seçilmemiş".into()))?;

    let (q_text, customer_id, product_name) = {
        let conn = state.db.get()?;
        conn.query_row(
            "SELECT text, customer_id, product_name FROM questions WHERE question_id = ?1",
            params![question_id],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, Option<i64>>(1)?,
                    r.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .map_err(|_| AppError::Validation("Soru bulunamadı.".into()))?
    };

    let mut history: Vec<(String, String)> = Vec::new();
    if let Some(cid) = customer_id {
        let conn = state.db.get()?;
        let mut stmt = conn.prepare(
            "SELECT text, answer_text FROM questions WHERE customer_id = ?1 AND question_id != ?2 \
             AND answer_text IS NOT NULL ORDER BY creation_date ASC",
        )?;
        let rows = stmt.query_map(params![cid, question_id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?))
        })?;
        for row in rows.flatten() {
            if let Some(a) = row.1 {
                history.push((row.0, a));
            }
        }
    }

    let rag = crate::ai::rag::fetch_similar(&state, &q_text, 5)?;
    let rag_text = crate::ai::rag::format_context(&rag);
    let active_training: Option<String> = {
        let conn = state.db.get()?;
        conn.query_row(
            "SELECT system_prompt FROM ai_training_runs WHERE active = 1 ORDER BY id DESC LIMIT 1",
            [],
            |r| r.get(0),
        )
        .ok()
    };
    let system_prompt = crate::ai::prompt::base_system_prompt(active_training.as_deref());
    let user_prompt =
        crate::ai::prompt::build_answer_prompt(&q_text, product_name.as_deref(), &history, &rag_text);

    let client = build_provider(&provider, base_url, api_key)?;
    let text = client
        .generate(GenerationRequest {
            system_prompt: Some(&system_prompt),
            user_prompt: &user_prompt,
            model: &model,
            max_tokens: Some(1024),
        })
        .await?
        .trim()
        .to_string();

    let now = Utc::now().timestamp_millis();
    let conn = state.db.get()?;
    conn.execute(
        "UPDATE questions SET draft_ai_answer = ?1, draft_ai_generated_at = ?2 WHERE question_id = ?3",
        params![text, now, question_id],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn generate_answer(
    state: State<'_, Arc<AppState>>,
    payload: GenerateAnswerPayload,
) -> AppResult<String> {
    let state_arc = state.inner().clone();
    let (provider, api_key, selected_model, base_url) = get_active_provider(&state_arc)?;
    let model = payload
        .model_override
        .or(selected_model)
        .ok_or_else(|| AppError::Validation("Model seçilmemiş.".into()))?;

    let (q_text, customer_id, product_name) = {
        let conn = state_arc.db.get()?;
        conn.query_row(
            "SELECT text, customer_id, product_name FROM questions WHERE question_id = ?1",
            params![payload.question_id],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, Option<i64>>(1)?,
                    r.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .map_err(|_| AppError::Validation("Soru bulunamadı.".into()))?
    };

    let mut history: Vec<(String, String)> = Vec::new();
    if let Some(cid) = customer_id {
        let conn = state_arc.db.get()?;
        let mut stmt = conn.prepare(
            "SELECT text, answer_text FROM questions WHERE customer_id = ?1 AND question_id != ?2 \
             AND answer_text IS NOT NULL ORDER BY creation_date ASC",
        )?;
        let rows = stmt.query_map(params![cid, payload.question_id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?))
        })?;
        for row in rows.flatten() {
            if let Some(a) = row.1 {
                history.push((row.0, a));
            }
        }
    }

    let rag = fetch_similar(&state_arc, &q_text, 5)?;
    let rag_text = format_context(&rag);

    let active_training: Option<String> = {
        let conn = state_arc.db.get()?;
        conn.query_row(
            "SELECT system_prompt FROM ai_training_runs WHERE active = 1 ORDER BY id DESC LIMIT 1",
            [],
            |r| r.get(0),
        )
        .ok()
    };
    let system_prompt = base_system_prompt(active_training.as_deref());
    let user_prompt = build_answer_prompt(&q_text, product_name.as_deref(), &history, &rag_text);

    let client = build_provider(&provider, base_url, api_key)?;
    let mut text = client
        .generate(GenerationRequest {
            system_prompt: Some(&system_prompt),
            user_prompt: &user_prompt,
            model: &model,
            max_tokens: Some(1024),
        })
        .await?;
    text = text.trim().to_string();
    Ok(text)
}

#[derive(Debug, Deserialize)]
pub struct TrainPayload {
    #[serde(rename = "startDate")]
    pub start_date: i64,
    #[serde(rename = "endDate")]
    pub end_date: i64,
    #[serde(rename = "storeIds")]
    pub store_ids: Option<Vec<i64>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrainResult {
    pub training_id: i64,
    pub qa_pair_count: i64,
    pub pairs_used: i64,
    pub system_prompt: String,
}

#[tauri::command]
pub async fn train_ai(
    app: tauri::AppHandle,
    state: State<'_, Arc<AppState>>,
    payload: TrainPayload,
) -> AppResult<TrainResult> {
    use tauri::Emitter;
    if payload.end_date <= payload.start_date {
        return Err(AppError::Validation(
            "Bitiş tarihi başlangıçtan sonra olmalı.".into(),
        ));
    }
    let state_arc = state.inner().clone();
    let pairs = fetch_history_for_training(
        &state_arc,
        &app,
        payload.store_ids.clone(),
        payload.start_date,
        payload.end_date,
    )
    .await?;

    let (provider, api_key, selected_model, base_url) = get_active_provider(&state_arc)?;
    let model = selected_model
        .ok_or_else(|| AppError::Validation("Aktif sağlayıcıda model seçilmemiş.".into()))?;

    let _ = app.emit(
        "ai-training:progress",
        serde_json::json!({
            "storeIdx": 0,
            "storeTotal": 0,
            "storeName": "",
            "pageIdx": 0,
            "pairsFound": pairs.len(),
            "phase": "generating",
        }),
    );

    let training_prompt = build_training_prompt(&pairs);
    let client = build_provider(&provider, base_url, api_key)?;
    let summary = client
        .generate(GenerationRequest {
            system_prompt: Some(
                "Sen bir AI asistan eğiticisisin. Sana verilen geçmiş Q&A örneklerinden satıcının \
                 stilini özetlersin.",
            ),
            user_prompt: &training_prompt,
            model: &model,
            max_tokens: Some(4096),
        })
        .await?;

    let conn = state_arc.db.get()?;
    conn.execute("UPDATE ai_training_runs SET active = 0", [])?;
    let now = Utc::now().timestamp_millis();
    let store_ids_json = payload
        .store_ids
        .map(|v| serde_json::to_string(&v).unwrap_or_default());
    let auto_name = format!(
        "{} → {}",
        chrono::DateTime::<Utc>::from_timestamp_millis(payload.start_date)
            .map(|d| d.format("%d.%m.%Y").to_string())
            .unwrap_or_default(),
        chrono::DateTime::<Utc>::from_timestamp_millis(payload.end_date)
            .map(|d| d.format("%d.%m.%Y").to_string())
            .unwrap_or_default()
    );
    conn.execute(
        "INSERT INTO ai_training_runs (start_date, end_date, store_ids, qa_pair_count, \
         system_prompt, active, created_at, name, original_prompt) \
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?5)",
        params![
            payload.start_date,
            payload.end_date,
            store_ids_json,
            pairs.len() as i64,
            summary,
            now,
            auto_name,
        ],
    )?;
    let id = conn.last_insert_rowid();
    let _ = app.emit(
        "ai-training:progress",
        serde_json::json!({
            "storeIdx": 0,
            "storeTotal": 0,
            "storeName": "",
            "pageIdx": 0,
            "pairsFound": pairs.len(),
            "phase": "done",
        }),
    );
    let pairs_used = crate::ai::prompt::training_pair_limit(pairs.len()) as i64;
    Ok(TrainResult {
        training_id: id,
        qa_pair_count: pairs.len() as i64,
        pairs_used,
        system_prompt: summary,
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveTraining {
    pub id: i64,
    pub start_date: i64,
    pub end_date: i64,
    pub qa_pair_count: i64,
    pub system_prompt: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TrainingRecord {
    pub id: i64,
    pub name: Option<String>,
    pub start_date: i64,
    pub end_date: i64,
    pub qa_pair_count: i64,
    pub system_prompt: String,
    pub original_prompt: Option<String>,
    pub active: bool,
    pub created_at: i64,
}

#[tauri::command]
pub async fn list_trainings(state: State<'_, Arc<AppState>>) -> AppResult<Vec<TrainingRecord>> {
    let conn = state.db.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, name, start_date, end_date, qa_pair_count, system_prompt, original_prompt, active, created_at \
         FROM ai_training_runs ORDER BY created_at DESC",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(TrainingRecord {
                id: r.get(0)?,
                name: r.get(1)?,
                start_date: r.get(2)?,
                end_date: r.get(3)?,
                qa_pair_count: r.get(4)?,
                system_prompt: r.get(5)?,
                original_prompt: r.get(6)?,
                active: r.get::<_, i64>(7)? != 0,
                created_at: r.get(8)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[derive(Debug, Deserialize)]
pub struct UpdatePromptPayload {
    #[serde(rename = "trainingId")]
    pub training_id: i64,
    #[serde(rename = "systemPrompt")]
    pub system_prompt: String,
}

#[tauri::command]
pub async fn update_training_prompt(
    state: State<'_, Arc<AppState>>,
    payload: UpdatePromptPayload,
) -> AppResult<()> {
    if payload.system_prompt.trim().is_empty() {
        return Err(AppError::Validation("Sistem promptu boş olamaz.".into()));
    }
    let conn = state.db.get()?;
    conn.execute(
        "UPDATE ai_training_runs SET system_prompt = ?1 WHERE id = ?2",
        params![payload.system_prompt, payload.training_id],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn reset_training_prompt(
    state: State<'_, Arc<AppState>>,
    training_id: i64,
) -> AppResult<()> {
    let conn = state.db.get()?;
    let original: Option<String> = conn
        .query_row(
            "SELECT original_prompt FROM ai_training_runs WHERE id = ?1",
            params![training_id],
            |r| r.get(0),
        )
        .ok()
        .flatten();
    if let Some(orig) = original {
        conn.execute(
            "UPDATE ai_training_runs SET system_prompt = ?1 WHERE id = ?2",
            params![orig, training_id],
        )?;
        Ok(())
    } else {
        Err(AppError::Validation(
            "Bu eğitim için orijinal prompt kayıtlı değil (eski sürümde oluşturulmuş olabilir).".into(),
        ))
    }
}

#[tauri::command]
pub async fn activate_training(
    state: State<'_, Arc<AppState>>,
    training_id: i64,
) -> AppResult<()> {
    let mut conn = state.db.get()?;
    let tx = conn.transaction()?;
    tx.execute("UPDATE ai_training_runs SET active = 0", [])?;
    tx.execute(
        "UPDATE ai_training_runs SET active = 1 WHERE id = ?1",
        params![training_id],
    )?;
    tx.commit()?;
    Ok(())
}

#[tauri::command]
pub async fn delete_training(
    state: State<'_, Arc<AppState>>,
    training_id: i64,
) -> AppResult<()> {
    let mut conn = state.db.get()?;
    let tx = conn.transaction()?;
    let was_active: bool = tx
        .query_row(
            "SELECT active FROM ai_training_runs WHERE id = ?1",
            params![training_id],
            |r| r.get::<_, i64>(0).map(|v| v != 0),
        )
        .unwrap_or(false);
    tx.execute(
        "DELETE FROM ai_training_runs WHERE id = ?1",
        params![training_id],
    )?;
    // Silinen aktifse, en yeni kalan eğitimi otomatik aktif yap (yoksa hiçbir şey)
    if was_active {
        let next_id: Option<i64> = tx
            .query_row(
                "SELECT id FROM ai_training_runs ORDER BY created_at DESC LIMIT 1",
                [],
                |r| r.get(0),
            )
            .ok();
        if let Some(id) = next_id {
            tx.execute(
                "UPDATE ai_training_runs SET active = 1 WHERE id = ?1",
                params![id],
            )?;
        }
    }
    tx.commit()?;
    Ok(())
}

#[tauri::command]
pub async fn get_active_training(
    state: State<'_, Arc<AppState>>,
) -> AppResult<Option<ActiveTraining>> {
    let conn = state.db.get()?;
    let row = conn
        .query_row(
            "SELECT id, start_date, end_date, qa_pair_count, system_prompt, created_at \
             FROM ai_training_runs WHERE active = 1 ORDER BY id DESC LIMIT 1",
            [],
            |r| {
                Ok(ActiveTraining {
                    id: r.get(0)?,
                    start_date: r.get(1)?,
                    end_date: r.get(2)?,
                    qa_pair_count: r.get(3)?,
                    system_prompt: r.get(4)?,
                    created_at: r.get(5)?,
                })
            },
        )
        .ok();
    Ok(row)
}
