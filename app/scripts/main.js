function main() {
  'use strict';

  window.getContentHeight = function() {
    return window.innerHeight - 64/* header height */;
  };
  window.getContentWidth = function() {
    if (document.querySelector('core-drawer-panel').narrow) {
      return window.innerWidth;
    }
    else {
      return window.innerWidth - 256/* menu width */;
    }
  };
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(70, window.getContentWidth() / window.getContentHeight(), 1, 1000);
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
  renderer.setSize(window.getContentWidth(), window.getContentHeight() + 1);
  renderer.setClearColor(0x1A237E);
  renderer.sortObjects = false;
  document.querySelector('#content').appendChild(renderer.domElement);

  (function render() {
    window.requestAnimationFrame(render);
    renderer.render(scene, camera);
  })();

  Teddy.UI.setup(scene, renderer, camera);

  window.addEventListener('resize', function() {
    renderer.setSize(window.getContentWidth(), window.getContentHeight());
    camera.aspect = window.getContentWidth() / window.getContentHeight();
    camera.updateProjectionMatrix();
  }, false);
}

window.addEventListener('polymer-ready', function() {
  'use strict';
  var navicon = document.querySelector('#navicon');
  var drawerPanel = document.querySelector('core-drawer-panel');
  navicon.addEventListener('click', function() {
    drawerPanel.togglePanel();
  });
  main();
});
