/**
 * Options controller.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 */
OptionsController = function(popupController) {
  this.popup = popupController;
  this.settings = this.popup.bkg.settings;
  this.bkg = this.popup.bkg.controller;
};

OptionsController.prototype.init = function() {
  this.bindUI();
};

OptionsController.prototype.bindUI = function() {
  var self = this;
  
  // Setup circle notification preference.
  var circleChooserDOM = $('#option-circles');
  this.bkg.getCircles().forEach(function(circle, index) {
    circleChooserDOM.append($('<option value="' + circle.id + '">' + circle.name + '</option>'));
  });
  circleChooserDOM.val(this.settings.circles_to_notify);
  circleChooserDOM.attr('disabled', !self.settings.notify_circles);
  circleChooserDOM.chosen().change(function(e) {
    self.settings.circles_to_notify = $(e.target).val() || [];
    self.popup.resetNotifications();
  });
  
  // Notify circles preference.
  var circleNotifyDOM = $('#option-circles-notify');
  circleNotifyDOM.prop('checked', this.settings.notify_circles);
  circleNotifyDOM.change(function(e) {
    self.settings.notify_circles = $(e.target).is(':checked');
    circleChooserDOM.attr('disabled', !self.settings.notify_circles).trigger('liszt:updated');
    autocloseNotificationDOM.attr('disabled', !self.settings.notify_circles);
  });

  // Notify autoclose preference.
  var autocloseNotificationDOM = $('#option-auto-close-notify');
  autocloseNotificationDOM.prop('checked', this.settings.auto_close_notify);
  autocloseNotificationDOM.attr('disabled', !self.settings.notify_circles);
  autocloseNotificationDOM.change(function(e) {
    self.settings.auto_close_notify = $(e.target).is(':checked');
  });

  // Notify circles preference.
  var hangoutOpenWindowDOM = $('#option-hangout-window');
  hangoutOpenWindowDOM.prop('checked', this.settings.open_hangout_new_window);
  hangoutOpenWindowDOM.change(function(e) {
    self.settings.open_hangout_new_window = $(e.target).is(':checked');
  });
  
  // Skip dialog moment captures
  var momentSkipDialogCaptureDOM = $('#option-moment-quick');
  momentSkipDialogCaptureDOM.prop('checked', this.settings.moment_skip_dialog);
  momentSkipDialogCaptureDOM.change(function(e) {
    self.settings.moment_skip_dialog = $(e.target).is(':checked');
  });

  // Only show hangouts that are in your circles.
  var onlyShowCircleHangouts = $('#option-show-circle-hangouts');
  onlyShowCircleHangouts.prop('checked', this.settings.only_show_circle_hangouts);
  onlyShowCircleHangouts.change(function(e) {
    self.settings.only_show_circle_hangouts = $(e.target).is(':checked');
    self.popup.updateHangouts();
  });
  
  //
  var defaultPopupTabDOM = $('#option-default-popup-tab');
  defaultPopupTabDOM.val(this.settings.default_popup_tab);
  defaultPopupTabDOM.change(function(e) {
    self.settings.default_popup_tab = $(e.target).val() || 'hangouts';
  });
};
