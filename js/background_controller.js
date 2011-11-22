/**
 * Manages a single instance of the entire application.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
BackgroundController = function() {
  this.onExtensionLoaded();
  this.hangouts = [];
  this.public_hangouts = [];
  this.plus = new GooglePlusAPI();
  this.plusTabId = -1;
  this.UPDATE_INTERVAL = 30000;
  this.HANGOUT_SEARCH_QUERY = '"is hanging out with" "right now!"';
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
 * Check if the URL is part of plus websites.
 
 * @param {string} url The URL to check if valid.
 */
BackgroundController.prototype.isValidURL = function(url) {
  return url.match('^https://plus.google.com/?(u/[0-9]/)?(\\?hl=[a-zA-Z\-]+)?$') != null
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

  chrome.browserAction.setBadgeText({ text: '' });
  this.drawBadgeIcon(-1);
};

/**
 * Listen on requests coming from content scripts.
 *
 * @param {object} request The request object to match data.
 * @param {object} sender The sender object to know what the source it.
 * @param {Function} sendResponse The response callback.
 */
BackgroundController.prototype.onExternalRequest = function(request, sender, sendResponse) {
  if (request.method == 'GetSettings') {
    this.plusTabId = sender.tab.id;
    sendResponse({data: settings.whitelist});
  }
  else if (request.method == 'NewHangoutItem') {
    //this.drawBadgeIcon(request.data.length, true);
    this.hangouts = request.data;
    sendResponse({});
  }
  else {
    sendResponse({});
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
 * @returns 
 */
BackgroundController.prototype.getHangouts = function() {
  return [this.hangouts, this.public_hangouts];
};

/**
 * Open Hangout.
 */
BackgroundController.prototype.openHangout = function(id) {
  chrome.tabs.sendRequest(this.plusTabId, {method: 'OpenHangout', data: id});
};

/**
 * Find more hangouts.
 */
BackgroundController.prototype.doMoreHangouts = function() {
  chrome.tabs.sendRequest(this.plusTabId, {method: 'MoreStream'});
};

BackgroundController.prototype.refreshPublicHangouts = function() {
  var self = this;
  this.plus.search(function(data) {
  
    var cache = {};
    var hangouts = [];
    for (var i = 0; i < data.length; i++) {
      var hangout = data[i];
      if (!hangout.data.active || cache[hangout.data.id]) {
        continue;
      }
      cache[hangout.data.id] = true;
      hangouts.push(hangout);
    }
    self.public_hangouts = hangouts;
    self.drawBadgeIcon(hangouts.length, true);
  }, this.HANGOUT_SEARCH_QUERY, {precache: 4, type: 'hangout'});
};
