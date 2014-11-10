var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.z = 8;
scene.add(camera);

var light = new THREE.DirectionalLight(0xffffff);
light.position.set(1, 0.5, 1);
scene.add(light);
var ambient = new THREE.AmbientLight(0x333333);
scene.add(ambient);

var teddy = new Teddy.Body([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.5, 1, 0),
  new THREE.Vector3(1.5, 1.5, 0),
  new THREE.Vector3(2, 2.5, 0),
  new THREE.Vector3(2.6, 2.8, 0),
  new THREE.Vector3(3.8, 2.5, 0),
  new THREE.Vector3(4.2, 2, 0),
  new THREE.Vector3(4.5, 1.5, 0),
  new THREE.Vector3(5, 1, 0),
  new THREE.Vector3(5.5, 0.8, 0),
  new THREE.Vector3(6.5, -0.5, 0),
  new THREE.Vector3(5, -1, 0),
  new THREE.Vector3(4.5, -1, 0),
  new THREE.Vector3(4, -0.9, 0),
  new THREE.Vector3(3.5, 0, 0),
  new THREE.Vector3(2.5, -1, 0),
  new THREE.Vector3(1, -1.5, 0),
  new THREE.Vector3(0, -1, 0),
]);
scene.add(teddy.getMesh());

var controls = new THREE.OrbitControls(camera);
function render() {
  controls.update(); 
  requestAnimationFrame(render);
  renderer.render(scene, camera);
};
render();
