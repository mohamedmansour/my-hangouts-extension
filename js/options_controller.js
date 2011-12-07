OptionsController = function(popupController) {
  this.popup = popupController;
  this.settings = this.popup.bkg.settings;
  this.bkg = this.popup.bkg.controller;
};

OptionsController.prototype.init = function() {
  this.bindUI();
};

OptionsController.prototype.bindUI = function() {
  // Setup circle notification
  var circleChooserDOM = $('#option-circles');
  this.bkg.getCircles().forEach(function(circle, index) {
    circleChooserDOM.append($('<option value="' + circle.id + '">' + circle.name + '</option>'));
  });
  circleChooserDOM.val(this.settings.notify_circles);
  circleChooserDOM.chosen().change(this.onCircleChooserChange.bind(this));
};

OptionsController.prototype.onCircleChooserChange = function(e) {
  var values = $(e.target).val();
  this.settings.notify_circles = values || [];
};