MomentCaptureController = function() {
};

MomentCaptureController.prototype.init = function() {
  this.bindUIControls();
  this.renderPreview();
};

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
 *  We need to render two images side by side depending on the type.
 *  If the type is 1, the thumbnail should position on the right. When it is
 *  0 it should position below.
 */
MomentCaptureController.prototype.renderPreview = function() {
  var importImageIntoCanvas = function(ctx, base64image, source, opt_destination) {
    var destination = opt_destination || source;
    var img = new Image;
    img.onload = function() {
      // (image, sx, sy, sw, sh, dx, dy, dw, dh)
      ctx.drawImage(img, source.x, source.y, source.width, source.height,
                    destination.x, destination.y, destination.width, destination.height);
    };
    img.src = base64image;
  };
  
  var searchData = { service: 'Capture', method: 'previewTemporaryCapture' };
  chrome.extension.sendRequest(searchData, function(res) {
    var destinationDimension =  {width: 900, height: 600};
    var tempCanvas = document.getElementById('canvas');
    var tempContext = tempCanvas.getContext('2d');
    switch (res.type) {
      case 0: 
        // For Hangouts regular, we need to draw the thumbnail at the bottom
        // and active in the top.
        var dimension = {
          width: res.active_width,
          height: res.active_height + res.thumbnail_height
        };
        tempCanvas.width = dimension.width;
        tempCanvas.height = dimension.height;
        importImageIntoCanvas(tempContext, res.active, 
          {x: 0, y: 0, width: res.active_width, height: res.active_height},
          {x: 0, y: 0, width: res.active_width, height: res.active_height});
        importImageIntoCanvas(tempContext, res.thumbnail, 
          {x: 0, y: 0, width: res.thumbnail_width, height: res.thumbnail_height},
          {x: 0, y: res.active_height, width: res.thumbnail_width, height: res.thumbnail_height});

          // Not what I wanted
          tempContext.scale(0.75, 0.75);
          /*
        var finalDestination = this.getDestinationDimensionFromSource({
          width: tempCanvas.width,
          height: tempCanvas.height
        }, destinationDimension);
        */
        //console.log(tempCanvas.toDataURL());
        //console.log(finalDestination);
          /*
        importImageIntoCanvas(mainContext, res.active, 
          {x: 0, y: 0, width: res.active_width, height: res.active_height});
        mainCanvas.width = res.active_width;
        mainCanvas.height = res.active_height;
          */ 
  
        /*
        var tempData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        console.log(tempData);
        
        mainCanvas.width = tempCanvas.width;
        mainCanvas.height = tempCanvas.height;
        
        mainContext.putImageData(tempData, 0, 0);
        */
        /*
        tempCanvas.width = dimension.width;
        tempCanvas.height = dimension.height;
        var finalDestination = this.getDestinationDimensionFromSource({
          width: tempCanvas.width,
          height: tempCanvas.height
        }, destinationDimension);
        console.log(tempCanvas, finalDestination);
        mainContext.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height,
                              0, 0, finalDestination.width, finalDestination.height);
        mainCanvas.width = finalDestination.width;
        mainCanvas.height = finalDestination.height;
        */
        break;
      case 1:
        // For Hangouts with extra, we need to draw the thumbnail to the right
        // and active to the left.
        importImageIntoCanvas(tempContext, res.active, 
          {x: 0, y: 0, width: res.active_width, height: res.active_height},
          {x: 0, y: 0, width: res.active_width, height: res.active_height});
        importImageIntoCanvas(tempContext, res.thumbnail, 
          {x: 0, y: 0, width: res.thumbnail_width, height: res.thumbnail_height},
          {x: res.active_width, y: 0, width: res.thumbnail_width, height: res.thumbnail_height});
        var dimension = {
          width: res.active_width + res.thumbnail_width,
          height: res.active_height
        };
        mainCanvas.width = dimension.width;
        mainCanvas.height = dimension.height;
        break;
    }
  }.bind(this));
};

MomentCaptureController.prototype.bindUIControls = function() {
  var saveButton = document.getElementById('save');
  saveButton.addEventListener('click', this.onSaveClicked.bind(this), false);
  var discardButton = document.getElementById('discard');
  discardButton.addEventListener('click', this.onDiscardClicked.bind(this), false);
};

MomentCaptureController.prototype.onSaveClicked = function() {
  // TODO: 1) create full frame for photo.
  //       2) create the thumbnail for the photo.
  //       3) persist the thumbnail and full frame into the database.
  this.closeOverlay();
};

MomentCaptureController.prototype.onDiscardClicked = function() {
  this.closeOverlay();
};

MomentCaptureController.prototype.closeOverlay = function() {
  chrome.extension.sendRequest({service: 'RemoveOverlay'});
};