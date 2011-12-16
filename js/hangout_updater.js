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
 * Return an array of g+ ids for every person in all we know about hangouts.
 */
HangoutUpdater.prototype.getAllParticipants = function(opt_callback) {
  var hangouts = this.controller.getHangoutBackend().getHangouts();
  var allParticipants = [];
  
  var i = 0;
  for (i = 0; i < hangouts.length; i++) {
    var hangoutItem = hangouts[i];
    allParticipants.push(hangoutItem.owner.id);
    var j = 0;
    for (j = 0; j < hangoutItem.data.participants.length; j++) {
      var participant = hangoutItem.data.participants[j];
      if (participant.status){
        allParticipants.push(participant.id);
      }
    }
  }
  
  if (opt_callback) {
    opt_callback(allParticipants);
  }
  else {
    return allParticipants;
  }
};

/**
 * From http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
 */
HangoutUpdater.prototype.stripHTML = function(html) {
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText;
}

HangoutUpdater.prototype.preprocessHangoutData = function(hangout) {
  // If it is inactive, just continue to the next.
  if (!hangout.data.active) {
    return false;
  }
  
  var updatedHangout = hangout;
  
  // Type.
  updatedHangout.data.is_extra = hangout.data.type == 1;
  updatedHangout.data.is_normal = hangout.data.type == 2;
  updatedHangout.data.is_onair = hangout.data.type == 3;
  
  // Custom name.
  if (updatedHangout.data.is_onair) {
    updatedHangout.data.name = hangout.data.extra_data[1] + ' - OnAir';
  }
  else {
    updatedHangout.data.name = this.stripHTML(hangout.html);
  }

  // Fill in circle information for each participant.
  var circleCount = 0;
  var participants = [];
  for (var j = 0; j < updatedHangout.data.participants.length; j++) {
    var participant = updatedHangout.data.participants[j];
    if (participant.status) {
      if (this.fillCircleInfo(participant)) {
        circleCount++;
      }
      participants.push(participant);
    }
  }
  updatedHangout.data.participants = participants;

  // Slice everything that we don't need.
  updatedHangout.data.participants = updatedHangout.data.participants.slice(0, 9);

  // Owner Information
  if (this.fillCircleInfo(updatedHangout.owner)) {
    circleCount++;
  }

  // Fill in circle data.
  updatedHangout.isFull = updatedHangout.data.participants.length >= 9;
  updatedHangout.rank = circleCount;
  return updatedHangout;
};

HangoutUpdater.prototype.fillCircleInfo = function(user) {
  var person = this.controller.getPerson(user.id);
  if (person) {
    user.circles = person.circles.map(function(e) {return  ' ' + e.name});
    return true;
  }
  return false;
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
      var hangout = self.preprocessHangoutData(data[i]);
      if (!hangout) {
        continue;
      }

      var cache = self.cache[hangout.data.id];
      if (cache) {
        // Preserve public status. It weighs more than limited.
        if (cache.is_public) hangout.is_public = true;

        // Update the hangouts collection.
        self.hangouts[cache.index] = hangout;

        // Notify
        self.circleNotifier.notify(hangout);
        continue;
      }

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
    /* TODO: DISABLE for now, it was creating duplicates.
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
    */
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
      console.log('Reinitializing session since session was destroyed');
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
