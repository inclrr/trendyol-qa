use crate::ai::{AiModel, AiProvider, GenerationRequest};
use crate::errors::{AppError, AppResult};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

pub struct OllamaClient {
    base_url: String,
    http: Client,
}

impl OllamaClient {
    pub fn new(base_url: Option<String>) -> AppResult<Self> {
        let http = Client::builder()
            // Büyük modeller (12B+) CPU only'de cevap üretimi 5+ dakika sürebilir
            .timeout(Duration::from_secs(600))
            // İlk bağlantı için kısa timeout — servis kapalıysa hızlı fail
            .connect_timeout(Duration::from_secs(5))
            .build()
            .map_err(|e| AppError::Http(e.to_string()))?;
        let raw = base_url
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| "http://127.0.0.1:11434".to_string());
        // Windows'ta bazı durumlarda `localhost` IPv6'ya çözülüp Ollama (IPv4) ile uyuşmuyor.
        // Otomatik olarak 127.0.0.1'e dönüştür.
        let url = raw.replace("://localhost", "://127.0.0.1");
        Ok(Self {
            base_url: url.trim_end_matches('/').to_string(),
            http,
        })
    }

    fn map_error(status: reqwest::StatusCode, body: String) -> AppError {
        match status.as_u16() {
            404 => AppError::Ai(
                "Ollama'da bu model bulunamadı. `ollama pull <model>` ile indirin.".into(),
            ),
            500..=599 => AppError::Ai(format!(
                "Ollama sunucu hatası ({}). {}",
                status.as_u16(),
                body
            )),
            _ => AppError::Ai(format!("Ollama hata {}: {}", status.as_u16(), body)),
        }
    }
}

#[derive(Debug, Deserialize)]
struct TagsResp {
    models: Vec<ModelEntry>,
}

#[derive(Debug, Deserialize)]
struct ModelEntry {
    name: String,
    #[serde(default)]
    size: u64,
    #[serde(default)]
    details: Option<ModelDetails>,
}

#[derive(Debug, Deserialize)]
struct ModelDetails {
    #[serde(default)]
    parameter_size: Option<String>,
    #[serde(default)]
    quantization_level: Option<String>,
}

#[derive(Debug, Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: Vec<ChatMessage>,
    stream: bool,
    options: ChatOptions,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ChatOptions {
    temperature: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    num_predict: Option<u32>,
}

#[async_trait]
impl AiProvider for OllamaClient {
    async fn list_models(&self) -> AppResult<Vec<AiModel>> {
        let url = format!("{}/api/tags", self.base_url);
        let resp = self.http.get(&url).send().await.map_err(|e| {
            if e.is_connect() {
                AppError::Ai(
                    "Ollama bulunamadı. Ollama'nın çalıştığından (varsayılan: localhost:11434) emin olun.".into(),
                )
            } else {
                AppError::Http(e.to_string())
            }
        })?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(Self::map_error(status, body));
        }
        let parsed: TagsResp = resp.json().await.map_err(|e| AppError::Ai(e.to_string()))?;
        let models = parsed
            .models
            .into_iter()
            .map(|m| {
                let size_mb = m.size / 1024 / 1024;
                let mut desc_parts: Vec<String> = Vec::new();
                if let Some(d) = &m.details {
                    if let Some(p) = &d.parameter_size {
                        desc_parts.push(p.clone());
                    }
                    if let Some(q) = &d.quantization_level {
                        desc_parts.push(q.clone());
                    }
                }
                desc_parts.push(format!("{} MB", size_mb));
                AiModel {
                    id: m.name.clone(),
                    name: m.name.clone(),
                    description: Some(desc_parts.join(" · ")),
                }
            })
            .collect();
        Ok(models)
    }

    async fn generate(&self, req: GenerationRequest<'_>) -> AppResult<String> {
        let url = format!("{}/api/chat", self.base_url);
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
            stream: false,
            options: ChatOptions {
                temperature: 0.4,
                num_predict: req.max_tokens,
            },
        };
        let resp = self.http.post(&url).json(&body).send().await.map_err(|e| {
            if e.is_connect() {
                AppError::Ai(
                    "Ollama bulunamadı. Ollama'nın çalıştığından emin olun (PowerShell: ollama list).".into(),
                )
            } else if e.is_timeout() {
                AppError::Ai(format!(
                    "Ollama yanıt vermedi (zaman aşımı). Büyük modeller (12B+) CPU only'de çok yavaş — daha küçük model deneyin (örn. llama3.2:3b, mistral:7b)."
                ))
            } else {
                AppError::Http(format!("Ollama: {}", e))
            }
        })?;
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(Self::map_error(status, body));
        }
        let json: Value = resp.json().await.map_err(|e| AppError::Ai(e.to_string()))?;
        let text = json
            .get("message")
            .and_then(|m| m.get("content"))
            .and_then(|t| t.as_str())
            .ok_or_else(|| AppError::Ai("Ollama yanıtı boş döndü.".into()))?;
        Ok(text.to_string())
    }
}

/// Health check — Ollama localhost'ta çalışıyor mu?
pub async fn check_health(base_url: Option<String>) -> AppResult<bool> {
    let client = OllamaClient::new(base_url)?;
    match client.list_models().await {
        Ok(_) => Ok(true),
        Err(AppError::Ai(_)) | Err(AppError::Http(_)) => Ok(false),
        Err(e) => Err(e),
    }
}

// json! makro warning suppress (unused import case)
#[allow(dead_code)]
fn _unused() {
    let _ = json!({});
}
