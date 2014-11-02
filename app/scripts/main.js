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

Teddy.Skeleton = function() {
  this.bones = [];

  // TODO: terminal, sleeve, junctionはtriangleのタイプでした...
  this.terminalBones = []; // two external edges
  this.sleeveBones = [];   // one external edge
  this.junctionBones = []; // no external edges
};

Teddy.Skeleton.prototype.addBone = function(bone) {
  this.bones.push(bone);
};

Teddy.Skeleton.prototype.classifyBones = function() {
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

Teddy.Skeleton.prototype.drawBones = function(scene) {
  this.terminalBones.forEach(function(bone) {
    addLine(scene, bone.joint1.getPoint(), bone.joint2.getPoint());
  });
  this.sleeveBones.forEach(function(bone) {
    addLine(scene, bone.joint1.getPoint(), bone.joint2.getPoint());
  });
  this.junctionBones.forEach(function(bone) {
    addLine(scene, bone.joint1.getPoint(), bone.joint2.getPoint());
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

function addLine(scene, p1, p2) {
  var geometry = new THREE.Geometry();
  geometry.vertices.push(p1);
  geometry.vertices.push(p2);
  var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: 0xff0000}));
  scene.add(line);
}

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
  t: new THREE.MeshBasicMaterial({color: 0xffccff, ambient:0xffffff}),
  s: new THREE.MeshBasicMaterial({color: 0xffffff, ambient:0xffffff}),
  j: new THREE.MeshBasicMaterial({color: 0xffcccc, ambient:0xffffff})
};

var skeleton = new Teddy.Skeleton();
var tTriangles = [];
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
  var geometry = new THREE.Geometry();
  geometry.vertices.push(p0);
  geometry.vertices.push(p1);
  geometry.vertices.push(p2);
  geometry.faces.push(new THREE.Face3(0, 1, 2));
  var material = materials[triangleType.type];
  var mesh = new THREE.Mesh(geometry, material);
  mesh.userData['triangleType'] = triangleType;
  mesh.userData['triangle'] = triangle;
  mesh.userData['neighbors'] = []; // TODO
  scene.add(mesh);

  if (triangleType.type == 't') tTriangles.push(mesh);

  switch (triangleType.type) {
    case 't':
      tTriangles.push(mesh);
      if (triangleType.edges.toString() == '0,1,1,2') {
        skeleton.addBone(new Teddy.Bone(p1, c20));
      }
      else if (triangleType.edges.toString() == '1,2,2,0') {
        skeleton.addBone(new Teddy.Bone(p2, c01));
      }
      else if (triangleType.edges.toString() == '0,1,2,0') {
        skeleton.addBone(new Teddy.Bone(p0, c12));
      }
      break;
    case 's':
      if (triangleType.edges.toString() == '0,1') {
        skeleton.addBone(new Teddy.Bone(c12, c20));
      }
      else if (triangleType.edges.toString() == '1,2') {
        skeleton.addBone(new Teddy.Bone(c20, c01));
      }
      else if (triangleType.edges.toString() == '2,0') {
        skeleton.addBone(new Teddy.Bone(c01, c12));
      }
      break;
    case 'j':
      skeleton.addBone(new Teddy.Bone(c01, c012));
      skeleton.addBone(new Teddy.Bone(c12, c012));
      skeleton.addBone(new Teddy.Bone(c20, c012));
      break;
  }
});

skeleton.classifyBones();
skeleton.drawBones(scene);

tTriangles.forEach(function(mesh) {
  var edge = mesh.userData['triangleType'].edges[0];
  var e1 = Teddy.points[edge[0]];
  var e2 = Teddy.points[edge[1]];
  var triangle = mesh.userData['triangle'];
});

var geometry = new THREE.Geometry();
Teddy.points.forEach(function(point) {
  var p = point.clone();
  p.z += 0.001;
  geometry.vertices.push(p);
});
triangles.forEach(function(triangle) {
  geometry.faces.push(new THREE.Face3(triangle[0], triangle[1], triangle[2]));
});
var material = new THREE.MeshPhongMaterial({color: 0xffffff, ambient:0xffffff, wireframe:true});
var mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

renderer.render(scene, camera);
