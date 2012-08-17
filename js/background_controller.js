/**
 * Global Debug options
 */
DEBUG = true;

/**
 * Manages a single instance of the entire application.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
BackgroundController = function() {
  this.browserActionController = new BrowserActionController();

  this.UPDATE_INTERVAL = 45000; // Every 45 seconds.
  this.UPDATE_CIRCLES_INTERVAL = 1000 * 60 * 60 + 15000; // Every hour and 15 seconds;
  this.REFRESH_INTERVAL = 5000; // Look for new results every 5 seconds.
  this.CLEAN_INTERVAL = 15000;
  this.myFollowersMap = {};
  this.myCirclesMap = {};
  this.myCirclesList = [];

  this.onExtensionLoaded();
  this.plus = new GooglePlusAPI();
  this.updaterBackend = new HangoutUpdater(this);

  var db = this.initDatabase();
  this.mapBackend = new MapBackend(db, this);
  this.captureBackend = new CaptureBackend(db);
  this.statisticsBackend = new StatisticsBackend(db);
};

/**
 * Initialize the My Hangouts database.
 */
BackgroundController.prototype.initDatabase = function() {
  return openDatabase('My Hangouts', '1.0', 'my-hangouts', 10 * 1024 * 1024);
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
  chrome.extension.onRequest.addListener(this.onMessageListener.bind(this));
  this.plus.init(function(status) {
    window.setInterval(this.queryPublicHangouts.bind(this), this.UPDATE_INTERVAL);
    window.setInterval(this.refreshCircles.bind(this), this.UPDATE_CIRCLES_INTERVAL);
    window.setInterval(this.refreshPublicHangouts.bind(this), this.REFRESH_INTERVAL);
    window.setInterval(this.cleanPublicHangouts.bind(this), this.CLEAN_INTERVAL);
    this.queryPublicHangouts();
    this.refreshCircles();
  }.bind(this));
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
      this.captureBackend[request.method].apply(this.captureBackend, args);
      break;
    case 'RemoveOverlay':
      chrome.tabs.sendRequest(sender.tab.id, {method: 'RemoveOverlayUI'});
      break;
    case 'GetSettings':
      var requestedSettings = request.data;
      var answeredSettings = [];
      requestedSettings.forEach(function(item, idx) {
        answeredSettings[idx] = settings[item];
      });
      sendResponse(answeredSettings);
      break;
    case 'OpenURL':
      chrome.tabs.create({url: chrome.extension.getURL(request.data)});
      break;
    default:
      sendResponse('hello');
      break;
  }
};

/**
 * @returns a the browser action controller.
 */
BackgroundController.prototype.getBrowserAction = function() {
  return this.browserActionController;
};

/**
 * @returns a list of hangouts.
 */
BackgroundController.prototype.getHangoutBackend = function() {
  return this.updaterBackend;
};

/**
 * The map backend
 */
BackgroundController.prototype.getMapBackend = function() {
  return this.mapBackend;
};

/**
 * Get the next hangout query update from the list.
 */
BackgroundController.prototype.queryPublicHangouts = function() {
  this.updaterBackend.doNext();
};

/**
 * Get the pull whatever search results we have and update the hangouts.
 */
BackgroundController.prototype.refreshPublicHangouts = function() {
  this.updaterBackend.update();
};
/**
 *  Remove deadhangouts
 */
BackgroundController.prototype.cleanPublicHangouts = function() {
  this.updaterBackend.cleanHangouts();
};

/**
 * Refresh internal circles database. Then add them to some internal map.
 */
BackgroundController.prototype.refreshCircles = function() {
  var self = this;
  this.plus.getDatabase().clearAll(function(clearStatus) {
    self.plus.refreshCircles(function(status) {
      self.plus.getCircles(function(res) {
        if (res.status) {
          self.myCirclesList = res.data;

          // The position for circles are using strange hex format, so
          // we will maintain the position ourselves here.
          var position = 0;
          self.myCirclesList.forEach(function(circle) {
            position++;

            // We make a clone, so we can change contents since it was immutable.
            self.myCirclesMap[circle.id] = {
              count: circle.count,
              description: circle.description,
              id: circle.id,
              name: circle.name,
              position: position
            };
          });
        }
      });
      self.plus.getDatabase().getPersonEntity().findMap(function(res) {
        if (res.status) {
          self.myFollowersMap = res.data;
        }
      });
    });
  });
};

/**
 * Checks the internal cache to see if the user is in your circles and receives.
 * the user object from them.
 *
 * @return the follower object, null if doesn't exist.
 */
BackgroundController.prototype.getPerson = function(id) {
  return this.myFollowersMap[id];
};

/**
 * Gets a list/map of circles that the current user is registered with.
 *
 * @return {Object} an object of circles where each key is an id for the circle.
 * @return {Array<Object>} a list of circle objects in correct order.
 */
BackgroundController.prototype.getCircles = function(asMap) {
  return asMap ? this.myCirclesMap : this.myCirclesList;
};

/**
 * Fetches the Circle for a specific ID.
 *
 * @param {string} The ID for the circle.
 * @return {Object} The circle found otherwise is undefined.
 */
BackgroundController.prototype.getCircle = function(circleID) {
  return this.myCirclesMap[circleID];
};

/**
 * Opens a special window depending on the target of the DOM we are hitting.
 *
 * @param {HTMLElement} target The target where the URL lives.
 * @param {string} href The URL to open.
 */
BackgroundController.prototype.openSpecialWindow = function(target, href) {
  if (target.is('.button') && settings.open_hangout_new_window) {
    var id = href.substring(href.lastIndexOf('/'));
    window.open(href,'hangoutwin-' + id, 'toolbar=0,location=1,resizable=1');
  }
  else {
    chrome.tabs.create({url: href});
  }
};


// Start it. We need the controller so we refer to it in different pages.
var controller = new BackgroundController();
controller.init();
