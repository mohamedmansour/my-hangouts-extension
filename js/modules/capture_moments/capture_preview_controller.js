/**
 * Capture Moment controller to display the preview
 * for the hangout.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
CapturePreviewController = function() {
  this.originalData = {};
  this.previewDimension = { width: 900, height: 600 };
  this.thumbnailDimension = { width: 250, height: 150 };
};

/**
 * Initialize the UI and preview.
 */
CapturePreviewController.prototype.init = function() {
  this.bindUIControls();
  this.renderPreview();
};

/**
 * From the source dimension, it will calculate an image close to the destination
 * dimension. Used to scale sizes.
 */
CapturePreviewController.prototype.getDestinationDimensionFromSource = function(source, destination) {
  var width = source.width;
  var height = source.height;

  // Check if the current width is larger than the max
  if (width > destination.width) {
    var ratio = destination.width / width;
    height = height * ratio;
    width = width * ratio;
  }
  // Check if current height is larger than max
  if (height > destination.height) {
    var ratio = destination.height / height;
    height = destination.height;
    width = width * ratio;
  }

  return {
    width: parseInt(width),
    height: parseInt(height)
  };
};

/**
 * Imports images to the canvas by drawing on that image asynchronously.
 */
CapturePreviewController.prototype.importImageIntoCanvas = function(ctx, base64image, source, opt_destination, callback) {
  var destination = opt_destination || source;
  var img = new Image;
  img.onload = function() {
    // (image, sx, sy, sw, sh, dx, dy, dw, dh)
    ctx.drawImage(img, source.x, source.y, source.width, source.height,
                  destination.x, destination.y, destination.width, destination.height);
    callback();
  };
  img.src = base64image;
};

/**
 * Resizes the canvas into an existing context with a given maximum dimension.
 *
 * @param {Object} fronCanvas The canvas to copy the image from.
 * @param {Object} toContext The context to copy in.
 * @param {Object} maxDimension The maximum dimension size to use.
 * @param {Function(string)} callback Optional callback to fire.
 */
CapturePreviewController.prototype.resizeImageFromCanvasToContext = function(fromCanvas, toContext, maxDimension, callback) {
  var finalDestination = this.getDestinationDimensionFromSource({
    width: fromCanvas.width,
    height: fromCanvas.height
  }, maxDimension);
  toContext.canvas.width = finalDestination.width;
  toContext.canvas.height = finalDestination.height;
  toContext.drawImage(fromCanvas, 0, 0, fromCanvas.width, fromCanvas.height, 0, 0, finalDestination.width, finalDestination.height);
  if (callback) {
    callback(toContext.canvas.toDataURL('image/webp'), finalDestination.width, finalDestination.height);
  }
};

/**
 *  We need to render two images side by side depending on the type.
 *  If the type is 1, the thumbnail should position on the right. When it is
 *  0 it should position below.
 */
CapturePreviewController.prototype.renderPreview = function() {
  // Merge.
  var tempCanvas = document.createElement('canvas');
  var tempContext = tempCanvas.getContext('2d');

  // Final.
  var mainCanvas = document.getElementById('canvas');
  var mainContext = mainCanvas.getContext('2d');

  // Get the data from the background page from the cache so we can preview it.
  var searchData = { service: 'Capture', method: 'previewTemporaryCapture' };
  chrome.extension.sendRequest(searchData, function(res) {

    // We need to figure out when we are done loading the images so we can copy
    // it to a different canvas.
    var i = 0;
    var onImageLoaded = function() {
      if (++i == 2) {
        this.originalData = res;
        this.originalData.active = tempCanvas.toDataURL('image/webp');
        this.originalData.active_width = tempCanvas.width;
        this.originalData.active_height = tempCanvas.height;
        this.resizeImageFromCanvasToContext(tempCanvas, mainContext,
                                            this.previewDimension);
      }
    }.bind(this);

    // Render stuff for each different type.
    switch (res.type) {
      case 0: 
        // For Hangouts regular, we need to draw the thumbnail at the bottom
        // and active in the top.
        var dimension = {
          width: res.active_width > res.thumbnail_width ? res.active_width : res.thumbnail_width,
          height: res.active_height + res.thumbnail_height
        };
        tempCanvas.width = dimension.width;
        tempCanvas.height = dimension.height;
        // Top.
        this.importImageIntoCanvas(tempContext, res.active, 
          {x: 0, y: 0, width: res.active_width, height: res.active_height}, null,
          onImageLoaded);
        // Bottom.
        this.importImageIntoCanvas(tempContext, res.thumbnail, 
          {x: 0, y: 0, width: res.thumbnail_width, height: res.thumbnail_height},
          {x: 0, y: res.active_height, width: res.thumbnail_width, height: res.thumbnail_height},
          onImageLoaded);
        break;
      case 1:
        // For Hangouts with extra, we need to draw the thumbnail to the right
        // and active to the left.
        var dimension = {
          width: res.active_width + res.thumbnail_width,
          height: res.active_height > res.thumbnail_height ? res.active_height : res.thumbnail_height
        };
        tempCanvas.width = dimension.width;
        tempCanvas.height = dimension.height;
        // Left.
        this.importImageIntoCanvas(tempContext, res.active,
          {x: 0, y: 0, width: res.active_width, height: res.active_height}, null,
          onImageLoaded);
        // Right.
        this.importImageIntoCanvas(tempContext, res.thumbnail,
          {x: 0, y: 0, width: res.thumbnail_width, height: res.thumbnail_height},
          {x: res.active_width, y: 0, width: res.thumbnail_width, height: res.thumbnail_height},
          onImageLoaded);
        break;
    }
  }.bind(this));
};

/**
 * Render the thumbnail so we can have a smaller image to present in the viewer.
 *
 * @param {Function(string)} callback - The callback when the thumbnail has created.
 */
CapturePreviewController.prototype.renderThumbnail = function(callback) {
  var tempCanvas = document.createElement('canvas');
  var tempContext = tempCanvas.getContext('2d');
  this.resizeImageFromCanvasToContext(document.getElementById('canvas'),
                                      tempContext,
                                      this.thumbnailDimension,
                                      callback);
};

/**
 * Bind UI Controls to the controller.
 */
CapturePreviewController.prototype.bindUIControls = function() {
  var saveButton = $('.save');
  saveButton.click(this.onSaveClicked.bind(this));
  var discardButton = $('.discard');
  discardButton.click(this.onDiscardClicked.bind(this));
  var visitButton = $('.visit');
  visitButton.click(this.onViewClicked.bind(this));
  //var publishButton = document.querySelector('.publish');
  //publishButton.addEventListener('click', this.onPublishClicked.bind(this), false);
};

/**
 * On view clicked.
 */
CapturePreviewController.prototype.onViewClicked = function() {
  chrome.extension.sendRequest({
      service: 'OpenURL',
      data: 'capture_gallery.html'
  });
};

/**
 * Persists the preview to the local database for later processing.
 */
CapturePreviewController.prototype.onSaveClicked = function() {
  this.renderThumbnail(function(base64image, width, height) {
    this.originalData.thumbnail = base64image;
    this.originalData.thumbnail_width = width;
    this.originalData.thumbnail_height = height;
    chrome.extension.sendRequest({
      service: 'Capture',
      method: 'processCapture',
      arguments: [this.originalData]
    }, function(res) {
      $('#crx_myhangouts_controls').hide();
      $('#crx_myhangouts_status').fadeIn('slow', function() {
        // Animation complete
      });
    }.bind(this));
  }.bind(this));
};

/**
 * Discarding the image only requires us to close the window since
 * everything is just in memory. We don't wipe the mem location
 * because it makes debugging easier.
 */
CapturePreviewController.prototype.onDiscardClicked = function() {
  this.closeOverlay();
};

/**
 * Publish the photo to Picasa so we could do some editing and
 * sharing to our circles!
 */
CapturePreviewController.prototype.onPublishClicked = function() {
  this.closeOverlay();
};

/**
 * Tell our extension to close this iframe.
 */
CapturePreviewController.prototype.closeOverlay = function() {
  chrome.extension.sendRequest({service: 'RemoveOverlay'});
};
