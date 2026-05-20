# Changelog

Tüm önemli değişiklikler burada listelenir. Versiyon formatı [SemVer](https://semver.org/lang/tr/)'a uyar.

## [Unreleased]

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
