# Setup / Dağıtım Rehberi

## Hızlı Yol: Tek Komut

```powershell
$env:Path += ";$env:USERPROFILE\.cargo\bin"
npm run tauri build
```

Build tamamlanınca aşağıdaki konumlarda kurulum dosyaları oluşur:

| Tür | Konum | Kullanım |
|---|---|---|
| **NSIS exe** | `src-tauri\target\release\bundle\nsis\Trendyol Soru-Cevap_0.1.0_x64-setup.exe` | Önerilen — tek tıkla kurulum, WebView2 dahil |
| **MSI** | `src-tauri\target\release\bundle\msi\Trendyol Soru-Cevap_0.1.0_x64_en-US.msi` | Kurumsal dağıtım (GPO vs.) |
| **Portable exe** | `src-tauri\target\release\trendyol-qa.exe` | Kurulum yapmadan çalıştırılabilir tek dosya |

Bunlardan **birini** (önerilen NSIS) başka bir bilgisayara kopyalayıp çalıştırmak yeterli.

## Kurulum İşlemi

Kullanıcı kurulum dosyasına çift tıklayınca:

1. **WebView2 kontrolü** — eğer kurulu değilse otomatik indirilip kurulur (Windows 11'de zaten var)
2. **Program Files'a kurulum** — `C:\Program Files\Trendyol Soru-Cevap\`
3. **Başlat menüsü kısayolu** + **Masaüstü kısayolu** (NSIS bunları otomatik ekler)
4. **Kaldırma desteği** — Windows Ayarlar → Uygulamalar listesinde görünür

## Windows SmartScreen Uyarısı

**Kod imzalı olmadığı için** ilk açılışta "Bilinmeyen yayıncı" uyarısı çıkar. Kullanıcı:
- "Daha fazla bilgi" → "Yine de çalıştır"

Bu uyarıyı kaldırmak için **kod imzalama sertifikası** gerekir (~$200-500/yıl). Genelde dahili kullanım için sertifika gerekmez.

İmzalama isteğe bağlı olarak yapılırsa `tauri.conf.json` içine:
```json
"bundle": {
  "windows": {
    "certificateThumbprint": "PARMAK_İZİ",
    "digestAlgorithm": "sha256",
    "timestampUrl": "http://timestamp.digicert.com"
  }
}
```

## Build Çıktısı Boyutları

- NSIS exe: ~5-10 MB (sıkıştırılmış)
- MSI: ~10-15 MB
- Portable exe: ~15-25 MB
- Kurulu boyut: ~30-50 MB

WebView2 bootstrapper bunlara dahildir; çevrimiçi indirici de seçenek olarak `tauri.conf.json` içinde değiştirilebilir.

## İlk Kullanıcı Onboarding

Yeni bilgisayara kurulum sonrası kullanıcının yapması gerekenler:

1. Uygulamayı aç
2. **Mağazalar** → mağaza ekle (sellerId, API key/secret)
3. **Yapay Zeka** (opsiyonel) → Gemini veya OpenRouter API key, model seç, "Aktif Yap"
4. **Ayarlar** → otomatik başlatmayı açabilir, polling aralığını seçer

## Veri Konumu

Kurulu uygulama tüm verileri kullanıcı profilinde saklar:

| Veri | Konum |
|---|---|
| SQLite veritabanı | `%AppData%\com.trendyolqa.app\trendyol_qa.sqlite` |
| API kimlik bilgileri | Windows Credential Manager (`TrendyolQA*`) |
| Log dosyaları | Konsol — geliştirme modunda terminal'de görünür |

Yedek almak için yukarıdaki SQLite dosyasını kopyalamak yeterli.

## Çapraz Bilgisayar Veri Taşıma

SQLite dosyasını kopyalamak şablonları, eski soru-cevap kayıtlarını ve AI eğitim verilerini taşır. **API key/secret'lar Windows Credential Manager'a bağlı olduğu için her bilgisayarda yeniden girilmelidir.**

## Otomatik Güncelleme (Auto-update)

Şu anda **kurulu değil**. Eklenmesi için:

1. Tauri `updater` plugin ekle (`tauri-plugin-updater`)
2. GitHub Releases'a build yükle, RSA imzala
3. `tauri.conf.json` → `plugins.updater.endpoints` ekle

İhtiyaç olursa sonradan eklenebilir.

## Sık Sorunlar

| Sorun | Çözüm |
|---|---|
| Build "missing icon" hatası | `npx tauri icon src-tauri/icons/source.png` çalıştır |
| "WiX not found" → MSI başarısız | NSIS exe yine üretilir; MSI istemiyorsan `tauri.conf.json` → `"targets": ["nsis"]` |
| "WebView2 not installed" | Yükleyici otomatik kurar; offline ortamda WebView2 bootstrapper'ı manuel indir |
| Antivirüs uyarısı | Kod imzalama sertifikası al veya antivirüse istisna ekle |
