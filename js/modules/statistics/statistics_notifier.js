/**
 * Notifies the Statistics engine.
 */
StatisticsNotifier = function(controller) {
  this.controller = controller;
  this.backend = this.controller.getStatisticsBackend();
};

StatisticsNotifier.prototype.notify = function(myID, hangout) {
  console.log('Updating my hangout!');
};