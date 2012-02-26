/**
 * The Capture Moments Viewer.
 *
 * @author Mohamed Mansour 2012 (http://mohamedmansour.com)
 * @constructor
 */
CaptureViewerController = function(controller) {
  this.controller = controller;
  this.gallery = $('#gallery');
  this.previewDialog = $('#preview-dialog');
  this.previousButton = $('#preview-prev');
  this.nextButton = $('#preview-next');
  this.imageViewer = $('#preview-image');
  this.galleryButton = $('#preview-gallery');
  this.saveButton = $('#preview-save');
  this.currentID = 0;
  this.currentImageData = null;
  this.collection = null;
  
  this.keyPressedCallback = this.onKeyPressed.bind(this);
  
  this.previousButton.click(this.onPreviousPreview.bind(this));
  this.nextButton.click(this.onNextPreview.bind(this));
  this.galleryButton.click(this.closeDialog.bind(this));
  this.saveButton.click(this.onSaveImage.bind(this));
  this.imageViewer.click(this.onNextPreview.bind(this));
};

CaptureViewerController.prototype.show = function(id, collection) {
  this.openDialog();
  this.currentID = id;
  this.collection = collection;
  this.previewImage();
  if (this.currentID == 0) {
    this.previousButton.attr('disabled', true);
  }
  if (this.currentID == this.collection.length - 1) {
    this.nextButton.attr('disabled', true);
  }
};

/**
 * Opens a download dialog.
 */
CaptureViewerController.prototype.openDialog = function(e) {
  window.addEventListener('keyup', this.keyPressedCallback, false);
  this.gallery.animate({
    left: -this.gallery.width()
  }, 500, function() {  
    $(this).hide();
  });
  this.previewDialog.show();
};

/**
 * Close the viewer screen.
 */
CaptureViewerController.prototype.closeDialog = function(e) {
  window.removeEventListener('keyup', this.keyPressedCallback, false);
  this.previewDialog.hide();
  this.gallery.show().animate({
    left: 0
  }, 500);
};

/**
 * Show the image on the previewer..
 */
CaptureViewerController.prototype.previewImage = function() {
  this.controller.findCapture(this.collection[this.currentID], function(data) {
    this.currentImageData = data;
    this.imageViewer.attr('src', this.currentImageData.active);
    var viewDimensions = this.adjustResolution({
      width: this.currentImageData.active_width,
      height: this.currentImageData.active_height
    });
    this.imageViewer.attr('width', viewDimensions.width);
    this.imageViewer.attr('height', viewDimensions.height);
  }.bind(this));
};

/**
 * Preview the previous image.
 */
CaptureViewerController.prototype.onPreviousPreview = function() {
  if (this.currentID > 0) {
    this.currentID -= 1;
    this.previousButton.attr('disabled', false);
    this.nextButton.attr('disabled', false);
  }
  else {
    this.currentID = 0;
    this.previousButton.attr('disabled', true);
  }
  this.previewImage();
};

/**
 * Preview the next image.
 */
CaptureViewerController.prototype.onNextPreview = function() {
  if (this.currentID < (this.collection.length - 1)) {
    this.currentID += 1;
    this.previousButton.attr('disabled', false);
    this.nextButton.attr('disabled', false);
  }
  else { 
    this.currentID = this.collection.length - 1;
    this.nextButton.attr('disabled', true);
  }
  this.previewImage();
};

/**
 * Call the saving service.
 */
CaptureViewerController.prototype.onSaveImage = function(e) {
    this.controller.captureDownloader.prepareDownload(this.currentImageData);
};

/**
 * Does a FIT algorithm for letting the image fit to the container.
 *
 * @param {object} resolution The resolution for the original image.
 */
CaptureViewerController.prototype.adjustResolution = function(resolution) {
  var width = resolution.width;
  var height = resolution.height;
  var max_resolution = {
    width: ($(window).width() - 20),
    height: ($(window).height() - 90)
  }
  // Check if the current width is larger than the max
  if (width > max_resolution.width) {
    var ratio = max_resolution.width / width;
    height = height * ratio;
    width = width * ratio;
  }

  // Check if current height is larger than max
  if (height > max_resolution.height) {
    var ratio = max_resolution.height / height;
    height = max_resolution.height;
    width = width * ratio;
  }

  return {
    width: width,
    height: height
  };
};

/**
 * Key Pressed Events to handle gallery navigations.
 */
CaptureViewerController.prototype.onKeyPressed = function (e) {
  if (e.keyCode == 27) { // ESCAPE.
    this.closeDialog();
  }
  else if (e.keyCode == 37) { // LEFT
    this.onPreviousPreview();
  }
  else if (e.keyCode == 39) { // RIGHT
    this.onNextPreview();
  }
};