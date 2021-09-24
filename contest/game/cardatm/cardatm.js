const ACTIONS = {
	NONE: "none",
	JUMP_IN: "jump-in",
	JUMP_OUT: "jump-out"
}

class Cardatm {
	
	constructor (context) {

		this._context = context

		let top_left = 504
		let top_right = 265
		let bot_left = 487
		let bot_right = 280
		let top = 152
		let bot = 187

		// Size of the lamp
        var lamp_width_top = top_left-top_right
        var lamp_width_bot = bot_left-bot_right
        var lamp_height = bot-top	

		// Position of the lamp inside the original drawing (center)
        this._lamp_x = (top_left+top_right)/2
        this._lamp_y = (bot+top)/2
		this._height_hidden = -0.7

		// Progress bar to show on the lamp
        this._progress = new Progress (context, this._lamp_x, this._lamp_y, lamp_width_top, lamp_width_bot, lamp_height)

		// CardaTM drawing
        this._image = new Image ()
		this._image.src = `../assets/CardATM.png`

		// CardaTM size and position
		this._width = 400
		this._pos_height = this._height_hidden
		this._speed = 0.0
		this._vib_x_freq = []
		this._vib_x_mag = []
		this._offset_x = 0.0
		this._action = ACTIONS.NONE
		this._t = 0.0				
	}

	/** ===========================================================================================
	* Called to update state periodically
	*
	* @param {number}	dt		Time step [ms]
	*/
	update (dt) {
		const speed = 2.0
		const gravity = -20.0
		dt = dt / 1000.0

		if (this._action == ACTIONS.JUMP_IN) {
			this._speed += gravity * dt
			this._pos_height += this._speed * dt + gravity * dt * dt / 2.0

			if (this._speed < 0.0 && this._pos_height < 0.0) {
				this._action = ACTIONS.NONE
				this._pos_height = 0.0
				this._speed = 0.0
				this._start_vibration ()
			}
		}

		if (this._action == ACTIONS.JUMP_OUT) {
			this._stop_vibration ()
			if (this._pos_height > this._height_hidden) {
				this._pos_height -= speed * dt
			}
			else {
				this._action = ACTIONS.NONE
				this._pos_height = this._height_hidden
			}
		}

		this._offset_x = 0.0
		for (let i = 0; i < this._vib_x_freq.length; i ++) {
			var mag = this._vib_x_mag [i]
			var frq = this._vib_x_freq [i]
			this._t += dt 
			this._offset_x += this._progress._progress * mag * Math.sin (6.28 * frq * this._t)
		}
	}
	
	/** ===========================================================================================
	* Called to draw the object
	*/
	draw () {
        
		this._size_elements ()

		var scale = this._width / this._image.width
        var w = this._image.width * scale
		var h = this._image.height * scale

		var [x, y] = this._get_onscreen_position (scale)

		this._context.drawImage (this._image, 0, 0, this._image.width, this._image.height, x-w/2, y-h/2, w, h);

        this._progress.set_center_pos (x-w/2+this._lamp_x*scale, y-h/2+this._lamp_y*scale)
        this._progress.draw (scale)
    }

	/** ===========================================================================================
	* Update progress status of the AI
	*/
    set_progress (progress) {

        // Update progress bar
        this._progress.set_progress (progress)

		if (this._is_hidden () && progress > 0.0) this._jump_in ()
		if (this._is_on_floor () && progress == 0.0) this._jump_out ()
    }

	_is_hidden () {
		return (this._action == ACTIONS.NONE && this._pos_height == this._height_hidden)
	}

	_is_on_floor () {
		return (this._action == ACTIONS.NONE  && this._pos_height == 0.0)
	}


	_jump_in () {
		this._pos_height = this._height_hidden
		this._speed = 7.0
		this._action = ACTIONS.JUMP_IN
	}

	_jump_out () {
		this._pos_height = 0.0
		this._speed = 5.0
		this._action = ACTIONS.JUMP_OUT
	}

	_stop_vibration () {
		this._vib_x_freq = []
		this._vib_x_mag = []
		this._offset_x = 0.0
		this._t = 0.0
	}

	_start_vibration () {

		for (let i = 0; i < 3; i ++) {
			this._vib_x_freq.push (this._random_range (1.0, 4.0))
			this._vib_x_mag.push (this._random_range (1e-4, 3e-3))
		}
	}

	_random_range (min, max) {
		return Math.random() * (max - min) + min;
	}

	_get_onscreen_position (scale) {

		var w = this._context.canvas.width
        var h = this._context.canvas.height
		var ih = this._image.height * scale
		var iw = this._image.width * scale

		var x = scale * this._image.width * 0.5 + this._offset_x * iw
		var y = h - ih/2 - this._pos_height * ih

		return [x, y]
	}

	/** ===========================================================================================
	* Size the drawing elements based on the screen size
	*/
	_size_elements () {

		var w = this._context.canvas.width
        var h = this._context.canvas.height

		// Retrieve Pingeuins board size and corresponding margin
        var scale_w = w * 0.8
        var scale_h = h * 0.9
        var scale = Math.min (scale_w, scale_h)
		var mw = (w - scale) / 2
		var mh = (h - scale*0.9) / 2

		var marge = Math.max (mw, mh)
		this._width = marge
		var minimum = scale_w * 0.35
		
		if (w > h) {
			this._width =  Math.max (marge, minimum)
		}
		else {
			this._width =  Math.max (marge*1.2, minimum)
		}

		if (this._width > w) this._width = w
	}
}