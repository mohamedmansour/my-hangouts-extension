NotificationController = function() {
  this.index = 0;
};

NotificationController.prototype.init = function() {
};

NotificationController.prototype.refresh = function() {
  $('h1').text('Important Hangout ' + (++this.index));
};