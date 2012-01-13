/**
 * Hangout Injection. Makes sense to abstract it out here, but keep it simpler.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
MyHangoutInjection = function() {
  this.isHangoutExtra = window.location.pathname.indexOf('/hangouts/extras/') == 0;
  this.isOnLive = window.location.pathname.indexOf('/hangouts/stream/') == 0;
};

/**
 * For unique situations, we want to just process it directly.
 */
MyHangoutInjection.prototype.showProcessed = function() {
  alert('processed');
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
};

/**
 * Event when the UI Control for the hangout has been clicked.
 */
MyHangoutInjection.prototype.onPlusClicked = function(e) {
  e.preventDefault();
  var videos = document.querySelectorAll('object');
  var activeVideo = videos[0].client;
  var thumbnailVideo = videos[1].client;

  // Get the setting from the background page so we can decide if the user wants to show the dialog or not.
  var self = this;
  chrome.extension.sendRequest({
    service: 'GetSetting',
    data: 'moment_skip_dialog'
  }, function(moment_skip_dialog) {
    // Store the image in temporary cache, so the iframe could recieve it.
    chrome.extension.sendRequest({
      service: 'Capture', 
      method: moment_skip_dialog ? 'processCapture' : 'storeTemporaryCapture',
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
        type: self.isHangoutExtra ? 1 : 0
      }]
    }, moment_skip_dialog ? self.showProcessed : self.showPreview);
  });
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
 * Discovers the Chat DOM if it exists in the hangout.
 */
MyHangoutInjection.prototype.discoverChatDOM = function(domList) {
  for (var i = 0; i < domList.length; i++) {
    var buttonDOM = domList[i];
    if (buttonDOM.innerText == 'Chat') {
      return buttonDOM;
    }
  }
  return null;
};

/**
 * Modern Rendering for the Hangout UI.
 */
MyHangoutInjection.prototype.renderModernHangoutNormalUI = function(chatDOM) {
  var captureButtonStyle = 'display: inline-block; color: #333;margin: 0 4px;padding: 0 10px;';
  var plusDOM = document.createElement('div');
  plusDOM.setAttribute('class', 'crx-capture-moment-button');
  plusDOM.setAttribute('style', captureButtonStyle);
  plusDOM.addEventListener('click', this.onPlusClicked.bind(this), false);
  plusDOM.addEventListener('mouseover', function() {
    plusDOM.style.color = '#444';
    plusDOM.style.webkitBoxShadow = '0 1px 1px rgba(0,0,0,.1)';
    plusDOM.style.border = '1px solid #C6C6C6';
  }, false);
  plusDOM.addEventListener('mouseout', function() {
    plusDOM.style.color = '#333';
    plusDOM.style.webkitBoxShadow = '0 0 0 rgba(0,0,0,.1)';
    plusDOM.style.border = '1px solid transparent';
  }, false);
  
  var plusTextDOM = document.createElement('div');
  plusTextDOM.setAttribute('class', 'crx-capture-moment-text');
  plusTextDOM.innerText = 'Capture Moment';
  plusTextDOM.setAttribute('style', 'cursor: default;font-size: 11px;font-weight: bold;text-align: center;line-height: 27px;');
  plusDOM.appendChild(plusTextDOM);
  
  chatDOM.parentNode.parentNode.appendChild(plusDOM);
  
  var dividerDOM = plusDOM.parentNode.childNodes[1].cloneNode(true);
  if (dividerDOM.childNodes.length == 0) {
    chatDOM.parentNode.parentNode.appendChild(dividerDOM);
  }
};

/**
 * Render the Normal Hangout UI controls.
 */
MyHangoutInjection.prototype.renderHangoutNormalUI = function(ui) {
  this.renderModernHangoutNormalUI(ui);
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
MyHangoutInjection.prototype.onApiReady = function(ui) {
  this.isHangoutExtra ? this.renderHangoutExtraUI() : this.renderHangoutNormalUI(ui);
  chrome.extension.onRequest.addListener(this.onApiExternalMessage.bind(this));
};

/**
 * We don't want to deal with style classes since they change over time.
 * so we discover the content every second. When we find it, we process it.
 */
MyHangoutInjection.prototype.discoverVideo = function() {
  setTimeout(function() {
    var obj = document.querySelector('object');
    var ui = null;
    if (this.isHangoutExtra) {
      ui = document.querySelector('.gcomm-logo');
    }
    else {
      ui = this.discoverChatDOM(document.querySelectorAll('div[role="button"] div'));
    }
    obj && ui ? this.onApiReady(ui) : this.discoverVideo();
  }.bind(this), 1000);
};

// Start discovery.
var injection = new MyHangoutInjection();
injection.discoverVideo();