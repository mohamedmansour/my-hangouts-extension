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
 * When a participant is being clicked, open their profile.
 */
PopupController.prototype.onParticipantClick = function(e) {
  window.open(e.currentTarget.href);
};

/**
 * When the window loads, render the User Interface by creating the widgets
 * dynamically.
 */
PopupController.prototype.onWindowLoad = function(e) {
  var collection = this.bkg.getHangouts();
  var hangouts = collection[0];
  var public_hangouts = collection[1];
  
  if (public_hangouts.length > 0) {
    for (var i = 0; i < public_hangouts.length; i++) {
      var hangoutItem = public_hangouts[i];

      // Hangout Participants.
      var userCount = 0;
      for (var j = 0; j < hangoutItem.data.participants.length; j++) {
        var participant = hangoutItem.data.participants[j];
        if (participant.status) {
          userCount++;

          // Active Participant
        }
      }
      hangoutItem.activeCount = userCount;
      hangoutItem.isFull = userCount == 9;
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

PopupController.prototype.renderHangouts = function(hangouts) {
  var container = document.querySelector('#hangout-container');
  var googlePlusURL = 'https://plus.google.com/';
  if (hangouts.length > 0) {
    for (var i = 0; i < hangouts.length; i++) {
      var hangoutItem = hangouts[i];
      var userCount = hangoutItem.participants.length; 
      
      // Hangout Name.
      var hangoutNameDOM = document.createElement('span');
      hangoutNameDOM.innerHTML = hangoutItem.name;

      // Hangout Overlay Container.
      var hangoutUserDOM = document.createElement('div');
      hangoutUserDOM.className = 'hangout-user-overlay';
      hangoutUserDOM.userCount = userCount;
      hangoutUserDOM.onmouseover = this.onUserCountHoverStarted.bind(this);
      hangoutUserDOM.onmouseout = this.onUserCountHoverCompleted.bind(this);
      if (userCount == 9) {
        hangoutUserDOM.className += ' full';
      }
      
      // Hangout Participants.
      var hangoutParticipantsDOM = document.querySelector('.hangout-participants');
      for (var j = 0; j < hangoutItem.participants.length; j++) {
        var participant = hangoutItem.participants[j];
        var userProfile = googlePlusURL + participant.id;
        var participantIcon = document.createElement('img');
        participantIcon.src = participant.image;
        participantIcon.title = participant.name;
        participantIcon.href = userProfile;
        participantIcon.onclick = this.onParticipantClick.bind(this);
        hangoutParticipantsDOM.appendChild(participantIcon);
      }
      hangoutUserDOM.appendChild(hangoutParticipantsDOM);

      // Hangout Count.
      var hangoutUserCountDOM = document.createElement('div');
      hangoutUserCountDOM.innerHTML = userCount + ' participant' + (userCount > 1 ? 's' : '');
      hangoutUserDOM.appendChild(hangoutUserCountDOM);
      
      // Hangout Join Hangout.
      var hangoutButtonJoinDOM = document.createElement('button');
      hangoutButtonJoinDOM.innerHTML = 'Join';
      hangoutButtonJoinDOM.id = hangoutItem.id;
      hangoutButtonJoinDOM.onclick = this.onHangoutJoin.bind(this);
      
      // Hangout Time.
      var timeDOM = document.createElement('span');
      timeDOM.className = 'hangout-time';
      timeDOM.innerHTML = hangoutItem.ts;
      
      // Lay them out on the popup.
      var hangoutDOM = document.createElement('div');
      hangoutDOM.appendChild(hangoutUserDOM);
      hangoutDOM.appendChild(hangoutButtonJoinDOM);
      hangoutDOM.appendChild(hangoutNameDOM);
      hangoutDOM.appendChild(timeDOM);
      
      // Give all the smaller children some parent so it can be styled.
      var wrapperDOM = document.createElement('div');
      wrapperDOM.className = 'hangout-item';
      wrapperDOM.appendChild(hangoutDOM);
      
      // Add it to the main container.
      container.appendChild(wrapperDOM);
    }
  }
  else {
    container.innerHTML = '<p>Your stream does not contain any hangouts. The reason could be:</p><ul>' + 
       '<li>You do not have your <a href="#" onclick="popupController.open(\'https://plus.google.com\')">stream</a> opened.</li>' +
       '<li>You do not have any hangouts on your stream.</li>' + 
       '<li>You should press the "<a href="#" onclick="popupController.doMoreHangouts()">more</a>" link in your stream to see if any hangouts happened in the past which are still active.</li>' +
       '</ul><p>Or there might be a bug, <a href="#" onclick="popupController.open(\'https://plus.google.com/116805285176805120365/about\');">+Mohamed Mansour</a> me :)</p>';
  }
  document.body.appendChild(container);
};

/**
 * Joins the hangout by sending a visit back to the background page and then to
 * the plus page to click on the Join Hangout link.
 */
PopupController.prototype.onHangoutJoin = function(e) {
  this.bkg.openHangout(e.target.id);
  window.close();
};

/**
 * Calculate the width of the hover based on the current user count.
 */
PopupController.prototype.onUserCountHoverStarted = function(e) {
  e.currentTarget.style.width = (e.currentTarget.userCount) * 40 + 85 + 'px';
  e.stopPropagation();
};

/**
 * Revert the width back to normal state when finished.
 */
PopupController.prototype.onUserCountHoverCompleted = function(e) {
  e.currentTarget.style.width = '75px';
  e.stopPropagation();
};

/**
 * Send a request back to Google+ to see if more hangouts exists. This will press more for you.
 */
PopupController.prototype.doMoreHangouts = function()
{
  this.bkg.doMoreHangouts();
};

/**
 * Open the given URL in a new tab.
 */
PopupController.prototype.open = function(url)
{
  chrome.tabs.create({url: url});
};