class Pingouins extends Game {
	
	// Code name for the 6 directions: Left, Top left, Top right, right, bottom right and bottom left
	static DIRECTIONS = ['LL', 'TL', 'TR', 'RR', 'BR', 'BL']


	/** ===========================================================================================
	* Create a 'Pingouins' game
	*
	* @param 			context		HTML5 canvas context
	* @param {string}	uri			Server uri
	* @param {string}	agent_1		'player', 'mcts' or 'random'
	* @param {string}	agent_2		'player', 'mcts' or 'random'
	* @param {Object}	language	Language dictionary
	* @param {number}	seed		Seed for pseudorandomness
	* @param {string}	player_id	Free reference, can be empty
	*/			
	constructor (context, uri, agent_1, agent_2, language, seed=0, player_id=null) {
		
		super ("Pingouins", context, uri, agent_1, agent_2, seed, player_id)
		this.board = new PingouinsBoard (context)	
		
		this._context = context
		this._gui_player = -1
		this._action_request_id = -1
		this._winner = -1
		this._language = language
		this._actions = []
		this._penguins = []
		this._scores = null
	}
	
	/** ===========================================================================================
	* Called by the game loop to give chance to update the game periodically
	*
	* @param dt		Elpased time since last call [ms]
	*/
	update (dt) {		

		// Update game items
		this.board.update (dt)
		this._penguins.forEach (penguin => {
			penguin.update (dt)
		})

		// Start position selected -> compute possible destinations
		var [start, dest] = this.board.selected_tile ()
		if (start != null) {

			var [xs, ys] = start
			var spots = []
			var filtered = this._actions.filter (v => v [0] == xs && v [1] == ys)
			filtered.forEach (action => {
				var [x, y, dir, step] = action
				var [xd, yd] = this.board.compute_dest_tile (x, y, dir, step)
				spots.push ([xd, yd])
			})

			this.board.set_end_positions (spots)
		}

		// Destination selected -> validate the move
		if (dest != null) {
			
			this.board.set_start_positions (null)
			this.board.set_end_positions (null)
			this.board.disolve (start [0], start [1])

			// Find corresponding penguin and move it to dest
			var [xd, yd] = dest
			var penguin = this._penguins.filter (
				p => p.get_coo () [0] == xs && p.get_coo () [1] == ys
			) [0]

			penguin.move_to (xd, yd)

			// Find back corresponding action and send it 
			var selected = this._actions.filter (action => {
				var [x, y, dir, step] = action
				var [axd, ayd] = this.board.compute_dest_tile (x, y, dir, step)
				if (axd != xd || ayd != yd || x != xs || y != ys) return false
				return true
			}) [0]

			var dir_string = Pingouins.DIRECTIONS [selected [2]]
			var action_string = `(${selected [0]},${selected [1]},${dir_string},${selected [3]})` 
			this._buddy_client.reply_selected_action (this._action_request_id, action_string)
			
			this._actions = []
			this._action_request_id = -1
		}
	}
	
	/** ===========================================================================================
	* Called by the game loop to give chance to draw the game periodically
	*/
	draw () {

		// Draw board and penguins above
		this.board.draw (this.mouse, this.touch)
		this._penguins.forEach (penguin => {
			penguin.draw ()
		})

		// Draw scores
		if (this._scores != null)
		{
			var w = this.context.canvas.width
			var h = this.context.canvas.height
			var radius = this.board._cell_w / 2
			var x = w/2 - this.board._cell_w * 4.4
			var y = h/2 - this.board._cell_h * 4.4 * 0.75
			this._draw_score (x, y, radius, this._scores ["Blue"], "rgba(0,0,200,0.6)")			

			var x = w/2 + this.board._cell_w * 4.4
			this._draw_score (x, y, radius, this._scores ["Green"], "rgba(0,200,0,0.6)")			
		}

		// Draw winner banner
		if (this._winner != -1) {
			
			if (this._winner == 0)
				this._draw_banner (this._language.blue_wins, "rgba(0, 0, 200, 0.6)")

			else if (this._winner == 1)
				this._draw_banner (this._language.green_wins, "rgba(0, 200, 0, 0.6)")
			
			else if (this._winner == 2)
				this._draw_banner (this._language.drawn, "rgba(150, 150, 150, 0.6)")
		}
	}
	
	/** ===========================================================================================
	* Called by the game loop to know if the game is still busy animating anything
	*/
	is_busy () {
		if (this.board.is_busy ()) return true
		else return false
	}
		
	/** ===========================================================================================
	* Draw a circle with a score inside
	*
	* @param {number}	 x		Center of the bubble
	* @param {number}	 y		Center of the bubble
	* @param {number} 	radius	Bubble radius
	* @param {number} 	score	Score to write inside
	* @param {any} 		color	A color
	*/
	_draw_score (x, y, radius, score, color) {

		this._context.beginPath ()
		this._context.arc (x, y, radius, 0, 2 * Math.PI, false);
		this._context.closePath();
		this._context.fillStyle = color
		this._context.strokeStyle = "white"
		this._context.lineWidth = 4
		this._context.fill();
		this._context.stroke();

		var font_height = radius
		canvas.style.font = this.context.font;
		canvas.style.fontSize = `${font_height}px`;
		this._context.font = canvas.style.font;
		this._context.textAlign = "center";
		this._context.textBaseline = "middle"; 
		this._context.fillStyle = "white";
		this._context.fillText (`+${score}`, x, y); 	
	}

	/** ===========================================================================================
	* Called by the game loop when a new round of the game is about to start (the origin of this message is at the server side)
	*
	* @param {number} contest		Handle of the contest handle (required to communicate with the server)
	* @param {number} round_number	A counter givin wich round is about to start
	* @param {string} game_state	The current state of the game encoded into a string
	*/
	_round_start (contest, round_number, game_state) {

		var [fishes, penguins, scores] = this._decode_state (game_state)
		
		// Init game state the first time we get this message
		if (round_number == 0) {
			this.board.set_fishes (fishes)
			penguins.forEach (item => {

				var [player_role, coo] = item
				var [col, row] = coo
				var player
				if (player_role.toLowerCase () == "blue") player = 0
				else if (player_role.toLowerCase () == "green") player = 1
				this._penguins.push (new Penguin (this.context, this.board, col, row, player))
			})
		}
	}
				
	/** ===========================================================================================
	* Called by the game loop when a new turn of the game is about to start (the origin of this message is at the server side)
	*
	* @param {number} contest		Handle of the contest handle (required to communicate with the server)
	* @param {number} round_number	A counter giving wich round is about to start
	* @param {number} step			Counter incremented for each player playing simultaneously during this turn
	* @param {string} game_state	The current state of the game encoded into a string
	* @param {Objet}  player		The player who has to play now
	*/
	_turn_start (contest, round_number, step, game_state, player) {
	}
	
	/** ===========================================================================================
	* Called by the game loop at the end of a turn (the origin of this message is at the server side)
	*
	* @param {number} 	contest		Handle of the contest handle (required to communicate with the server)
	* @param {string} 	game_state	The current state of the game encoded into a string
	* @param {[Objet]}	player_action	Action chosen by each player, as a list: [(player number, role, action)]
	*/
	_turn_end (contest, game_state, player_action) {
		
		// Check if the move is done outside the GUI. If yes, animate it
		player_action = player_action [0]
		if (player_action.number != this._gui_player) {
			
			var action = this._decode_action (player_action.action)
			if (action.length == 4) {
				var [xs, ys, dir, step] = action
				var [xd, yd] = this.board.compute_dest_tile (xs, ys, dir, step)

				// Find corresponding penguin and make it move
				var penguin = this._penguins.filter (
					p => p.get_coo () [0] == xs && p.get_coo () [1] == ys
				) [0]

				penguin.move_to (xd, yd)
				this.board.disolve (xs, ys)
			}
		}
		this._gui_player = -1

		// Record new scores
		var [fishes, penguins, scores] = this._decode_state (game_state)
		this._scores = scores
	}
	
	/** ===========================================================================================
	* Called by the game loop at the end of a round (the origin of this message is at the server side)
	*
	* @param {number}	contest		Handle of the contest handle (required to communicate with the server)
	* @param {string}	game_state	The current state of the game encoded into a string
	* @param {[Object]}	rewards		Current reward for each player, as a list: [(player number, role, reward)]
	*/
	_round_end (contest, game_state, rewards) {

		var game_tokens = game_state.split ('\n')
		if (game_tokens [game_tokens.length -1].toLowerCase () == "end") {

			if (this._scores ["Blue"] > this._scores ["Green"]) this._winner = 0
			else if (this._scores ["Blue"] < this._scores ["Green"]) this._winner = 1
			else this._winner = 2
		}
	}
		
	/** ===========================================================================================
	* Called by the game loop to inform the server is waiting for the player chosen action
	*
	* @param {number} 	contest		Handle of the contest handle (required to communicate with the server)
	* @param {number} 	agent			Handle of the playing agent
	* @param {number} 	request_id	Id to put in the response to match the server request
	* @param {Object}	player		Target player as (player number, role)
	*/
	_get_agent_action (contest, agent, request_id, player) {
		
		// Collect legal actions and activate the GUI
		this._buddy_client.get_legal_actions (contest, agent).then (
						
			(actions) => {
				this._gui_player = player.number
				this._action_request_id = request_id
				
				// Decode actions
				actions.forEach (action => this._actions.push (this._decode_action (action)))

				// If player cannot move
				if (this._actions.length == 1 && this._actions [0].length == 0) {
					this._buddy_client.reply_selected_action (this._action_request_id, "()")
					this._actions = []
				}

				// Otherwise, make valid start position selectable
				else {
					var valid_starts = []
					this._actions.forEach (action => {
						var [x, y, dir, step] = action
						if (valid_starts.findIndex (v => v [0]==x && v[1]==y) == -1) valid_starts.push ([x, y])
					})

					this.board.set_start_positions (valid_starts)			
				}
			}
		)
	}

	/** ===========================================================================================
     * Decode a string giving a legal action
	 * 
	 * @param {string} action 		Action of the 'Pinguouins' game
	 * @returns						[x, y, d, s] with, 'x', 'y' the start coordinate of a penguin
	 * 								'd' a number giving a direction of movement
	 * 								's' a number of steps to move 
     */
	_decode_action (action) {

		if (action == "()") return []
		var [x, y, dir, step] = action.substring (1, action.length -1).split (',')
		var dirIndex = Pingouins.DIRECTIONS.findIndex ( code => code == dir )

		return [Number (x), Number (y), dirIndex, Number (step)]
	}

	/** ===========================================================================================
     * Decodate a string giving the state of the game
	 * 
	 * @param {string}	state	State of the 'Pingouins' game
	 * @return 			[fishes, penguins, scores] with 
	 * 					'fishes' an array with the number of fishes at each tile position
	 * 					'penguins' an array of (player, coordinates) for each penguin
	 * 					'scores' a dictionary with the score of each player
     */
	_decode_state (state) {
		
		var tokens = state.split ("\n")
		if (tokens [tokens.length -1] == "End") tokens.pop ()

		// Decode number of fishes
		var fishes = []
		for (let r = 0; r < 8; r ++) {

			var line = tokens [r]
			var row = []
			for (var i = 0; i < line.length; i++) {
				var n = Number (line.charAt (i));
				row.push (n)
			}
			fishes.push (row)
		}

		// Decode penguins positions and score for each player
		var penguins = []
		var scores = {}
		for (let r = 8; r < tokens.length; r ++) {

			if (tokens [r] == "") continue
			var items_1 = tokens [r].split (':')
			var items_2 = items_1 [1].split ('/')
			var player = items_1 [0]
			var coo_str = items_2 [0]
			var score = items_2 [1]

			scores [player] = score

			var coo_items = coo_str.split (';')
			coo_items.forEach(coo => {
				var [x, y] = coo.substring (1, coo.length-1).split (',')
				penguins.push ([player, [x, y]])
			});
		}

		return [fishes, penguins, scores]
	}
}