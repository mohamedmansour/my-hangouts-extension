/**
 * We're adding one private and two public methods to the
 * CanvasRenderingContext2D prototype, which allow us to draw
 * rounded rectangles.
 *
 * @author kaktus621@gmail.com (Martin Matysiak)
 */


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
