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
  this.searchResults = [];
  this.stateCounter = 0;

  this.MAX_ASSUMED_SCORE = 50;
  this.PRECACHE_SIZE = 4;

  // Return rt result over the entire re-query interval
  var nextWaitInterval = 2000;
  var precacheInterval = this.PRECACHE_SIZE * this.controller.plus.PRECACHE_INTERVAL;
  var nextSearchInterval = (this.controller.UPDATE_INTERVAL - precacheInterval) - nextWaitInterval;
  this.BURST_SIZE = Math.floor(nextSearchInterval / this.controller.plus.BURST_INTERVAL);

  // TODO: look into these to reduce bandwidth...  -"hung out" -"had a hangout"'
  this.HANGOUT_SEARCH_QUERY =  '"is"';
  this.HANGOUT_SEARCH_QUERY_NAMED = '"named"';
  this.BLOCKED_CIRCLE_ID = '15';
};

/**
 * @return the error code for the processor.
 */
HangoutUpdater.prototype.hasError = function() {
  return this.error;
};

/**
 * @return a clean, filter List of hangouts for use in UI.
 */
HangoutUpdater.prototype.getHangouts = function() {
  var hangouts = [];
  var includeHangout = false;
  var hangout = null;
  for (var i=0; i< this.hangouts.length; i++ ){
    hangout = this.hangouts[i];
    inlcudeHangout = hangout && 
                          ( !settings.only_show_circle_hangouts || hangout.hasParticipantInCircles );
    if (inlcudeHangout){
      hangouts.push(hangout);
    }
  }
  return hangouts;
};

/**
 * Checks the cache for the hangout. 
 *
 * @param {string} id the hangout ID
 * @return {object} the hangout
 */
HangoutUpdater.prototype.getHangout = function(id) {
  return this.cache[id];
};

/**
 * @return {CircleNotifier} the current circle notifier instance.
 */
HangoutUpdater.prototype.getNotifier = function() {
  return this.circleNotifier;
};


/**
 * Gets the list of hangouts that were notified.
 *
 * @return {Array} the hangouts
 */
HangoutUpdater.prototype.getNotifiedHangouts = function() {
  return this.circleNotifier.getCurrentHangoutNotifications();
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
  
  var currentTimestamp = new Date().getTime();
  var updatedHangout = hangout;
  
  // Type.
  updatedHangout.data.is_normal = hangout.data.type === 0;
  updatedHangout.data.is_extra = hangout.data.type === 1;
  updatedHangout.data.is_onair = hangout.data.type === 2;

  // Fill in circle information for each participant.
  var circlePositionScore = 0;
  var circleCount = 0;
  var scoreCount = 0;
  var onlineUserCount = 0;
  for (var j = 0; j < updatedHangout.data.participants.length; j++) {
    var participant = updatedHangout.data.participants[j];
    if (participant.status) {
      var score = this.fillCircleInfo(participant);
      if (score > 0) {
        circlePositionScore += score;
        circleCount++;
      }
      scoreCount += this.getParticipantScore(participant.id);
      onlineUserCount++;
    }
  }

  // Populate the Owner Information
  var score = this.fillCircleInfo(updatedHangout.owner);
  if (score > 0) {
    circlePositionScore += score;
    circleCount++;
  }
  scoreCount += this.getParticipantScore(updatedHangout.owner.id);

  // Total participants cached.
  updatedHangout.totalParticipants = onlineUserCount + 1; // include the owner.

  // Process score for each participant so we can make sure their weight are equal.
  var normalizedRelevancyScore = scoreCount / (this.MAX_ASSUMED_SCORE * updatedHangout.totalParticipants);
  var normalizedCircleScore = circleCount / updatedHangout.totalParticipants;
  var normalizedTotalParticipantsScore = updatedHangout.totalParticipants / 10;
  var normalizedCirclePositionScore =  circlePositionScore / updatedHangout.totalParticipants;
  var rank = normalizedRelevancyScore + normalizedCircleScore + normalizedTotalParticipantsScore + normalizedCirclePositionScore;
 
  updatedHangout.hasParticipantInCircles = (circleCount > 0);
  
  if (DEBUG) {
    console.log('PROCESSED_HANGOUT', hangout.data.id, {
      normalizedRelevancyScore:normalizedRelevancyScore,
      normalizedCircleScore: normalizedCircleScore,
      normalizedTotalParticipantsScore: normalizedTotalParticipantsScore,
      normalizedCirclePositionScore: normalizedCirclePositionScore,
      rank: rank
    });
  }
  
  // Custom name to each hangout.
  if (updatedHangout.data.is_onair) {
    updatedHangout.data.name = updatedHangout.data.extra_data + ' - OnAir';
  }
  else if (updatedHangout.data.is_extra) {
    updatedHangout.data.name = updatedHangout.data.id + '.';
  }
  else {
    updatedHangout.data.name = updatedHangout.owner.name + ' is hanging out';
    if (updatedHangout.totalParticipants == 2) {
      updatedHangout.data.name += ' with ' + updatedHangout.data.participants[0].name;
    }
    if (updatedHangout.totalParticipants > 2 ) {
      updatedHangout.data.name += ' with ' + updatedHangout.totalParticipants +  ' people';
    }
    updatedHangout.data.name += '.';
  }

  // Fill in circle data.
  updatedHangout.isFull = onlineUserCount >= 9;
  updatedHangout.rank = rank;
  updatedHangout.timeago = $.timeago(new Date(updatedHangout.time_edited || updatedHangout.time));
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
 *
 * @return {number} The circle score, 0 if no score.
 */
HangoutUpdater.prototype.fillCircleInfo = function(user) {
  var person = this.controller.getPerson(user.id);
  var self = this;
  if (person) {
    user.circles = person.circles;
  }
  if (user.circles && user.circles.length > 0)  {
    // Tag the user if you banned them.
    user.circles.some(function(circle) {
      user.blocked = (circle.id == self.BLOCKED_CIRCLE_ID);
      return user.blocked;
    });
  
    // Calculate circle rank based on the position of the circle normalized.
    var totalCircles = self.controller.getCircles().length;
    var circle = self.controller.getCircle(user.circles[0].id);
    return 1 - ((1 / totalCircles) * circle.position);
  }
  return 0;
};

/**
 * @param {Object} obj The search object where keys are "query" and "extra"
 * @param {boolean} refresh Reset the data with fresh hangouts.
 */
HangoutUpdater.prototype.search = function(obj, onDone) {
  var self = this;
  
  if (DEBUG) {
    console.log(obj.query);
  }
  
  // Google+ API Search Options.
  var extraSearchOptions = {
    precache: self.PRECACHE_SIZE,
    category: GooglePlusAPI.SearchCategory.RECENT,
    privacy: GooglePlusAPI.SearchPrivacy.EVERYONE,
    type: GooglePlusAPI.SearchType.HANGOUTS,
    burst: obj.burst,
    burst_size: self.BURST_SIZE
  };
  
  self.controller.plus.search(function(res) {

    // Capture the error
    self.error = !res.status;
    if (self.error) {
      if (DEBUG) {
        console.log('search return an error.');
        self.controller.getBrowserAction().drawBadgeIcon(-1, false);
      }
      return;
    }

    self.updatingSearch = true;
    
    // console.log('search type : '+ res.type + ' returned '+ res.data.length);
    if(res.data.length > 0 ) {
      self.searchResults.push(res.data);
    }
    
    self.updatingSearch = false;
    if ( onDone ){ 
      onDone();
    }
  }, obj.query, extraSearchOptions);
  
};

HangoutUpdater.prototype.update = function(refreshDeprecated) {
  if (this.hasError() || this.updatingSearch || this.cleaningHangouts ) { // don't update the hangouts if the results are updating ... as if.... 
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
  while (this.searchResults.length > 0) {
    
    var data = this.searchResults.splice(0,1)[0]; // pop off the top element.
    
    // If there are some results, show them.
    for (var i = 0; i < data.length; i++) {
      var hangout = this.preprocessHangoutData(data[i]);
      if (!hangout) {
        continue;
      }
	
      // TODO: Consider moving all this logic to the updateHangout function.
      var cache = this.cache[hangout.data.id];
      if (cache) {
        // Preserve public status. It weighs more than limited.
        if (cache.is_public) {
          hangout.is_public = true;
        }

        // Update the hangouts collection.
        this.updateHangout(hangout);
        continue;
      }

      this.hangouts.push(hangout);
      
      // Preserve in the cache.
      this.cache[hangout.data.id] = hangout;
    }
  }
  
  this.updatingResult = false;
  this.updateDependants();
}

HangoutUpdater.prototype.updateDependants = function() {
  var hangouts = this.getHangouts();
  this.circleNotifier.notify(hangouts);
  this.controller.getBrowserAction().drawBadgeIcon(hangouts.length, true);
}

/**
 * 	cleanHangouts - scan the hangouts array and removde dead or refresh current entries
 */
HangoutUpdater.prototype.cleanHangouts = function() {
  if ( this.updatingResult ) {
    return;
  }
  
  this.cleaningHangouts = true;
  
  var l = this.hangouts.length;
  var j = 0;
  for( var i = 0; i < l; i++) {
    if ( !this.hangouts[j] ) {
      this.hangouts.splice(j, 1); 
    } else {
      j++;
    }
  }
  
  for (var i = 0; i < this.hangouts.length; i++) {
    var hangout = this.hangouts[i];
    var hangoutId = hangout.data.id
    // console.log('checking for dead hangout: '+id);
    var url = hangout.url;
    var postId = url.substring(url.lastIndexOf('/')+1);
    this.refreshHangout(hangout.owner.id, postId, hangoutId);
  }
  
  this.cleaningHangouts = false;
  this.updateDependants();
};

/**
 * refreshHangout -- remove or update the indicated hangout from the hangout array
 */
HangoutUpdater.prototype.refreshHangout = function(userID, postID, hangoutID) {
  var self = this;
  this.controller.plus.lookupPost(function(res) {
    if (!res.status || !res.data.data.active) {
      var deleteIndex = -1;
      for ( var i = 0; i < self.hangouts.length; i++){
        if ( self.hangouts[i] && hangoutID === self.hangouts[i].data.id ) {
          if (DEBUG) {
            // console.log('remove hangout id: '+ hangoutID + ':', self.hangouts[i]);
          }
          self.hangouts[i] = null;
          delete self.cache[hangoutID];
          break;
        }
      }
    } else if ( res.data.data.active ) {
		// TODO: We might want to see if anything has actually changed before doing this:compare participants
		var hangout = self.preprocessHangoutData(res.data);
		// console.log('update hangout:',hangout);
		self.updateHangout(hangout);
	}
  }, userID, postID);
};

/**
 * UpdateHangout - update the indicated, pre-processed hangout in the hangout array
 * @hangout - the new pre-processed hangout 
 * return true if updated and false otherwise.
 */
HangoutUpdater.prototype.updateHangout = function(hangout) {
	for ( var j = 0; j < this.hangouts.length; j++){
	  if ( this.hangouts[j] && this.hangouts[j].data.id ===  hangout.data.id ){
      this.hangouts[j] = hangout;
      this.cache[hangout.data.id] = hangout;
      return true;
	  }
	}
	return false;
}

// TODO: finish this and implement to reduce overhead of update
HangoutUpdater.prototype.compareHangout=function(h0,h1) {
  if ( h0.totalParticipants > h1.totalParticipants ){
    return 1;
  } else if (h0.totalParticipants < h1.totalParticipants){
    return -1;
  } else {
    return 0; // compare participants...? 1. are they in the same order? are dead particpants removed.
  }
}
  
/**
 * Executes the next state.
 */
HangoutUpdater.prototype.doNext = function() {
  if (this.hasError()) {
    this.errorCount++;
    if (this.errorCount % 3) {  // TODO: rationalise this logic.
      if (DEBUG) {
        console.log('Reinitializing session since session was destroyed');
      }
      //this.controller.getBrowserAction().drawBadgeIcon(-1, false);
      this.controller.plus.init(); // Reinitialize the session.
    }
    this.error = false;  // or we will never advance ( see todo above )
    return;

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
  
  this.stateCounter++;
};

/**
 * query stages:
 */
 HangoutUpdater.prototype.state0 = function() {
  var self = this;
  if (this.stateCounter == 0){
    this.search({ query:this.HANGOUT_SEARCH_QUERY + ' | ' + this.HANGOUT_SEARCH_QUERY_NAMED}, function(){ 
      self.update();
      self.search( {query: self.buildqueryWithExcludeList(self.HANGOUT_SEARCH_QUERY) }, function(){
        self.update();
        self.search( { query: self.buildqueryWithExcludeList(self.HANGOUT_SEARCH_QUERY) }, function(){
          self.update();
          self.search( { query: self.buildqueryWithExcludeList(self.HANGOUT_SEARCH_QUERY_NAMED) }, function(){
            self.update();
            self.search( { query: self.buildqueryWithExcludeList(self.HANGOUT_SEARCH_QUERY_NAMED) }, function() {
              self.update();
              self.search( {query: self.buildqueryWithExcludeList(self.HANGOUT_SEARCH_QUERY) }, function(){
                self.update();
                self.search( { query: self.buildqueryWithExcludeList(self.HANGOUT_SEARCH_QUERY) } );
              });
            });
          });
        });
      });
    });
  } else {
    this.search( { query: this.HANGOUT_SEARCH_QUERY + ' | ' + this.HANGOUT_SEARCH_QUERY_NAMED, burst:true } );
  }
};

HangoutUpdater.prototype.state1 = function() {
  var queryStr = this.buildqueryWithExcludeList(this.HANGOUT_SEARCH_QUERY);
  if (DEBUG) {
    console.log( queryStr );
  }
  this.search({ query: queryStr, burst: true}, false);
};

HangoutUpdater.prototype.state2 = function() {
  var queryStr = this.buildqueryWithExcludeList(this.HANGOUT_SEARCH_QUERY_NAMED);
  if (DEBUG) {
    console.log( queryStr );
  }
  this.search({ query: queryStr, burst: true}, false);
};


HangoutUpdater.prototype.buildqueryWithExcludeList = function(queryStr) {
  for(var i = 0; i< this.hangouts.length; i++){ 
    if( this.hangouts[i] ){
      // we are updating the existing list with a lookupPost, so exculde the hangouts we already have to get better results.
      queryStr += ' -"'+this.hangouts[i].owner.name+'"'
    }
  }
  return queryStr;
};


