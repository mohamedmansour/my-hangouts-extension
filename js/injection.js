/**
 * Injection Content Script.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
Injection = function() {
  this.availableSettings = [];
  this.hangoutArray = [];
};

// Constants that can change.
Injection.STREAM_CONTAINER_ID = '.Wq';
Injection.STREAM_HANGOUT_ID = '.d-q-p.j-e.j-e-Y.Rq';
Injection.STREAM_HANGOUT_VISITED_ID = 'gpi-crx-hangout';
Injection.STREAM_TIME_ID = '.fl.Br';
Injection.STREAM_NAME_ID = '.Ii';
Injection.STREAM_USER_STATUS_ID = '.Ar';
Injection.STREAM_USER_IMAGES_ID = '.cz';
Injection.STREAM_USER_LINKS_ID = '.WB'

/**
 * Initialize the events that will be listening within this DOM.
 */
Injection.prototype.init = function() {
  // Listen when the subtree is modified for new posts.
  var googlePlusContentPane = document.querySelector(Injection.STREAM_CONTAINER_ID);
  if (googlePlusContentPane) {
    chrome.extension.sendRequest({method: 'GetSettings'}, this.onSettingsReceived.bind(this));
    googlePlusContentPane.addEventListener('DOMSubtreeModified',
                                           this.onGooglePlusContentModified.bind(this), false);
    chrome.extension.onRequest.addListener(this.onExternalRequest.bind(this));
  }
};

/**
 * Settings received, update content script.
 */
Injection.prototype.onSettingsReceived = function(response) { 
  this.availableSettings = response.data;
};

/**
 * Visits the options page.
 * 
 * @param {Object<MouseEvent>} event The mouse event.
 */
Injection.prototype.visitOptions = function(event) {
  window.open(chrome.extension.getURL('options.html'));
};

/**
 * Render all the items in the current page.
 */
Injection.prototype.resetAndRenderAll = function() {
  var googlePlusContentPane = document.querySelector(Injection.STREAM_CONTAINER_ID);
  if (googlePlusContentPane) {
    googlePlusContentPane.removeEventListener('DOMSubtreeModified',
                                              this.onGooglePlusContentModified.bind(this), false);
    googlePlusContentPane.addEventListener('DOMSubtreeModified',
                                           this.onGooglePlusContentModified.bind(this), false);
  }
  this.renderAllHangouts();
};

/**
 * Render all hangouts on the page and inform the background page that the new
 * hangout item exists.
 */
Injection.prototype.renderAllHangouts = function() {
  this.hangoutArray = [];
  var hangouts = document.querySelectorAll(Injection.STREAM_HANGOUT_ID);
  for (var i = 0; i < hangouts.length; i++) {
    var hangout = hangouts[i];
    if (hangout) {
      this.onHangoutItem(hangout);
    }
  }
  chrome.extension.sendRequest({method: 'NewHangoutItem', data: this.hangoutArray});
};

/**
 * Hangout Post recieved.
 *
 * @param {Object<ModifiedDOM>} itemDOM modified event.
 */
Injection.prototype.onHangoutItem = function(itemDOM) {
  var hangoutDOM = itemDOM.parentNode.parentNode.parentNode.parentNode.parentNode;
  var nameData = hangoutDOM.querySelector(Injection.STREAM_NAME_ID).innerText;
  var timeData = hangoutDOM.querySelector(Injection.STREAM_TIME_ID).innerText;
  var idData = Injection.STREAM_HANGOUT_VISITED_ID + this.hangoutArray.length;
  var userData = hangoutDOM.querySelector(Injection.STREAM_USER_STATUS_ID).innerText;
  var participantsImages = hangoutDOM.querySelectorAll(Injection.STREAM_USER_IMAGES_ID + ' img');
  var participantsLinks = hangoutDOM.querySelectorAll(Injection.STREAM_USER_LINKS_ID + ' a');
  var userMatch = userData.match(/(\d+) people right now/);
  var userCount = 0;
  if (userMatch) {
    userCount = parseInt(userMatch[1]);
  }
  itemDOM.id = idData;
  
  var userLinks = {};
  for (var i = 0; i < participantsLinks.length; i++) {
    var participantLink = participantsLinks[i];
    userLinks[participantLink.innerText] = participantLink.getAttribute('oid');
  }

  // Extract user data and place them in a nice format to send.
  var participants = [];
  for (var i = 0; i < participantsImages.length; i++) {
    var particpantImage = participantsImages[i];
    var particpantName = particpantImage.title;
    participants.push({
      name: particpantName, 
      image: particpantImage.src, 
      id: userLinks[particpantName]
    });
  }
  
  // I know this is bad, but I don't feel like storing a length structure.
  // Perhaps do a sorted structure and do a binary search.
  for (var i = 0; i < this.hangoutArray.length; i++) {
    var hangout = this.hangoutArray[i];
    if (hangout.name == nameData) {
      hangout.id = idData;
      hangout.ts = timeData;
      hangout.userCount = userCount;
      return;
    }
  }
  this.hangoutArray.push({
    name: nameData, 
    id: idData, 
    ts: timeData, 
    userCount: userCount,
    participants: participants
  });
};

/**
 * Fired when new items are appearing on the wall.
 */
Injection.prototype.onGooglePlusContentModified = function(e) {
  if (e.target.nodeType == Node.ELEMENT_NODE && e.target.id.indexOf('update') == 0) {
    this.renderAllHangouts();
  }
};

/**
 * API to handle when clicking on different HTML5 push API. This somehow doesn't
 * play well with DOMSubtreeModified
 */
Injection.prototype.onExternalRequest = function(request, sender, sendResponse) {
  if (request.method == 'RenderItems' || request.method == 'InitialInjection') {
    this.resetAndRenderAll();
  }
  else if (request.method == 'SettingsUpdated') {
    this.onSettingsReceived(request);
  }
  else if (request.method == 'OpenHangout') {
    this.simulateClick(document.getElementById(request.data));
  }
  sendResponse({});
};

/**
 * Simulate a mouse click event.
 */
Injection.prototype.simulateClick = function(element) { 
  var initEvent = function(element, str) { 
    var clickEvent = document.createEvent('MouseEvents'); 
    clickEvent.initEvent(str, true, true); 
    element.dispatchEvent(clickEvent); 
  }; 
  initEvent(element, 'mousedown'); 
  initEvent(element, 'click'); 
  initEvent(element, 'mouseup'); 
};

// Main
var injection = new Injection();
injection.init();