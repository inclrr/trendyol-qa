//! Embedding-based RAG için yardımcılar. Faz B1'de implement edilecek.
//! Şimdilik boş — mod.rs'in derlenmesi için placeholder.

use crate::errors::AppResult;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize)]
struct OllamaEmbedReq<'a> {
    model: &'a str,
    prompt: &'a str,
}

#[derive(Debug, Deserialize)]
struct OllamaEmbedResp {
    embedding: Vec<f32>,
}

/// Ollama'dan embedding al. base_url default `http://127.0.0.1:11434`.
pub async fn ollama_embed(
    base_url: &str,
    model: &str,
    text: &str,
) -> AppResult<Vec<f32>> {
    let client = Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| crate::errors::AppError::Http(e.to_string()))?;
    let url = format!("{}/api/embeddings", base_url.trim_end_matches('/'));
    let body = OllamaEmbedReq { model, prompt: text };
    let resp = client.post(&url).json(&body).send().await.map_err(|e| {
        if e.is_connect() {
            crate::errors::AppError::Ai("Ollama bulunamadı (embedding).".into())
        } else {
            crate::errors::AppError::Http(e.to_string())
        }
    })?;
    if !resp.status().is_success() {
        let s = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(crate::errors::AppError::Ai(format!(
            "Embedding hata {}: {}",
            s, body
        )));
    }
    let parsed: OllamaEmbedResp = resp
        .json()
        .await
        .map_err(|e| crate::errors::AppError::Ai(e.to_string()))?;
    Ok(parsed.embedding)
}

/// Cosine similarity. İki vektör aynı uzunlukta olmalı (yoksa 0).
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let mut dot = 0.0f32;
    let mut na = 0.0f32;
    let mut nb = 0.0f32;
    for i in 0..a.len() {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    let denom = na.sqrt() * nb.sqrt();
    if denom == 0.0 {
        0.0
    } else {
        dot / denom
    }
}

/// f32 vektörü little-endian binary'e çevir (DB BLOB için).
pub fn embedding_to_bytes(v: &[f32]) -> Vec<u8> {
    let mut out = Vec::with_capacity(v.len() * 4);
    for f in v {
        out.extend_from_slice(&f.to_le_bytes());
    }
    out
}

/// Binary'den f32 vektörü oku.
pub fn bytes_to_embedding(b: &[u8]) -> Vec<f32> {
    let mut out = Vec::with_capacity(b.len() / 4);
    for chunk in b.chunks_exact(4) {
        out.push(f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cosine_identity() {
        let v = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&v, &v);
        assert!((sim - 1.0).abs() < 1e-6);
    }

    #[test]
    fn cosine_orthogonal() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        assert!(cosine_similarity(&a, &b).abs() < 1e-6);
    }

    #[test]
    fn roundtrip_bytes() {
        let v = vec![1.5_f32, -2.25, 0.0, 3.14];
        let bytes = embedding_to_bytes(&v);
        let back = bytes_to_embedding(&bytes);
        assert_eq!(v, back);
    }
}
