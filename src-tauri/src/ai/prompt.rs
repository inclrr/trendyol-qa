pub fn base_system_prompt(custom_system: Option<&str>) -> String {
    let mut buf = String::from(
        "Sen bir Trendyol satıcısının müşteri hizmetleri asistanısın. \
        Görevin müşteri sorularına Türkçe, kibar, profesyonel ve net cevaplar vermektir. \
        \n\nKURALLAR:\n\
        - Cevap 10-2000 karakter arasında olmalı, ideal 80-400 karakter\n\
        - Yasaklı kelimeler kullanma (küfür, hakaret, rakip marka adları, sağlık iddiası vs.)\n\
        - Garanti veremeyeceğin şeyler için 'genellikle', 'tipik olarak' gibi yumuşatıcı ifadeler kullan\n\
        - Müşteriye 'Merhaba' veya 'Değerli müşterimiz' gibi bir hitap ile başla\n\
        - Cevabı 'İyi günler dileriz.' veya benzeri bir kapanış ile bitir\n\
        - Linkler ekleme, telefon numarası verme\n\
        - Stok, fiyat gibi değişebilir bilgilerde 'ürünümüzün stokuna ve fiyat bilgisine sayfasından erişebilirsiniz' tarzı yönlendirme yap\n",
    );
    if let Some(custom) = custom_system {
        if !custom.trim().is_empty() {
            buf.push_str("\nSATICIYA ÖZGÜ STİL VE BAĞLAM:\n");
            buf.push_str(custom);
        }
    }
    buf
}

pub fn build_training_prompt(qa_pairs: &[(String, String)]) -> String {
    let mut buf = String::from(
        "Aşağıda bir Trendyol satıcısının geçmişte müşteri sorularına verdiği cevaplar bulunmaktadır. \
        Bu örnekleri inceleyerek satıcının ses tonunu, cevap kalıplarını, sık kullandığı ifadeleri, \
        teknik dil seviyesini, hangi konularda nasıl bilgi verdiğini öğren. \
        \n\nGÖREV: Bu satıcının yerine cevap verirken kullanılacak bir 'sistem promptu' yaz. \
        Çıktın şu maddeleri içersin:\n\
        1) Genel ses tonu (samimi/resmi, kısa/uzun, vb.)\n\
        2) Sık kullanılan açılış ve kapanış ifadeleri\n\
        3) Kargo, iade, stok, beden konularında verilen tipik cevaplar\n\
        4) Kaçınılan ifadeler ve verilen sözler\n\
        5) Markaya özgü terimler veya tabirler\n\
        \n\
        Çıktın 400-1500 karakter arası TÜRKÇE bir paragraf olsun, başlık veya numara KULLANMA, \
        akıcı bir talimat gibi yaz. Çıktının başına ya da sonuna 'işte özet' gibi ifade ekleme; \
        doğrudan kullanılabilir prompt metnini ver.\n\n\
        GEÇMİŞ CEVAP ÖRNEKLERİ:\n",
    );
    // Prompt token bütçesi: Gemini Pro 32k context. Ortalama Q+A = ~400-600 char.
    // 200 pair × 500 char ≈ 100k char ≈ 25k token. Output için 4k bırakırsak güvenli.
    let limit = qa_pairs.len().min(200);
    for (i, (q, a)) in qa_pairs.iter().take(limit).enumerate() {
        buf.push_str(&format!("\n[{}] SORU: {}\n    CEVAP: {}\n", i + 1, q, a));
    }
    buf
}

/// Eğitim için seçilecek pair sayısını döndürür (toplam pair sayısına göre).
pub fn training_pair_limit(total: usize) -> usize {
    total.min(200)
}

pub fn build_answer_prompt(
    question: &str,
    product_name: Option<&str>,
    customer_history: &[(String, String)],
    rag_context: &str,
) -> String {
    let mut buf = String::new();
    if let Some(p) = product_name {
        buf.push_str(&format!("ÜRÜN: {}\n\n", p));
    }
    if !customer_history.is_empty() {
        buf.push_str("BU MÜŞTERİ İLE ÖNCEKİ YAZIŞMALAR:\n");
        for (q, a) in customer_history {
            buf.push_str(&format!("- Soru: {}\n  Cevap: {}\n", q, a));
        }
        buf.push('\n');
    }
    if !rag_context.is_empty() {
        buf.push_str(rag_context);
        buf.push('\n');
    }
    buf.push_str("YENİ MÜŞTERİ SORUSU:\n");
    buf.push_str(question);
    buf.push_str("\n\nBu soruya kurallarımıza ve önceki örneklere uygun şekilde Türkçe cevap ver. ");
    buf.push_str("Sadece müşteriye gidecek cevap metnini ver, başka açıklama veya başlık ekleme.");
    buf
}
