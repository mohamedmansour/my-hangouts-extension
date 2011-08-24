/**
 * Manages a single instance of the entire application.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
BackgroundController = function() {
  this.onExtensionLoaded();
  this.hangouts = [];
  this.plusTabId = -1;
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
  this.doWorkTabs(function(tab) {
    chrome.tabs.executeScript(tab.id, { file: 'js/my_hangout_injection.js',
                              allFrames: true }, function() {
      // This is needed because all the DOM is already inserted, no events
      // would have been fired. This will force the events to fire after
      // initial injection.
      chrome.tabs.sendRequest(tab.id, { method: 'InitialInjection' });
    });
  });
};

/**
 * Do some work on all tabs that are on Google Plus.
 *
 * @param {Function<Tab>} callback The callback with the tab results.
 */
BackgroundController.prototype.doWorkTabs = function(callback) {
  self = this;
  chrome.windows.getAll({ populate: true }, function(windows) {
    for (var w = 0; w < windows.length; w++) {
      var tabs = windows[w].tabs;
      for (var t = 0; t < tabs.length; t++) {
        var tab = tabs[t];
        if (self.isValidURL(tab.url)) { 
          callback(tab);
        }
      }
    }
  });
};

/**
 * Inform all Content Scripts that new settings are available.
 */
BackgroundController.prototype.updateSettings = function() {
  self = this;
  this.doWorkTabs(function(tab) {
    chrome.tabs.sendRequest(tab.id, {
        method: 'SettingsUpdated',
        data: settings.whitelist
    });
  });
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
  // Listens on new tab updates. Google+ uses new sophisticated HTML5 history
  // push API, so content scripts don't get recognized always. We inject
  // the content script once, and listen for URL changes.
  chrome.tabs.onUpdated.addListener(this.tabUpdated.bind(this));
  chrome.extension.onRequest.addListener(this.onExternalRequest.bind(this));
  chrome.browserAction.setBadgeText({ text: '' });
  this.drawBadgeIcon(-1);
};

/**
 * Listens on new tab URL updates. We use this make sure we capture history
 * push API for asynchronous page reloads.
 *
 * @param {number} tabId Tab identifier that changed.
 * @param {object} changeInfo lists the changes of the states.
 * @param {object<Tab>} tab The state of the tab that was updated.
 */
BackgroundController.prototype.tabUpdated = function(tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete' && this.isValidURL(tab.url)) {
    chrome.tabs.sendRequest(tabId, { method: 'RenderItems' });
  }
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
    this.drawBadgeIcon(request.data.length, true);
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
  return this.hangouts;
};

BackgroundController.prototype.openHangout = function(id) {
  chrome.tabs.sendRequest(this.plusTabId, {method: 'OpenHangout', data: id});
};