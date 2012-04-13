/**
 * Gallery popup controller.
 *
 * @author Rayan Bouajram 2012 (http://rayanbouajram.com)
 */

GalleryController = function(popupController) {
  this.popup = popupController;
  this.bkg = this.popup.bkg.controller;
  this.momentsTemplate = $('#moments-item-template');
}

GalleryController.prototype.init = function() {
  this.renderGallery();
  this.bindUI();
}

GalleryController.prototype.renderGallery = function() {
  var self = this;
  var start = new Date().getTime();
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'findAll'
  }, function(res) {
    if (res.status && res.data.length > 0) {
      res.data.forEach(function(moment, index) {
        self.renderMoment(moment);
      });
      console.log('Done', (new Date().getTime() - start) / 1000);
      $('#gallery').fadeIn(1000);
      self.bindUIControls();
    }
    else {
      $('#no-captures').show();
    }
    self.toggleProgress();
  });
};

GalleryController.prototype.renderMoment = function(moment) {
  // Do some preprocessing
  moment.time = $.timeago(new Date(moment.time));
  var newMoment = this.momentsTemplate.tmpl(moment);
  newMoment.appendTo('#gallery');
};

GalleryController.prototype.bindUI = function() {
  var self = this;

  var galleryPreviewDOM = $('#gallery-preview');
 
   if (this.popup.displayAsTab) {
    $('#hangout-bar').remove();
    $('#options-container').remove();
    $('#hangouts-container').remove();
    $('#maps-container').remove();

    // Lazy load the height.
    setTimeout(function() {
      this.onResize();
      this._fitMarkers();
    }.bind(this), 250);
  }
}

GalleryController.prototype.onOpenAsWindow = function(e) {
  chrome.tabs.create({url: chrome.extension.getURL('capture_gallery.html')});
};