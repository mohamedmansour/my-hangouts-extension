NotificationController = function() {
  this.index = 0;
};

NotificationController.prototype.init = function() {
};

NotificationController.prototype.refresh = function(hangouts) {
  $('#hangouts-template').tmpl({hangouts: hangouts}).appendTo($('body'));
};
