var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.sortObjects = false;
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
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

var geometry = new THREE.PlaneGeometry(8, 8);
var material = new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.DoubleSide, transparent:true});
var paper = new THREE.Mesh(geometry, material);
scene.add(paper);

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
};
render();

var firstPoint = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial({color:0xff0000, transparent:true, opacity:0.5}));
firstPoint.position.set(-1000, -1000, -1000);
scene.add(firstPoint);

var drawing = false;
var points = [];
var lines = [];
var currentMesh = null;
var projector = new THREE.Projector();

function ifOnPaperDo(event, handler) {
  var rect = event.target.getBoundingClientRect();
  var mouseX = event.clientX - rect.left;
  var mouseY = event.clientY - rect.top;
  mouseX =  (mouseX/window.innerWidth)  * 2 - 1;
  mouseY = -(mouseY/window.innerHeight) * 2 + 1;
  var pos = new THREE.Vector3(mouseX, mouseY, 1);
  projector.unprojectVector(pos, camera);
  var ray = new THREE.Raycaster(camera.position, pos.sub(camera.position).normalize());
  var objs = ray.intersectObjects([paper]);
  if (objs.length == 1) {
    handler(objs[0]);
  }
}

function make3D() {
  if (currentMesh) scene.remove(currentMesh);
  firstPoint.position.set(-1000, -1000, -1000);
  firstPoint.rotation.x = 0;
  firstPoint.rotation.y = 0;
  firstPoint.rotation.z = 0;
  drawing = false;
  lines.forEach(function(line) {scene.remove(line)});
  lines = [];
  var teddy = new Teddy.Body(points);
  try {
    currentMesh = teddy.getMesh();
  }
  catch (e) {
    points = [];
    console.log(e);
    alert('Fail to create 3D mesh');
    return;
  }
  scene.add(currentMesh);
  //teddy.debugAddSpineMeshes(scene);

  points = [];
  paper.material.opacity = 0;
  new THREE.OrbitControls(camera);
}

document.addEventListener('keyup', function(event) {
  if (event.keyCode === 13) { // enter key
    window.location.reload();
  }
});

renderer.domElement.addEventListener('mouseup', function(event) {
  if (paper.material.opacity === 0) return
  make3D();
});

renderer.domElement.addEventListener('mousedown', function(event) {
  if (paper.material.opacity === 0) return

  ifOnPaperDo(event, function(obj) {
    drawing = true;
  });
});

renderer.domElement.addEventListener('mousemove', function(event) {
  if (!drawing || paper.material.opacity === 0) return

  ifOnPaperDo(event, function(obj) {
    var point = obj.point;
    if (points.length ==- 0) {
      firstPoint.position.copy(point).setZ(0.2);
    }
    firstPoint.rotation.x += 0.05;
    firstPoint.rotation.y += 0.025;
    firstPoint.rotation.z += 0.0125;

    if (points.length == 0 || 0.1 < points[points.length - 1].distanceTo(point)) {
      // avoid collinear
      while (2 <= points.length) {
        var p01 = point.clone().sub(points[points.length - 1]);
        var p02 = point.clone().sub(points[points.length - 2]);
        var deg = Math.acos(p01.dot(p02) / p01.length() / p02.length()) / Math.PI * 180;
        if (deg < 1) {
          scene.remove(lines.pop());
          points.pop();
        }
        else {
          break;
        }
      }

      points.push(point);

      if (2 <= points.length) {
        var lineGeometry = new THREE.Geometry();
        lineGeometry.vertices.push(points[points.length - 1].clone().setZ(0.01));
        lineGeometry.vertices.push(points[points.length - 2].clone().setZ(0.01));
        var line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({color: 0x990000}));
        scene.add(line);
        lines.push(line);
      }

      if (5 < points.length && firstPoint.position.clone().setZ(0).distanceTo(point) < 0.1) {
        make3D();
        return;
      }
    }
  });
});
