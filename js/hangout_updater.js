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
  this.MAX_ASSUMED_SCORE = 50;
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
  if (!hangout.data || !hangout.data.active) { // Deal with onAir hangouts if you have access.
    return false;
  }
  
  var updatedHangout = hangout;
  
  // Type.
  updatedHangout.data.is_normal = hangout.data.type == 0;
  updatedHangout.data.is_extra = hangout.data.type == 1;
  updatedHangout.data.is_onair = hangout.data.type == 2;

  // Fill in circle information for each participant.
  var circleCount = 0;
  var scoreCount = 0;
  var participants = [];
  for (var j = 0; j < updatedHangout.data.participants.length; j++) {
    var participant = updatedHangout.data.participants[j];
    if (participant.status) {
      if (this.fillCircleInfo(participant)) {
        circleCount++;
      }
      scoreCount += this.getParticipantScore(participant.id);
      participants.push(participant);
    }
  }
  updatedHangout.data.participants = participants;

  // Populate the Owner Information
  if (this.fillCircleInfo(updatedHangout.owner)) {
    circleCount++;
  }
  scoreCount += this.getParticipantScore(updatedHangout.owner.id);
  
  // Slice everything that we don't need.
  updatedHangout.data.participants = updatedHangout.data.participants.slice(0, 9);
  
  // Total participants cached.
  var totalParticipants = updatedHangout.data.participants.length;
  updatedHangout.totalParticipants = totalParticipants + 1; // include the owner.

  // Process score for each participant so we can make sure their weight are equal.
  var normalizedScore = scoreCount / (this.MAX_ASSUMED_SCORE * updatedHangout.totalParticipants);
  var normalizedCircleScore = circleCount / updatedHangout.totalParticipants;
  var normalizedTotalParticipantsScore = updatedHangout.totalParticipants / 10;
  var rank = normalizedScore + normalizedCircleScore + normalizedTotalParticipantsScore;

  // Custom name to each hangout.
  if (updatedHangout.data.is_onair) {
    updatedHangout.data.name = updatedHangout.data.extra_data[1] + ' - OnAir';
  }
  else if (updatedHangout.data.is_extra) {
    updatedHangout.data.name = updatedHangout.data.id + '.';
  }
  else {
    updatedHangout.data.name = updatedHangout.owner.name + ' is hanging out.';
    if (totalParticipants == 1) {
      updatedHangout.data.name += ' with ' + updatedHangout.data.participants[0].name + '.';
    }
    if (totalParticipants > 1 ) {
      updatedHangout.data.name += ' with ' + totalParticipants +  ' people.';
    }
  }

  // Fill in circle data.
  updatedHangout.isFull = updatedHangout.data.participants.length >= 9;
  updatedHangout.rank = rank;
  return updatedHangout;
};

/**
 * Check if we have the score for that participant.
 */
HangoutUpdater.prototype.getParticipantScore = function(id) {
  var score = 0;
  var userCache = this.controller.getMapBackend().getPersonFromCache(id);
  if (userCache) {
    score = userCache.data.score || 0;
  }
  return Math.min(score, this.MAX_ASSUMED_SCORE);
};

/**
 * Fill in the circle information for the user.
 */
HangoutUpdater.prototype.fillCircleInfo = function(user) {
  var person = this.controller.getPerson(user.id);
  if (person) {
    // TODO(mohamed): Merge into one, the UI should handle the circle names by iterating.
    user.circle_ids = person.circles.map(function(e) {return e.id});
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
    var newHangouts = {};

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
	  
	  newHangouts[hangout.data.id] = true;
      var cache = self.cache[hangout.data.id];
      if (cache) {
        // Preserve public status. It weighs more than limited.
        if (cache.is_public) hangout.is_public = true;

        // Update the hangouts collection.
        self.hangouts[cache.index] = hangout;
        continue;
      }

      self.hangouts.push(hangout);
      
      // Preserve in the cache the visibility status and the index in the collection.
      self.cache[hangout.data.id] = {
        index: self.hangouts.length - 1,
        is_public: hangout.is_public
      };
    }
    
	// look for any hangouts that we have that were not in the search result and make sure they are 
	// not dead. Many instances data length returns zero.. not sure what this is about, but 
	// for now I am skipping this processing for that case
    for (var i = 0;  data.length > 0 && i < self.hangouts.length; i++) {
      var hangout = self.hangouts[i];
      var id = hangout.data.id
      if (!newHangouts[id]){
        console.log('checking for dead hangout: '+id);
        var url = hangout.url
        var postId = url.substring(url.lastIndexOf('/')+1)
        self.controller.plus.lookupPost(function(res) {
          if (!res.data.data.active|| !res.status){
            self.removeHangout(res.data.data.id);
          }
        },hangout.owner.id, postId);
      }
    }


    self.circleNotifier.notify(self.hangouts);
    self.controller.drawBadgeIcon(self.hangouts.length, true);
  }, obj.query, {precache: 4, type: 'hangout', burst: true});
};

HangoutUpdater.prototype.removeHangout = function(id){
	var deleteIndex = -1;
	for ( var i = 0; i < this.hangouts.length; i++){
		if ( id = this.hangouts[i].data.id ) {
			deleteIndex = i;
			break;
		}
	}
	
	if (deleteIndex>=0){
		console.log('remove hangout id: '+id+ ':'+ this.hangouts[deleteIndex]);
		this.hangouts.splice(deleteIndex, 1);
		delete this.cache[id];
	}
}
  
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
  this.search(this.HANGOUT_SEARCH_QUERY, false);
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
