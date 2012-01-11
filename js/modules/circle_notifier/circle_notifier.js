/**
 * Incharge of circle notifications.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 */
CircleNotifier = function(updater) {
  this.updater =  updater;
  this.controller = updater.controller;
  
  // The registered circles to notify, this is updated in real time from settings.
  this.circles_to_notify = {};
  this.notify_circles = false;
  this.auto_close_notify = false;

  // Keep tracks of notifications.
  this.notified = {};             // Total, browser session.
  this.notificationSession = {};  // Notification, popup session.
  this.currentHangoutNotifications = {};

  // The current notification being displayed.
  this.notification = null;
  
  this.initializeListeners();
};

/**
 * Content within the notification should be lazy loaded since it takes time
 * for the popup to become visible. onload event listener doesn't work well
 * since extensions know about that popup "AFTER" the onload event fires.
 */
CircleNotifier.DISPLAY_CONTENT_TIMEOUT = 500;

/**
 * Autoclose timeout for the notification. Will close after 10 seconds.
 */
CircleNotifier.AUTO_CLOSE_TIMEOUT = 10000;

/**
 * Initialize listeners for the settings.
 */
CircleNotifier.prototype.initializeListeners = function() {
  settings.addListener('circles_to_notify', this.onSettingsChangeListener.bind(this));
  settings.addListener('notify_circles', this.onSettingsChangeListener.bind(this));
  settings.addListener('option-auto-close-notify', this.onSettingsChangeListener.bind(this));
  this.onSettingsChangeListener('circles_to_notify', settings.circles_to_notify);
  this.onSettingsChangeListener('notify_circles', settings.notify_circles);
  this.onSettingsChangeListener('auto_close_notify', settings.auto_close_notify);
};

/**
 * Adds the participant to the notification bucket so we can send it off.
 *
 * @param {Object} hangout The current hangout the participant is in.
 * @param {Object} participant The current participant to check so we could add.
 */
CircleNotifier.prototype.addParticipantToNotification = function(hangout, participant) {
  if (participant.circle_ids && participant.status) {
    if (!this.notified[hangout.data.id][participant.id]) {
      for (var c in participant.circle_ids) {
        var circleID = participant.circle_ids[c];
        if (this.circles_to_notify[circleID]) {
          this.notified[hangout.data.id][participant.id] = true;
          this.notificationSession[hangout.data.id] = this.notificationSession[hangout.data.id];
          if (!this.notificationSession[hangout.data.id]) {
            this.notificationSession[hangout.data.id] = { detail: hangout, participants: []};
            this.currentHangoutNotifications[hangout.data.id] = hangout;
          }
          this.notificationSession[hangout.data.id].participants.push(participant);
          return;
        }
      }
    }
    else {
      this.currentHangoutNotifications[hangout.data.id] = hangout;
      this.notified[hangout.data.id][participant.id] =  true;
    }
  }
};

/**
 * Reset the notification state to start over!
 */
CircleNotifier.prototype.reset = function() {
  this.notified = {};
  this.currentHangoutNotifications = {};
};

/**
 * Figure out if we should notify any participant in this hangout.
 */
CircleNotifier.prototype.notify = function(hangouts) {
  this.currentHangoutNotifications = {};

  // Only notify if the user permits.
  if (!this.notify_circles) {
    return;
  }
  for (var h in hangouts) {
    var hangout = hangouts[h];
    this.notified[hangout.data.id] = this.notified[hangout.data.id] || {};
    // Check owner.
    this.addParticipantToNotification(hangout, hangout.owner);
    // Check participants.
    for (var p in hangout.data.participants) {
      var participant = hangout.data.participants[p];
      this.addParticipantToNotification(hangout, participant);
    }
  }

  // Always update the popup when it is open or session exists.
  if (this.notification || !$.isEmptyObject(this.notificationSession)) { 
    this.showNotification(this.notificationSession);
  }
};

/**
 * Shows the HTML5 notification popup, if it is already visible, it will 
 * update it in realtime so the user will not have many notifications.
 */
CircleNotifier.prototype.showNotification = function(notifyHangouts) {
  if (this.notification) {
    this.sendNotificationUpdate(notifyHangouts);
  }
  else {
    this.notification = this.createNotification();
    this.notification.show();
    setTimeout(this.sendNotificationUpdate.bind(this),
               CircleNotifier.DISPLAY_CONTENT_TIMEOUT,
               notifyHangouts);
    if (this.auto_close_notify) {
      setTimeout(this.onNotificationCancel.bind(this),
                 CircleNotifier.AUTO_CLOSE_TIMEOUT);
    }
  }
};

/**
 * Since we live in the extension context, we have total control of the views
 * in this regard, we send data to the controller.
 */
CircleNotifier.prototype.sendNotificationUpdate = function(notifyHangouts) {
  chrome.extension.getViews({type:'notification'}).forEach(function(win) {
    if (win.controller) {
      win.controller.refresh(notifyHangouts);
    }
  });
};

/**
 * Creates a new HTML5 Notification and registers some events so we can send
 * data back to it when it is already visible.
 */
CircleNotifier.prototype.createNotification = function() {
  var notification = webkitNotifications.createHTMLNotification('notification.html');
  notification.onclose  = this.onNotificationClose.bind(this);
  return notification;
};

/**
 * Cancel the notification forcefully.
 */
CircleNotifier.prototype.onNotificationCancel = function() {
  if (this.notification) {
    this.notification.cancel();
  }
};

/**
 * When a notification is closed, we must destroy the notification so we can recreate it.
 */
CircleNotifier.prototype.onNotificationClose = function() {
  this.notification = null;
  this.notificationSession = {};
};

/**
 * Listen on settings changes in real time.
 * @param {string} key The setting key that has been updated.
 * @param {string} val The new value for that setting.
 */
CircleNotifier.prototype.onSettingsChangeListener = function(key, val) {
  if (key == 'circles_to_notify') {
    this.circles_to_notify = {};
    if (val.length != 0) {
      for (var c in val) {
        this.circles_to_notify[val[c]] = true;
      }
    }
  }
  else if (key == 'notify_circles') {
    this.notify_circles = val;
  }
  else if (key == 'auto_close_notify') {
    this.auto_close_notify = val;
  }
};

/**
 * The current hangouts that were notified.
 */
CircleNotifier.prototype.getCurrentHangoutNotifications = function() {
  var hangouts = [];
  $.each(this.currentHangoutNotifications, function(key, value) {
    hangouts.push(value);
  });
  return hangouts;
};
