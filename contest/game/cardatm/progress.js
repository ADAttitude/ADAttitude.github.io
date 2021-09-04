class Progress {
	

	constructor (context, x, y, top_width, bot_width, height) {
		
		this._context = context
		this._progress = 0.0
		this._x = x
		this._y = y
		this._tw = top_width
		this._bw = bot_width
		this._h=  height
	}

	/** ===========================================================================================
	* Set current position (center of the progress bar)
	*/
	set_center_pos (x, y) {
		this._x = x
		this._y = y
	}

	/** ===========================================================================================
	* Update progress status
	*/
    set_progress (progress) {

		this._progress = progress
    }

	/** ===========================================================================================
	* Called to update state periodically
	*
	* @param {number}	dt		Time step [ms]
	*/
	update (dt) {		
	}
	
	/** ===========================================================================================
	* Called to draw the object
	*/
	draw () {

		var cxt_left = this._x - this._tw/2
		var cxt_right = this._x + this._tw/2
		var cxb_left = this._x - this._bw/2
		var cxb_right = this._x + this._bw/2
		var cy_top = this._y - this._h/2
		var cy_bot = this._y + this._h/2

		var px_top = cxt_left + (cxt_right - cxt_left) * this._progress
		var px_bot = cxb_left + (cxb_right - cxb_left) * this._progress

        this._context.beginPath ()
        this._context.moveTo (cxt_left, cy_top);
        this._context.lineTo (px_top, cy_top);
        this._context.lineTo (px_bot, cy_bot);
        this._context.lineTo (cxb_left, cy_bot);
        this._context.closePath();

        this._context.fillStyle = 'red'
        this._context.fill();

        this._context.beginPath ()
        this._context.moveTo (cxt_left, cy_top);
        this._context.lineTo (cxt_right, cy_top);
        this._context.lineTo (cxb_right, cy_bot);
        this._context.lineTo (cxb_left, cy_bot);
        this._context.closePath();

		this._context.strokeStyle = 'white'
        this._context.lineWidth = 2.0;
        this._context.stroke();
    }
}