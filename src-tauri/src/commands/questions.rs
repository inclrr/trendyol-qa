use crate::commands::stores::{ensure_client, get_store_by_id, list_active_stores};
use crate::errors::{AppError, AppResult};
use crate::state::AppState;
use crate::trendyol::client::QuestionsFilter;
use crate::trendyol::models::TrendyolQuestion;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredQuestion {
    pub question_id: i64,
    pub store_id: i64,
    pub store_name: String,
    pub customer_id: Option<i64>,
    pub customer_name: Option<String>,
    pub text: String,
    pub status: String,
    pub creation_date: i64,
    pub product_main_id: Option<String>,
    pub product_name: Option<String>,
    pub product_web_url: Option<String>,
    pub product_image_url: Option<String>,
    pub barcode: Option<String>,
    pub public: Option<bool>,
    pub answer_id: Option<i64>,
    pub answer_text: Option<String>,
    pub answer_creation_date: Option<i64>,
    pub reported_date: Option<i64>,
    pub rejected_date: Option<i64>,
    pub fetched_at: i64,
    pub notified: bool,
    pub draft_ai_answer: Option<String>,
    pub draft_ai_generated_at: Option<i64>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListQuestionsParams {
    pub store_ids: Option<Vec<i64>>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub search: Option<String>,
    pub start_date: Option<i64>,
    pub end_date: Option<i64>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSummary {
    pub fetched: i64,
    pub new_questions: i64,
    pub updated_questions: i64,
    pub errors: Vec<SyncError>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncError {
    pub store_id: i64,
    pub store_name: String,
    pub message: String,
}

fn row_to_stored(row: &rusqlite::Row) -> rusqlite::Result<StoredQuestion> {
    let public_raw: Option<i64> = row.get(13)?;
    let notified_raw: i64 = row.get(20)?;
    Ok(StoredQuestion {
        question_id: row.get(0)?,
        store_id: row.get(1)?,
        store_name: row.get(2)?,
        customer_id: row.get(3)?,
        customer_name: row.get(4)?,
        text: row.get(5)?,
        status: row.get(6)?,
        creation_date: row.get(7)?,
        product_main_id: row.get(8)?,
        product_name: row.get(9)?,
        product_web_url: row.get(10)?,
        product_image_url: row.get(11)?,
        barcode: row.get(12)?,
        public: public_raw.map(|v| v != 0),
        answer_id: row.get(14)?,
        answer_text: row.get(15)?,
        answer_creation_date: row.get(16)?,
        reported_date: row.get(17)?,
        rejected_date: row.get(18)?,
        fetched_at: row.get(19)?,
        notified: notified_raw != 0,
        draft_ai_answer: row.get(21).ok().flatten(),
        draft_ai_generated_at: row.get(22).ok().flatten(),
    })
}

const SELECT_COLS: &str = "q.question_id, q.store_id, s.name, q.customer_id, q.customer_name, \
    q.text, q.status, q.creation_date, q.product_main_id, q.product_name, q.product_web_url, \
    q.product_image_url, q.barcode, q.public, q.answer_id, q.answer_text, q.answer_creation_date, \
    q.reported_date, q.rejected_date, q.fetched_at, q.notified, q.draft_ai_answer, q.draft_ai_generated_at";

#[tauri::command]
pub async fn list_questions(
    state: State<'_, Arc<AppState>>,
    params: ListQuestionsParams,
) -> AppResult<Vec<StoredQuestion>> {
    let conn = state.db.get()?;
    let mut sql = format!(
        "SELECT {} FROM questions q JOIN stores s ON q.store_id = s.id WHERE 1=1",
        SELECT_COLS
    );
    let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(ids) = &params.store_ids {
        if !ids.is_empty() {
            let placeholders = vec!["?"; ids.len()].join(",");
            sql.push_str(&format!(" AND q.store_id IN ({})", placeholders));
            for id in ids {
                args.push(Box::new(*id));
            }
        }
    }
    if let Some(status) = &params.status {
        if !status.is_empty() && status != "ALL" {
            sql.push_str(" AND q.status = ?");
            args.push(Box::new(status.clone()));
        }
    }
    if let Some(search) = &params.search {
        if !search.trim().is_empty() {
            sql.push_str(" AND (q.text LIKE ? OR q.product_name LIKE ? OR q.customer_name LIKE ?)");
            let needle = format!("%{}%", search.trim());
            args.push(Box::new(needle.clone()));
            args.push(Box::new(needle.clone()));
            args.push(Box::new(needle));
        }
    }
    if let Some(start) = params.start_date {
        sql.push_str(" AND q.creation_date >= ?");
        args.push(Box::new(start));
    }
    if let Some(end) = params.end_date {
        sql.push_str(" AND q.creation_date <= ?");
        args.push(Box::new(end));
    }
    sql.push_str(" ORDER BY q.creation_date DESC");
    if let Some(limit) = params.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
        if let Some(offset) = params.offset {
            sql.push_str(&format!(" OFFSET {}", offset));
        }
    }

    let mut stmt = conn.prepare(&sql)?;
    let refs: Vec<&dyn rusqlite::ToSql> = args.iter().map(|b| b.as_ref()).collect();
    let questions = stmt
        .query_map(rusqlite::params_from_iter(refs), row_to_stored)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(questions)
}

#[tauri::command]
pub async fn get_question(
    state: State<'_, Arc<AppState>>,
    question_id: i64,
) -> AppResult<Option<StoredQuestion>> {
    let conn = state.db.get()?;
    let sql = format!(
        "SELECT {} FROM questions q JOIN stores s ON q.store_id = s.id WHERE q.question_id = ?1",
        SELECT_COLS
    );
    let result = conn
        .query_row(&sql, params![question_id], row_to_stored)
        .ok();
    Ok(result)
}

#[tauri::command]
pub async fn get_customer_history(
    state: State<'_, Arc<AppState>>,
    customer_id: i64,
    store_id: Option<i64>,
    exclude_question_id: Option<i64>,
) -> AppResult<Vec<StoredQuestion>> {
    let conn = state.db.get()?;
    let mut sql = format!(
        "SELECT {} FROM questions q JOIN stores s ON q.store_id = s.id WHERE q.customer_id = ?",
        SELECT_COLS
    );
    let mut args: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(customer_id)];
    if let Some(sid) = store_id {
        sql.push_str(" AND q.store_id = ?");
        args.push(Box::new(sid));
    }
    if let Some(qid) = exclude_question_id {
        sql.push_str(" AND q.question_id != ?");
        args.push(Box::new(qid));
    }
    sql.push_str(" ORDER BY q.creation_date ASC");
    let mut stmt = conn.prepare(&sql)?;
    let refs: Vec<&dyn rusqlite::ToSql> = args.iter().map(|b| b.as_ref()).collect();
    let res = stmt
        .query_map(rusqlite::params_from_iter(refs), row_to_stored)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(res)
}

/// Tek bir sorunun Trendyol API'sinden son durumunu çekip lokali günceller.
/// Cevap gönderildikten sonra kullanılır; API gecikmesi varsa local kayıt yine ANSWERED kalır.
#[tauri::command]
pub async fn sync_question(
    state: State<'_, Arc<AppState>>,
    question_id: i64,
) -> AppResult<Option<StoredQuestion>> {
    let state_arc = state.inner().clone();
    let conn = state_arc.db.get()?;
    let q_info: Option<(i64, i64, i64)> = conn
        .query_row(
            "SELECT store_id, creation_date, question_id FROM questions WHERE question_id = ?1",
            params![question_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .ok();
    drop(conn);
    if q_info.is_none() {
        return Ok(None);
    }
    let (store_id, creation_date, _) = q_info.unwrap();
    // Sadece bu soruyu kapsayan dar bir tarih aralığı + tüm statüler
    let two_hours = 2 * 60 * 60 * 1000i64;
    let _ = sync_store(
        state_arc.clone(),
        store_id,
        None, // tüm statüler
        Some(creation_date - two_hours),
        Some(creation_date + two_hours),
    )
    .await;
    let q = get_question(state, question_id).await?;
    Ok(q)
}

#[tauri::command]
pub async fn mark_notified(
    state: State<'_, Arc<AppState>>,
    question_ids: Vec<i64>,
) -> AppResult<()> {
    if question_ids.is_empty() {
        return Ok(());
    }
    let conn = state.db.get()?;
    let placeholders = vec!["?"; question_ids.len()].join(",");
    let sql = format!(
        "UPDATE questions SET notified = 1 WHERE question_id IN ({})",
        placeholders
    );
    let mut stmt = conn.prepare(&sql)?;
    let params_iter: Vec<&dyn rusqlite::ToSql> = question_ids
        .iter()
        .map(|x| x as &dyn rusqlite::ToSql)
        .collect();
    stmt.execute(rusqlite::params_from_iter(params_iter))?;
    Ok(())
}

pub async fn sync_store(
    state: Arc<AppState>,
    store_id: i64,
    status: Option<String>,
    start_date: Option<i64>,
    end_date: Option<i64>,
) -> AppResult<(i64, i64, Vec<TrendyolQuestion>)> {
    let store = get_store_by_id(&state, store_id)?;
    let client = ensure_client(&state, &store)?;
    let now = Utc::now().timestamp_millis();
    let one_week_ms: i64 = 7 * 24 * 60 * 60 * 1000;
    let resolved_start = start_date.unwrap_or(now - one_week_ms);
    let resolved_end = end_date.unwrap_or(now);
    let filter = QuestionsFilter {
        start_date: Some(resolved_start),
        end_date: Some(resolved_end),
        status: Some(status.unwrap_or_else(|| "WAITING_FOR_ANSWER".into())),
        size: Some(50),
        order_by_field: Some("CreatedDate".into()),
        order_by_direction: Some("DESC".into()),
        ..Default::default()
    };
    let resp = client.fetch_questions(&filter).await?;
    let mut new_count = 0i64;
    let mut updated_count = 0i64;
    let mut new_items: Vec<TrendyolQuestion> = Vec::new();

    let mut conn = state.db.get()?;
    let tx = conn.transaction()?;
    for q in resp.content.iter() {
        let exists: Option<String> = tx
            .query_row(
                "SELECT status FROM questions WHERE question_id = ?1",
                params![q.id],
                |r| r.get(0),
            )
            .ok();
        let customer_name = q.user_name.clone();
        let raw_json = serde_json::to_string(q).ok();
        let answer = q.answer.clone().unwrap_or_default();
        if let Some(prev_status) = exists {
            tx.execute(
                "UPDATE questions SET status = ?1, answer_id = ?2, answer_text = ?3, \
                 answer_creation_date = ?4, reported_date = ?5, rejected_date = ?6, raw_json = ?7, \
                 fetched_at = ?8, \
                 customer_id = COALESCE(?9, customer_id), \
                 customer_name = COALESCE(?10, customer_name), \
                 product_main_id = COALESCE(?11, product_main_id), \
                 product_name = COALESCE(?12, product_name), \
                 product_web_url = COALESCE(?13, product_web_url), \
                 product_image_url = COALESCE(?14, product_image_url), \
                 barcode = COALESCE(?15, barcode), \
                 public = COALESCE(?16, public) \
                 WHERE question_id = ?17",
                params![
                    q.status,
                    answer.id,
                    answer.text,
                    answer.creation_date,
                    q.reported_date,
                    q.rejected_date,
                    raw_json,
                    now,
                    q.customer_id,
                    customer_name,
                    q.product_main_id,
                    q.product_name,
                    q.product_web_url,
                    q.product_image_url,
                    q.barcode,
                    q.public.map(|p| if p { 1i64 } else { 0i64 }),
                    q.id
                ],
            )?;
            if prev_status != q.status {
                updated_count += 1;
            }
        } else {
            tx.execute(
                "INSERT INTO questions (question_id, store_id, customer_id, customer_name, text, status, \
                 creation_date, product_main_id, product_name, product_web_url, product_image_url, \
                 barcode, public, answer_id, answer_text, answer_creation_date, reported_date, \
                 rejected_date, raw_json, fetched_at, notified) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, 0)",
                params![
                    q.id,
                    store_id,
                    q.customer_id,
                    customer_name,
                    q.text,
                    q.status,
                    q.creation_date,
                    q.product_main_id,
                    q.product_name,
                    q.product_web_url,
                    q.product_image_url,
                    q.barcode,
                    q.public.map(|p| if p { 1i64 } else { 0i64 }),
                    answer.id,
                    answer.text,
                    answer.creation_date,
                    q.reported_date,
                    q.rejected_date,
                    raw_json,
                    now,
                ],
            )?;
            new_count += 1;
            new_items.push(q.clone());
        }
    }
    tx.commit()?;
    Ok((new_count, updated_count, new_items))
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncNowParams {
    pub status: Option<String>,
    pub start_date: Option<i64>,
    pub end_date: Option<i64>,
}

#[tauri::command]
pub async fn sync_now(
    state: State<'_, Arc<AppState>>,
    params: Option<SyncNowParams>,
) -> AppResult<SyncSummary> {
    let p = params.unwrap_or_default();
    let stores = list_active_stores(&state)?;
    let state_arc = state.inner().clone();
    let mut summary = SyncSummary::default();
    for store in stores {
        match sync_store(
            state_arc.clone(),
            store.id,
            p.status.clone(),
            p.start_date,
            p.end_date,
        )
        .await
        {
            Ok((new, updated, items)) => {
                summary.fetched += items.len() as i64;
                summary.new_questions += new;
                summary.updated_questions += updated;
            }
            Err(e) => {
                summary.errors.push(SyncError {
                    store_id: store.id,
                    store_name: store.name,
                    message: e.to_string(),
                });
            }
        }
    }
    Ok(summary)
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TrainingProgress {
    pub store_idx: usize,
    pub store_total: usize,
    pub store_name: String,
    pub page_idx: i64,
    pub pairs_found: usize,
    pub phase: String,
}

pub async fn fetch_history_for_training(
    state: &AppState,
    app: &tauri::AppHandle,
    store_ids: Option<Vec<i64>>,
    start_date: i64,
    end_date: i64,
) -> AppResult<Vec<(String, String)>> {
    use tauri::Emitter;

    let stores = match store_ids {
        Some(ids) if !ids.is_empty() => ids
            .iter()
            .filter_map(|id| get_store_by_id(state, *id).ok())
            .collect::<Vec<_>>(),
        _ => list_active_stores(state)?,
    };
    let store_total = stores.len();

    let mut all_pairs: Vec<(String, String)> = Vec::new();
    for (idx, store) in stores.iter().enumerate() {
        let _ = app.emit(
            "ai-training:progress",
            TrainingProgress {
                store_idx: idx,
                store_total,
                store_name: store.name.clone(),
                page_idx: 0,
                pairs_found: all_pairs.len(),
                phase: "fetching".into(),
            },
        );
        let client = ensure_client(state, store)?;
        // 2 hafta limiti var - parçalı çekim
        let mut window_start = start_date;
        let two_weeks: i64 = 14 * 24 * 60 * 60 * 1000;
        while window_start < end_date {
            let window_end = (window_start + two_weeks - 1).min(end_date);
            let filter = QuestionsFilter {
                start_date: Some(window_start),
                end_date: Some(window_end),
                status: Some("ANSWERED".into()),
                size: Some(50),
                order_by_field: Some("CreatedDate".into()),
                order_by_direction: Some("DESC".into()),
                ..Default::default()
            };
            let mut page = 0i64;
            loop {
                let mut paged = filter.clone();
                paged.page = Some(page);
                let resp = client.fetch_questions(&paged).await?;
                // FTS5 update'leri sayfa bazında tek transaction içinde
                let mut conn = state.db.get()?;
                let tx = conn.transaction()?;
                for q in resp.content.iter() {
                    if let Some(ans) = &q.answer {
                        if let Some(text) = &ans.text {
                            if !text.trim().is_empty() {
                                all_pairs.push((q.text.clone(), text.clone()));
                                // Duplikasyon engeli: önce sil sonra ekle
                                let _ = tx.execute(
                                    "DELETE FROM qa_index WHERE question_id = ?1",
                                    params![q.id],
                                );
                                let _ = tx.execute(
                                    "INSERT INTO qa_index(question_text, answer_text, store_id, question_id) \
                                     VALUES (?1, ?2, ?3, ?4)",
                                    params![q.text, text, store.id, q.id],
                                );
                            }
                        }
                    }
                }
                tx.commit()?;
                let _ = app.emit(
                    "ai-training:progress",
                    TrainingProgress {
                        store_idx: idx,
                        store_total,
                        store_name: store.name.clone(),
                        page_idx: page,
                        pairs_found: all_pairs.len(),
                        phase: "fetching".into(),
                    },
                );
                if resp.content.is_empty() || resp.total_pages <= page + 1 {
                    break;
                }
                page += 1;
                if page > 100 {
                    break;
                }
            }
            window_start = window_end + 1;
        }
    }
    let _ = app.emit(
        "ai-training:progress",
        TrainingProgress {
            store_idx: store_total,
            store_total,
            store_name: String::new(),
            page_idx: 0,
            pairs_found: all_pairs.len(),
            phase: "fetched".into(),
        },
    );
    if all_pairs.is_empty() {
        return Err(AppError::Validation(
            "Seçilen aralıkta cevaplanmış soru bulunamadı.".into(),
        ));
    }
    Ok(all_pairs)
}
