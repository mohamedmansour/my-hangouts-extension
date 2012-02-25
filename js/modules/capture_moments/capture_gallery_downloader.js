/**
 * Uses HTML5 BlobBuilder to construct the image and post it back to the user
 * computer when they manually download it.
 *
 * @author Mohamed Mansour 2012 (http://mohamedmansour.com)
 */
CaptureGalleryDownloader = function(controller) {
  this.controller = controller;
  this.URL = window.webkitURL || window.URL;
  this.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;
  this.downloadDialog = $('#download-dialog');
  this.thumbnailImageContainer = $('#download-thumbnail');
  this.downloadContent = $('#download-content');
  this.downloadClose = $('#download-close');
  this.MIME_TYPE = 'image/png';
  this.downloadClose.click(this.closeDownloadDialog.bind(this));
  this.downloadDialog.click(this.onDialogClick.bind(this));
  this.dialogKeyPressedCallback = this.onDialogKeyPressed.bind(this);
};

/**
 * Prepare the download so that it will create a Blob to download.
 *
 * @param {object} data The captured data.
 */
CaptureGalleryDownloader.prototype.prepareDownload = function(data) {
  this.openDownloadDialog();
  
  // Cleanup the images.
  this.thumbnailImageContainer.children().remove();
  var thumbnailImage = new Image();
  thumbnailImage.src = data.thumbnail;
  this.thumbnailImageContainer.append(thumbnailImage); 
  var prevLink = $('a', this.downloadDialog);
  if (prevLink) {
    this.URL.revokeObjectURL(prevLink.href);
    prevLink.remove();
  }

  var a = document.createElement('a');
  a.download = 'MyHangouts-MomentCapture-' + data.time + '.png';
  a.href = this.URL.createObjectURL(this.dataURIToBlob(data.active, this.MIME_TYPE));
  a.textContent = 'Click here to download!';
  a.dataset.downloadurl = [this.MIME_TYPE, a.download, a.href].join(':');
  this.downloadContent.append(a);

  a.onclick = this.onDownloadClicked.bind(this);
};

/**
 * When the download link has been clicked, force the download.
 */
CaptureGalleryDownloader.prototype.onDownloadClicked = function(e) {
  var a = e.target;

  // Download attribute.
  if ('disabled' in a.dataset) {
    return false;
  }
  a.textContent = 'Downloaded!';
  a.dataset.disabled = true;

  // Small delay for the revokeObjectURL to work properly.
  setTimeout(function() {
    this.URL.revokeObjectURL(a.href);
    this.closeDownloadDialog();
  }.bind(this), 1500);
};

/**
 * Converts the Data Image URI to a Blob.
 *
 * @param {string} dataURI base64 data image URI.
 * @param {string} mimetype the image mimetype.
 */
CaptureGalleryDownloader.prototype.dataURIToBlob = function(dataURI, mimetype) {
  var BASE64_MARKER = ';base64,';
  var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  var base64 = dataURI.substring(base64Index);
  var raw = window.atob(base64);
  var rawLength = raw.length;
  var uInt8Array = new Uint8Array(rawLength);

  for (var i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  var bb = new this.BlobBuilder();
  bb.append(uInt8Array.buffer);

  return bb.getBlob(mimetype);
};

/**
 * Opens a download dialog.
 */
CaptureGalleryDownloader.prototype.openDownloadDialog = function(e) {
  window.addEventListener('keyup', this.dialogKeyPressedCallback, false);
  this.downloadDialog.show();
  setTimeout(function() {
    this.downloadDialog.css('opacity', 1);
  }.bind(this));
};

/**
 * When a download has been closed.
 */
CaptureGalleryDownloader.prototype.closeDownloadDialog = function(e) {
  window.removeEventListener('keyup', this.dialogKeyPressedCallback, false);
  this.downloadDialog.css('opacity', 0);
  setTimeout(function() {
    this.downloadDialog.hide();
  }.bind(this), 300);
};

/**
 * On Dialog Key Button hit.
 */
CaptureGalleryDownloader.prototype.onDialogKeyPressed = function (e) {
  if (e.keyCode  == 27) { // ESCAPE.
    this.closeDownloadDialog();
  }
};

/**
 * Closes the dialog when clicked outside.
 */
CaptureGalleryDownloader.prototype.onDialogClick = function(e) {
  if (e.target.id === 'download-dialog') {
    this.closeDownloadDialog();
  }
};