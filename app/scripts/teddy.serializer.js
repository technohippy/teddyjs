'use strict';
//var exporter = new THREE.OBJExporter();

Teddy.SERIALIZER_VERSION = '0.1';

Teddy.Serializer = function() {
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

Teddy.Body.serializer = new Teddy.Serializer();

Teddy.Body.prototype.serialize = function() {
  return Teddy.Body.serializer.serialize(this);
};

Teddy.Body.deserialize = function(json, successHandler) {
  return Teddy.Body.serializer.deserialize(json, successHandler);
};
