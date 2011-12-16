/**
 * Database backend for hangout statistics.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
StatisticsEntity = function(db) {
  AbstractEntity.call(this, db, 'statistics');
};
JSAPIHelper.inherits(StatisticsEntity, AbstractEntity);

/**
 * @see AbstractEntity.tableDefinition
 */
StatisticsEntity.prototype.tableDefinition = function() {
  return {
    hangout_id: 'TEXT',
    start_time: 'DATE',
    end_time: 'DATE',
    participants: 'TEXT' // Comma separated IDs
  };
};


/**
 * Backend that is responsible of handling hangout statistics.
 * @param {Database} db The database backend.
 * @constructor
 */
StatisticsBackend = function(db) {
  this.statisticsEntity = new StatisticsEntity(db);
};