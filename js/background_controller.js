/**
 * Manages a single instance of the entire application.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
BackgroundController = function() {
  this.onExtensionLoaded();
  this.plus = new GooglePlusAPI();
  this.updater = new UpdaterHangoutProcessor(this);
  this.moments = new MomentCaptureBackend();
  this.UPDATE_INTERVAL = 30000;
};

/**
 * Triggered when the extension just loaded. Should be the first thing
 * that happens when chrome loads the extension.
 */
BackgroundController.prototype.onExtensionLoaded = function() {
  var currVersion = chrome.app.getDetails().version;
  var prevVersion = settings.version;
  if (currVersion != prevVersion) {
    // Check if we just installed this extension.
    if (typeof prevVersion == 'undefined') {
      this.onInstall();
    } else {
      this.onUpdate(prevVersion, currVersion);
    }
    settings.version = currVersion;
  }
};

/**
 * Triggered when the extension just installed.
 */
BackgroundController.prototype.onInstall = function() {
};


/**
 * Inform all Content Scripts that new settings are available.
 */
BackgroundController.prototype.updateSettings = function() {
  self = this;
};

/**
 * Triggered when the extension just uploaded to a new version. DB Migrations
 * notifications, etc should go here.
 *
 * @param {string} previous The previous version.
 * @param {string} current  The new version updating to.
 */
BackgroundController.prototype.onUpdate = function(previous, current) {
};

/**
 * Initialize the main Background Controller
 */
BackgroundController.prototype.init = function() {
  this.plus.init(function(status) {
    window.setInterval(this.refreshPublicHangouts.bind(this), this.UPDATE_INTERVAL);
    this.refreshPublicHangouts();
  }.bind(this));

  chrome.extension.onRequest.addListener(this.onMessageListener.bind(this));
  chrome.browserAction.setBadgeText({ text: '' });
  this.drawBadgeIcon(-1);
};

/**
 * Message Listener for extension.
 */
BackgroundController.prototype.onMessageListener = function(request, sender, sendResponse) {
  switch (request.service) {
    case 'Capture':
      var args = [];
      if (request.arguments) args = args.concat(request.arguments);
      args.push(sendResponse);
      this.moments[request.method].apply(this.moments, args);
      break;
    case 'RemoveOverlay':
      chrome.tabs.sendRequest(sender.tab.id, {method: 'RemoveOverlayUI'});
      break;
    default:
      sendResponse('hello');
      break;
  }
};

/**
 * Draws a textual icon on the browser action next to the extension toolbar.
 *
 * @param {number} count The number to draw.
 * @param {boolean} newItem Differentiates between new items available.
 */
BackgroundController.prototype.drawBadgeIcon = function(count, newItem) {
  var ctx = document.createElement('canvas').getContext('2d');
  if (newItem) {
    ctx.fillStyle = 'rgba(48, 121, 237, 1)';
  }
  else {
    ctx.fillStyle = 'rgba(208, 208, 208, 1)';
  }
  ctx.fillRect(0, 0, 19, 19);
  ctx.font = 'bold 13px arial, sans-serif';
  ctx.fillStyle = '#fff';
  if (count > 9){
    ctx.fillText('9+', 3, 14);
  }
  else if (count > 0) {
    ctx.fillText(count + '', 6, 14);
  }
  else {
    ctx.fillText('?', 6, 14);
  }
  chrome.browserAction.setIcon({imageData: ctx.getImageData(0,0,19,19)});
}

/**
 * @returns a list of hangouts.
 */
BackgroundController.prototype.getHangouts = function() {
  return this.updater.getHangouts();
};

/**
 * Get the next hangout update from the list.
 */
BackgroundController.prototype.refreshPublicHangouts = function() {
  this.updater.doNext();
};

/**
 * Updater State Machine to execute different states each iteration.
 *
 * @param {BackgroundController} controller The background controller.
 */
UpdaterHangoutProcessor = function(controller) {
  this.controller = controller;
  this.currentState = 0;
  this.maxState = 2;
  
  this.cache = {};
  this.hangouts = [];
  
  this.HANGOUT_SEARCH_QUERY = {
    query: '"is hanging out with" "right now!"',
    extra: false
  };
  this.HANGOUT_HX_SEARCH_QUERY = {
    query: '"hangout named"',
    extra: true
  };
};

/**
 * @return List of hangouts.
 */
UpdaterHangoutProcessor.prototype.getHangouts = function() {
  return this.hangouts;
};

/**
 * @param {Object} obj The search object where keys are "query" and "extra"
 */
UpdaterHangoutProcessor.prototype.search = function(obj) {
  var self = this;
  self.controller.plus.search(function(data) {
    for (var i = 0; i < data.length; i++) {
      var hangout = data[i];
      var cache = self.cache[hangout.data.id];
      if (!hangout.data.active || cache) {
        // Preserve public status. It weighs more than limited.
        if (cache == 'true') hangout.public = cache;
        continue;
      }
      self.cache[hangout.data.id] = hangout.public.toString();
      hangout.data.extra = obj.extra;
      self.hangouts.push(hangout);
    }
    self.controller.drawBadgeIcon(self.hangouts.length, true);
  }, obj.query, {precache: 3, type: 'hangout'});
};
  
/**
 * Executes the next state.
 */
UpdaterHangoutProcessor.prototype.doNext = function() {
  this['state' + this.currentState]();
  if (this.currentState >= this.maxState) {
    this.currentState = 0;
  }
  else {
    this.currentState++;
  }
};

/**
 * Reset the state after the third iteration and query all searches.
 */
UpdaterHangoutProcessor.prototype.state0 = function() {
  this.hangouts.length = 0;
  this.cache = {};
  this.search(this.HANGOUT_SEARCH_QUERY);
  this.search(this.HANGOUT_HX_SEARCH_QUERY);
};

/**
 * Execute the Normal Hangout Search Query
 */
UpdaterHangoutProcessor.prototype.state1 = function() {
  this.search(this.HANGOUT_SEARCH_QUERY);
};

/**
 * Execute the Named Hangout Search Query
 */
UpdaterHangoutProcessor.prototype.state2 = function() {
  this.search(this.HANGOUT_HX_SEARCH_QUERY);
};
