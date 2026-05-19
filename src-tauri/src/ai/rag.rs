use crate::errors::AppResult;
use crate::state::AppState;
use rusqlite::params;

pub struct RagContext {
    pub examples: Vec<(String, String)>,
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
