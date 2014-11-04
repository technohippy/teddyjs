var Teddy = Teddy || {};

Teddy.points = [
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
];

Teddy.outlineSize = Teddy.points.length;

Teddy.isOutline = function(i, j) {
  return (Math.abs(i - j) == 1) || (Math.abs(i - j) == Teddy.outlineSize - 1);
};

Teddy.getPointIndex = function(x, y, z) {
  var v = typeof y === 'undefined' ? x : new THREE.Vector3(x, y, z);
  for (var i = 0; i < Teddy.points.length; i++) {
    if (Teddy.points[i].equals(v)) return i;
  }
  Teddy.points.push(v);
  return Teddy.points.length - 1;
};

Teddy.Body = function() {
  this.bones = [];

  // TODO: terminal, sleeve, junctionはtriangleのタイプでした...
  this.terminalBones = []; // two external edges
  this.sleeveBones = [];   // one external edge
  this.junctionBones = []; // no external edges
};

Teddy.Body.prototype.addBone = function(bone) {
  this.bones.push(bone);
};

Teddy.Body.prototype.classifyBones = function() {
  this.bones.forEach(function(bone) {
    if (bone.isTerminal()) {
      this.terminalBones.push(bone);
    }
    else if (bone.isJunction()) {
      this.junctionBones.push(bone);
    }
    else if (bone.isSleeve()) {
      this.sleeveBones.push(bone);
    }
  }, this);
};

Teddy.Body.prototype.prunBones = function() {
  var prunedBones = [];
  this.terminalBones.forEach(function(tBone) {
    var checkPoints = [];
    var linkNodeIds = tBone.triangles[0].links[0];
    var linkPointIds = linkNodeIds.map(function(id) {return tBone.triangles[0].triangle[id]});
    var linkPoints = linkPointIds.map(function(id) {return Teddy.points[id]});
    var center = new THREE.Vector3(
      (linkPoints[0].x + linkPoints[1].x) / 2,
      (linkPoints[0].y + linkPoints[1].y) / 2,
      (linkPoints[0].z + linkPoints[1].z) / 2
    );
    var distance = center.distanceTo(linkPoints[0]);
    var pointIds = tBone.getAllPointIdsWithoutIds(linkPointIds);
    for (var i = 0; i < pointIds.length; i++) {
      var point = Teddy.points[pointIds[i]];
      // いきなり分割
      if (distance < center.distanceTo(point)) {
        prunedBones.push(tBone);
        var joint = tBone.joint1.isTerminal() ? tBone.joint2 : tBone.joint1;
        // TODO: 順序を調節
        joint.addTriangle(pointIds[0], linkPointIds[0], Teddy.getPointIndex(center));
        joint.addTriangle(pointIds[0], Teddy.getPointIndex(center), linkPointIds[1]);
        return;
      }
    }


  });

  var prunedBoneIds = prunedBones.map(function(bone) {
    return this.bones.indexOf(bone);
  }, this).sort().reverse();
  prunedBoneIds.forEach(function(id) {
    this.bones.splice(id, 1);
  }, this);
};

Teddy.Body.prototype.drawSkins = function(scene) {
  this.bones.forEach(function(bone) {
    var type =
      bone.isTerminal() ? 't' :
      bone.isSleeve() ? 's' :
      bone.isJunction() ? 'j' : '';
    bone.triangles.forEach(function(triangle) {
      displayTriangle(scene, triangle['triangle'], type);
    });
    bone.joint1.triangles.forEach(function(triangle) {
      displayTriangle(scene, triangle, type);
    });
    bone.joint2.triangles.forEach(function(triangle) {
      displayTriangle(scene, triangle, type);
    });
  });

  /*
  this.sleeveBones.forEach(function(bone) {
    bone.triangles.forEach(function(triangle) {
      displayTriangle(scene, triangle['triangle'], 's');
    });
  });

  this.junctionBones.forEach(function(bone) {
    bone.triangles.forEach(function(triangle) {
      displayTriangle(scene, triangle['triangle'], 'j');
    });
  });
  */
};

Teddy.Body.prototype.drawBones = function(scene) {
  this.bones.forEach(function(bone) {
    displayLine(scene, bone.joint1.getPoint(), bone.joint2.getPoint());
  });
};

Teddy.Bone = function(joint1, joint2) {
  if (joint1 instanceof THREE.Vector3) joint1 = Teddy.getPointIndex(joint1);
  if (joint2 instanceof THREE.Vector3) joint2 = Teddy.getPointIndex(joint2);
  if (typeof joint1 === 'number') joint1 = Teddy.getJoint(joint1);
  if (typeof joint2 === 'number') joint2 = Teddy.getJoint(joint2);

  this.joint1 = joint1;
  this.joint1.addBone(this);
  this.joint2 = joint2;
  this.joint2.addBone(this);
  this.triangles = [];
};

Teddy.Bone.prototype.nextJoint = function(joint) {
  return this.joint1 == joint ? this.joint2 : this.joint1;
};

Teddy.Bone.prototype.isTerminal = function() {
  return this.joint1.isTerminal() || this.joint2.isTerminal();
};

Teddy.Bone.prototype.isSleeve = function() {
  return this.joint1.isSleeve() || this.joint2.isSleeve();
};

Teddy.Bone.prototype.isJunction = function() {
  return this.joint1.isJunction() || this.joint2.isJunction();
};

Teddy.Bone.prototype.addTriangle = function(triangle) {
  this.triangles.push(triangle);
};

Teddy.Bone.prototype.getAllPointIds = function() {
  return this.getAllPointIdsWithoutIds([]);
};

Teddy.Bone.prototype.getAllPointIdsWithoutIds = function(ids) {
  var ret = [];
  this.triangles.forEach(function(triangle) {
    triangle.triangle.forEach(function(pointIndex) {
      if (ret.indexOf(pointIndex) < 0 && ids.indexOf(pointIndex) < 0) {
        ret.push(pointIndex);
      }
    });
  });
  return ret;
};

Teddy.Joints = [];

Teddy.getJoint = function(index) {
  for (var i = 0; i < Teddy.Joints.length; i++) {
    var joint = Teddy.Joints[i];
    if (joint.pointIndex === index) return joint;
  }
  var newJoint = new Teddy.Joint(index);
  Teddy.Joints.push(newJoint);
  return newJoint;
};

Teddy.Joint = function(index) {
  this.pointIndex = index;
  this.bones = [];
  this.triangles = [];
};

Teddy.Joint.prototype.getPoint = function() {
  return Teddy.points[this.pointIndex];
};

Teddy.Joint.prototype.addBone = function(bone) {
  if (this.bones.indexOf(bone) < 0) this.bones.push(bone);
};

Teddy.Joint.prototype.getBonesExcept = function(bone) {
  var ret = [];
  this.bones.forEach(function(b) {
    if (b != bone) ret.push(bone);
  });
  return ret;
};

Teddy.Joint.prototype.isTerminal = function() {
  return this.bones.length == 1;
};

Teddy.Joint.prototype.isSleeve = function() {
  return this.bones.length == 2;
};

Teddy.Joint.prototype.isJunction = function() {
  return this.bones.length == 3;
};

Teddy.Joint.prototype.addTriangle = function(x, y, z) {
  this.triangles.push([x, y, z]);
};








function getTriangleType(i, j, k) {
  var edges = [];
  if (Teddy.isOutline(i, j)) edges.push([0, 1]);
  if (Teddy.isOutline(j, k)) edges.push([1, 2]);
  if (Teddy.isOutline(k, i)) edges.push([2, 0]);

  switch (edges.length) {
    case 0: return {type:'j', edges:edges};
    case 1: return {type:'s', edges:edges};
    case 2: return {type:'t', edges:edges};
    default: throw 'error';
  }
}

function displayLine(scene, p1, p2) {
  var geometry = new THREE.Geometry();
  geometry.vertices.push(p1);
  geometry.vertices.push(p2);
  var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: 0xff0000}));
  scene.add(line);
}

function displayTriangle(scene, triangle, materialType) {
  var geometry = new THREE.Geometry();
  geometry.vertices.push(Teddy.points[triangle[0]]);
  geometry.vertices.push(Teddy.points[triangle[1]]);
  geometry.vertices.push(Teddy.points[triangle[2]]);
  geometry.faces.push(new THREE.Face3(0, 1, 2));
  var mesh = new THREE.Mesh(geometry, materials[materialType]);
  scene.add(mesh);
};

function triangulate(contour, useShapeUtil) {
  if (useShapeUtil) {
    return THREE.Shape.Utils.triangulateShape(contour, []);
  }
  else {
    var contourPT = [];
    var pointTable = {};
    contour.forEach(function(point, index) {
      if (!pointTable[point.x]) pointTable[point.x] = {};
      pointTable[point.x][point.y] = index;
      contourPT.push(new poly2tri.Point(point.x, point.y));
    });
    var swctx = new poly2tri.SweepContext(contourPT);
    swctx.triangulate();
    var triangles = swctx.getTriangles();
    var triangleIndex = [];
    triangles.forEach(function(triangle) {
      var points = triangle.points_;
      triangleIndex.push([
        pointTable[points[0].x][points[0].y],
        pointTable[points[1].x][points[1].y],
        pointTable[points[2].x][points[2].y]
      ]);
    });
    return triangleIndex;
  }
}

var triangles = triangulate(Teddy.points);

var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.z = 8;
scene.add(camera);

var light = new THREE.DirectionalLight(0xcccccc);
light.position = new THREE.Vector3(0.577, 0.577, -0.577);
scene.add(light);
var ambient = new THREE.AmbientLight(0x333333);
scene.add(ambient);

var materials = {
  t: new THREE.MeshBasicMaterial({color: 0xffffcc, ambient:0xffffff, wireframe:true}),
  s: new THREE.MeshBasicMaterial({color: 0xffffff, ambient:0xffffff, wireframe:true}),
  j: new THREE.MeshBasicMaterial({color: 0xffcccc, ambient:0xffffff, wireframe:true})
};

var teddy = new Teddy.Body();
triangles.forEach(function(triangle) {
  var t0 = triangle[0];
  var t1 = triangle[1];
  var t2 = triangle[2];
  var p0 = Teddy.points[t0];
  var p1 = Teddy.points[t1];
  var p2 = Teddy.points[t2];
  var c01 = new THREE.Vector3((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, 0.001);
  var c12 = new THREE.Vector3((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 0.001);
  var c20 = new THREE.Vector3((p2.x + p0.x) / 2, (p2.y + p0.y) / 2, 0.001);
  var c012 = new THREE.Vector3((p0.x + p1.x + p2.x) / 3, (p0.y + p1.y + p2.y) / 3, 0.001);

  var triangleType = getTriangleType(t0, t1, t2);

  switch (triangleType.type) {
    case 't':
      if (triangleType.edges.toString() == '0,1,1,2') {
        var bone = new Teddy.Bone(p1, c20);
        bone.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[2,0]]});
        teddy.addBone(bone);
      }
      else if (triangleType.edges.toString() == '1,2,2,0') {
        var bone = new Teddy.Bone(p2, c01);
        bone.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1]]});
        teddy.addBone(bone);
      }
      else if (triangleType.edges.toString() == '0,1,2,0') {
        var bone = new Teddy.Bone(p0, c12);
        bone.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[1,2]]});
        teddy.addBone(bone);
      }
      break;
    case 's':
      if (triangleType.edges.toString() == '0,1') {
        var bone = new Teddy.Bone(c12, c20);
        bone.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[1,2], [2,0]]});
        teddy.addBone(bone);
      }
      else if (triangleType.edges.toString() == '1,2') {
        var bone = new Teddy.Bone(c20, c01);
        bone.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[2,0], [0,1]]});
        teddy.addBone(bone);
      }
      else if (triangleType.edges.toString() == '2,0') {
        var bone = new Teddy.Bone(c01, c12);
        bone.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1], [1,2]]});
        teddy.addBone(bone);
      }
      break;
    case 'j':
      var bone1 = new Teddy.Bone(c01, c012);
      bone1.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1], [1,2], [2,0]]});
      teddy.addBone(bone1);
      var bone2 = new Teddy.Bone(c12, c012);
      bone2.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1], [1,2], [2,0]]});
      teddy.addBone(bone2);
      var bone3 = new Teddy.Bone(c20, c012);
      bone3.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1], [1,2], [2,0]]});
      teddy.addBone(bone3);
      break;
  }
});

teddy.classifyBones();
teddy.prunBones();
teddy.drawSkins(scene);
teddy.drawBones(scene);

renderer.render(scene, camera);
