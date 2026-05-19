//! Secret yönetimi. Tüm sırlar `secret_store` (cross-platform şifreli dosya) üzerinden okunur/yazılır.
//! v0.4.x'te keyring crate kullanılıyordu; v0.5.0'da macOS Keychain prompt sorunu nedeniyle
//! cross-platform dosya tabanlı store'a geçildi. İlk açılışta otomatik migration yapılır
//! (lib.rs setup içinde).

use crate::errors::AppResult;
use crate::secret_store::SecretStore;

pub const STORE_SERVICE: &str = "TrendyolQA";
pub const AI_SERVICE: &str = "TrendyolQA-AI";

fn store_key_account(seller_id: i64) -> String {
    format!("store-{}-key", seller_id)
}

fn store_secret_account(seller_id: i64) -> String {
    format!("store-{}-secret", seller_id)
}

fn ai_key_account(provider: &str) -> String {
    format!("ai-{}", provider)
}

pub fn save_store_credentials(seller_id: i64, key: &str, secret: &str) -> AppResult<()> {
    let store = SecretStore::get()?;
    store.set(&store_key_account(seller_id), key)?;
    store.set(&store_secret_account(seller_id), secret)?;
    Ok(())
}

pub fn read_store_credentials(seller_id: i64) -> AppResult<(String, String)> {
    let store = SecretStore::get()?;
    let key = store.get_value(&store_key_account(seller_id)).ok_or_else(|| {
        crate::errors::AppError::Keyring(format!("Mağaza {} için API key bulunamadı", seller_id))
    })?;
    let secret = store
        .get_value(&store_secret_account(seller_id))
        .ok_or_else(|| {
            crate::errors::AppError::Keyring(format!(
                "Mağaza {} için API secret bulunamadı",
                seller_id
            ))
        })?;
    Ok((key, secret))
}

pub fn delete_store_credentials(seller_id: i64) -> AppResult<()> {
    let store = SecretStore::get()?;
    let _ = store.delete(&store_key_account(seller_id));
    let _ = store.delete(&store_secret_account(seller_id));
    Ok(())
}

pub fn save_ai_key(provider: &str, api_key: &str) -> AppResult<()> {
    let store = SecretStore::get()?;
    store.set(&ai_key_account(provider), api_key)
}

pub fn read_ai_key(provider: &str) -> AppResult<String> {
    let store = SecretStore::get()?;
    store.get_value(&ai_key_account(provider)).ok_or_else(|| {
        crate::errors::AppError::Keyring(format!("{} için API key bulunamadı", provider))
    })
}

pub fn delete_ai_key(provider: &str) -> AppResult<()> {
    let store = SecretStore::get()?;
    let _ = store.delete(&ai_key_account(provider));
    Ok(())
}

/// v0.4.x → v0.5.0 migration. keyring'deki kayıtları yeni dosya store'a taşır.
/// Sadece settings'te `keyring_migrated` set değilse çağrılır.
pub fn migrate_from_keyring(stores: &[(i64, String, String)], ai_providers: &[String]) -> AppResult<()> {
    use keyring::Entry;
    let mut entries: Vec<(String, String)> = Vec::new();

    for (seller_id, _name, _env) in stores.iter() {
        if let Ok(e) = Entry::new(STORE_SERVICE, &store_key_account(*seller_id)) {
            if let Ok(val) = e.get_password() {
                entries.push((store_key_account(*seller_id), val));
            }
        }
        if let Ok(e) = Entry::new(STORE_SERVICE, &store_secret_account(*seller_id)) {
            if let Ok(val) = e.get_password() {
                entries.push((store_secret_account(*seller_id), val));
            }
        }
    }
    for provider in ai_providers {
        if let Ok(e) = Entry::new(AI_SERVICE, provider) {
            if let Ok(val) = e.get_password() {
                entries.push((ai_key_account(provider), val));
            }
        }
    }

    let store = SecretStore::get()?;
    store.migrate_from_keyring(entries.clone())?;

    // Migration başarılı: keyring'den temizle (best-effort; macOS prompt'u önlemek için)
    for (seller_id, _, _) in stores.iter() {
        if let Ok(e) = Entry::new(STORE_SERVICE, &store_key_account(*seller_id)) {
            let _ = e.delete_credential();
        }
        if let Ok(e) = Entry::new(STORE_SERVICE, &store_secret_account(*seller_id)) {
            let _ = e.delete_credential();
        }
    }
    for provider in ai_providers {
        if let Ok(e) = Entry::new(AI_SERVICE, provider) {
            let _ = e.delete_credential();
        }
    }

    log::info!(
        "Keyring migration tamamlandı: {} kayıt taşındı.",
        entries.len()
    );
    Ok(())
}
