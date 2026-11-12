'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DEMO = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'demo.json'), 'utf8'));
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const REQUEST_TIMEOUT_MS = 6500;

const SOURCES = Object.freeze({
  bmkg: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
  antara: 'https://www.antaranews.com/rss/terkini.xml'
});

function safeText(value, max = 500) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function tagValue(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp('<' + escaped + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + escaped + '>', 'i').exec(xml);
  return match ? safeText(match[1], 1000) : '';
}

function parseQuake(payload) {
  const quake = payload?.Infogempa?.gempa;
  if (!quake || typeof quake !== 'object') throw new Error('BMKG response format not recognized');
  const coords = String(quake.Coordinates || '').split(',');
  const lat = Number.parseFloat(coords[0]);
  const lon = Number.parseFloat(coords[1]);
  const magnitude = Number.parseFloat(quake.Magnitude);
  return {
    source: 'BMKG',
    sourceUrl: SOURCES.bmkg,
    observedAt: safeText([quake.Tanggal, quake.Jam].filter(Boolean).join(' '), 80),
    magnitude: Number.isFinite(magnitude) ? magnitude : null,
    depth: safeText(quake.Kedalaman, 40),
    area: safeText(quake.Wilayah, 240),
    impact: safeText(quake.Potensi, 240),
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null
  };
}

function parseRss(xml, limit = 12) {
  const items = [];
  const blocks = String(xml).match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, limit)) {
    const title = tagValue(block, 'title');
    const link = tagValue(block, 'link');
    const description = tagValue(block, 'description');
    const pubDate = tagValue(block, 'pubDate');
    if (!title || !/^https:\/\//i.test(link)) continue;
    let host = '';
    try { host = new URL(link).hostname; } catch { continue; }
    if (!['www.antaranews.com', 'antaranews.com'].includes(host)) continue;
    items.push({
      title: safeText(title, 220),
      summary: safeText(description, 320),
      url: link,
      publishedAt: safeText(pubDate, 80),
      source: 'ANTARA'
    });
  }
  return items;
}

async function fetchFixed(url, accept) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: { accept, 'user-agent': 'SITREP-Safe/0.1 (+public-information-dashboard)' }
    });
    if (!response.ok) throw new Error('Upstream HTTP ' + response.status);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function getQuake() {
  try {
    const raw = await fetchFixed(SOURCES.bmkg, 'application/json');
    const parsed = parseQuake(JSON.parse(raw));
    return { data: parsed, status: 'live', updatedAt: new Date().toISOString() };
  } catch (error) {
    return { data: DEMO.quake, status: 'demo', updatedAt: new Date().toISOString(), note: 'BMKG source temporarily unavailable' };
  }
}

async function getNews() {
  try {
    const raw = await fetchFixed(SOURCES.antara, 'application/rss+xml, application/xml, text/xml');
    const items = parseRss(raw);
    if (!items.length) throw new Error('No valid RSS items');
    return { data: items, status: 'live', updatedAt: new Date().toISOString() };
  } catch {
    return { data: DEMO.news, status: 'demo', updatedAt: new Date().toISOString(), note: 'RSS source temporarily unavailable' };
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function securityHeaders(res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
}

function createServer() {
  return http.createServer(async (req, res) => {
    securityHeaders(res);
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    try {
      if (url.pathname === '/api/health') {
        return sendJson(res, 200, { ok: true, service: 'sitrep-safe', mode: 'public-read-only', time: new Date().toISOString() });
      }
      if (url.pathname === '/api/earthquake') {
        return sendJson(res, 200, await getQuake());
      }
      if (url.pathname === '/api/news') {
        return sendJson(res, 200, await getNews());
      }
      if (url.pathname === '/api/overview') {
        const [quake, news] = await Promise.all([getQuake(), getNews()]);
        return sendJson(res, 200, {
          generatedAt: new Date().toISOString(),
          mode: 'public-read-only',
          quake,
          news,
          sources: [
            { name: 'BMKG', status: quake.status, url: SOURCES.bmkg },
            { name: 'ANTARA', status: news.status, url: SOURCES.antara }
          ]
        });
      }

      const requestPath = url.pathname === '/' ? '/index.html' : url.pathname;
      const normalized = path.posix.normalize(requestPath);
      if (!normalized.startsWith('/') || normalized.includes('..') || normalized.includes('\\')) {
        return sendJson(res, 400, { error: 'Invalid path' });
      }
      const filePath = path.join(PUBLIC_DIR, normalized);
      if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 400, { error: 'Invalid path' });
      let stat;
      try { stat = fs.statSync(filePath); } catch { return sendJson(res, 404, { error: 'Not found' }); }
      if (!stat.isFile()) return sendJson(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(filePath).pipe(res);
    } catch {
      sendJson(res, 500, { error: 'Internal server error' });
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log('[SITREP Safe] listening on http://' + HOST + ':' + PORT);
    console.log('[SITREP Safe] public read-only mode; no tracking or private-source collection');
  });
}

module.exports = { createServer, parseQuake, parseRss, safeText, SOURCES };
