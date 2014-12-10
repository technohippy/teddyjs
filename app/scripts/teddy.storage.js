'use strict';

var Teddy = Teddy || {};

Teddy.Storage = {};

Teddy.Storage.SERIARIZE_VERSION = '1';
Teddy.Storage.RESERVED_PREFIX = '__teddy__';
Teddy.Storage.MODELS_KEY = Teddy.Storage.RESERVED_PREFIX + 'models';

Teddy.Storage.isReservedKey = function(key) {
  return key.indexOf(Teddy.Storage.RESERVED_PREFIX) === 0;
};

Teddy.Storage.addModelName = function(modelName) {
  var models = JSON.parse(window.localStorage.getItem(Teddy.Storage.MODELS_KEY));
  if (!models) models = [];
  var index = models.indexOf(modelName);
  if (0 <= index) models.splice(index, 1);
  models.push(modelName);
  window.localStorage.setItem(Teddy.Storage.MODELS_KEY, JSON.stringify(models));
};

Teddy.Storage.setModel = function(modelName, meshes) {
  var serializedMeshes = meshes.map(function(mesh) {
    return mesh.userData['teddy'].serialize();
  });
  serializedMeshes.unshift(Teddy.Storage.SERIARIZE_VERSION);
  window.localStorage.setItem(modelName, JSON.stringify(serializedMeshes));
};

Teddy.Storage.getModels = function() {
  return JSON.parse(window.localStorage.getItem(Teddy.Storage.MODELS_KEY)) || [];
};

Teddy.Storage.hasModel = function(modelName) {
  if (typeof modelName === 'undefined') return false;

  var models = Teddy.Storage.getModels();
  return models.indexOf(modelName) < 0;
};

Teddy.Storage.getMesh = function(modelName, contourHandler, imageHandler) {
  var serializedMeshes = JSON.parse(window.localStorage.getItem(modelName));
  if (typeof serializedMeshes[0] === 'string') serializedMeshes.shift(); // remove version
  var meshLength = serializedMeshes.length;
  var currentMeshCount = 0;
  serializedMeshes.forEach(function(serializedMesh) {
    Teddy.Body.deserialize(serializedMesh, function(contour, image) {
      contourHandler(contour);
      currentMeshCount++;
      if (meshLength <= currentMeshCount) {
        imageHandler(image);
      }
    });
  });
};

Teddy.Storage.clearAll = function() {
  window.localStorage.clear();
};
