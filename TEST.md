# Manuel Test Kontrol Listesi

Aşağıdaki adımları sırayla uygulayarak uygulamanın tüm özelliklerini doğrulayabilirsin. **Geliştirme modu** (`npm run tauri dev`) veya **kurulu sürüm** üzerinde çalışır.

## 0. Hazırlık

- [ ] En az 2 Trendyol mağazasının API Key + Secret bilgisi
- [ ] Test için bir Gemini API key: https://aistudio.google.com/app/apikey
- [ ] (Opsiyonel) OpenRouter API key: https://openrouter.ai/keys
- [ ] Trendyol satıcı panelinden test için 1-2 cevaplanabilir bekleyen soru olduğundan emin ol

---

## 1. Mağaza Yönetimi (Stores)

- [ ] **Mağaza ekle** — sol menü → Mağazalar → "Yeni Mağaza"
  - [ ] Tüm zorunlu alanları (Ad, sellerId, env, API Key, API Secret) gir
  - [ ] "Bağlantıyı Test Et" → yeşil "Bağlantı başarılı" görmeli
  - [ ] Yanlış key ile test et → "Yetkisiz: API bilgilerinizi kontrol edin" mesajı
  - [ ] "Kaydet" → mağaza listede görünür
- [ ] **İkinci mağaza ekle** (aynı süreç)
- [ ] **Mağaza düzenle** — kalem ikonu
  - [ ] sellerId düzenlenemez olduğunu doğrula
  - [ ] API Key/Secret alanları boş → key değişmez
  - [ ] Yeni key/secret yazıp kaydet → keyring güncellenir
- [ ] **Mağaza sil** — çöp ikonu → onay → SQLite + keyring temizlenir

## 2. Inbox & Senkronizasyon

- [ ] **Mağaza filtresi** — üstte mağaza chip'leri ile çoklu/tümü seçim
- [ ] **Tarih aralığı**
  - [ ] "Son 7 gün" / "Son 14 gün" / "Son 30 gün" preset'leri
  - [ ] Özel tarih (manuel iki tarih girme)
  - [ ] Tarih değişince otomatik senkron ve liste güncellenmesi
- [ ] **Statü filtresi**
  - [ ] Bekleyen / Cevaplanan / Raporlanan / Reddedilen / Süresi Doldu / Tümü
  - [ ] Her filtreye tıklayınca arka planda sessiz senkron
- [ ] **Arama** — soru/ürün/müşteri içeriğinde geçen kelime ile filtre
- [ ] **Yenile** — manuel senkron + sonuç mesajı (kaç yeni, kaç güncellendi)
- [ ] **Görsel**: ürün resmi görünür, tıklayınca büyütme (lightbox) açılır
- [ ] **Bildirim çanı** (sağ üst) → Bekleyen sorulara götürür

## 3. Tek Soru Cevaplama

- [ ] Soruya tıkla → **modal** açılır (yeni sayfa değil)
- [ ] Görseli, ürün adı, müşteri adı, mağaza, tarih görünür
- [ ] "Trendyol'da Aç" → sistem tarayıcısında ürün sayfası açılır
- [ ] **Manuel cevap**
  - [ ] 10 karakter altı → "Cevap çok kısa" hatası
  - [ ] 2000 üstü → "Cevap çok uzun" hatası
  - [ ] Geçerli → "Cevap başarıyla gönderildi"
  - [ ] Trendyol satıcı panelinde cevap görünür mü kontrol et
- [ ] **Hazır cevap**
  - [ ] Şablon seç → metin dolar
  - [ ] Düzenleyip gönder
- [ ] **Yapay zeka cevap** — AI sağlayıcı yapılandırılmış olmalı
  - [ ] "Üret" → birkaç saniye → cevap belirir
  - [ ] Düzenleyip gönder

## 4. Müşteri Sohbet Geçmişi

- [ ] Daha önce sorduğu müşterinin yeni sorusunu aç
- [ ] Modal'da "Bu müşterinin N önceki soru-cevabı var" butonu çıkmalı
- [ ] Tıklayınca detay sayfasında WhatsApp benzeri sohbet görünür
- [ ] **Farklı mağazada aynı customerId** → sohbet karışmamalı (mağaza bazlı)

## 5. Toplu Cevaplama

- [ ] Inbox'tan birkaç soru seç → "Toplu Cevapla (N)"
- [ ] **Mod: AI tek tek**
  - [ ] "Tümü için AI cevap üret" → her soru için ayrı cevap belirir
  - [ ] Her birini düzenleyebilirsin
  - [ ] "Hepsini Gönder" → ilerleme + sonuç durumu
- [ ] **Mod: Şablon hepsine**
  - [ ] Şablon seç → "Tümüne Uygula" → her birinde aynı metin
  - [ ] Düzenle, gönder
- [ ] Cevaplanamaz statüde olanlar otomatik "Atlandı" olarak işaretlenir

## 6. Hazır Cevap Şablonları

- [ ] Sol menü → Hazır Cevaplar → "Yeni Şablon"
- [ ] Başlık + Kategori + Cevap metni gir → Kaydet
- [ ] Düzenle, sil testleri

## 7. Yapay Zeka

- [ ] **Sağlayıcı yapılandırma** — Gemini ve/veya OpenRouter
  - [ ] API Key gir → Kaydet
  - [ ] "Kayıtlı: AIza…xyz9 (39 karakter)" maskeli görünüm
  - [ ] "Modelleri Yükle" → dropdown dolar (Gemini için ~10, OpenRouter için 200+)
  - [ ] Bir model seç → Kaydet → "Aktif Yap"
- [ ] **AI Eğit**
  - [ ] Tarih aralığı seç (önerilen: son 60-90 gün, geniş veri için)
  - [ ] Mağaza filtresi (opsiyonel — boş bırakırsan hepsi)
  - [ ] "Eğit" → 1-5 dakika (mağaza ve veri yoğunluğuna göre)
  - [ ] "Aktif Eğitim" altında: tarih, QA sayısı, ÜRETİLEN SİSTEM PROMPTU
  - [ ] Uygulamayı kapat-aç → AISettings → eğitim hâlâ orada mı?
- [ ] **AI'nın eğitilmiş stilde cevap üretmesi**
  - [ ] Bir bekleyen soru aç → AI sekmesi → Üret → senin stilinde olmalı

## 8. Arka Plan & Bildirim

- [ ] **Ayarlar** → "Otomatik yenileme aralığı" → 30 saniye yap
- [ ] Trendyol panelinden manuel yeni bir soru oluştur (test mağaza üzerinde)
- [ ] **30 saniye içinde:**
  - [ ] Windows toast bildirimi çıkar
  - [ ] Sol menüde "Gelen Sorular" yanındaki sayı artar
  - [ ] Sağ üstteki bildirim çanı badge'i artar
  - [ ] Sistem tepsisi tooltip'i de güncellenir

## 9. Sistem Tepsisi & Pencere

- [ ] Pencereyi **X** ile kapat → tepsiye iner, app çalışmaya devam eder
- [ ] **Tepsi ikonuna sol tık** → pencere açılır
- [ ] **Tepsi ikonuna sağ tık** → menü: Bekleyen sayısı / Pencereyi Aç / Şimdi Senkronize Et / Çıkış
- [ ] "Çıkış" → app tamamen kapanır
- [ ] Tek bir tray ikonu (mükerrer ikon olmamalı)

## 10. Başlangıçta Çalışma

- [ ] Ayarlar → "Bilgisayar açılışında uygulamayı başlat" → açık → Kaydet
- [ ] Bilgisayarı yeniden başlat
- [ ] App tepside arka planda otomatik çalışır
- [ ] Pencere açılmadan polling yapar (yeni soru → bildirim)

## 11. Tema

- [ ] Sağ üstte güneş/ay/monitör butonları
- [ ] Açık → Koyu → Sistem geçişleri sorunsuz
- [ ] Sistem teması Windows'un dark mode durumunu takip etmeli
- [ ] Yeniden başlatınca tema seçimi korunur

## 12. Hata Senaryoları

- [ ] **Yanlış API key ile mağaza ekle** → "Yetkisiz (401)"
- [ ] **Geçersiz sellerId** → 403 mesajı
- [ ] **AI sağlayıcı seçili değilken** AI cevap üretmeye çalış → "Aktif bir AI sağlayıcı yok"
- [ ] **Boş tarih aralığında AI eğit** → "Seçilen aralıkta cevaplanmış soru bulunamadı"
- [ ] **İnternet bağlantısı kapat** → senkron deneme → "HTTP hatası" görünür

## 13. Veri Kalıcılığı

- [ ] Mağaza ekle, soruları çek, şablon yaz, AI eğit
- [ ] Uygulamayı kapat-aç → her şey orada mı?
- [ ] Veritabanı yolu: `%AppData%\com.trendyolqa.app\trendyol_qa.sqlite`
- [ ] API key'ler: Windows Credential Manager → "Web Credentials" / "Generic Credentials" altında `TrendyolQA*` arar

---

## Otomatik Test Eklemek İstersen

Şimdilik manuel test yeterli. Eğer otomatik test eklemek istersen:

- **Rust unit testler**: `cargo test` ile
  - `validate_answer_text` — karakter sınırı kontrolü
  - `build_user_agent` — 30 karakter sınırı kontrolü
  - `presetRange` mantığı (frontend)
- **Tauri E2E**: `tauri-driver` + WebDriver ile (kurulumu karmaşık, küçük araç için aşırı)
- **API mock testleri**: `wiremock` crate ile Trendyol API'yi mock'layıp client davranışını test
