// 앱 화면을 기기에 저장해 두어 인터넷이 약해도 열리게 함 (학생 기록은 여기 저장하지 않음)
const VERSION = "ff-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("ff-") && k !== VERSION && k !== VERSION + "-fonts").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 앱 화면: 인터넷이 되면 최신 파일, 안 되면 저장된 파일
  if (req.mode === "navigate") {
    // 측정 앱 화면만 저장 (같은 주소 아래 다른 페이지, 예: 작전판(plays/)은 건드리지 않음)
    const base = new URL("./", self.location).pathname;
    if (url.pathname !== base && url.pathname !== base + "index.html") return;
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); return res; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // 글꼴: 한 번 받으면 저장해서 재사용
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(VERSION + "-fonts").then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith(new URL("./plays/", self.location).pathname)) return;
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
