/**
 * We're adding one private and two public methods to the
 * BrowserActionController prototype, which allow us to draw
 * rounded rectangles.
 *
 * @author Martin Matysiak (kaktus621@gmail.com)
 * @author Mohamed Mansour (http://mohamedmansour.com)
 */

BrowserActionController = function() {
  chrome.browserAction.setBadgeText({ text: '' });
  this.drawBadgeIcon(-1);
  chrome.browserAction.setTitle({title: 'Initializing, searching for hangouts ...'});
};

/**
 * Draws a textual icon on the browser action next to the extension toolbar.
 *
 * @param {number} count The number to draw.
 * @param {boolean} newItem Differentiates between new items available.
 */
BrowserActionController.prototype.drawBadgeIcon = function(count, newItem) {
  var ctx = document.createElement('canvas').getContext('2d');

  // If count is zero or smaller, show the badge as inactive,
  // regardless of newItem's value
  newItem = newItem & (count > 0);
  
  if (newItem) {
    ctx.fillStyle = 'rgba(48, 121, 237, 1)';
    ctx.strokeStyle = 'rgba(43, 108, 212, 0.5)';
    
    // Sadly, the fix below makes the active badge look not like the original
    // one - therefore we have to have two different fill and stroke calls (with 
    // different coordinates)
    ctx.fillRoundRect(0, 0, 19, 19, 2);
    ctx.strokeRoundRect(0, 0, 19, 19, 2);
  }
  else {
    ctx.fillStyle = 'rgba(237, 237, 237, 1)';
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';

    // We are offsetting the rectangle by half a unit in order to achieve a 
    // crisp border on the inactive badge (see characteristics of lineWidth: 
    // http://goo.gl/DFnaA)
    ctx.fillRoundRect(0.5, 0.5, 18, 18, 2);
    ctx.strokeRoundRect(0.5, 0.5, 18, 18, 2);
  }

  ctx.font = 'bold 11px arial, sans-serif';
  ctx.fillStyle = newItem ? '#fff' : '#999';

  var browserActionText = count + ' hangouts are going on right now!';
  if (count > 99){
    ctx.fillText('99+', 1, 14);
  }
  else if (count > 9){
    ctx.fillText(count + '', 3, 14);
  }
  else if (count >= 0) {
    ctx.fillText(count + '', 6, 14);
    if ( count == 0 ) {
      browserActionText = 'There are no hangouts going on!';
    }
  }
  else {
    ctx.fillText('?', 6, 14);
    browserActionText = 'Your session to Google+ was not found, please log in or reopen Chrome.';
  }

  // Draw the circle if it is filtered by circles.
  if (newItem && settings.only_show_circle_hangouts) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2, true); 
    ctx.closePath();
    ctx.stroke();
    
    browserActionText += ' - Filtered by Circles';
  }

  chrome.browserAction.setTitle({title: browserActionText});
  chrome.browserAction.setIcon({imageData: ctx.getImageData(0,0,19,19)});
};

/**
 * Private method which creates the desired shape _without_ actually drawing it
 * (by using fill() or stroke()). This method can be used internally to avoid
 * duplicate code.
 *
 * @param {number} x The x-coordinate of the upper left corner of the
 * desired rounded rectangle.
 * @param {number} y The y-coordinate of the upper left corner of the
 * desired rounded rectangle.
 * @param {number} width The desired rectangle's width.
 * @param {number} height The desired rectangle's height.
 * @param {number} radius The radius with which the corners should be rounded.
 */
CanvasRenderingContext2D.prototype._createRoundRect = function(x, y, width, height, radius) {
  this.beginPath();
  // We start in the upper left corner of the shape and draw clockwise
  this.moveTo(x + radius, y);
  this.lineTo(x + width - radius, y);
  this.quadraticCurveTo(x + width, y, x + width, y + radius);
  this.lineTo(x + width, y + height - radius);
  this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  this.lineTo(x + radius, y + height);
  this.quadraticCurveTo(x, y + height, x, y + height - radius);
  this.lineTo(x, y + radius);
  this.quadraticCurveTo(x, y, x + radius, y);
};


/**
 * Draws a filled rounded rectangle at (x, y) position whose size is determined
 * by width and height. Additionally, the corners are rounded by radius.
 *
 * @param {number} x The x-coordinate of the upper left corner of the
 * desired rounded rectangle.
 * @param {number} y The y-coordinate of the upper left corner of the
 * desired rounded rectangle.
 * @param {number} width The desired rectangle's width.
 * @param {number} height The desired rectangle's height.
 * @param {number} radius The radius with which the corners should be rounded.
 */
CanvasRenderingContext2D.prototype.fillRoundRect = function(x, y, width, height, radius) {
  this._createRoundRect(x, y, width, height, radius);
  this.fill();
};


/**
 * Paints a rounded rectangle at (x, y) whose size is determined by width and
 * height using the current strokeStyle. The corners are rounded by radius.
 *
 * @param {number} x The x-coordinate of the upper left corner of the
 * desired rounded rectangle.
 * @param {number} y The y-coordinate of the upper left corner of the
 * desired rounded rectangle.
 * @param {number} width The desired rectangle's width.
 * @param {number} height The desired rectangle's height.
 * @param {number} radius The radius with which the corners should be rounded.
 */
CanvasRenderingContext2D.prototype.strokeRoundRect = function(x, y, width, height, radius) {
  this._createRoundRect(x, y, width, height, radius);
  this.stroke();
};
