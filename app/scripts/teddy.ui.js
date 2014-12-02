'use strict';

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
  var contours = [];
  var currentLines = [];
  var currentMesh;
  var projector = new THREE.Projector();
  var rDeg = 0, gDeg = 0, bDeg = 0;
  var lineColor = new THREE.Color(Math.sin(rDeg/180*Math.PI), Math.sin(gDeg/180*Math.PI), Math.sin(bDeg/180*Math.PI));
  var lineMaterial = new THREE.LineBasicMaterial({color: lineColor});
  (function changeLineColor() {
    window.requestAnimationFrame(changeLineColor);
    rDeg += 1;
    gDeg += 2;
    bDeg += 3;
    lineColor.r = Math.sin(rDeg/180*Math.PI);
    lineColor.g = Math.sin(gDeg/180*Math.PI);
    lineColor.b = Math.sin(bDeg/180*Math.PI);
    lineMaterial.color.copy(lineColor);
  })();

  function getCurrentContour() {
    if (contours.length === 0) contours.push([]);
    return contours[contours.length - 1];
  }

  function ifOnPaperDo(event, handler) {
    var rect = event.target.getBoundingClientRect();
    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;
    mouseX =  (mouseX/window.getContentWidth())  * 2 - 1;
    mouseY = -(mouseY/window.getContentHeight()) * 2 + 1;
    var pos = new THREE.Vector3(mouseX, mouseY, 1);
    projector.unprojectVector(pos, camera);
    var ray = new THREE.Raycaster(camera.position, pos.sub(camera.position).normalize());
    var objs = ray.intersectObjects([paper]);
    if (objs.length === 1) {
      handler(objs[0]);
    }
  }

  function retrieveOutline() {
    var imageData = textureContext.getImageData(0, 0, textureWidth, textureHeight);
    var points = [];
    var step = 3;
    for (var x = 0; x < textureWidth; x += step) {
      for (var y = 0; y < textureHeight; y += step) {
        var index = (x + y * textureWidth) * 4;
        var data = imageData.data;
        if (data[index] !== 255 ||
            data[index+1] !== 255 ||
            data[index+2] !== 255 ||
            data[index+3] !== 255) {
          points.push([x, y]);
        }
      }
    }

    var outline = hull(points, 10);

    if (outline.length < 3) return;
    var smoothOutline = [
      [
        (outline[outline.length-2][0] + outline[outline.length-1][0] + outline[0][0]) / 3,
        (outline[outline.length-2][1] + outline[outline.length-1][1] + outline[0][1]) / 3
      ],
      [
        (outline[outline.length-1][0] + outline[0][0] + outline[1][0]) / 3,
        (outline[outline.length-1][1] + outline[0][1] + outline[1][1]) / 3
      ]
    ];
    for (var i = 1; i < outline.length - 2; i++) {
      smoothOutline.push([
        (outline[i-1][0] + outline[i][0] + outline[i+1][0]) / 3,
        (outline[i-1][1] + outline[i][1] + outline[i+1][1]) / 3
      ]);
    }

    smoothOutline.forEach(function(point) {
      cutLine(new THREE.Vector3(
        point[0] / textureWidth * 8 - 4,
        (textureHeight - point[1]) * 8 / textureHeight - 4,
        0
      ));
    }, this);
  }

  function resetScissors() {
    firstScissorsPoint.position.set(-1000, -1000, -1000);
    firstScissorsPoint.rotation.x = 0;
    firstScissorsPoint.rotation.y = 0;
    firstScissorsPoint.rotation.z = 0;
    drawing = false;
    paper.material.opacity = 0;
  }
  
  function make3D() {
    resetScissors();

    var countContours = contours.length;
    var processedContours = 0;
    var spinner = document.getElementById('now-building');
    spinner.active = true;
    spinner.style.display = 'block';
    function checkMaking() {
      processedContours++;
      if (countContours === processedContours) {
        clearLines();
        currentLines = [];
        spinner.active = false;
        spinner.style.display = 'none';
        contours = [];
        controls.enabled = true;
      }
    }

    contours.forEach(function(currentContour) {
      if (currentContour.length === 0) {
        checkMaking();
        return; // TODO: そもそも登録しないようにする
      }

      var teddy = new Teddy.Body(currentContour, meshSwitch.checked);
      teddy.getMeshAsync(function() {
        currentMesh = teddy.mesh;
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
        scene.add(currentMesh);
        //teddy.debugAddSpineMeshes(scene);
      }, function(e) {
        contours[contours.length - 1] = [];
        console.log(e);
        window.alert('Fail to create a 3D mesh');
      }, checkMaking);
    }, this);
  }

  function drawLine(point) {
    var lineWidth = strokeConfig['lineWidth'];
    var lineColor = strokeConfig['lineColor'];
    var x = (point.x + 4) / 8 * textureWidth;
    var y = textureHeight - (point.y + 4) / 8 * textureHeight;
    if (typeof mouseLastPoint === 'undefined') {
      mouseLastPoint = {x:x, y:y};
      textureContext.fillStyle = lineColor;
      textureContext.beginPath();
      textureContext.arc(x, y, lineWidth/2, 0, 2 * Math.PI);
      textureContext.closePath();
      textureContext.fill();
      texture.needsUpdate = true;
    }
    else {
      textureContext.strokeStyle = lineColor;
      textureContext.lineCap = 'round';
      textureContext.lineWidth = lineWidth;
      textureContext.beginPath();
      textureContext.moveTo(mouseLastPoint.x, mouseLastPoint.y);
      textureContext.lineTo(x, y);
      textureContext.stroke();
      mouseLastPoint.x = x;
      mouseLastPoint.y = y;
      texture.needsUpdate = true;
    }
  }

  function cutLine(point) {
    if (getCurrentContour().length === 0) {
      firstScissorsPoint.position.copy(point).setZ(0.2);
    }
    firstScissorsPoint.rotation.x += 0.05;
    firstScissorsPoint.rotation.y += 0.025;
    firstScissorsPoint.rotation.z += 0.0125;

    if (getCurrentContour().length === 0 || 0.1 < getCurrentContour()[getCurrentContour().length - 1].distanceTo(point)) {
      // avoid collinear
      while (2 <= getCurrentContour().length) {
        var p01 = point.clone().sub(getCurrentContour()[getCurrentContour().length - 1]);
        var p02 = point.clone().sub(getCurrentContour()[getCurrentContour().length - 2]);
        var deg = Math.acos(p01.dot(p02) / p01.length() / p02.length()) / Math.PI * 180;
        if (deg < 1) {
          scene.remove(currentLines.pop());
          getCurrentContour().pop();
        }
        else {
          break;
        }
      }

      if (checkcurrentLinesIntersection(point, getCurrentContour())) {
        // finish cutting
        // TODO: something wrong
        return false;
      }

      getCurrentContour().push(point);

      if (2 <= getCurrentContour().length) {
        var lineGeometry = new THREE.Geometry();
        lineGeometry.vertices.push(getCurrentContour()[getCurrentContour().length - 1].clone().setZ(0.01));
        lineGeometry.vertices.push(getCurrentContour()[getCurrentContour().length - 2].clone().setZ(0.01));
        var line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        currentLines.push(line);
      }
    }
    return true;
  }

  function checkcurrentLinesIntersection(point, contour) {
    if (contour.length < 3) return false;
    var checkLine = [point, contour[contour.length-1]];
    for (var i = 1; i < contour.length-2; i++) {
      if (checkLineIntersection(checkLine, [contour[i-1], contour[i]])) return true;
    }
    return false;
  }
  
  function checkLineIntersection(line1, line2) {
    var p10 = line1[0];
    var p11 = line1[1];
    var p20 = line2[0];
    var p21 = line2[1];
    if (p10.x < p20.x && p10.x < p21.x && p11.x < p20.x && p11.x < p21.x) return false;
    if (p20.x < p10.x && p21.x < p10.x && p20.x < p11.x && p21.x < p11.x) return false;
    if (p10.y < p20.y && p10.y < p21.y && p11.y < p20.y && p11.y < p21.y) return false;
    if (p20.y < p10.y && p21.y < p10.y && p20.y < p11.y && p21.y < p11.y) return false;
    var v11to10 = p10.clone().sub(p11);
    var v11to20 = p20.clone().sub(p11);
    var v11to21 = p21.clone().sub(p11);
    var v21to20 = p20.clone().sub(p21);
    var v21to10 = p10.clone().sub(p21);
    var v21to11 = p11.clone().sub(p21);
    if (v11to10.cross(v11to20).z * v11to10.cross(v11to21).z <= 0 && v21to20.cross(v21to10).z * v21to20.cross(v21to11).z <= 0) return true;
    return false;
  }

  function clear(reserveMesh) {
    mode = 'pen';
    mouseLastPoint = undefined;
    firstScissorsPoint.position.set(-1000, -1000, -1000);
    drawing = false;
    if (typeof reserveMesh === 'undefined') {
      textureContext.fillStyle = 'rgb(255,255,255)';
      textureContext.fillRect(0, 0, textureWidth, textureHeight);
      texture.needsUpdate = true;
      currentMesh = undefined;
      clearMeshes();
      clearLines();
    }
    contours = [];
    currentLines = [];
    paper.material.opacity = 1;
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    controls.reset();
    controls.enabled = false;
  }

  function clearMeshes() {
    var allMeshes = [];
    scene.children.forEach(function(child) {
      if (child instanceof THREE.Mesh && !(child.geometry instanceof THREE.PlaneGeometry)) {
        allMeshes.push(child);
      }
    }, this);
    allMeshes.forEach(function(mesh) {scene.remove(mesh);});
  }

  function clearLines() {
    var allLines = [];
    scene.children.forEach(function(child) {
      if (child instanceof THREE.Line) allLines.push(child);
    }, this);
    allLines.forEach(function(line) {scene.remove(line);});
  }

  navigator.getUserMedia = (navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia);
  var video;
  function takePhoto() {
    if (typeof video === 'undefined') {
      video = document.createElement('video');
      video.style.position = 'absolute';
      video.style.top = (-textureHeight) + 'px';
      video.style.left = 0;
      video.style.display = 'none';
      document.body.appendChild(video);
      navigator.getUserMedia(
        {video:true},
        function(localMediaStream) {
          video.src = window.URL.createObjectURL(localMediaStream);
          video.autoplay = true;
          video.play();
          setTimeout(function() {
            takeInVideo(video);
          }, 3000);
        },
        function(error) {
          console.log(error);
        }
      );
    }
    else {
      takeInVideo(video);
    }
  }

  function takeInVideo(video) {
    var vw = video.videoWidth;
    var vh = video.videoHeight;
    var sx, sy, sw, sh;
    if (vh < vw) {
      sx = (vw - vh) / 2;
      sy = 0;
      sw = vh;
      sh = vh;
    }
    else {
      sx = 0;
      sy = (vh - vw) / 2;
      sw = vw;
      sh = vw;
    }
    textureContext.drawImage(video, sx, sy, sw, sh, 0, 0, textureWidth, textureHeight);
    texture.needsUpdate = true;
  }

  var mode = 'pen';
  var mouseLastPoint;
  var strokeConfig = {};

  document.getElementById('pen').addEventListener('click', function() {
    //if (paper.material.opacity === 0) clear(true);
    mode = 'pen';
    drawing = false;
    mouseLastPoint = undefined;
  });

  document.getElementById('scissors').addEventListener('click', function() {
    mode = 'scissors';
    drawing = false;
    contours.push([]);
    currentLines.forEach(function(line) {scene.remove(line);});
    currentLines = [];
  });

  document.getElementById('3d').addEventListener('click', function() {
    if (paper.material.opacity === 0) {
      clear(true);
      mode = 'pen';
      drawing = false;
      mouseLastPoint = undefined;
    }
    else {
      var hasOutline = false;
      scene.children.forEach(function(child) {
        if (child instanceof THREE.Line ||
          (child instanceof THREE.Mesh &&
           !(child.geometry instanceof THREE.PlaneGeometry))) {
          hasOutline = true;
          return;
        }
      });
      if (!hasOutline) retrieveOutline();
      if (contours.length !== 0 && contours[contours.length - 1] !== 0) {
        make3D();
      }
      else {
        resetScissors();
        controls.enabled = true;
      }
    }
  });

  document.getElementById('clear').addEventListener('click', function() {
    console.log(document.querySelector('html /deep/ #mesh').checked);
    clear();
  });

  document.querySelector('html /deep/ #camera').addEventListener('click', function() {
    takePhoto();
  });

  var meshSwitch = document.querySelector('html /deep/ #mesh');
  meshSwitch.addEventListener('change', function() {
    scene.children.forEach(function(body) {
      if (body instanceof THREE.Mesh && !(body.geometry instanceof THREE.PlaneGeometry)) {
        body.material.wireframe = meshSwitch.checked;
      }
    }, this);
  });

  renderer.domElement.addEventListener('mouseup', function() {
    if (paper.material.opacity === 0) return;
    drawing = false;
    contours.push([]);
    currentLines = [];
    mouseLastPoint = undefined;
  });

  renderer.domElement.addEventListener('mousedown', function(event) {
    if (paper.material.opacity === 0) return;
    ifOnPaperDo(event, function(obj) {
      drawing = true;
      strokeConfig['lineWidth'] = document.querySelector('html /deep/ #line-width').value;
      strokeConfig['lineColor'] = document.querySelector('html /deep/ #line-color').selected;
      if (mode === 'pen') drawLine(obj.point);
    });
  });

  renderer.domElement.addEventListener('mousemove', function(event) {
    if (paper.material.opacity === 0) return;
    if (!drawing) return;

    ifOnPaperDo(event, function(obj) {
      if (mode === 'pen') {
        drawLine(obj.point);
      }
      else if (mode === 'scissors') {
        if (!cutLine(obj.point)) {
          drawing = false;
          mouseLastPoint = undefined;
        }
      }
    });
  });

  renderer.domElement.addEventListener('touchend', function() {
    if (paper.material.opacity === 0) return;
    drawing = false;
    contours.push([]);
    currentLines = [];
    mouseLastPoint = undefined;
  });

  renderer.domElement.addEventListener('touchstart', function(event) {
    if (paper.material.opacity === 0) return;
    ifOnPaperDo(event.touches[0], function(obj) {
      drawing = true;
      strokeConfig['lineWidth'] = document.querySelector('html /deep/ #line-width').value;
      strokeConfig['lineColor'] = document.querySelector('html /deep/ #line-color').selected;
      if (mode === 'pen') drawLine(obj.point);
    });
  });

  renderer.domElement.addEventListener('touchmove', function(event) {
    event.preventDefault();

    if (paper.material.opacity === 0) return;
    if (!drawing) return;

    ifOnPaperDo(event.touches[0], function(obj) {
      if (mode === 'pen') {
        drawLine(obj.point);
      }
      else if (mode === 'scissors') {
        if (!cutLine(obj.point)) {
          drawing = false;
          mouseLastPoint = undefined;
        }
      }
    });
  });
};
