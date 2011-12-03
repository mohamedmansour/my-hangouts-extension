/**
 * Capture Gallery controller to display the preview
 * for the hangout.
 *
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
  //$("#canvasPreview").empty();
  $("#canvasPreview").append(controller.glfxCanvas);
  controller.glfxCanvas.update();
}

CaptureGalleryController.prototype.hideEffectsWindow = function() {
  $('#light').css('display','none');
  $('#fade').css('display','none');
};