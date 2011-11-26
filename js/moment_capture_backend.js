/**
 * Database backend for capturing storing.
 * @constructor
 */
CaptureEntity = function(db) {
  AbstractEntity.call(this, db, 'capture');
};
JSAPIHelper.inherits(CaptureEntity, AbstractEntity);

CaptureEntity.prototype.tableDefinition = function() {
  return {
    hangout: 'TEXT',
    time: 'DATE',
    description: 'TEXT',
    raw: 'TEXT',
    thumbnail: 'TEXt'
  };
};

/**
 * Backend that is responsible of handling captures.
 * @constructor
 */
MomentCaptureBackend = function(db) {
  this.captureEntity = new CaptureEntity(db);
};

MomentCaptureBackend.prototype.init = function() {
  this.captureEntity.count({}, function(count) {
    alert(count);
  });
};

MomentCaptureBackend.prototype.findAll = function(callback) {
  this.captureEntity.findAll(callback);
};

MomentCaptureBackend.prototype.processCapture = function(imageObj, callback) {
  // We do extra stuff here such as thumbnails.
  this.captureEntity.create(imageObj, callback);
};
