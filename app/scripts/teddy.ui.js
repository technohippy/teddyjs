var Teddy = Teddy || {};

Teddy.UI = {};

Teddy.UI.setup = function(scene, renderer, camera, paper) {
  if (typeof paper === 'undefined') {
    paper = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, map:texture})
    );
    scene.add(paper);
  }

  var firstPoint = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshLambertMaterial({color:0xff0000, transparent:true, opacity:0.5})
  );
  firstPoint.position.set(-1000, -1000, -1000);
  //scene.add(firstPoint);

  var drawing = false;
  var points = [];
  var lines = [];
  var currentMesh = null;
  var projector = new THREE.Projector();
  var lineColor = new THREE.Color(0, 0, 0);
  var lineMaterial = new THREE.LineBasicMaterial({color: lineColor});
  (function changeLineColor() {
    requestAnimationFrame(changeLineColor);
    lineColor.r = (lineColor.r + 0.001) % 1;
    lineColor.g = (lineColor.g + 0.003) % 1;
    lineColor.b = (lineColor.b + 0.007) % 1;
    lineMaterial.color.copy(lineColor);
  })();

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

      var geometry = currentMesh.geometry;
      geometry.faces.forEach(function(face) {
        var pa = geometry.vertices[face.a];
        var pb = geometry.vertices[face.b];
        var pc = geometry.vertices[face.c];
        geometry.faceVertexUvs[0].push([
          new THREE.Vector2((pa.x + 4)/8, (pa.y + 4)/8),
          new THREE.Vector2((pb.x + 4)/8, (pb.y + 4)/8),
          new THREE.Vector2((pc.x + 4)/8, (pc.y + 4)/8)
        ]);
      }, this);
      currentMesh.material.map = texture;
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

  function drawLine(point) {
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
        var line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        lines.push(line);
      }

      if (5 < points.length && firstPoint.position.clone().setZ(0).distanceTo(point) < 0.1) {
        make3D();
        return;
      }
    }
  }

  renderer.domElement.addEventListener('mouseup', function(event) {
    if (paper.material.opacity === 0) return
    make3D();
  });

  renderer.domElement.addEventListener('mousedown', function(event) {
    if (paper.material.opacity === 0) return
    ifOnPaperDo(event, function(obj) {drawing = true});
  });

  renderer.domElement.addEventListener('mousemove', function(event) {
    if (paper.material.opacity === 0) return
    if (event.shiftKey) {
      ifOnPaperDo(event, function(obj) {
        var x = (obj.point.x + 4) / 8 * 200;
        var y = 200 - (obj.point.y + 4) / 8 * 200;
        gc.fillStyle = 'rgb(0,0,255)';
        gc.fillRect(x, y, 10, 10);
        texture.needsUpdate = true;
      });
    }
    else if (drawing) {
      ifOnPaperDo(event, function(obj) {drawLine(obj.point)});
    }
  });

  renderer.domElement.addEventListener('touchend', function(event) {
    if (paper.material.opacity === 0) return
    make3D();
  });

  renderer.domElement.addEventListener('touchstart', function(event) {
    if (paper.material.opacity === 0) return
    ifOnPaperDo(event.touches[0], function(obj) {drawing = true});
  });

  renderer.domElement.addEventListener('touchmove', function(event) {
    if (!drawing || paper.material.opacity === 0) return
    ifOnPaperDo(event.touches[0], function(obj) {drawLine(obj.point)});
  });
};
