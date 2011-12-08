/**
 * Testing mapping out hangout participants' locations.
 *
 * @author 
 * @constructor
 */

MapController = function(popupController) {
  this.popup = popupController;
  this.bkg = this.popup.bkg.controller;
  var latlong = new google.maps.LatLng(-34.397, 150.644);
  this.map = new google.maps.Map( $('map_canvas'), {zoom: 8, center:latlong,   mapTypeId: google.maps.MapTypeId.ROADMAP} );
};

MapController.prototype.init = function() {
  this.bindUI();
};

MapController.prototype.bindUI = function() {
 
};


MapController.prototype.load = function() {
	var hangouts = this.popup.hangouts;
	
 
	if (hangouts.length > 0) {
		for (var i = 0; i < hangouts.length; i++) {
			var hangoutItem = hangouts[i];
			this.addToMap(hangoutItem.owner, i*5000)

			for (var j = 0; j < hangoutItem.data.participants.length; j++) {
				var participant = hangoutItem.data.participants[j];
				this.addToMap(participant, j * 2000)
			}
		}
	}
};

MapController.prototype.addToMap = function ( participant, when  ) {
	
	self = this;
	setTimeout( function() { 
								self.bkg.plus.lookupUser( function(data) { 
																		if ( data.user.location ) {
																			self.mapLocation(data.user.location);
																		}
																			
														}, participant.id ) 
			}, when);
}

MapController.prototype.mapLocation = function ( location ) {
	console.log('location:'+location);
	var coder = new google.maps.Geocoder();
	var self = this;
    coder.geocode({ address: location } , 
				function(response){
						var marker = new google.maps.Marker({ map:self.map, location:response[0].geometry.location } );
					} );		
	
};
