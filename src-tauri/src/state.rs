use crate::db::{create_pool, DbPool};
use crate::errors::{AppError, AppResult};
use crate::trendyol::client::TrendyolClient;
use parking_lot::Mutex;
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tauri::{AppHandle, Manager};

pub struct AppState {
    pub db: DbPool,
    pub clients: Mutex<HashMap<i64, Arc<TrendyolClient>>>,
    /// En son bildirilen soru ID'leri (kullanıcı pencereyi öne getirince frontend'e
    /// emit edilir; FIFO, max 10).
    pub recent_notifications: Mutex<VecDeque<i64>>,
}

impl AppState {
    pub fn initialize(app: &AppHandle) -> AppResult<Self> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Config(format!("AppData dizini bulunamadı: {}", e)))?;
        let db_path = app_data_dir.join("trendyol_qa.sqlite");
        let db = create_pool(&db_path)?;
        Ok(Self {
            db,
            clients: Mutex::new(HashMap::new()),
            recent_notifications: Mutex::new(VecDeque::with_capacity(16)),
        })
    }

    pub fn push_notification(&self, question_id: i64) {
        let mut q = self.recent_notifications.lock();
        q.push_back(question_id);
        while q.len() > 10 {
            q.pop_front();
        }
    }

    pub fn drain_notifications(&self) -> Vec<i64> {
        let mut q = self.recent_notifications.lock();
        q.drain(..).collect()
    }


    pub fn client_for(&self, store_id: i64) -> Option<Arc<TrendyolClient>> {
        self.clients.lock().get(&store_id).cloned()
    }

    pub fn put_client(&self, store_id: i64, client: TrendyolClient) {
        self.clients.lock().insert(store_id, Arc::new(client));
    }

    pub fn drop_client(&self, store_id: i64) {
        self.clients.lock().remove(&store_id);
    }
}
