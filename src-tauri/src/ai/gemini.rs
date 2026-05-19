use crate::ai::{AiModel, AiProvider, GenerationRequest};
use crate::errors::{AppError, AppResult};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

pub struct GeminiClient {
    api_key: String,
    http: Client,
    base_url: String,
}

impl GeminiClient {
    pub fn new(api_key: String) -> AppResult<Self> {
        let http = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|e| AppError::Http(e.to_string()))?;
        Ok(Self {
            api_key,
            http,
            base_url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
        })
    }
}

#[derive(Debug, Deserialize)]
struct ModelsResp {
    models: Option<Vec<ModelEntry>>,
}

#[derive(Debug, Deserialize)]
struct ModelEntry {
    name: String,
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    supported_generation_methods: Vec<String>,
}

#[derive(Debug, Serialize)]
struct GenerateBody {
    contents: Vec<Content>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system_instruction: Option<SystemInstruction>,
    #[serde(rename = "generationConfig", skip_serializing_if = "Option::is_none")]
    generation_config: Option<Value>,
}

#[derive(Debug, Serialize)]
struct Content {
    role: String,
    parts: Vec<Part>,
}

#[derive(Debug, Serialize)]
struct Part {
    text: String,
}

#[derive(Debug, Serialize)]
struct SystemInstruction {
    parts: Vec<Part>,
}

#[async_trait]
impl AiProvider for GeminiClient {
    async fn list_models(&self) -> AppResult<Vec<AiModel>> {
        let url = format!("{}/models?key={}", self.base_url, self.api_key);
        let resp = self.http.get(&url).send().await?;
        if !resp.status().is_success() {
            return Err(AppError::Ai(format!(
                "Gemini models {}: {}",
                resp.status(),
                resp.text().await.unwrap_or_default()
            )));
        }
        let parsed: ModelsResp = resp.json().await.map_err(|e| AppError::Ai(e.to_string()))?;
        let models = parsed
            .models
            .unwrap_or_default()
            .into_iter()
            .filter(|m| {
                m.supported_generation_methods.is_empty()
                    || m.supported_generation_methods
                        .iter()
                        .any(|s| s == "generateContent")
            })
            .map(|m| AiModel {
                id: m.name.trim_start_matches("models/").to_string(),
                name: m.display_name.unwrap_or_else(|| m.name.clone()),
                description: m.description,
            })
            .collect();
        Ok(models)
    }

    async fn generate(&self, req: GenerationRequest<'_>) -> AppResult<String> {
        let model_id = req.model.trim_start_matches("models/");
        let url = format!(
            "{}/models/{}:generateContent?key={}",
            self.base_url, model_id, self.api_key
        );
        let body = GenerateBody {
            contents: vec![Content {
                role: "user".into(),
                parts: vec![Part {
                    text: req.user_prompt.to_string(),
                }],
            }],
            system_instruction: req.system_prompt.map(|s| SystemInstruction {
                parts: vec![Part { text: s.into() }],
            }),
            generation_config: req.max_tokens.map(|m| {
                json!({
                    "maxOutputTokens": m,
                    "temperature": 0.4,
                })
            }),
        };
        let resp = self.http.post(&url).json(&body).send().await?;
        let status = resp.status();
        if !status.is_success() {
            return Err(AppError::Ai(format!(
                "Gemini generate {}: {}",
                status,
                resp.text().await.unwrap_or_default()
            )));
        }
        let json: Value = resp.json().await.map_err(|e| AppError::Ai(e.to_string()))?;
        let text = json
            .get("candidates")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("content"))
            .and_then(|c| c.get("parts"))
            .and_then(|p| p.get(0))
            .and_then(|p| p.get("text"))
            .and_then(|t| t.as_str())
            .ok_or_else(|| AppError::Ai("Gemini cevabı boş döndü.".into()))?;
        Ok(text.to_string())
    }
}
