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
  this.previewLoader = $('#preloader-container');
  this.effectsController = new CaptureEffectsController(this);
  this.captureDownloader = new CaptureGalleryDownloader(this)
  this.captureViewer = new CaptureViewerController(this);
  this.bkg = chrome.extension.getBackgroundPage();
  this.mimeType = this.bkg.settings.download_mimetype;
};

/**
 * Initialize the UI..
 */
CaptureGalleryController.prototype.init = function() {
  this.renderGallery();
  this.effectsController.init();
  $(window).resize(this.onWindowResize.bind(this));
};

/**
 * Get the MimeType.
 */
CaptureGalleryController.prototype.getMimeType = function(removePath) {
  return removePath ? this.mimeType : 'image/' + this.mimeType;
};

/**
 * Bind the UI controlls from the view to their events.
 */
CaptureGalleryController.prototype.bindUIControls = function(parent) {
  $('#gallery').on('click', '.delete', this.deleteCapture.bind(this));
  $('#gallery').on('click', '.download', this.downloadCapture.bind(this));
  $('#gallery').on('click', '.effects', this.showEffectsWindow.bind(this));
  $('#gallery').on('click', '.preview', this.showPreviewWindow.bind(this));
  $('.tip').tipTip({defaultPosition: 'top'});
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
      $('#gallery').fadeIn(1000);
      self.bindUIControls();
    }
    else {
      $('#no-captures').show();
    }
    self.toggleProgress();
  });
};

CaptureGalleryController.prototype.renderMoment = function(moment) {
  // Do some preprocessing
  moment.time = $.timeago(new Date(moment.time));
  var newMoment = this.momentsTemplate.tmpl(moment);
  newMoment.appendTo('#gallery');
};

CaptureGalleryController.prototype.deleteCapture = function(e) {
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
CaptureGalleryController.prototype.downloadCapture = function(e) {
  var container = $(e.target).parent().parent().parent().parent();
  this.findCapture(container.attr('id'), function(data) {
    this.captureDownloader.prepareDownload(data);
  }.bind(this));
};

/**
 * Query the backend and find the capture to render.
 *
 * @param {number} id The ID for the capture.
 * @param {Function<Object>} callback Gets fired when a response arrives.
 */
CaptureGalleryController.prototype.findCapture = function(id, callback) {
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'findCapture',
    arguments: [id]
  }, function(res) {
      callback(res.data);
  }.bind(this));
};

/**
 * Show the preview window so the user can go through high res photos one by one.
 */
CaptureGalleryController.prototype.showPreviewWindow = function(e) {
  var container = $(e.target).parent().parent();
  var currentID = container.attr('id');
  var currentIndex = -1;
  var captureIDs = $('#gallery > li').map(function(idx, obj) {
    var id = obj.id;
    if (id === currentID) {
      currentIndex = idx;
    }
    return id;
  });
  this.captureViewer.show(currentIndex, captureIDs);
};

/**
 * Toggle the visibility status of the overall progress view.
 */
CaptureGalleryController.prototype.toggleProgress = function() {
  this.previewLoader.toggle();
};

/**
 * Activate the effects window.
 */
CaptureGalleryController.prototype.showEffectsWindow = function(e) {
  var container = $(e.target).parent().parent().parent().parent();
  this.effectsController.open(container.attr('id'));
};

/**
 * Listens on browser resize so we could relayout certain components.
 */
CaptureGalleryController.prototype.onWindowResize = function(e) {
  this.effectsController.onWindowResize(e);
};