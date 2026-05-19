use crate::errors::{AppError, AppResult};
use crate::trendyol::models::{AnswerRequest, AnswerResponse, QuestionFilterResponse};
use base64::{engine::general_purpose, Engine as _};
use governor::clock::DefaultClock;
use governor::state::{InMemoryState, NotKeyed};
use governor::{Quota, RateLimiter};
use nonzero_ext::nonzero;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, USER_AGENT};
use serde::Serialize;
use std::sync::Arc;
use std::time::Duration;

type Limiter = RateLimiter<NotKeyed, InMemoryState, DefaultClock>;

#[derive(Debug, Clone)]
pub struct TrendyolConfig {
    pub seller_id: i64,
    pub api_key: String,
    pub api_secret: String,
    pub user_agent: String,
    pub base_url: String,
}

pub struct TrendyolClient {
    cfg: TrendyolConfig,
    http: reqwest::Client,
    qa_limiter: Arc<Limiter>,
    answer_limiter: Arc<Limiter>,
    burst_limiter: Arc<Limiter>,
}

impl TrendyolConfig {
    pub fn base_for(env: &str) -> String {
        match env {
            "stage" => "https://stageapigw.trendyol.com".to_string(),
            _ => "https://apigw.trendyol.com".to_string(),
        }
    }

    pub fn build_user_agent(seller_id: i64, integrator: &str) -> String {
        let mut ua = format!("{} - {}", seller_id, integrator.trim());
        if ua.len() > 60 {
            ua.truncate(60);
        }
        ua
    }
}

impl TrendyolClient {
    pub fn new(cfg: TrendyolConfig) -> AppResult<Self> {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| AppError::Http(e.to_string()))?;
        Ok(Self {
            cfg,
            http,
            qa_limiter: Arc::new(RateLimiter::direct(Quota::per_minute(nonzero!(900u32)))),
            answer_limiter: Arc::new(RateLimiter::direct(Quota::per_minute(nonzero!(450u32)))),
            burst_limiter: Arc::new(
                RateLimiter::direct(Quota::with_period(Duration::from_millis(250)).unwrap()),
            ),
        })
    }

    fn auth_header(&self) -> AppResult<HeaderValue> {
        let token = format!("{}:{}", self.cfg.api_key, self.cfg.api_secret);
        let encoded = general_purpose::STANDARD.encode(token.as_bytes());
        HeaderValue::from_str(&format!("Basic {}", encoded))
            .map_err(|e| AppError::Config(format!("Auth header oluşturulamadı: {}", e)))
    }

    fn base_headers(&self) -> AppResult<HeaderMap> {
        let mut h = HeaderMap::new();
        h.insert(AUTHORIZATION, self.auth_header()?);
        h.insert(
            USER_AGENT,
            HeaderValue::from_str(&self.cfg.user_agent)
                .map_err(|e| AppError::Config(format!("User-Agent geçersiz: {}", e)))?,
        );
        Ok(h)
    }

    async fn wait_limits(&self, limiter: &Limiter) {
        limiter.until_ready().await;
        self.burst_limiter.until_ready().await;
    }

    async fn map_status<T: for<'de> serde::Deserialize<'de>>(
        resp: reqwest::Response,
    ) -> AppResult<T> {
        let status = resp.status();
        if status.is_success() {
            return resp.json::<T>().await.map_err(|e| {
                AppError::Other(format!("Yanıt JSON parse hatası: {}", e))
            });
        }
        let code = status.as_u16();
        let body = resp.text().await.unwrap_or_default();
        Err(match code {
            401 => AppError::Unauthorized,
            403 => AppError::Forbidden,
            429 => AppError::RateLimited,
            _ => AppError::Trendyol {
                status: code,
                message: body,
            },
        })
    }

    pub async fn fetch_questions(
        &self,
        params: &QuestionsFilter,
    ) -> AppResult<QuestionFilterResponse> {
        self.wait_limits(&self.qa_limiter).await;
        let url = format!(
            "{}/integration/qna/sellers/{}/questions/filter",
            self.cfg.base_url, self.cfg.seller_id
        );
        let resp = self
            .http
            .get(&url)
            .headers(self.base_headers()?)
            .query(params)
            .send()
            .await?;
        Self::map_status::<QuestionFilterResponse>(resp).await
    }

    pub async fn create_answer(
        &self,
        question_id: i64,
        text: &str,
    ) -> AppResult<AnswerResponse> {
        self.wait_limits(&self.answer_limiter).await;
        let url = format!(
            "{}/integration/qna/sellers/{}/questions/{}/answers",
            self.cfg.base_url, self.cfg.seller_id, question_id
        );
        let resp = self
            .http
            .post(&url)
            .headers(self.base_headers()?)
            .json(&AnswerRequest {
                text: text.to_string(),
            })
            .send()
            .await?;
        Self::map_status::<AnswerResponse>(resp).await
    }

    pub async fn test_connection(&self) -> AppResult<()> {
        let filter = QuestionsFilter {
            size: Some(1),
            status: Some("WAITING_FOR_ANSWER".into()),
            ..Default::default()
        };
        self.fetch_questions(&filter).await.map(|_| ())
    }
}

#[derive(Debug, Default, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionsFilter {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_date: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_date: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub barcode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "orderByField")]
    pub order_by_field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "orderByDirection")]
    pub order_by_direction: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "supplierId")]
    pub supplier_id: Option<i64>,
}
