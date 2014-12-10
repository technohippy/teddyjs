// http://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf
'use strict';

var Teddy = Teddy || {};

Teddy.DIST_THRESHOLD = 0.001;

Teddy.Body = function(points, useWireframe) {
  this.points = points || [];
  this.outlineSize = this.points.length;
  this.joints = [];
  this.triangles = [];
  this.spines = [];
  this.mesh = undefined;
  this.material = new THREE.MeshPhongMaterial({color:0xffffff, wireframe:useWireframe});
  if (Teddy.Body.insntaces === undefined) Teddy.Body.instances = [];
  Teddy.Body.instances.push(this);
};

Teddy.Body.prototype.onOutline = function(pointId) {
  return pointId < this.outlineSize;
};

Teddy.Body.prototype.isOutline = function(pointId1, pointId2) {
  return this.onOutline(pointId1) &&
         this.onOutline(pointId2) &&
         ((Math.abs(pointId1 - pointId2) === 1) ||
          (Math.abs(pointId1 - pointId2) === this.outlineSize - 1));
};

Teddy.Body.prototype.getPointIndex = function(x, y, z) {
  var v = typeof y === 'undefined' ? x : new THREE.Vector3(x, y, z);
  for (var i = 0; i < this.points.length; i++) {
    if (this.points[i].distanceTo(v) < Teddy.DIST_THRESHOLD) return i;
  }
  this.points.push(v);
  return this.points.length - 1;
};

Teddy.Body.prototype.makeCCW = function(triangle, frontside) {
  var p0 = this.points[triangle[0]];
  var p1 = this.points[triangle[1]];
  var p2 = this.points[triangle[2]];

  var v01 = p1.clone().sub(p0);
  var v02 = p2.clone().sub(p0);
  if ((frontside && v01.cross(v02).z < 0) || (!frontside && v01.cross(v02).z > 0)) {
    return [triangle[0], triangle[2], triangle[1]];
  }
  else {
    return triangle;
  }
};

Teddy.Body.prototype.getJoint = function(index) {
  for (var i = 0; i < this.joints.length; i++) {
    var joint = this.joints[i];
    if (joint.pointIndex === index) return joint;
  }
  var newJoint = new Teddy.Joint(this, index);
  this.joints.push(newJoint);
  return newJoint;
};

Teddy.Body.prototype.triangulate = function() {
  var contourPT = [];
  var pointTable = {};
  this.points.forEach(function(point, index) {
    if (!pointTable[point.x]) pointTable[point.x] = {};
    pointTable[point.x][point.y] = index;
    contourPT.push(new poly2tri.Point(point.x, point.y));
  });
  var swctx = new poly2tri.SweepContext(contourPT);
  swctx.triangulate();
  var triangles = swctx.getTriangles();
  triangles.forEach(function(triangle) {
    var points = triangle.points_;
    this.triangles.push([
      pointTable[points[0].x][points[0].y],
      pointTable[points[1].x][points[1].y],
      pointTable[points[2].x][points[2].y]
    ]);
  }, this);
};

Teddy.Body.prototype.retrieveSpines = function() {
  this.triangles.forEach(function(triangle) {
    var t0 = triangle[0];
    var t1 = triangle[1];
    var t2 = triangle[2];
    var p0 = this.points[t0];
    var p1 = this.points[t1];
    var p2 = this.points[t2];
    var c01 = new THREE.Vector3((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, 0);
    var c12 = new THREE.Vector3((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 0);
    var c20 = new THREE.Vector3((p2.x + p0.x) / 2, (p2.y + p0.y) / 2, 0);
    var c012 = new THREE.Vector3((p0.x + p1.x + p2.x) / 3, (p0.y + p1.y + p2.y) / 3, 0);

    var triangleType = function(i, j, k) {
      var edges = [];
      if (this.isOutline(i, j)) edges.push([0, 1]);
      if (this.isOutline(j, k)) edges.push([1, 2]);
      if (this.isOutline(k, i)) edges.push([2, 0]);

      switch (edges.length) {
        case 0: return {type:'j', edges:edges};
        case 1: return {type:'s', edges:edges};
        case 2: return {type:'t', edges:edges};
        default: throw 'error';
      }
    }.bind(this)(t0, t1, t2);

    var spine;
    switch (triangleType.type) {
      case 't':
        if (triangleType.edges.toString() === '0,1,1,2') {
          spine = new Teddy.Spine(this, p1, c20);
          spine.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[2,0]]});
          this.addSpine(spine);
        }
        else if (triangleType.edges.toString() === '1,2,2,0') {
          spine = new Teddy.Spine(this, p2, c01);
          spine.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1]]});
          this.addSpine(spine);
        }
        else if (triangleType.edges.toString() === '0,1,2,0') {
          spine = new Teddy.Spine(this, p0, c12);
          spine.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[1,2]]});
          this.addSpine(spine);
        }
        break;
      case 's':
        if (triangleType.edges.toString() === '0,1') {
          spine = new Teddy.Spine(this, c12, c20);
          spine.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[1,2], [2,0]]});
          this.addSpine(spine);
        }
        else if (triangleType.edges.toString() === '1,2') {
          spine = new Teddy.Spine(this, c20, c01);
          spine.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[2,0], [0,1]]});
          this.addSpine(spine);
        }
        else if (triangleType.edges.toString() === '2,0') {
          spine = new Teddy.Spine(this, c01, c12);
          spine.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1], [1,2]]});
          this.addSpine(spine);
        }
        break;
      case 'j':
        var spine1 = new Teddy.Spine(this, c01, c012);
        spine1.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1], [1,2], [2,0]]});
        this.addSpine(spine1);
        var spine2 = new Teddy.Spine(this, c12, c012);
        spine2.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1], [1,2], [2,0]]});
        this.addSpine(spine2);
        var spine3 = new Teddy.Spine(this, c20, c012);
        spine3.addTriangle({triangle:triangle, edges:triangleType.edges, links:[[0,1], [1,2], [2,0]]});
        this.addSpine(spine3);
        break;
    }
  }, this);
};

Teddy.Body.prototype.addSpine = function(spine) {
  this.spines.push(spine);
};

Teddy.Body.prototype.prunSpines = function() {
  var prunedSpines = [];
  this.spines.forEach(function(tSpine) {
    if (!tSpine.isTerminal()) return;

    var currentSpine = tSpine;
    var currentJoint = currentSpine.joint1.isTerminal() ? currentSpine.joint1 : currentSpine.joint2;
    var checkPointIds = [];
    var linkPointIdsMapper = function(id) {return this.points[id];}.bind(this);
    var pointIdIter = function(pointId) {checkPointIds.push(pointId);};
    var checkPointIdSorter = function(a, b) {return a === b ? 0 : a < b ? -1 : 1;};
    var checkPointId;
    var ii;
    do {
      prunedSpines.push(currentSpine);
      currentJoint = currentSpine.getNextJoint(currentJoint);

      var linkPointIds = currentSpine.getEdgeIdsIncluding(currentJoint.getPoint());
      var linkPoints = linkPointIds.map(linkPointIdsMapper);
      var center = currentJoint.getPoint();
      var distance = center.distanceTo(linkPoints[0]);
      currentSpine.getAllPointIdsWithoutIds(linkPointIds).forEach(pointIdIter, this);
      for (var i = 0; i < checkPointIds.length; i++) {
        var point = this.points[checkPointIds[i]];
        if (distance < center.distanceTo(point)) {
          checkPointIds.push(linkPointIds[0]);
          checkPointIds.push(linkPointIds[1]);
          checkPointIds = checkPointIds.sort(checkPointIdSorter);
          checkPointId = checkPointIds.shift();
          for (ii = 0; ii < checkPointIds.length + 1; ii++) {
            checkPointIds.push(checkPointId);
            if (checkPointIds[0] === checkPointId + 1) {
              checkPointId = checkPointIds.shift();
            }
            else {
              break;
            }
          }
          for (ii = 1; ii < checkPointIds.length; ii++) {
            currentJoint.addTriangle(
              checkPointIds[ii-1],
              checkPointIds[ii],
              this.getPointIndex(center)
            );
          }
          return;
        }
      }

      currentSpine = currentJoint.getSpinesExcept(currentSpine)[0];

      if (currentSpine.isJunction()) {
        // TODO: need refactoring
        prunedSpines.push(currentSpine);
        linkPointIds.forEach(pointIdIter);
        currentJoint = currentSpine.getNextJoint(currentJoint);
        center = currentJoint.getPoint();
        checkPointIds = checkPointIds.sort(checkPointIdSorter);
        checkPointId = checkPointIds.shift();
        for (ii = 0; ii < checkPointIds.length + 1; ii++) {
          checkPointIds.push(checkPointId);
          if (checkPointIds[0] === checkPointId + 1) {
            checkPointId = checkPointIds.shift();
          }
          else {
            break;
          }
        }
        for (ii = 1; ii < checkPointIds.length; ii++) {
          currentJoint.addTriangle(
            checkPointIds[ii-1],
            checkPointIds[ii],
            this.getPointIndex(center)
          );
        }
        return;
      }
      else if (currentSpine.isSleeve()) {
        // go next
      }
      else if (currentSpine.isTerminal()) {
        throw 'ERROR: cannot handle this geometry';
      }
    } while (typeof currentSpine !== 'undefined');
  }, this);

  prunedSpines.map(function(spine) {
    return this.spines.indexOf(spine);
  }, this).sort(function(a, b) {
    return a === b ? 0 : a < b ? 1 : -1;
  }).forEach(function(id) {
    this.spines.splice(id, 1);
  }, this);

  this.spines.forEach(function(spine) {
    var triangle = spine.triangles[0].triangle;
    spine.triangles = [];
    var isJunction = true;
    [[0, 1, 2], [1, 2, 0], [2, 0, 1]].forEach(function(ijk) {
      var i = ijk[0], j = ijk[1], k = ijk[2];
      if (this.isOutline(triangle[i], triangle[j])) {
        isJunction = false;
        spine.joint1.addTriangle(triangle[i], triangle[j], spine.joint1.pointIndex);
        spine.triangles.push({triangle:[triangle[i], spine.joint1.pointIndex, spine.joint2.pointIndex]});
        spine.triangles.push({triangle:[triangle[k], spine.joint1.pointIndex, spine.joint2.pointIndex]});
        return;
      }
    }, this);
    if (isJunction) {
      // junction
      var p0 = this.points[triangle[0]];
      var p1 = this.points[triangle[1]];
      var p2 = this.points[triangle[2]];
      var center = new THREE.Vector3(
        (p0.x + p1.x + p2.x) / 3,
        (p0.y + p1.y + p2.y) / 3,
        (p0.z + p1.z + p2.z) / 3
      );
      var jp1 = spine.joint1.getPoint();
      var jp2 = spine.joint2.getPoint();
      var joints = jp1.distanceTo(center) < jp2.distanceTo(center) ? [spine.joint2, spine.joint1] : [spine.joint1, spine.joint2];
      var edgeJoint = joints[0];
      var centerJoint = joints[1];
      var l01 = p0.clone().add(p1).multiplyScalar(0.5).distanceTo(edgeJoint.getPoint());
      var l12 = p1.clone().add(p2).multiplyScalar(0.5).distanceTo(edgeJoint.getPoint());
      var l20 = p2.clone().add(p0).multiplyScalar(0.5).distanceTo(edgeJoint.getPoint());
      if (l01 <= l12 && l01 <= l20) {
        spine.triangles.push({triangle:[triangle[0], edgeJoint.pointIndex, centerJoint.pointIndex]});
        spine.triangles.push({triangle:[triangle[1], edgeJoint.pointIndex, centerJoint.pointIndex]});
      }
      else if (l12 <= l01 && l12 <= l20) {
        spine.triangles.push({triangle:[triangle[1], edgeJoint.pointIndex, centerJoint.pointIndex]});
        spine.triangles.push({triangle:[triangle[2], edgeJoint.pointIndex, centerJoint.pointIndex]});
      }
      else if (l20 <= l01 && l20 <= l12) {
        spine.triangles.push({triangle:[triangle[2], edgeJoint.pointIndex, centerJoint.pointIndex]});
        spine.triangles.push({triangle:[triangle[0], edgeJoint.pointIndex, centerJoint.pointIndex]});
      }
      else {
        throw 'never reach';
      }
    }
  }, this);
};

Teddy.Body.prototype.elevateSpines = function() {
  this.spines.forEach(function(spine) {
    spine.elevate();
  }, this);
};

Teddy.Body.prototype.sewSkins = function() {
  this.spines.forEach(function(spine) {
    var newSpineTriangles = [];
    spine.elevatedTriangles.forEach(function(triangle) {
      this.sewTriangle(triangle, newSpineTriangles, true);
    }, this);
    spine.droppedTriangles.forEach(function(triangle) {
      this.sewTriangle(triangle, newSpineTriangles, false);
    }, this);
    spine.triangles = newSpineTriangles;

    if (!spine.joint1.triangulated) {
      var newJoint1Triangles = [];
      spine.joint1.elevatedTriangles.forEach(function(triangle) {
        this.sewTriangle(triangle, newJoint1Triangles, true);
      }, this);
      spine.joint1.droppedTriangles.forEach(function(triangle) {
        this.sewTriangle(triangle, newJoint1Triangles, false);
      }, this);
      spine.joint1.triangles = newJoint1Triangles;
      spine.joint1.triangulated = true;
    }

    if (!spine.joint2.triangulated) {
      var newJoint2Triangles = [];
      spine.joint2.elevatedTriangles.forEach(function(triangle) {
        this.sewTriangle(triangle, newJoint2Triangles, true);
      }, this);
      spine.joint2.droppedTriangles.forEach(function(triangle) {
        this.sewTriangle(triangle, newJoint2Triangles, false);
      }, this);
      spine.joint2.triangles = newJoint2Triangles;
      spine.joint2.triangulated = true;
    }
  }, this);
};

Teddy.Body.prototype.sewTriangle = function(triangle, bag, frontside) {
  var p0 = this.points[triangle[0]];
  var p1 = this.points[triangle[1]];
  var p2 = this.points[triangle[2]];
  var highs = [];
  var lows = [];
  (Math.abs(p0.z) < 0.0001 ? lows : highs).push(p0);
  (Math.abs(p1.z) < 0.0001 ? lows : highs).push(p1);
  (Math.abs(p2.z) < 0.0001 ? lows : highs).push(p2);

  var points1 = [];
  var highPoint = highs[0];
  var lowPoint = lows[0];
  var height = highPoint.z;
  var projectedSlope = lowPoint.clone().sub(highPoint.clone().setZ(lowPoint.z));
  var width = projectedSlope.length();
  var rad, l, h;
  for (var deg = 0; deg <= 90; deg += 10) {
    rad = deg / 180 * Math.PI;
    l = width * Math.cos(rad);
    h = height * Math.sin(rad);
    points1.push(new THREE.Vector3(
      highPoint.x + l/width*projectedSlope.x,
      highPoint.y + l/width*projectedSlope.y,
      h
    ));
  }

  var points2 = [];
  highPoint = highs[highs.length - 1];
  lowPoint = lows[lows.length - 1];
  height = highPoint.z;
  projectedSlope = lowPoint.clone().sub(highPoint.clone().setZ(lowPoint.z));
  width = projectedSlope.length();
  for (deg = 0; deg <= 90; deg += 10) {
    rad = deg / 180 * Math.PI;
    l = width * Math.cos(rad);
    h = height * Math.sin(rad);
    points2.push(new THREE.Vector3(
      highPoint.x + l/width*projectedSlope.x,
      highPoint.y + l/width*projectedSlope.y,
      h
    ));
  }

  if (points1[0].distanceTo(points2[0]) < 0.0001) {
    points1 = points1.reverse();
    points2 = points2.reverse();
  }
  var point = [];
  point.push(this.getPointIndex(points1.pop()));
  points2.pop(); // throw away
  point.push(this.getPointIndex(points1[points1.length - 1]));
  point.push(this.getPointIndex(points2[points2.length - 1]));
  // TODO bag.push(this.makeCCW(triangle, frontside)); return
  bag.push(this.makeCCW(point, frontside));
  for (var i = 1; i < points1.length; i++) {
    bag.push(this.makeCCW([
      this.getPointIndex(points1[i-1]),
      this.getPointIndex(points2[i-1]),
      this.getPointIndex(points1[i])
    ], frontside));
    bag.push(this.makeCCW([
      this.getPointIndex(points2[i-1]),
      this.getPointIndex(points2[i]),
      this.getPointIndex(points1[i])
    ], frontside));
  }
};

Teddy.Body.prototype.buildMesh = function() {
  var geometry = new THREE.Geometry();
  this.points.forEach(function(point) {
    geometry.vertices.push(point);
  }, this);

  this.spines.forEach(function(spine) {
    spine.triangles.forEach(function(triangle) {
      geometry.faces.push(new THREE.Face3(triangle[0], triangle[1], triangle[2]));
    }, this);
    spine.joint1.triangles.forEach(function(triangle) {
      geometry.faces.push(new THREE.Face3(triangle[0], triangle[1], triangle[2]));
    }, this);
    spine.joint2.triangles.forEach(function(triangle) {
      geometry.faces.push(new THREE.Face3(triangle[0], triangle[1], triangle[2]));
    }, this);
  }, this);
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();

  this.mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: 0xffffff, wireframe:false}));
  this.mesh.userData['teddy'] = this;
};

Teddy.Body.prototype.smoothMesh = function() {
  if (typeof this.mesh === 'undefined') return;

  var table = {};
  var geometry = this.mesh.geometry;
  geometry.faces.forEach(function(face) {
    if (typeof table[face.a] === 'undefined') table[face.a] = [];
    if (typeof table[face.b] === 'undefined') table[face.b] = [];
    if (typeof table[face.c] === 'undefined') table[face.c] = [];
    table[face.a].push(face.b);
    table[face.a].push(face.c);
    table[face.b].push(face.c);
    table[face.b].push(face.a);
    table[face.c].push(face.a);
    table[face.c].push(face.b);
  }, this);
  Object.keys(table).forEach(function(key) {
    var pointIds = table[key];
    var avePoint = new THREE.Vector3();
    pointIds.forEach(function(pointId) {
      avePoint.add(geometry.vertices[pointId]);
    }, this);
    avePoint.multiplyScalar(1 / pointIds.length);
    table[key] = avePoint;
  }, this);
  Object.keys(table).forEach(function(key) {
    geometry.vertices[key].copy(table[key]);
  }, this);
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();
};

Teddy.Body.prototype.debugAddSpineMeshes = function(scene) {
  this.spines.forEach(function(spine) {
    var geometry = new THREE.Geometry();
    geometry.vertices.push(this.points[spine.joint1.elevatedPointIndex]);
    geometry.vertices.push(this.points[spine.joint2.elevatedPointIndex]);
    var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: 0xff0000, linewidth:4}));
    scene.add(line);
  }, this);

};

Teddy.Body.prototype.getMesh = function() {
  if (!this.mesh) {
    this.triangulate();
    this.retrieveSpines();
    this.prunSpines();
    this.elevateSpines();
    this.sewSkins();
    this.buildMesh();
    for (var i = 0; i < 5; i++) this.smoothMesh();
  }
  return this.mesh;
};

Teddy.Body.prototype.getMeshAsync = function(successHandler, errorHandler, afterHandler) {
  if (!this.mesh) {
    var worker = new Worker('scripts/teddy.worker.js');
    worker.addEventListener('message', function(event) {
      var geometry = new THREE.Geometry();
      if (event.data.status) {
        var geometryData = event.data.geometry;
        for (var key in geometryData) {
          if (key === 'id' || key === 'uuid') continue;
          geometry[key] = geometryData[key];
        }

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.userData['teddy'] = this;
        successHandler(this);
        afterHandler(this);
      }
      else {
        errorHandler(event.data.error);
        afterHandler(this);
      }
    }.bind(this));
    worker.postMessage(this.points);
  }
  else {
    successHandler(this);
    afterHandler(this);
  }
};

Teddy.Spine = function(body, joint1, joint2) {
  this.body = body;
  if (joint1 instanceof THREE.Vector3) joint1 = this.body.getPointIndex(joint1);
  if (joint2 instanceof THREE.Vector3) joint2 = this.body.getPointIndex(joint2);
  if (typeof joint1 === 'number') joint1 = this.body.getJoint(joint1);
  if (typeof joint2 === 'number') joint2 = this.body.getJoint(joint2);
  this.joint1 = joint1;
  this.joint1.addSpine(this);
  this.joint2 = joint2;
  this.joint2.addSpine(this);
  this.triangles = [];
  this.elevatedTriangles = [];
  this.droppedTriangles = [];
};

Teddy.Spine.prototype.getEdgeIdsIncluding = function(point) {
  var ret = [];
  this.triangles.forEach(function(triangle) {
    var pointIds = triangle.triangle;
    [[0,1], [1,2], [2,0]].forEach(function(edgeIds) {
      var pi1 = pointIds[edgeIds[0]];
      var pi2 = pointIds[edgeIds[1]];
      var p1 = this.body.points[pi1];
      var p2 = this.body.points[pi2];
      var center = p1.clone().add(p2).multiplyScalar(0.5);
      if (center.distanceTo(point) < 0.01) {
        ret.push(pi1);
        ret.push(pi2);
        return;
      }
    }, this);
  }, this);
  return ret;
};

Teddy.Spine.prototype.getNextJoint = function(joint) {
  return this.joint1 === joint ? this.joint2 : this.joint1;
};

Teddy.Spine.prototype.isTerminal = function() {
  return this.joint1.isTerminal() || this.joint2.isTerminal();
};

Teddy.Spine.prototype.isSleeve = function() {
  return this.joint1.isSleeve() || this.joint2.isSleeve();
};

Teddy.Spine.prototype.isJunction = function() {
  return this.joint1.isJunction() || this.joint2.isJunction();
};

Teddy.Spine.prototype.addTriangle = function(triangle) {
  this.triangles.push(triangle);
};

Teddy.Spine.prototype.getAllPointIds = function() {
  return this.getAllPointIdsWithoutIds([]);
};

Teddy.Spine.prototype.getAllPointIdsWithoutIds = function(ids) {
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

Teddy.Spine.prototype.elevate = function() {
  if (typeof this.joint1 !== 'undefined') this.joint1.elevate();
  if (typeof this.joint1 !== 'undefined') this.joint2.elevate();

  this.triangles.forEach(function(triangle) {
    var elevatedTriangle = [];
    var droppedTriangle = [];
    triangle.triangle.forEach(function(pointIndex) {
      if (pointIndex === this.joint1.pointIndex) {
        elevatedTriangle.push(this.joint1.elevatedPointIndex);
        droppedTriangle.push(this.joint1.droppedPointIndex);
      }
      else if (pointIndex === this.joint2.pointIndex) {
        elevatedTriangle.push(this.joint2.elevatedPointIndex);
        droppedTriangle.push(this.joint2.droppedPointIndex);
      }
      else {
        elevatedTriangle.push(pointIndex);
        droppedTriangle.push(pointIndex);
      }
    }, this);
    this.elevatedTriangles.push(elevatedTriangle);
    this.droppedTriangles.push(droppedTriangle);
  }, this);
};

Teddy.Spine.prototype.isEqual = function(that) {
  var thisJ1 = typeof this.joint1 === 'undefined' ? -1 : this.joint1.pointIndex;
  var thisJ2 = typeof this.joint2 === 'undefined' ? -1 : this.joint2.pointIndex;
  var thatJ1 = typeof that.joint1 === 'undefined' ? -1 : that.joint1.pointIndex;
  var thatJ2 = typeof that.joint2 === 'undefined' ? -1 : that.joint2.pointIndex;

  return (thisJ1 === thatJ1 && thisJ2 === thatJ2) ||
    (thisJ1 === thatJ2 && thisJ2 === thatJ1);
};

Teddy.Spine.prototype.toString = function() {
  var thisJ1 = typeof this.joint1 === 'undefined' ? -1 : this.joint1.pointIndex;
  var thisJ2 = typeof this.joint2 === 'undefined' ? -1 : this.joint2.pointIndex;

  return '' + thisJ1 + ',' + thisJ2;
};

Teddy.Joint = function(body, index) {
  this.body = body;
  this.pointIndex = index;
  this.spines = [];
  this.triangles = [];

  this.elevatedPointIndex = undefined;
  this.droppedPointIndex = undefined;
  this.elevatedTriangles = [];
  this.droppedTriangles = [];
  this.elevated = false;
  this.triangulated = false;
};

Teddy.Joint.prototype.getPoint = function() {
  return this.body.points[this.pointIndex];
};

Teddy.Joint.prototype.getElevatedPoint = function() {
  return this.body.points[this.elevatedPointIndex];
};

Teddy.Joint.prototype.getDroppedPoint = function() {
  return this.body.points[this.droppedPointIndex];
};

Teddy.Joint.prototype.addSpine = function(spine) {
  if (this.spines.indexOf(spine) < 0) this.spines.push(spine);
};

Teddy.Joint.prototype.getSpinesExcept = function(spine) {
  var ret = [];
  this.spines.forEach(function(b) {
    if (!b.isEqual(spine)) ret.push(b);
  });
  return ret;
};

Teddy.Joint.prototype.isTerminal = function() {
  return this.spines.length === 1;
};

Teddy.Joint.prototype.isSleeve = function() {
  return this.spines.length === 2;
};

Teddy.Joint.prototype.isJunction = function() {
  return this.spines.length === 3;
};

Teddy.Joint.prototype.addTriangle = function(x, y, z) {
  this.triangles.push([x, y, z]);
};

Teddy.Joint.prototype.isNear = function(joint) {
  return this.getPoint().distanceTo(joint.getPoint()) < Teddy.DIST_THRESHOLD;
};

Teddy.Joint.prototype.elevate = function() {
  if (this.elevated) return;
  this.elevated = true;

  var allPointIds = [];
  this.spines.forEach(function(spine) {
    spine.triangles.forEach(function(triangle) {
      allPointIds.push(triangle.triangle[0]);
      allPointIds.push(triangle.triangle[1]);
      allPointIds.push(triangle.triangle[2]);
    }, this);
  }, this);
  this.triangles.forEach(function(triangle) {
    allPointIds.push(triangle[0]);
    allPointIds.push(triangle[1]);
    allPointIds.push(triangle[2]);
  }, this);

  var pointIds = [];
  allPointIds.forEach(function(pointId) {
    if (pointIds.indexOf(pointId) < 0 && this.body.onOutline(pointId)) {
      pointIds.push(pointId);
    }
  }, this);

  var jointPoint = this.getPoint();
  var sumDistance = 0;
  pointIds.forEach(function(pointId) {
    sumDistance += this.body.points[pointId].distanceTo(jointPoint);
  }, this);
  var aveDistance = sumDistance / pointIds.length;

  this.elevatedPointIndex = this.body.getPointIndex(this.getPoint().clone().setZ(aveDistance));
  this.droppedPointIndex = this.body.getPointIndex(this.getPoint().clone().setZ(-aveDistance));

  this.triangles.forEach(function(triangle) {
    var elevatedTriangle = [];
    var droppedTriangle = [];
    triangle.forEach(function(pointIndex) {
      if (pointIndex === this.pointIndex) {
        elevatedTriangle.push(this.elevatedPointIndex);
        droppedTriangle.push(this.droppedPointIndex);
      }
      else {
        elevatedTriangle.push(pointIndex);
        droppedTriangle.push(pointIndex);
      }
    }, this);
    this.elevatedTriangles.push(elevatedTriangle);
    this.droppedTriangles.push(droppedTriangle);
  }, this);
};
