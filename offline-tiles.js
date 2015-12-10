var CACHE_NAME = 'osm-tiles';
var OFFLINE_TILE = 'offline.png';


console.log("SW startup");

self.addEventListener('install', function(event) {
  // Store the «offline tile» on startup.
  return fetchAndCache(OFFLINE_TILE)
    .then(function () {
      console.log("SW installed");
    });
});

self.addEventListener('activate', function(event) {
  console.log("SW activated");
});


//
// Intercept download of map tiles: read from cache or download.
//
self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (/\.(js|css|png)$/.test(request.url)) {
    var cached = caches.match(request)
      .then(function (r) {
        if (r) {
          console.log('Cache hit', r);
          return r;
        }
        console.log('Cache missed', request);
        return fetchAndCache(request);
      })
      // Fallback to offline tile if never cached.
      .catch(function(e) {
        console.log('Fetch failed', e);
        return fetch(OFFLINE_TILE);
      });
    event.respondWith(cached);
  }
});


//
// Helper to fetch and store in cache.
//
function fetchAndCache(request) {
  return fetch(request)
    .then(function (response) {
      return caches.open(CACHE_NAME)
        .then(function(cache) {
          console.log('Store in cache', response);
          cache.put(request, response.clone());
          return response;
        });
    });
}