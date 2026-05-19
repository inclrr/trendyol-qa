Servis Limitleri
Servis limitleri ve entegrasyon servisleri hakkında detaylı bilgi.

Soru & Cevap Servisleri

Aşağıdaki tablo üzerinden müşteri soru & cevap servislerimizin limitlerini kontrol edebilirsiniz.

Alan	Entegrasyon Servisi	Rate Limitation
Soru & Cevap	Müşteri Sorularını Çekme	1000 req/min
Soru & Cevap	Müşteri Sorularını Cevaplama	500 req/min

Authorization
API Bağlantısının Kurulması (Authorization)
❗️
DİKKAT

API bilgileri üzerinden tüm entegrasyon işlemleri gerçekleştirileceğinden, API key bilgilerinizin herhangi bir açık platformda (github, gitlab vb.) paylaşılmaması önemlidir.

Entegrasyon servislerine gönderilecek istekler, temel kimlik doğrulama yöntemi olan "basic authentication" ile yetkilendirilmelidir.

Basic Authentication için kullanılan supplierid , API KEY ve API SECRET KEY bilgileri satıcı panelinde yer alan "Hesap Bilgilerim" bölümündeki "Entegrasyon Bilgileri" sayfasından alınmalıdır. Bu bilgiler, yalnızca master user (admin rolü) ile giriş yapılması halinde görünmektedir.

Authentication bilgileri PROD ve STAGE ortamlarında değişiklik gösterebilir. Kullanılan endpoint ve ortama göre bilgiler revize edilmelidir.

Hatalı authorization yapılması durumunda status: 401 , "exception": "ClientApiAuthenticationException" mesajı dönecektir.

Auth ve User-Agent Kullanımı
Trendyol Partner API'ye yapılacak tüm isteklerde, Auth ve User-Agent bilgileri Header'da bulunmalıdır. User-Agent bilgisi olmayan istekler, 403 hatası alarak engellenecektir.

Eğer bir aracı firma ile çalışılıyorsa User-Agent bilgisi olarak "Satıcı Id - {Entegrasyon Firması İsmi}" olarak, entegrasyon yazılımı firmaya aitse "Satıcı Id - SelfIntegration" olarak gönderilmelidir.

Entegratör firma ismi alfanumerik karakterlerle maksimum 30 karakter uzunluğunda gönderilmelidir.

Örnek 1 :

SatıcıId : 1234
Entegratör firma ismi : TrendyolSoft
Gönderilecek user-agent bilgisi : "1234 - TrendyolSoft"
Örnek 2 :

SatıcıId : 4321
Entegratör firma yok. Yazılım firmaya ait.
Gönderilecek user-agent bilgisi : "4321 - SelfIntegration"
Trendyol API Servis İstek Sınırlaması
Trendyol Partner API'ye yapacağınız tüm isteklerde aynı endpointe 10 saniye içerisinde maksimum 50 request atabilirsiniz. 51. requesti denediğiniz an sizlere "429 status code and it say too.many.requests" hatası dönecektir.

Canlı-Test Ortam Bilgileri
Bilgiler ve yönergeler: Trendyol canlı ve test ortamları için IP yetkilendirmesi ve erişim detayları.

👍
İPUCU

Satıcı ID ve API Key bilgilerinize Trendyol Satıcı Paneli üzerinden sağ üstte bulunan Mağaza Adınıza > Hesap Bilgilerim menüsüne tıklayarak ulaşabilirsiniz.

Trendyol test ortamına erişim için IP yetkilendirmesi gerekmektedir. Prod ortamında herhangi bir IP yetkilendirmesine gerek yoktur ancak IP'niz bazı nedenlerden dolayı engellenmiş olabilir. Hem test hem de prod ortamında herhangi bir erişim sorunuyla karşılaşmanız durumunda IP adresiniz ile birlikte satıcı paneli üzerinden bildirim oluşturabilirsiniz.

CANLI ORTAM BİLGİLERİ
Canlı ortamda herhangi bir IP yetkilendirmesine gerek bulunmamaktadır.

ENDPOINT

https://apigw.trendyol.com


TEST ORTAMI BİLGİLERİ
Test ortamı hesap ve API bilgileriniz canlı ortam bilgilerinizden tamamen farklıdır.

1. Adım : Test ortamına erişebilmek için uygulama sunucularının IP bilgileri Trendyol tarafına bildirilerek erişim tanımı yapılmalıdır. Birden fazla IP tanımı yapılabilir, tanımlanan IP'ler daha sonra bildirilmesi halinde güncellenebilir. Ağ çıkış adresiniz olan IP adresini iletmeniz gerekmektedir. Statik IP'ler için yetkilendirme sağlanamamaktadır.

Test ortamı talebi ve IP yetkilendirmesi işlemleri için 0850 258 58 00 numaralı çağrı merkezi üzerinden satıcı bildirimi oluşturmanız gerekmektedir.

Test ortamında alacağınız 503 hatası IP yetkilendirmesi olmamasından kaynaklıdır.

2. Adım (IP yetkilendirmesi gerektirmektedir) : Test ortamı için ortak test hesabını kullanabilir veya özel test hesabı talebinizi Seller Center üzerinden destek ekibine iletebilirsiniz. Özel test hesabı bilgileriniz için test ortamına giriş yapacağınız email adresi, telefon numarası ve şirketinize ait tckn/vkn değerini talebinizin içerisinde iletmeniz yeterli olacaktır.

Ortak test hesabı bilgileri için 0850 258 58 00 numaralı çağrı merkezi üzerinden satıcı bildirimi oluşturmanız gerekmektedir.

API bilgilerinize stage partner sayfasınızda her alan "Hesap Bilgilerim" bölümünden ulaşabilirsiniz.

3. Adım (IP yetkilendirmesi gerektirmektedir): Testlerinizi test mağaza API bilgileri ile kendi yazılımınız üzerinden veya POSTMAN aracılığı ile örnek collection kullanarak yapabilirsiniz.

COLLECTION

Örnek Postman Collection :

https://api.postman.com/collections/50672673-7310783c-2c31-4137-8f67-3df933eca895?access_key=REDACTED

Collection dosyasını Postman > Import > Link yolu ile ekleyebilirsiniz.

TEST ORTAMI PANELİ:

ENDPOINT

https://stageapigw.trendyol.com

Hata Kodları
Marketplace entegrasyonundaki hata kodlarına aşağıdan ulaşabilirsiniz

HATA KODU	DETAY
200 OK	Yaptığınız istek Trendyol tarafından başarıyla işlendi.
201 Created	Yaptığınız istek yerine getirildi ve yeni bir kaynak oluşturuldu.
202 Accepted	Yaptığınız istek kabul edildi ancak henüz işleme koyulmadı.
204 No Content	Yaptığınız istek kabul edildi ancak içerik döndürülmeyecek.
400 Bad Request	Yaptığınız istek geçerli bir istek değildir, zorunlu alanlar doldurulmamış ya da yapılan isteğin içinde Trendyol'un kabul etmediği değerler mevcut.
401 Unauthorized	Gerekli kimlik doğrulama bilgileri istekte yok veya yanlış, Yetkilendirmeyi tekrar kontrol edin.
403 Forbidden	Sunucu isteğe yanıt vermeyi reddediyor. Hatalı bir endpoint veya servis parametresi ile istek yapılması durumunda genellikle bu durum yaşanır.
404 Not Found	İstenilen kaynak bulunamadı veya olmayan bir yere istek gönderildi.
405 Method Not Allowed	Yapılan istek doğru metod ile yapılmadı. GET/POST isteğinizin doğru olduğunu kontrol edin.
409 Resource Conflict	İstekteki çakışma nedeniyle istenen kaynak işlenemedi. Örneğin, istenen kaynak beklenen durumda olmayabilir.
414 URI Too Long	Sunucu, sağlanan Tekdüzen Kaynak Tanımlayıcısı (URI) çok uzun olduğundan isteği kabul etmeyi reddediyor.
415 Unsupported Media Type	Yük biçimi desteklenmeyen bir format olduğundan sunucu isteği kabul etmeyi reddediyor.
429 Too Many Requests	Yapılan istek sayısı, Trendyol'un belirlediği sınırı aştığı için talep kabul edilmedi. Trendyol'un API oranı sınırları hakkında daha fazla bilgi edinin.
500 Internal Server Error	Trendyol sisteminde bir hata oluştu. İsteğinizi yeniden deneyin. Sorun devam ederse lütfen tüm hata kodlarını ve işlemlerinizi kaydedin, Trendyol personelinin araştırabilmesi için Çağrı Merkezimiz ile iletişime geçin.
502 Bad Gateway	Trendyol sisteminde bir hata oluştu. İsteğinizi yeniden deneyin.
503 Service Unavailable	Trendyol sisteminde bir hata var ve şu anda kullanılamıyor. Bildirilen hizmet kesintileri için Trendyol bildirimlerinizi kontrol edin.
504 Gateway Timeout	Yaptığınız istek zamanında tamamlanamadı. Yaptığınız istek çok büyükse, bunu birden fazla küçük isteğe bölmeyi deneyin.

Müşteri Sorularını Çekme
Trendyol üzerinden müşterilerin iş ortaklarımıza sormuş olduğu soruların tümünü bu servis aracılığı ile çekebilirsiniz.

GET questionsFilter
Herhangi bir tarih parametresi vermeden aşağıdaki endpoint ile istek atmanız halinde son bir hafta içerisindeki sorularınız sizlere gösterilecektir. startDate ve endDate parametrelerini eklemeniz halinde verilebilecek maksimum aralık iki hafta olacaktır.

PROD
https://apigw.trendyol.com/integration/qna/sellers/{sellerId}/questions/filter

STAGE
https://stageapigw.trendyol.com/integration/qna/sellers/{sellerId}/questions/filter

Önerilen Endpoint

PROD
https://apigw.trendyol.com/integration/qna/sellers/{sellerId}/questions/filter?startDate={startDate}&endDate={endDate}&status=WAITING_FOR_ANSWER

Servis Parametreleri

supplierId zorunlu alan olarak istekte gönderilmelidir
Parametre	Parametre Değer	Açıklama	Tip
barcode		Belirli barcode değerine ait olan sorular için kullanılabilir.	string
page		Sadece belirtilen sayfadaki bilgileri döndürür	int
size	Varsayılan: 20, Maksimum: 50	Bir sayfada listelenecek maksimum adeti belirtir.	int
supplierId		İlgili tedarikçinin ID bilgisi gönderilmelidir	long
endDate		Belirtilen tarihe kadar olan soruları getirir. Timestamp(millisecond) olarak gönderilmelidir.	long
startDate		Belirtilen tarihten sonraki soruları getirir. Timestamp(millisecond) olarak gönderilmelidir.	long
status	WAITING_FOR_ANSWER, ANSWERED, REPORTED, REJECTED, UNANSWERED	Soruların statülerine göre bilgilerini getirir.	string
orderByField	LastModifiedDate	Son güncellenme tarihini baz alır.	string
orderByField	CreatedDate	Sorunun oluşma tarihini baz alır	string
orderByDirection	ASC	Eskiden yeniye doğru sıralar.	string
orderByDirection	DESC	Yeniden eskiye doğru sıralar.	string

Status	Açıklama
WAITING_FOR_ANSWER	Müşteri sorusu satıcı tarafından cevaplanmayı bekliyor
ANSWERED	Soru cevaplanmış ve yayınlanmış
REPORTED	Satıcı tarafından raporlanmış soru
REJECTED	Satıcının cevabı reddedilmiş
UNANSWERED	Cevaplanmamış soru (cevaplama süresi dolmuş)

Müşteri Sorularını Cevaplama
Trendyol Müşteri Sorularını Çekme Servisi üzerinden çekmiş olduğunuz sorulara bu servis aracılığı ile cevap verebilirsiniz.

Cevap mesajı minimum 10, maksimum 2000 karakter aralığında olmalıdır.
Cevaplar yasaklı kelime kontrolünden geçirilir. Yasaklı kelime içeren cevaplar reddedilir.
POST createAnswer
PROD
https://apigw.trendyol.com/integration/qna/sellers/{sellerId}/questions/{id}/answers

STAGE
https://stageapigw.trendyol.com/integration/qna/sellers/{sellerId}/questions/{id}/answers

Örnek Servis İsteği

JSON

{
  "text": "string"
}
Örnek Servis Cevabı

JSON

{
  "answerId": 0
}
Field Açıklamaları:

Field İsmi	Açıklama
id	Ürün sorusunun id'sidir. Ürün sorularını çekme servisinden alınabilir.
text	Cevap metnidir
sellerId	İlgili tedarikçinin id bilgisidir..
Hata Durumları:

Cevaplama işlemi sırasında aşağıdaki hata durumları ile karşılaşabilirsiniz:

Hata Durumu	Açıklama
Soru daha önce cevaplanmış	Bu soru daha önce cevaplandı. Cevaplanmış sorular tekrar cevaplanamaz.
Süre limiti aşılmış	Belirtilen süre içinde cevap vermediğiniz için soru kapatılmıştır.
Yasaklı kelime limiti aşılmış	Cevabınızda yasaklı kelime kullanma limitini aştığınız için soru kapatılmıştır.
Cevap çok kısa	Cevabınız 10 karakterden uzun olmalıdır.
Cevap çok uzun	Cevabınız 2000 karakterden uzun olamaz.
Cevap boş	Bir cevap giriniz.
Hangi Statüdeki Sorular Cevaplanabilir?

Statü	Cevaplanabilir mi?	Açıklama
WAITING_FOR_ANSWER	Evet	Sadece bu statüdeki sorular cevaplanabilir.
ANSWERED	Hayır	Soru cevaplanmış.
REPORTED	Hayır	Soru raporlanmış, admin değerlendirmesi bekleniyor.
REJECTED	Hayır	Soru reddedilmiş ve kapatılmış.
UNANSWERED	Hayır	3 iş günü içinde yanıtlanmama veya yasaklı kelime limitinin aşılması nedeniyle kapatılmış.

📘
ÖNEMLİ NOTLAR:

Cevap verdikten sonra cevabınız yasaklı kelime kontrolünden geçirilir.
Yasaklı kelime tespit edilirse cevabınız reddedilir ve soru tekrar WAITING_FOR_ANSWER statüsüne döner.
Belirli sayıda yasaklı kelime içeren cevap verirseniz, soru UNANSWERED statüsüne geçer ve bir daha cevaplayamazsınız.

ÖNEMLİ GÜNCELLEME (Yakında Devreye Alınacaktır)
getShipmentPackages endpoint’i için aşağıdaki değişiklikler planlanmaktadır:

Maksimum erişilebilir kayıt sayısı 10.000 (maxQueryWindowResult) ile sınırlandırılacaktır (ilerleyen dönemlerde bu limit daha da düşürülebilir)
Erişilebilir veri kapsamı son 1 ay ile sınırlandırılacaktır
Rate limit değerleri güncellenecek olup, yüksek hacimli isteklerde daha sık 429 (Too Many Requests) hatası alınabilecektir
Bu değişiklikler, büyük veri setlerini tarama (scanning) senaryolarında mevcut endpoint’in kullanımını sınırlayacaktır.

🚀 Önerilen Aksiyon

Büyük veri çekme ve senkronizasyon işlemleri için getShipmentPackagesStream endpoint’ine geçiş yapmanız önerilir.

Stream endpoint:

Cursor tabanlı pagination ile çalışır
Büyük veri setleri için optimize edilmiştir
Rate limit açısından daha verimli kullanım sağlar
💡 Not

Mevcut getShipmentPackages endpoint’i kullanılmaya devam edilebilir, ancak:

Büyük veri tarama (full scan)
Periyodik senkronizasyon (polling)
gibi senaryolar için uygun değildir.


Trendyol sistemine ilettiğiniz ürünler ile müşteriler tarafından verilen ve ödeme kontrolünde olan her siparişin bilgisini bu method yardımıyla alabilirsiniz. Sistem tarafından ödeme kontrolünden sonra otomatik paketlenerek sipariş paketleri oluşturulur.

Sipariş Sorgulama ve Sıralama:

Bu servise 1 dakika içinde en fazla 1000 adet istek atabilirsiniz.
Servise atılan isteklerde, PackageLastModifiedDate sıralamasına göre bir response alırsınız.
suppliers/(supplierid)/orders?status=Created gibi bir query ile paket statülerine göre sorgulama yapılabilir. Kullanılabilen statüler: Created, Picking, Invoiced, Shipped, Cancelled, Delivered, UnDelivered, Returned, Repack, UnSupplied.
Sipariş bilgilerini çekerken, ürünün createProducts ile gönderilen Barkod değerlerine göre paketleme ve işlemler yapılmalıdır.
Maksimum 1 aylık geçmişe dönük sipariş sorgularını bu servis üzerinden yapabilirsiniz.
Alanlar, Veri Tipleri ve Karakter Sayıları:

Body içindeki değerlerin karakter sayıları ve veri tipleri, sipariş sayısının doğal artışıyla birlikte değişebilir. Sisteminizi buna uygun şekilde kurmanız önerilir.
Sipariş datasında bulunan orderNumber, Trendyol sistemindeki ana sipariş numarasını temsil eder. İlgili seviyede yer alan id değeri, oluşturulmuş Sipariş Paketini temsil eder.
customerId, Trendyol müşteri hesabına tanımlı unique bir değerdir.
deliveryAddressType, "Shipment" veya "CollectionPoint" olarak dönebilir. "CollectionPoint" ise sipariş teslimat noktası siparişidir.
orderDate, Timestamp (milliseconds) formatında GMT +3 olarak iletilir. createdDate bilgileri ise GMT formatında iletilir. Convert işlemi yaparken bu bilgiye dikkat edilmelidir.
Hızlı teslimat bilgisi için kullanılan fastDeliveryType alanı, "TodayDelivery", "SameDayShipping", "FastDelivery" değerlerini alabilir.
Trendyol Satıcı Panelinde cargoTrackingNumber değeri için kullanılan barkod CODE128 formatındadır.
Trendyol İhracat Partnerliği kapsamında sipariş paketlerini çekme servisimize yeni bir alan olarak 3pByTrendyol alanını ekledik. Alan boolean bir alandır. Alan değeri true olduğunda ;
micro alanı false değer alacaktır.
invoiceAddress datasında Trendyol’a ait şirket bilgileri yer alacak olup faturalar da buradaki bilgilere göre kesilecektir.
Sipariş Statüleri İle İlgili Bilgiler:

Awaiting statüsündeki siparişleri sadece stok işlemleri için kullanabilirsiniz. Bu statüdeki siparişler ile ilgili farklı bir işlem yapmamanız gerekmektedir. Şu an bu statüdeki siparişler için sizlere servis cevabında gerekli veriler iletilmektedir. İlerleyen günlerde bu veriler sizlere dönmeyecektir.Bu statüdeki siparişleri kargoya teslim ettiğinizde, yaşanabilecek sipariş iptali işlemlerinin olabileceğini ve Trendyol olarak bu konuda bir sorumluluk kabul etmediklerini belirtmek isteriz.
İptal olan siparişler için status=Cancelled,UnSupplied parametresi kullanılabilir.
Bölünmüş siparişler için status=UnPacked parametresi kullanılabilir.
Bir sipariş paketi içindeki bir ya da birden fazla kalem iptal edilirse, orderNumber aynı kalarak sipariş paketi bozulur ve yeni bir id değeri ve kargo barkodu oluşturulur.
Adres Bilgilerine Erişim:

Sipariş paketlerini çekme servisi tarafından dönen Türkiye, Azerbaycan ve GULF bölgelerinin adres alanlarının id değerlerine (city, district, neighbourhood) Adres Bilgileri Servislerinden ulaşabilirsiniz.

GULF Bölgesi(Suudi Arabistan, Bahreyn, Katar, Kuveyt, Birleşik Arap Emirlikleri ve Umman) siparişlerindeki adres alanları bazı durumlarda boş dönebilir. Özellikle ilçe bilgisi ile ilgili sistemlerinizde kontroller varsa kaldırmanızı rica ederiz.

Menşei Bilgisi:

Mikro ihracat siparişlerinde oluşan paketlerde faturalara menşei bilgisi eklenmesi gerekmektedir. Menşei bilgisi “lines” alanı altından "productOrigin" datası üzerinden dönecektir.
Altın, Gübre ve Yüksek Tutarlı Siparişler:

Altın, gübre veya 5000₺ üzeri siparişlere ait TCKN numarası "IdentityNumber" alanında iletilir.
Kurumsal Faturalı Siparişler

Siparişin kurumsal olup olmadığını belirlemek için sipariş datasındaki commercial değerini kontrol ediniz.

Eğer "commercial" değeri "true" olarak dönerse, kurumsal bir sipariş olduğunu belirtir.

Eğer "commercial" değeri "false" olarak dönerse, siparişin bireysel bir müşteriye ait olduğunu belirtir.

Kurumsal Fatura Bilgileri: Eğer sipariş kurumsal bir müşteriye aitse (commercial=true), aşağıdaki bilgileri invoiceAddress alanından alabilirsiniz:

"company": Kurumun adı

"taxNumber": Kurumun vergi numarası

"taxOffice": Kurumun bağlı olduğu vergi dairesi

E-Fatura Mükellefi Kontrolü: Kurumsal müşterinin e-fatura mükellefi olup olmadığını kontrol etmek için invoiceAddress alanındaki eInvoiceAvailable değerini kullanabilirsiniz.

Eğer "eInvoiceAvailable" değeri "true" ise, müşteri e-fatura mükellefidir.

Eğer "eInvoiceAvailable" değeri "false" ise, müşteri e-fatura mükellefi değildir.

"createdBy" aşağıdaki değerleri alabilir:

"order-creation" -> Paket, gelen siparişle doğrudan oluşturulur
"cancel" -> Paket, kısmi iptalden sonra oluşturulur
"split" -> Paket, paket bölünmesine göre oluşturulur
"transfer" -> Siparişi alan satıcının ürünü olmaması nedeniyle Trendyol tarafından başka bir satıcıya yönlendirilen siparişler.
GET getShipmentPackages
Herhangi bir tarih parametresi vermeden aşağıdaki endpoint ile istek atmanız halinde son bir hafta içerisindeki siparişleriniz sizlere gösterilecektir. startDate ve endDate parametrelerini eklemeniz halinde verilebilecek maksimum aralık iki hafta olacaktır.

PROD
https://apigw.trendyol.com/integration/order/sellers/{sellerId}/orders

STAGE
https://stageapigw.trendyol.com/integration/order/sellers/{sellerId}/orders

Önerilen Endpoint

PROD
https://apigw.trendyol.com/integration/order/sellers/{sellerId}/orders?status=Created&startDate={startDate}&endDate={endDate}&orderByField=PackageLastModifiedDate&orderByDirection=DESC&size=50

Servis Parametreleri

Parametre	Parametre Değer	Açıklama	Tip
startDate		Belirli bir tarihten sonraki siparişleri getirir. Timestamp (milliseconds) ve GMT +3 olarak gönderilmelidir.	long
endDate		Belirtilen tarihe kadar olan siparişleri getirir. Timestamp (milliseconds) ve GMT +3 olarak gönderilmelidir.	long
page		Sadece belirtilen sayfadaki bilgileri döndürür	int
size	Maksimum 200	Bir sayfada listelenecek maksimum adeti belirtir.	int
supplierId		İlgili tedarikçinin ID bilgisi gönderilmelidir	long
orderNumber		Sadece belirli bir sipariş numarası verilerek o siparişin bilgilerini getirir	string
status	Created, Picking, Invoiced, Shipped ,Cancelled, Delivered, UnDelivered, Returned, AtCollectionPoint, UnPacked, UnSupplied	Siparişlerin statülerine göre bilgileri getirir.	string
orderByField	PackageLastModifiedDate	Son güncellenme tarihini baz alır.	string
orderByDirection	ASC	Eskiden yeniye doğru sıralar.	string
orderByDirection	DESC	Yeniden eskiye doğru sıralar.	string
shipmentPackageIds		Paket numarasıyla sorgu atılır.	lon
Örnek Servis Cevabı

JSON


  {
    "totalElements": 1,
    "totalPages": 1,
    "page": 0,
    "size": 1,
    "content": [
        {
            "shipmentAddress": {
                "id": 11111111,
                "firstName": "Trendyol",
                "lastName": "Customer",
                "company": "",
                "address1": "DSM Grup Danışmanlık İletişim ve Satış Ticaret A.Ş. Maslak Mahallesi Saat Sokak Spine Tower No:5 İç Kapı No:19 Sarıyer/İstanbul",
                "address2": "",
                "city": "İstanbul",
                "cityCode": 34,
                "district": "Sarıyer",
                "districtId": 54,
                "countyId": 0, // CEE bölgesi için gelecektir.
                "countyName": "", // CEE bölgesi için gelecektir.
                "shortAddress": "", // GULF bölgesi için gelecektir.
                "stateName": "", // GULF bölgesi için gelecektir.
                "addressLines": {
                    "addressLine1": "",
                    "addressLine2": ""
                },
                "postalCode": "34200",
                "countryCode": "TR",
                "neighborhoodId": 21111,
                "neighborhood": "Maslak Mahallesi",
                "phone": null,
                "fullAddress": "DSM Grup Danışmanlık İletişim ve Satış Ticaret A.Ş. Maslak Mahallesi Saat Sokak Spine Tower No:5 İç Kapı No:19 Sarıyer/İstanbul",
                "fullName": "Trendyol Customer"
            },
            "orderNumber": "10654411111",
            "packageGrossAmount": 498.90, // Paketin toplam brüt tutarı (indirimsiz)
            "packageSellerDiscount": 0.00, // Satıcı indirim tutarı
            "packageTyDiscount": 0.00, // commercial true olduğu durumda dolu gelebilir, false olduğu durumda 0 dönecektir.
            "packageTotalDiscount": 0.00, // Toplam indirim tutarı (packageSellerDiscount + packageTyDiscount)
            "discountDisplays": [
                {
                    "displayName": "Sepette %20 İndirim",
                    "discountAmount": 100
                }
            ],
            "taxNumber": null,
            "invoiceAddress": { // Trendyol Yurt Dışı Aracılığı siparişleri için "DSM Grup Danışmanlık" bilgileri dönecektir.
                "id": 11111112,
                "firstName": "Trendyol",
                "lastName": "Customer",
                "company": "", // GULF bölgesi siparişlerinde boş gelebilir.
                "address1": "DSM Grup Danışmanlık İletişim ve Satış Ticaret A.Ş. Maslak Mahallesi Saat Sokak Spine Tower No:5 İç Kapı No:19 Sarıyer/İstanbul",
                "address2": "",
                "city": "İstanbul",
                "cityCode": 0,
                "district": "Sarıyer", // GULF bölgesi siparişlerinde boş gelebilir.
                "districtId": 54,
                "countyId": 0, // CEE bölgesi için gelecektir.
                "countyName": "", // CEE bölgesi için gelecektir.
                "shortAddress": "", // GULF bölgesi için gelecektir.
                "stateName": "", // GULF bölgesi için gelecektir.
                "addressLines": {
                    "addressLine1": "",
                    "addressLine2": ""
                },
                "postalCode": "", // GULF bölgesi siparişlerinde boş gelebilir.
                "countryCode": "TR",
                "neighborhoodId": 0,
                "phone": null,
                "latitude": "11.111111",
                "longitude": "22.222222",
                "fullAddress": "DSM Grup Danışmanlık İletişim ve Satış Ticaret A.Ş. Maslak Mahallesi Saat Sokak Spine Tower No:5 İç Kapı No:19 Sarıyer/İstanbul",
                "fullName": "Trendyol Customer",
                "taxOffice": "Company of OMS's Tax Office", // Kurumsal fatura olmadığı durumda (commercial=false ise) body içerisinde dönmeyecektir.
                "taxNumber": "Company of OMS's Tax Number" // Kurumsal fatura olmadığı durumda (commercial=false ise) body içerisinde dönmeyecektir.
            },
            "customerFirstName": "Trendyol",
            "customerEmail": "pf+j1jm1x11@trendyolmail.com",
            "customerId": 1451111111,
            "supplierId": 2738,
            "customerLastName": "Customer",
            "shipmentPackageId": 3330111111, // Paket ID'si
            "cargoTrackingNumber": 7280027504111111,
            "cargoTrackingLink": "https://tracking.trendyol.com/?id=111111111-1111-1111-1111-11111111",
            "cargoSenderNumber": "210090111111",
            "cargoProviderName": "Trendyol Express",
            "lines": [
                {
                    "quantity": 1,
                    "salesCampaignId": 11,
                    "productSize": "Tek Ebat",
                    "stockCode": "111111", // Satıcı stok kodu
                    "productName": "Kuş ve Çiçek Desenli Tepsi - Yeşil / Altın Sarısı - 49 cm, 01SYM134, Tek Ebat",
                    "contentId": 1239111111,
                    "productOrigin": "TR",
                    "sellerId": 2738, // Satıcı ID'si
                    "lineGrossAmount": 498.90, // Ürünün birim brüt fiyatı (indirimsiz)
                    "lineTotalDiscount": 0.00, // Birim toplam indirim (lineSellerDiscount + lineTyDiscount)
                    "lineSellerDiscount": 0.00, // Birim satıcı indirimi (item'ların ortalaması)
                    "lineTyDiscount": 0.00, // Birim Trendyol indirimi (item'ların ortalaması)
                    "discountDetails": [ // Her bir adet (item) için ayrı indirim detayı
                        {
                            "lineItemPrice": 498.90, // İndirimli birim fiyat (lineGrossAmount - lineItemSellerDiscount - lineItemTyDiscount)
                            "lineItemSellerDiscount": 0.00, // Bu item'a uygulanan satıcı indirimi
                            "lineItemTyDiscount": 0.00 // Bu item'a uygulanan Trendyol indirimi
                        }
                    ],
                    "currencyCode": "TRY",
                    "productColor": "Yeşil",
                    "lineId": 4765111111, // Sipariş satır ID'si
                    "vatRate": 20.00, // KDV oranı
                    "barcode": "8683772071724",
                    "orderLineItemStatusName": "Delivered",
                    "lineUnitPrice": 498.90, // Net birim fiyat (lineGrossAmount - lineSellerDiscount - lineTyDiscount)
                    "fastDeliveryOptions": [],
                    "productCategoryId": 2710,
                    "commission": 13, // Komisyon oranı
                    "businessUnit": "Sports Shoes",
                    "cancelledBy": "", // İptal eden taraf
                    "cancelReason": "", // İptal nedeni
                    "cancelReasonCode": 0 // İptal neden kodu
                }
            ],
            "orderDate": 1762253333685,
            "identityNumber": "11111111111",
            "currencyCode": "TRY",
            "packageHistories": [
                {
                    "createdDate": 1762242537624,
                    "status": "Created"
                }
            ],
            "shipmentPackageStatus": "Delivered",
            "status": "Delivered",
            "whoPays": 1, // Eğer satıcı anlaşması ise 1 gelir, trendyol anlaşması ise alan gelmez
            "deliveryType": "normal",
            "timeSlotId": 0,
            "estimatedDeliveryStartDate": 1762858136000,
            "estimatedDeliveryEndDate": 1763030936000,
            "packageTotalPrice": 498.90, // Paketin toplam net fiyatı (indirimli)
            "deliveryAddressType": "Shipment",
            "agreedDeliveryDate": 1762376340000,
            "fastDelivery": false,
            "originShipmentDate": 1762242537619,
            "lastModifiedDate": 1762865408581,
            "commercial": false,
            "fastDeliveryType": "",
            "deliveredByService": false,
            "warehouseId": 372389,
            "invoiceLink": "https://efatura01.evidea.com/11111111111",
            "micro": true, // micro ihracat siparişleri için true olarak dönecektir.
            "giftBoxRequested": false,
            "3pByTrendyol": false,
            "etgbNo": "25341453EX025864", // micro true olduğunda etgbNo alanı için bilgi dönecektir.
            "etgbDate": 1762646400000, // micro true olduğunda etgbDate alanı için bilgi dönecektir.
            "containsDangerousProduct": false, // micro ihracat siparişlerinde satıcıya gelen siparişte paket içerisinde herhangi bir tehlikeli ürün varsa pil, parfüm vb. gibi, true dönecektir.
            "cargoDeci": 10,
            "isCod": false,
            "createdBy": "order-creation", // Paketin nasıl oluşturulduğunu gösterir, "order-creation", "split", "cancel" veya "transfer" olabilir
            "originPackageIds": null, // Bu alan iptal veya bölme işlemlerinden sonra doldurulur ve bu işlemlerden sonra ilk paketin packageid'sini verir.
            "hsCode": "711111000000", // Bu alan mikro siparişler için string olarak dönecektir.
            "shipmentNumber": 606404425,
            "is4P": true // Trendyol Yurt Dışı Aracılığı siparişleri için true olarak dönecektir.
        }
    ]
}

15 Haziran 2026 tarihinden itibaren servis cevabına aşağıdaki alanlar da eklenecektir (bu tarih, şu an taslaktır):

JSON

"invoiceNumber": "1255141" 
"invoiceStatus": "NotInvoiced" 
"invoiceRejectedReasonKeys: [
{	
"INVOICE_NUMBER_ALREADY_EXISTS",
"INVOICE_TOTAL_MISMATCH"    
}
]
"invoiceStatus" alanı değerleri açıklamaları:

invoiceStatus	Açıklama
NotInvoiced	Sipariş paketine ait faturanın beslenmediğini gösterir.
Received	Sipariş paketine ait fatura beslenmiştir ve kontrol aşamasındadır.
Rejected	Sipariş paketine ait fatura, kontroller sonucu hatalı bulunmuştur. Bu statüdeki sipariş paketleri için; Türkiye Pazaryerindeki bir sipariş ise hatalı faturanın sipariş üzerinden silinip, tekrar gönderilmesi gerekmektedir. Sipariş Mikro İhracat veya Trendyol Yurtdışı Aracılığı siparişi ise aynı sipariş paketine fatura silme isteği yapılmadan yeni bir fatura beslenmelidir.
Invoiced	Sipariş paketine ait fatura yapılan kontroller sonucu doğru bulunmuştur. Sipariş paketine ait "invoiceLink" alanı yalnızca bu statüye geçen sipariş paketinlerinde dolu olarak dönecektir. Bu statüye geçmeyen Mikro İhracat ve Trendyol Yurt Dışı Aracılığı sipariş paketleri için kargo etiketi entegrasyon servisimizden dönmeyecektir.

"invoiceRejectedReasonKeys" alanı değerleri açıklamaları:

invoiceRejectedReasonKeys	Açıklama
INVOICE_LINE_MISMATCH	Siparişinizde yer alan her bir ürün çeşidi için; ürün miktarı, birim fiyat ve KDV bilgileri uyuşan bir kalem bulunması gerekmektedir.
INVOICE_TOTAL_MISMATCH	Faturanızdaki dip toplam tutarın siparişteki toplam tutar ile eşleşmesi gerekmektedir.
INVOICE_LINE_NUMBER_MISMATCH	Faturanızdaki kalem sayısı ile siparişteki ürün çeşidi sayısı eşleşmelidir.
INVOICE_TYPE_MISMATCH	Faturanızdaki fatura tipi satış olmalıdır.
SENDER_VKN_MISMATCH	Faturanızdaki VKN bilginiz sistemdeki tanımlı VKN ile aynı olmalıdır.
RECEIPENT_VKN_MISMATCH	Faturanızdaki alıcı VKN bilgisi Trendyol VKN bilgisi olmalıdır.
INVOICE_NUMBER_MISMATCH	Faturanızdaki fatura numarası sipariş için beslediğiniz fatura numarası ile aynı olmalıdır.
INVOICE_DATE_MISMATCH	Faturanızdaki fatura tarihi sipariş tarihinden sonra olmalıdır.
INVOICE_SCENARIO_MISMATCH	Faturanızdaki fatura senaryosu temel veya ticari olmalıdır.
INVOICE_NOT_FOUND_IN_MAILBOX	Fatura Trendyol gelen kutusunda bulunamamaktadır. Yeni bir fatura iletmeniz beklenmektedir.
INVOICE_NUMBER_ALREADY_EXISTS	Daha önce gönderilen bir "invoiceNumber" farklı bir sipariş paketi için tekrar gönderilmektedir. Fatura numarasının değiştirilmesi gerekmektedir.

Paket Statüleri

Statü	Açıklama
orderDate	Müşterinin trendyol.com üzerinde siparişi oluşturduğu zaman dönmektedir.
Awaiting	Müşterinin trendyol.com üzerinde siparişi oluşturduktan sonra ödeme onayından bekleyen siparişler için bu statü dönmektedir. (Bu statüdeki siparişler "Created" statüsüne geçene kadar herhangi bir işlem yapmamanız gerekmektedir. Sadece stok güncellemeleri için bu statüyü kullanabilirsiniz.)
Created	Sipariş gönderime hazır statüsünde olduğu zaman dönmektedir.
Picking	Sizin tarafınızdan iletilebilecek bir statüdür. Siparişi toplamaya başladığınız zaman veya paketi hazırlamaya başladığınız zaman iletebilirsiniz.
Invoiced	Siparişin faturasını kestiğiniz zaman bize iletebileceğiniz statüdür.
Shipped	Taşıma durumuna geçen siparişler bu statüde belirtilmektedir.
AtCollectionPoint	Ürün ilgili PUDO teslimat noktasındadır. Müşterinin PUDO noktasına giderek teslim alması beklenmektedir.
Cancelled	İptal edilen siparişlerdir. Unsupplied siparişleri de kapsar.
UnPacked	Paketi bölünmüş olan siparişlerdir.
Delivered	Teslim edilen siparişlerdir. Bu statüden sonra herhangi bir statü değişikliği yapılamaz.
UnDelivered	Sipariş müşteriye ulaştırılamadığı zaman dönen bilgisidir.
Returned	Müşteriye ulaşmayan siparişin tedarikçiye geri döndüğü bilgisidir. Bu statüden sonra herhangi bir statü değişikliği yapılamaz
Mikro ihracat siparişleri için ülke kodu bilgileri

Ülke	Ülke Kodu
Suudi Arabistan	SA
Birleşik Arap Emirlikleri	AE
Katar	QA
Kuveyt	KW
Umman	OM
Bahreyn	BH
Azerbaycan	AZ
Slovakya	SK
Romanya	RO
Çekya	CZ


Sipariş Paketlerini Akış ile Çekme (getShipmentPackagesStream)
getShipmentPackagesStream, sipariş paketlerini cursor tabanlı (stream) olarak çekmenizi sağlayan endpoint'tir.

⚠️
ÖNEMLİ
Mevcut getShipmentPackages endpoint’i büyük veri setlerini tarama (scanning) amacıyla optimize edilmemiştir.

Bu endpoint için:

Maksimum erişilebilir kayıt sayısı: 10.000
Yüksek hacimli veri çekimlerinde sistem üzerinde yük oluşabilir
Rate limit kısıtlarına daha hızlı takılınabilir
Bu nedenle aşağıdaki senaryolarda getShipmentPackagesStream kullanılması önerilir:

✔ Büyük veri tarama (full scan) ✔ Periyodik senkronizasyon (polling / cron) ✔ Tüm siparişleri export etme

✅ Response yapısı aynıdır, sadece pagination ile ilgili alanlar dönmeyecektir. (totalElements, totalPages, page) ❗ Pagination mekanizması değişmiştir (cursor tabanlı)

📦 Veri Kapsamı & Tarih Kısıtları
Bu endpoint üzerinden son 3 aylık veri erişilebilir
❗ Zaman aralığı maksimum 2 hafta (14 gün) ile sınırlandırılmıştır:

lastModifiedStartDate ve lastModifiedEndDate gönderilmezse → sistem otomatik olarak son 2 hafta ile sınırlar.
❗ Response Farkı
getShipmentPackagesStream endpoint’inin response yapısı mevcut endpoint ile aynıdır; sadece aşağıdaki alanlar artık dönmemektedir:

totalElements
totalPages
page
Bunun yerine aşağıdaki alanlar kullanılır:

hasMore
nextCursor
size
Bu nedenle page tabanlı pagination kullanan entegrasyonların, cursor tabanlı yapıya geçmesi gerekmektedir.

💡
Migration Notu
page++ yerine → nextCursor kullanılır
totalPages kontrolü yerine → hasMore kontrol edilir
Stream Servisi vs. Mevcut Servis
Özellik	Mevcut Servis (getShipmentPackages)	Stream Servisi (getShipmentPackagesStream)
Kullanım Amacı	Küçük / anlık sorgular	Büyük veri tarama & senkronizasyon
Pagination	Page tabanlı (page, totalPages)	Cursor tabanlı (nextCursor, hasMore)
Maksimum Veri Erişimi	⚠️ 10.000 kayıt ile sınırlı	✅ Yüksek limitli akış
Büyük Veri Performansı	⚠️ Sınırlı	✅ Optimize
Cursor Tabanlı Sayfalama Nasıl Çalışır?
Cursor mekanizması, klasik page mantığından farklıdır:

page yerine akış pointer’ı (cursor) kullanılır
Her istek, bir önceki kaldığı yerden devam eder
Büyük veri setlerinde stabil ve verimli ilerleme sağlar
Akış
İlk istekte nextCursor gönderilmez
Yanıtta hasMore = true ise devam edilir
nextCursordeğeri alınır ve sonraki istekte kullanılır
hasMore = false olduğunda akış tamamlanır
⚠️ Kritik Kurallar
nextCursor opaque bir değerdir → parse edilmemelidir, değiştirilmemelidir.
Aynı cursor değeri kullanırken daha önce başlatılan filtreler değiştirilmemelidir
Filtre değişirse → 400 Bad Request alınır
Sıralama sabittir, Last Modified Date'e göre DESC olarak sonuç döner
Yeni filtre ile çalışmak için → yeni akış başlatılmalıdır

Önerilen kullanım:
Önerilen kullanımminimum 5 saniye aralıklarda istek atılmasıdır.
Endpoint
PROD
JSON

GET https://apigw.trendyol.com/integration/order/sellers/{sellerId}/orders/stream
STAGE
JSON

GET https://stageapigw.trendyol.com/integration/order/sellers/{sellerId}/orders/stream

Örnek Servis Cevabı

JSON


{
    "hasMore": true,
    "nextCursor": "609ca79b-1fdf-4c4e-a814-498ce9c1c039",
    "size": 50,
    "content": [
        {
            "shipmentAddress": {
                "id": 11111111,
                "firstName": "Trendyol",
                "lastName": "Customer",
                "company": "",
                "address1": "DSM Grup Danışmanlık İletişim ve Satış Ticaret A.Ş. Maslak Mahallesi Saat Sokak Spine Tower No:5 İç Kapı No:19 Sarıyer/İstanbul",
                "address2": "",
                "city": "İstanbul",
                "cityCode": 34,
                "district": "Sarıyer",
                "districtId": 54,
                "countyId": 0, // CEE bölgesi için gelecektir.
                "countyName": "", // CEE bölgesi için gelecektir.
                "shortAddress": "", // GULF bölgesi için gelecektir.
                "stateName": "", // GULF bölgesi için gelecektir.
                "addressLines": {
                    "addressLine1": "",
                    "addressLine2": ""
                },
                "postalCode": "34200",
                "countryCode": "TR",
                "neighborhoodId": 21111,
                "neighborhood": "Maslak Mahallesi",
                "phone": null,
                "fullAddress": "DSM Grup Danışmanlık İletişim ve Satış Ticaret A.Ş. Maslak Mahallesi Saat Sokak Spine Tower No:5 İç Kapı No:19 Sarıyer/İstanbul",
                "fullName": "Trendyol Customer"
            },
            "orderNumber": "10654411111",
            "packageGrossAmount": 498.90, // Paketin toplam brüt tutarı (indirimsiz)
            "packageSellerDiscount": 0.00, // Satıcı indirim tutarı
            "packageTyDiscount": 0.00, // commercial true olduğu durumda dolu gelebilir, false olduğu durumda 0 dönecektir.
            "packageTotalDiscount": 0.00, // Toplam indirim tutarı (packageSellerDiscount + packageTyDiscount)
            "discountDisplays": [
                {
                    "displayName": "Sepette %20 İndirim",
                    "discountAmount": 100
                }
            ],
            "taxNumber": null,
            "invoiceAddress": { // Trendyol Yurt Dışı Aracılığı siparişleri için "DSM Grup Danışmanlık" bilgileri dönecektir.
                "id": 11111112,
                "firstName": "Trendyol",
                "lastName": "Customer",
                "company": "", // GULF bölgesi siparişlerinde boş gelebilir.
                "address1": "DSM Grup Danışmanlık İletişim ve Satış Ticaret A.Ş. Maslak Mahallesi Saat Sokak Spine Tower No:5 İç Kapı No:19 Sarıyer/İstanbul",
                "address2": "",
                "city": "İstanbul",
                "cityCode": 0,
                "district": "Sarıyer", // GULF bölgesi siparişlerinde boş gelebilir.
                "districtId": 54,
                "countyId": 0, // CEE bölgesi için gelecektir.
                "countyName": "", // CEE bölgesi için gelecektir.
                "shortAddress": "", // GULF bölgesi için gelecektir.
                "stateName": "", // GULF bölgesi için gelecektir.
                "addressLines": {
                    "addressLine1": "",
                    "addressLine2": ""
                },
                "postalCode": "", // GULF bölgesi siparişlerinde boş gelebilir.
                "countryCode": "TR",
                "neighborhoodId": 0,
                "phone": null,
                "latitude": "11.111111",
                "longitude": "22.222222",
                "fullAddress": "DSM Grup Danışmanlık İletişim ve Satış Ticaret A.Ş. Maslak Mahallesi Saat Sokak Spine Tower No:5 İç Kapı No:19 Sarıyer/İstanbul",
                "fullName": "Trendyol Customer",
                "taxOffice": "Company of OMS's Tax Office", // Kurumsal fatura olmadığı durumda (commercial=false ise) body içerisinde dönmeyecektir.
                "taxNumber": "Company of OMS's Tax Number" // Kurumsal fatura olmadığı durumda (commercial=false ise) body içerisinde dönmeyecektir.
            },
            "customerFirstName": "Trendyol",
            "customerEmail": "pf+j1jm1x11@trendyolmail.com",
            "customerId": 1451111111,
            "supplierId": 2738,
            "customerLastName": "Customer",
            "shipmentPackageId": 3330111111, // Paket ID'si
            "cargoTrackingNumber": 7280027504111111,
            "cargoTrackingLink": "https://tracking.trendyol.com/?id=111111111-1111-1111-1111-11111111",
            "cargoSenderNumber": "210090111111",
            "cargoProviderName": "Trendyol Express",
            "lines": [
                {
                    "quantity": 1,
                    "salesCampaignId": 11,
                    "productSize": "Tek Ebat",
                    "stockCode": "111111", // Satıcı stok kodu
                    "productName": "Kuş ve Çiçek Desenli Tepsi - Yeşil / Altın Sarısı - 49 cm, 01SYM134, Tek Ebat",
                    "contentId": 1239111111,
                    "productOrigin": "TR",
                    "sellerId": 2738, // Satıcı ID'si
                    "lineGrossAmount": 498.90, // Ürünün birim brüt fiyatı (indirimsiz)
                    "lineTotalDiscount": 0.00, // Birim toplam indirim (lineSellerDiscount + lineTyDiscount)
                    "lineSellerDiscount": 0.00, // Birim satıcı indirimi (item'ların ortalaması)
                    "lineTyDiscount": 0.00, // Birim Trendyol indirimi (item'ların ortalaması)
                    "discountDetails": [ // Her bir adet (item) için ayrı indirim detayı
                        {
                            "lineItemPrice": 498.90, // İndirimli birim fiyat (lineGrossAmount - lineItemSellerDiscount - lineItemTyDiscount)
                            "lineItemSellerDiscount": 0.00, // Bu item'a uygulanan satıcı indirimi
                            "lineItemTyDiscount": 0.00 // Bu item'a uygulanan Trendyol indirimi
                        }
                    ],
                    "currencyCode": "TRY",
                    "productColor": "Yeşil",
                    "lineId": 4765111111, // Sipariş satır ID'si
                    "vatRate": 20.00, // KDV oranı
                    "barcode": "8683772071724",
                    "orderLineItemStatusName": "Delivered",
                    "lineUnitPrice": 498.90, // Net birim fiyat (lineGrossAmount - lineSellerDiscount - lineTyDiscount)
                    "fastDeliveryOptions": [],
                    "productCategoryId": 2710,
                    "commission": 13, // Komisyon oranı
                    "businessUnit": "Sports Shoes",
                    "cancelledBy": "", // İptal eden taraf
                    "cancelReason": "", // İptal nedeni
                    "cancelReasonCode": 0 // İptal neden kodu
                }
            ],
            "orderDate": 1762253333685,
            "identityNumber": "11111111111",
            "currencyCode": "TRY",
            "packageHistories": [
                {
                    "createdDate": 1762242537624,
                    "status": "Created"
                }
            ],
            "shipmentPackageStatus": "Delivered",
            "status": "Delivered",
            "whoPays": 1, // Eğer satıcı anlaşması ise 1 gelir, trendyol anlaşması ise alan gelmez
            "deliveryType": "normal",
            "timeSlotId": 0,
            "estimatedDeliveryStartDate": 1762858136000,
            "estimatedDeliveryEndDate": 1763030936000,
            "packageTotalPrice": 498.90, // Paketin toplam net fiyatı (indirimli)
            "deliveryAddressType": "Shipment",
            "agreedDeliveryDate": 1762376340000,
            "fastDelivery": false,
            "originShipmentDate": 1762242537619,
            "lastModifiedDate": 1762865408581,
            "commercial": false,
            "fastDeliveryType": "",
            "deliveredByService": false,
            "warehouseId": 372389,
            "invoiceLink": "https://efatura01.evidea.com/11111111111",
            "micro": true, // micro ihracat siparişleri için true olarak dönecektir.
            "giftBoxRequested": false,
            "3pByTrendyol": false,
            "etgbNo": "25341453EX025864", // micro true olduğunda etgbNo alanı için bilgi dönecektir.
            "etgbDate": 1762646400000, // micro true olduğunda etgbDate alanı için bilgi dönecektir.
            "containsDangerousProduct": false, // micro ihracat siparişlerinde satıcıya gelen siparişte paket içerisinde herhangi bir tehlikeli ürün varsa pil, parfüm vb. gibi, true dönecektir.
            "cargoDeci": 10,
            "isCod": false,
            "createdBy": "order-creation", // Paketin nasıl oluşturulduğunu gösterir, "order-creation", "split", "cancel" veya "transfer" olabilir
            "originPackageIds": null, // Bu alan iptal veya bölme işlemlerinden sonra doldurulur ve bu işlemlerden sonra ilk paketin packageid'sini verir.
            "hsCode": "711111000000", // Bu alan mikro siparişler için string olarak dönecektir.
            "shipmentNumber": 606404425,
            "is4P": true // Trendyol Yurt Dışı Aracılığı siparişleri için true olarak dönecektir.
        }
    ]
}
 
   

15 Haziran 2026 tarihinden itibaren servis cevabına aşağıdaki alanlar da eklenecektir (bu tarih, şu an taslaktır):

JSON

 					  "invoiceNumber": "1255141" 
            "invoiceStatus": "NotInvoiced" 
						"invoiceRejectedReasonKeys: [
								{	
									"INVOICE_NUMBER_ALREADY_EXISTS",
                  "NVOICE_TOTAL_MISMATCH"    
								}
              ]
"invoiceStatus" alanı değerleri açıklamaları:

invoiceStatus	Açıklama
NotInvoiced	Sipariş paketine ait faturanın beslenmediğini gösterir.
Received	Sipariş paketine ait fatura beslenmiştir ve kontrol aşamasındadır.
Rejected	Sipariş paketine ait fatura, kontroller sonucu hatalı bulunmuştur. Bu statüdeki sipariş paketleri için; Türkiye Pazaryerindeki bir sipariş ise hatalı faturanın sipariş üzerinden silinip, tekrar gönderilmesi gerekmektedir. Sipariş Mikro İhracat veya Trendyol Yurtdışı Aracılığı siparişi ise aynı sipariş paketine fatura silme isteği yapılmadan yeni bir fatura beslenmelidir.
Invoiced	Sipariş paketine ait fatura yapılan kontroller sonucu doğru bulunmuştur. Sipariş paketine ait "invoiceLink" alanı yalnızca bu statüye geçen sipariş paketinlerinde dolu olarak dönecektir. Bu statüye geçmeyen Mikro İhracat ve Trendyol Yurt Dışı Aracılığı sipariş paketleri için kargo etiketi entegrasyon servisimizden dönmeyecektir.
"invoiceRejectedReasonKeys" alanı değerleri açıklamaları:

invoiceRejectedReasonKeys	Açıklama
INVOICE_LINE_MISMATCH	Siparişinizde yer alan her bir ürün çeşidi için; ürün miktarı, birim fiyat ve KDV bilgileri uyuşan bir kalem bulunması gerekmektedir.
INVOICE_TOTAL_MISMATCH	Faturanızdaki dip toplam tutarın siparişteki toplam tutar ile eşleşmesi gerekmektedir.
INVOICE_LINE_NUMBER_MISMATCH	Faturanızdaki kalem sayısı ile siparişteki ürün çeşidi sayısı eşleşmelidir.
INVOICE_TYPE_MISMATCH	Faturanızdaki fatura tipi satış olmalıdır.
SENDER_VKN_MISMATCH	Faturanızdaki VKN bilginiz sistemdeki tanımlı VKN ile aynı olmalıdır.
RECEIPENT_VKN_MISMATCH	Faturanızdaki alıcı VKN bilgisi Trendyol VKN bilgisi olmalıdır.
INVOICE_NUMBER_MISMATCH	Faturanızdaki fatura numarası sipariş için beslediğiniz fatura numarası ile aynı olmalıdır.
INVOICE_DATE_MISMATCH	Faturanızdaki fatura tarihi sipariş tarihinden sonra olmalıdır.
INVOICE_SCENARIO_MISMATCH	Faturanızdaki fatura senaryosu temel veya ticari olmalıdır.
INVOICE_NOT_FOUND_IN_MAILBOX	Fatura Trendyol gelen kutusunda bulunamamaktadır. Yeni bir fatura iletmeniz beklenmektedir.
INVOICE_NUMBER_ALREADY_EXISTS	Daha önce gönderilen bir "invoiceNumber" farklı bir sipariş paketi için tekrar gönderilmektedir. Fatura numarasının değiştirilmesi gerekmektedir.

Ürün Filtreleme - Temel Bilgiler v2
Bu servis ile Trendyol mağazanızdaki ürününüzün durumunu listeleyebilirsiniz.

GET filterProducts
PROD
https://apigw.trendyol.com/integration/product/sellers/{sellerId}/product/{barcode}

STAGE
https://stageapigw.trendyol.com/integration/product/sellers/{sellerId}/product/{barcode}

Örnek Servis Cevabı

JSON

{
    "barcode": "smoketest-250049",
    "approved": true,
    "approvedDate": 1763622556000,
    "archived": false,
    "listingId": "a089a30ed1632032913b28099e49d948",
    "contentId": 9511264
}

Ürün Filtreleme - Onaysız Ürün v2
Bu servis ile Trendyol mağazanızdaki onaysız (draft) ürünlerinizi listeleyebilirsiniz.

Bu servis ile ürün onay süreci devam eden ve kontrol sonrası reddedilen ürünlerinizi listeleyebilirsiniz. Reddedilen ürün için reddetme sebebini kontrol edip, gerekli güncellemeleri yapmanız halinde, ürününüz tekrar onay sürecine girecektir.
Bu servise yapılan isteklere "nextPageToken" bilgisi eklenmiştir. Yapmış olduğunuz istekte request?page=10&size=1000 yazmanız halinde 10. sayfadaki 1000 ürün response olarak döner Sonraki isteğinizde request?size=1000&nextPageToken=TOKEN yazmanız halinde sonraki sayfa olan 11. sayfadaki 1000 ürün response olarak döner (nextPageToken isteği 10.000'den fazla onaysız barcode olması halinde kullanılabilir.)
Page x size maksimum 10.000 değerini alabilir.
GET filterProducts
PROD
https://apigw.trendyol.com/integration/product/sellers/{sellerId}/products/unapproved

STAGE
https://stageapigw.trendyol.com/integration/product/sellers/{sellerId}/products/unapproved

Giriş Parametreleri

Parametre

Açıklama

Tip

barcode

Tekil barkod sorgulamak için gönderilmelidir

string

startDate

Belirli bir tarihten sonraki ürünleri getirir. Timestamp olarak gönderilmelidir.

long

endDate

Belirli bir tarihten sonraki önceki getirir. Timestamp olarak gönderilmelidir.

long

page

Sadece belirtilen sayfadaki bilgileri döndürür.

int

dateQueryType

Tarih filtresinin çalışacağı tarih CREATED_DATE ya da LAST_MODIFIED_DATE gönderilebilir

CREATED_DATE: ürünün yaratılma tarihi. Response body'deki "createDateTime"e denk gelmektedir.
LAST_MODIFIED_DATE: satıcının ürün üzerinde yaptığı son güncellemenin tarihi. Response body'deki "lastUpdateDate"e denk gelmektedir.
string

size

Bir sayfada listelenecek maksimum adeti belirtir. Maksimum 1000 değerini alabilir

int

supplierId

İlgili tedarikçinin ID bilgisi gönderilmelidir

long

stockCode

İlgili tedarikçinin stock code bilgisi gönderilmelidir

string

productMainId

İlgili tedarikçinin productMainId bilgisi gönderilmelidir

string

origin

Ürünün menşei bilgisi

string

brandIds

Belirtilen brandId'ye sahip ürünleri listelemek için kullanılmalıdır.

array

status

Status alanı rejected ve pendingApproval değerlerini alabilir

string

nextPageToken

10.000 adet ürün'den sonraki ürünleri almak için kullanılmalıdır

string

Örnek Servis Cevabı

JSON

{
"totalElements": 1,
"totalPages": 1,
"page": 0,
"size": 1,
"nextPageToken": "eyJzb3J0IjpbMTI3MTU4MTVdfQ==",
"content": [
    {
        "supplierId": 2748,
        "productMainId": "smoketest-114333a11",
        "status": "rejected"/"pendingApproval",
        "createDateTime": 1763964757705,
        "lastUpdateDate": 1764059908901,
        "lastPriceChangeDate": 1763964757656,
        "lastStockChangeDate": 1763964757656,
        "brand": {
            "id": 317259,
            "name": "Trendyol Üyelik"
        },
        "category": {
            "id": 129332,
            "name": "Üyelik Servisi"
        },
        "barcode": "smoketest-114333a11",
        "title": "Test Product",
        "description": "Test Product Description",
        "quantity": 1,
        "listPrice": 25000,
        "salePrice": 20000,
        "vatRate": 20,
        "dimensionalWeight": null,
        "stockCode": "TEST-STOCK",
        "origin": "AD",
        "media": [
            {
                "url": "https://marketplace-supplier-media-center.oss-eu-central-1.aliyuncs.com/prod/431929/3bda8d78-00e8-4bbf-abb7-f7a13297d2f3/A_TABLO1148.jpg?x-oss-process=style/resized"
            }
        ],
        "attributes": [
            {
                "attributeId": 293,
                "attributeName": "Beden",
                "attributeValueId": 410928,
                "attributeValue": "tttt"
            },
            {
                "attributeId": 294,
                "attributeName": "Yaş Grubu",
                "attributeValueId": 2879,
                "attributeValue": "Yetişkin"
            },
            {
                "attributeId": 7,
                "attributeName": "Ekartman",
                "attributeValueId": 603,
                "attributeValue": "Çocuk"
            },
            {
                "attributeId": 296,
                "attributeName": "Cinsiyet",
                "attributeValueId": 2875,
                "attributeValue": "Unisex"
            },
            {
                "attributeId": 47,
                "attributeName": "Renk",
                "attributeValue": "Sarı"
            },
            {
                "attributeId": 295,
                "attributeName": "Web Color",
                "attributeValueId": 2899,
                "attributeValue": "Haki"
            }
        ],
        "rejectReasonDetails": [
            {
                "rejectReason": "Sakıncalı Görsel Değişt",
                "rejectReasonDetail": "Ürün görselleriniz  platform kurallarımız uyarınca sakıncalı olarak kabul edilen görselleri içermektedir. Ürün görselleri ile kelepçe, bağlama ipleri vb. ürünlerin canlı mankenler üzerinde gösterimi, cinsel oyuncak kullanımının gösterimi, cinsel pozisyonun veya cinsel organların gösterimi ve çocuk manken üzerinde iç çamaşırı/plaj giyimi sunumu platform kurallarımız uyarınca yasaktır. Lütfen ürün görsellerinizi platform kurallarımıza uygun hale getirecek şekilde değiştiriniz. https://akademi.trendyol.com/ELearning?TrainingId=23555 Değişti"
            },
            {
                "rejectReason": "Zorunlu Ürün Özellik Değeri Eksik/Yanlış",
                "rejectReasonDetail": "Zorunlu özellik değeri hatalı ya da eksiktir. Lütfen zorunlu özellik bilgilerinizi doldurun ya da değiştiriniz."
            },
            {
                "rejectReason": "Hatalı Marka Bilgisi",
                "rejectReasonDetail": "Ürün markasındaki, ismindeki, görselindeki, barkodundaki ve/veya açıklamasındaki marka ile ürünün asıl markası uyuşmamaktadır. Lütfen ürünün markasını ve ürün listeleme kurallarına/içerik kalitesine uygunluğunu kontrol ediniz."
            },
            {
                "rejectReason": "Satış Kurallarına Aykırı Ürün",
                "rejectReasonDetail": "Bu ürün Trendyol Platformu satış kurallarıyla uyumlu değildir. Kuralları görmek için tıklayınız. https://tymp.mncdn.com/prod/documents/engagement/yasal_surecler/satisa_uygun_olmayan_urunler.pdf"
            }
        ],
        "locationBasedDelivery": "DISABLED",
        "lotNumber": "PartiNo:011220,SeriNo:M00A59153,SKT:12/12/2012,LotNo:0301A79"
    }
]
}

Ürün Filtreleme - Onaylı Ürün v2
Bu servis ile Trendyol mağazanızdaki onaylı ürünlerinizi listeleyebilirsiniz.

Bu servise yapılan isteklere "nextPageToken" bilgisi eklenmiştir. Yapmış olduğunuz istekte request?page=10&size=100 yazmanız halinde 10. sayfadaki 100 content response olarak döner Sonraki isteğinizde request?size=100&nextPageToken=TOKEN yazmanız halinde sonraki sayfa olan 11. sayfadaki 100 content response olarak döner (nextPageToken isteği 10.000'den fazla onaylı content olması halinde kullanılabilir.)
Page x size maksimum 10.000 değerini alabilir.
GET filterProducts
PROD
https://apigw.trendyol.com/integration/product/sellers/{sellerId}/products/approved

STAGE
https://stageapigw.trendyol.com/integration/product/sellers/{sellerId}/products/approved

Giriş Parametreleri

Parametre

Açıklama

Tip

barcode

Tekil barkod sorgulamak için gönderilmelidir

string

startDate

Belirli bir tarihten sonraki ürünleri getirir. Timestamp olarak gönderilmelidir.

long

endDate

Belirli bir tarihten sonraki önceki getirir. Timestamp olarak gönderilmelidir.

long

page

Sadece belirtilen sayfadaki bilgileri döndürür.

int

dateQueryType

Tarih filtresinin çalışacağı tarih VARIANT_CREATED_DATE, VARIANT_MODIFIED_DATE, CONTENT_MODIFIED_DATE olarak gönderilebilir.

VARIANT_CREATED_DATE: Satıcının kendi barkoduyla ürünü açtığı tarih. Response body'deki "sellerCreatedDate"e denk gelmektedir.
VARIANT_MODIFIED_DATE: Barkodun satıcı tarafından en son güncellendiği tarih. Response body'deki "sellerModifiedDate"e denk gelmektedir.
CONTENT_MODIFIED_DATE: Content üzerine yapılan en son değişikliğin tarihi. Response body'deki "lastModifiedDate"e denk gelmektedir.
string

size

Bir sayfada listelenecek maksimum adeti belirtir. Maksimum 100 değerini alabilir.

int

supplierId

İlgili tedarikçinin ID bilgisi gönderilmelidir

long

stockCode

İlgili tedarikçinin stock code bilgisi gönderilmelidir

string

origin

Ürün menşei değerleri

string

productMainId

İlgili tedarikçinin productMainId bilgisi gönderilmelidir

string

brandIds

Belirtilen brandId'ye sahip ürünleri listelemek için kullanılmalıdır.

array

status

Status alanı archived, blacklisted, locked, onSale, notOnSale değerlerini alabilir

string

nextPageToken

10.000 adet content'den sonraki contentleri almak için kullanılmalıdır

string

contentId

Tekil contentId sorgulamak için gönderilmelidir

string

orderByDirection

"SellerCreatedDate" alanına göre ASC/DESC olarak gönderilebilir.
ASC: Eskiden yeniye doğru sıralar.
DESC: Yeniden eskiye doğru sıralar.

string

Örnek Servis Cevabı

JSON

{
"totalElements": 1,
"totalPages": 1,
"page": 0,
"size": 20,
"nextPageToken": "eyJzb3J0IjpbMTI3MTU4MTVdfQ==",
"content": [
    {
        "contentId": 12715815,
        "productMainId": "12613876842A60",
        "brand": {
            "id": 315675,
            "name": "GUEYA"
        },
        "category": {
            "id": 91266,
            "name": "DOKUNMAYIN Attribute Attribute"
        },
        "creationDate": 1760531038063,
        "lastModifiedDate": 1760938781669,
        "lastModifiedBy": "anilcan.gul@trendyol.com",
        "title": "Açık Gri T-",
        "description": "değişti değişti2",
        "images": [
            {
                "url": "/mediacenter-stage3/stage/QC_PREP/20250731/11/f63d6503-ab94-3567-adbc-8f26a5cdaac6/1.jpg"
            }
        ],
        "attributes": [
            {
                "attributeId": 47,
                "attributeName": "Renk",
                "attributeValue": "Black"
            },
            {
                "attributeId": 295,
                "attributeName": "Web Color",
                "attributeValueId": 2886,
                "attributeValue": "Kırmızı"
            },
            {
                "attributeId": 294,
                "attributeName": "Yaş Grubu",
                "attributeValueId": 2879,
                "attributeValue": "Yetişkin"
            },
            {
                "attributeId": 296,
                "attributeName": "Cinsiyet",
                "attributeValueId": 2873,
                "attributeValue": "Erkek"
            }
        ],
        "variants": [
            {
                "variantId": 70228905,
                "supplierId": 2748,
                "barcode": "12613876842A60",
                "commission": 7.83,
                "attributes": [
                    {
                        "attributeId": 293,
                        "attributeName": "Beden",
                        "attributeValueId": 4602,
                        "attributeValue": "77 x 200 cm"
                    }
                ],
                "productUrl": "https://stage.trendyol.com/abc/xyz-p-12715815?&merchantId=2748&filterOverPriceListings=false",
                "onSale": false,
                "deliveryOptions": {
                    "deliveryDuration": 1,
                    "isRushDelivery": true,
                    "fastDeliveryOptions": [
                        {
                            "deliveryOptionType": "SAME_DAY_SHIPPING",
                            "deliveryDailyCutOffHour": "15:00"
                        }
                    ]
                },
                "stock": {
                    "quantity": 0,
                    "lastModifiedDate": 1774948958844
                },
                "price": {
                    "salePrice": 222,
                    "listPrice": 222
                },
                "stockCode": "STK-stokum-1",
                "origin": "AD",
                "vatRate": 0,
                "sellerCreatedDate": 1760534152000,
                "sellerModifiedDate": 1761041127000,
                "locked": false,
                "lockReason": null,
                "lockDate": null,
                "archived": false,
                "archivedDate": null,
                "docNeeded": false,
                "hasViolation": false,
                "blacklisted": false
            },
            {
                "variantId": 70229505,
                "supplierId": 2748,
                "barcode": "12613876842A61",
                "commission": 7.83,
                "attributes": [
                    {
                        "attributeId": 293,
                        "attributeName": "Beden",
                        "attributeValueId": 4603,
                        "attributeValue": "77 x 300 cm"
                    }
                ],
                "productUrl": "https://stage.trendyol.com/abc/xyz-p-12715815?&merchantId=2748&filterOverPriceListings=false",
                "onSale": false,
                "deliveryOptions": {
                    "deliveryDuration": 1,
                    "isRushDelivery": true,
                    "fastDeliveryOptions": [
                        {
                            "deliveryOptionType": "SAME_DAY_SHIPPING",
                            "deliveryDailyCutOffHour": "15:00"
                        }
                    ]
                },
                "stock": {
                    "lastModifiedDate": null
                },
                "price": {
                    "salePrice": 222,
                    "listPrice": 222
                },
                "stockCode": "STK-stokum-1",
                "vatRate": 0,
                "sellerCreatedDate": 1760534320000,
                "sellerModifiedDate": 1761041127000,
                "locked": false,
                "lockReason": null,
                "lockDate": null,
                "archived": false,
                "archivedDate": null,
                "docNeeded": false,
                "hasViolation": false,
                "blacklisted": false
            }
        ]
    }
]
}

