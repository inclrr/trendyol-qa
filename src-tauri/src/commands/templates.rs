use crate::errors::AppResult;
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerTemplate {
    pub id: Option<i64>,
    pub title: String,
    pub body: String,
    pub category: Option<String>,
    pub usage_count: i64,
    pub created_at: i64,
}

fn row_to_template(row: &rusqlite::Row) -> rusqlite::Result<AnswerTemplate> {
    Ok(AnswerTemplate {
        id: Some(row.get(0)?),
        title: row.get(1)?,
        body: row.get(2)?,
        category: row.get(3)?,
        usage_count: row.get(4)?,
        created_at: row.get(5)?,
    })
}

#[tauri::command]
pub async fn list_templates(state: State<'_, Arc<AppState>>) -> AppResult<Vec<AnswerTemplate>> {
    let conn = state.db.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, title, body, category, usage_count, created_at FROM answer_templates \
         ORDER BY usage_count DESC, title ASC",
    )?;
    let templates = stmt
        .query_map([], row_to_template)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(templates)
}

#[tauri::command]
pub async fn upsert_template(
    state: State<'_, Arc<AppState>>,
    template: AnswerTemplate,
) -> AppResult<AnswerTemplate> {
    let now = Utc::now().timestamp_millis();
    let conn = state.db.get()?;
    match template.id {
        Some(id) => {
            conn.execute(
                "UPDATE answer_templates SET title = ?1, body = ?2, category = ?3 WHERE id = ?4",
                params![template.title, template.body, template.category, id],
            )?;
            let row = conn.query_row(
                "SELECT id, title, body, category, usage_count, created_at FROM answer_templates WHERE id = ?1",
                params![id],
                row_to_template,
            )?;
            Ok(row)
        }
        None => {
            conn.execute(
                "INSERT INTO answer_templates (title, body, category, usage_count, created_at) \
                 VALUES (?1, ?2, ?3, 0, ?4)",
                params![template.title, template.body, template.category, now],
            )?;
            let id = conn.last_insert_rowid();
            Ok(AnswerTemplate {
                id: Some(id),
                title: template.title,
                body: template.body,
                category: template.category,
                usage_count: 0,
                created_at: now,
            })
        }
    }
}

#[tauri::command]
pub async fn delete_template(state: State<'_, Arc<AppState>>, id: i64) -> AppResult<()> {
    let conn = state.db.get()?;
    conn.execute("DELETE FROM answer_templates WHERE id = ?1", params![id])?;
    Ok(())
}
