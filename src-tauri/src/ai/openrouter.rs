use crate::ai::{AiModel, AiProvider, GenerationRequest};
use crate::errors::{AppError, AppResult};
use async_trait::async_trait;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

pub struct OpenRouterClient {
    api_key: String,
    http: Client,
    base_url: String,
}

impl OpenRouterClient {
    pub fn new(api_key: String, base_url: Option<String>) -> AppResult<Self> {
        let http = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|e| AppError::Http(e.to_string()))?;
        Ok(Self {
            api_key,
            http,
            base_url: base_url.unwrap_or_else(|| "https://openrouter.ai/api/v1".to_string()),
        })
    }

    fn headers(&self) -> AppResult<HeaderMap> {
        let mut h = HeaderMap::new();
        h.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", self.api_key))
                .map_err(|e| AppError::Config(e.to_string()))?,
        );
        h.insert("HTTP-Referer", HeaderValue::from_static("https://trendyolqa.local"));
        h.insert("X-Title", HeaderValue::from_static("Trendyol QA"));
        Ok(h)
    }

    fn map_error(status: reqwest::StatusCode, body: String) -> AppError {
        let code = status.as_u16();
        match code {
            401 | 403 => AppError::Ai("OpenRouter API key geçersiz veya yetkisiz.".into()),
            402 => AppError::Ai(
                "OpenRouter kredinizin tükendi. Hesabınıza kredi yükleyin veya farklı sağlayıcı seçin."
                    .into(),
            ),
            429 => AppError::Ai(
                "OpenRouter rate limit aşıldı. Birkaç dakika bekleyip tekrar deneyin.".into(),
            ),
            500..=599 => AppError::Ai(format!(
                "OpenRouter sunucu hatası ({}). Lütfen tekrar deneyin.",
                code
            )),
            _ => AppError::Ai(format!("OpenRouter hata {}: {}", code, body)),
        }
    }
}

#[derive(Debug, Deserialize)]
struct ModelsResp {
    data: Vec<ModelEntry>,
}

#[derive(Debug, Deserialize)]
struct ModelEntry {
    id: String,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    description: Option<String>,
}

#[derive(Debug, Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    temperature: f32,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[async_trait]
impl AiProvider for OpenRouterClient {
    async fn list_models(&self) -> AppResult<Vec<AiModel>> {
        let url = format!("{}/models", self.base_url);
        let resp = self.http.get(&url).headers(self.headers()?).send().await?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(Self::map_error(status, body));
        }
        let parsed: ModelsResp = resp.json().await.map_err(|e| AppError::Ai(e.to_string()))?;
        Ok(parsed
            .data
            .into_iter()
            .map(|m| AiModel {
                name: m.name.clone().unwrap_or_else(|| m.id.clone()),
                id: m.id,
                description: m.description,
            })
            .collect())
    }

    async fn generate(&self, req: GenerationRequest<'_>) -> AppResult<String> {
        let url = format!("{}/chat/completions", self.base_url);
        let mut messages: Vec<ChatMessage> = Vec::new();
        if let Some(sys) = req.system_prompt {
            messages.push(ChatMessage {
                role: "system".into(),
                content: sys.to_string(),
            });
        }
        messages.push(ChatMessage {
            role: "user".into(),
            content: req.user_prompt.to_string(),
        });
        let body = ChatRequest {
            model: req.model,
            messages,
            max_tokens: req.max_tokens,
            temperature: 0.4,
        };
        let resp = self
            .http
            .post(&url)
            .headers(self.headers()?)
            .json(&body)
            .send()
            .await?;
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(Self::map_error(status, body));
        }
        let json: Value = resp.json().await.map_err(|e| AppError::Ai(e.to_string()))?;
        let text = json
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(|t| t.as_str())
            .ok_or_else(|| AppError::Ai("OpenRouter cevabı boş döndü.".into()))?;
        Ok(text.to_string())
    }
}
