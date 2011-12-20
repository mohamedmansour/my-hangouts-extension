/**
 * Manages the notification popup.
 */
NotificationController = function() {
  this.index = 0;
  this.bkg = chrome.extension.getBackgroundPage();
};

/**
 * Initilizes the popup event listeners.
 */
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

/**
 * Refreshes the notification listing with the new hangouts.
 * @param {Object} hangouts a map of hangouts with the notified participants.
 */
NotificationController.prototype.refresh = function(hangouts) {
  $('#hangouts-container').html($('#hangouts-template').tmpl({hangouts: hangouts}));
};
