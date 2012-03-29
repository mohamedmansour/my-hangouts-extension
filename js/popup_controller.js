/**
 * Responsible to render the hangout items within the popup.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @constructor
 */
PopupController = function() {
  this.bkg = chrome.extension.getBackgroundPage();
  this.mapBackend = this.bkg.controller.getMapBackend();
  this.map = new MapController(this);
  this.currentPage = 'hangouts'; // options
  this.hangouts = [];
  this.notifiedHangouts = [];
};

/**
 * Initialize the Popup Controller.
 */
PopupController.prototype.init = function() {
  window.addEventListener('load', this.updateHangouts.bind(this), false);
  this.bindUI();
};

PopupController.prototype.bindUI = function() {
  $('#version').text('version ' + this.bkg.settings.version);
  
  // Toggle default popup view.
  if (!this.displayAsTab) {
    this.togglePage(this.bkg.settings.default_popup_tab);
  }
  
  $('#' + this.currentPage + '-container').show();
  $('.menu-item').click(this.onMenuItemClick.bind(this));
  $(document).on('click', '.detail', this.onHangoutDetailClick.bind(this));

  if (window.location.hash == '#window') {
    this.displayAsTab = true;
  }
};

PopupController.prototype.onMenuItemClick = function(e) {
  var id = e.target.id;
  switch (id) {
    case 'menu-extensionpage':
      chrome.tabs.create({url: 'https://plus.google.com/116935358560979346551/about'});
      break;
    case 'menu-gallery':
      chrome.tabs.create({url: chrome.extension.getURL('capture_gallery.html')});
      break;
    case 'menu-maps':
      this.togglePage('maps');
      this.map.onDisplay();
      break;
    case 'menu-hangouts':
      this.togglePage('hangouts');
      break;
    case 'menu-notifications':
      this.togglePage('notifications');
      break;
    case 'menu-options':
      chrome.tabs.create({url: chrome.extension.getURL('options.html')});
      break;
  }
};

/**
 * Update hangouts in interval so we never get an empty
 * box of data.
 */
PopupController.prototype.updateHangouts = function() {
  this.hangouts = this.bkg.controller.getHangoutBackend().getHangouts();
  this.notifiedHangouts = this.bkg.controller.getHangoutBackend().getNotifiedHangouts();
  if (this.hangouts.length == 0) {
    $('#hangouts-container').html('loading ...');
    $('#notifications-container').html('loading ...');
    setTimeout(this.updateHangouts.bind(this), 1000);
  }
  else {
    this.processHangouts();
    setTimeout(this.updateHangouts.bind(this), 15000);
  }
};

/**
 * Call the Notification backend to reset it.
 */
PopupController.prototype.resetNotifications = function() {
  this.bkg.controller.getHangoutBackend().getNotifier().reset();
  $('#notifications-container').html('loading ...');
  this.updateHangouts();
};

/**
 * When the window loads, render the User Interface by creating the widgets
 * dynamically.
 */
PopupController.prototype.processHangouts = function() {
  console.log('Hangouts refreshed! ' + new Date());

  if (this.hangouts.length > 0) {
    // Sort by rank.
    this.hangouts.sort(function(a, b) {
      if (a.rank > b.rank) return -1;
      else if (a.rank < b.rank) return 1;
      else return 0;
    });
    this.renderHangouts();
    $('a.clickable').click(this.onLinkClicked.bind(this));
  }
  $('.tip').tipTip();
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
  // For buttons, decide whether to open in a new tab or window.
  this.bkg.controller.openSpecialWindow($(e.target), href);
};

/**
 * Creates a new participant object that merges caches together.
 */
PopupController.prototype.createNewParticipant = function(participant) {
  var person = this.mapBackend.getPersonFromCache(participant.id);
  var personObj = {
    circles: participant.circles,
    id: participant.id,
    image: participant.image,
    name: participant.name,
    status: participant.status
  };
  if (person) {
    personObj.location = person.data.location;
    personObj.occupation = person.data.occupation;
  }
  return personObj;
};

/**
 * Listens when the detail has been clicked for each hangout.
 */
PopupController.prototype.onHangoutDetailClick = function(e) {
  var hangoutNode = $(e.target.parentNode.parentNode.parentNode.parentNode);
  var hangout = this.bkg.controller.getHangoutBackend().getHangout(hangoutNode.attr('id'));

  // Get person data.
  var participants = [];
  participants.push(this.createNewParticipant(hangout.owner));
  hangout.data.participants.forEach(function(participant) {
    participants.push(this.createNewParticipant(participant));
  }.bind(this));

  // Render the template.
  $('#hangout-detail-container').html($('#hangout-detail-template').tmpl({
    hangout: {
      id: hangout.data.id,
      participants: participants,
      name: hangout.data.name,
      url: hangout.data.url
    }
  }));
  this.togglePage('hangout-detail');

  var height = Math.ceil(hangout.totalParticipants / 2) * 80 + 50;
  $('.popup-page').height(height);
  $('#popup-container').height(height);
  $(".tip").tipTip();
};

/**
 * Rendering each hangout.
 *
 * @param {Array(Object)} hangouts The hangout item in a JSON format.
 */
PopupController.prototype.renderHangouts = function() {
  $('#hangouts-container').html($('#hangouts-template').tmpl({hangouts: this.hangouts}));
  
  if (this.notifiedHangouts.length == 0) {
    $('#notifications-container').html('Waiting till we receive hangouts that were notified ...');
  }
  else {
    $('#notifications-container').html($('#hangouts-template').tmpl({hangouts: this.notifiedHangouts}));
  }
  this.relayout();
  console.log('rendering');
};

/**
 * Relayout the page since each page has different heights.
 */
PopupController.prototype.relayout = function() {
  if (this.displayAsTab) {
    return;
  }
  var height = 300;
  if (this.currentPage == 'hangouts') {
    var height = this.hangouts.length == 0 ? 20 : (this.hangouts.length * 70) + 5;
    $('.popup-page').height(height);
    $('#popup-container').height(height);
  }
  else if (this.currentPage == 'notifications') {
    var height = this.notifiedHangouts.length == 0 ? 20 : (this.notifiedHangouts.length * 70) + 5;
    $('.popup-page').height(height);
    $('#popup-container').height(height);
  }
  else if (this.currentPage == 'maps') {
    var height = 301;
    $('.popup-page').height(height);
    $('#popup-container').height(height);
  }
};

/**
 * Toggle the page from hangouts.
 */
PopupController.prototype.togglePage = function(newpage) {
  $('#' + this.currentPage + '-container').fadeOut().slideUp();
  $('#menu-' + this.currentPage).removeClass('selected');
  this.currentPage = newpage;
  $('#' + this.currentPage + '-container').fadeIn().slideDown();
  $('#menu-' + this.currentPage).addClass('selected');
  this.relayout();
};

