# Güvenlik Politikası

## Güvenlik Açığı Bildirimi

Bir güvenlik açığı bulduysanız lütfen **public issue açmayın**. Bunun yerine doğrudan e-posta ile bildirin:

📧 **incelerb@gmail.com**

### Bildirim Yaparken

- Açığın türü ve etkisi (örn. credential disclosure, RCE, XSS)
- Tekrar üretme adımları
- Etkilenen sürüm(ler)
- Önerdiğiniz çözüm (varsa)

48 saat içinde dönüş yapılır. Düzeltme ardından açık şekilde teşekkür edilir (isim açıklanması istenirse).

## Desteklenen Sürümler

| Sürüm | Destek |
|---|---|
| 0.4.x | ✅ Tam destek |
| 0.3.x | ⚠️ Sadece kritik güvenlik düzeltmeleri |
| < 0.3 | ❌ Desteklenmez |

## Bilinen Riskler

- **CSP devre dışı**: v0.3.1'de beyaz ekran fix'i için CSP `null` set edildi. İleride uygun CSP ile geri eklenecek.
- **macOS notarization yok**: Ad-hoc imza ile dağıtılıyor. İlk açılışta "geliştirici doğrulanmadı" uyarısı normal.
- **API key'ler Windows Credential Manager / macOS Keychain'de**: Kullanıcı oturum güvenliğine bağlı.
