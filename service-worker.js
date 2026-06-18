// FieldMap service worker
// Strategy:
//  - App shell (HTML, manifest, icons, Leaflet CSS/JS): cache-first, so the app
//    always loads instantly and works fully offline once installed.
//  - Map tiles & GMU/public-land data: stale-while-revalidate — serve a cached
//    tile instantly if we have one, and quietly refresh it in the background
//    when online. This means any area you've viewed before stays available
//    offline, even without an explicit "download this area" step.

var SHELL_CACHE = 'fieldmap-shell-v1';
var TILE_CACHE = 'fieldmap-tiles-v1';

var SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-180.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
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
        if (key !== SHELL_CACHE && key !== TILE_CACHE){
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
  'server.arcgisonline.com',
  'basemap.nationalmap.gov',
  'apps.fs.usda.gov',
  'gis.blm.gov',
  'services8.arcgis.com',
  'nominatim.openstreetmap.org',
  'api.openrouteservice.org'
];

function isTileRequest(url){
  for (var i=0;i<TILE_HOSTS.length;i++){
    if (url.indexOf(TILE_HOSTS[i]) !== -1) return true;
  }
  return false;
}

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = req.url;

  if (isTileRequest(url)){
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
