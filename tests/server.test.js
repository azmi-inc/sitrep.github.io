'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseQuake, parseRss, safeText } = require('../server');

test('parseQuake normalizes a BMKG earthquake payload', () => {
  const result = parseQuake({
    Infogempa: { gempa: {
      Tanggal: '11 Nov 2026',
      Jam: '10:00:00 WIB',
      Magnitude: '5.1',
      Kedalaman: '10 km',
      Wilayah: 'Contoh wilayah',
      Potensi: 'Tidak berpotensi tsunami',
      Coordinates: '-2.1, 120.2'
    } }
  });
  assert.equal(result.magnitude, 5.1);
  assert.equal(result.latitude, -2.1);
  assert.equal(result.longitude, 120.2);
  assert.equal(result.source, 'BMKG');
});

test('parseQuake rejects unexpected source payloads', () => {
  assert.throws(() => parseQuake({}), /not recognized/);
});

test('parseRss accepts only HTTPS ANTARA article links', () => {
  const xml = `<rss><channel>
    <item><title>Headline A</title><link>https://www.antaranews.com/berita/123</link><description>Public update</description><pubDate>Wed, 11 Nov 2026 10:00:00 GMT</pubDate></item>
    <item><title>Bad host</title><link>https://example.org/a</link></item>
    <item><title>Bad scheme</title><link>http://www.antaranews.com/a</link></item>
  </channel></rss>`;
  const items = parseRss(xml);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Headline A');
});

test('safeText strips markup and bounds output', () => {
  assert.equal(safeText('<b>Hello</b> &amp; world'), 'Hello & world');
  assert.equal(safeText('123456', 3), '123');
});
