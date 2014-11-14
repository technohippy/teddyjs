var Teddy = Teddy || {};

Teddy.UI = {};

Teddy.UI.addTextureCanvas = function(textureWidth, textureHeight) {
  var canvas = document.createElement('canvas');
  canvas.id = 'texture';
  canvas.style.position = 'absolute';
  canvas.style.top = '-' + textureHeight + 'px';
  canvas.style.left = '' + textureWidth + 'px';
  canvas.style.backgroundColor = 'white';
  canvas.width = textureWidth;
  canvas.height = textureHeight;
  var gc = canvas.getContext('2d');
  gc.fillStyle = 'rgb(255,255,255)';
  gc.fillRect(0, 0, textureWidth, textureHeight);
  document.body.appendChild(canvas);
  return canvas;
};

Teddy.UI.setup = function(scene, renderer, camera, paper) {
  var controls = new THREE.OrbitControls(camera);
  controls.enabled = false;
  var textureWidth = 600;
  var textureHeight = 600;
  var canvas = Teddy.UI.addTextureCanvas(textureWidth, textureHeight);
  var textureContext = canvas.getContext('2d');
  var texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  if (typeof paper === 'undefined') {
    paper = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, map:texture})
    );
    scene.add(paper);
  }

  var firstScissorsPoint = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshLambertMaterial({color:0xff0000, transparent:true, opacity:0.5})
  );
  firstScissorsPoint.position.set(-1000, -1000, -1000);
  //scene.add(firstScissorsPoint);

  var drawing = false;
  var points = [];
  var lines = [];
  var currentMesh = undefined;
  var projector = new THREE.Projector();
  var rDeg = 0;
  var gDeg = 0;
  var bDeg = 0;
  var lineColor = new THREE.Color(Math.sin(rDeg/180*Math.PI), Math.sin(gDeg/180*Math.PI), Math.sin(bDeg/180*Math.PI));
  var lineMaterial = new THREE.LineBasicMaterial({color: lineColor});
  (function changeLineColor() {
    requestAnimationFrame(changeLineColor);
    rDeg += 1;
    gDeg += 2;
    bDeg += 3;
    lineColor.r = Math.sin(rDeg/180*Math.PI);
    lineColor.g = Math.sin(gDeg/180*Math.PI);
    lineColor.b = Math.sin(bDeg/180*Math.PI);
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
    firstScissorsPoint.position.set(-1000, -1000, -1000);
    firstScissorsPoint.rotation.x = 0;
    firstScissorsPoint.rotation.y = 0;
    firstScissorsPoint.rotation.z = 0;
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
    controls.enabled = true;
  }

  function drawLine(point) {
    if (points.length ==- 0) {
      firstScissorsPoint.position.copy(point).setZ(0.2);
    }
    firstScissorsPoint.rotation.x += 0.05;
    firstScissorsPoint.rotation.y += 0.025;
    firstScissorsPoint.rotation.z += 0.0125;

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

      if (5 < points.length && firstScissorsPoint.position.clone().setZ(0).distanceTo(point) < 0.1) {
        //make3D();
        return;
      }
    }
  }

  function clear() {
    mode = 'pen';
    mouseLastPoint = undefined;
    firstScissorsPoint.position.set(-1000, -1000, -1000);
    drawing = false;
    points = [];
    if (currentMesh) scene.remove(currentMesh);
    currentMesh = undefined;
    lines.forEach(function(line) {scene.remove(line)});
    lines = [];
    paper.material.opacity = 1;
    textureContext.fillStyle = 'rgb(255,255,255)';
    textureContext.fillRect(0, 0, textureWidth, textureHeight);
    texture.needsUpdate = true;
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    controls.reset();
    controls.enabled = false;
  }

  var mode = 'pen';
  var mouseLastPoint = undefined;

  document.getElementById('pen-button').addEventListener('click', function(event) {
    mode = 'pen';
    drawing = false;
    mouseLastPoint = undefined;
  });

  document.getElementById('scissors-button').addEventListener('click', function(event) {
    mode = 'scissors';
    drawing = false;
    points = [];
    lines = [];
  });

  document.getElementById('teddy-button').addEventListener('click', function(event) {
    make3D();
  });

  document.getElementById('clear-button').addEventListener('click', function(event) {
    clear();
  });

  renderer.domElement.addEventListener('mouseup', function(event) {
    if (paper.material.opacity === 0) return
    //make3D();
    drawing = false;
    mouseLastPoint = undefined;
  });

  renderer.domElement.addEventListener('mousedown', function(event) {
    if (paper.material.opacity === 0) return
    ifOnPaperDo(event, function(obj) {
      drawing = true
    });
  });

  renderer.domElement.addEventListener('mousemove', function(event) {
    if (paper.material.opacity === 0) return
    if (!drawing) return;

    ifOnPaperDo(event, function(obj) {
      if (mode === 'pen') {
        var x = (obj.point.x + 4) / 8 * textureWidth;
        var y = textureHeight - (obj.point.y + 4) / 8 * textureHeight;
        if (typeof mouseLastPoint === 'undefined') {
          mouseLastPoint = {x:x, y:y};
        }
        else {
          textureContext.strokeStyle = 'rgb(0,0,255)';
          textureContext.lineCap = 'round';
          textureContext.lineWidth = 50;
          textureContext.beginPath();
          textureContext.moveTo(mouseLastPoint.x, mouseLastPoint.y);
          textureContext.lineTo(x, y);
          textureContext.stroke();
          mouseLastPoint.x = x;
          mouseLastPoint.y = y;
          texture.needsUpdate = true;
        }
      }
      else if (mode === 'scissors') {
        drawLine(obj.point);
      }
    });
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
