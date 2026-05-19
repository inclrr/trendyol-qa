use crate::errors::{AppError, AppResult};
use keyring::Entry;

pub const STORE_SERVICE: &str = "TrendyolQA";
pub const AI_SERVICE: &str = "TrendyolQA-AI";

fn store_key_account(seller_id: i64) -> String {
    format!("store-{}-key", seller_id)
}

fn store_secret_account(seller_id: i64) -> String {
    format!("store-{}-secret", seller_id)
}

pub fn save_store_credentials(seller_id: i64, key: &str, secret: &str) -> AppResult<()> {
    let key_entry = Entry::new(STORE_SERVICE, &store_key_account(seller_id))?;
    key_entry.set_password(key)?;
    let secret_entry = Entry::new(STORE_SERVICE, &store_secret_account(seller_id))?;
    secret_entry.set_password(secret)?;
    Ok(())
}

pub fn read_store_credentials(seller_id: i64) -> AppResult<(String, String)> {
    let key_entry = Entry::new(STORE_SERVICE, &store_key_account(seller_id))?;
    let secret_entry = Entry::new(STORE_SERVICE, &store_secret_account(seller_id))?;
    let key = key_entry
        .get_password()
        .map_err(|_| AppError::Keyring(format!("Mağaza {} için API key bulunamadı", seller_id)))?;
    let secret = secret_entry
        .get_password()
        .map_err(|_| AppError::Keyring(format!("Mağaza {} için API secret bulunamadı", seller_id)))?;
    Ok((key, secret))
}

pub fn delete_store_credentials(seller_id: i64) -> AppResult<()> {
    if let Ok(e) = Entry::new(STORE_SERVICE, &store_key_account(seller_id)) {
        let _ = e.delete_credential();
    }
    if let Ok(e) = Entry::new(STORE_SERVICE, &store_secret_account(seller_id)) {
        let _ = e.delete_credential();
    }
    Ok(())
}

pub fn save_ai_key(provider: &str, api_key: &str) -> AppResult<()> {
    let entry = Entry::new(AI_SERVICE, provider)?;
    entry.set_password(api_key)?;
    Ok(())
}

pub fn read_ai_key(provider: &str) -> AppResult<String> {
    let entry = Entry::new(AI_SERVICE, provider)?;
    entry
        .get_password()
        .map_err(|_| AppError::Keyring(format!("{} için API key bulunamadı", provider)))
}

pub fn delete_ai_key(provider: &str) -> AppResult<()> {
    if let Ok(e) = Entry::new(AI_SERVICE, provider) {
        let _ = e.delete_credential();
    }
    Ok(())
}
