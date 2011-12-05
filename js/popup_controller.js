/**
 * Responsible to render the hangout items within the popup.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
PopupController = function() {
  this.bkg = chrome.extension.getBackgroundPage();
  this.currentPage = 'hangouts'; // circle-watch
};

/**
 * Initialize the Popup Controller.
 */
PopupController.prototype.init = function() {
  window.addEventListener('load', this.updateHangouts.bind(this), false);
  $('#version').text(this.bkg.settings.version);
  $('#toggle-circle-watch').click(this.onCircleWatchClick.bind(this));
};

/**
 * Update hangouts in interval so we never get an empty
 * box of data.
 */
PopupController.prototype.updateHangouts = function() {
  var hangouts = this.bkg.controller.getHangouts();
  if (hangouts.length == 0) {
    $('#hangouts-container').html('loading ...');
    setTimeout(this.updateHangouts.bind(this), 1000);
  }
  else {
    this.loadHangouts(hangouts);
    setTimeout(this.updateHangouts.bind(this), 15000);
  }
};

/**
 * When the window loads, render the User Interface by creating the widgets
 * dynamically.
 */
PopupController.prototype.loadHangouts = function(hangouts) {
  console.log('Hangouts refreshed! ' + new Date());

  if (hangouts.length > 0) {
    for (var i = 0; i < hangouts.length; i++) {
      var hangoutItem = hangouts[i];

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
    hangouts.sort(function(a, b) {
      if (a.rank > b.rank) return -1;
      else if (a.rank < b.rank) return 1;
      else return 0;
    });
    this.renderHangouts(hangouts);
    this.relayout(hangouts.length);
    $('a').click(this.onLinkClicked);
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
  var disabled = $(e.target).attr('disabled');
  if (disabled) {
    return;
  }
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
};

PopupController.prototype.relayout = function(hangoutTotal) {
  var height = (hangoutTotal * 55) + 5;
  $('#popup-container').height(height);
};

PopupController.prototype.onCircleWatchClick = function(e) {
  $(e.target).text('view ' + this.currentPage);
  if (this.currentPage == 'hangouts') {
    $('#hangouts-container').animate({left: -600}, 500);
  }
  else {  
    $('#circle-watch-container').animate({left: 600}, 500);
  }
  this.currentPage = (this.currentPage == 'hangouts' ? 'circle-watch' : 'hangouts');
  $('#' + this.currentPage + '-container').animate({left: 0}, 500);
};
