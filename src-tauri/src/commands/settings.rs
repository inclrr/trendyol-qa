use crate::errors::AppResult;
use crate::state::AppState;
use rusqlite::params;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn get_setting(
    state: State<'_, Arc<AppState>>,
    key: String,
) -> AppResult<Option<String>> {
    let conn = state.db.get()?;
    let value: Option<String> = conn
        .query_row("SELECT value FROM settings WHERE key = ?1", params![key], |r| r.get(0))
        .ok();
    Ok(value)
}

#[tauri::command]
pub async fn set_setting(
    state: State<'_, Arc<AppState>>,
    key: String,
    value: String,
) -> AppResult<()> {
    let conn = state.db.get()?;
    conn.execute(
        "INSERT INTO settings(key, value) VALUES (?1, ?2) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_settings(state: State<'_, Arc<AppState>>) -> AppResult<HashMap<String, String>> {
    let conn = state.db.get()?;
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let mut map: HashMap<String, String> = HashMap::new();
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
    for r in rows.flatten() {
        map.insert(r.0, r.1);
    }
    Ok(map)
}

pub fn get_setting_sync(state: &AppState, key: &str) -> Option<String> {
    let conn = state.db.get().ok()?;
    conn.query_row("SELECT value FROM settings WHERE key = ?1", params![key], |r| {
        r.get::<_, String>(0)
    })
    .ok()
}
