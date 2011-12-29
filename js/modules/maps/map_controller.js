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
  this.markersCache = {};
  this.featureControl = new MapFeatureControl(this.map);
  this.startUpdates();
};

/**
 * Initialization code.
 */
MapController.prototype.init = function() {
  this.featureControl.push(
      new DayNightOverlay(), 
      'daynightoverlay', 
      'Day/Night'
  );
  this.bindUI();
};

MapController.prototype.bindUI = function() {
  if (this.popup.displayAsTab) {
    $('#hangout-bar').remove();
    $('#options-container').remove();
    $('#hangouts-container').remove();
    $('#popup-open').remove();
    $('#maps-container')
        .show()
        .css('width', $(window).width() + 'px')
        .css('height', $(window).height() + 'px')
        .css('position', 'fixed')
        .css('left', '0')
        .css('top', '0')
        .css('overflow-x', 'auto');
    $('#maps-container h2')
        .css('position', 'fixed')
        .css('width', ($(window).width() - 200) + 'px')
        .css('height', '40px')
        .css('line-height', '40px')
        .css('z-index', 99999)
        .css('border-bottom-radius', 10)
        .css('background-color', 'rgba(255,255,255,0.5)')
        .css('color', '#444')
        .css('margin', '0 100px')
        .css('padding', '0 0 0 10px');
    $('body')
        .css('background', 'white url(/img/wood-bg.jpg)');
    
    $(window).resize(this.onResize.bind(this));
    
    // Lazy load the height.
    setTimeout(function() {
      this.onResize();
      this._fitMarkers();  
    }.bind(this), 250);
  }
  else {
    $('#popup-open').click(this.onOpenAsWindow.bind(this));
  }
};

/**
 * Calculates a bounding box around the currently shown markers and calls
 * the map to adjust itself to these bounds.
 */
MapController.prototype._fitMarkers = function() {
  var self = this;
  var bounds = new google.maps.LatLngBounds();

  $.each(this.markersCache, function(markerID) {
    bounds.extend(self.markersCache[markerID].getPosition());  
  });

  this.map.fitBounds(bounds);
}

/**
 * This callback should be called everytime the map view gets visible to
 * to the user.
 */
MapController.prototype.onDisplay = function() {
  // Delay the adjustments as some animation may still be running
  setTimeout(function() {
    this._fitMarkers();
  }.bind(this), 600);
}

MapController.prototype.onResize = function() {
  $('#map-canvas')
      .css('height', $(window).height() + 'px')
      .css('width', $(window).width() + 'px');
  $('#popup-container')
      .css('width', '100%')
      .css('height', '100%');
  google.maps.event.trigger(this.map, 'resize');
};

MapController.prototype.onOpenAsWindow = function(e) {
  chrome.tabs.create({url: chrome.extension.getURL('popup.html#window')});
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
  var gpIds = this.bkg.getHangoutBackend().getAllParticipants();

  // Quickly figure out what markers to add.
  var idMap = {};
  var newMarkerCache = {};
  gpIds.forEach(function(id, index) {
    idMap[id] = true; // Cache it since we want to know it exists.

    // If it is already on the Map, just forget about it, we already rendered it.
    if (!self.markersCache[id]) {
      var personCacheItem = self.mapBackend.getPersonFromCache(id);
      if (personCacheItem) {
        var locationCacheItem = self.mapBackend.getLocationFromCache(personCacheItem.address);
        if (locationCacheItem) {
          var marker = new SimpleMarker({
            map: self.map,
            position: locationCacheItem.geometry.location,
            id: 'person-' + personCacheItem.data.id,
            className: 'personMarker',
            icon: personCacheItem.data.photo + '?sz=24',
            size: new google.maps.Size(24,24),
            anchor: new google.maps.Point(12,12),
            title: personCacheItem.data.name + ', ' + locationCacheItem.formatted_address
          });
          self.markersCache[id] = marker;
          newMarkerCache[id] = marker;

          // Marker click
          self.addPersonMarkerClickedEvent(personCacheItem.data.id, marker, marker.getPosition());
        }
      }
    }
    else {
      newMarkerCache[id] = self.markersCache[id];
    }
  });

  // Remove the ones that are not in the idMap cache.
  $.each(self.markersCache, function(markerID) {
    var marker = self.markersCache[markerID];
    if (!idMap[markerID]) {
      marker.setMap(null);
    }
  });

  // Replace the cache with the newly formed one.
  self.markersCache = newMarkerCache;
};

/**
 * For each marker, register a click event so a InfoWindow will popup with the
 * detailed hangout information.
 */
MapController.prototype.addPersonMarkerClickedEvent = function(userID, marker, location) {
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
