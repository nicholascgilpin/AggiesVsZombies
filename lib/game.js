var util = require('util')
var http = require('http')
var path = require('path')
var ecstatic = require('ecstatic')
var io = require('socket.io')

var Player = require('./Player')

var port = process.env.PORT || 8080

/* ************************************************
** GAME VARIABLES
************************************************ */
var socket	// Socket controller
var players	// Array of connected players
var zombies // array of zombies

var hasHost = false //Whether the game has a host player now or not

/* ************************************************
** GAME INITIALISATION
************************************************ */

// Create and start the http server
var server = http.createServer(
  ecstatic({ root: path.resolve(__dirname, '../public') })
).listen(port, function (err) {
  if (err) {
    throw err
  }

  init()
})

function init () {
  // Create an empty array to store players
  players = []
  zombies = []
  
  // Attach Socket.IO to server
  socket = io.listen(server)

  // Start listening for events
  setEventHandlers()
}

/* ************************************************
** GAME EVENT HANDLERS
************************************************ */
var setEventHandlers = function () {
  // Socket.IO
  socket.sockets.on('connection', onSocketConnection)
}

// New socket connection
function onSocketConnection (client) {
  util.log('New player has connected: ' + client.id)

  // Listen for client disconnected
  client.on('disconnect', onClientDisconnect)

  // Listen for new player message
  client.on('new player', onNewPlayer)
  
  //Listen for new zombie message
  client.on('new zombie', onNewZombie)

  // Listen for move player message
  client.on('move player', onMovePlayer)
  
  // Listen for move zombie message
  client.on('move zombie', onMoveZombies)
  
  // Listen for move zombie message
  client.on('zombie shot', onZombieShot)
  
  // Listen for move zombie message
  client.on('player killed', onPlayerKill)
}

// Socket client has disconnected
function onClientDisconnect () {
  util.log('Player has disconnected: ' + this.id)

  var removePlayer = playerById(this.id)

  // Player not found
  if (!removePlayer) {
    util.log('Player not found: ' + this.id)
    return
  }

  // Remove player from players array
  players.splice(players.indexOf(removePlayer), 1)

 
  //If there are no clients, empty the zombie list 
  if( players.length === 0) {
	  hasHost = false
	  zombies = []
  }
	  
  // Broadcast removed player to connected socket clients
  this.broadcast.emit('remove player', {id: this.id})
}

// New player has joined
function onNewPlayer (data) {
  // Create a new player
  var newPlayer = new Player(data.x, data.y)
  newPlayer.id = this.id

  // Broadcast new player to connected socket clients
  this.broadcast.emit('new player', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY()})

  // Send existing players to the new player
  var i, existingPlayer
  for (i = 0; i < players.length; i++) {
    existingPlayer = players[i]
	util.log( 'send existing player: ' + existingPlayer.id)
    this.emit('new player', {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY()})
  }

  // If this is the only player, make them host
  if (!hasHost) {
	this.emit('is host', {isHost: true})
	hasHost = true
  }
  
  // Add new player to the players array
  players.push(newPlayer)
}

function onNewZombie (data) {
	var newZombie = new Player( data.x, data.y)
	zombies.push( newZombie )

	this.emit('new zombie', { i: zombies.length-1, x: data.x, y: data.y})
	this.broadcast.emit('new zombie', { i: zombies.length-1, x: data.x, y: data.y})
}

// Callback for when a zombie is hit by a bullet
function onZombieShot (data) {
	util.log( 'zombie shot: ' + data.id )
	
	//zobies.splice()
	this.emit('zombie shot', {id: data.id})
	this.broadcast.emit('zombie shot', {id: data.id})
}

// Callback for when a zombie touches a player
function onPlayerKill (player, zombie) {
	
	var removePlayer = playerById(this.id)

	// Player not found
	if (!removePlayer) {
		util.log('Player not found: ' + this.id)
		return
	}

	// Remove player from players array
	players.splice(players.indexOf(removePlayer), 1)

	this.broadcast.emit('remove player', {id: this.id})
}

// Player has moved
function onMovePlayer (data) {
  // Find player in array
  var movePlayer = playerById(this.id)

  // Player not found
  if (!movePlayer) {
    util.log('Player not found: ' + this.id)
    return
  }
  
  // Update player position
  movePlayer.x = data.x
  movePlayer.y = data.y

  // Broadcast updated position to connected socket clients
  this.broadcast.emit('move player', {id: movePlayer.id, x: movePlayer.x, y: movePlayer.y})
}

// Zombie has moved
function onMoveZombies () {

  var i = 0
  
  var x1 = 0
  var y1 = 0
  var x2 = 0
  var y2 = 0
  /*while ( !players[i].alive ) {
	  if ( ! players[i+1] == null )
		i++ 
  }*/  
  
  util.log(players.length)
  util.log(players.toString())
  if ( players.length === 1 && (!players[0] == null)) {
	x1 = players[0].x
	y1 = players[0].y
	x2 = players[0].x
	y2 = players[0].y
  }
  // if ( players.length === 1 && (!players[1] == null)) {
	// x1 = players[1].x
	// y1 = players[1].y
	// x2 = players[1].x
	// y2 = players[1].y
  // }  
  if (players.length === 2 ) {
	x1 = players[0].x
	y1 = players[0].y
	x2 = players[1].x
	y2 = players[1].y
  }
  
  else {
	x1 = 0
	y1 = 0
	x2 = 0
	y2 = 0
  }
  
  this.emit('move zombie', { x1: x1 , y1: y1, x2: x2, y2: y2})
  // if (! players[i] == null )
	// this.emit( 'move zombie', { x: x , y: y })
  // else 
	 // //util.log('player moved to x: ' + players[i].x + '   y: ' + players[i].y)
  	// this.emit( 'move zombie', { x: players[i].x , y: players[i].y })
}

/* ************************************************
** GAME HELPER FUNCTIONS
************************************************ */
// Find player by ID
function playerById (id) {
  var i
  for (i = 0; i < players.length; i++) {
    if (players[i].id === id) {
      return players[i]
    }
  }

  return false
}
