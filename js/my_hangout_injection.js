/**
 * Hangout Injection. Makes sense to abstract it out here, but keep it simpler.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
MyHangoutInjection = function() {
  this.isHangoutExtra = window.location.pathname.indexOf('/hangouts/extras/') == 0;
};

/**
 * Finally, everything has been sent correctly, show the preview.
 */
MyHangoutInjection.prototype.showPreview = function() {
  var overlayDOM = document.createElement('iframe');
  overlayDOM.setAttribute('id', 'crx-my-hangouts-overlay');
  overlayDOM.setAttribute('src', chrome.extension.getURL('capture_preview.html'));
  overlayDOM.setAttribute('frameBorder', '0');
  overlayDOM.setAttribute('width', '99.90%');
  overlayDOM.setAttribute('height', '100%');
  overlayDOM.setAttribute('style', 'background-color: transparent; position: fixed; top: 0; left: 0; overflow: hidden; z-index: 99999');
  document.body.appendChild(overlayDOM);
  document.body.appendChild(overlayDOM);
};

/**
 * Event when the UI Control for the hangout has been clicked.
 */
MyHangoutInjection.prototype.onPlusClicked = function(e) {
  e.preventDefault();
  var videos = document.querySelectorAll('object');
  var activeVideo = videos[0].client;
  var thumbnailVideo = videos[1].client;

  // Store the image in temporary cache, so the iframe could recieve it.
  chrome.extension.sendRequest({
    service: 'Capture', 
    method: 'storeTemporaryCapture',
    arguments: [{
      hangout: document.location.href,
      time: new Date(),
      description: 'nil',
      active: activeVideo.toDataURL(),
      active_height: activeVideo.height,
      active_width: activeVideo.width,
      thumbnail: thumbnailVideo.toDataURL(),
      thumbnail_height: thumbnailVideo.height,
      thumbnail_width: thumbnailVideo.width,
      type: this.isHangoutExtra ? 1 : 0
    }]
  }, this.showPreview);
};

/**
 * Render the Hangout Extra controls.
 */
MyHangoutInjection.prototype.renderHangoutExtraUI = function() {
  var captureButtonStyle = 'background-color: whiteSmoke; border: 1px solid rgba(0, 0, 0, 0.1);' +
    ' color: #444;box-shadow: inset 0 1px 2px rgba(0,0,0,.1); margin-right: 17px;' +
    ' background-image: -webkit-linear-gradient(top,#f5f5f5,#f1f1f1);text-align: center;' +
    ' height: 27px; line-height: 27px; min-width: 54px; outline: 0; padding: 0 8px;' +
    ' border-radius: 2px; cursor: default; font-size: 11px; font-weight: bold; ';
  var barDOM = document.querySelector('.gcomm-logo').parentNode.parentNode;
  var plusImageDOM = document.createElement('div');
  plusImageDOM.setAttribute('class', 'goog-inline-block');
  plusImageDOM.setAttribute('style', 'vertical-align: top;margin-top: 4px;' + 
    'background: no-repeat url(' + chrome.extension.getURL('/img/hangout-extras.png') + ') 0 4px;' +
    'height: 21px; width: 21px; margin-right: 5px;');
  var plusTextDOM = document.createElement('span');
  plusTextDOM.innerText = 'Capture moment';
  var plusDOM = document.createElement('div');
  plusDOM.setAttribute('style', captureButtonStyle);
  plusDOM.setAttribute('class', 'goog-inline-block crx-capture-moment-button');
  plusDOM.appendChild(plusImageDOM);
  plusDOM.appendChild(plusTextDOM);
  plusDOM.addEventListener('click', this.onPlusClicked.bind(this), false);
  plusDOM.addEventListener('mouseover', function() {
    plusDOM.style.borderColor = '#C6C6C6';
    plusDOM.style.color = '#333';
  }, false);
  plusDOM.addEventListener('mouseout', function() {
    plusDOM.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    plusDOM.style.color = '#444';
  }, false);
  barDOM.appendChild(plusDOM);
};

/**
 * Render the Normal Hangout UI controls.
 */
MyHangoutInjection.prototype.renderHangoutNormalUI = function() {
  var discoverDOM = document.querySelectorAll('div[style*="opacity: 1"] div[role="button"] div');
  var plusDOM = null;
  for (var i = 0; i < discoverDOM.length; i++) {
    var buttonDOM = discoverDOM[i];
    if (buttonDOM.innerText == 'Chat') {

      var captureButtonStyle = 'border: 1px solid transparent; cursor: pointer; float: left;' +
        'margin: 2px 1px 0; text-align: center; width: 85px; border-image: initial';
      plusDOM = document.createElement('div');
      plusDOM.setAttribute('class', 'crx-capture-moment-button');
      plusDOM.setAttribute('style', captureButtonStyle);
      plusDOM.addEventListener('click', this.onPlusClicked.bind(this), false);

      var plusImageDOM = document.createElement('div');
      plusImageDOM.setAttribute('class', 'crx-capture-moment-image');
      plusImageDOM.setAttribute('style', 'height: 60px; width: 85px;' +
        'background: no-repeat url(' + chrome.extension.getURL('/img/hangout-normal.png') +') 0 -60px;');
      var plusTextDOM = document.createElement('div');
      plusTextDOM.setAttribute('class', 'crx-capture-moment-text');
      plusTextDOM.innerText = 'Capture Moment';
      plusTextDOM.setAttribute('style', 'color: #51576B;font-size: 12px;' +
        'font-weight: bold; line-height: 15px; text-align: center;');
      plusDOM.addEventListener('mouseover', function() {
        plusImageDOM.style.backgroundPosition = '0 -60px';
      }, false);
      plusDOM.addEventListener('mouseout', function() {
        plusImageDOM.style.backgroundPosition = '0 0';
      }, false);
      plusDOM.appendChild(plusImageDOM);
      plusDOM.appendChild(plusTextDOM);
      
      buttonDOM.parentNode.parentNode.appendChild(plusDOM);
      break;
    }
  }
};

/**
 * When we get an external message, dispose the iframe. We definitely don't
 * it. Removing it will dispose all canvases.
 */
MyHangoutInjection.prototype.onApiExternalMessage = function(request, sender, sendResponse) {
  document.body.removeChild(document.querySelector('iframe#crx-my-hangouts-overlay'));
};

/**
 * When the content been discovered, we are ready. Render the UI for the each
 * hangout separately.
 */
MyHangoutInjection.prototype.onApiReady = function() {
  this.isHangoutExtra ? this.renderHangoutExtraUI() : this.renderHangoutNormalUI();
  chrome.extension.onRequest.addListener(this.onApiExternalMessage.bind(this));
};

/**
 * We don't want to deal with style classes since they change over time.
 * so we discover the content every second. When we find it, we process it.
 */
MyHangoutInjection.prototype.discoverVideo = function() {
  setTimeout(function() {
    var obj = document.querySelector('object');
    var ui = document.querySelector(this.isHangoutExtra ? '.gcomm-logo' : 'div[style*="opacity: 1"]');
    obj && ui ? this.onApiReady() : this.discoverVideo();
  }.bind(this), 1000);
};

// Start discovery.
var injection = new MyHangoutInjection();
injection.discoverVideo();