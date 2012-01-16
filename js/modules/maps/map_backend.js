/**
 * Database backend for location.
 *
 * @author Mohamed Mansour 2012 (http://mohamedmansour.com)
 * @constructor
 */
LocationEntity = function(db) {
  AbstractEntity.call(this, db, 'locations');
};
JSAPIHelper.inherits(LocationEntity, AbstractEntity);

/**
 * @see AbstractEntity.tableDefinition
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
 */
MapBackend = function(db, controller) {
  this.LOGGER_ENABLED = false;

  this.controller = controller;

  // This should be in a database, perhaps?
  this.cache = {
    people: {}
  };

  this.locationEntity = new LocationEntity(db);

  this.blacklist = {};
  this.startUpdates();
};

/**
 * Checks the cache 
 */
MapBackend.prototype.getPersonFromCache = function(id) {
  return this.cache.people[id];
};

/**
 * Checks the cache to see their exists a person in the location.
 */
MapBackend.prototype.getLocationFromCache = function(location, callback) {
  this.locationEntity.find(['latitude', 'longitude','address'], {location: location}, callback);
};

MapBackend.prototype.startUpdates = function() {
  var self = this;
  this.peopleInterval = setInterval(function() {
      self.loadPeople();
  }, 2000);
  this.locationInterval = setInterval(function() {
      self.loadLocations();
  }, 2500);
};

/**
 * Add addess strings for new people into the person cache.
 */
MapBackend.prototype.loadPeople = function() {
  var self = this;
  var allParticipants = this.controller.getHangoutBackend().getAllParticipants();
  var newParticipants = [];
  for (var i = 0; i < allParticipants.length; i++) {
    var id = allParticipants[i];
    if (!self.cache.people[id]) {
      newParticipants.push(id);
    }
  }
  self.cachePeople(newParticipants);
};

/**
 * add address locations for every known hangout participant loaded into the person cache
 */
MapBackend.prototype.loadLocations = function() {
  var allParticipants = this.controller.getHangoutBackend().getAllParticipants();
  for (var i = 0; i < allParticipants.length; i++) {
    var id = allParticipants[i];
    var personCacheItem = this.cache.people[id];
    if (personCacheItem && personCacheItem.address && personCacheItem.address !== '?') {
      var address = personCacheItem.address;
      this.decideWhetherToCacheLocation(address);
    }
  }
};

/**
 * Check the database if we would require to cache the results.
 */
MapBackend.prototype.decideWhetherToCacheLocation = function(address) {
  var self = this;
  self.locationEntity.count({location: address}, function(resp) {
    if (resp.status && resp.data == 0) {
      self.cacheMapLocation(address);
    }
  });
};

/** 
 * Determine the g+ locations for the specified users and write them into the cache
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
        console.log('cached person:'+ id + ' at '+  self.cache.people[id].address);
      }
    }
  }, gpIds);
};

/**
 * Determine the map location from a string a write it into the location cache     
 */
MapBackend.prototype.cacheMapLocation = function(address) {
  var self = this;
  var coder = new google.maps.Geocoder();

  // Skip if we already blacklisted.
  if (this.blacklist[address]) {
    return;
  }
  coder.geocode({ address: address }, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      if (self.LOGGER_ENABLED) {
        console.log('location: ' + address, results);
      }
      var geoaddress = results[0];
      self.locationEntity.create({
        location: address,
        address: geoaddress.formatted_address,
        latitude: geoaddress.geometry.location.lat(),
        longitude: geoaddress.geometry.location.lng()
      });
    }
    else if (status == google.maps.GeocoderStatus.ZERO_RESULTS) {
      // We don't want to requery so blacklist address.
      self.blacklist[address] = true;
    }
    else {
      console.error('location: ' + address, status);
    }
  });
};