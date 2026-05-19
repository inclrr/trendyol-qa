use crate::commands::stores::{ensure_client, get_store_by_id};
use crate::errors::{AppError, AppResult};
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct SubmitAnswerPayload {
    #[serde(rename = "questionId")]
    pub question_id: i64,
    pub text: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitAnswerResult {
    pub answer_id: Option<i64>,
    pub question_id: i64,
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct BulkAnswerItem {
    #[serde(rename = "questionId")]
    pub question_id: i64,
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct SubmitBulkPayload {
    pub items: Vec<BulkAnswerItem>,
}

pub fn validate_answer_text(text: &str) -> AppResult<()> {
    let len = text.chars().count();
    if text.trim().is_empty() {
        return Err(AppError::Validation("Bir cevap giriniz.".into()));
    }
    if len < 10 {
        return Err(AppError::Validation(
            "Cevap çok kısa: en az 10 karakter olmalıdır.".into(),
        ));
    }
    if len > 2000 {
        return Err(AppError::Validation(
            "Cevap çok uzun: en fazla 2000 karakter olabilir.".into(),
        ));
    }
    Ok(())
}

#[tauri::command]
pub async fn submit_answer(
    state: State<'_, Arc<AppState>>,
    payload: SubmitAnswerPayload,
) -> AppResult<SubmitAnswerResult> {
    validate_answer_text(&payload.text)?;
    let state_arc = state.inner().clone();
    let store_id = {
        let conn = state_arc.db.get()?;
        conn.query_row(
            "SELECT store_id FROM questions WHERE question_id = ?1",
            params![payload.question_id],
            |r| r.get::<_, i64>(0),
        )
        .map_err(|_| AppError::Validation("Soru bulunamadı.".into()))?
    };
    let store = get_store_by_id(&state_arc, store_id)?;
    let client = ensure_client(&state_arc, &store)?;
    let resp = client.create_answer(payload.question_id, &payload.text).await?;

    // Lokal kayda işle
    let now = Utc::now().timestamp_millis();
    let conn = state_arc.db.get()?;
    conn.execute(
        "UPDATE questions SET status = 'ANSWERED', answer_id = ?1, answer_text = ?2, \
         answer_creation_date = ?3 WHERE question_id = ?4",
        params![resp.answer_id, payload.text, now, payload.question_id],
    )?;
    // RAG indeksine ekle (önce duplikasyonu engellemek için sil)
    let _ = conn.execute(
        "DELETE FROM qa_index WHERE question_id = ?1",
        params![payload.question_id],
    );
    let _ = conn.execute(
        "INSERT INTO qa_index(question_text, answer_text, store_id, question_id) \
         SELECT text, ?1, store_id, question_id FROM questions WHERE question_id = ?2",
        params![payload.text, payload.question_id],
    );

    Ok(SubmitAnswerResult {
        answer_id: resp.answer_id,
        question_id: payload.question_id,
        success: true,
        message: "Cevap başarıyla gönderildi.".into(),
    })
}

#[tauri::command]
pub async fn submit_bulk_answers(
    state: State<'_, Arc<AppState>>,
    payload: SubmitBulkPayload,
) -> AppResult<Vec<SubmitAnswerResult>> {
    let mut results: Vec<SubmitAnswerResult> = Vec::new();
    for item in payload.items {
        let single = SubmitAnswerPayload {
            question_id: item.question_id,
            text: item.text.clone(),
        };
        match submit_answer(state.clone(), single).await {
            Ok(r) => results.push(r),
            Err(e) => results.push(SubmitAnswerResult {
                answer_id: None,
                question_id: item.question_id,
                success: false,
                message: e.to_string(),
            }),
        }
    }
    Ok(results)
}
