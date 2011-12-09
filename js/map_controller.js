/**
 * Testing mapping out hangout participants' locations.
 *
 * @author jbc
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 */

MapController = function(popupController) {
    this.popup = popupController;
    this.bkg = this.popup.bkg.controller; 
    var latlong = new google.maps.LatLng(37.39, 122.08);
    this.map = new google.maps.Map($('#map-canvas')[0], {
        zoom: 1,
        center: latlong,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    this.cache = {
        location: {},
        people: {}
    };
    
    this.startUpdates();
    
 };

MapController.prototype.init = function() {
    this.bindUI();
};

MapController.prototype.bindUI = function() {
	this.startUpdates();
};

MapController.prototype.startUpdates = function() {
  var self = this;
   this.peopleInterval = setInterval(function() {
        self.loadPeople();
    }, 5000);
    this.locationInterval = setInterval(function() {
        self.loadLocations();
    }, 10000);
    this.markersInterval = setInterval(function() {
        self.addMarkersFromCache();
    }, 15000);
};

MapController.prototype.stopUpdates = function() {
	clearInterval( this.peopleInterval );
	clearInterval( this.locationInterval );
	clearInterval( this.markersInterval );
}


/*
 *     Add addess strings for new people into the person cache.
 */
MapController.prototype.loadPeople = function() {
    var allParticipants = this.getAllParticipants();
    var newParticipants = [];
    var i;
    for (i = 0; i < allParticipants.length; i++) {
        var id = allParticipants[i];
        if (!this.cache.people[id]) {
            newParticipants.push(id);
        }
    }

    this.cachePeople(newParticipants);
};


/*
 * add address locations for every known hangout participant loaded into the person cache
 */
MapController.prototype.loadLocations = function() {
    var allParticipants = this.getAllParticipants();
    var i = 0;
    for (i = 0; i < allParticipants.length; i++) {
        var id = allParticipants[i];
        var personCacheItem = this.cache.people[id];
        if (personCacheItem && personCacheItem.address && personCacheItem.address !== '?') {
            var address = personCacheItem.address;
            if (!this.cache.location[address]) {
                this.cacheMapLocation(address);
            }
        }
    }
};


/* 
 *    determine the g+ locations for the specified users and write them into the cache
 */
MapController.prototype.cachePeople = function(gpIds) {
    var self = this;
    // TODO: Make a preloader here since it takes time.
    this.bkg.plus.lookupUsers(function(users) {
        var i = 0;
        for (i = 0; i < gpIds.length; i++) {
			var id = gpIds[i];
            var user = users[id];
            self.cache.people[id] = { address: user.data.location ? user.data.location : '?',
									  data:user.data};
            
            console.log('cached person:'+id+ ' at '+  self.cache.people[id].address);
        }
    }, gpIds);
};


/* 
 *    determine the map location from a string a write it into the location cache     
 */
MapController.prototype.cacheMapLocation = function(address) {
    var self = this;
    var coder = new google.maps.Geocoder();
    coder.geocode({
        address: address
    }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            console.log('location: ' + address, results);
            self.cache.location[address] = results[0];
        }
        else {
            console.error('location: ' + location, status);
        }
    });
};



/*
 *     Put a marker on the map for every person we know about who has been fully cached
 */
MapController.prototype.addMarkersFromCache = function() {
    //	 TODO: hOW TO CLEAR MARKERS...?
    var gpIds = this.getAllParticipants();
    var i = 0;
    for (i = 0; i < gpIds.length; i++) {
        var id = gpIds[i];
        var personCacheItem = this.cache.people[id];
        if (personCacheItem && !personCacheItem.isOnMap) {
            var locationCacheItem = this.cache.location[personCacheItem.address];
            if (locationCacheItem) {
                var marker = new google.maps.Marker({
					title:personCacheItem.data.name,
                    position: locationCacheItem.geometry.location
                });
                marker.setMap(this.map);
    
				// TODO: click to join hangout :
				//gogle.maps.event.addListener(marker, 'click', function() {
				//						join the hangout
				//});
                personCacheItem.isOnMap = true;
            }
        }
    }
};


/*
 *     Return an arrary if g+ ids for every person in all we know about hangouts.
 */
MapController.prototype.getAllParticipants = function() {
    var hangouts = this.popup.hangouts;
    var allParticipants = [];
  
	var i = 0;
	for (i = 0; i < hangouts.length; i++) {
		var hangoutItem = hangouts[i];
		allParticipants.push(hangoutItem.owner.id);
		var j = 0;
		for (j = 0; j < hangoutItem.data.participants.length; j++) {
			var participant = hangoutItem.data.participants[j];
			if ( participant.status ){
				allParticipants.push(participant.id);
			}
		}
	}
	
	return allParticipants;
};
