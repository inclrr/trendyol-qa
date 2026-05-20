pub mod embeddings;
pub mod gemini;
pub mod ollama;
pub mod openrouter;
pub mod prompt;
pub mod rag;

use crate::errors::AppResult;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModel {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

/// Provider'a iletilebilen sampling/runtime parametreleri.
/// Tüm alanlar opsiyonel — provider varsayılanları kullanır.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct GenerationOptions {
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub top_k: Option<u32>,
    pub repeat_penalty: Option<f32>,
    pub num_ctx: Option<u32>,
    pub keep_alive: Option<String>,
}

impl GenerationOptions {
    /// Tutarlı (önerilen) — müşteri hizmetleri için
    pub fn consistent() -> Self {
        Self {
            temperature: Some(0.3),
            top_p: Some(0.7),
            top_k: Some(20),
            repeat_penalty: Some(1.15),
            num_ctx: Some(4096),
            keep_alive: Some("10m".into()),
        }
    }

    /// Yaratıcı — daha çeşitli cevap
    pub fn creative() -> Self {
        Self {
            temperature: Some(0.8),
            top_p: Some(0.95),
            top_k: Some(40),
            repeat_penalty: Some(1.1),
            num_ctx: Some(4096),
            keep_alive: Some("10m".into()),
        }
    }
}

#[derive(Debug, Clone)]
pub struct GenerationRequest<'a> {
    pub system_prompt: Option<&'a str>,
    pub user_prompt: &'a str,
    pub model: &'a str,
    pub max_tokens: Option<u32>,
    pub options: GenerationOptions,
}

#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn list_models(&self) -> AppResult<Vec<AiModel>>;
    async fn generate(&self, req: GenerationRequest<'_>) -> AppResult<String>;
}
