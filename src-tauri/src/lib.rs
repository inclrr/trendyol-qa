mod ai;
mod banned;
mod commands;
mod db;
mod errors;
mod notifier;
mod scheduler;
mod secret_store;
mod state;
mod tray;
mod trendyol;

use state::AppState;
use std::sync::Arc;
use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // Eğer --background olmadan tekrar başlatılırsa (örn. bildirim/toast tıklaması),
            // pencereyi öne getir
            let is_background = argv.iter().any(|a| a == "--background");
            if !is_background {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--background"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // SecretStore'u en önce init et (DB'den önce, çünkü secrets DB'ye bağlı değil)
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .map_err(|e| format!("AppData yolu alınamadı: {}", e))?;
            secret_store::SecretStore::init(&app_data_dir)
                .map_err(|e| format!("SecretStore init başarısız: {}", e))?;

            let state = AppState::initialize(&app_handle)?;
            let state_arc = Arc::new(state);
            app.manage(state_arc.clone());

            // v0.4.x → v0.5.0 keyring migration (tek seferlik, settings bayrağı ile)
            let already_migrated = {
                if let Ok(conn) = state_arc.db.get() {
                    conn.query_row(
                        "SELECT value FROM settings WHERE key = 'keyring_migrated'",
                        [],
                        |r| r.get::<_, String>(0),
                    )
                    .map(|v| v == "true")
                    .unwrap_or(false)
                } else {
                    false
                }
            };
            if !already_migrated {
                let stores: Vec<(i64, String, String)> = state_arc
                    .db
                    .get()
                    .ok()
                    .and_then(|conn| {
                        conn.prepare("SELECT seller_id, name, environment FROM stores").ok().and_then(|mut stmt| {
                            stmt.query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?)))
                                .ok()
                                .map(|rows| rows.flatten().collect())
                        })
                    })
                    .unwrap_or_default();
                let providers: Vec<String> = state_arc
                    .db
                    .get()
                    .ok()
                    .and_then(|conn| {
                        conn.prepare("SELECT provider FROM ai_providers").ok().and_then(|mut stmt| {
                            stmt.query_map([], |r| r.get::<_, String>(0))
                                .ok()
                                .map(|rows| rows.flatten().collect())
                        })
                    })
                    .unwrap_or_default();
                if let Err(e) = commands::secrets::migrate_from_keyring(&stores, &providers) {
                    log::warn!("Keyring migration başarısız (yine de devam): {}", e);
                } else if let Ok(conn) = state_arc.db.get() {
                    let _ = conn.execute(
                        "INSERT OR REPLACE INTO settings(key, value) VALUES ('keyring_migrated', 'true')",
                        [],
                    );
                }
            }

            tray::install(&app_handle)?;

            let started_in_background = std::env::args().any(|a| a == "--background");
            if started_in_background {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.hide();
                }
            }

            scheduler::spawn(app_handle.clone(), state_arc.clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    if window.label() == "main" {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
                WindowEvent::Focused(true) => {
                    // Kullanıcı pencereyi öne getirdiğinde bekleyen bildirim soru ID'lerini
                    // frontend'e ilet → modal otomatik açılır
                    use tauri::{Emitter, Manager};
                    if window.label() == "main" {
                        let app = window.app_handle();
                        if let Some(state) = app.try_state::<std::sync::Arc<state::AppState>>() {
                            let ids = state.drain_notifications();
                            if !ids.is_empty() {
                                let _ = app.emit("notification:focus", ids);
                            }
                        }
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::stores::list_stores,
            commands::stores::create_store,
            commands::stores::update_store,
            commands::stores::delete_store,
            commands::stores::test_store_connection,
            commands::questions::sync_now,
            commands::questions::sync_question,
            commands::questions::list_questions,
            commands::questions::get_question,
            commands::questions::get_customer_history,
            commands::questions::mark_notified,
            commands::answers::submit_answer,
            commands::answers::submit_bulk_answers,
            commands::answers::check_answer,
            commands::templates::list_templates,
            commands::templates::upsert_template,
            commands::templates::delete_template,
            commands::ai::list_ai_providers,
            commands::ai::get_ai_key_masked,
            commands::ai::upsert_ai_provider,
            commands::ai::set_active_provider,
            commands::ai::delete_ai_provider,
            commands::ai::list_models,
            commands::ai::check_ollama_health,
            commands::ai::generate_answer,
            commands::ai::train_ai,
            commands::ai::get_active_training,
            commands::ai::list_trainings,
            commands::ai::update_training_prompt,
            commands::ai::reset_training_prompt,
            commands::ai::activate_training,
            commands::ai::delete_training,
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::get_all_settings,
            commands::backup::backup_export,
            commands::backup::backup_import,
            commands::backup::get_db_path,
        ])
        .build(tauri::generate_context!())
        .expect("Tauri build failed")
        .run(|_app, event| {
            if let RunEvent::ExitRequested { api, .. } = event {
                if !tray::EXITING.load(std::sync::atomic::Ordering::SeqCst) {
                    api.prevent_exit();
                }
            }
        });
}
