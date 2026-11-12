'use strict';

const $ = (id) => document.getElementById(id);
const clock = $('clock');
const refreshButton = $('refresh');

function updateClock() {
  clock.textContent = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date()) + ' WIB';
}
setInterval(updateClock, 1000);
updateClock();

function text(node, value, fallback = '—') {
  node.textContent = value == null || value === '' ? fallback : String(value);
}

function renderSources(sources) {
  $('source-list').replaceChildren();
  for (const source of sources) {
    const row = document.createElement('div');
    row.className = 'source-row';
    const name = document.createElement('span');
    name.className = 'source-name';
    name.textContent = source.name;
    const state = document.createElement('span');
    state.className = 'source-state ' + (source.status === 'live' ? 'live' : 'demo');
    state.textContent = source.status === 'live' ? 'LIVE' : 'DEMO / FALLBACK';
    row.append(name, state);
    $('source-list').append(row);
  }
}

function renderNews(items) {
  const root = $('news-list');
  root.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No public headlines available at this time.';
    root.append(empty);
    return;
  }
  for (const item of items) {
    const article = document.createElement('article');
    article.className = 'news-item';
    const source = document.createElement('div');
    source.className = 'news-source';
    source.textContent = item.source || 'PUBLIC';
    const body = document.createElement('div');
    const heading = document.createElement('h3');
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.title;
    heading.append(link);
    const summary = document.createElement('p');
    summary.textContent = item.summary || '';
    const meta = document.createElement('div');
    meta.className = 'news-meta';
    meta.textContent = item.publishedAt || 'Publication time unavailable';
    body.append(heading, summary, meta);
    article.append(source, body);
    root.append(article);
  }
}

function renderQuake(result) {
  const quake = result.data || {};
  text($('magnitude'), quake.magnitude == null ? '—' : Number(quake.magnitude).toFixed(1));
  text($('quake-area'), quake.area);
  text($('quake-title'), quake.area);
  text($('quake-impact'), quake.impact, 'No additional impact information supplied.');
  text($('quake-depth'), quake.depth);
  text($('quake-time'), quake.observedAt);
  const coords = Number.isFinite(quake.latitude) && Number.isFinite(quake.longitude)
    ? quake.latitude.toFixed(3) + ', ' + quake.longitude.toFixed(3) : 'Not supplied';
  text($('quake-coords'), coords);
  $('quake-source').href = 'https://www.bmkg.go.id/';
  $('quake-status').textContent = result.status === 'live' ? 'LIVE BMKG' : 'DEMO DATA';
  $('quake-status').className = 'pill' + (result.status === 'live' ? '' : ' neutral');
}

async function load() {
  refreshButton.disabled = true;
  refreshButton.querySelector('span').textContent = 'Loading';
  try {
    const response = await fetch('/api/overview', { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('Dashboard API unavailable');
    const payload = await response.json();
    renderQuake(payload.quake);
    renderNews(payload.news.data || []);
    renderSources(payload.sources || []);
    $('news-count').textContent = String((payload.news.data || []).length);
    $('source-count').textContent = String((payload.sources || []).filter(s => s.status === 'live').length) + '/' + String((payload.sources || []).length);
    $('news-status').textContent = payload.news.status === 'live' ? 'LIVE RSS' : 'DEMO DATA';
    $('news-status').className = 'pill' + (payload.news.status === 'live' ? '' : ' neutral');
    text($('updated'), 'Updated ' + new Date(payload.generatedAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB');
  } catch (error) {
    text($('updated'), 'Unable to refresh · showing demo state');
    $('news-status').textContent = 'OFFLINE';
    $('quake-status').textContent = 'OFFLINE';
  } finally {
    refreshButton.disabled = false;
    refreshButton.querySelector('span').textContent = 'Refresh';
  }
}
refreshButton.addEventListener('click', load);
load();
