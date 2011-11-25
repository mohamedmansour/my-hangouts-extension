/**
 * Responsible to render the hangout items within the popup.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
PopupController = function() {
  this.bkg = chrome.extension.getBackgroundPage().backgroundController;
};

/**
 * Initialize the Popup Controller.
 */
PopupController.prototype.init = function() {
  window.addEventListener('load', this.onWindowLoad.bind(this), false);
};

/**
 * When the window loads, render the User Interface by creating the widgets
 * dynamically.
 */
PopupController.prototype.onWindowLoad = function(e) {
  var hangouts = this.bkg.getHangouts();
  
  if (hangouts.length > 0) {
    for (var i = 0; i < hangouts.length; i++) {
      var hangoutItem = hangouts[i];

      // Hangout Participants.
      var userCount = 1;
      for (var j = 0; j < hangoutItem.data.participants.length; j++) {
        var participant = hangoutItem.data.participants[j];
        if (participant.status) {
          userCount++;

          // Active Participant
        }
      }
      hangoutItem.activeCount = userCount;
      hangoutItem.isFull = userCount == 10;
      hangoutItem.time = $.timeago(new Date(hangoutItem.time));

      this.renderHangoutItem(hangoutItem);
    }

    $('a').click(this.onLinkClicked);
    $('.hangout-user-overlay').hover(this.onHangoutHoverOver, this.onHangoutHoverOut);
  }
};
 
/**
 * Event when hangout hovered was over.
 */
PopupController.prototype.onHangoutHoverOver = function(e) {
  e.currentTarget.style.width = parseInt($('span', e.currentTarget).text()) * 40 + 85 + 'px';
  e.stopPropagation();
};

/**
 * Event when hangout hovered was out.
 */
PopupController.prototype.onHangoutHoverOut = function(e) {
  e.currentTarget.style.width = '75px';
  e.stopPropagation();
};

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
 * @param {Object} hangout The hangout item in a JSON format.
 */
PopupController.prototype.renderHangoutItem = function(hangout) {
  $('#hangout-item-template').tmpl(hangout).appendTo('#hangout-container');
};
