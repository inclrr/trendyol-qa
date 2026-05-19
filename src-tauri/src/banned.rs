/// Heuristik Türkçe yasaklı/uygunsuz kelime listesi.
/// Trendyol'un kendi yasaklı kelime listesinin bir alt kümesi + tipik küfür ve hakaret.
/// Yanlış pozitif olabilir — frontend "Yine de gönder" override sunar.
const BANNED_WORDS: &[&str] = &[
    // Küfür / hakaret (yaygın)
    "amk", "aq", "amq", "siktir", "orospu", "piç", "puşt", "ibne",
    "göt", "yarrak", "yarak", "amcık", "salak", "aptal", "gerizekalı",
    "şerefsiz", "namussuz", "pezevenk", "kahpe", "haysiyetsiz",
    // Sağlık iddiaları (Trendyol yasak)
    "tedavi eder", "iyileştirir", "hastalığı geçirir", "kanseri",
    "şifa", "ilaç gibi",
    // İletişim bilgisi paylaşımı (yasak)
    "whatsapp", "telegram", "instagram", "facebook",
    "telefon numaramız", "telefon numaram",
    // Rakip platformlar (genelde yasak)
    "hepsiburada", "n11", "amazon", "gittigidiyor", "çiçeksepeti",
    "shopier", "ePttAVM",
];

fn normalize(s: &str) -> String {
    s.to_lowercase()
        .replace('ı', "i")
        .replace('İ', "i")
        .replace('ö', "o")
        .replace('ü', "u")
        .replace('ş', "s")
        .replace('ç', "c")
        .replace('ğ', "g")
}

/// Verilen metinde yasaklı kelime arar. Word boundary kontrolü yapar:
/// - Tek kelimelik banned ifadeler için tam kelime eşleşmesi (substring değil)
/// - Çok kelimelik ifadeler için sözcük dizisi araması (case-insensitive normalize)
pub fn find_banned_word(text: &str) -> Option<String> {
    let normalized = normalize(text);

    for &word in BANNED_WORDS {
        let key = normalize(word);
        if key.contains(' ') {
            // Çok kelimelik ifade — substring eşleşmesi kabul (örn. "tedavi eder")
            if normalized.contains(&key) {
                return Some(word.to_string());
            }
        } else {
            // Tek kelime — boundary kontrolü (önceki/sonraki karakter alfanümerik olmamalı)
            let bytes = normalized.as_bytes();
            let key_bytes = key.as_bytes();
            let key_len = key_bytes.len();
            if key_len == 0 || bytes.len() < key_len {
                continue;
            }
            let mut i = 0usize;
            while i + key_len <= bytes.len() {
                if &bytes[i..i + key_len] == key_bytes {
                    let before_ok = i == 0
                        || !(bytes[i - 1] as char).is_alphanumeric();
                    let after_idx = i + key_len;
                    let after_ok = after_idx >= bytes.len()
                        || !(bytes[after_idx] as char).is_alphanumeric();
                    if before_ok && after_ok {
                        return Some(word.to_string());
                    }
                }
                i += 1;
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_curse_word() {
        assert!(find_banned_word("siktir git").is_some());
        assert!(find_banned_word("Aptal müşteri").is_some());
    }

    #[test]
    fn detects_competitor_brand() {
        assert!(find_banned_word("Hepsiburada'da daha ucuz").is_some());
    }

    #[test]
    fn ignores_clean_text() {
        assert!(find_banned_word("Merhaba değerli müşterimiz, iyi günler dileriz.").is_none());
    }

    #[test]
    fn handles_unicode_normalization() {
        assert!(find_banned_word("ŞEREFSİZ").is_some());
    }

    #[test]
    fn no_false_positive_substring() {
        // "salak" listede ama ürün adında geçen "Salakım" gibi bir kelime engellenmez
        assert!(find_banned_word("Salakım marka tişört").is_none());
    }

    #[test]
    fn matches_isolated_word() {
        assert!(find_banned_word("Bu salak bir cevap.").is_some());
    }

    #[test]
    fn matches_multiword_phrase() {
        assert!(find_banned_word("Ürünümüz kanseri tedavi eder.").is_some());
    }
}
