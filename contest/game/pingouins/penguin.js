class Penguin {
	
	static green_counter = 0
	static blue_counter = 0

	constructor (context, board, col, row, player_number) {
		
		this._context = context
		this._board = board
		this._col = col
		this._row = row
		this._player_number = player_number
		this._move = null

		this._image = new Image ()

		if (player_number == 0) {
			Penguin.blue_counter += 1
			this._image.src = `./assets/P${Penguin.blue_counter}_Blue.png`
		}
		else if (player_number == 1) {
			Penguin.green_counter += 1
			this._image.src = `./assets/P${Penguin.green_counter}_Green.png`
		}
	}
	
	/** ===========================================================================================
	* Return true if this object is busy animating something
	*/
	is_busy () {		
        return (this._move != null)
	}	

	move_to (col, row) {
		this._move = {col: col, row: row, t:0.0}
	}

	get_coo () {
		return [this._col, this._row]
	}
		
	/** ===========================================================================================
	* Called to update state periodically
	*
	* @param {number}	dt		Time step [ms]
	*/
	update (dt) {		
		if (this._move != null) {
			this._move.t += dt / 1000.0

			if (this._move.t > 1.0) {
				this._col = this._move.col
				this._row = this._move.row
				this._move = null
			}
		}
	}
	
	/** ===========================================================================================
	* Called to draw the object
	*/
	draw () {

		// Get tile coordinate to draw the penguin
		var [x, y] = this._board.get_tile_coo (this._col, this._row)

		// Get transit position when we move
		if (this._move != null) {
			var [xd, yd] = this._board.get_tile_coo (this._move.col, this._move.row)
			x = x + (xd-x) * this._move.t
			y = y + (yd-y) * this._move.t
		}

		var w = this._board._cell_w / 1.4
		var h = this._image.height * w * 1.0 / this._image.width
		this._context.drawImage (this._image, 0, 0, this._image.width, this._image.height, x-w/2, y-h/2, w, h);
/*		var radius = this._board._cell_w / 5

		this._context.beginPath ()
		this._context.arc (x, y, radius, 0, 2 * Math.PI, false);
        this._context.closePath();
		
		var color = "blue"
		if (this._player_number == 1) color = "green"
		this._context.fillStyle = color;
        this._context.fill();*/
    }

}