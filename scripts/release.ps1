# Yeni sürüm yayınlama yardımcı scripti
#
# Kullanım:
#   .\scripts\release.ps1 -Version 0.3.0 -Notes "Yeni özellikler ve düzeltmeler"
#
# Bu script:
# 1. package.json, Cargo.toml, tauri.conf.json içindeki sürümü günceller
# 2. İmzalı bir release build üretir (.exe + .sig)
# 3. latest.json manifest dosyasını oluşturur
# 4. Çıktıyı release/ klasörüne kopyalar
#
# Sonrasında manuel olarak:
#   - GitHub'da yeni Release oluştur (tag: v{Version})
#   - release/ klasöründeki 3 dosyayı release'e yükle
#   - Yayınla

param(
    [Parameter(Mandatory=$true)][string]$Version,
    [string]$Notes = "Bu sürümde çeşitli iyileştirmeler.",
    [string]$KeyPath = "$env:USERPROFILE\.tauri\trendyol-qa.key",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

if (-not (Test-Path $KeyPath)) {
    Write-Error "Private key bulunamadı: $KeyPath"
    exit 1
}

# Semver basit doğrulama
if ($Version -notmatch '^\d+\.\d+\.\d+(-[\w\.]+)?$') {
    Write-Error "Geçersiz sürüm formatı: $Version (örn: 0.3.0)"
    exit 1
}

# Mevcut sürümden büyük olduğunu kontrol et
$currentVersion = (Get-Content "package.json" -Raw | ConvertFrom-Json).version
function Compare-SemVer($a, $b) {
    $av = ($a -split '-')[0].Split('.') | ForEach-Object { [int]$_ }
    $bv = ($b -split '-')[0].Split('.') | ForEach-Object { [int]$_ }
    for ($i = 0; $i -lt 3; $i++) {
        if ($av[$i] -ne $bv[$i]) { return $av[$i] - $bv[$i] }
    }
    return 0
}
if ((Compare-SemVer $Version $currentVersion) -lt 0) {
    Write-Error "Yeni sürüm ($Version) mevcut sürümden ($currentVersion) küçük olamaz."
    exit 1
}
if ((Compare-SemVer $Version $currentVersion) -eq 0 -and -not $Force) {
    Write-Error "Sürüm $Version zaten kayıtlı. Aynı sürümü yeniden build etmek için -Force kullan."
    exit 1
}

Write-Host "→ Sürüm $currentVersion → $Version güncelleniyor..." -ForegroundColor Cyan

# Eski release dosyalarını temizle
$releaseDir = Join-Path $root "release"
if (Test-Path $releaseDir) {
    Get-ChildItem $releaseDir -File | ForEach-Object { Remove-Item $_.FullName -Force }
}

# Eski bundle sürümlerini de temizle (bundle dizininde sadece yeni sürüm kalsın)
$nsisDirAbs = Join-Path $root "src-tauri\target\release\bundle\nsis"
if (Test-Path $nsisDirAbs) {
    Get-ChildItem $nsisDirAbs -File | Where-Object { $_.Name -notlike "*_${Version}_*" } | ForEach-Object {
        Write-Host "  Eski bundle dosyası siliniyor: $($_.Name)" -ForegroundColor DarkGray
        Remove-Item $_.FullName -Force
    }
}

# package.json
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$pkg.version = $Version
$pkg | ConvertTo-Json -Depth 100 | Set-Content "package.json" -Encoding UTF8

# tauri.conf.json
$conf = Get-Content "src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
$conf.version = $Version
$conf | ConvertTo-Json -Depth 100 | Set-Content "src-tauri\tauri.conf.json" -Encoding UTF8

# Cargo.toml
$cargo = Get-Content "src-tauri\Cargo.toml" -Raw
$cargo = $cargo -replace '(?m)^version = "[^"]+"', "version = `"$Version`""
Set-Content "src-tauri\Cargo.toml" -Value $cargo -Encoding UTF8

Write-Host "→ Bağımlılıklar kontrol ediliyor..." -ForegroundColor Cyan
npm install --silent

Write-Host "→ İmzalı production build başlatılıyor (10-15 dk)..." -ForegroundColor Cyan
# Tauri 2: TAURI_SIGNING_PRIVATE_KEY hem path hem de string içerik kabul eder
$env:TAURI_SIGNING_PRIVATE_KEY = $KeyPath
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
$env:Path += ";$env:USERPROFILE\.cargo\bin"

npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build başarısız."
    exit 1
}

# Çıktıları topla
$releaseDir = Join-Path $root "release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$nsisDir = "src-tauri\target\release\bundle\nsis"
# Sürüm numarasına göre seç (bundle dizininde önceki sürümler de kalmış olabilir)
$setupExe = Get-ChildItem $nsisDir -Filter "*_$($Version)_x64-setup.exe" | Select-Object -First 1
$sigFile = Get-ChildItem $nsisDir -Filter "*_$($Version)_x64-setup.exe.sig" | Select-Object -First 1
if (-not $setupExe) {
    # Yedek: en son değiştirileni seç
    $setupExe = Get-ChildItem $nsisDir -Filter "*setup.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
if (-not $sigFile) {
    $sigFile = Get-ChildItem $nsisDir -Filter "*setup.exe.sig" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

if (-not $setupExe) {
    Write-Error "Setup exe bulunamadı: $nsisDir"
    exit 1
}
if (-not $sigFile) {
    Write-Error "İmza dosyası bulunamadı (TAURI_SIGNING_PRIVATE_KEY_PATH doğru mu?): $nsisDir"
    exit 1
}

Copy-Item $setupExe.FullName -Destination $releaseDir -Force
Copy-Item $sigFile.FullName -Destination $releaseDir -Force

# Manifest dosyası
$signature = Get-Content $sigFile.FullName -Raw
$pubDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$endpoint = $conf.plugins.updater.endpoints[0]
# Endpoint örn: https://github.com/USER/REPO/releases/latest/download/latest.json
$repoBase = $endpoint -replace "/releases/latest/download/latest\.json$", ""
# GitHub release asset upload'ında dosya adındaki boşluklar otomatik nokta'ya dönüşür
$assetName = $setupExe.Name -replace ' ', '.'
$downloadUrl = "$repoBase/releases/download/v$Version/$assetName"

$manifest = @{
    version = $Version
    notes = $Notes
    pub_date = $pubDate
    platforms = @{
        "windows-x86_64" = @{
            signature = $signature.Trim()
            url = $downloadUrl
        }
    }
} | ConvertTo-Json -Depth 10

Set-Content (Join-Path $releaseDir "latest.json") -Value $manifest -Encoding UTF8

Write-Host ""
Write-Host "✓ Release hazır → $releaseDir" -ForegroundColor Green
Write-Host ""
Write-Host "Bir sonraki adımlar:" -ForegroundColor Yellow
Write-Host "  1. https://github.com/$($repoBase.Split('/')[-2])/$($repoBase.Split('/')[-1])/releases/new"
Write-Host "  2. Tag: v$Version"
Write-Host "  3. Title: v$Version - $Notes"
Write-Host "  4. Şu 3 dosyayı yükle:"
Get-ChildItem $releaseDir | ForEach-Object { Write-Host "     - $($_.Name)" }
Write-Host "  5. Publish release"
Write-Host ""
Write-Host "  Sonra git commit + push:"
Write-Host "  git add -A; git commit -m 'chore: release v$Version'; git tag v$Version; git push --tags"
