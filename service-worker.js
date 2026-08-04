// FieldMap service worker
// Strategy:
//  - App shell (HTML, manifest, icons, MapLibre GL JS CSS/JS, Firebase SDK files): cache-first,
//    so the app always loads instantly and works fully offline once installed.
//  - Map tiles & GMU/public-land data: stale-while-revalidate — serve a cached
//    tile instantly if we have one, and quietly refresh it in the background
//    when online. This means any area you've viewed before stays available
//    offline, even without an explicit "download this area" step.
//  - Firebase/Google sign-in & sync traffic: passed straight through, untouched.
//    Firestore has its own IndexedDB-based offline queueing built in — our cache
//    logic would only get in the way of that.

var SHELL_CACHE = 'fieldmap-shell-v160';
var TILE_CACHE = 'fieldmap-tiles-v1'; // unchanged on purpose — keeps existing offline tiles intact across app updates
// GMU per-state boundary cache — written directly from index.html (not this file's fetch
// handler), but Cache Storage is shared per-origin regardless of who created an entry, so it
// must be listed here too or the activate handler below wipes it on every SHELL_CACHE bump.
// Unchanged on purpose, same reasoning as TILE_CACHE — a state's cached boundaries should
// survive app updates, only ever cleared by its own 60/180-day-driven refresh flow.
var GMU_DATA_CACHE = 'fieldmap-gmu-data-v1';

// ---------- Boot-timing instrumentation (Session 52) ----------
// Session 51's page-side Navigation Timing capture found ~8.4 of ~8.68 reported cold-launch
// seconds sitting between fetchStart and responseStart for the shell's own navigation request,
// with transferSize:0 — i.e. served by THIS file's own cache-first handler below, not the
// network — and TTFB reads n/a in that scenario, which MDN itself documents as a known
// unreliable measurement once a service worker is intercepting the response (the browser can't
// cleanly attribute "waiting on the SW" time the same way it attributes real network wait time).
// These marks close that blind spot from inside the SW itself, where the actual time can be seen
// directly. Date.now() (not performance.now()) is used throughout, deliberately: a service
// worker is a separate JS execution context from the page, each with its OWN
// performance.timeOrigin, so performance.now() readings here aren't directly comparable to the
// page's own without reconciliation math — Date.now() is plain wall-clock epoch time, identical
// across every context with zero reconciliation needed, and sub-millisecond precision doesn't
// matter at the multi-hundred/multi-thousand-ms scale actually being investigated here.
var SW_TIMING_CACHE = 'fieldmap-sw-timing-v1';
var swTiming = {
  scriptStartAtMs: Date.now(), // first executable line of this file — as early as this context can measure itself
  installAtMs: null,
  activateStartAtMs: null,
  activateCompleteAtMs: null,
  firstFetchEventAtMs: null, // first 'fetch' event this SW instance has actually seen — proxy for "genuinely up and dispatching," distinct from merely having started executing
  shellFetch: null // filled in once — see recordShellFetchTiming() below
};
var swFirstFetchRecorded = false;
// Persists the current swTiming snapshot two ways, both best-effort (never blocks/delays the
// actual fetch handling this is instrumenting):
//  1. postMessage to every currently-known client — fast, but not guaranteed delivered: on a
//     genuine cold start this can fire before the page's own JS has even begun executing (let
//     alone registered a message listener), and postMessage doesn't queue for a not-yet-
//     listening receiver.
//  2. A small dedicated Cache Storage entry the page can pull from at its own convenience,
//     any time later — this is what makes the data reliably available regardless of the
//     postMessage race above; Cache Storage is a real persistent store both contexts can reach,
//     unlike a fire-and-forget message.
function persistSwTiming(){
  try {
    self.clients.matchAll({ includeUncontrolled: true }).then(function(clients){
      clients.forEach(function(c){ c.postMessage({ type: 'FIELDMAP_SW_TIMING', data: swTiming }); });
    });
  } catch(e){}
  try {
    caches.open(SW_TIMING_CACHE).then(function(cache){
      cache.put('/~sw-timing-debug', new Response(JSON.stringify(swTiming), { headers: { 'Content-Type': 'application/json' } }));
    });
  } catch(e){}
}
// Records timing for specifically the shell's own navigation request (req.mode === 'navigate' —
// the standard, reliable signal for "this is the top-level document request," not a URL-pattern
// guess) — the literal request whose response becomes the page the user is staring at during the
// reported white screen, and the one whose handling duration is the actual number being sought.
function recordShellFetchTiming(startedAtMs, source){
  var now = Date.now();
  swTiming.shellFetch = { receivedAtMs: startedAtMs, respondedAtMs: now, durationMs: now - startedAtMs, source: source };
  persistSwTiming();
}

var SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-180.png',
  // Local custom Mapbox styles (refreshed via refresh-style.js) — explicitly pre-cached
  // here so every SHELL_CACHE bump deterministically re-fetches them fresh on install.
  // Previously these were only cached opportunistically on first fetch (the generic
  // cache-first fallback below), which meant a browser that had already visited FieldMap
  // before a style-content fix could keep serving the old cached copy indefinitely: the
  // old named cache only gets deleted once a NEW service worker actually activates for
  // that tab, and until a fetch for these exact URLs happened again there was nothing to
  // force that revalidation. Listing them here ties their freshness to the same
  // install/activate cycle as the rest of the shell.
  './topo-style.json',
  './topo-dark-style.json',
  './aerial-streets-style.json',
  // MapLibre GL JS — self-hosted (see index.html's <script>/<link> tags) rather than loaded
  // from unpkg, specifically so it's guaranteed present on a genuine cold boot. It used to be
  // a bare unpkg.com CDN <script src> with no SHELL_FILES entry at all: that relied entirely
  // on the browser's own opportunistic HTTP cache for a cross-origin resource, which is not
  // durable/guaranteed the way this SW's own precache is (confirmed failing on a real iOS
  // standalone-PWA cold boot offline — "Can't find variable: maplibregl" — 2026-07-14). Being
  // same-origin now also means it round-trips through the generic app-shell cache-first
  // handler below like any other local file, not just this explicit install-time list.
  './maplibre-gl.js',
  './maplibre-gl.css',
  // Slope Angle / Custom Elevation Range's Web Worker (Session 38) — same-origin, must be
  // precached like every other script this app depends on (see the maplibre-gl.js comment
  // above for why a same-origin file relying only on the browser's opportunistic HTTP cache
  // isn't durable/offline-guaranteed) — `new Worker('./terrain-overlay-worker.js')` would 404
  // on a genuine cold boot offline without this.
  './terrain-overlay-worker.js',
  'https://cdnjs.cloudflare.com/ajax/libs/suncalc/1.8.0/suncalc.min.js',
  'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js'
];

self.addEventListener('install', function(event){
  swTiming.installAtMs = Date.now();
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  swTiming.activateStartAtMs = Date.now();
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        // SW_TIMING_CACHE deliberately NOT whitelisted here, unlike TILE_CACHE/GMU_DATA_CACHE —
        // it holds only this session's own ephemeral diagnostic marks, nothing worth preserving
        // across an app update; a fresh SW instance repopulates it on its own very next fetch.
        if (key !== SHELL_CACHE && key !== TILE_CACHE && key !== GMU_DATA_CACHE){
          return caches.delete(key);
        }
      }));
    }).then(function(){
      swTiming.activateCompleteAtMs = Date.now();
      persistSwTiming(); // don't wait for a fetch event — a brand-new install has real signal here already
      return self.clients.claim();
    })
  );
});

// Hosts whose responses we treat as "map data" — cached stale-while-revalidate
// rather than cache-first, since these can legitimately update over time.
var TILE_HOSTS = [
  'tile.openstreetmap.org',
  'tile.opentopomap.org',
  'server.arcgisonline.com',
  'basemap.nationalmap.gov',
  'apps.fs.usda.gov',
  'gis.blm.gov',
  'services1.arcgis.com',
  'services8.arcgis.com',
  'nominatim.openstreetmap.org',
  'api.openrouteservice.org',
  'mapservices.weather.noaa.gov',
  'www.lightpollutionmap.info',
  'landscape11.arcgis.com',
  // Mapbox — vector/raster tiles, style JSON, sprite, and glyph responses for 4 of the 5
  // base layers (Topo/Topo Dark/Aerial/Aerial+Topo) plus the DEM terrain-rgb source used for
  // elevation everywhere. Previously missing here entirely, so none of it was covered by
  // even the opportunistic "cache whatever you've browsed" strategy this list exists for —
  // found during the offline-mode Phase 1 diagnostic (2026-07-14).
  'api.mapbox.com',
  // NHDPlus HR (Hydrography) and the modernized USGS water-data API (gauge stations) — both
  // are live per-viewport queries (see loadHydrographyForViewport/loadGaugeStationsForViewport
  // in index.html), not one-time bulk fetches, so this only lets whatever specific
  // viewport/bbox query has already run stay available if the exact same request recurs —
  // it doesn't make the whole feature "work offline" the way GMU/USFS boundaries do.
  'hydro.nationalmap.gov',
  'api.waterdata.usgs.gov'
];

// Hosts we never intercept at all — sign-in and sync traffic passes straight
// to the network so Firebase's own offline handling stays in full control.
var BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'www.googleapis.com',
  'accounts.google.com',
  'apis.google.com',
  'firebaseapp.com',
  'api.weather.gov',
  'epqs.nationalmap.gov',
  'services3.arcgis.com'
  // unpkg.com previously listed here — that's what actually caused the MapLibre GL JS
  // cold-boot failure this file's SHELL_FILES comment above describes: BYPASS_HOSTS skips
  // the SW entirely and falls back to the browser's native HTTP cache, which is exactly the
  // "not durable/guaranteed" mechanism this bug proved unsafe for a critical boot dependency.
  // Removed now that maplibre-gl.js/css are self-hosted (same-origin, so nothing requests
  // unpkg.com at all anymore).
];

function hostMatches(url, list){
  for (var i=0;i<list.length;i++){
    if (url.indexOf(list[i]) !== -1) return true;
  }
  return false;
}

// Header index.html's fetchAndCacheTile() stamps onto every tile it caches as part of an
// explicit "Download this area" — must be the exact same string as OFFLINE_DOWNLOAD_HEADER in
// index.html (no shared-constant mechanism across a classic script and a service worker file).
// Real-world incident this fixes: a downloaded offline area progressively went blank over a
// multi-day trip. Root cause (see loadStyle's patchStyleForOfflineTileParity in index.html for
// the other half of the fix): the plain stale-while-revalidate strategy below always attempts a
// background re-fetch for EVERY tile request, cached or not, and unconditionally overwrites the
// cache entry on any 200 response — with no distinction between "casually browsed, safe to
// refresh" and "deliberately downloaded for offline use, must not be silently replaced." For
// Mapbox's TileJSON-mediated sources specifically, a live re-fetch can legitimately return
// DIFFERENT bytes for the conceptually-same tile request (a session-varying "sku" tracking
// param baked into the resolved tile URL template), and even for non-Mapbox hosts, a flaky-
// connectivity re-fetch has no guarantee of being as good as what's already cached. A tile
// carrying this header is a deliberate, one-time download the user explicitly asked to have
// available offline — it's never revalidated again, by design, regardless of how much later it's
// viewed live or how many app sessions occur in between.
var OFFLINE_DOWNLOAD_HEADER = 'X-FieldMap-Offline-Download';

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;

  if (!swFirstFetchRecorded){
    swFirstFetchRecorded = true;
    swTiming.firstFetchEventAtMs = Date.now();
    persistSwTiming();
  }

  var url = req.url;

  if (hostMatches(url, BYPASS_HOSTS)) return; // let the browser handle it natively

  if (hostMatches(url, TILE_HOSTS)){
    // Stale-while-revalidate for map tiles & data
    event.respondWith(
      caches.open(TILE_CACHE).then(function(cache){
        return cache.match(req).then(function(cached){
          // Explicitly-downloaded tiles are never revalidated — see OFFLINE_DOWNLOAD_HEADER's
          // own comment above for the full incident this prevents. No network request is even
          // attempted here; the whole point is that a downloaded area must keep rendering
          // exactly as downloaded, indefinitely, with zero risk of a background fetch silently
          // replacing it (whether the replacement would even be worse is beside the point —
          // the user already has the data they explicitly asked to keep offline).
          if (cached && cached.headers.get(OFFLINE_DOWNLOAD_HEADER)){
            return cached;
          }
          var fetchPromise = fetch(req).then(function(networkResp){
            if (networkResp && networkResp.status === 200){
              cache.put(req, networkResp.clone());
            }
            return networkResp;
          }).catch(function(){
            return cached; // offline and not cached — nothing we can do
          });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // App shell: cache-first, falling back to network, falling back to the
  // cached index.html for navigation requests if everything else fails.
  // req.mode === 'navigate' is the standard signal for "this is the top-level document request"
  // — the literal request this session's own boot-timing investigation cares about, timed below.
  var isShellNavigationRequest = req.mode === 'navigate';
  var shellFetchStartedAtMs = isShellNavigationRequest ? Date.now() : null;
  event.respondWith(
    caches.match(req).then(function(cached){
      if (cached){
        if (isShellNavigationRequest) recordShellFetchTiming(shellFetchStartedAtMs, 'cache');
        return cached;
      }
      return fetch(req).then(function(networkResp){
        if (networkResp && networkResp.status === 200 && req.url.indexOf(self.location.origin) === 0){
          var respClone = networkResp.clone();
          caches.open(SHELL_CACHE).then(function(cache){ cache.put(req, respClone); });
        }
        if (isShellNavigationRequest) recordShellFetchTiming(shellFetchStartedAtMs, 'network');
        return networkResp;
      }).catch(function(){
        if (req.mode === 'navigate'){
          if (isShellNavigationRequest) recordShellFetchTiming(shellFetchStartedAtMs, 'network-failed-fallback-to-cached-index');
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Allow the page to force-activate a waiting service worker via "Check for updates"
self.addEventListener('message', function(event){
  if (event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
