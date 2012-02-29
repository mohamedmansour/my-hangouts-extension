/**
 * Database backend for location.
 *
 * @author Mohamed Mansour 2012 (http://mohamedmansour.com)
 */



/**
 * An entity which represents a location.
 * @constructor
 * @param {Database} db A handle to the WebSQL database.
 */
LocationEntity = function(db) {
  AbstractEntity.call(this, db, 'locations');
};
JSAPIHelper.inherits(LocationEntity, AbstractEntity);


/**
 * @see AbstractEntity.tableDefinition
 * @return {Object} the data type.
 */
LocationEntity.prototype.tableDefinition = function() {
  return {
    location: 'TEXT',
    address: 'TEXT',
    latitude: 'FLOAT',
    longitude: 'FLOAT',
    unique: [
      ['location']
    ]
  };
};



/**
 * Map Location Cache Backend.
 * @constructor
 * @param {Database} db A handle to the WebSQL database.
 * @param {BackgroundController} controller The extension's background
 *    controller.
 */
MapBackend = function(db, controller) {
  this.LOGGER_ENABLED = true;

  this.controller = controller;

  // This should be in a database, perhaps?
  this.cache = {
    people: {}
  };

  this.locationEntity = new LocationEntity(db);
  this.blacklist = {};

  this.max_request_denied = 3;

  this.mapsAPI = new MapAPI(this.mapsLoaded.bind(this));
  this.mapsAPI.load();
};

MapBackend.prototype.mapsLoaded = function() {
  this.startUpdates();
};

/**
 * Checks the cache
 * @param {string} id A Google+ user ID.
 * @return {object} The cached person object if it exists, otherwise undefined.
 */
MapBackend.prototype.getPersonFromCache = function(id) {
  return this.cache.people[id];
};


/**
 * Checks the cache to see their exists a person in the location.
 * @param {string} location A location String as it's returned by Google+.
 * @param {function} callback A callback method which will receive the result.
 */
MapBackend.prototype.getLocationFromCache = function(location, callback) {
  this.locationEntity.find(
      ['latitude', 'longitude', 'address'],
      {location: this.normalize(location)},
      callback
  );
};

/**
 * Starts timers which will do some stuff periodically.
 */
MapBackend.prototype.startUpdates = function() {
  var self = this;
  this.peopleInterval = setInterval(function() {
    self.loadPeople();
  }, 50000);
  this.locationInterval = setInterval(function() {
    self.loadLocations();
  }, 60000);
};

/**
 * Stop the timers so no updates will happen.
 */
MapBackend.prototype.stopUpdates = function() {
  clearInterval(this.peopleInterval);
  clearInterval(this.locationInterval);
};

/**
 * Stop the updates to reload the API. If the reload was successfull
 * then we need to restart the updates.
 */
MapBackend.prototype.reloadAPI = function() {
  this.stopUpdates();
  this.mapsAPI.unload();
  this.mapsAPI.load();
  this.startUpdates();
};

/**
 * Add address strings for new people into the person cache.
 */
MapBackend.prototype.loadPeople = function() {
  var self = this;
  var newParticipants = [];
  var allParticipants = this.controller
      .getHangoutBackend()
      .getAllParticipants();

  for (var i = 0; i < allParticipants.length; i++) {
    var id = allParticipants[i];
    if (!self.cache.people[id]) {
      newParticipants.push(id);
    }
  }
  self.cachePeople(newParticipants);
};


/**
 * Add address locations for every known hangout participant loaded into the
 * person cache.
 */
MapBackend.prototype.loadLocations = function() {
  var allParticipants = this.controller
      .getHangoutBackend()
      .getAllParticipants();

  for (var i = 0; i < allParticipants.length; i++) {
    var id = allParticipants[i];
    var personCacheItem = this.cache.people[id];
    if (
        personCacheItem &&
        personCacheItem.address &&
        personCacheItem.address !== '?'
    ) {
      var address = personCacheItem.address;
      this.decideWhetherToCacheLocation(address);
    }
  }
};


/**
 * Check the database if we would require to cache the results.
 * @param {string} address A location string as it's returned by Google+.
 */
MapBackend.prototype.decideWhetherToCacheLocation = function(address) {
  var self = this;
  self.locationEntity.count(
      {location: self.normalize(address)},
      function(resp) {
        if (resp.status && resp.data == 0) {
          self.cacheMapLocation(address);
        }
      });
};


/**
 * Determine the g+ locations for the specified users and write them
 * into the cache
 * @param {Array.<string>} gpIds A set of Google+ user IDs.
 */
MapBackend.prototype.cachePeople = function(gpIds) {
  var self = this;
  // TODO: Make a preloader here since it takes time.
  this.controller.plus.lookupUsers(function(users) {
    var i = 0;
    for (i = 0; i < gpIds.length; i++) {
      var id = gpIds[i];
      var user = users[id];
      self.cache.people[id] = {
        address: user.data.location ? user.data.location : '?',
        data: user.data
      };
      if (self.LOGGER_ENABLED) {
        console.log('cached: ' + id + ' at ' + self.cache.people[id].address);
      }
    }
  }, gpIds);
};


/**
 * Determine the map location from a string a write it into the location cache
 * @param {string} address A location string as it's returned by Google+.
 */
MapBackend.prototype.cacheMapLocation = function(address) {
  var self = this;
  var coder = new google.maps.Geocoder();
  var normalized = this.normalize(address);

  // Skip if we already blacklisted or denied access.
  if (this.max_request_denied == 0 || this.blacklist[normalized]) {
    return;
  }

  // Note: we can't pass the normalized location in here as it would cause
  // a smaller probability of getting an actual result.
  coder.geocode({ address: address }, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      if (self.LOGGER_ENABLED) {
        console.log('location: ' + normalized + ' (' + address + ')', results);
      }
      var geoaddress = results[0];
      self.locationEntity.create({
        location: normalized,
        address: geoaddress.formatted_address,
        latitude: geoaddress.geometry.location.lat(),
        longitude: geoaddress.geometry.location.lng()
      });
    }
    else if (status == google.maps.GeocoderStatus.ZERO_RESULTS) {
      // We don't want to requery so blacklist address.
      self.blacklist[normalized] = true;
    }
    else if (status == google.maps.GeocoderStatus.REQUEST_DENIED) {
      if (--this.max_request_denied == 0) {
        self.stopUpdates();
      }
      else {
        self.reloadAPI();
      }
    }
    else {
      console.error('location: ' + normalized + ' (' + address + ')', status);
    }
  });
};


/**
 * Normalizes a location String, i.e. removes spaces and turns all characters
 * into lower case in order to prevent duplicates.
 * @param {string} location The location string which should be normalized.
 * @return {string} A string where spaces have been removed and characters have
 *    been turned into lowercase.
 */
MapBackend.prototype.normalize = function(location) {
  return location.toLowerCase().replace(/[ ,;\.]/gi, '');
};
