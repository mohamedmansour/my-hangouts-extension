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
  this.previewControls = $('#preview-controls');
  this.previousButton = $('#preview-prev');
  this.nextButton = $('#preview-next');
  this.imageViewer = $('#preview-image');
  this.galleryButton = $('#preview-gallery');
  this.saveButton = $('#preview-save');
  this.previewLoaderText = $('#preloader-text');
  this.currentID = 0;
  this.currentImageData = null;
  this.collection = null;
  this.currentScrollPosition = 0;
  this.keyPressedCallback = this.onKeyPressed.bind(this);
  
  this.previousButton.click(this.onPreviousPreview.bind(this));
  this.nextButton.click(this.onNextPreview.bind(this));
  this.galleryButton.click(this.closeDialog.bind(this));
  this.saveButton.click(this.onSaveImage.bind(this));
  this.imageViewer.click(this.onNextPreview.bind(this));
  
  this.previewLoaderText.css('top', ($(window).height() - CaptureViewerController.HEADER_HEIGHT) / 2);
  this.previewLoaderText.css('left', ($(window).width() - CaptureViewerController.PREVIEW_MARGIN) / 2);
};
CaptureViewerController.HEADER_HEIGHT = 90;
CaptureViewerController.PREVIEW_MARGIN = 200;
CaptureViewerController.PRELOADER_HEIGHT = 75;
CaptureViewerController.PRELOADER_WIDTH = 200;

CaptureViewerController.prototype.show = function(id, collection) {
  this.currentScrollPosition = window.scrollY;
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
  var self = this;
  this.gallery.animate({ left: -this.gallery.width() }, 500, function() {  
    self.gallery.hide()
    self.previewDialog.fadeIn(250);
  });
};

/**
 * Close the viewer screen.
 */
CaptureViewerController.prototype.closeDialog = function(e) {
  window.removeEventListener('keyup', this.keyPressedCallback, false);
  var self = this;
  this.previewDialog.fadeOut(250, function() {
    self.gallery.show().animate({left: 0}, 500, function() {
      window.scrollTo(0, self.currentScrollPosition);
    });
  });
};

/**
 * Show the image on the previewer..
 */
CaptureViewerController.prototype.previewImage = function() {
  var height = $(window).height() - CaptureViewerController.HEADER_HEIGHT;
  var width = $(window).width() - CaptureViewerController.PREVIEW_MARGIN;

  // Loader
  this.previewLoaderText.css('top', height / 2);
  this.previewLoaderText.css('left', width / 2);

  // Show the progress.
  this.controller.toggleProgress();

  // Query DB to find the capture.
  this.controller.findCapture(this.collection[this.currentID], function(data) {
    this.currentImageData = data;
    
    // Create a new Image add it to DOM.
    this.imageViewer.children().remove();
    var image = new Image();
    image.src = this.currentImageData.active;
    this.currentViewDimensions = this.adjustResolution({
      width: this.currentImageData.active_width,
      height: this.currentImageData.active_height
    });
    image.width = this.currentViewDimensions.width;
    image.height = this.currentViewDimensions.height;
    this.imageViewer.append(image);

    // Render the new preview dialog and loader in the middle of the screen.
    var dialogMidHeight = (height - this.currentViewDimensions.height) / 2;
    this.previewDialog.css('top', dialogMidHeight);
    this.previewControls.css('top', -dialogMidHeight);

    // Stop the progress.
    this.controller.toggleProgress();
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
    height: ($(window).height() - CaptureViewerController.HEADER_HEIGHT)
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