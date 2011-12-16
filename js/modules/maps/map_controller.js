/**
 * Testing mapping out hangout participants' locations.
 *
 * @author jbc
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 */

MapController = function(popupController) {
  this.popup = popupController;
  this.bkg = this.popup.bkg.controller; 
  this.mapBackend = this.bkg.getMapBackend();
  var latlong = new google.maps.LatLng(0, 0);
  this.map = new google.maps.Map($('#map-canvas')[0], {
    zoom: 1,
    center: latlong,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
  this.imageSize  = new google.maps.Size(20, 20);
  this.markersArray = [];
  this.startUpdates();
};

/**
 * Initialization code.
 */
MapController.prototype.init = function() {

};

/**
 *
 */
MapController.prototype.clearMarkers = function() {
  if (this.markersArray) {
    for (i in this.markersArray) {
      this.markersArray[i].setMap(null);
    }
    this.markersArray.length = 0;
  }
};

/**
 * Start the markers update, in real time.
 */
MapController.prototype.startUpdates = function() {
  var self = this;
  this.markersInterval = setInterval(function() {
      self.addMarkersFromCache();
  }, 2500);
  this.addMarkersFromCache();
};

/**
 *     Put a marker on the map for every person we know about who has been fully cached
 */
MapController.prototype.addMarkersFromCache = function() {
  var self = this;
  this.clearMarkers();
  var gpIds = this.bkg.getHangoutBackend().getAllParticipants();
  var i = 0;
  for (i = 0; i < gpIds.length; i++) {
    var id = gpIds[i];
    var personCacheItem = self.mapBackend.getPersonFromCache(id);
    if (personCacheItem) {
      var locationCacheItem = self.mapBackend.getLocationFromCache(personCacheItem.address);
      if (locationCacheItem) {
        var marker = new SimpleMarker(self.map, locationCacheItem.geometry.location, {
          id: 'person-' + personCacheItem.data.id,
          classname: 'personMarker',
          image: personCacheItem.data.photo + '?sz=24',
          dimension: new google.maps.Size(24,24),
          anchor: new google.maps.Point(12,12),
          title: personCacheItem.data.name + ', ' + locationCacheItem.formatted_address
        });
        self.markersArray.push(marker);
        // Marker click
        self.addPersonMarkerClickedEvent(personCacheItem.data.id, marker, marker.getPosition());
      }
    }
  }
};

/**
 * For each marker, register a click event so a InfoWindow will popup with the
 * detailed hangout information.
 */
MapController.prototype.addPersonMarkerClickedEvent = function(userID, marker, location) {
  console.log(userID, location);
  google.maps.event.addListener(marker, 'click', function() {
    var currentHangout = this.getHangoutObjectFromPerson(userID);
    if (currentHangout) {
      var hangoutPopupDOM = $('#hangouts-popup-template').tmpl({hangout: currentHangout});
      var infowindow = new google.maps.InfoWindow();
      infowindow.setContent(hangoutPopupDOM.html());
      infowindow.setPosition(new google.maps.LatLng(location.lat(),location.lng()));
      infowindow.open(this.map);
    }
  }.bind(this));
};

/**
 * Retrieve the hangout given the participant id.
 *
 * @param {number} id The participant id from Google.
 * @return {Object} the hangout obj, null if not found.
 */
MapController.prototype.getHangoutObjectFromPerson = function(id) {
  var hangout = null;
  this.popup.hangouts.some(function(hangoutElement, hangoutIndex) {
    if (hangoutElement.owner.id == id) {
      hangout = hangoutElement;
      return true;
    }
    hangoutElement.data.participants.some(function(participantElement, participantIndex) {
      // 99 % of the people are in one hangout, crazy people are in multiple hangouts.
      if (participantElement.id == id && participantElement.status) {
        hangout = hangoutElement;
        return true;
      }
    });
    return hangout;
  });
  return hangout;
};
