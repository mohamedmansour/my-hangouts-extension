/**
 * Applies filters to images
 * Adapted from http://evanw.github.com/glfx.js/media/demo.js
 *
 * @author James Williams 2011 (http://jameswilliams.be)
 * @author Mohamed Mansour 2011 (http://mohamedmansour.com)
 * @author Rayan Bouajram 2011 (http://rayanbouajram.com)
 */
CaptureEffectsController = function(galleryController) {
  this.galleryController = galleryController;
  this.currentlyRenderedEffectIndex = 0;
  this.perspectiveNubs = [];
  this.filters = {};
  this.glfxCanvas = fx.canvas();
  this.texture = null;
  this.originalData = {};
  this.filterTemplate = $('#filter-template');
	this.filterCount = 0;
};

CaptureEffectsController.prototype.init = function() {
  this.loadEffects();
  this.renderEffects();
  this.bindUI();
};

CaptureEffectsController.prototype.open = function(id) {
  var self = this;
  self.openEditMode();

  // Retrieve larger image.
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'findCapture',
    arguments: [id]
  }, function(res) {
    self.originalData = {
      thumbnail_width: res.data.thumbnail_width,
      thumbnail_height: res.data.thumbnail_height
    };
    var originalImage = new Image();
    originalImage.src = res.data.active;
    originalImage.onload = function() {
      self.texture = self.glfxCanvas.texture(originalImage);
      self.resetEffectCanvas().update();
      $('#canvasPreview').append(self.glfxCanvas);
      self.onWindowResize();
    };
  });
};
CaptureEffectsController.prototype.openEditMode = function() {
  $(document).on("click", "li", function() {
	  $(this).addClass('select');
	  $('li').fadeOut(800);
	  $('#edit').delay(400).fadeIn(400);
  });
};
CaptureEffectsController.prototype.dispose = function() {
	$(this.glfxCanvas).remove();
	$('#edit').fadeOut(200);
	$('li').delay(400).fadeIn(200).removeClass('select');	
	$(document).off("click", "li");
};

CaptureEffectsController.prototype.onSaveClicked = function() {
  var self = this;
  var originalData = {};
  originalData.active = this.glfxCanvas.toDataURL();
  originalData.active_width = this.glfxCanvas.width;
  originalData.active_height = this.glfxCanvas.height;
  originalData.time = new Date();
  originalData.description = 'Applied Filter to existing image.';

  // glfx.js doesn't seem to work nicely with drawImage so I had to write to an image
  // and then use that image with drawImage
  var tempImage = new Image()
  tempImage.src = this.glfxCanvas.toDataURL();
  tempImage.onload = function () {
    var tempCanvas = document.createElement('canvas');
    var ctx = tempCanvas.getContext('2d');
    ctx.canvas.width = self.originalData.thumbnail_width;
    ctx.canvas.height = self.originalData.thumbnail_height;
    ctx.drawImage(this, 0, 0, ctx.canvas.width, ctx.canvas.height);
    self.processImage(originalData, ctx.canvas.toDataURL());    
  };
};

CaptureEffectsController.prototype.processImage = function(originalData, thumbnail) {
  var self = this;
  console.log('Process capture');
  originalData.thumbnail = thumbnail;
  originalData.thumbnail_width = self.originalData.thumbnail_width;
  originalData.thumbnail_height = self.originalData.thumbnail_height;
  
  chrome.extension.sendRequest({
    service: 'Capture',
    method: 'processCapture',
    arguments: [originalData]
  }, function(res) {
    console.log('Saved ' + res.id);
    self.dispose();
    
    // Append that moment to the gallery.
    originalData._id = res.id;
    self.galleryController.renderMoment(originalData);
  });
};

CaptureEffectsController.prototype.resetEffectCanvas = function() {
	return this.glfxCanvas.draw(this.texture);
}

CaptureEffectsController.prototype.getEffectCanvas = function() {
	if (this.glfxCanvas == null)
		return this.resetEffectCanvas();
  else return this.glfxCanvas;
};

CaptureEffectsController.prototype.onWindowResize = function() {
  //set boundaries
  var windowHeight = $(window).height() - $('#edit-head').height();
  var windowWidth = $(window).width() - $('#fx-container').width();
  
  //resize to boundaries
  $('#canvas-container').css('height', windowHeight);
  $('#canvas-container').css('width', windowWidth);
  
  //do some math
  if ($('canvas').height() != windowHeight) {
	$('canvas').height(windowHeight).width('auto');
  }
  if ($('canvas').width() > windowWidth) {
      $('canvas').height('auto').width(windowWidth);
  }
  
  //adjust height of fx-container
  $('#fx-container').css('height', windowHeight);
};

CaptureEffectsController.prototype.onEffectClose = function(e) {
  console.log("closed");

	$(e.target).parent().fadeOut();
  // TODO: Cleanup
	console.log("closed");
};

CaptureEffectsController.prototype.onAddEffectClicked = function() {
	var id = this.filterCount++;
  var newFilter = this.filterTemplate.tmpl({_id:id});
	newFilter.insertBefore('.add-effect-btn');
	this.renderEffects('#effects'+id);
};

CaptureEffectsController.prototype.bindUI = function() {
  $('.discard').click(this.dispose.bind(this));
  $('.save').click(this.onSaveClicked.bind(this));
  $('.close').click(this.onEffectClose.bind(this));
  $('.add-effect-btn').click(this.onAddEffectClicked.bind(this));
  $(window).resize(this.onWindowResize.bind(this));
};


CaptureEffectsController.prototype.loadEffects = function() {
  var self = this;
  this.perspectiveNubs = [175, 156, 496, 55, 161, 279, 504, 330];
  this.filters = {
    'Adjust': [
      new Filter('Brightness / Contrast', 'brightnessContrast', function() {
        this.addSlider('brightness', 'Brightness', -1, 1, 0, 0.01);
        this.addSlider('contrast', 'Contrast', -1, 1, 0, 0.01);
      }, function() {
        self.getEffectCanvas().brightnessContrast(this.brightness, this.contrast).update();
      }),
      new Filter('Hue / Saturation', 'hueSaturation', function() {
        this.addSlider('hue', 'Hue', -1, 1, 0, 0.01);
        this.addSlider('saturation', 'Saturation', -1, 1, 0, 0.01);
      }, function() {
        self.getEffectCanvas().hueSaturation(this.hue, this.saturation).update();
      }),
      new Filter('Vibrance', 'vibrance', function() {
        this.addSlider('amount', 'Amount', -1, 1, 0.5, 0.01);
      }, function() {
        self.getEffectCanvas().vibrance(this.amount).update();
      }),
      new Filter('Denoise', 'denoise', function() {
        this.addSlider('exponent', 'Exponent', 0, 50, 20, 1);
      }, function() {
        self.getEffectCanvas().denoise(this.exponent).update();
      }),
      new Filter('Unsharp Mask', 'unsharpMask', function() {
        this.addSlider('radius', 'Radius', 0, 200, 20, 1);
        this.addSlider('strength', 'Strength', 0, 5, 2, 0.01);
      }, function() {
        self.getEffectCanvas().unsharpMask(this.radius, this.strength).update();
      }),
      new Filter('Noise', 'noise', function() {
        this.addSlider('amount', 'Amount', 0, 1, 0.5, 0.01);
      }, function() {
        self.getEffectCanvas().noise(this.amount).update();
      }),
      new Filter('Sepia', 'sepia', function() {
        this.addSlider('amount', 'Amount', 0, 1, 1, 0.01);
      }, function() {
        self.getEffectCanvas().sepia(this.amount).update();
      }),
      new Filter('Vignette', 'vignette', function() {
        this.addSlider('size', 'Size', 0, 1, 0.5, 0.01);
        this.addSlider('amount', 'Amount', 0, 1, 0.5, 0.01);
      }, function() {
        self.getEffectCanvas().vignette(this.size, this.amount).update();
      })
    ],
    'Blur': [
      new Filter('Zoom Blur', 'zoomBlur', function() {
        this.addNub('center', 0.5, 0.5);
        this.addSlider('strength', 'Strength', 0, 1, 0.3, 0.01);
      }, function() {
        self.getEffectCanvas().zoomBlur(this.center.x, this.center.y, this.strength).update();
      }),
      new Filter('Triangle Blur', 'triangleBlur', function() {
        this.addSlider('radius', 'Radius', 0, 200, 50, 1);
      }, function() {
        self.getEffectCanvas().triangleBlur(this.radius).update();
      }),
      new Filter('Tilt Shift', 'tiltShift', function() {
        this.addNub('start', 0.15, 0.75);
        this.addNub('end', 0.75, 0.6);
        this.addSlider('blurRadius', 'Blur Radius', 0, 50, 15, 1);
        this.addSlider('gradientRadius', 'Gradient Radius', 0, 400, 200, 1);
      }, function() {
        self.getEffectCanvas().tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
      }),
      new Filter('Lens Blur', 'lensBlur', function() {
        this.addSlider('radius', 'Radius', 0, 50, 10, 1);
        this.addSlider('brightness', 'Brightness', -1, 1, 0.75, 0.01);
        this.addSlider('angle', 'Angle', -Math.PI, Math.PI, 0, 0.01);
      }, function() {
        self.getEffectCanvas().lensBlur(this.radius, his.brightness, this.angle).update();
      })
    ],
    'Warp': [
      new Filter('Swirl', 'swirl', function() {
        this.addNub('center', 0.5, 0.5);
        this.addSlider('angle', 'Angle', -25, 25, 3, 0.1);
        this.addSlider('radius', 'Radius', 0, 600, 200, 1);
      }, function() {
        self.getEffectCanvas().swirl(this.center.x, this.center.y, this.radius, this.angle).update();
      }),
      new Filter('Bulge / Pinch', 'bulgePinch', function() {
        this.addNub('center', 0.5, 0.5);
        this.addSlider('strength', 'Strength', -1, 1, 0.5, 0.01);
        this.addSlider('radius', 'Radius', 0, 600, 200, 1);
      }, function() {
        self.getEffectCanvas().bulgePinch(this.center.x, this.center.y, this.radius, this.strength).update();
      })/*,
      new Filter('Perspective', 'perspective', function() {
          var w = 640, h = 425;
          this.addNub('a', perspectiveNubs[0] / w, perspectiveNubs[1] / h);
          this.addNub('b', perspectiveNubs[2] / w, perspectiveNubs[3] / h);
          this.addNub('c', perspectiveNubs[4] / w, perspectiveNubs[5] / h);
          this.addNub('d', perspectiveNubs[6] / w, perspectiveNubs[7] / h);
      }, function() {
          var before = perspectiveNubs;
          var after = [this.a.x, this.a.y, this.b.x, this.b.y, this.c.x, this.c.y, this.d.x, this.d.y];
      //     this.setCode('canvas.draw(texture).perspective([' + before + '], [' + after + ']).update();');
      })*/
    ],
    'Fun': [
      new Filter('Ink', 'ink', function() {
        this.addSlider('strength', 'Strength', 0, 1, 0.25, 0.01);
      }, function() {
        self.getEffectCanvas().ink(this.strength).update();
      }),
      new Filter('Edge Work', 'edgeWork', function() {
        this.addSlider('radius', 'Radius', 0, 200, 10, 1);
      }, function() {
        self.getEffectCanvas().edgeWork(this.radius).update();
      }),
      new Filter('Hexagonal Pixelate', 'hexagonalPixelate', function() {
        this.addNub('center', 0.5, 0.5);
        this.addSlider('scale', 'Scale', 10, 100, 20, 1);
      }, function() {
        self.getEffectCanvas().hexagonalPixelate(this.center.x, this.center.y, this.scale).update();
      }),
      new Filter('Dot Screen', 'dotScreen', function() {
        this.addNub('center', 0.5, 0.5);
        this.addSlider('angle', 'Angle', 0, Math.PI / 2, 1.1, 0.01);
        this.addSlider('size', 'Size', 3, 20, 3, 0.01);
      }, function() {
        self.getEffectCanvas().dotScreen(this.center.x, this.center.y, this.angle, this.size).update();
      }),
      new Filter('Color Halftone', 'colorHalftone', function() {
        this.addNub('center', 0.5, 0.5);
        this.addSlider('angle', 'Angle', 0, Math.PI / 2, 0.25, 0.01);
        this.addSlider('size', 'Size', 3, 20, 4, 0.01);
      }, function() {
        self.getEffectCanvas().colorHalftone(this.center.x, this.center.y, this.angle, this.size).update();
      })
    ]
  };
};

CaptureEffectsController.prototype.renderEffects = function(s) {
  // Create the filter selector
  var html = '';
  for (var category in this.filters) {
    var list = this.filters[category];
    html += '<option disabled="true">---- ' + category + ' -----</option>';
    for (var i = 0; i < list.length; i++) {
      html += '<option>' + list[i].name + '</option>';
    }
  }
  if (s == undefined) {
  	$('.filters').html(html);
  	$('.filters').change(this.onFilterEffectChange.bind(this));
	} else {
		$(s+' .filters').html(html);
		$(s+' .filters').change(this.onFilterEffectChange.bind(this));
	}
};

/**
 *  Call use() on the currently selected filter when the selection is changed
 */
CaptureEffectsController.prototype.onFilterEffectChange = function(e) {
  var index = e.target.selectedIndex;
  if (this.currentlyRenderedEffectIndex != index) {
    this.currentlyRenderedEffectIndex = index;
  }
  for (var category in this.filters) {
    index--;
    var list = this.filters[category];
    for (var i = 0; i < list.length; i++) {
      if (index-- == 0) {
				parentElement = $(e.target).parent();
				selectedIndex = parentElement.data().index;
				console.log(list[i]);
        list[i].use(this, list[i].name, selectedIndex);
      }
    }
  }
};

<<<<<<< HEAD
/* Add text to a canvas
 *
 * args = {
 *    text: <text string>,
 *    fillColor: <hex color>
 *    font: <font name>,
 *    fontSize: <size in pixels>  --optional, can be in font name
 *    x: <x>,                     --optional, defaults to (0,0)
 *    y: <y>
 *
 * Should always be applied last.
 */

CaptureEffectsController.prototype.addTextToCanvas = function(args) {
  effectCanvas = controller.effectsController.getEffectCanvas()
  // create canvas with same size as source
  var textCanvas = document.createElement("canvas");
  textCanvas.height = effectCanvas.height;
  textCanvas.width = effectCanvas.width;
  var ctx = textCanvas.getContext("2d");
  
  appliedEffectsImage = new Image();
  appliedEffectsImage.src = effectCanvas.toDataURL();
  appliedEffectsImage.onload = function () {
    ctx.drawImage(this, 0, 0);
    
    ctx.fillStyle = args.fillColor;
    ctx.font = args.font;
    ctx.textBaseline = "top";
    if (args.x == undefined)
      args.x = 0;
    if (args.y == undefined)
      args.y = 0;
    ctx.fillText(args.text, 0, 0);
    
  
    var compositeImage = new Image();
    compositeImage.src = textCanvas.toDataURL();
    compositeImage.onload = function () {
      console.log (effectCanvas);
      tex = effectCanvas.texture(this);
      console.log(tex);
      //remove old canvas
      // TODO encapsulate this code
      $(controller.effectsController.glfxCanvas).remove();
      controller.effectsController.glfxCanvas = fx.canvas();
      tex = controller.effectsController.glfxCanvas.texture(this);
      controller.effectsController.glfxCanvas.draw(tex).update();
      $("#canvasPreview").append(controller.effectsController.glfxCanvas);
    }
  }
}

=======
// TODO Make these a stack of functions to apply
CaptureEffectsController.prototype.collectEffects = function() {
	this.glfxCanvas = this.resetEffectCanvas();

	sliders = $('.fx-panel .sliders');
	filtersToApply = []
	for (var i = 0; i < sliders.length; i++) {
		var s = sliders[i];
		filterName = $(s).data('type')
		for (var key in this.filters) {
			group = this.filters[key];
			filter = _.filter(group, function(obj) { return obj['name'] == filterName});
			if (filter.length == 1) {
				// Clone it and add to stack
				clone = $.extend(true, {}, filter[0])
				children = $(s).children('div')
				filtersToApply.push(clone)
			}
		}
		for (var k = 0; k < filtersToApply.length; k++) {
			filtersToApply[k].update();
		}
	}
}


>>>>>>> Fixed minor bug with sliders.
/**
 * Describes a filter.
 */
Filter = function(name, func, init, update, imageData) {
  this.name = name;
  this.func = func;
  this.update = update;
  this.imageData = imageData;
  this.sliders = [];
  this.nubs = [];
  init.call(this);
}

Filter.prototype.addNub = function(name, x, y) {
  this.nubs.push({ name: name, x: x, y: y });
};

Filter.prototype.addSlider = function(name, label, min, max, value, step) {
  this.sliders.push({ name: name, label: label, min: min, max: max, value: value, step: step });
};

Filter.prototype.use = function(effectController, filterName, selectedIndex) {
  // Load the texture from the image and draw it to the canvas
  var canvas = effectController.glfxCanvas;
	// Index of the panel that was selected
	var index = selectedIndex;
  // Clear the sliders
  $('#sliders'+index).empty();
  $('#sliders'+index).data('type', filterName);
  // Add a row for each slider
  for (var i = 0; i < this.sliders.length; i++) {
    var slider = this.sliders[i];
    $('<div>' + slider.label.replace(/ /g, '&nbsp;') + 
			':<div id="slider'+index +'_' + i + '" data-attrib="'+slider.name+'"></div></div>').appendTo($("#sliders"+index));
    var onchange = (function(this_, slider) { return function(event, ui) {
	   	this_[slider.name] = ui.value;
      controller.effectsController.collectEffects();
    }; })(this, slider);
    $('#slider'+index+'_' + i).slider({
      slide: onchange,
      change: onchange,
      min: slider.min,
      max: slider.max,
      value: slider.value,
      step: slider.step
    });
    this[slider.name] = slider.value;
  }

  // Add a div for each nub
  $('#nubs').html('');
  for (var i = 0; i < this.nubs.length; i++) {
    var nub = this.nubs[i];
    console.log(canvas);
    var x = nub.x * canvas.width;
    var y = nub.y * canvas.height;
    $('<div class="nub" id="nub' + i + '"></div>').appendTo('#nubs');
    var ondrag = (function(this_, nub) { return function(event, ui) {
      var offset = $("#light").offset();
      console.log("here");
      this_[nub.name] = { x: ui.offset.left - offset.left, y: ui.offset.top - offset.top };
			controller.effectsController.collectEffects();
    }; })(this, nub);
    $('#nub' + i).draggable({
      drag: ondrag,
      //containment: 'parent',
      scroll: false
    }).css({ left: x, top: y });
    this[nub.name] = { x: x, y: y };
  }
  //$('#nubs').css({width:canvas.width, height:canvas.height});
  this.update();
};
