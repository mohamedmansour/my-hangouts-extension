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
MomentCaptureBackend = function() {
  var db = openDatabase('My Hangouts', '1.0', 'my-hangouts', 10 * 1024 * 1024);
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

MomentCaptureBackend.prototype.deleteCapture = function(id, callback) {
  this.captureEntity.destroy(id, function(obj) {
    callback({status: obj.status});
  });
};

MomentCaptureBackend.prototype.findCapture = function(id, callback) {
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