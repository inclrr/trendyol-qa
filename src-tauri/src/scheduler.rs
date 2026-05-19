use crate::commands::questions::sync_store;
use crate::commands::settings::get_setting_sync;
use crate::commands::stores::list_active_stores;
use crate::notifier::notify_new_questions;
use crate::state::AppState;
use crate::tray;
use rusqlite::params;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub fn spawn(app: AppHandle, state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        // İlk küçük gecikme
        tokio::time::sleep(Duration::from_secs(3)).await;
        loop {
            let polling_enabled = get_setting_sync(&state, "polling_enabled")
                .map(|v| v == "true")
                .unwrap_or(true);

            let interval_secs: u64 = get_setting_sync(&state, "poll_interval_seconds")
                .and_then(|v| v.parse().ok())
                .unwrap_or(120);

            if polling_enabled {
                if let Err(e) = run_cycle(&app, &state).await {
                    log::warn!("polling cycle hatası: {}", e);
                }
            }

            tokio::time::sleep(Duration::from_secs(interval_secs.max(30))).await;
        }
    });
}

async fn run_cycle(app: &AppHandle, state: &Arc<AppState>) -> Result<(), String> {
    let stores = list_active_stores(state).map_err(|e| e.to_string())?;
    let mut total_new = 0i64;
    for store in stores {
        let result = sync_store(state.clone(), store.id, None, None, None).await;
        match result {
            Ok((new, _updated, items)) => {
                total_new += new;
                if !items.is_empty() {
                    notify_new_questions(app, state, &store.name, &items);
                    let ids: Vec<i64> = items.iter().map(|i| i.id).collect();
                    if !ids.is_empty() {
                        if let Ok(conn) = state.db.get() {
                            let placeholders = vec!["?"; ids.len()].join(",");
                            let sql = format!(
                                "UPDATE questions SET notified = 1 WHERE question_id IN ({})",
                                placeholders
                            );
                            let refs: Vec<&dyn rusqlite::ToSql> = ids
                                .iter()
                                .map(|x| x as &dyn rusqlite::ToSql)
                                .collect();
                            let _ = conn.execute(&sql, rusqlite::params_from_iter(refs));
                        }
                    }
                }
            }
            Err(e) => {
                log::warn!("Mağaza {} sync hatası: {}", store.name, e);
            }
        }
    }

    let _ = app.emit("questions:synced", total_new);
    let _ = update_tray_badge(app, state);
    Ok(())
}

pub fn update_tray_badge(app: &AppHandle, state: &Arc<AppState>) -> Result<(), String> {
    let waiting: i64 = state
        .db
        .get()
        .map_err(|e| e.to_string())?
        .query_row(
            "SELECT COUNT(*) FROM questions WHERE status = 'WAITING_FOR_ANSWER'",
            params![],
            |r| r.get(0),
        )
        .unwrap_or(0);
    tray::update_pending_count(app, waiting);
    Ok(())
}
