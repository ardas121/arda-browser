# Arda Browser'ı GitHub'da yayınlama

## 1. Dosyaları GitHub'a gönder

Bu klasörün tamamını (ancak `node_modules` ve `dist` hariç) GitHub deposuna yükle.

## 2. Tanıtım sitesini aç

Depoda **Settings > Pages > Build and deployment > Source** alanından
**GitHub Actions** seç. Site şu temiz adreste açılır:

`https://KULLANICI-ADIN.github.io/DEPO-ADIN/`

Ziyaretçiler bilgisayarındaki dizinleri veya dosya yollarını göremez. Adreste
`index.html` da görünmez.

## 3. İndirilebilir Windows sürümü yayınla

Bilgisayarında depo klasöründe şunları çalıştır:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions, `Arda-Browser-Setup.exe` dosyasını otomatik oluşturup Releases
sayfasına koyar.

Doğrudan indirme bağlantısı şu biçimde olur:

`https://github.com/KULLANICI-ADIN/DEPO-ADIN/releases/latest/download/Arda-Browser-Setup.exe`

Bu bağlantıya basılınca `index.html` açılmaz; doğrudan kurulum dosyası indirilir.

## İkon

`icon.ico`; uygulama penceresi, görev çubuğu, kurulum programı, kaldırıcı,
Başlat menüsü ve masaüstü kısayolu için ayarlanmıştır.
