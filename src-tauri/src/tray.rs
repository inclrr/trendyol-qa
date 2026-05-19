use crate::errors::AppResult;
use parking_lot::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;
use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

static PENDING: OnceLock<Mutex<i64>> = OnceLock::new();
pub static EXITING: AtomicBool = AtomicBool::new(false);

pub fn install(app: &AppHandle) -> AppResult<()> {
    PENDING.set(Mutex::new(0)).ok();
    let menu = build_menu(app, 0)?;
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| crate::errors::AppError::Other("Tray ikonu bulunamadı".into()))?;

    TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .tooltip("Trendyol Soru-Cevap")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(|tray, event| {
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    let app = tray.app_handle();
                    show_main_window(app);
                }
                TrayIconEvent::DoubleClick { .. } => {
                    let app = tray.app_handle();
                    show_main_window(app);
                }
                _ => {}
            }
        })
        .build(app)
        .map_err(|e| crate::errors::AppError::Other(format!("Tray oluşturulamadı: {}", e)))?;
    Ok(())
}


fn build_menu(app: &AppHandle, pending: i64) -> AppResult<Menu<tauri::Wry>> {
    let header_label = if pending > 0 {
        format!("Bekleyen Sorular: {}", pending)
    } else {
        "Bekleyen soru yok".to_string()
    };
    let header = MenuItemBuilder::with_id("tray-header", header_label)
        .enabled(false)
        .build(app)
        .map_err(|e| crate::errors::AppError::Other(e.to_string()))?;
    let open = MenuItemBuilder::with_id("tray-open", "Pencereyi Aç")
        .build(app)
        .map_err(|e| crate::errors::AppError::Other(e.to_string()))?;
    let sync = MenuItemBuilder::with_id("tray-sync", "Şimdi Senkronize Et")
        .build(app)
        .map_err(|e| crate::errors::AppError::Other(e.to_string()))?;
    let quit = MenuItemBuilder::with_id("tray-quit", "Çıkış")
        .build(app)
        .map_err(|e| crate::errors::AppError::Other(e.to_string()))?;
    MenuBuilder::new(app)
        .item(&header)
        .separator()
        .item(&open)
        .item(&sync)
        .separator()
        .item(&quit)
        .build()
        .map_err(|e| crate::errors::AppError::Other(e.to_string()))
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "tray-open" => show_main_window(app),
        "tray-sync" => {
            use tauri::Emitter;
            let _ = app.emit("tray:sync-request", ());
        }
        "tray-quit" => {
            EXITING.store(true, Ordering::SeqCst);
            app.exit(0);
        }
        _ => {}
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

pub fn update_pending_count(app: &AppHandle, pending: i64) {
    if let Some(slot) = PENDING.get() {
        let mut cur = slot.lock();
        if *cur == pending {
            return;
        }
        *cur = pending;
    }
    if let Ok(menu) = build_menu(app, pending) {
        if let Some(tray) = app.tray_by_id("main-tray") {
            let _ = tray.set_menu(Some(menu));
            let tip = if pending > 0 {
                format!("Trendyol Soru-Cevap — {} bekleyen", pending)
            } else {
                "Trendyol Soru-Cevap".to_string()
            };
            let _ = tray.set_tooltip(Some(tip));
        }
    }
}
