# Changelog

Tüm önemli değişiklikler burada listelenir. Versiyon formatı [SemVer](https://semver.org/lang/tr/)'a uyar.

## [Unreleased]

## [0.6.0] - 2026-05-20

### Eklendi
- **Gelişmiş AI Ayar Paneli**: Her sağlayıcının altında "⚙️ Gelişmiş Ayarlar" — temperature, top_p, top_k, repeat_penalty slider'ları; Ollama için ek olarak num_ctx ve keep_alive seçimi. "Tutarlı (önerilen)" ve "Yaratıcı" preset'leriyle tek tıkla profil. Değişiklikler otomatik kaydedilir.
- **2 Saatlik Cevap Deadline Sayacı**: Her bekleyen soru kartında ve modallarda kalan süre rozeti: 🟢 1 sa 30 dk kaldı → 🟡 45 dk → 🔴 20 dk! (pulse) → ⚫ Süre doldu. Inbox'ta 30 dakika kala kritik bant uyarısı. Süre Ayarlar'dan değiştirilebilir (1-24 saat).
- **Embedding-Based RAG (Ollama)**: Soruları semantik olarak embed eder, geçmiş Q&A kayıtlarıyla cosine benzerlik yapar. Kelime tabanlı FTS5'in bulamadığı eş anlamlı/farklı ifadeli sorularda doğru bağlamı yakalar. Ayarlar > "AI Eğitim Verisi" altında etkinleştirilir; `nomic-embed-text` modeli önerilir. "Yeniden İndeksle" butonu mevcut Q&A'leri toplu embedler. Embedding kapalıyken veya başarısızsa otomatik FTS5'e düşer.
- **Modelfile Generator (Özel Ollama Model)**: Aktif eğitimden tek tıkla özel Ollama modeli oluştur. System prompt modelin kendisine gömülür — her cevapta tekrar gönderilmez, %30-50 hız kazancı + token tasarrufu.
- **Model Önerisi Sihirbazı (2026 Güncel)**: 3 adımlı wizard (donanım → öncelik → sonuç) sistemine RAM, GPU, VRAM ve önceliğe göre 2026 Mayıs itibarıyla en güncel Ollama modellerini önerir (Qwen2.5:7b, Llama3.2:3b, Phi-3 Mini, Mistral 7B, Gemma3:12b). "Panoya Kopyala" + doğrudan seç.
- **AI Stilini Test Et**: Eğitim sonrası 3 örnek soruda (kargo/iade/beden) modelin nasıl cevap verdiğini paralel olarak gösteren modal.
- **Linux Desteği**: AppImage + .deb bundle'ları, GitHub Actions matrix'inde Ubuntu 22.04 job, sistem bağımlılıkları otomatik kurulur, latest.json manifest'inde `linux-x86_64` platformu.
- **Cloud/Yerel Model Algılama**: Ollama'da `gemini-`, `claude-`, `gpt-` veya `*-cloud` adlı modeller "☁️ Cloud (signin gerek)" rozetiyle, yereller "💻 Yerel" olarak işaretlenir.
- **AI Otomatik Cevap Hata Event'i**: Arka planda taslak üretimi başarısız olursa `ai-draft:error` event'i emit edilir; frontend sessiz log'lar (kullanıcıya popup gösterilmez).
- **RAG Yönetim UI**: Settings > "AI Eğitim Verisi" — embedding etkinleştir/devre dışı bırak, model + base URL ayarla, "Yeniden İndeksle" toplu işlem, ilerleme barı.

### Geliştirildi
- **Daha Tutarlı ve Hızlı AI**: Varsayılan sampling temperature 0.4 → 0.3, top_p 0.7, top_k 20, repeat_penalty 1.15. Aynı soruya farklı zamanlarda daha tutarlı cevap.
- **Modele Göre Dinamik max_tokens**: 3B/mini modellerde 800, 7B-13B'de 1024, 70B+'da 2048. Gereksiz token israfı yok.
- **Ollama `keep_alive` Optimizasyonu**: Model varsayılan 10 dakika RAM'de tutulur — peş peşe cevap üretimi 5-10x hızlanır (ilk yükleme süresi sadece bir kez ödenir).
- **OpenRouter Genişletmesi**: `frequency_penalty` (repeat_penalty'den map'lenir), `top_p`, `top_k` opsiyonel parametreler.
- **Gemini Genişletmesi**: `temperature`, `topP`, `topK` opsiyonel parametreler `generationConfig` altında.

### Veritabanı Şeması
- **v4**: `ai_providers` tablosuna `options_json TEXT` (sağlayıcı başına gelişmiş ayarlar JSON).
- **v5**: Yeni `qa_embeddings (question_id, embedding BLOB, model, created_at)` tablosu + `idx_qa_embeddings_model` index.

### Yeni Ayarlar (otomatik default'lanır)
- `answer_deadline_hours = 2` — cevap süresi (1-24 saat arası ayarlanabilir)
- `embedding_enabled = false` — embedding RAG açık/kapalı
- `embedding_model = nomic-embed-text` — kullanılacak embedding modeli
- `embedding_base_url = http://127.0.0.1:11434` — Ollama base URL

## [0.5.5] - 2026-05-20

### Düzeltildi
- **AI model "kayıp" gibi görünme**: Aslında model DB'de doğru kayıtlıydı; ancak sayfa açıldığında modeller listesi sıfırdan yüklenmediği için dropdown boş görünüyordu. Şimdi sayfa açılışında `selectedModel`'i olan tüm sağlayıcıların modelleri arka planda otomatik yüklenir. Ek olarak henüz yüklenmemiş bir model dropdown'da "(kayıtlı)" rozetiyle görünür — kullanıcı kaybolmadığını anında görür.

## [0.5.4] - 2026-05-20

### Eklendi
- **AI Ayarları'na Tanılama paneli**: DB'deki provider satırları + UI form state + yüklenen modeller JSON olarak görüntülenir. Sorun bildirimi için "Tümünü Panoya Kopyala" butonu. Model kaybolma / model görünmeme bug'larını teşhis etmek için.

## [0.5.3] - 2026-05-20

### Düzeltildi
- **AI model seçimi sekme değişince sıfırlanma (kalıcı çözüm)**: Backend SQL'de `COALESCE` mantığı bazı durumlarda eski değeri tutuyordu; uygulama tarafında karar verip backend'e net değer gönderiliyor artık. Frontend tarafında `saveProvider` `refresh()` yerine doğrudan backend'in döndürdüğü değeri state'e yazıyor (race koşulu önlendi). Hatalar artık `alert` ile gösterilir.



### Düzeltildi
- **AI sağlayıcı model seçimi kaybolma**: Dropdown'dan model seçince state güncellenir ama "Kaydet" basılmazsa DB'ye yazılmıyordu. Artık seçim anında otomatik kaydedilir; sekme değişip dönünce seçim korunur. Tüm sağlayıcılar (Gemini, OpenRouter, Ollama) için geçerli.
- **"Aktif Yap" sessiz fail**: Provider DB'de yoksa (özellikle Ollama'da yeni keysiz akış) UPDATE WHERE eşleşmiyor, kullanıcı aktif olduğunu sanıyordu. Artık önce satır oluşturulur.

## [0.5.1] - 2026-05-20

### Düzeltildi
- **Ollama "sağlayıcısı yapılandırılmamış" hatası**: API key gerektirmediği için provider DB satırı oluşturulmuyordu. "Modelleri Yükle" artık Ollama için provider'ı otomatik kaydeder.
- **Settings'te kalıcı Sürüm Geçmişi**: 📜 butonu ile tüm CHANGELOG uygulama içinde okunabilir (offline). Güncelleme bağımlılığı yok.

## [0.5.0] - 2026-05-19

### Önemli Değişiklikler
- **🔐 Cross-platform şifreli secret store**: macOS Keychain prompt sorunu çözüldü. Artık tüm platformlarda ChaCha20-Poly1305 + Argon2id ile şifrelenmiş dosya kullanılıyor. v0.4.x'teki keyring kayıtları ilk açılışta otomatik taşınır.
- **🤖 Ollama yerel AI desteği**: API key gerekmez, localhost:11434 üzerinden çalışır. Eğitim ve cevap üretimi aynı şekilde çalışır.
- **✨ Otomatik AI cevap önerisi**: Yeni soru geldiğinde arka planda AI cevap üretilir; bildirim üzerinden uygulamayı açınca AIApprovalModal ile onaylanır/düzenlenir/manuel yazılır.
- **📋 Şablon sol yan panel**: AnswerComposer iki sütunlu; sol tarafta arama + şablon kartları (kayar liste), sağ tarafta cevap yazma.
- **⌨️ Sorular arası navigation**: Modal'da `↑↓/j/k` ile önceki/sonraki soru; cevap gönderdikten sonra otomatik sıradakine geçiş (Ayarlar'da kapatılabilir).
- **🔔 Bildirim sesi**: Yeni soru geldiğinde sistem bildirim sesi çalar (Ayarlar'dan kapatılabilir).
- **🛡️ CSP politikası geri eklendi**: Trendyol CDN'leri, AI provider'lar ve Ollama localhost dahil whitelist ile sertleştirilmiş.
- **📦 Vite 7.x**: npm audit 0 vulnerability.

### Düzeltildi
- Cevaplanan sorular artık "Bekleyen" filtresinden anında kaybolur — `sync_question` komutu eklendi, status filtresi kesin uygulanır.
- Güncelleme notları artık başlıklı/listeli + scrollable görünür + CHANGELOG linki.
- AI cevap üretme hızı: max_tokens 2048 → 1024 (Türkçe ortalama cevap için yeterli).

### Eklendi
- Ayarlar → "Cevap Davranışı": `auto_advance_after_answer`, `auto_ai_reply`, `notification_sound_enabled` toggle'ları.
- Schema migration v3: `draft_ai_answer` + `draft_ai_generated_at` sütunları.

### Breaking
- API key'ler artık keyring'de değil, app data dizinindeki şifreli `secrets.bin` dosyasında. Migration otomatik; ama yedek alındıysa farklı makinede açılmaz (machine-derived key).


## [0.4.1] - 2026-05-19

### Düzeltildi
- **Banned word**: substring match yerine kelime sınırlı (word boundary) eşleşme — "Salakım" gibi ürün adları artık yanlış engellenmiyor
- **Notification queue**: 10'dan 100 kapasiteye çıkarıldı + duplicate koruma
- **AnswerComposer**: AI cevap üretilirken textarea kullanıcının yazısının üzerine yazmasın diye disabled
- **QuestionModal**: ESC tuşu ile kapanır
- **Inbox**: Cevap gönderilen soru, seçili setten otomatik çıkar
- **Settings**: Backup restore sonrası 5 sn geri sayım gösterip yeniden başlatır (kullanıcı mesajı görebilir)
- **AI Training**: Aktif training silinince en yeni kalan otomatik aktif olur
- **GitHub Actions**: `fail-fast: true` — bir platform fail olursa release yarım yayınlanmaz
- **Cargo.lock**: artık commit ediliyor (reproducible builds)

### İyileştirildi
- **AI training pair limit**: 80 → 200 (Gemini Pro 32k context'e uygun) + kullanıcıya "X cevap bulundu, en yeni Y tanesi AI'ya gönderildi" bilgisi
- Kalan hardcoded Türkçe metinler tr.json'a taşındı
- Inbox: tarih aralığı geçersizse (from > to) uyarı gösterilir
- Templates: category boş bırakıldığında null kaydedilir (string `""` yerine)

## [0.4.0] - 2026-05-19

### Eklendi
- **macOS Apple Silicon desteği**: keyring `apple-native` feature, DMG bundle, GitHub Actions matrix build
- **CHANGELOG.md**, **SECURITY.md**, **GitHub issue template**

## [0.3.2] - 2026-05-19

### Kritik Düzeltme
- Schema migration: `schema_version` tablosu eski tek-sütun yapısından yeni `applied_at` sütunlu yapıya güvenli ALTER ile geçiş. v0.3.0 ve v0.3.1'in açılmama sorununun gerçek sebebi.

## [0.3.1] - 2026-05-19

### Düzeltildi
- CSP politikası geri alındı (v0.3.0'da beyaz ekran sorununa sebep olan)

## [0.3.0] - 2026-05-19

### Eklendi
- Otomatik güncelleme sistemi (Tauri updater plugin)
- Yapay zeka eğitim canlı ilerleme göstergesi
- AI sistem promptu manuel düzenleme + training geçmişi listesi
- Şablon değişkenleri: `{{musteri}}`, `{{urun}}`, `{{magaza}}`, `{{tarih}}`
- SQLite Backup / Restore
- AnswerComposer: Draft autosave + Ctrl+Enter ile gönder
- Bildirim üzerinden soruya hızlı erişim (window focus event)
- Trendyol API retry + exponential backoff
- Banned word uyarısı + "Yine de gönder" override
- Window focus'ta sessiz update kontrolü
- GitHub Actions CI + Release workflow

### Güvenlik
- Gemini API key URL'den header'a taşındı (log sızıntısı engellendi)
- LICENSE (MIT) eklendi
- `.gitignore` `release/` klasörü
- Capabilities: `process:allow-exit` kaldırıldı

### Düzeltildi
- DB schema migration sistemi (version-bazlı)
- Sync ve training fetch transaction içine alındı
- Inbox race condition (generation counter)
- AI quota/auth hata mesajları Türkçe ve net
- FTS5 RAG sanitization
- Bulk progress sayımı (failed + success = done)

## [0.2.0] - 2026-05-19

### Eklendi
- Otomatik güncelleme altyapısı (signing keypair, manifest)
- Ürün görseli lightbox
- "Trendyol'da Aç" linki sistem tarayıcısında açar
- AI key maskeli görünüm

## [0.1.0] - 2026-05-18

### İlk Sürüm
- Çoklu Trendyol mağaza yönetimi
- Trendyol Soru-Cevap API entegrasyonu
- Manuel / şablon / AI ile cevaplama (Gemini + OpenRouter)
- Müşteri sohbet görünümü
- Sistem tepsisi + bildirimler + autostart
- Açık/koyu/sistem teması
- Türkçe arayüz
