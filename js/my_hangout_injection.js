/**
 * Injection Content Script.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
Injection = function() {
  this.availableSettings = [];
  this.hangoutArray = [];
  this.totalHangoutNotificationCounter = 0;
};

// Constants that can change.
Injection.STREAM_CONTAINER_ID = '.or';
Injection.STREAM_HANGOUT_ID = '.c-m-l.g-d.g-d-N.Lh';
Injection.STREAM_HANGOUT_VISITED_ID = 'gpi-crx-hangout';
Injection.STREAM_TIME_ID = '.Xi.go';
Injection.STREAM_NAME_ID = '.CC';
Injection.STREAM_USER_STATUS_ID = '.Gf';
Injection.STREAM_USER_IMAGES_ID = '.tC';
Injection.STREAM_USER_LINKS_ID = '.Lr';
Injection.STREAM_MORE_ID = '.c-j.hl.Fv';

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
    setTimeout(this.renderMoreStreamItems.bind(this), 5000);
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
  this.totalHangoutNotificationCounter = 0;
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
  var nameDataDOM = hangoutDOM.querySelector(Injection.STREAM_NAME_ID + ' a');
  var timeData = hangoutDOM.querySelector(Injection.STREAM_TIME_ID + ' a').innerText;
  var userData = hangoutDOM.querySelector(Injection.STREAM_USER_STATUS_ID).innerText;
  var participantsImages = hangoutDOM.querySelectorAll(Injection.STREAM_USER_IMAGES_ID + ' img');
  var participantsLinks = hangoutDOM.querySelectorAll(Injection.STREAM_USER_LINKS_ID + ' a');
  var userMatch = userData.match(/(\d+) people right now/);
  
  // Assign an ID for this hangout so we could refer back to it when we click on it.
  var idData = Injection.STREAM_HANGOUT_VISITED_ID + this.totalHangoutNotificationCounter;
  itemDOM.id = idData;
  
  // Extract the user Google IDs.
  var userIDs = {};
  for (var i = 0; i < participantsLinks.length; i++) {
    var participantLink = participantsLinks[i];
    userIDs[participantLink.innerText] = participantLink.getAttribute('oid');
  }

  // Hangout owners name and ID.
  var nameData = nameDataDOM.innerText;
  var nameId = nameDataDOM.getAttribute('oid');
  
  // Extract user data and place them in a nice format to send.
  var participants = [];
  for (var i = 0; i < participantsImages.length; i++) {
    var particpantImage = participantsImages[i];
    var particpantName = particpantImage.title;
    participants.push({
      name: particpantName, 
      image: particpantImage.src, 
      id: userIDs[particpantName]
    });
  }
  
  this.filterHangouts({
    name: nameData,
    nameid: nameId,
    id: idData,
    ts: timeData,
    participants: participants
  });
};

/**
 * Filter the the hangouts so that we merge hangouts that are the same:
 *
 *  1) Users can start many hangouts which are different.
 *  2) Users can share an existing hangout which are the same.
 *  3) Same user that starts different hangouts could be the same or different.
 *
 * @param {Object} newHangoutData The new hangout that became visible/updated on the stream.
 */
Injection.prototype.filterHangouts = function(newHangoutData) {
  // For fast access, store the participants in a map so we can refer to it while iterating.
  var participants = {}
  participants[newHangoutData.nameid] = 1;
  for (var i = 0; i < newHangoutData.participants.length; i++) {
    participants[newHangoutData.participants[i].id] = 1;
  }
  
  // Iterate through all participants for each hangout to see if our new hangout has been already
  // suggested. Some attributes to take into account.
  var found = false;
  for (var i = 0; i < this.hangoutArray.length; i++) {
    var hangout = this.hangoutArray[i];
    
    // Check if the one who started this hangout exists in the new hangout.
    if (!participants[hangout.nameid]) {
      continue;
    }

    // Lets check if any participants in this hangout exists in the new hangout.
    for (var j = 0; j < hangout.participants.length; j++) {
      if (!participants[hangout.participants.id]) {
        break;
      }
    }

    // If the hangouts is from the same name, we merge it directly. We do it at this step because
    // A user can run more than one hangout at the same time. Note, a user could have already have
    // been caught duplicating hangouts, so we just find it in the string.
    if (hangout.name.indexOf(newHangoutData.name) == -1) {
      hangout.name += ', ' + newHangoutData.name;
    }
    found = true;
  }
  
  // If we didn't find a duplicate, we just add it to the list!
  if (!found) {
    this.hangoutArray.push(newHangoutData);
  }
  
  this.totalHangoutNotificationCounter++;
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
  else if (request.method == 'MoreStream') {
    this.renderMoreStreamItems();
  }
  sendResponse({});
};

/**
 * Get more items from the stream.
 */
Injection.prototype.renderMoreStreamItems = function() {
  this.simulateClick(document.querySelector(Injection.STREAM_MORE_ID));
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