/**
 * Global Settings.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 */
settings = {
  get version() {
    return localStorage['version'];
  },
  set version(val) {
    settings.notify('version', val);
    localStorage['version'] = val;
  },
  get opt_out() {
    var key = localStorage['opt_out'];
    return (typeof key == 'undefined') ? false : key === 'true';
  },
  set opt_out(val) {
    settings.notify('opt_out', val);
    localStorage['opt_out'] = val;
  },
  get circles_to_notify() {
    var key = localStorage['circles_to_notify'];
    return (typeof key == 'undefined' || key == '') ? [] : key.split(', ');
  },
  set circles_to_notify(val) {
    if (typeof val == 'object') {
      settings.notify('circles_to_notify', val);
      localStorage['circles_to_notify'] = val.join(', ');
    }
  },
  get notify_circles() {
    var key = localStorage['notify_circles'];
    return (typeof key == 'undefined') ? false : key === 'true';
  },
  set notify_circles(val) {
    settings.notify('notify_circles', val);
    localStorage['notify_circles'] = val;
  },
  get auto_close_notify() {
    var key = localStorage['auto_close_notify'];
    return (typeof key == 'undefined') ? false : key === 'true';
  },
  set auto_close_notify(val) {
    settings.notify('auto_close_notify', val);
    localStorage['auto_close_notify'] = val;
  },
  get open_hangout_new_window() {
    var key = localStorage['open_hangout_new_window'];
    return (typeof key == 'undefined') ? false : key === 'true';
  },
  set open_hangout_new_window(val) {
    settings.notify('open_hangout_new_window', val);
    localStorage['open_hangout_new_window'] = val;
  },
  get moment_skip_dialog() {
    var key = localStorage['moment_skip_dialog'];
    return (typeof key == 'undefined') ? false : key === 'true';
  },
  set moment_skip_dialog(val) {
    settings.notify('moment_skip_dialog', val);
    localStorage['moment_skip_dialog'] = val;
  },
};

// Settings event listeners.
settings.listeners = {};
settings.notify = function(key, val) {
  var listeners = settings.listeners[key]
  if (listeners) {
    listeners.forEach(function(callback, index) {
      callback(key, val);
    });
  }
};
settings.addListener = function(key, callback) {
  if (!settings.listeners[key]) {
    settings.listeners[key] = [];
  }
  settings.listeners[key].push(callback);
};