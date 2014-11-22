'use strict';

importScripts(
  '../bower_components/three.js/three.js',
  '../bower_components/poly2tri/dist/poly2tri.js',
  'teddy.js'
);
self.addEventListener('message', function(event) {
  var points = [];
  event.data.forEach(function(point) {
    points.push(new THREE.Vector3(point.x, point.y, point.z));
  });
  var teddy = new Teddy.Body(points);
  try {
    teddy.getMesh();
  }
  catch(e) {
    self.postMessage({status: false, error: e});
    return;
  }
  self.postMessage({status: true, geometry: teddy.mesh.geometry});
});
