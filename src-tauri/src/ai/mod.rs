pub mod gemini;
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

#[derive(Debug, Clone)]
pub struct GenerationRequest<'a> {
    pub system_prompt: Option<&'a str>,
    pub user_prompt: &'a str,
    pub model: &'a str,
    pub max_tokens: Option<u32>,
}

#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn list_models(&self) -> AppResult<Vec<AiModel>>;
    async fn generate(&self, req: GenerationRequest<'_>) -> AppResult<String>;
}
