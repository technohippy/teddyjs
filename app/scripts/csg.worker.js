'use strict';

importScripts(
  '../bower_components/three.js/three.js',
  'vendor/csg.js',
  'vendor/ThreeCSG.js'
);

self.addEventListener('message', function(event) {
  var geometries = event.data;
  var bsps = geometries.map(function(geometry) {return new ThreeBSP(geometry);});
  var bsp = bsps.pop();
  while (0 < bsps.length) {
    bsp = bsp.union(bsps.pop());
  }
  self.postMessage({status: true, geometry: bsp.toGeometry()});
});
