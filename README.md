# MORPH — Türkçe AI Sohbet

MORPH, OpenRouter üzerinden `nvidia/nemotron-3-ultra-550b-a55b:free` modelini kullanan Türkçe sohbet sitesidir.

**Canlı site:** [MORPH’u aç](https://morph-ai-pal4.onrender.com)

## Bilgisayarında çalıştırma

1. [Node.js 20 veya üzerini](https://nodejs.org/) yükle.
2. OpenRouter hesabından bir API anahtarı oluştur.
3. MORPH klasöründe PowerShell açıp örnek ortam dosyasını kopyala:

   ```powershell
   Copy-Item .env.example .env
   ```

4. `.env` dosyasını Not Defteri ile aç ve kendi anahtarını ekle:

   ```env
   OPENROUTER_API_KEY=buraya_kendi_api_anahtarini_yaz
   ```

5. Gerekli paketleri kur ve sunucuyu başlat:

   ```powershell
   npm ci
   npm start
   ```

6. Tarayıcıda <http://localhost:8000> adresini aç.

`.env` dosyası Git tarafından yok sayılır. API anahtarını `chat.html` dosyasına veya başka bir kaynak dosyasına yazma ve GitHub’a yükleme.

## API anahtarının çalışma şekli

Tarayıcı mesajları MORPH sunucusuna gönderir; sunucu da OpenRouter’a iletir. API anahtarı sunucuda tutulur ve tarayıcıya gönderilmez. Canlı sitede anahtar Render’daki `OPENROUTER_API_KEY` gizli ortam değişkeninde saklanır. Siteyi kullananların istekleri bu anahtar üzerinden yapılır.

## Proje dosyaları

- `chat.html` — sohbet arayüzü ve tarayıcıda tutulan sohbet geçmişi.
- `server.js` — web sunucusu ve sunucu tarafındaki OpenRouter bağlantısı.
- `render.yaml` — Render dağıtım ayarları.
- `package.json` ve `package-lock.json` — Node.js başlatma ve kurulum ayarları.
- `.env.example` — yerel API anahtarı ayarı için boş örnek dosya.

