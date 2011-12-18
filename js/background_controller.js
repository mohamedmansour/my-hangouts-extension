/**
 * Manages a single instance of the entire application.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
BackgroundController = function() {
  var db = this.initDatabase();
  this.onExtensionLoaded();
  this.plus = new GooglePlusAPI();
  this.updater = new HangoutUpdater(this);
  this.captureBackend = new CaptureBackend(db);
  this.statisticsBackend = new StatisticsBackend(db);
  this.UPDATE_INTERVAL = 30000; // Every 30 seconds.
  this.UPDATE_CIRCLES_INTERVAL = 1000 * 60 * 60 + 15000; // Every hour and 15 seconds;
  this.myFollowersMap = {};
  this.myCirclesList = [];
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
  this.plus.init(function(status) {
    window.setInterval(this.refreshPublicHangouts.bind(this), this.UPDATE_INTERVAL);
    window.setInterval(this.refreshCircles.bind(this), this.UPDATE_CIRCLES_INTERVAL);
    this.refreshPublicHangouts();
    this.refreshCircles();
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
      this.captureBackend[request.method].apply(this.captureBackend, args);
      break;
    case 'RemoveOverlay':
      chrome.tabs.sendRequest(sender.tab.id, {method: 'RemoveOverlayUI'});
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
 * Draws a textual icon on the browser action next to the extension toolbar.
 *
 * @param {number} count The number to draw.
 * @param {boolean} newItem Differentiates between new items available.
 */
BackgroundController.prototype.drawBadgeIcon = function(count, newItem) {
  var ctx = document.createElement('canvas').getContext('2d');

  /**
   * Private method which fills a rectangle that has rounded corners
   * Used to imitate style of the Google+ Notification icon
   *
   * TOTHINK: Maybe this method should be defined somewhere else...
   * A possibility would be to extend the canvas context prototype
   * by seperate methods for filling and stroking in order to keep a 
   * consistent interface.
   *
   * @param {Object} context The canvas context on which to draw.
   * @param {number} x The x-coordinate of the upper left corner of the 
   * desired rounded rectangle
   * @param {number} y The y-coordinate of the upper left corner of the
   * desired rounded rectangle
   * @param {number} width The desired rectangle's width.
   * @param {number} height The desired rectangle's height.
   * @param {number} radius The radius with which the corners should be rounded
   */
  var fillAndStrokeRoundRect = function(context, x, y, width, height, radius) {
    context.beginPath();
    // Let's start in the upper left corner of the shape and draw clockwise
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.fill();
    context.stroke();
  }

  if (newItem) {
    ctx.fillStyle = 'rgba(48, 121, 237, 1)';
    ctx.strokeStyle = 'rgba(43, 108, 212, 0.5)';
    
    // Sadly, the fix below makes the active badge look not like the original
    // one - therefore we have to have two different fill calls (with 
    // different coordinates)
    fillAndStrokeRoundRect(ctx, 0, 0, 19, 19, 2);
  }
  else {
    ctx.fillStyle = 'rgba(237, 237, 237, 1)';
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';

    // We are offsetting the rectangle by half a unit in order to achieve a 
    // crisp border on the inactive badge (see characteristics of lineWidth: 
    // http://goo.gl/DFnaA)
    fillAndStrokeRoundRect(ctx, 0.5, 0.5, 18, 18, 2);
  }

  ctx.font = 'bold 11px arial, sans-serif';
  ctx.fillStyle = newItem ? '#fff' : '#999';

  chrome.browserAction.setTitle({title: 'There are ' + count + ' people hanging out!'});
  if (count > 19){
    ctx.fillText('19+', 1, 14);
  }
  else if (count > 9){
    ctx.fillText(count + '', 3, 14);
  }
  else if (count >= 0) {
    ctx.fillText(count + '', 6.5, 14);
  }
  else {
    ctx.fillText('?', 6, 14);
    chrome.browserAction.setTitle({title: 'Your session to Google+ was not found, please log in or reopen Chrome.'});
  }
  chrome.browserAction.setIcon({imageData: ctx.getImageData(0,0,19,19)});
};

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
 * Refresh internal circles database. Then add them to some internal map.
 */
BackgroundController.prototype.refreshCircles = function() {
  var self = this;
  this.plus.getDatabase().clearAll(function(clearStatus) {
    self.plus.refreshCircles(function(status) {
      self.plus.getCircles(function(res) {
        if (res.status) {
          self.myCircles = res.data;
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
 * Gets a list of circles that the current user is registered with.
 *
 * @return {Array<Object>} a list of circle objects in correct order.
 */
BackgroundController.prototype.getCircles = function() {
  return this.myCircles;
};