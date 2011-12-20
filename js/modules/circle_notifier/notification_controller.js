NotificationController = function() {
  this.index = 0;
  this.bkg = chrome.extension.getBackgroundPage();
};

NotificationController.prototype.init = function() {
  $(document).on('click', 'a.clickable', this.onLinkClicked.bind(this));
};

/**
 * Forward click events to the extension.
 * TODO: Reuse from popup
 * @param{MouseEvent} e The link which was clicked.
 */
NotificationController.prototype.onLinkClicked = function(e) {
  e.preventDefault();
  var href = $(e.target).attr('href');
  if (!href) {
    href = $(e.target).parent().attr('href');
  }
  this.bkg.controller.openSpecialWindow($(e.target), href);
};

NotificationController.prototype.refresh = function(hangouts) {
  $('#hangouts-template').tmpl({hangouts: hangouts}).appendTo($('body'));
};
