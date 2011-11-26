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
    imgLoader.width = res.data.width;
    imgLoader.height = res.data.height;
    imgLoader.src = res.data.raw;
    canvasDOM.width = res.data.width;
    canvasDOM.height = res.data.height;
  });
};

MomentCaptureController.prototype.bindUIControls = function() {
  var closeButton = document.getElementById('close');
  closeButton.addEventListener('click', this.onCloseClick.bind(this), false);
};

MomentCaptureController.prototype.onCloseClick = function() {
  chrome.extension.sendRequest({service: 'RemoveOverlay'});
};