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
  circleChooserDOM.chosen().change(function(e) {
    self.settings.circles_to_notify = $(e.target).val() || [];
  });
  
  // Notify circles preference.
  var circleNotifyDOM = $('#option-circles-notify');
  circleNotifyDOM.prop('checked', this.settings.notify_circles);
  circleNotifyDOM.change(function(e) {
    self.settings.notify_circles = $(e.target).is(':checked');
  });

  // Notify circles preference.
  var hangoutOpenWindowDOM = $('#option-hangout-window');
  hangoutOpenWindowDOM.prop('checked', this.settings.open_hangout_new_window);
  hangoutOpenWindowDOM.change(function(e) {
    self.settings.open_hangout_new_window = $(e.target).is(':checked');
  });
};