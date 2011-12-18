/**
 * Updater State Machine to execute different states each iteration.
 *
 * @param {BackgroundController} controller The background controller.
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 */
HangoutUpdater = function(controller) {
  this.controller = controller;
  this.currentState = 0;
  this.maxState = 0;
  this.circleNotifier = new CircleNotifier(this);
  this.errorCount = 0;
  this.error = false;
  this.cache = {};
  this.hangouts = [];
  this.MAX_ASSUMED_SCORE = 50;
  this.searchResults = [];
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
    if(!hangoutItem){
      continue;
    }
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
};

HangoutUpdater.prototype.preprocessHangoutData = function(hangout) {
  // If it is inactive, just continue to the next.
  if (!hangout.data || !hangout.data.active) { // Deal with onAir hangouts if you have access.
    return false;
  }
  
  var updatedHangout = hangout;
  
  // Type.
  updatedHangout.data.is_normal = hangout.data.type === 0;
  updatedHangout.data.is_extra = hangout.data.type === 1;
  updatedHangout.data.is_onair = hangout.data.type === 2;

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
    updatedHangout.data.name = updatedHangout.owner.name + ' is hanging out';
    if (totalParticipants == 1) {
      updatedHangout.data.name += ' with ' + updatedHangout.data.participants[0].name;
    }
    if (totalParticipants > 1 ) {
      updatedHangout.data.name += ' with ' + totalParticipants +  ' people';
    }
    updatedHangout.data.name +='.';
    
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
HangoutUpdater.prototype.search = function(obj) {
  var self = this;

  self.controller.plus.search(function(res) {
    self.updatingSearch = true;
    if(res.data.length > 0 ) {
      self.searchResults.push(res.data);
    }
    
    // Capture the error
    self.error = !res.status;
    if (self.error) {
      self.controller.drawBadgeIcon(-1, false);
      return;
    }
    self.updatingSearch = false;
  }, obj.query, {precache: 4, type: 'hangout', burst: true});
  
};

HangoutUpdater.prototype.update = function(refreshDeprecated) {
  if ( this.updatingSearch || this.cleaningHangouts ) { // don't updae the hangouts if the results are updating ... as if.... 
    return; 
  }
  
  this.updatingResult = true;
  
  var newHangouts = {};
  var doRefresh = refreshDeprecated;


    // It is time to refresh data, do it now, then stop asking for it. ( Should not need this anymore
  if (doRefresh) {
    this.hangouts.length = 0;
    this.cache = {};
    doRefresh = false;
  }

  
  // go through all the search results in turn and update the hangouts as needed.
  while(this.searchResults.length > 0) {
    
    var data = this.searchResults.splice(0,1)[0]; // pop off the top element.
    

    // If there are some results, show them.
    for (var i = 0; i < data.length; i++) {
      var hangout = this.preprocessHangoutData(data[i]);
      if (!hangout) {
        continue;
      }

      var cache = this.cache[hangout.data.id];
      if (cache) {
        // Preserve public status. It weighs more than limited.
        if (cache.is_public) {
            hangout.is_public = true;
        }

        // Update the hangouts collection.
        for ( var j = 0; j<this.hangouts.length;j++){
          if ( this.hangouts[j] && this.hangouts[j].data.id ===  hangout.data.id ){
            this.hangouts[j] = hangout;
            break;
          }
        }
        continue;
      }

      this.hangouts.push(hangout);
      
      // Preserve in the cache the visibility status and the index in the collection.
      this.cache[hangout.data.id] = {
        index: this.hangouts.length - 1,
        is_public: hangout.is_public
      };
    }
  }
  
  this.updatingResult = false;
  
  this.circleNotifier.notify(this.hangouts);
  this.controller.drawBadgeIcon(this.hangouts.length, true);
}

HangoutUpdater.prototype.cleanHangouts = function() {
  if ( this.updatingResult ) {
    return;
  }
  
  this.cleaningHangouts = true;
  var j = 0;
  for( var i = 0; i < this.hangouts.length; i++) {
    if ( !this.hangouts[j] ) {
      this.hangouts.splice(j, 1); 
    } else {
      j++;
    }
  }
  
  var self = this;
  for (var i = 0; i < this.hangouts.length; i++) {
    var hangout = this.hangouts[i];
    var id = hangout.data.id
    console.log('checking for dead hangout: '+id);
    var url = hangout.url;
    var postId = url.substring(url.lastIndexOf('/')+1);
    this.controller.plus.lookupPost(function(res) {
      if (!res.status || !res.data.data.active){
        self.removeHangout(res.cbParams.id);
      }
    },hangout.owner.id, postId, {id:id});
  }

  
  this.cleaningHangouts = false;

  this.circleNotifier.notify(this.hangouts);
  this.controller.drawBadgeIcon(this.hangouts.length, true);
};

HangoutUpdater.prototype.removeHangout = function(id){
	var deleteIndex = -1;
	for ( var i = 0; i < this.hangouts.length; i++){
		if ( id === this.hangouts[i].data.id ) {
      console.log('remove hangout id: '+id+ ':'+ this.hangouts[i]);
      this.hangouts[i] = null;
      delete this.cache[id];
      break;
		}
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
 * We don;t reset the list any more, so just the one state.
 */
HangoutUpdater.prototype.state0 = function() {
  this.search(this.HANGOUT_SEARCH_QUERY, false);
};


