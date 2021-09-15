class Game {
	
	/** ===========================================================================================
	* Create a new abstract game:
	* Start the game loop, 
	* Start the async loop managing the connection with the server
	* Load needed resources
	*
	* @param {string}	game_name	The name of the game to start at the server side
	* @param 			context		HTML5 canvas context
	* @param {string}	uri			Server URI
	* @param {string}	agent_1		'player', 'mcts' or 'random'
	* @param {string}	agent_2		'player', 'mcts' or 'random'
	* @param {number}	seed		Seed for pseudo randomness
	* @param {string}	player_id	Free reference to associate with a game
	*/		
	constructor (game_name, context, uri, agent_1, agent_2, seed=0, player_id=null) {

		window.requestAnimationFrame (this._game_loop);
		this.start = Date.now()

		this._start_game_logic (uri, game_name, agent_1, agent_2, seed, player_id)
		this._buddy_client = null
		
		this.splash = new Image();
		this.splash.src = "../splash.webp";
		
		this.context = context
		
		this.status = "connecting"
		
		this.mouse = new Object ()
		this.mouse.x = 0
		this.mouse.y = 0	

		this.touch = new Object ()
		this.touch.start = null
		this.touch.current = null
		this.touch.end = null
		
		this.cardatm = new Cardatm (context)

		canvas.addEventListener("touchstart", (e) => {this._process_touch_start_event (e)})		
		canvas.addEventListener("touchmove", (e) => {this._process_touch_move_event (e)})		
		canvas.addEventListener("touchend", (e) => {this._process_touch_end_event (e)})		
		canvas.addEventListener("touchcancel", (e) => {this._process_touch_cancel (e)})		

		canvas.addEventListener('mousemove', (e) => {this._process_move_event (e)})		
		canvas.addEventListener('mousedown', (e) => {this._process_move_event (e)})		
		canvas.addEventListener('mouseup', (e) => {this._process_move_event (e)})	

		canvas.addEventListener('click', (e) => {this._process_click (e)})

		this.fullscreen_img = new Image();
		this.fullscreen_img.src = "../fullscreen.svg";
	}	
	
	/** ===========================================================================================
	* Handle touch event
	* @param {TouchEvent}	event	A TouchEvent instance
	*/
	_process_touch_start_event (event) {
		if (event.target == canvas && event.touches.length > 0) {

			let dpi = window.devicePixelRatio;

			var t = event.touches [0]
			this.touch.start = [t.clientX * dpi, t.clientY * dpi]
			this.touch.current = [t.clientX * dpi, t.clientY * dpi]
			event.preventDefault();
		}
	}
	
	/** ===========================================================================================
	* Handle touch event
	* @param {TouchEvent}	event	A TouchEvent instance
	*/
	_process_touch_move_event (event) {
		if (event.target == canvas && event.touches.length > 0) {

			let dpi = window.devicePixelRatio;

			var t = event.touches [0]
			this.touch.current = [t.clientX * dpi, t.clientY * dpi]
			event.preventDefault();
		}
	}

	/** ===========================================================================================
	* Handle touch event
	* @param {TouchEvent}	event	A TouchEvent instance
	*/
	_process_touch_end_event (event) {
		if (event.target == canvas) {
			this.touch.end = this.touch.current
			event.preventDefault();
		}
	}

	/** ===========================================================================================
	* Handle touch event
	* @param {TouchEvent}	event	A TouchEvent instance
	*/
	_process_touch_cancel (event) {
		if (event.target == canvas) {
			
			this.touch.start = null
			this.touch.current = null
			this.touch.end = null
			event.preventDefault();
		}
	}

	/** ===========================================================================================
	* Record mouse position and what buttons are pressed
	* @param {MouseEvent}	event	A MouseEvent instance
	*/		
	_process_move_event (event) {
		
		const rect = canvas.getBoundingClientRect()
		this.mouse.x = event.clientX - rect.left
		this.mouse.y = event.clientY - rect.top
		this.mouse.buttons = event.buttons		
	}

	/** ===========================================================================================
	* Process click event. We check for click on the "go fullscreen" icon
	* @param {MouseEvent}	event	A MouseEvent instance
	*/		
	_process_click (event) {

		var loc = this._get_fullscreen_icon_loc ()
		if (this.mouse.x < loc [0]) return
		if (this.mouse.y < loc [1]) return
		if (this.mouse.x > loc [0] + loc [2]) return
		if (this.mouse.y > loc [1] + loc [3]) return
		switch_fullscreen (canvas)		
	}

	/** ===========================================================================================
	* ASYNC loop managing the connection with the server.
	* The loop ends when we lose the connection or when the end of the game is reached.
	* @param {string}	uri			Server address
	* @param {string}	game_name	The name of the game to start at the server side
	* @param {string}	agent_1		First agent type
	* @param {string}	agent_2		Second agent type
	* @param {Number}	seed		A seed for pseudo randomness, usually 0
	* @param {string}	player_id	Free reference to associate with a game
	*/		
	async _start_game_logic (uri, game_name, agent_1, agent_2, seed=0, player_id=null) {

		this._buddy_client = await new BuddyClient (uri)
				
		while (this._buddy_client.status () == WebSocket.CONNECTING)
			await this.sleep (200)

		if (this._buddy_client.status () == WebSocket.OPEN) {
			this.status = "initiating"
		}
		else {
			this.status = "error_noserver"
			return
		}

		var games = await this._buddy_client.get_registered_games ()
		var agents = await this._buddy_client.get_registered_agents ()
		var agent_1 = await this._create_agent (game_name, agent_1)
		var agent_2 = await this._create_agent (game_name, agent_2)
		var contest = await this._buddy_client.create_contest (game_name, [agent_1, agent_2], seed, player_id)

		if (agent_1 == null || agent_2 == null || contest == null) {
			this.status = "error_noserver"
			return
		}

		this.status = "playing"		
		var again = 1
		while (again > 0) {
			
			if (this.is_busy () == true) {
				await this.sleep (200)
			} 
			else {
				again = await this._buddy_client.schedule_contest (contest)
			}

			if (again == null || this._buddy_client.status () != WebSocket.OPEN) {
				this.status = "error_serverlost"	
				return
			}
		}

		this.status = "end"
	}
	
	/** ===========================================================================================
	* ASYNC Create an agent of a given type
	* @param agent_type		'player' for an external agent, or any other agent name matching those
	*						defined in the BuddyServer configuration file
	*/
	async _create_agent (target_game, agent_type) {
		if (agent_type == 'alpha') return await this._buddy_client.create_agent (target_game, "AlphaZero")
		else if (agent_type == 'mcts') return await this._buddy_client.create_agent (target_game, "Mcts")
		else if (agent_type == 'random') return await this._buddy_client.create_agent (target_game, "Random")
		else if (agent_type == 'player') return await this._buddy_client.create_external_agent ()
		else return null
	}
	

	/** ===========================================================================================
	* The never ending game loop of this application that is constantly being called by the browser
	* @param timestamp	??
	*/		
	_game_loop = (timeStamp) =>
	{
		// Adjust Canvas to use full resolution
		let dpi = window.devicePixelRatio;
		this.context.canvas.width = window.innerWidth * dpi;
		this.context.canvas.height = window.innerHeight * dpi;

		// Elapsed time between frames
		var current = Date.now()
		var elapsed = current - this.start;
		this.start = current;

		// Not playing game -> splash screen
		if (this._buddy_client == null || ["playing", "end"].includes (this.status) == false) {
			
			var message = ""
			if (this.status == "connecting") message = "Connecting to BuddyServer ..."
			else if (this.status == "initiating") message = "Game creation ..."
			else if (this.status == "error_noserver") {
				message = "Could not connect to BuddyServer"
				if (this._buddy_client.close_reason != null && this._buddy_client.close_reason != "")
					message += " (" + this._buddy_client.close_reason + ")"
			}
			else if (this.status == "error_serverlost") {
				message = "Connection with BuddyServer lost"
				if (this._buddy_client.close_reason != null && this._buddy_client.close_reason != "")
					message += " (" + this._buddy_client.close_reason + ")"
			}
			
			if (this.status.startsWith ("error")) this._splash_screen (message, "red")
			else this._splash_screen (message)
		}

		// Playing game or game terminated
		else {				
			if (this.is_busy () == false) this._forward_events ()
			this.update (elapsed)
			this.cardatm.update (elapsed)

			this._draw_demo_background ()
			this.draw ()
			this.cardatm.draw ();
			
			this._draw_full_screen_icon ()
		}

		// Keep requesting new frames
		window.requestAnimationFrame (this._game_loop);
	}			

		
	/** ===========================================================================================
	* ASYNC function to sleep for some time	
	* @param {number} ms	Time to sleep in [ms]
	*/		
	sleep (ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}
	
	/** ===========================================================================================
	* Draw the icon to toggle full screen mode
	*/
	_draw_full_screen_icon () {

		if (is_fullscreen ()) return

		var loc = this._get_fullscreen_icon_loc ()
		var hover = true
		if (this.mouse.x < loc [0]) hover = false
		if (this.mouse.y < loc [1]) hover = false
		if (this.mouse.x > loc [0] + loc [2]) hover = false
		if (this.mouse.y > loc [1] + loc [3]) hover = false
		var alpha = 0.2
		if (hover) alpha = 0.9

		this.context.save();
        this.context.globalAlpha=alpha;
		this.context.drawImage (this.fullscreen_img, 0, 0, 450, 450, loc [0], loc [1], loc [2], loc [3]);
        this.context.restore();
	}
	
	/** ===========================================================================================
	* Return location of the fullscreen icon
	*/
	_get_fullscreen_icon_loc () {
		var w = this.context.canvas.width
		var h = this.context.canvas.height
		var s = Math.min (w / 10, h / 10)
		var iw = s
		var ih = s
		var x = w - iw * 1.1
		var y = h - ih * 1.1

		return [x, y, iw, ih]
	}

	/** ===========================================================================================
	* Display a banner on the screen (like the one when someone wins)
	* @param {string} message	Message on the banner
	* @param 		  style		A color, in any accpeted format
	* @param 		  y			Vertical position on screen (-1=middle)
	*/
	_draw_banner (message, style, y=-1, font_size=-1) {

		var w = this.context.canvas.width
		var h = this.context.canvas.height
		if (y == -1) y = h / 2
		if (font_size == -1) {
			font_size = Math.round (this.context.canvas.height/10)
			var max = 2.0 * w / message.length
			font_size = Math.min (max, font_size)
		}
	
		this.context.fillStyle = style;
		this.context.fillRect (0, y-font_size/2, w, font_size);
		
		canvas.style.font = this.context.font;
		canvas.style.fontSize = `${font_size}px`;
		this.context.font = canvas.style.font;
		this.context.fillStyle = "white";
		this.context.textAlign = "center";
		this.context.textBaseline = "middle"; 
		
		var x = canvas.width/2
		this.context.fillText (message, x, y); 		
	}	

	/** ===========================================================================================
	 * Draw "DEMO" in the background
	 */
	_draw_demo_background () {
		var font_size = Math.round (this.context.canvas.height/30)
		canvas.style.font = this.context.font;
		canvas.style.fontSize = `${font_size}px`;
		this.context.font = canvas.style.font;
		this.context.fillStyle = "grey";
		this.context.textAlign = "center";
		this.context.textBaseline = "middle"; 

		var step_x = font_size * 5
		var row = 0
		for (let y = 0; y < this.context.canvas.height; y += font_size * 2) {
			for (let x = 0; x < this.context.canvas.width + step_x; x += step_x) {
				this.context.fillText ("D E M O", x + (row%2) * step_x *0.5, y);
			}
			row += 1
		}
	}
	
	/** ===========================================================================================
	* Display a splash screen with additional comment string giving clues about what the app is doing
	* @param {string} message	The message to display below the splash screen
	* @param {string} color		A color name	
	*/
	_splash_screen (message, color='deepskyblue') {
		
		var scale_x = canvas.width / this.splash.width
		var scale_y = 0.8 * canvas.height / this.splash.height
		var scale = Math.min (scale_x, scale_y)
		
		var w = this.splash.width * scale
		var h = this.splash.height * scale
		var mx = (canvas.width - w) / 2
		var my = (canvas.height - h) / 2
		
		try {
			this.context.drawImage (this.splash, 0, 0, this.splash.width, this.splash.height, mx, my, w, h);
		}
		catch (e) {
		}
				
		var font_height = Math.round (canvas.height/20)
		var max = 2.0 * w / message.length
		font_height = Math.min (max, font_height)

		canvas.style.font = this.context.font;
		canvas.style.fontSize = `${font_height}px`;
		this.context.font = canvas.style.font;
		this.context.fillStyle = color;
		this.context.textAlign = "center";
		
		var x = canvas.width/2
		var y = canvas.height - font_height * 0.75
		this.context.fillText (message, x, y); 
	}	

	/** ===========================================================================================
	* Extract next event message (signal or request) received from the websocket server and dispatch
	* it internaly depending on its content
	*/
	_forward_events () {

		// Get and process next received event
		var event = this._buddy_client.get_next_event ()		
		if (event != null) {
			var type = event [0]
			var data = event [1]
			var id = event [2]
			
			if (type == "Hello") {

			}

			else if (type == "Goodbye") {

			}

			else if (type == "RoundStart") {
				
				var game_state = atob (data.game_state)
				this._round_start (data.contest, data.round_number, game_state)
			}
			
			else if (type == "TurnStart") {

				var game_state = atob (data.game_state)
				var players = this._parse_players (data.players)

				this._turn_start (data.contest, data.round_number, data.step, game_state, players)
			}

			else if (type == "TurnEnd") {

				// Decode game state from Base64 and decode action string
				var game_state = atob (data.game_state)
				var player_actions = this._parse_player_actions (data.player_actions)

				// Hide CardATM
				this.cardatm.set_progress (0.0)
				
				this._turn_end (data.contest, game_state, player_actions)
			}
			
			else if (type == "RoundEnd") {

				// Decode game state from Base64 and decode rewards string
				var game_state = atob (data.game_state)
				var player_rewards = this._parse_player_rewards (data.rewards)

				this._round_end (data.contest, game_state, player_rewards)
			}
			
			else if (type == "GetAgentAction") {

				// Decode player string
				var players = this._parse_players (data.player)

				this._get_agent_action (data.contest, data.agent, id, players [0])
			}

			else if (type == "ThinkProgress") {

				this.cardatm.set_progress (data.progress)
				//console.log (data)
				//Object { contest: 21, player: "0:Blue", progress: 0.788 }
			}
		}
	}

	/** ===========================================================================================
	 * Parse a "players" string
	 * @param {string} players	A string in the form "p1:role1;p2..."
	 * @return					A list [{number, role}]
	 */
	_parse_players (players) {
		var players_str = players.split (';')
		var players = []

		players_str.forEach (string => {
					
			var tokens = string.split (':')
			var player = Number (tokens [0])
			var role = tokens [1]

			players.push ({number: player, role: role})
		})

		return players
	}
	
	/** ===========================================================================================
	 * Parse a "player actions" string
	 * @param {string} player_actions	A string in the form "p1:role1:action1;p2..."
	 * @return							A list [{number, role, action}]
	 */
	_parse_player_actions (player_actions) {
		var players_str = player_actions.split (';')
		var player_actions = []

		players_str.forEach (string => {
					
			var tokens = string.split (':')
			var player = Number (tokens [0])
			tokens = tokens [1].split ('/')
			var role = tokens [0]
			var action = tokens [1]

			player_actions.push ({number: player, role: role, action: action})
		})

		return player_actions
	}

	/** ===========================================================================================
	 * Parse a "player rewards" string
	 * @param {string} player_rewards	A string in the form "p1:role1:rewards1;p2..."
	 * @return							A list [{number, role, reward}]
	 */
	_parse_player_rewards (player_rewards) {
		var players_str = player_rewards.split (';')
		var player_rewards = []

		players_str.forEach (string => {
					
			var tokens = string.split (':')
			var player = Number (tokens [0])
			tokens = tokens [1].split ('>')
			var role = tokens [0]
			var reward = Number (tokens [1])

			player_rewards.push ({number: player, role: role, reward: reward})
		})

		return player_rewards
	}
}