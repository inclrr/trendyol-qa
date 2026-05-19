use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Veritabanı hatası: {0}")]
    Db(String),
    #[error("HTTP hatası: {0}")]
    Http(String),
    #[error("Yetkilendirme hatası (401): API Key / Secret bilgilerinizi kontrol edin.")]
    Unauthorized,
    #[error("Erişim reddedildi (403): User-Agent veya IP yetkilendirme problemi olabilir.")]
    Forbidden,
    #[error("İstek limiti aşıldı (429): Lütfen biraz bekleyip yeniden deneyin.")]
    RateLimited,
    #[error("Trendyol API hatası: {status} - {message}")]
    Trendyol { status: u16, message: String },
    #[error("Keyring hatası: {0}")]
    Keyring(String),
    #[error("AI hatası: {0}")]
    Ai(String),
    #[error("Doğrulama hatası: {0}")]
    Validation(String),
    #[error("Yapılandırma hatası: {0}")]
    Config(String),
    #[error("Beklenmedik hata: {0}")]
    Other(String),
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Db(e.to_string())
    }
}

impl From<r2d2::Error> for AppError {
    fn from(e: r2d2::Error) -> Self {
        AppError::Db(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        if let Some(status) = e.status() {
            match status.as_u16() {
                401 => AppError::Unauthorized,
                403 => AppError::Forbidden,
                429 => AppError::RateLimited,
                code => AppError::Trendyol {
                    status: code,
                    message: e.to_string(),
                },
            }
        } else {
            AppError::Http(e.to_string())
        }
    }
}

impl From<keyring::Error> for AppError {
    fn from(e: keyring::Error) -> Self {
        AppError::Keyring(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Other(format!("JSON: {}", e))
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        AppError::Other(e.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
