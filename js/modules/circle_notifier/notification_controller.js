NotificationController = function() {
  this.index = 0;
};

NotificationController.prototype.init = function() {
  $(document).on('click', 'a.clickable', this.onLinkClicked);
};

/**
 * Forward click events to the extension.
 *
 * @param{MouseEvent} e The link which was clicked.
 */
NotificationController.prototype.onLinkClicked = function(e) {
  e.preventDefault();
  var href = $(e.target).attr('href');
  if (!href) {
    href = $(e.target).parent().attr('href');
  }
  chrome.tabs.create({url: href});
};

NotificationController.prototype.refresh = function(hangouts) {
  $('#hangouts-template').tmpl({hangouts: hangouts}).appendTo($('body'));
};
