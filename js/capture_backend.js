/**
 * Database backend for capturing storing.
 *
 * @constructor
 */
CaptureEntity = function(db) {
  AbstractEntity.call(this, db, 'capture');
};
JSAPIHelper.inherits(CaptureEntity, AbstractEntity);

/**
 * @see AbstractEntity.tableDefinition
 */
CaptureEntity.prototype.tableDefinition = function() {
  return {
    hangout: 'TEXT',
    time: 'DATE',
    description: 'TEXT',
    active: 'TEXT',
    active_height: 'INTEGER',
    active_width: 'INTEGER',
    thumbnail: 'TEXT',
    thumbnail_height: 'INTEGER',
    thumbnail_width: 'INTEGER',
    type: 'INTEGER'
  };
};

/**
 * Backend that is responsible of handling captures.
 * @constructor
 */
CaptureBackend = function() {
  var db = openDatabase('My Hangouts', '1.0', 'my-hangouts', 10 * 1024 * 1024);
  this.captureEntity = new CaptureEntity(db);
  this.tempCapture = {};
};

/**
 * Find all captures in the database.
 */
CaptureBackend.prototype.findAll = function(callback) {
  this.captureEntity.findAll(callback);
};

/**
 * Store the image data temporary in memory. So we can manipulate it.
 */
CaptureBackend.prototype.storeTemporaryCapture = function(imageObj, callback) {
  this.tempCapture = imageObj;
  callback();
};

/**
 * Get the image data temporary from memory.
 */
CaptureBackend.prototype.previewTemporaryCapture = function(callback) {
  callback(this.tempCapture);
};

/**
 * Process the capture by creating thumbnails and persisting it to disk.
 */
CaptureBackend.prototype.processCapture = function(imageObj, callback) {
  this.captureEntity.create(imageObj, callback);
};

/**
 * Delete capture from the db.
 */
CaptureBackend.prototype.deleteCapture = function(id, callback) {
  this.captureEntity.destroy(id, function(obj) {
    callback({status: obj.status});
  });
};

/**
 * Find the capture by id.
 */
CaptureBackend.prototype.findCapture = function(id, callback) {
  this.captureEntity.find({_id: id}, function(obj) {
    var status = obj.status && obj.data.length > 0;
    var result = status ? obj.data[0] : obj.data;
    var res = {
      status: status,
      data: result
    }
    callback(res);
  });
};