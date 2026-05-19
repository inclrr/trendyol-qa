# Trendyol Soru-Cevap Yönetimi

Trendyol Marketplace satıcıları için müşteri soru-cevap yönetim masaüstü uygulaması. Birden fazla mağazayı tek arayüzden yönetin, manuel/şablon/AI ile cevaplayın, arka planda yeni soruları takip edin.

## Özellikler

- **Çoklu mağaza desteği**: İstediğiniz kadar Trendyol mağazasını ekleyip yönetebilirsiniz; aynı anda hepsini veya seçtiklerinizi filtreleyebilirsiniz.
- **Tekli ve toplu cevaplama**: Tekli cevaplarda manuel / hazır cevap / AI sekmeleri; toplu cevapta "AI ile her soruya özel" veya "Tek şablonu hepsine" modları.
- **Yapay zeka entegrasyonu**: Google Gemini ve OpenRouter destekli. Modeller dinamik olarak sağlayıcıdan çekilir.
- **AI eğitimi**: Geçmiş cevaplarınızla AI'ya ses tonunuzu öğretir (sistem promptu sentezleme + RAG geçmişten benzer örnek çekme).
- **Müşteri sohbet görünümü**: Aynı müşteriden gelen önceki sorular bir sohbet ekranında listelenir.
- **Arka planda çalışma**: Sistem tepsisinde durur, ayarlanabilir aralıklarla yeni soruları çeker.
- **Windows bildirimleri**: Yeni soru geldiğinde toast bildirim ile haberdar olursunuz.
- **Başlangıçta otomatik başlatma**: İsteğe bağlı olarak bilgisayar açılışında arka planda çalışır.
- **Tema desteği**: Açık / koyu / sistem temaları.
- **Türkçe arayüz**.
- **Güvenlik**: API kimlik bilgileri Windows Credential Manager'da şifreli olarak saklanır.

## Sistem Gereksinimleri

- Windows 10 / 11
- Node.js 18+ (geliştirme için)
- Rust 1.80+ (geliştirme için)
- Microsoft Edge WebView2 (Windows 11'de varsayılan, eski Windows'larda Tauri yükleyicisi otomatik kurar)

## Geliştirme Modunda Çalıştırma

```powershell
# Bağımlılıkları kur
npm install

# Geliştirme modunda başlat (sıcak yenileme)
npm run tauri dev
```

## Üretim Build (MSI Installer)

```powershell
npm run tauri build
```

Çıktı: `src-tauri/target/release/bundle/msi/` altında `.msi` yükleyicisi.

## İlk Kurulum Sonrası

1. **Mağaza ekleyin**: Sol menüden "Mağazalar" → "Yeni Mağaza".
   - sellerId, API Key, API Secret bilgilerinizi Trendyol Satıcı Paneli → "Hesap Bilgilerim" → "Entegrasyon Bilgileri" sayfasından alın.
   - "Bağlantıyı Test Et" ile kontrol edin.
2. **AI sağlayıcı tanımlayın** (opsiyonel): Sol menüden "Yapay Zeka".
   - Gemini için: https://aistudio.google.com/app/apikey
   - OpenRouter için: https://openrouter.ai/keys
   - "Modelleri Yükle" → bir model seçin → "Aktif Yap".
3. **AI'yı eğitin** (önerilir): Tarih aralığı ve mağazaları seçip "Eğit" tuşuna basın. Geçmiş cevaplarınız analiz edilip stilinize uygun sistem promptu üretilir.
4. **Otomatik başlatmayı açın**: Ayarlar → "Bilgisayar açılışında uygulamayı başlat".

## Trendyol API Uyumluluğu

`docs.md` dosyasındaki tüm Trendyol Marketplace Soru-Cevap kurallarına uyulur:

| Kural | Uygulamada |
|---|---|
| Basic Auth (apiKey:apiSecret) | Otomatik header |
| User-Agent `{sellerId} - SelfIntegration` | Her istekte zorunlu |
| Endpoint 10sn / 50 istek limiti | `governor` token bucket |
| Soru çekme 1000 req/min, cevap 500 req/min | Sağlayıcı bazlı rate limiter |
| Tarih: timestamp(ms), max 2 hafta aralık | Eğitimde otomatik 2 haftalık pencereler |
| Cevap 10-2000 karakter | Form validation + Rust tarafında çift kontrol |
| Sadece WAITING_FOR_ANSWER cevaplanabilir | UI'da diğer statülerde gizli |
| 401/403/429 hata mesajları | Türkçe açıklamalara çevrilir |
| PROD/STAGE ortamları | Mağaza başına seçilebilir |

## Mimari

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + i18next + Zustand
- **Backend**: Rust 1.80 + Tauri 2 + Tokio + reqwest + rusqlite (bundled) + r2d2 + keyring + governor
- **Veritabanı**: SQLite (FTS5 ile RAG indeksi dahil)
- **Sırlar**: Windows Credential Manager (keyring-rs)

Detaylı dosya yapısı için `plans/` dizinindeki orijinal plana bakın.

## Bilinen Notlar

- AI fine-tuning Gemini/OpenRouter'da klasik anlamda mümkün değildir; bu uygulamadaki "eğitim" tuşu RAG + sistem promptu sentezini birlikte yapar — pratikte aynı etkiyi sağlar.
- `docs.md` Trendyol soru cevabı için tam JSON şemasını vermiyor; alan adları (`showUserName`, `productWebUrl` vs.) standart Trendyol API'sine göre eklenmiştir. Gerçek API çağrısında alan isimleri farklıysa `raw_json` üzerinden hızlıca güncellenebilir.
- Stage ortamında 503 alırsanız Trendyol tarafında IP yetkilendirmesi gerekiyor demektir.
