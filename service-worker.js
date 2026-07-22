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

var SHELL_CACHE = 'fieldmap-shell-v134';
var TILE_CACHE = 'fieldmap-tiles-v1'; // unchanged on purpose — keeps existing offline tiles intact across app updates
// GMU per-state boundary cache — written directly from index.html (not this file's fetch
// handler), but Cache Storage is shared per-origin regardless of who created an entry, so it
// must be listed here too or the activate handler below wipes it on every SHELL_CACHE bump.
// Unchanged on purpose, same reasoning as TILE_CACHE — a state's cached boundaries should
// survive app updates, only ever cleared by its own 60/180-day-driven refresh flow.
var GMU_DATA_CACHE = 'fieldmap-gmu-data-v1';

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
  'https://cdnjs.cloudflare.com/ajax/libs/suncalc/1.8.0/suncalc.min.js',
  'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if (key !== SHELL_CACHE && key !== TILE_CACHE && key !== GMU_DATA_CACHE){
          return caches.delete(key);
        }
      }));
    }).then(function(){
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

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = req.url;

  if (hostMatches(url, BYPASS_HOSTS)) return; // let the browser handle it natively

  if (hostMatches(url, TILE_HOSTS)){
    // Stale-while-revalidate for map tiles & data
    event.respondWith(
      caches.open(TILE_CACHE).then(function(cache){
        return cache.match(req).then(function(cached){
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
  event.respondWith(
    caches.match(req).then(function(cached){
      if (cached) return cached;
      return fetch(req).then(function(networkResp){
        if (networkResp && networkResp.status === 200 && req.url.indexOf(self.location.origin) === 0){
          var respClone = networkResp.clone();
          caches.open(SHELL_CACHE).then(function(cache){ cache.put(req, respClone); });
        }
        return networkResp;
      }).catch(function(){
        if (req.mode === 'navigate'){
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
