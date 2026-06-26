const CACHE_VERSION = 'v6';
const CACHE_NAME = `llavero-seguro-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/logo-192.png', '/icons/logo-512.png'];

function assetUrlsFromHtml(html) {
  const urls = new Set(APP_SHELL);
  const patterns = [
    /<script[^>]+src=["']([^"']+)["']/g,
    /<link[^>]+href=["']([^"']+)["']/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = new URL(match[1], self.location.origin);
      if (url.origin === self.location.origin && isPublicAsset(url)) {
        urls.add(url.pathname);
      }
    }
  });

  return Array.from(urls);
}

function assetUrlsFromText(text) {
  const urls = new Set();
  const pattern = /\/assets\/[^"')`\s]+/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const url = new URL(match[0], self.location.origin);
    if (url.origin === self.location.origin && isPublicAsset(url)) {
      urls.add(url.pathname);
    }
  }

  return Array.from(urls);
}

async function precacheApp(cache) {
  const response = await fetch('/', { cache: 'reload' });
  if (!response.ok) {
    throw new Error('No se pudo precargar Llavero Seguro.');
  }

  const html = await response.clone().text();
  await cache.put('/', response);

  const pendingUrls = assetUrlsFromHtml(html).filter((url) => url !== '/');
  const cachedUrls = new Set(['/']);

  while (pendingUrls.length > 0) {
    const url = pendingUrls.shift();
    if (!url || cachedUrls.has(url)) continue;

    const assetResponse = await fetch(url, { cache: 'reload' });
    if (!assetResponse.ok) {
      throw new Error(`No se pudo precargar ${url}.`);
    }

    cachedUrls.add(url);
    const contentType = assetResponse.headers.get('content-type') ?? '';
    if (contentType.includes('text/css') || contentType.includes('javascript')) {
      const text = await assetResponse.clone().text();
      assetUrlsFromText(text).forEach((assetUrl) => {
        if (!cachedUrls.has(assetUrl)) pendingUrls.push(assetUrl);
      });
    }
    await cache.put(url, assetResponse);
  }
}

function isPublicAsset(url) {
  return (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/icons/logo-192.png' ||
    url.pathname === '/icons/logo-512.png' ||
    url.pathname.startsWith('/assets/')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(precacheApp));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin || !isPublicAsset(requestUrl)) {
    return;
  }

  const isAppDocument = event.request.mode === 'navigate' || requestUrl.pathname === '/' || requestUrl.pathname === '/index.html';

  if (isAppDocument) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ??
        fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }),
    ),
  );
});
