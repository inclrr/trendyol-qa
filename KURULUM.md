# Setup / Dağıtım Rehberi

## En Kolay: GitHub Release (Önerilen)

Otomatik build sistemi sayesinde her `git push --tags` ile GitHub Actions release üretir. Hem Windows hem macOS Apple Silicon için dosyalar otomatik hazırlanır.

**Kullanıcı tarafı**: https://github.com/inclrr/trendyol-qa/releases/latest sayfasından platformuna uygun dosyayı indirir.

| Platform | Dosya | Boyut |
|---|---|---|
| **Windows 10/11** | `Trendyol.Soru-Cevap_X.Y.Z_x64-setup.exe` | ~5 MB |
| **macOS Apple Silicon (M1/M2/M3/M4)** | `Trendyol.Soru-Cevap_X.Y.Z_aarch64.dmg` | ~7 MB |
| **Linux x86_64 (AppImage)** | `Trendyol.Soru-Cevap_X.Y.Z_amd64.AppImage` | ~80 MB |
| **Linux x86_64 (Debian/Ubuntu)** | `Trendyol.Soru-Cevap_X.Y.Z_amd64.deb` | ~10 MB |

## Lokal Build (Geliştirici)

```powershell
$env:Path += ";$env:USERPROFILE\.cargo\bin"
npm run tauri build
```

Çıktı: `src-tauri\target\release\bundle\` altında:
- **NSIS exe**: `nsis\Trendyol Soru-Cevap_X.Y.Z_x64-setup.exe`
- **MSI**: `msi\Trendyol Soru-Cevap_X.Y.Z_x64_en-US.msi`
- **macOS DMG** (Mac'te build alıyorsan): `dmg\Trendyol Soru-Cevap_X.Y.Z_aarch64.dmg`
- **Portable**: `target\release\trendyol-qa.exe`

## Kurulum İşlemi

Kullanıcı kurulum dosyasına çift tıklayınca:

1. **WebView2 kontrolü** — eğer kurulu değilse otomatik indirilip kurulur (Windows 11'de zaten var)
2. **Program Files'a kurulum** — `C:\Program Files\Trendyol Soru-Cevap\`
3. **Başlat menüsü kısayolu** + **Masaüstü kısayolu** (NSIS bunları otomatik ekler)
4. **Kaldırma desteği** — Windows Ayarlar → Uygulamalar listesinde görünür

## Yapay Zeka — Yerel (Ollama) Kurulum (Opsiyonel)

API key kullanmadan, tamamen yerel makinede çalışan AI:

1. https://ollama.com adresinden Ollama'yı kur (Windows/macOS/Linux)
2. Terminal/PowerShell'de model indir:
   ```bash
   ollama pull llama3.1:8b
   ```
   (4.7 GB, Türkçe destekli, dengeli model)
3. Uygulamada **Yapay Zeka** ekranı → **Ollama (Yerel)** → **"Modelleri Yükle"** → llama3.1:8b seç → **Aktif Yap**
4. Test: bir soruya AI cevap üret

Avantajlar:
- API key gerekmez
- Tüm veriler bilgisayarında kalır (gizlilik)
- Sınırsız token (kota yok)
- Çevrimdışı çalışır

Dezavantajlar:
- GPU yoksa cevap üretme yavaş olabilir
- Modeller diskte ~5GB yer kaplar

## macOS Kurulum (Apple Silicon)

1. `.dmg` dosyasını indir
2. **Çift tıkla** → Finder'da yeni pencere açılır
3. **`Trendyol Soru-Cevap.app`'i `Applications` klasörüne sürükle bırak**
4. DMG penceresini **Eject** ile çıkar
5. **İlk açılışta** "geliştirici doğrulanmadı / hasarlı" hatası alırsan Terminal'i aç ve şu komutu çalıştır:
   ```bash
   xattr -cr "/Applications/Trendyol Soru-Cevap.app"
   ```
   Bu komut macOS Gatekeeper'ın notarize edilmemiş uygulamalara koyduğu karantina işaretini kaldırır. Sadece **ilk DMG kurulumunda** gerekli — sonraki otomatik güncellemeler bu adımı atlar.
6. Applications'tan çift tıkla → uygulama açılır
7. Veriler `~/Library/Application Support/com.trendyolqa.app/` altında saklanır
8. API kimlikleri macOS Keychain'de güvenli olarak tutulur

### Apple Developer Notarization (Opsiyonel)

Bu uyarıyı tamamen kaldırmak için Apple Developer hesabı ($99/yıl) + notarization gerekir. Dahili kullanım için genelde gereksiz.

## Linux Kurulum

### AppImage (önerilen, dağıtım bağımsız)

1. `.AppImage` dosyasını indir
2. Çalıştırma izni ver:
   ```bash
   chmod +x Trendyol.Soru-Cevap_*.AppImage
   ```
3. Çift tıkla veya terminal'den çalıştır:
   ```bash
   ./Trendyol.Soru-Cevap_*.AppImage
   ```

AppImage tek dosyadır; bağımlılıklar içerir, kurulum gerekmez.

### .deb (Debian / Ubuntu / Mint)

```bash
sudo dpkg -i Trendyol.Soru-Cevap_*.deb
# Bağımlılık eksikse:
sudo apt-get install -f
```

Kurulum sonrası uygulama menüsünden "Trendyol Soru-Cevap" ile bulunur.

### Linux'ta Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b
```

Uygulamada **Yapay Zeka > Model Önerisi Sihirbazı** ile donanımına uygun modeli bulabilirsin.

### Linux Veri Konumu

| Veri | Konum |
|---|---|
| SQLite veritabanı | `~/.local/share/com.trendyolqa.app/trendyol_qa.sqlite` |
| API kimlik bilgileri | `~/.local/share/com.trendyolqa.app/secret_store.bin` (Argon2id + ChaCha20-Poly1305) |

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
