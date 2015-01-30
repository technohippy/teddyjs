// chrome://inspect/#service-workers
// chrome://serviceworker-internals/
(function() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('background.js').then(
    function(registration) { 
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    },
    function(error) {
      console.log('ServiceWorker registration failed: ', error);
    }
  );
})();
