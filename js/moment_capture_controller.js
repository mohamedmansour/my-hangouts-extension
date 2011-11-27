MomentCaptureController = function() {
  this.captureID = window.location.hash.match(/#(\d+)/)[1];
};

MomentCaptureController.prototype.init = function() {
  this.bindUIControls();
  this.renderPreview();
};

MomentCaptureController.prototype.renderPreview = function() {
  var canvasDOM = document.getElementById('canvas');
  var canvasCtx = canvasDOM.getContext('2d');
  var imgLoader = new Image;
  imgLoader.onload = function(){
    canvasCtx.drawImage(imgLoader, 0, 0);
  };
  var searchData = { service: 'Capture', method: 'findCapture', arguments: [this.captureID] };
  chrome.extension.sendRequest(searchData, function(res) {
    imgLoader.width = res.data.thumbnail_width;
    imgLoader.height = res.data.thumbnail_height;
    imgLoader.src = res.data.thumbnail;
    canvasDOM.width = res.data.thumbnail_width;
    canvasDOM.height = res.data.thumbnail_height;
  });
};

MomentCaptureController.prototype.bindUIControls = function() {
  var saveButton = document.getElementById('save');
  saveButton.addEventListener('click', this.onSaveClicked.bind(this), false);
  var discardButton = document.getElementById('discard');
  discardButton.addEventListener('click', this.onDiscardClicked.bind(this), false);
};

MomentCaptureController.prototype.onSaveClicked = function() {
  this.closeOverlay();
};

MomentCaptureController.prototype.onDiscardClicked = function() {
  chrome.extension.sendRequest({
    service: 'Capture', 
    method: 'deleteCapture',
    arguments: [this.captureID]
  }, function(resp) {
    this.closeOverlay();
  }.bind(this));
};

MomentCaptureController.prototype.closeOverlay = function() {
  chrome.extension.sendRequest({service: 'RemoveOverlay'});
};