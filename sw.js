// Offline cache: app files and fonts are served from cache and refreshed in the background;
// kennis.json and vragen.json go to the network first so new knowledge shows up as soon as there is a connection.
const CACHE = 'krachtkaart-v2';
const SHELL = ['./', 'index.html', 'score.js', 'body.js', 'parse.js', 'plan.js', 'vraag.js', 'app.js', 'kennis.json', 'vragen.json',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  // 'reload' skips the browser's HTTP cache, so a new version never installs yesterday's files.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const store = (req, res) => {
  if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !fonts) return;
  // 'no-cache' makes the refresh ask the server instead of the browser's HTTP cache, so a deploy arrives on the next open.
  const fresh = () => fetch(req, fonts ? {} : { cache: 'no-cache' });
  if (/\/(kennis|vragen)\.json$/.test(url.pathname)) {
    e.respondWith(fresh().then((res) => store(req, res)).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fresh().then((res) => store(req, res)).catch(() => hit);
    return hit || net;
  }));
});
