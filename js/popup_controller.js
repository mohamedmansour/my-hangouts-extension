/**
 * Responsible to render the hangout items within the popup.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
PopupController = function() {
  this.bkg = chrome.extension.getBackgroundPage();
  this.options = new OptionsController(this);
  this.map = new MapController(this);
  this.currentPage = 'hangouts'; // options
  this.hangouts = [];
};

/**
 * Initialize the Popup Controller.
 */
PopupController.prototype.init = function() {
  window.addEventListener('load', this.updateHangouts.bind(this), false);
  this.bindUI();
  this.options.init();
};

PopupController.prototype.bindUI = function() {
  $('#version').text('version ' + this.bkg.settings.version);
  $('#menu-options').click(this.onMenuOptionsClick.bind(this));
  $('#menu-maps').click(this.onMenuMapsClick.bind(this));
  $('#menu-hangouts').click(this.onMenuHangoutsClick.bind(this));
};

/**
 * Update hangouts in interval so we never get an empty
 * box of data.
 */
PopupController.prototype.updateHangouts = function() {
  this.hangouts = this.bkg.controller.getHangouts();
  if (this.hangouts.length == 0) {
    $('#hangouts-container').html('loading ...');
    setTimeout(this.updateHangouts.bind(this), 1000);
  }
  else {
    this.processHangouts();
    setTimeout(this.updateHangouts.bind(this), 15000);
  }
};

/**
 * When the window loads, render the User Interface by creating the widgets
 * dynamically.
 */
PopupController.prototype.processHangouts = function() {
  console.log('Hangouts refreshed! ' + new Date());

  if (this.hangouts.length > 0) {
    for (var i = 0; i < this.hangouts.length; i++) {
      var hangoutItem = this.hangouts[i];

      // Slice everything that we don't need.
      hangoutItem.data.participants = hangoutItem.data.participants.slice(0, 9);

      // Hangout Participants.
      var userCount = 1;
      var circleCount = 0;
      for (var j = 0; j < hangoutItem.data.participants.length; j++) {
        var participant = hangoutItem.data.participants[j];
             if (participant.status) {
          userCount++;
          if (this.fillCircleInfo(participant)) {
            circleCount++;
          }
        }
      }
      if (this.fillCircleInfo(hangoutItem.owner)) {
        circleCount++;
      }
      hangoutItem.html = this.stripHTML(hangoutItem.html);
      hangoutItem.activeCount = userCount;
      hangoutItem.isFull = userCount >= 10;
      hangoutItem.time = $.timeago(new Date(hangoutItem.time));
      hangoutItem.rank = circleCount;
    }

    // Sort by rank.
    this.hangouts.sort(function(a, b) {
      if (a.rank > b.rank) return -1;
      else if (a.rank < b.rank) return 1;
      else return 0;
    });
    this.renderHangouts(this.hangouts);
    $('a.clickable').click(this.onLinkClicked);
  }
};

PopupController.prototype.fillCircleInfo = function(user) {
  var person = this.bkg.controller.getPerson(user.id);
  if (person) {
    user.circles = person.circles.map(function(e) {return  ' ' + e.name});
    return true;
  }
  return false;
};


/**
 * From http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
 */
PopupController.prototype.stripHTML = function(html) {
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText;
}
/**
 * Forward click events to the extension.
 *
 * @param{MouseEvent} e The link which was clicked.
 */
PopupController.prototype.onLinkClicked = function(e) {
  e.preventDefault();
  var href = $(e.target).attr('href');
  if (!href) {
    href = $(e.target).parent().attr('href');
  }
  chrome.tabs.create({url: href});
};

/**
 * Rendering each hangout.
 *
 * @param {Array(Object)} hangouts The hangout item in a JSON format.
 */
PopupController.prototype.renderHangouts = function(hangouts) {
  $('#hangouts-container').html($('#hangouts-template').tmpl({hangouts: hangouts}));
  this.relayout();
  console.log('rendering');
};

/**
 * Relayout the page since each page has different heights.
 */
PopupController.prototype.relayout = function() {
  if (this.currentPage == 'hangouts') {
    var height = (this.hangouts.length * 55) + 5;
    $('.popup-page').height(height);
    $('#popup-container').height(height);
  }
  else {
    $('.popup-page').height(300);
    $('#popup-container').height(300);
  }
};

/**
 * When the options has been clicked.
 */
PopupController.prototype.onMenuOptionsClick = function(e) {
  e.preventDefault();
  this.togglePage();
};

/**
 * When the options has been clicked.
 */
PopupController.prototype.onMenuHangoutsClick = function(e) {
  e.preventDefault();
  this.togglePage();
};

/**
 * When the hangout maps has been clicked.
 */
PopupController.prototype.onMenuMapsClick = function(e) {
  e.preventDefault();
  this.map.load();
  this.toggleMapPage();
};


/**
 * Toggle the page from options and hangouts.
 */
PopupController.prototype.togglePage = function() {
  if (this.currentPage == 'hangouts') {
    $('#hangouts-container').animate({left: -600, overflow: 'hidden'}, 500);
  }
  else {  
    $('#options-container').animate({left: 600, overflow: 'hidden'}, 500);
  }
  this.currentPage = (this.currentPage == 'hangouts' ? 'options' : 'hangouts');
  $('#' + this.currentPage + '-container').animate({left: 0, overflow: 'auto'}, 500);
  this.relayout();
};

/**
 * Toggle the page from options and hangouts.
 */
PopupController.prototype.toggleMapPage = function() {
  $('#hangouts-map').text('view ' + this.currentPage);
  if (this.currentPage == 'hangouts') {
    $('#hangouts-container').animate({left: -600, overflow: 'hidden'}, 500);
  }
  else {  
    $('#map-container').animate({left: 600, overflow: 'hidden'}, 500);
  }
  this.currentPage = (this.currentPage == 'hangouts' ? 'map' : 'hangouts');
  $('#' + this.currentPage + '-container').animate({left: 0, overflow: 'auto'}, 500);
  this.relayout();
};

