use crate::ai::embeddings::{
    bytes_to_embedding, cosine_similarity, embedding_to_bytes, ollama_embed,
};
use crate::errors::AppResult;
use crate::state::AppState;
use rusqlite::params;

pub struct RagContext {
    pub examples: Vec<(String, String)>,
}

#[derive(Debug, Clone)]
struct EmbeddingConfig {
    enabled: bool,
    model: String,
    base_url: String,
}

fn load_embedding_config(state: &AppState) -> AppResult<EmbeddingConfig> {
    let conn = state.db.get()?;
    let mut stmt = conn.prepare(
        "SELECT key, value FROM settings WHERE key IN \
         ('embedding_enabled','embedding_model','embedding_base_url')",
    )?;
    let mut cfg = EmbeddingConfig {
        enabled: false,
        model: "nomic-embed-text".into(),
        base_url: "http://127.0.0.1:11434".into(),
    };
    let rows = stmt.query_map([], |r| {
        Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
    })?;
    for row in rows.flatten() {
        match row.0.as_str() {
            "embedding_enabled" => cfg.enabled = row.1 == "true",
            "embedding_model" => cfg.model = row.1,
            "embedding_base_url" => cfg.base_url = row.1,
            _ => {}
        }
    }
    Ok(cfg)
}

/// Soru için embedding-based en benzer kayıtları getir.
/// Hata veya boş sonuç durumunda None döner, çağıran FTS5'e düşer.
async fn fetch_similar_by_embedding(
    state: &AppState,
    question_text: &str,
    limit: usize,
) -> AppResult<Option<Vec<(String, String, f32)>>> {
    let cfg = load_embedding_config(state)?;
    if !cfg.enabled {
        return Ok(None);
    }
    let query_emb = match ollama_embed(&cfg.base_url, &cfg.model, question_text).await {
        Ok(v) => v,
        Err(e) => {
            log::warn!("Embedding alınamadı, FTS5'e düşülüyor: {}", e);
            return Ok(None);
        }
    };
    if query_emb.is_empty() {
        return Ok(None);
    }

    let conn = state.db.get()?;
    let mut stmt = conn.prepare(
        "SELECT e.question_id, e.embedding, q.text, q.answer_text \
         FROM qa_embeddings e \
         JOIN questions q ON q.question_id = e.question_id \
         WHERE e.model = ?1 AND q.answer_text IS NOT NULL AND q.answer_text != ''",
    )?;
    let rows = stmt.query_map(params![cfg.model], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, Vec<u8>>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
        ))
    });
    let mut scored: Vec<(f32, String, String)> = Vec::new();
    if let Ok(iter) = rows {
        for entry in iter.flatten() {
            let emb = bytes_to_embedding(&entry.1);
            let sim = cosine_similarity(&query_emb, &emb);
            if sim > 0.3 {
                scored.push((sim, entry.2, entry.3));
            }
        }
    }
    if scored.is_empty() {
        return Ok(None);
    }
    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    scored.truncate(limit);
    let result: Vec<(String, String, f32)> =
        scored.into_iter().map(|(s, q, a)| (q, a, s)).collect();
    Ok(Some(result))
}

/// Async hybrid RAG: önce embedding, yoksa/fail durumunda FTS5'e düşer.
pub async fn fetch_similar_hybrid(
    state: &AppState,
    question_text: &str,
    limit: usize,
) -> AppResult<RagContext> {
    if let Ok(Some(scored)) = fetch_similar_by_embedding(state, question_text, limit).await {
        let examples = scored.into_iter().map(|(q, a, _)| (q, a)).collect();
        return Ok(RagContext { examples });
    }
    fetch_similar(state, question_text, limit)
}

/// Q&A çiftinin embedding'ini hesapla ve DB'ye kaydet (varsa üzerine yaz).
pub async fn index_qa_embedding(
    state: &AppState,
    question_id: i64,
    text: &str,
) -> AppResult<()> {
    let cfg = load_embedding_config(state)?;
    if !cfg.enabled {
        return Ok(());
    }
    let emb = ollama_embed(&cfg.base_url, &cfg.model, text).await?;
    if emb.is_empty() {
        return Ok(());
    }
    let bytes = embedding_to_bytes(&emb);
    let now = chrono::Utc::now().timestamp_millis();
    let conn = state.db.get()?;
    conn.execute(
        "INSERT INTO qa_embeddings (question_id, embedding, model, created_at) \
         VALUES (?1, ?2, ?3, ?4) \
         ON CONFLICT(question_id) DO UPDATE SET \
           embedding = excluded.embedding, \
           model = excluded.model, \
           created_at = excluded.created_at",
        params![question_id, bytes, cfg.model, now],
    )?;
    Ok(())
}

// Türkçe yaygın stopword'ler (RAG match'i için filtrelenir)
const STOPWORDS: &[&str] = &[
    "ve", "ile", "için", "bu", "şu", "o", "ben", "sen", "biz", "siz",
    "bir", "var", "yok", "olan", "olur", "olarak", "ama", "fakat", "ancak",
    "de", "da", "mi", "mı", "mu", "mü", "ne", "neden", "nasıl", "kim",
    "çok", "az", "daha", "en", "tüm", "her", "hiç", "bazı", "kadar",
    "merhaba", "selam", "sayın", "değerli", "müşterimiz", "iyi", "günler",
    "teşekkür", "ederim", "rica", "dileriz", "olabilir", "miyim", "musun",
];

fn sanitize_token(t: &str) -> Option<String> {
    let s: String = t
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>()
        .to_lowercase();
    if s.len() < 3 {
        return None;
    }
    if STOPWORDS.contains(&s.as_str()) {
        return None;
    }
    // FTS5 prefix arama
    Some(format!("{}*", s))
}

pub fn fetch_similar(state: &AppState, question_text: &str, limit: usize) -> AppResult<RagContext> {
    let tokens: Vec<String> = question_text
        .split_whitespace()
        .filter_map(sanitize_token)
        .take(10) // çok uzun query yapmayalım
        .collect();
    if tokens.len() < 2 {
        return Ok(RagContext { examples: vec![] });
    }
    let match_query = tokens.join(" OR ");

    let conn = state.db.get()?;
    let mut stmt = conn.prepare(
        "SELECT question_text, answer_text FROM qa_index WHERE qa_index MATCH ?1 \
         ORDER BY rank LIMIT ?2",
    )?;
    let rows = stmt.query_map(
        params![match_query, limit as i64],
        |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
    );
    let examples: Vec<(String, String)> = match rows {
        Ok(iter) => iter.flatten().collect(),
        Err(e) => {
            log::warn!("FTS5 match hatası ({}), boş context döndürüldü", e);
            vec![]
        }
    };
    Ok(RagContext { examples })
}

pub fn format_context(ctx: &RagContext) -> String {
    if ctx.examples.is_empty() {
        return String::new();
    }
    let mut buf = String::from("\n\nGEÇMİŞ BENZER SORU-CEVAP ÖRNEKLERİ:\n");
    for (i, (q, a)) in ctx.examples.iter().enumerate() {
        buf.push_str(&format!("\n[Örnek {}]\nSoru: {}\nCevap: {}\n", i + 1, q, a));
    }
    buf
}
