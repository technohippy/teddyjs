(function() {
'use strict';

window.getContentHeight = function() {
  return window.innerHeight - 64/* header height */;
};
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(70, window.innerWidth / getContentHeight(), 1, 1000);
camera.position.z = 8;
scene.add(camera);
var mainLight = new THREE.DirectionalLight(0xffffff);
mainLight.position.set(1, 0.5, 1);
scene.add(mainLight);
var subLight = new THREE.DirectionalLight(0x333366);
subLight.position.set(-1, -0.5, -1);
scene.add(subLight);
var ambient = new THREE.AmbientLight(0x333333);
scene.add(ambient);

var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, getContentHeight());
renderer.sortObjects = false;
document.getElementById('content').appendChild(renderer.domElement);

(function render() {
  window.requestAnimationFrame(render);
  renderer.render(scene, camera);
})();

Teddy.UI.setup(scene, renderer, camera);

window.addEventListener('resize', function() {
  renderer.setSize(window.innerWidth, getContentHeight());
  camera.aspect = window.innerWidth / getContentHeight();
  camera.updateProjectionMatrix();
}, false);

document.addEventListener('keyup', function(event) {
  if (event.keyCode === 77) {
    if (typeof Teddy.Body.instances !== 'undefined') {
      Teddy.Body.instances.forEach(function(body) {
        body.material.wireframe = !body.material.wireframe;
      }, this);
    }
  }
});

})();
