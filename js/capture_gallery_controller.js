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
  try {
    this.glfxCanvas = fx.canvas();
    } catch(e) {
      alert(e);
    }
  
};

/**
 * Initialize the UI..
 */
CaptureGalleryController.prototype.init = function() {
  this.renderGallery();
};

/**
 * Bind the UI controlls from the view to their events.
 */
CaptureGalleryController.prototype.bindUIControls = function() {
  $('.delete').click(this.deleteCapture.bind(this));
  $('.download').click(this.downloadCapture.bind(this));
  $('.effects').click(this.showEffectsWindow.bind(this));
  $('.discard').click(this.hideEffectsWindow.bind(this));
  $('.save').click(this.onSaveClicked.bind(this));
};

CaptureGalleryController.prototype.renderGallery = function() {
  var self = this;
  var start = new Date().getTime();
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'findAll'
  }, function(res) {
    if (res.status) {
      res.data.forEach(function(moment, index) {
        // DO some preprocessing
        moment.time = $.timeago(new Date(moment.time));
        // Render the template.
        self.momentsTemplate.tmpl(moment).appendTo('.gallery');
      });
      console.log('Done', (new Date().getTime() - start) / 1000);
      self.bindUIControls();
    }
    else {
      alert('Error happened ' + res.data);
    }
  });
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
  // save thumbnail data for later
  controller.currentThumbnail = container.find('img').get(0);
  // retrieve larger image
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'findCapture',
    arguments: [container.attr('id')]
  }, function(res) {
    controller.glfxCanvas = fx.canvas();
      var src = res.data.active;
      controller.tempImage = new Image();
      controller.tempImage.src = src;
      controller.tempImage.onload = function() {
      
          controller.texture = controller.glfxCanvas.texture(controller.tempImage);
          controller.glfxCanvas.draw(controller.texture);
           $("#canvasPreview").append(controller.glfxCanvas);
          controller.glfxCanvas.update();
      
          $('#light').css('display','block');
          $('#fade').css('display','block');
    };
    });
}

CaptureGalleryController.prototype.replaceEffectsCanvas = function() {
  $("#canvasPreview").append(controller.glfxCanvas);
  controller.glfxCanvas.update();
}

CaptureGalleryController.prototype.hideEffectsWindow = function() {
  console.log($(controller.glfxCanvas));
  $(controller.glfxCanvas).remove();
  $('#light').css('display','none');
  $('#fade').css('display','none');
};

CaptureGalleryController.prototype.onSaveClicked = function() {  
  var originalData = {};
  originalData.active = controller.glfxCanvas.toDataURL();
    originalData.active_width = controller.glfxCanvas.width;
    originalData.active_height = controller.glfxCanvas.height;
    originalData.time = new Date();
    originalData.description = "Applied Filter to existing image.";
    
  var thumbnailDimensions = {width: controller.currentThumbnail.width, 
    height:controller.currentThumbnail.height};
    
  processCapture = function(imgData) {
    console.log("process capture");
    console.log(imgData);
    originalData.thumbnail = imgData;
    originalData.thumbnail_width = thumbnailDimensions.width;
    originalData.thumbnail_height = thumbnailDimensions.height;
    
    
    chrome.extension.sendRequest({
      service: 'Capture',
      method: 'processCapture',
      arguments: [originalData]
    }, function(res) {
      console.log(res);
      console.log("saved");
      $('#light').hide();
      $('#fade').hide();
      $(controller.glfxCanvas).remove();
      
      document.location = document.location;
    });
    
  }
  
  // glfx.js doesn't seem to work nicely with drawImage so I had to write to an image
  // and then use that image with drawImage
  tempImage = new Image()
  tempImage.src = controller.glfxCanvas.toDataURL();
  tempImage.onload = function () {
      tempCanvas = document.createElement("canvas");
      ctx = tempCanvas.getContext("2d");
      ctx.canvas.width = thumbnailDimensions.width;
      ctx.canvas.height = thumbnailDimensions.height;
      ctx.drawImage(this, 0, 0, thumbnailDimensions.width, thumbnailDimensions.height);
    
      processCapture(ctx.canvas.toDataURL());    
    }                                    
}
