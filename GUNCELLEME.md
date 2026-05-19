# Otomatik Güncelleme Sistemi

## Çalışma Mantığı

```
[Sürüm 0.2.0 kuruldu]
        │
        ▼
[Uygulama açılıyor]
        │
        ▼ (5 sn sonra)
[İmzalı manifest URL'ine GET]
        │
        ▼
[Sürüm karşılaştırma]
        │
   ┌────┴────┐
   ▼         ▼
[Güncel]  [Yeni var]
   │         │
   │         ▼
   │    [Ayarlar'da yeşil rozet + "İndir ve Kur"]
   │         │
   │         ▼
   │    [Kullanıcı "İndir ve Kur"]
   │         │
   │         ▼
   │    [İmza doğrulanır → kurulum → restart]
   ▼
[Hiçbir şey olmaz]
```

## İlk Kurulum (Tek Seferlik)

### 1. GitHub Repository Oluştur

GitHub'da yeni bir repo aç (public veya private fark etmez ama public daha kolay):
- Repo adı önerisi: `trendyol-qa`
- Public veya private

### 2. tauri.conf.json İçindeki Repo Adresini Değiştir

`src-tauri\tauri.conf.json` dosyasında:
```json
"endpoints": [
  "https://github.com/YOUR-GITHUB-USERNAME/trendyol-qa/releases/latest/download/latest.json"
]
```

`YOUR-GITHUB-USERNAME` ve `trendyol-qa` kısımlarını **kendi kullanıcı adınla ve repo adınla** değiştir.

### 3. Bu Repoyu GitHub'a Push Et

```powershell
cd C:\Users\gocaoglan\Desktop\QA
git init
git add .
git commit -m "chore: initial commit v0.2.0"
git branch -M main
git remote add origin https://github.com/SENIN_USERNAME/trendyol-qa.git
git push -u origin main
```

> **DİKKAT**: `.gitignore` zaten `*.key` ve `*.key.pub`'ı içeriyor — private signing key asla repoya gitmez.

### 4. İlk Sürümü (v0.2.0) Yayınla

Çünkü mevcut kurulu sürüm v0.1.0 (updater'sız). Şu komutla v0.2.0'ı imzala ve yayına hazırla:

```powershell
.\scripts\release.ps1 -Version 0.2.0 -Notes "Otomatik güncelleme sistemi eklendi"
```

Script `release\` klasöründe 3 dosya oluşturur:
- `Trendyol Soru-Cevap_0.2.0_x64-setup.exe`
- `Trendyol Soru-Cevap_0.2.0_x64-setup.exe.sig`
- `latest.json`

### 5. GitHub Release Oluştur

1. https://github.com/SENIN_USERNAME/trendyol-qa/releases/new
2. **Tag**: `v0.2.0` (önemli — "v" prefix'i olmalı veya olmamalı, tutarlı kal)
3. **Release title**: `v0.2.0 - Otomatik güncelleme`
4. **Attach binaries**: `release\` klasöründeki 3 dosyayı sürükle bırak
5. **Publish release**

### 6. Mevcut Kurulu v0.1.0'ı Manuel v0.2.0'a Geçir

İlk kez updater eklendiği için, mevcut v0.1.0 kurulumu (eski bilgisayar) updater bilmiyor. Bu **tek seferlik** manuel adım:

- Yeni `Trendyol Soru-Cevap_0.2.0_x64-setup.exe`'yi eski bilgisayara taşı
- Çift tıkla, kur (üzerine yazar)
- Bundan sonra v0.3.0, v0.4.0... otomatik gelir

---

## Sonraki Sürüm Yayını (Tipik Akış)

Bir özellik ekledin veya bir bug düzelttin. Yeni sürüm yayınlamak için:

```powershell
.\scripts\release.ps1 -Version 0.3.0 -Notes "İşaretsiz mağaza durumlarını filtreleme eklendi"
```

Sonra GitHub'da release oluştur, 3 dosyayı yükle, publish.

**O kadar.** Tüm kurulu kullanıcıların uygulaması:
- 5 saniye içinde manifest'i çeker
- Ayarlar'da yeşil "●" rozet belirir
- Kullanıcı Ayarlar → "İndir ve Kur" tıklar → otomatik güncellenir

## Manuel Build (Script Olmadan)

Eğer script çalışmazsa veya kendin yapmak istersen:

```powershell
# Sürüm numaralarını manuel güncelle (3 dosya):
#   package.json
#   src-tauri\Cargo.toml
#   src-tauri\tauri.conf.json

# Build (imzalama anahtarı env'de olmalı)
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = "$env:USERPROFILE\.tauri\trendyol-qa.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
$env:Path += ";$env:USERPROFILE\.cargo\bin"
npm run tauri build

# Çıktılar:
#   src-tauri\target\release\bundle\nsis\*-setup.exe       (binary)
#   src-tauri\target\release\bundle\nsis\*-setup.exe.sig   (imza)

# latest.json'ı manuel oluştur:
{
  "version": "0.3.0",
  "notes": "Sürüm notları",
  "pub_date": "2026-05-20T10:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<.sig dosyasının içeriği>",
      "url": "https://github.com/USERNAME/REPO/releases/download/v0.3.0/Trendyol Soru-Cevap_0.3.0_x64-setup.exe"
    }
  }
}
```

## İmza Anahtar Yönetimi

| Dosya | Konum | Önemli |
|---|---|---|
| **Private key** | `%USERPROFILE%\.tauri\trendyol-qa.key` | Asla paylaşma, kaybedersen güncelleme yapamazsın |
| **Public key** | `%USERPROFILE%\.tauri\trendyol-qa.key.pub` | Uygulamada `tauri.conf.json` içinde |

### Private Key'i Yedekle

Bilgisayarın bozulursa veya kaybolursa, anahtarı yedeklememişsen uygulamayı bir daha güncelleyemezsin (yeni anahtar üretirsen, mevcut kurulu sürümler yeni güncellemeleri "imza geçersiz" diye reddeder).

**Önerilen yedek**:
1. `%USERPROFILE%\.tauri\trendyol-qa.key` dosyasını parolayla şifrelenmiş bir konuma kopyala (KeePass, BitWarden secure note, vs.)
2. Veya basitçe yazdırıp fiziksel saklama

### Anahtarı Kaybedersen?

Yeni anahtar çifti üret:
```powershell
npx --yes tauri signer generate -w $env:USERPROFILE\.tauri\trendyol-qa.key --force
```

Yeni public key'i `tauri.conf.json`'a yapıştır. Bu sürümü tek seferlik **manuel** kurmaları gerekecek — sonrasında yeni anahtarla otomatik güncellemeler devam eder.

## CI/CD ile Otomatize Etme (Opsiyonel)

İleri seviye: her `git push` ile otomatik release oluşturmak için GitHub Actions workflow ekleyebilirsin. Bunun için private key'i GitHub Secret olarak saklarsın. Detay için: https://v2.tauri.app/distribute/pipelines/github/

## Sık Sorunlar

| Sorun | Çözüm |
|---|---|
| "Update is not properly signed" | Build sırasında `TAURI_SIGNING_PRIVATE_KEY_PATH` ortam değişkeni set edilmemiş veya public key `tauri.conf.json`'da yanlış |
| Manifest 404 | GitHub release'de `latest.json` adında dosya yok veya repo adı `tauri.conf.json`'da hatalı |
| "No update available" gözükmesine rağmen güncel sürüm yüklü | Manifest'teki version mevcut sürümden büyük olmalı (semver) |
| Kurulum sonrası uygulama açılmıyor | Setup.exe `--update-restart` argümanı ile çağırıldığında bazen kilitlenir; manuel çıkış yapıp tekrar aç |
