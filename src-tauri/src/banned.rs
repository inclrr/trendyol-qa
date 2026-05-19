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

/// Verilen metinde yasaklı kelime arar. Bulduğu ilk kelimeyi döndürür.
pub fn find_banned_word(text: &str) -> Option<String> {
    let normalized = text.to_lowercase();
    // Türkçe karakter normalizasyonu
    let normalized = normalized
        .replace('ı', "i")
        .replace('İ', "i")
        .replace('ö', "o")
        .replace('ü', "u")
        .replace('ş', "s")
        .replace('ç', "c")
        .replace('ğ', "g");

    for &word in BANNED_WORDS {
        let key = word
            .to_lowercase()
            .replace('ı', "i")
            .replace('İ', "i")
            .replace('ö', "o")
            .replace('ü', "u")
            .replace('ş', "s")
            .replace('ç', "c")
            .replace('ğ', "g");
        if normalized.contains(&key) {
            return Some(word.to_string());
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
}
