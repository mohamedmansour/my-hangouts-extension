var isPopup = false;
var DISABLE_MAPS = true;

MapAPI = function(callback) {
  window.addEventListener('mapsAPILoadedEvent', callback);
};

/**
 * Loads Google Maps API.
 */
MapAPI.prototype.load = function(loadPopup) {
  if (DISABLE_MAPS) {
    return false;
  }
  isPopup = loadPopup;
  var mapsURL = 'http://maps.google.com/maps/api/js?key=AIzaSyDnMniG_y2Fo35Tw28QnR4OeUTVBMXIWi4&sensor=true&callback=mapsLoadedCallback';
  loadScript(mapsURL);
  return true;
};

/**
 * Loads a Script dynamically.
 */
var loadScript = function(uri, onloaded) {
  this.script = document.createElement('script');
  this.script.src = uri;
  this.script.onload = onloaded;
  document.head.appendChild(this.script);
};

/**
 * Callback when the Google Maps API returned any results.
 */
window.mapsLoadedCallback = function() {
  var mapsAPILoadedEvent = document.createEvent('Event');
  mapsAPILoadedEvent.initEvent('mapsAPILoadedEvent', true, true);
  if (isPopup) {
    loadScript('/js/libs/map_features.js', function() {
      loadScript('/js/libs/simplemarker.min.js', function() {
        loadScript('/js/libs/daynightoverlay.min.js', function() {
          window.dispatchEvent(mapsAPILoadedEvent);
        });
      });
    });
  }
  else {
    window.dispatchEvent(mapsAPILoadedEvent);
  }
};