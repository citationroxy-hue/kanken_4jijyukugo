// 四字熟語タイピング用 Service Worker
// index.html・CSV・フォントなどをキャッシュし、オフラインでも学習を続けられるようにする

const CACHE_NAME = 'yjj-typing-cache-v1';

// 初回アクセス時に必ずキャッシュしておきたいファイル
const APP_SHELL = [
  './',
  './index.html',
  './kanken_yojijukugo.csv'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.error('初回キャッシュに失敗しました', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 基本方針:
// - GET以外(Googleフォームへの送信など)はそのままネットワークに任せる
// - GETはキャッシュがあればまず即座に返しつつ、裏で最新版を取りに行ってキャッシュを更新する
// - ネットワークに繋がらない場合はキャッシュのみで応答する
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
