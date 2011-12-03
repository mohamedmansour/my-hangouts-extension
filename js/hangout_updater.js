/**
 * Updater State Machine to execute different states each iteration.
 *
 * @param {BackgroundController} controller The background controller.
 */
HangoutUpdater = function(controller) {
  this.controller = controller;
  this.currentState = 0;
  this.maxState = 0;
  
  this.errorCount = 0;
  this.error = false;
  this.cache = {};
  this.hangouts = [];
  this.NAMED_HANGOUT_ID_STRING = "join a hangout named";
  this.HANGOUT_SEARCH_QUERY = {
    query: '"is hanging out with * right now!" | "is hanging out." | "hangout named"'
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
 */
HangoutUpdater.prototype.search = function(obj) {
  var self = this;
  self.controller.plus.search(function(res) {
    var data = res.data;
    
    // Capture the error 
    self.error = data.status;

    // go through the hangouts we have and remove any that were returned not active
    for (var i = 0; i < data.length; i++) {
      if (data[i].data.active === false) {
        var hgIndexToDelete = -1;      
        for (var j = 0; j < self.hangouts.length; j++) {
          if (data[i].data.id === self.hangouts[j].data.id) {
            hgIndexToDelete = j;
            break;
          }
        }

        // delete the dead hang out
        if (hgIndexToDelete > -1) {
          self.hangouts.splice(hgIndexToDelete, 1);
        }
      }
    }

    // If there are some results, show them.
    for (var i = 0; i < data.length; i++) {
      var hangout = data[i];
      hangout.jbc = res;
      var cache = self.cache[hangout.data.id];
      if (!hangout.data.active || cache) {
        // Preserve public status. It weighs more than limited.
        if (cache == 'true') hangout.public = cache;
        continue;
      }
      self.cache[hangout.data.id] = hangout.public.toString();
      hangout.data.extra = hangout.html.indexOf(self.NAMED_HANGOUT_ID_STRING) >=0;
      self.hangouts.push(hangout);
    }

    self.controller.drawBadgeIcon(self.hangouts.length, true);
  }, obj.query, {precache: 3, type: 'hangout'});
};
  
/**
 * Executes the next state.
 */
HangoutUpdater.prototype.doNext = function() {
  if (this.hasError()) {
    this.errorCount++;
    if (this.errorCount % 10) {
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
 * Reset the state after the third iteration and query all searches.
 */
HangoutUpdater.prototype.state0 = function() {
  this.search(this.HANGOUT_SEARCH_QUERY);
};
