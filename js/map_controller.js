/**
 * Testing mapping out hangout participants' locations.
 *
 * @author jbc
<<<<<<< HEAD
 * 
=======
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
>>>>>>> upstream/master
 */

MapController = function(popupController) {
  this.popup = popupController;
  this.bkg = this.popup.bkg.controller;
  var latlong = new google.maps.LatLng(-34.397, 150.644);
<<<<<<< HEAD
  this.map = new google.maps.Map( $('map_canvas'), {zoom: 8, center:latlong,   mapTypeId: google.maps.MapTypeId.ROADMAP} );
=======
  this.map = new google.maps.Map($('#map-canvas')[0], {
    zoom: 8,
    center: latlong,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
>>>>>>> upstream/master
};

MapController.prototype.init = function() {
  this.bindUI();
};

MapController.prototype.bindUI = function() {
 
};


MapController.prototype.load = function() {
<<<<<<< HEAD
	var hangouts = this.popup.hangouts;
	var allParticipants = []; // TODO: cache and only look up/ remove detlas
 
	if (hangouts.length > 0) {
		for (var i = 0; i < hangouts.length; i++) {
			var hangoutItem = hangouts[i];
			allParticipants.push(hangoutItem.owner.id);

			for (var j = 0; j < hangoutItem.data.participants.length; j++) {
				var participant = hangoutItem.data.participants[j];
				allParticipants.push(participant.id)
			}
		}
	}
	var me = this;
	this.bkg.plus.lookupUsers( function(users) { 
		for( var i=0; i<allParticipants.length;i++ ){ 
			var user = users[allParticipants[i]];
			if(user.location) {
				me.mapLocation(data.user.location);
			}
		}
	}, allParticipants ); 

};

MapController.prototype.mapLocation = function ( location ) {
	console.log('location:'+location);
	var coder = new google.maps.Geocoder();
	var self = this;
    coder.geocode({ address: location } , 
				function(response){
						var marker = new google.maps.Marker({ map:self.map, location:response[0].geometry.location } );
					} );		
	
=======
  var hangouts = this.popup.hangouts;
  var allParticipants = []; // TODO: cache and only look up/ remove detlas
 
  if (hangouts.length > 0) {
    for (var i = 0; i < hangouts.length; i++) {
      var hangoutItem = hangouts[i];
      allParticipants.push(hangoutItem.owner.id);

      for (var j = 0; j < hangoutItem.data.participants.length; j++) {
        var participant = hangoutItem.data.participants[j];
        allParticipants.push(participant.id)
      }
    }
  }
  var self = this;
  
  // TODO: Make a preloader here since it takes time.
  this.bkg.plus.lookupUsers(function(users) {
    for (var i=0; i < allParticipants.length; i++ ){ 
      var user = users[allParticipants[i]];
      if (user.data.location) {
        self.mapLocation(user.data.location);
      }
    }
  }, allParticipants);
};

MapController.prototype.mapLocation = function ( location ) {
  var self = this;
  var coder = new google.maps.Geocoder();
  coder.geocode({address: location}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      console.log('location: '+ location, results);
      var marker = new google.maps.Marker({
        map: self.map,
        location: results[0].geometry.location
      });
    }
    else {
      console.error('location: '+ location, status);
    }
  });
>>>>>>> upstream/master
};
