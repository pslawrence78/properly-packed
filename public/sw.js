// Keep this release cache aligned with APP_VERSION when completing a tranche.
const CACHE_NAME = "properly-packed-shell-v0.32.2";
const BASE_PATH = normaliseBasePath(new URL(self.registration.scope).pathname);
const SHELL_ASSETS = [
  withBasePath("/"),
  withBasePath("/index.html"),
  withBasePath("/manifest.webmanifest"),
  withBasePath("/icons/icon.svg"),
  withBasePath("/icons/icon-192.png"),
  withBasePath("/icons/icon-512.png"),
  withBasePath("/icons/icon-maskable-512.png"),
  withBasePath("/icons/apple-touch-icon.png"),
];
const STATIC_PATH_PREFIXES = [withBasePath("/assets/"), withBasePath("/icons/")];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithRefresh(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(withBasePath("/"), response.clone());
    }

    return response;
  } catch {
    return (
      (await cache.match(request)) ??
      (await cache.match(withBasePath("/"))) ??
      (await cache.match(withBasePath("/index.html"))) ??
      new Response("Properly Packed is offline and the app shell is unavailable.", {
        headers: { "content-type": "text/plain" },
        status: 503,
      })
    );
  }
}

async function cacheFirstWithRefresh(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const refresh = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  });

  return cached ?? refresh;
}

function isStaticAsset(pathname) {
  return (
    pathname === withBasePath("/manifest.webmanifest") ||
    STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function normaliseBasePath(pathname) {
  if (pathname === "/") {
    return "";
  }

  return pathname.replace(/\/$/, "");
}

function withBasePath(pathname) {
  const normalisedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (!BASE_PATH) {
    return normalisedPath;
  }

  if (normalisedPath === "/") {
    return `${BASE_PATH}/`;
  }

  return `${BASE_PATH}${normalisedPath}`;
}
