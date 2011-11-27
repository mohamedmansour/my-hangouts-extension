/**
 * Capture Moment controller to display the preview
 * for the hangout.
 *
 * @constructor
 */
MomentCaptureController = function() {
  this.previewData = {};
};

/**
 * Initialize the UI and preview.
 */
MomentCaptureController.prototype.init = function() {
  this.bindUIControls();
  this.renderPreview();
};

/**
 * From the source dimension, it will calculate an image close to the destination
 * dimension. Used to scale sizes.
 */
MomentCaptureController.prototype.getDestinationDimensionFromSource = function(source, destination) {
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
MomentCaptureController.prototype.importImageIntoCanvas = function(ctx, base64image, source, opt_destination, callback) {
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
 *  We need to render two images side by side depending on the type.
 *  If the type is 1, the thumbnail should position on the right. When it is
 *  0 it should position below.
 */
MomentCaptureController.prototype.renderPreview = function() {
  // Merge.
  var tempCanvas = document.createElement('canvas');
  var tempContext = tempCanvas.getContext('2d');

  // Final.
  var mainCanvas = document.getElementById('canvas');
  var mainContext = mainCanvas.getContext('2d');

  // Get the data from the background page from the cache so we can preview it.
  var searchData = { service: 'Capture', method: 'previewTemporaryCapture' };
  chrome.extension.sendRequest(searchData, function(res) {

    // Resulting image should to this size.
    var destinationDimension =  {width: 900, height: 600};

    // We need to figure out when we are done loading the images so we can copy
    // it to a different canvas.
    var i = 0;
    var onImageLoaded = function() {
      if (++i == 2) {
        this.previewData = {
          data: tempCanvas.toDataURL(),
          width: tempCanvas.width,
          height: tempCanvas.height
        };
        var finalDestination = this.getDestinationDimensionFromSource({
          width: tempCanvas.width,
          height: tempCanvas.height
        }, destinationDimension);
        mainCanvas.width = finalDestination.width;
        mainCanvas.height = finalDestination.height;
        mainContext.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, finalDestination.width, finalDestination.height);
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
          {x: 0, y: 0, width: res.active_width, height: res.active_height},
          {x: 0, y: 0, width: res.active_width, height: res.active_height},
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
          {x: 0, y: 0, width: res.active_width, height: res.active_height},
          {x: 0, y: 0, width: res.active_width, height: res.active_height},
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
 * Bind UI Controls to the controller.
 */
MomentCaptureController.prototype.bindUIControls = function() {
  var saveButton = document.getElementById('save');
  saveButton.addEventListener('click', this.onSaveClicked.bind(this), false);
  var discardButton = document.getElementById('discard');
  discardButton.addEventListener('click', this.onDiscardClicked.bind(this), false);
  var publishButton = document.getElementById('publish');
  publishButton.addEventListener('click', this.onPublishClicked.bind(this), false);
};

/**
 * Persists the preview to the local database for later processing.
 */
MomentCaptureController.prototype.onSaveClicked = function() {
  this.closeOverlay();
};

/**
 * Discarding the image only requires us to close the window since
 * everything is just in memory. We don't wipe the mem location
 * because it makes debugging easier.
 */
MomentCaptureController.prototype.onDiscardClicked = function() {
  this.closeOverlay();
};

/**
 * Publish the photo to Picasa so we could do some editing and
 * sharing to our circles!
 */
MomentCaptureController.prototype.onPublishClicked = function() {
  this.closeOverlay();
};

/**
 * Tell our extension to close this iframe.
 */
MomentCaptureController.prototype.closeOverlay = function() {
  chrome.extension.sendRequest({service: 'RemoveOverlay'});
};