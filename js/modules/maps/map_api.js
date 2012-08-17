var isPopup = false;
var DISABLE_MAPS = false;

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
  var mapsURL = 'https://maps.google.com/maps/api/js?key=AIzaSyDnMniG_y2Fo35Tw28QnR4OeUTVBMXIWi4&sensor=true&callback=mapsLoadedCallback';
  loadScript('gapi', mapsURL);
  return true;
};

/**
 * Unloads the API.
 */
MapAPI.prototype.unload = function(loadPopup) {
  removeNodes('.mapapi_gapi');
  if (loadPopup) {
    removeNodes('.mapapi_popup');
  }
};

/**
 * Removes the node for the specific class.
 */
MapAPI.prototype.removeNodes = function(elementClass) {
  var elements = document.querySelector(elementClass);
  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    element.parentNode.removeChild(element);
  }
};

/**
 * Loads a Script dynamically.
 */
var loadScript = function(type, uri, onloaded) {
  var script = document.createElement('script');
  script.onload = onloaded;
  script.setAttribute('src', uri);
  script.setAttribute('class', 'mapapi_' + type);
  document.head.appendChild(script);
};

/**
 * Callback when the Google Maps API returned any results.
 */
window.mapsLoadedCallback = function() {
  var mapsAPILoadedEvent = document.createEvent('Event');
  mapsAPILoadedEvent.initEvent('mapsAPILoadedEvent', true, true);
  if (isPopup) {
    loadScript('popup', '/js/modules/maps/map_features.js', function() {
      loadScript('popup', '/js/libs/simplemarker.min.js', function() {
        loadScript('popup', '/js/libs/daynightoverlay.min.js', function() {
          window.dispatchEvent(mapsAPILoadedEvent);
        });
      });
    });
  }
  else {
    window.dispatchEvent(mapsAPILoadedEvent);
  }
};
