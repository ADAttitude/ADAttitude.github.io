var SERVER_URI = "wss://boardgamesbuddy.eu:443"
//var SERVER_URI = "ws://localhost:9980"

var GAME_AGENTS = {
    "connect4": ['player', 'alpha', 'mcts', 'random'],
    "braverats": ['player', 'mcts', 'random'],
    "quantik": ['player', 'mcts', 'random'],
    "pingouins": ['player', 'alpha', 'mcts', 'random']
}