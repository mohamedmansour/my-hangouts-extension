/**
 * The controller for the capture moments within the popup.
 *
 * @author Mohamed Mansour 2012 (http://mohamedmansour.com)
 * @constructor
 */
CaptureGalleryPopup = function(parent) {
  this.controller = parent;
  this.galleryItems = null;
  this.momentsTemplate = null;
  this.momentsNoneTemplate = null;
  this.gallery = null;
  this.eventController = new CaptureGalleryEvents(this);
  this.bkg = chrome.extension.getBackgroundPage();
  this.mimeType = this.bkg.settings.download_mimetype;
};

/**
 * Initializes the UX.
 */
CaptureGalleryPopup.prototype.init = function() {
  this.momentsTemplate = $('#moments-item-template');
  this.momentsNoneTemplate = $('#moments-none-template');
  this.gallery = $('#gallery');
  $('#gallery-button').click(this.onLaunchGallery.bind(this));
};

/**
 * Get the MimeType.
 * @todo Do not repeat, share this method.
 */
CaptureGalleryPopup.prototype.getMimeType = function(removePath) {
  return removePath ? this.mimeType : 'image/' + this.mimeType;
};

/**
 * Query the backend and find the capture to render.
 *
 * @todo Do not repeat, share this method.
 * @param {number} id The ID for the capture.
 * @param {Function<Object>} callback Gets fired when a response arrives.
 */
CaptureGalleryPopup.prototype.findCapture = function(id, callback) {
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'findCapture',
    arguments: [id]
  }, function(res) {
      callback(res.data);
  }.bind(this));
};

/**
 * This will only be loaded once, so when called again, it will
 * get the contents from the cache. We are lazy loading it since
 * it takes some resources to initially load this. We don't want
 * to hurt the users experience with slowness!!
 */
CaptureGalleryPopup.prototype.onDisplay = function() {
  if (this.galleryItems) {
    return;
  }

  var self = this;

  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'find',
    arguments: [{
      '_count': 4,
      '_orderBy': ['_id DESC']
    }]
  }, function(res) {
    if (res.status && res.data.length > 0) {
      self.galleryItems = res.data;
      res.data.forEach(function(moment) {
        self.renderMoment(moment);
      });
    }
    else {
      $('#popup-container').height(400);
      $('#gallery-container').html(self.momentsNoneTemplate.tmpl());
    }
    self.eventController.bindUIControls();
    self.gallery.show();
  });
};

CaptureGalleryPopup.prototype.onLaunchGallery = function(e) {
  chrome.tabs.create({url: 'capture_gallery.html'});
};

CaptureGalleryPopup.prototype.renderMoment = function(moment) {
  moment.time = $.timeago(new Date(moment.time));
  var newMoment = this.momentsTemplate.tmpl(moment);
  newMoment.appendTo(this.gallery);
};
