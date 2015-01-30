importScripts('bower_components/cache-polyfill/dist/serviceworker-cache-polyfill.js');

var CACHE_NAME = 'paintup-cache-v00';
var urlsToCache = [
  'bower_components/cache-polyfill/dist/serviceworker-cache-polyfill.js',
  '',
  'index.html',
  'scripts/teddy.worker.js',
  'bower_components/three.js/three.js',
  'bower_components/poly2tri/dist/poly2tri.js',
  'scripts/teddy.js',
];
self.addEventListener('install', function(event) {
  console.log('install:' + event);
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});
self.addEventListener('fetch', function(event) {
  console.log('fetch:' + event.request);
  var response = caches.match(event.request).then(function(cacheResponse) {
    if (cacheResponse) return cacheResponse;

    return fetch(event.request.clone()).then(function(fetchResponse) {
      if (fetchResponse 
          && fetchResponse.status === 200 
          && fetchResponse.type === 'basic') {
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request.clone(), fetchResponse.clone());
        });
      }
      return fetchResponse;
    });
  });
  event.respondWith(response);
});
