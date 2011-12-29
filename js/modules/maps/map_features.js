/**
 * A control element for enabling and disabling additional maps overlays, such
 * as a day/night curve. Requires the CSS styles for .map_feature_control
 *
 *
 * @author kaktus621@gmail.com (Martin Matysiak)
 */



/**
 * A Google Maps Control to enable or disable additional overlays.
 *
 * @param {google.maps.Map} map The map on which to display the control.
 * @param {google.maps.ControlPosition=} opt_position The position where the
 *    control is shown. Defaults to top right corner.
 * @constructor
 */
MapFeatureControl = function(map, opt_position) {
  /** @type {google.maps.Map} */
  this.map = map;

  /** @private @type {Object.<string, google.maps.OverlayView>} */
  this.overlays_ = {};

  // Initialize the control UI element

  /** @private @type {HTMLDivElement} */
  this.control_ = document.createElement('div');
  this.control_.className = 'map_feature_control';
  $(this.control_).on('click', 'div', this.onClick.bind(this));

  var position = google.maps.ControlPosition.TOP_RIGHT;

  if (typeof opt_position !== 'undefined') {
    position = opt_position;
  }

  this.map.controls[position].push(this.control_);
};


/**
 * Adds a new feature and creates a on/off-button for it. Does nothing if a
 * feature of this type is existing already.
 *
 * @param {google.maps.OverlayView} overlay The overlay to be added.
 * @param {string} id A unique identifier that will be used internally. Has to
 *    be a valid identifier that can be used as a object key or CSS id.
 * @param {string} title A descriptive text that will be shown as button value.
 */
MapFeatureControl.prototype.push = function(overlay, id, title) {
  var overlayDiv = document.createElement('div');

  overlayDiv.id = id;
  overlayDiv.innerHTML = title;

  this.control_.appendChild(overlayDiv);
  this.overlays_[id] = overlay;
};


/**
 * Event handler for when a on/off-button is clicked.
 *
 * @param {Event} evt The triggering event object.
 */
MapFeatureControl.prototype.onClick = function(evt) {
  var overlay = this.overlays_[evt.target.id];

  // If the overlay is currently linked to a map, remove it
  overlay.setMap(overlay.getMap() ? null : this.map);
  $(evt.target).toggleClass('enabled');
};
