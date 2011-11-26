function sendRequest(method, args, callback) {
  chrome.extension.sendRequest({
    service: 'Capture', 
    method: method,
    arguments: args
  }, callback);
}

function showPreview(data) {
  console.log('Showing', data);
  sendRequest('findCapture', [data.id], function(resp) {
    console.log('Capture found', resp);
  });
}

function onPlusClicked(e) {
  e.preventDefault();
  var client = document.querySelector('object').client;
  var dataURL = client.toDataURL();
  var image64 = dataURL.replace(/data:image\/png;base64,/, '');
  sendRequest('processCapture', [{
    hangout: document.location.href,
    time: new Date(),
    description: 'nil',
    raw: image64
  }], showPreview);
}

function renderHangoutExtraUI() {
  var captureButtonStyle = 'background-color: whiteSmoke; border: 1px solid rgba(0, 0, 0, 0.1);' +
    ' color: #444;box-shadow: inset 0 1px 2px rgba(0,0,0,.1); margin-right: 17px;' +
    ' background-image: -webkit-linear-gradient(top,#f5f5f5,#f1f1f1);text-align: center;' +
    ' height: 27px; line-height: 27px; min-width: 54px; outline: 0; padding: 0 8px;' +
    ' border-radius: 2px; cursor: default; font-size: 11px; font-weight: bold; ';
  var barDOM = document.querySelector('.gcomm-logo').parentNode.parentNode;
  var plusTextDOM = document.createElement('span');
  plusTextDOM.innerText = 'Capture moment';
  var plusDOM = document.createElement('div');
  plusDOM.setAttribute('style', captureButtonStyle);
  plusDOM.setAttribute('class', 'goog-inline-block crx-capture-moment-button');
  plusDOM.appendChild(plusTextDOM);
  plusDOM.addEventListener('click', onPlusClicked, false);
  plusDOM.addEventListener('mouseover', function() {
    plusDOM.style.borderColor = '#C6C6C6';
    plusDOM.style.color = '#333';
  }, false);
  plusDOM.addEventListener('mouseout', function() {
    plusDOM.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    plusDOM.style.color = '#444';
  }, false);
  barDOM.appendChild(plusDOM);
}

function renderHangoutNormalUI() {
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
      plusDOM.addEventListener('click', onPlusClicked, false);

      var plusImageDOM = document.createElement('div');
      plusImageDOM.setAttribute('class', 'crx-capture-moment-image');
      plusImageDOM.setAttribute('style', 'height: 60px; width: 85px;' +
        'background: no-repeat url(' + chrome.extension.getURL('/img/camera.png') +') 0 -60px;');
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
}

function onApiReady(isHangoutExtra) {
  isHangoutExtra ? renderHangoutExtraUI() : renderHangoutNormalUI();
}

function discoverVideo() {
  var isHangoutExtra = window.location.pathname.indexOf('/hangouts/extras/') == 0;
  setTimeout(function() {
    var obj = document.querySelector('object');
    var ui = document.querySelector(isHangoutExtra ? '.gcomm-logo' : 'div[style*="opacity: 1"]');
    obj && ui ? onApiReady(isHangoutExtra) : discoverVideo();
  }, 1000);
}

// Start discovery.
discoverVideo();