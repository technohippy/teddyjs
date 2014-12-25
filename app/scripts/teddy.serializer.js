'use strict';

Teddy.SERIALIZER_VERSION = '0.1';

Teddy.Serializer = function() {
};

Teddy.Serializer.zipMeshes = function(meshes, format) {
  if (format === 'obj' || typeof format === 'undefined') {
    return Teddy.Serializer.zipMeshesAsObj(meshes);
  }
  else if (format === 'stl') {
    return Teddy.Serializer.zipMeshesAsStl(meshes);
  }
  else {
    throw 'Unknown format: ' + format;
  }
};

Teddy.Serializer.zipMeshesAsObj = function(meshes) {
  var zip = new JSZip();
  meshes.forEach(function(mesh, i) {
    var obj = 'mtllib texture.mtl\n' +
              'usemtl texture\n' + 
              new THREE.OBJExporter().parse(mesh.geometry, 5.0);
    zip.file("mesh" + i + ".obj", obj);
  }, this);

  var mtl = 'newmtl texture\n' +
            'Ka 0.25000 0.25000 0.25000\n' +
            'Kd 1.00000 1.00000 1.00000\n' +
            'Ks 1.00000 1.00000 1.00000\n' +
            'Ns 5.00000\n' +
            'map_Kd images/texture.jpg';
  zip.file("texture.mtl", mtl);

  var imgData = Teddy.UI.getTextureCanvas().toDataURL('image/jpeg', 1.0);
  var img = zip.folder("images");
  img.file("texture.jpg", imgData.substring('data:image/jpeg;base64,'.length), {base64: true});
  return zip;
};

Teddy.Serializer.zipMeshesAsStl = function(meshes) {
  var zip = new JSZip();
  var stl = new THREE.STLExporter().parse({
    traverse: function(visitor) {
      meshes.forEach(visitor);
    }
  }, 5.0);
  zip.file("mesh.stl", stl);
  return zip;
};

Teddy.Serializer.prototype.serialize = function(body) {
  var serializedTexture = this.serializeTexture(body);
  var serizlizedContour = this.serializeContour(body);
  return {texture:serializedTexture, contour:serizlizedContour};
};

Teddy.Serializer.prototype.serializeTexture = function(body) {
  var texture = body.mesh.material.map;
  var canvas = texture.image;
  return canvas.toDataURL();
};

Teddy.Serializer.prototype.serializeContour = function(body) {
  var serializedContour = [];
  body.points.forEach(function(point) {
    serializedContour.push([point.x, point.y, point.z]);
  }, this);
  return serializedContour;
};

Teddy.Serializer.prototype.deserialize = function(json, successHandler) {
  var contour = json.contour.map(function(point) {
    return {x:point[0], y:point[1], z:point[2]};
  }, this);

  var body = new Teddy.Body(json.contour.map(function(point) {
    return new THREE.Vector3(point[0], point[1], point[2]);
  }, this));

  var image = new Image();
  image.onload = function() {
    successHandler(contour, image);
  };
  image.src = json.texture;
};

//

Teddy.zipMeshes = Teddy.Serializer.zipMeshes;

Teddy.Body.serializer = new Teddy.Serializer();

Teddy.Body.prototype.serialize = function() {
  return Teddy.Body.serializer.serialize(this);
};

Teddy.Body.deserialize = function(json, successHandler) {
  return Teddy.Body.serializer.deserialize(json, successHandler);
};
