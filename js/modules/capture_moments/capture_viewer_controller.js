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
  this.previousButton.click(this.onPreviousPreview.bind(this));
  this.nextButton.click(this.onNextPreview.bind(this));
  this.galleryButton.click(this.closeDialog.bind(this));
  this.saveButton.click(this.onSaveImage.bind(this));
};

CaptureViewerController.prototype.show = function(id, collection) {
  this.openDialog();
  this.currentID = id;
  this.collection = collection;
  this.previewImage();
};

/**
 * Opens a download dialog.
 */
CaptureViewerController.prototype.openDialog = function(e) {
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
  }.bind(this));
};

/**
 * Preview the previous image.
 */
CaptureViewerController.prototype.onPreviousPreview = function() {
  if (this.currentID > 0) {
    this.currentID -= 1;
  }
  else {
    this.currentID = 0;
  }
  this.previewImage();
};

/**
 * Preview the next image.
 */
CaptureViewerController.prototype.onNextPreview = function() {
  if (this.currentID < (this.collection.length - 1)) {
    this.currentID += 1;
  }
  else { 
    this.currentID = this.collection.length - 1;
  }
  this.previewImage();
};

/**
 * Call the saving service.
 */
CaptureViewerController.prototype.onSaveImage = function(e) {
    this.controller.captureDownloader.prepareDownload(this.currentImageData);
};