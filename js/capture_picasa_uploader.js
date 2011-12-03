/**
 * Uploading the image to Picaso.
 */
CapturePicasaUploader = function() {
  this.oauth = ChromeExOAuth.initBackgroundPage({
    'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
    'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
    'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
    'consumer_key': 'anonymous',
    'consumer_secret': 'anonymous',
    'scope': 'https://picasaweb.google.com/data/',
    'app_name': 'My Hangouts Extension'
  });
  this.oauth.authorize(this.onAuthorized.bind(this));
};

CapturePicasaUploader.prototype.onAuthorized = function() {
  console.log('Authorized!');
};

/**
 * http://code.google.com/apis/picasaweb/docs/2.0/developers_guide_protocol.html#AddAlbums
 */
CapturePicasaUploader.prototype.createMyHangoutAlbum = function() {
  var url = 'https://picasaweb.google.com/data/feed/api/user/default';

  var entry = this.createAtomEntry();
  $(entry).append($('<category/>').attr('scheme', 'http://schemas.google.com/g/2005#kind')
                                       .attr('term', 'http://schemas.google.com/photos/2007#album'));
  $(entry).append($('<title/>').attr('type', 'text').text('My Hangouts'));
  $(entry).append($('<summary/>').attr('type', 'text').text('Uploaded by My Hangouts Extension'));
  $(entry).append($('<media:group/>').append($('<media:keywords/>').text('hangouts')));

  // Must do the following to get the <atom:entry> element as a string.  The
  // "div" root element will not be included, but is necessary to call html().
  var s = $('<div/>').append(entry).html();
  var request = {
    'method': 'POST',
    'headers': {
      'GData-Version': '2.0',
      'Content-Type': 'application/atom+xml'
    },
    'parameters': {
      'alt': 'json'
    },
    'body': s
  };
  console.log('request', s);
  this.oauth.sendSignedRequest(url, function(data) {
    console.log(data);
  }, request);
};

CapturePicasaUploader.prototype.createAtomEntry = function() {
  var entry = $('<entry/>');
  $(entry).attr('xmlns', 'http://www.w3.org/2005/Atom')
          .attr('xmlns:media', 'http://search.yahoo.com/mrss/')
          .attr('xmlns:gphoto', 'http://schemas.google.com/photos/2007');
  return entry;
};