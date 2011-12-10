/**
 * Capture Gallery controller to display the preview
 * for the hangout.
 *
 * @authors Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @author James Williams 2011 (http://jameswilliams.be)
 * @constructor
 */
CaptureGalleryController = function() {
  this.momentsTemplate = $('#moments-item-template');
  this.effectsController = new CaptureEffectsController(this);
};

/**
 * Initialize the UI..
 */
CaptureGalleryController.prototype.init = function() {
  this.renderGallery();
  this.effectsController.init();
};

/**
 * Bind the UI controlls from the view to their events.
 */
CaptureGalleryController.prototype.bindUIControls = function(parent) {
  $('.delete', parent).click(this.deleteCapture.bind(this));
  $('.download', parent).click(this.downloadCapture.bind(this));
  $('.effects', parent).click(this.showEffectsWindow.bind(this));
};

CaptureGalleryController.prototype.renderGallery = function() {
  var self = this;
  var start = new Date().getTime();
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'findAll'
  }, function(res) {
    if (res.status && res.data.length > 0) {
      res.data.forEach(function(moment, index) {
        self.renderMoment(moment);
      });
      console.log('Done', (new Date().getTime() - start) / 1000);
      self.bindUIControls();
    }
    else {
      $('.no-captures').show();
    }
  });
};

CaptureGalleryController.prototype.renderMoment = function(moment) {
  // Do some preprocessing
  moment.time = $.timeago(new Date(moment.time));
  var newMoment = this.momentsTemplate.tmpl(moment);
  newMoment.appendTo('.gallery');
  this.bindUIControls(newMoment);
};

CaptureGalleryController.prototype.deleteCapture = function(e) {
  var container = $(e.target).parent().parent().parent();
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'deleteCapture',
    arguments: [container.attr('id')]
  }, function(res) {
    container.fadeOut('slow', function() {
      container.remove();
    });
  });
};

CaptureGalleryController.prototype.downloadCapture = function(e) {
  var container = $(e.target).parent().parent().parent();
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'findCapture',
    arguments: [container.attr('id')]
  }, function(res) {
      window.open(res.data.active);
  });
};

CaptureGalleryController.prototype.showEffectsWindow = function(e) {
  var container = $(e.target).parent().parent().parent();
  this.effectsController.open(container.attr('id'));
};
