const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const textModel = 'nvidia/nemotron-3-ultra-550b-a55b:free';
const visionModel = 'google/gemma-4-26b-a4b-it:free';
const requestWindows = new Map();

function loadEnv() {
  try {
    for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match && !match[1].startsWith('#')) process.env[match[1]] ??= match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}

function reply(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function complete(model, messages, key, port) {
  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`,
      'X-Title': 'MORPH',
    },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(180000),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const error = new Error(data.error?.message || `OpenRouter HTTP ${upstream.status}`);
    error.status = upstream.status;
    throw error;
  }
  let content = data.choices?.[0]?.message?.content || '';
  if (Array.isArray(content)) content = content.filter(part => part.type === 'text').map(part => part.text).join('\n');
  if (typeof content !== 'string' || !content.trim()) throw new Error('Model boş yanıt verdi.');
  return content.trim();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8000');
  if (req.method === 'GET' && ['/', '/chat.html'].includes(url.pathname)) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://openrouter.ai; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'",
    });
    fs.createReadStream(path.join(root, 'chat.html')).pipe(res);
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/health') {
    loadEnv();
    reply(res, 200, { ok: true, configured: !!process.env.OPENROUTER_API_KEY, model: textModel, visionModel });
    return;
  }
  if (req.method !== 'POST' || url.pathname !== '/api/chat') {
    reply(res, 404, { error: 'Sayfa bulunamadı.' });
    return;
  }

  loadEnv();
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return reply(res, 503, { error: 'OpenRouter anahtarı sunucuda ayarlı değil. Render Environment bölümüne OPENROUTER_API_KEY ekle.' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (requestWindows.get(ip) || []).filter(time => now - time < 60_000);
  if (recent.length >= 20) return reply(res, 429, { error: 'Çok sık istek gönderildi. Bir dakika sonra tekrar dene.' });
  recent.push(now);
  requestWindows.set(ip, recent);
  if (requestWindows.size > 5000) {
    for (const [address, times] of requestWindows) {
      if (!times.some(time => now - time < 60_000)) requestWindows.delete(address);
    }
  }

  try {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 8 * 1024 * 1024) return reply(res, 413, { error: 'İstek 8 MB sınırını aşıyor.' });
    }
    const input = JSON.parse(raw);
    if (!Array.isArray(input.messages) || !input.messages.length) return reply(res, 400, { error: 'Gönderilecek sohbet mesajı bulunamadı.' });
    if (input.messages.length > 80 || input.messages.some(message => {
      if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || message.content.length > 100_000) return true;
      const images = message.images ?? [];
      if (!Array.isArray(images) || images.length > 3 || images.some(image => typeof image !== 'string' || image.length > 1_600_000 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(image))) return true;
      return images.length > 0 && message.role !== 'user';
    })) return reply(res, 400, { error: 'Sohbet mesajları geçersiz veya çok uzun.' });

    const imageIndex = input.messages.findLastIndex(message => message.role === 'user' && message.images?.length);
    let content;
    if (imageIndex >= 0) {
      const imageMessage = input.messages[imageIndex];
      const context = input.messages.slice(Math.max(0, imageIndex - 8), imageIndex)
        .map(message => ({ role: message.role, content: message.content }))
        .filter(message => message.content.trim());
      const visionContent = [
        { type: 'text', text: `Bu görseli dikkatlice analiz et. Nesneleri, metinleri ve ilgili ayrıntıları açıkla. Kullanıcının isteği: ${imageMessage.content || 'Görseli açıkla.'}` },
        ...imageMessage.images.map(image => ({ type: 'image_url', image_url: { url: image } })),
      ];
      const analysis = await complete(visionModel, [...context, { role: 'user', content: visionContent }], key, port);
      const finalMessages = input.messages.map((message, index) => ({
        role: message.role,
        content: index === imageIndex
          ? `${message.content}${message.content ? '\n\n' : ''}[Gemma görsel analizi]\n${analysis}`
          : message.content,
      }));
      content = await complete(textModel, finalMessages, key, port);
    } else {
      content = await complete(textModel, input.messages.map(({ role, content }) => ({ role, content })), key, port);
    }
    reply(res, 200, { message: { content }, model: textModel, visionModel: imageIndex >= 0 ? visionModel : null });
  } catch (error) {
    const status = error.status || (error.name === 'SyntaxError' ? 400 : 502);
    reply(res, status, { error: error.name === 'TimeoutError' ? 'OpenRouter yanıtı zaman aşımına uğradı.' : error.message || 'OpenRouter isteği başarısız.' });
  }
});

loadEnv();
const port = Number(process.env.PORT) || 8000;
server.listen(port, '0.0.0.0', () => {
  console.log(`MORPH sohbet hazır: http://127.0.0.1:${port}`);
  console.log('OpenRouter API anahtarı:', process.env.OPENROUTER_API_KEY ? 'yüklendi' : '.env dosyasında bulunamadı');
});


