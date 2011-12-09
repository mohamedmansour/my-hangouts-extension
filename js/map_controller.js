/**
 * Testing mapping out hangout participants' locations.
 *
 * @author jbc
 * 
 */

MapController = function(popupController) {
  this.popup = popupController;
  this.bkg = this.popup.bkg.controller;
  var latlong = new google.maps.LatLng(-34.397, 150.644);
  this.map = new google.maps.Map($('#map-canvas')[0], {
    zoom: 8,
    center: latlong,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
};

MapController.prototype.init = function() {
  this.bindUI();
};

MapController.prototype.bindUI = function() {
 
};


MapController.prototype.load = function() {
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
	this.bkg.plus.lookupUsers( function(users) { 
		for( var i=0; i<allParticipants.length;i++ ){ 
			var user = users[allParticipants[i]];
			if(user.location) {
				self.mapLocation(data.user.location);
			}
		}
	}, allParticipants);
};

MapController.prototype.mapLocation = function ( location ) {
	console.log('location:'+location);
	var coder = new google.maps.Geocoder();
	var self = this;
  coder.geocode({ address: location }, 
    function(response){
      var marker = new google.maps.Marker({
        map: self.map,
        location: response[0].geometry.location
      });
    }
  );
};
