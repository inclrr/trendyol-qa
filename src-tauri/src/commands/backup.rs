use crate::errors::{AppError, AppResult};
use crate::state::AppState;
use rusqlite::params;
use std::path::Path;
use std::sync::Arc;
use tauri::{Manager, State};

#[tauri::command]
pub async fn backup_export(
    state: State<'_, Arc<AppState>>,
    destination: String,
) -> AppResult<u64> {
    let path = Path::new(&destination);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Other(format!("Hedef dizin oluşturulamadı: {}", e)))?;
    }
    // VACUUM INTO ile temiz bir kopya oluştur
    let conn = state.db.get()?;
    conn.execute(
        &format!("VACUUM INTO ?1"),
        params![destination.as_str()],
    )?;
    let size = std::fs::metadata(&destination)
        .map(|m| m.len())
        .unwrap_or(0);
    Ok(size)
}

#[tauri::command]
pub async fn backup_import(
    app: tauri::AppHandle,
    state: State<'_, Arc<AppState>>,
    source: String,
) -> AppResult<()> {
    let src = Path::new(&source);
    if !src.exists() {
        return Err(AppError::Validation("Yedek dosyası bulunamadı.".into()));
    }
    // Mevcut DB konumunu çöz
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Other(format!("AppData yolu alınamadı: {}", e)))?;
    let db_path = app_data_dir.join("trendyol_qa.sqlite");
    let backup_path = app_data_dir.join("trendyol_qa.sqlite.backup");

    // Tüm pool bağlantılarını kapatmaya çalış (havuzu drop edemeyiz ama best-effort)
    // r2d2 ile zorlamak zor, kullanıcı uygulamayı restart edecek

    // Mevcut DB'yi backup'a kaydır, yeni DB'yi koy
    if db_path.exists() {
        let _ = std::fs::remove_file(&backup_path);
        std::fs::rename(&db_path, &backup_path)
            .map_err(|e| AppError::Other(format!("Mevcut DB yedeği oluşturulamadı: {}", e)))?;
    }
    std::fs::copy(src, &db_path)
        .map_err(|e| AppError::Other(format!("Yedek kopyalanamadı: {}", e)))?;

    // WAL/SHM dosyalarını da temizle (yeni DB'nin kendine ait olabilir)
    let _ = std::fs::remove_file(db_path.with_extension("sqlite-wal"));
    let _ = std::fs::remove_file(db_path.with_extension("sqlite-shm"));

    // Backup başarılı ama mevcut pool yeni DB'yi göremez — kullanıcı app'i yeniden başlatmalı
    drop(state);
    Ok(())
}

#[tauri::command]
pub async fn get_db_path(app: tauri::AppHandle) -> AppResult<String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Other(format!("AppData yolu alınamadı: {}", e)))?;
    let db_path = app_data_dir.join("trendyol_qa.sqlite");
    Ok(db_path.to_string_lossy().into_owned())
}
