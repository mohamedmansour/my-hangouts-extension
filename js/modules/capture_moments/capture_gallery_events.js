/**
 * Adds events to the capture gallery which is reused from
 * within the popup and the main gallery.
 *
 * @authors Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
CaptureGalleryEvents = function(parent) {
  this.controller = parent;
  this.captureDownloader = new CaptureGalleryDownloader(parent);
};

/**
 * Bind the UI controlls from the view to their events.
 */
CaptureGalleryEvents.prototype.bindUIControls = function() {
  $('#gallery').on('click', '.delete', this.deleteCapture.bind(this));
  $('#gallery').on('click', '.download', this.downloadCapture.bind(this));
  $('#gallery').on('click', '.effects', this.showEffectsWindow.bind(this));
};

CaptureGalleryEvents.prototype.deleteCapture = function(e) {
  var container = $(e.target).parent().parent().parent().parent();
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

/**
 * Issues an HTML5 Download routine.
 */
CaptureGalleryEvents.prototype.downloadCapture = function(e) {
  var container = $(e.target).parent().parent().parent().parent();
  this.controller.findCapture(container.attr('id'), function(data) {
    this.captureDownloader.prepareDownload(data);
  }.bind(this));
};

/**
 * Activate the effects window.
 */
CaptureGalleryEvents.prototype.showEffectsWindow = function(e) {
  var container = $(e.target).parent().parent().parent().parent();
  // this.effectsController.open(container.attr('id'));
};

