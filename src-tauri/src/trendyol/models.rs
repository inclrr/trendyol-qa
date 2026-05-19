use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TrendyolAnswer {
    pub id: Option<i64>,
    pub text: Option<String>,
    pub creation_date: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TrendyolQuestion {
    pub id: i64,
    pub text: String,
    pub status: String,
    pub creation_date: i64,
    pub answer: Option<TrendyolAnswer>,
    #[serde(default)]
    pub public: Option<bool>,
    pub user_name: Option<String>,
    pub show_user_name: Option<bool>,
    pub customer_id: Option<i64>,
    pub product_main_id: Option<String>,
    pub product_name: Option<String>,
    #[serde(alias = "webUrl")]
    pub product_web_url: Option<String>,
    #[serde(alias = "imageUrl")]
    pub product_image_url: Option<String>,
    pub barcode: Option<String>,
    pub reported_date: Option<i64>,
    pub rejected_date: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct QuestionFilterResponse {
    #[serde(default)]
    pub total_elements: i64,
    #[serde(default)]
    pub total_pages: i64,
    #[serde(default)]
    pub page: i64,
    #[serde(default)]
    pub size: i64,
    #[serde(default)]
    pub content: Vec<TrendyolQuestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerRequest {
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerResponse {
    pub answer_id: Option<i64>,
}
