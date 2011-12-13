/**
 * Updater State Machine to execute different states each iteration.
 *
 * @param {BackgroundController} controller The background controller.
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 */
HangoutUpdater = function(controller) {
  this.controller = controller;
  this.currentState = 0;
  this.maxState = 2;
  this.circleNotifier = new CircleNotifier(this);
  this.errorCount = 0;
  this.error = false;
  this.cache = {};
  this.hangouts = [];
  this.NAMED_HANGOUT_ID_STRING = 'in a hangout named';
  this.IS_HANGING_OUT_ID_STRING = 'is hanging out';
  this.HANGOUT_SEARCH_QUERY = {
    query: '"is hanging out" | "hangout named"'
  };
};

/**
 * @return the error code for the processor.
 */
HangoutUpdater.prototype.hasError = function() {
  return this.error;
};

/**
 * @return List of hangouts.
 */
HangoutUpdater.prototype.getHangouts = function() {
  return this.hangouts;
};

/**
 * @param {Object} obj The search object where keys are "query" and "extra"
 * @param {boolean} refresh Reset the data with fresh hangouts.
 */
HangoutUpdater.prototype.search = function(obj, refresh) {
  var self = this;
  var doRefresh = refresh;
  self.controller.plus.search(function(res) {
    var data = res.data;

    // Capture the error
    self.error = !res.status
    if (self.error) {
      self.controller.drawBadgeIcon(-1, false);
      return;
    }

    // It is time to refresh data, do it now, then stop asking for it.
    if (doRefresh) {
      self.hangouts.length = 0;
      self.cache = {};
      doRefresh = false;
    }

    // If there are some results, show them.
    for (var i = 0; i < data.length; i++) {
      var hangout = data[i];
      hangout.jbc = res;
      
      // If it is inactive, just continue to the next.
      if (!hangout.data.active) {
        continue;
      }
      
      var cache = self.cache[hangout.data.id];
      if (cache) {
        // Preserve public status. It weighs more than limited.
        if (cache.is_public) hangout.is_public = cache;

        // Update the hangouts collection.
        hangout.data.extra = hangout.html.indexOf(self.NAMED_HANGOUT_ID_STRING) >= 0;
        self.hangouts[cache.index] = hangout;

        // Notify
        self.circleNotifier.notify(hangout);
        continue;
      }
      hangout.data.extra = hangout.html.indexOf(self.NAMED_HANGOUT_ID_STRING) >= 0;
      self.hangouts.push(hangout);
      
      // Preserve in the cache the visibility status and the index in the collection.
      self.cache[hangout.data.id] = {
        index: self.hangouts.length - 1,
        is_public: hangout.is_public
      };
      
      // Notify
      self.circleNotifier.notify(hangout);
    }

    // Go through the hangouts we have and remove any that were returned not active.
    // This should be defined at the end since our cache index is not being used at this point.
    for (var i = 0; i < data.length; i++) {
      var hangout = data[i];
      if (hangout.data.active === false) {
        var hgIndexToDelete = -1; 
        var cache = self.cache[hangout.data.id];
        if (cache) {
          hgIndexToDelete = cache.index;
        }
        
        // Delete the dead hang out
        if (hgIndexToDelete > -1) {
          self.hangouts.splice(hgIndexToDelete, 1);
          delete self.cache[hangout.data.id];
        }
      }
    }

    self.controller.drawBadgeIcon(self.hangouts.length, true);
  }, obj.query, {precache: 4, type: 'hangout', burst: true});
};
  
/**
 * Executes the next state.
 */
HangoutUpdater.prototype.doNext = function() {
  if (this.hasError()) {
    this.errorCount++;
    if (this.errorCount % 2) {
      console.log('Reinitializing session');
      this.controller.plus.init(); // Reinitialize the session.
    }
    else {
      return;
    }
  }
  else {
    this.errorCount = 0;
  }
  
  this['state' + this.currentState]();
  if (this.currentState >= this.maxState) {
    this.currentState = 0;
  }
  else {
    this.currentState++;
  }
};

/**
 * Reset the state after 3rd try to keep results fresh.
 */
HangoutUpdater.prototype.state0 = function() {
  this.search(this.HANGOUT_SEARCH_QUERY, true);
};


/**
 * Requery the hangouts list
 */
HangoutUpdater.prototype.state1 = function() {
  this.search(this.HANGOUT_SEARCH_QUERY, false);
};

HangoutUpdater.prototype.state2 = function() {
  this.search(this.HANGOUT_SEARCH_QUERY, false);
};
