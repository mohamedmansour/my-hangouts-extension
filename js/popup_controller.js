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
  this.navigationPositions = {
    hangouts: 1,
    maps: 2,
    options: 3
  };
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
  $('.menu-item').click(this.onMenuItemClick.bind(this));
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
      break;
    case 'menu-options':
      this.togglePage('options');
      break;
    case 'menu-hangouts':
      this.togglePage('hangouts');
      break;
  }
};

/**
 * Update hangouts in interval so we never get an empty
 * box of data.
 */
PopupController.prototype.updateHangouts = function() {
  this.hangouts = this.bkg.controller.getHangoutBackend().getHangouts();
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
 * Toggle the page from options and hangouts.
 */
PopupController.prototype.togglePage = function(newpage) {
  var goLeftBy = -600;
  if (this.navigationPositions[newpage] < this.navigationPositions[this.currentPage]) {
    goLeftBy = 600;
  }
  $('#' + this.currentPage + '-container').animate({left: goLeftBy, overflow: 'hidden'}, 500);
  $('#menu-' + this.currentPage).toggleClass('selected');
  this.currentPage = newpage;
  $('#' + this.currentPage + '-container').animate({left: 0, overflow: 'auto'}, 500);
  $('#menu-' + this.currentPage).toggleClass('selected');
  this.relayout();
};

