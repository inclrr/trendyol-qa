use crate::errors::AppResult;
use crate::state::AppState;
use rusqlite::params;

pub struct RagContext {
    pub examples: Vec<(String, String)>,
}

pub fn fetch_similar(state: &AppState, question_text: &str, limit: usize) -> AppResult<RagContext> {
    let conn = state.db.get()?;
    // FTS5 sözcükleri tehlikeli olabilir; basit temizle
    let mut needle: String = question_text
        .chars()
        .map(|c| if c.is_alphanumeric() || c.is_whitespace() { c } else { ' ' })
        .collect();
    needle = needle.split_whitespace().collect::<Vec<_>>().join(" OR ");
    if needle.trim().is_empty() {
        return Ok(RagContext { examples: vec![] });
    }
    let mut stmt = conn.prepare(
        "SELECT question_text, answer_text FROM qa_index WHERE qa_index MATCH ?1 \
         ORDER BY rank LIMIT ?2",
    )?;
    let rows = stmt.query_map(
        params![needle, limit as i64],
        |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
    )?;
    let examples: Vec<(String, String)> = rows.flatten().collect();
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
