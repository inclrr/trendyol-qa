use crate::commands::secrets;
use crate::errors::{AppError, AppResult};
use crate::state::AppState;
use crate::trendyol::client::{TrendyolClient, TrendyolConfig};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Store {
    pub id: i64,
    pub name: String,
    #[serde(rename = "sellerId")]
    pub seller_id: i64,
    pub environment: String,
    #[serde(rename = "integratorName")]
    pub integrator_name: String,
    pub active: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateStorePayload {
    pub name: String,
    #[serde(rename = "sellerId")]
    pub seller_id: i64,
    pub environment: String,
    #[serde(rename = "integratorName")]
    pub integrator_name: Option<String>,
    pub active: Option<bool>,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    #[serde(rename = "apiSecret")]
    pub api_secret: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStorePayload {
    pub id: i64,
    pub name: String,
    pub environment: String,
    #[serde(rename = "integratorName")]
    pub integrator_name: String,
    pub active: bool,
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
    #[serde(rename = "apiSecret")]
    pub api_secret: Option<String>,
}

fn row_to_store(row: &rusqlite::Row) -> rusqlite::Result<Store> {
    Ok(Store {
        id: row.get(0)?,
        name: row.get(1)?,
        seller_id: row.get(2)?,
        environment: row.get(3)?,
        integrator_name: row.get(4)?,
        active: row.get::<_, i64>(5)? != 0,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

#[tauri::command]
pub async fn list_stores(state: State<'_, Arc<AppState>>) -> AppResult<Vec<Store>> {
    let conn = state.db.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, name, seller_id, environment, integrator_name, active, created_at, updated_at \
         FROM stores ORDER BY name",
    )?;
    let stores = stmt
        .query_map([], row_to_store)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(stores)
}

pub fn build_client_for_store(store: &Store) -> AppResult<TrendyolClient> {
    let (api_key, api_secret) = secrets::read_store_credentials(store.seller_id)?;
    let cfg = TrendyolConfig {
        seller_id: store.seller_id,
        api_key,
        api_secret,
        user_agent: TrendyolConfig::build_user_agent(store.seller_id, &store.integrator_name),
        base_url: TrendyolConfig::base_for(&store.environment),
    };
    TrendyolClient::new(cfg)
}

pub fn get_store_by_id(state: &AppState, id: i64) -> AppResult<Store> {
    let conn = state.db.get()?;
    let store = conn.query_row(
        "SELECT id, name, seller_id, environment, integrator_name, active, created_at, updated_at \
         FROM stores WHERE id = ?1",
        params![id],
        row_to_store,
    )?;
    Ok(store)
}

pub fn list_active_stores(state: &AppState) -> AppResult<Vec<Store>> {
    let conn = state.db.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, name, seller_id, environment, integrator_name, active, created_at, updated_at \
         FROM stores WHERE active = 1 ORDER BY name",
    )?;
    let stores = stmt
        .query_map([], row_to_store)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(stores)
}

pub fn ensure_client(state: &AppState, store: &Store) -> AppResult<Arc<TrendyolClient>> {
    if let Some(c) = state.client_for(store.id) {
        return Ok(c);
    }
    let client = build_client_for_store(store)?;
    state.put_client(store.id, client);
    state
        .client_for(store.id)
        .ok_or_else(|| AppError::Other("İstemci oluşturulamadı".into()))
}

#[tauri::command]
pub async fn create_store(
    state: State<'_, Arc<AppState>>,
    payload: CreateStorePayload,
) -> AppResult<Store> {
    if payload.api_key.trim().is_empty() || payload.api_secret.trim().is_empty() {
        return Err(AppError::Validation(
            "API Key ve API Secret zorunludur.".into(),
        ));
    }
    let integrator = payload
        .integrator_name
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "SelfIntegration".to_string());

    let now = Utc::now().timestamp_millis();
    let active = payload.active.unwrap_or(true);

    let conn = state.db.get()?;
    conn.execute(
        "INSERT INTO stores (name, seller_id, environment, integrator_name, active, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![payload.name, payload.seller_id, payload.environment, integrator, active as i64, now],
    )?;
    let id = conn.last_insert_rowid();

    secrets::save_store_credentials(payload.seller_id, &payload.api_key, &payload.api_secret)?;

    let store = get_store_by_id(&state, id)?;
    state.drop_client(id);
    Ok(store)
}

#[tauri::command]
pub async fn update_store(
    state: State<'_, Arc<AppState>>,
    payload: UpdateStorePayload,
) -> AppResult<Store> {
    let now = Utc::now().timestamp_millis();
    let existing = get_store_by_id(&state, payload.id)?;
    let conn = state.db.get()?;
    conn.execute(
        "UPDATE stores SET name = ?1, environment = ?2, integrator_name = ?3, active = ?4, updated_at = ?5 \
         WHERE id = ?6",
        params![
            payload.name,
            payload.environment,
            payload.integrator_name,
            payload.active as i64,
            now,
            payload.id
        ],
    )?;
    if let (Some(k), Some(s)) = (&payload.api_key, &payload.api_secret) {
        if !k.trim().is_empty() && !s.trim().is_empty() {
            secrets::save_store_credentials(existing.seller_id, k, s)?;
        }
    } else if payload.api_key.is_some() || payload.api_secret.is_some() {
        return Err(AppError::Validation(
            "API Key ve Secret'ı birlikte güncellemelisiniz.".into(),
        ));
    }
    state.drop_client(payload.id);
    get_store_by_id(&state, payload.id)
}

#[tauri::command]
pub async fn delete_store(state: State<'_, Arc<AppState>>, id: i64) -> AppResult<()> {
    let existing = get_store_by_id(&state, id)?;
    let conn = state.db.get()?;
    conn.execute("DELETE FROM stores WHERE id = ?1", params![id])?;
    let _ = secrets::delete_store_credentials(existing.seller_id);
    state.drop_client(id);
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct TestConnectionPayload {
    #[serde(rename = "sellerId")]
    pub seller_id: i64,
    pub environment: String,
    #[serde(rename = "integratorName")]
    pub integrator_name: Option<String>,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    #[serde(rename = "apiSecret")]
    pub api_secret: String,
}

#[tauri::command]
pub async fn test_store_connection(payload: TestConnectionPayload) -> AppResult<bool> {
    let integrator = payload
        .integrator_name
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "SelfIntegration".to_string());
    let cfg = TrendyolConfig {
        seller_id: payload.seller_id,
        api_key: payload.api_key,
        api_secret: payload.api_secret,
        user_agent: TrendyolConfig::build_user_agent(payload.seller_id, &integrator),
        base_url: TrendyolConfig::base_for(&payload.environment),
    };
    let client = TrendyolClient::new(cfg)?;
    client.test_connection().await?;
    Ok(true)
}
