use crate::errors::{AppError, AppResult};
use argon2::Argon2;
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Nonce};
use parking_lot::Mutex;
use rand::RngCore;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

const FILE_NAME: &str = "secrets.bin";
const SALT_NAME: &str = "secrets.salt";
const KEY_SIZE: usize = 32;
const NONCE_SIZE: usize = 12;

/// Platformdan bağımsız, dosya tabanlı şifreli secret store.
/// macOS Keychain prompt sorununu (ad-hoc imzalı app'lerde) çözmek için keyring yerine kullanılır.
///
/// Şifreleme: ChaCha20-Poly1305 AEAD
/// Key türetme: Argon2id(machine_id + app_data_path + salt)
/// Dosya formatı: [12 byte nonce] + [encrypted JSON + 16 byte AEAD tag]
pub struct SecretStore {
    file_path: PathBuf,
    key: [u8; KEY_SIZE],
    cache: Mutex<HashMap<String, String>>,
    loaded: Mutex<bool>,
}

static INSTANCE: OnceLock<SecretStore> = OnceLock::new();

impl SecretStore {
    pub fn init(app_data_dir: &Path) -> AppResult<&'static SecretStore> {
        if let Some(s) = INSTANCE.get() {
            return Ok(s);
        }
        std::fs::create_dir_all(app_data_dir)
            .map_err(|e| AppError::Other(format!("AppData dizini oluşturulamadı: {}", e)))?;
        let file_path = app_data_dir.join(FILE_NAME);
        let salt_path = app_data_dir.join(SALT_NAME);

        // Salt: kalıcı, ilk açılışta üretilir
        let salt = if salt_path.exists() {
            std::fs::read(&salt_path)
                .map_err(|e| AppError::Other(format!("Salt okunamadı: {}", e)))?
        } else {
            let mut s = [0u8; 16];
            rand::thread_rng().fill_bytes(&mut s);
            std::fs::write(&salt_path, s)
                .map_err(|e| AppError::Other(format!("Salt yazılamadı: {}", e)))?;
            s.to_vec()
        };

        // Anahtar materyali: makine UID + app_data path
        let machine_id = format!("{}-{}", whoami::username(), whoami::devicename());
        let path_str = app_data_dir.to_string_lossy();
        let mut material = Vec::new();
        material.extend_from_slice(machine_id.as_bytes());
        material.extend_from_slice(b"|");
        material.extend_from_slice(path_str.as_bytes());

        let mut key = [0u8; KEY_SIZE];
        let argon = Argon2::default();
        argon
            .hash_password_into(&material, &salt, &mut key)
            .map_err(|e| AppError::Other(format!("Anahtar türetilemedi: {}", e)))?;

        let store = SecretStore {
            file_path,
            key,
            cache: Mutex::new(HashMap::new()),
            loaded: Mutex::new(false),
        };
        store.load()?;
        INSTANCE.set(store).map_err(|_| AppError::Other("SecretStore zaten init edilmiş".into()))?;
        Ok(INSTANCE.get().unwrap())
    }

    pub fn get() -> AppResult<&'static SecretStore> {
        INSTANCE
            .get()
            .ok_or_else(|| AppError::Other("SecretStore henüz init edilmedi".into()))
    }

    fn load(&self) -> AppResult<()> {
        let mut loaded = self.loaded.lock();
        if *loaded {
            return Ok(());
        }
        if !self.file_path.exists() {
            *loaded = true;
            return Ok(());
        }
        let bytes = std::fs::read(&self.file_path)
            .map_err(|e| AppError::Other(format!("Secret store okunamadı: {}", e)))?;
        if bytes.len() < NONCE_SIZE + 16 {
            log::warn!("Secret store bozuk (çok küçük), sıfırdan başlanıyor");
            *loaded = true;
            return Ok(());
        }
        let (nonce_bytes, ciphertext) = bytes.split_at(NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);
        let cipher = ChaCha20Poly1305::new(self.key[..].into());
        let plaintext = cipher.decrypt(nonce, ciphertext).map_err(|_| {
            AppError::Other("Secret store şifre çözülemedi (bozuk veya farklı makine)".into())
        })?;
        let map: HashMap<String, String> = serde_json::from_slice(&plaintext)
            .map_err(|e| AppError::Other(format!("Secret JSON parse hatası: {}", e)))?;
        *self.cache.lock() = map;
        *loaded = true;
        Ok(())
    }

    fn persist(&self) -> AppResult<()> {
        let map = self.cache.lock().clone();
        let plaintext = serde_json::to_vec(&map)?;
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let cipher = ChaCha20Poly1305::new(self.key[..].into());
        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_ref())
            .map_err(|_| AppError::Other("Şifreleme başarısız".into()))?;
        let mut out = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
        out.extend_from_slice(&nonce_bytes);
        out.extend_from_slice(&ciphertext);
        // Atomik yazım: önce .tmp'ye, sonra rename
        let tmp = self.file_path.with_extension("bin.tmp");
        std::fs::write(&tmp, &out)
            .map_err(|e| AppError::Other(format!("Secret store yazılamadı: {}", e)))?;
        std::fs::rename(&tmp, &self.file_path)
            .map_err(|e| AppError::Other(format!("Secret store rename başarısız: {}", e)))?;
        Ok(())
    }

    pub fn set(&self, key: &str, value: &str) -> AppResult<()> {
        self.cache.lock().insert(key.to_string(), value.to_string());
        self.persist()
    }

    pub fn get_value(&self, key: &str) -> Option<String> {
        self.cache.lock().get(key).cloned()
    }

    pub fn delete(&self, key: &str) -> AppResult<()> {
        let removed = self.cache.lock().remove(key).is_some();
        if removed {
            self.persist()?;
        }
        Ok(())
    }

    /// Eski keyring'den şeffaf migration. Tek seferlik; başarılı olduktan sonra `keyring_migrated`
    /// bayrağı set edilir (caller tarafından).
    pub fn migrate_from_keyring(&self, entries: Vec<(String, String)>) -> AppResult<()> {
        if entries.is_empty() {
            return Ok(());
        }
        let mut cache = self.cache.lock();
        for (k, v) in entries {
            cache.entry(k).or_insert(v);
        }
        drop(cache);
        self.persist()
    }
}

/// Test helper: secret store'da tüm anahtarları listele (debug için)
#[cfg(test)]
pub fn _all_keys() -> Vec<String> {
    SecretStore::get()
        .ok()
        .map(|s| s.cache.lock().keys().cloned().collect())
        .unwrap_or_default()
}

// Hata mapper: serde_json => AppError zaten errors.rs'te tanımlı
fn _ensure_value_type<T: serde::de::DeserializeOwned>(v: JsonValue) -> AppResult<T> {
    serde_json::from_value(v).map_err(|e| AppError::Other(format!("JSON tip hatası: {}", e)))
}
