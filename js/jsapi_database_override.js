/**
 * Override the JSAPI implementation for finding, since we require a map not
 * an array list. This implementation is a faster for this usecase instead of
 * processing a large list everytime.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 */
PersonEntity.prototype.findMap = function(callback) {
  var sql = 'SELECT person.id as id, person.email as email, person.name as name, person.photo as photo, ' +
      'person.location as location, person.employment as employment, person.occupation as occupation, ' +
      'person.score as score, person.in_my_circle as in_my_circle, person.added_me as added_me, ' +
      'circle.id as circle_id, circle.description as circle_description, circle.name as circle_name ' +
      'FROM person LEFT JOIN circle_person ON person.id = circle_person.person_id LEFT JOIN circle ON circle.id = circle_person.circle_id ' +
      'WHERE in_my_circle = ?';
  var self = this;
  this.db.readTransaction(function(tx) {
    tx.executeSql(sql, ['Y'], function (tx, rs) {
      var data = {};
      var prevID = null;
      for (var i = 0; i < rs.rows.length; i++) {
        var item = rs.rows.item(i);
        if (!item.id) {
          continue;
        }
        if (prevID == item.id) {
          data[prevID].circles.push(new CircleData({
            id: item.circle_id,
            name: item.circle_name,
            description: item.circle_description
          }));
        }
        else {
          prevID = item.id;
          data[prevID] = item;
          data[prevID].circles = [];
          if (item.circle_id) {
            data[prevID].circles.push(new CircleData({
              id: item.circle_id,
              name: item.circle_name,
              description: item.circle_description
            }));
          }
        }
      }
      self.fireCallback({status: true, data: data}, callback);
    });
  });
};

/**
 * Represents a circle model. We need an object so we could override the toString method.
 */
CircleData = function(obj) {
  this.id = obj.id;
  this.name = obj.name;
  this.description = obj.description;
  this.position = obj.position;
};

/**
 * Show the name when we print this object.
 */
CircleData.prototype.toString = function() {
  return this.name;
};

