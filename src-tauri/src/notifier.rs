use crate::commands::settings::get_setting_sync;
use crate::state::AppState;
use crate::trendyol::models::TrendyolQuestion;
use std::sync::Arc;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

pub fn notify_new_questions(
    app: &AppHandle,
    state: &Arc<AppState>,
    store_name: &str,
    items: &[TrendyolQuestion],
) {
    if items.is_empty() {
        return;
    }
    for item in items {
        state.push_notification(item.id);
    }
    let sound_enabled = get_setting_sync(state, "notification_sound_enabled")
        .map(|v| v != "false")
        .unwrap_or(true);
    let title = if items.len() == 1 {
        format!("Yeni soru — {}", store_name)
    } else {
        format!("{} yeni soru — {}", items.len(), store_name)
    };
    let body = if items.len() == 1 {
        let q = &items[0];
        let user = q.user_name.clone().unwrap_or_else(|| "Müşteri".into());
        format!("{}: {}", user, truncate(&q.text, 140))
    } else {
        items
            .iter()
            .take(3)
            .map(|q| {
                let user = q.user_name.clone().unwrap_or_else(|| "Müşteri".into());
                format!("• {}: {}", user, truncate(&q.text, 80))
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let mut builder = app.notification().builder().title(title).body(body);
    if sound_enabled {
        builder = builder.sound("default");
    }
    let _ = builder.show();
}

fn truncate(s: &str, n: usize) -> String {
    if s.chars().count() <= n {
        return s.to_string();
    }
    let mut buf: String = s.chars().take(n).collect();
    buf.push('…');
    buf
}
