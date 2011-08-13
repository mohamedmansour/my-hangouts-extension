/**
 * Global Settings.
 *
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 */
settings = {
  get version() {
    return localStorage['version'];
  },
  set version(val) {
    localStorage['version'] = val;
  },
  get opt_out() {
    var key = localStorage['opt_out'];
    return (typeof key == 'undefined') ? false : key === 'true';
  },
  set opt_out(val) {
    localStorage['opt_out'] = val;
  },
  get whitelist() {
    var key = localStorage['whitelist'];
    return (typeof key == 'undefined') ? ['Mohamed Mansour'] : (key == '' ? [] : key.split(', '));
  },
  set whitelist(val) {
    if (typeof val == 'object') {
      localStorage['whitelist'] = val.sort().join(', ');
    }
  }
};