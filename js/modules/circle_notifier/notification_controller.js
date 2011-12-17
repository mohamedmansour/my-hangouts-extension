NotificationController = function() {
  this.index = 0;
};

NotificationController.prototype.init = function() {
};

NotificationController.prototype.refresh = function(hangouts) {
  var ul = document.createElement('ul');
  $.each(hangouts, , function(user, hangout) {
    $('<li>' + user + ' - ' + hangout.id + '</li>').appendTo($(ul));
  });
  $(ul).appendTo($('body'));
};