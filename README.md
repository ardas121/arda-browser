# Arda Browser

**Arda Browser**, hızlı ve sade bir internet deneyimi sunmak için Electron ve
Chromium üzerine geliştirilmiş ücretsiz bir Windows tarayıcısıdır.

[⬇️ Arda Browser'ı indir](../../releases/latest/download/Arda-Browser-Setup.exe)

## Özellikler

- 🗂️ Çoklu sekme desteği
- 🔎 Adres çubuğundan arama yapma
- 🛡️ Yerleşik reklam ve izleyici engelleyici
- 🕶️ Ayrı oturum kullanan gizli sekmeler
- ⭐ Yer imleri ve yer imi çubuğu
- 🕘 Geçmişi görüntüleme ve temizleme
- ⬇️ İndirilen dosyaları takip etme
- 🔍 Sayfa içinde arama (`Ctrl+F`)
- ⚙️ Arama motoru ve Shields ayarları
- ⌨️ Kullanışlı klavye kısayolları

## Klavye kısayolları

| İşlem | Kısayol |
|---|---|
| Yeni sekme | `Ctrl+T` |
| Sekmeyi kapat | `Ctrl+W` |
| Adres çubuğuna git | `Ctrl+L` |
| Sayfayı yenile | `Ctrl+R` |
| Gizli sekme aç | `Ctrl+Shift+N` |
| Sayfada bul | `Ctrl+F` |

## Tanıtım görselleri

| Gerçek Arda Browser arayüzü | Gizlilik ve koruma |
|---|---|
| ![Arda Browser gerçek ekran](docs/assets/arda-browser-gercek-ekran.jpg) | ![Arda Browser gizlilik](docs/assets/arda-browser-gizlilik.jpg) |

![Arda Browser masaüstü tanıtımı](docs/assets/arda-browser-masaustu.jpg)

## Tanıtım videoları

[![Arda Browser dövme animasyonu](docs/assets/arda-browser-dovme-final.jpg)](https://ardas121.github.io/arda-browser/assets/arda-browser-dovme-animasyon.mp4)

- [Müzik ritmine senkronize dövme animasyonunu izle](https://ardas121.github.io/arda-browser/assets/arda-browser-dovme-animasyon.mp4)
- [Kısa Arda Browser tanıtımını izle](https://ardas121.github.io/arda-browser/assets/arda-browser-tanitim.mp4)

## Kurulum

1. [En son Windows sürümünü indirin](../../releases/latest).
2. `Arda-Browser-Setup.exe` dosyasını çalıştırın.
3. Kurulum konumunu seçerek işlemi tamamlayın.

> Windows SmartScreen, uygulama henüz dijital olarak imzalanmadığı için ilk
> çalıştırmada uyarı gösterebilir.

## Kaynak koddan çalıştırma

Bilgisayarınızda [Node.js](https://nodejs.org/) kurulu olmalıdır.

```bash
npm install
npm start
```

Windows kurulum dosyasını oluşturmak için:

```bash
npm run dist
```

Oluşturulan kurulum dosyası `dist/Arda-Browser-Setup.exe` yolunda bulunur.

## Kullanılan teknolojiler

- Electron
- Chromium
- Node.js
- HTML, CSS ve JavaScript

## Lisans

Bu proje MIT lisansı ile sunulmaktadır.

---

Made with ❤️ by **Arda**
