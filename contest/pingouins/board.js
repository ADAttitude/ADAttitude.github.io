class PingouinsBoard {
	
	constructor (context) {
		
		this.context = context
		
		this.ice = []
		for (let y = 0;  y < 8; y ++) {
			
			var row = [0, 0, 0, 0, 0, 0, 0, 0]
			this.ice [y] = row
        }
        
        this._disolve = null
        this._start_tile = null
        this._end_tile = null
        this._start_pos = []
        this._end_pos = []

        this._images = []
        for (let i = 1; i <= 3; i ++) {
            this._images.push (new Image ())
            this._images [i -1].src = `./assets/fishes-${i}.png`
        }
	}
	
	/** ===========================================================================================
	* Return true if this object is busy animating something
	*/
	is_busy () {		
        return (this._disolve != null)
	}	
        
	/** ===========================================================================================
     * Return the selected start / dest tiles to make a move
     */
    selected_tile () {
        return [this._start_tile, this._end_tile]
    }
    
	/** ===========================================================================================
	* Called to update state periodically
	*
	* @param {number}	dt		Time step [ms]
	*/
	update (dt) {		
        
        if (this._disolve != null) {
            this._disolve.t += dt / 1000.0
            if (this._disolve.t > 1.0) {
                this.ice [this._disolve.row] [this._disolve.col] = 0
                this._disolve = null
            }
        }
	}
	
	/** ===========================================================================================
	* Called to draw the object
	*/
	draw (mouse) {		

        // Unselect start tile on right click
        if (mouse.buttons == 2) {
            this._start_tile = null
            this._end_tile = null
        }

        this._size_elements ()
        this._draw_board (mouse)
    }
    
	/** ===========================================================================================
     * 
     */
    set_fishes (fishes) {
        this.ice = fishes
    }
    
	/** ===========================================================================================
     * 
     */
    set_start_positions (start_positions) {
        if (start_positions == null) start_positions = []
        this._start_pos = start_positions
        this._start_tile = null
        this._end_tile = null
    }

	/** ===========================================================================================
     * 
     */
    set_end_positions (end_positions) {
        if (end_positions == null) end_positions = []
        this._end_pos = end_positions
        this._end_tile = null
    }

	/** ===========================================================================================
     * Start disolving a tile
     * 
	 * @param {number}	col		Tile column
	 * @param {number}	row		Tile row
     */
    disolve (col, row) {

        this._disolve = {t: 0.0, col: col, row: row}
    }

	/** ===========================================================================================
     * Compute the tile coordinate resuling from a given action
     * 
     * @param {number}  x            Tile start position
     * @param {number}  y            Tile start position
     * @param {number}  direction    Direction of movement (0..5)
     * @param {number}  step         Number of steps in this direction
     * @return         [x, y] the resulting tile coordinate
     */
    compute_dest_tile (x, y, direction, step) {

		var stepX_even = [-1, -1, 0, 1, 0, -1]
		var stepX_odd = [-1, 0, 1, 1, 1, 0]
		var stepY = [0, 1, 1, 0, -1, -1]
        var odd = y % 2
        
		while (step > 0) {
			step -= 1
			y += stepY [direction]
			if (odd) x += stepX_odd [direction]
			else x += stepX_even [direction]
		
            odd = 1 - odd
        }

		return [x, y]
    }

	/** ===========================================================================================
	* Get the coordinates of a board tile on screen 
	* @param {number}	col		Column
	* @param {number}	row		Row
	* @return 			[x, y], the coordinates in pixels
	*/
	get_tile_coo (col, row) {
		
		var x = this.w / 2 + this._cell_w * (col - 3.5)
		var y = this.h / 2 + 0.75 * this._cell_h * (row - 3.5)
        if (row % 2 > 0) x += this._cell_w / 2
		return [x, y]
	}
    
	/** ===========================================================================================
    * Draw the 8x8 hexagonale-tiles board
    * 
    * @param mouse      Mouse state reported by the app
	*/
	_draw_board (mouse) {
    
        for (let col = 0; col < 8; col ++) {
            for (let row = 0; row < 8; row ++) {
                var num_fishes = this.ice [row] [col]
                
                if (num_fishes == 0) continue

                // The tile is currently dissolving
                if (this._disolve != null && this._disolve.col == col && this._disolve.row == row) {
                    var [x, y]= this.get_tile_coo (col, row)
                    var scale = 0.5 + 0.5 * (1.0-this._disolve.t)
                    var color = `rgba(0,0,0,${this._disolve.t})` 
                    this._draw_tile (x, y, num_fishes, color, scale)
                }

                // Otherwise
                else this._draw_tile_augmented (col, row, num_fishes, mouse)
            }    
        }	
	}
    
	/** ===========================================================================================
     * Draw a tile of the board, with additional effects in case of selection
     * 
     * @param {number}  col             Tile column on board
     * @param {number}  row             Tile row on board
     * @param {number}  num_fishes      Number of fishes on the tile
     * @param {Obhect}  mouse           Mouse state reported by the app
     */
    _draw_tile_augmented (col, row, num_fishes, mouse) {

        var shadow = false
        var start_highlight = false
        var selection_color = null
        var [x, y] = this.get_tile_coo (col, row)

        // Highlight when hovered
        if (this._start_tile == null) {
            if (this._start_pos.findIndex (p => p [0] == col && p [1] == row) >= 0) {
                var [tx, ty] = this.get_tile_coo (col, row)
                
                // Select on click
                if (this._test_tile (tx, ty, mouse.x, mouse.y)) {
                    start_highlight = true
                    if (mouse.buttons == 1) this._start_tile = [col, row]
                }
            }    
        }

        // Highlight when selected
        else if (this._start_tile [0] == col && this._start_tile [1] == row)
        start_highlight = true

        // Shadow when not a possible destination
        else if (this._end_pos != null) {
            if (this._end_pos.findIndex (p => p [0] == col && p [1] == row) < 0)
                shadow = true
            else {
                var [tx, ty] = this.get_tile_coo (col, row)
                if (this._test_tile (tx, ty, mouse.x, mouse.y)) {
                    start_highlight = true
                    if (mouse.buttons == 1) this._end_tile = [col, row]
                }
            }            
        }
        
        if (start_highlight) selection_color = "rgba(200,0,0,0.4)"
        if (shadow) selection_color = "rgba(0,0,0,0.4)"
        this._draw_tile (x, y, num_fishes, selection_color)
    }

	/** ===========================================================================================
     * Draw a tile of the board
     * 
     * @param {number}  x               Target position on screen
     * @param {number}  y               Target position on screen
     * @param {number}  num_fishes      Number of fishes on the tile
     * @param {any}     selection_color An optional color to highlight the tile
     * @param {number}  scale           Scale factor for drawing
     */
    _draw_tile (x, y, num_fishes, selection_color=null, scale=1.0) {

        var img = this._images [num_fishes -1]
        var w = img.width
        var h = img.height
        var cw = this._cell_w * scale
        var ch = this._cell_h * scale
        this.context.drawImage (img, 0, 0, w, h, x - cw/2, y -ch/2, cw, ch);
        this._draw_hexagone (x, y, selection_color, "white", 3)
    }

	/** ===========================================================================================
     * Draw an hexagone centered around a given position, with optional drawing effects
     * 
     * @param {number}  x               Target position on screen
     * @param {number}  y               Target position on screen
     * @param {string}  fill_style      Style to draw the inside
     * @param {string}  stroke_style    Style to draw the outside
     * @param {number}  line_width      Width of the outside
     * @param {number}  scale           Scale factor
     */
    _draw_hexagone (x, y, fill_style=null, stroke_style=null, line_width=0, scale=1.0) {
        
        var vertices = this._get_tile_vertices ()

        this.context.beginPath ()
        this.context.moveTo (scale * vertices [0][0] + x, scale * vertices [0][1] + y);
        for (let i = 1; i < 6; i ++) {
            this.context.lineTo (scale * vertices [i][0] + x, scale * vertices [i][1] + y);
        }
        this.context.closePath();
        if (fill_style != null) {
            this.context.fillStyle = fill_style
            this.context.fill();
        }
        if (stroke_style != null) {
            this.context.strokeStyle = stroke_style
            this.context.lineWidth = line_width;
            this.context.stroke();
        }
    }

 	/** ===========================================================================================
     * Geometrically test if a given coordinate falls inside a tile
     * @param {number}  tx		Tile center in pixel coordinates
     * @param {number}  ty		Tile center in pixel coordinates
     * @param {number}  x		Point to test in pixel coordinates
     * @param {number}  y		Point to test in pixel coordinates
     */
    _test_tile (tx, ty, x, y) {

        var w = this._cell_w /2
        var edge = this._cell_h / 2
        
        // Test bouding box
		if (Math.abs (y - ty) > edge) return false
		if (Math.abs (x - tx) > w) return false

		// Test rectangle inside		
		if (Math.abs (y - ty) < edge / 2) return true
		
		// Last test on the remaining triangles
		var dx = Math.abs (x - tx)
		var dy = Math.abs (y - ty) - edge/2
		if (dy > 0.5*edge*(w-dx)/w) return false
        return true
    }

 	/** ===========================================================================================
     * Get the vertex coordinates of a hex-tile centered around point 0, 0
     * 
     * @return  List of 6 coordinates [x, y]
     */
    _get_tile_vertices () {

        var sx = this._cell_w / 2
        var sy = this._cell_h / 4
        var vx = [0, sx, sx, 0, -sx, -sx]
        var vy = [-2*sy, -sy, sy, 2*sy, sy, -sy]
        var vertices = []
        for (let i = 0; i < 6; i ++) {
            vertices.push ([vx [i], vy [i]])
        }
        return vertices
    }

	/** ===========================================================================================
	* Size the drawing elements based on the screen size
	*/
	_size_elements () {

		this.w = this.context.canvas.width
        this.h = this.context.canvas.height
        
        var scale_w = this.w * 0.8 / 8.0
        var scale_h = this.h * 0.9 / 8.0
        var scale = Math.min (scale_w, scale_h)
        this._cell_w = scale
        this._cell_h = this._cell_w / (0.5 * Math.sqrt (3))
	}
}