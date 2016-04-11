/* jshint -W030 */
/* jshint -W033 */

/* GLOBAL VARIABLES */
var GameStates = {};
var map             // Holds the entire game tilemap
var layerGround     // Holds ground layer of the tilemap
var isHost = false 	// Determines whether it sends zombie locations to server
var zombieSpawnSpeed = 700  // Default = 700
var playerMoveSpeed = 150   // Default = 150
var playerShootSpeed = 150  // Default = 150
var socket          	// Socket connection
var land            	// terrain sprite
var bullets         	// group for players bullets
var player = null   	// this player
var friends         	// list of friendly players
var zombies         	// group for enemy zombies
var zombiesKilled = 0
var currentSpeed = 0
var cursors;         	// variable taking input from keyboard
var spaceBar;
var wKey;
var aKey;
var sKey;
var dKey;
var fireRate = 150  //variable that holds milliseconds
var nextFire = 0    //resets for each fire

var debugMode = true // Enables and disables the debug displays

GameStates.Start = function (game) {
};

GameStates.Start.prototype = {
    preload: function () {
        this.load.spritesheet('startButton','assets/startButton.png');
    },
    create: function () {
        game.stage.backgroundColor = '#500000';
        game.physics.startSystem(Phaser.Physics.ARCADE); // Sets the game as arcade physics
        game.add.text(this.world.centerY-100, this.world.centerX-100, "AGGIES VS ZOMBIES")
        game.startButton = this.add.button(this.world.centerY, this.world.centerX, 'startButton', this.gotoStateGame, this, 2, 1, 0);
        game.cursors = this.input.keyboard.createCursorKeys();

        // Lets the game go full screen when clicked
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL
        game.input.onDown.add(gofull, this)
    },
    update: function () {
    },
    render: function () {
    },
    gotoStateGame: function () {
        this.state.start('Game');
    }
};

GameStates.Game = function (game) {

};

GameStates.Game.prototype = {
    preload: function () {
        // Load the map info and map tile images
        game.load.tilemap('map', 'assets/tiles.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('tilesImage', 'assets/tiles.png')

        game.load.image('earth', 'assets/light_grass.png')
        game.load.image('bullet', 'assets/bullet-2.png')

        game.load.spritesheet('pauseButton', 'assets/pauseButtons.png')
        game.load.spritesheet('startButton','assets/startButton.png')

        game.load.spritesheet('dude', 'assets/sprities.png', 100, 100);
        game.load.spritesheet('zombie', 'assets/sprities.png', 100, 100);

        console.log('Game loaded\n');
    },
    create: function () {
        // Connects to server
        socket = io.connect();

        // Sets the game as arcade physics
        game.physics.startSystem(Phaser.Physics.ARCADE);
        //game.world.setBounds(0, 0, 1000, 1000);
        game.physics.setBoundsToWorld()

        //this.game.stage.disableVisibilityChange = true;         // Allows game to update when window is out of focus

        //  The 'map' key here is the Loader key given in game.load.tilemap
        map = game.add.tilemap('map')

        //  The first parameter is the tileset name, as specified in the Tiled map editor (and in the tilemap json file)
        //  The second parameter maps this name to the Phaser.Cache key 'tiles'
        map.addTilesetImage('tiles', 'tilesImage')

        //  Creates a layer from the ground layer in the map data.
        //  A Layer is effectively like a Phaser.Sprite, so is added to the display list.
        layerGround = map.createLayer('ground')
        //layerWalls  = map.createLayer('wall')

        //  This resizes the game world to match the layerGround dimensions
        layerGround.resizeWorld();

        // Creates a group for the zombies
        // Physics groups allow the zombies to collide
        zombies = game.add.physicsGroup()
        zombies.enableBody = true
        zombies.physicsBodyType = Phaser.Physics.arcade

        // Creates a collection for the other players
        friends = []

        // The player is generated at a random map location, given animation, and given physics
        player = game.add.sprite( game.world.randomX, game.world.randomY, 'dude')
        player.anchor.setTo(0.5, 0.5)


        player.animations.add('walk', [2, 3] , 10000, true)
        player.animations.play('walk')

        game.physics.arcade.enable(player,true)

        // Set the size of the player's collision box
        // http://phaser.io/examples/v2/arcade-physics/offset-bounding-box
        player.body.setSize(20, 20, 0, 0);
        player.body.collideWorldBounds=true;    //player do not leave the map

        // Brings the player to visibility, and allows the camera to follow the player
        player.bringToTop()
        game.camera.follow(player)
        game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300)
        game.camera.focusOnXY(0, 0)

        // Creates Phaser keyboard
        cursors = game.input.keyboard.createCursorKeys()
        spaceBar = game.input.keyboard.addKey( Phaser.Keyboard.SPACEBAR )
        wKey = game.input.keyboard.addKey( Phaser.Keyboard.W )
        aKey = game.input.keyboard.addKey( Phaser.Keyboard.A )
        sKey = game.input.keyboard.addKey( Phaser.Keyboard.S )
        dKey = game.input.keyboard.addKey( Phaser.Keyboard.D )

        // Start listening for events
        setEventHandlers()

        //  Our bullet group
        bullets = game.add.group()
        bullets.enableBody = true
        bullets.physicsBodyType = Phaser.Physics.ARCADE
        bullets.createMultiple(5, 'bullet')
        bullets.setAll('player.x', 0.5);
        bullets.setAll('player.y', 1);
        bullets.setAll('outOfBoundsKill', true)
        bullets.setAll('checkWorldBounds', true)

        // Start generation of zombies 5 seconds in
        setTimeout(generateZombies, 5000);
    },
    update: function () {

          //@TODO: Collision code
          //game.physics.arcade.collide(player, layerWalls);

          // Updates locations of friendly players
          for (var i = 0; i < friends.length; i++) {
            if (friends[i].alive) {
              friends[i].update()
              game.physics.arcade.collide(player, friends[i].player)
            }
          }

          // Tells server to send out location zombies should move towards
          socket.emit('move zombie');

          // Allows collision detection between bullets and zombies and calls onZombieShot
          game.physics.arcade.collide(bullets, zombies, callZombieShot, null, this);

          // Prevents zombies from overlapping
          game.physics.arcade.collide(zombies, zombies, null, null, this);

          // Allows collision detection between player and zombies and calls onPlayerKilled
          game.physics.arcade.collide(player, zombies, callPlayerKill, null, this);

          // Calls movement and fire functions for player to act
          movement();    // checks keyboard and renders player movement
          fire();        // checks if user is firing


          // Plays player animation based on their movement
          if (currentSpeed > 0) {
            player.animations.play('move');
          }
          else {
            player.animations.play('stop');
          }

          //tells the server that the player has been moved and should be updated in each client
          socket.emit('move player', { x: player.x, y: player.y });
    },
    render: function () {

        	// Displays list of active bullets to determine current ammo of players
        	if (debugMode){
        		game.debug.text('Active Bullets: ' + bullets.countLiving() + '/' + 5  , 32, 32);
                game.debug.text('Zombies Killed: ' + zombiesKilled, 32, 64);
                game.debug.text('Player coordinates: ' + player.x + ',' + player.y, 32,96);
        		game.debug.body(player);
        		game.debug.body(zombies);

        		if(isHost)
        			game.debug.text('Host Game', 32, 128);
        	}


    },
    gotoStateGame: function () {
    }
};

var game = new Phaser.Game(800, 600, Phaser.AUTO, 'Game');
game.state.add('Start', GameStates.Start);
game.state.add('Game', GameStates.Game);
game.state.add('Score', GameStates.Game);
game.state.start('Start');

/* HELPER METHODS */
function gofull() {
    game.scale.startFullScreen(false)
    //game.input.mouse.requestPointerLock()
}

var setEventHandlers = function () {
  socket.on('connect', onSocketConnected)   // Socket connection successful
  socket.on('is host', onIsHost)    // Sets this player as host or not
  socket.on('disconnect', onSocketDisconnect)   // Socket disconnection
  socket.on('new player', onNewPlayer)  // New player message received
  socket.on('move player', onMovePlayer)  // Player move message received
  socket.on('remove player', onRemovePlayer)  // Player removed message received
  socket.on('new zombie', onNewZombie)   // Zombies move message received
  socket.on('move zombie', onMoveZombie)   // Zombies move message received
  socket.on('zombie shot', onZombieShot)   // Zombies move message received
}

function onIsHost (data) {
	if (data.isHost)
		isHost = true

	else
		isHost = false
}

// Callback for when a zombie touches a player
function onPlayerKill (player, zombie) {
  // Player is remover/made invisible
   player.kill()
}

// Socket connected
function onSocketConnected () {
  console.log('Connected to socket server')
  // Send local player data to the game server
  socket.emit('new player', { x: player.x, y: player.y })
}

// Socket disconnected
function onSocketDisconnect () {
  console.log('Disconnected from socket server')
}

// New player
function onNewPlayer (data) {
  console.log('New player connected:', data.id)

  // Avoid possible duplicate players
  var duplicate = playerById(data.id)
  if (duplicate) {
    console.log('Duplicate player!')
    return
  }
  // Add new player to the remote players array
  friends.push(new RemotePlayer(data.id, game, player, data.x, data.y))
}

// Move player
function onMovePlayer (data) {
  var movePlayer = playerById(data.id)

  // Player not found
  if (!movePlayer) {
    console.log('Player not found: ', data.id)
    return
  }

  // Update player position
  movePlayer.player.x = data.x
  movePlayer.player.y = data.y
}


// New Zombie
function onNewZombie (data) {

  // When a new zombie is spawned, each client adds it to their zombie group
  var zombie = zombies.create(data.x, data.y, 'zombie');

  // Sets the size of the zombie for physics purposes
  zombie.body.setSize(20, 20, 0, 0);

  //zombies.children[ zombies.length-1 ].id = data.x
  zombie.id = data.i
  zombie.animations.add('walk', [4, 5] , 10, true)
  zombie.animations.play('walk')
  zombie.anchor.setTo(0.5, 0.5)
  zombie.bringToTop()
}


// Move Zombie
function onMoveZombie (data) {

  // The server sends the destination to the clients, and the clients then tell their zombies to move there

  zombies.forEach(game.physics.arcade.moveToXY,  game.physics.arcade, null, data.x, data.y);

  // Angles the zombie towards the player
  var i
  for ( i = 0; i < zombies.length; i++ ) {
	zombies.children[i].rotation = game.physics.arcade.angleToXY(zombies.children[i], data.x, data.y);
  }

}

// Callback for when a zombie is hit by a bullet
function callZombieShot (bullet, zombie) {
  bullet.kill()
  zombie.kill()
  zombiesKilled += 1
  socket.emit('zombie shot', { id:zombie.id })
  console.log('shot id: ' + zombie.id)
}

// Callback for when a zombie touches a player
function callPlayerKill (player, zombie) {
  player.kill()
  socket.emit('player killed', { id:player.id })
}

// Callback for when a zombie is hit by a bullet
function onZombieShot (data) {

  // The shot zombie is removed
  var i;
  for ( i = 0; i < zombies.length; i++) {
	if ( zombies.children[i].id === data.id ) {
		zombies.children[i].kill();
	}
  }
}

// Remove player
function onRemovePlayer (data) {
  var removePlayer = playerById(data.id);

  // Player not found
  if (!removePlayer) {
    console.log('Player not found: ', data.id);
    return;
  }

  removePlayer.player.kill()

  // Remove player from array
  friends.splice(friends.indexOf(removePlayer), 1);
}

// Find player by ID
function playerById (id) {
  for (var i = 0; i < friends.length; i++) {
    if (friends[i].player.name === id) {
      return friends[i]
    }
  }

  return false
}

// PLAYER MOVEMENT FUNCTIONS
function movement(){
    if (cursors.left.isDown || aKey.isDown) {
        player.body.velocity.x = -playerMoveSpeed   //moves to the left
    }else if (cursors.right.isDown || dKey.isDown) {
        player.body.velocity.x = +playerMoveSpeed   //moves to the right
    }else{
        player.body.velocity.x = 0      //stays put
    }
    if (cursors.up.isDown || wKey.isDown) {
        player.body.velocity.y = -playerMoveSpeed   //moves up
    }
    else if (cursors.down.isDown || sKey.isDown) {
        player.body.velocity.y = +playerMoveSpeed   //moves down
    }
    else{
        player.body.velocity.y = 0      //stays put
    }
    //player sprite will rotate towards the mouse(pointer)
    player.rotation = game.physics.arcade.angleToPointer(player)

}

function fire(){
    if (game.input.activePointer.leftButton.isDown || spaceBar.isDown )
   // if (spaceBar.isDown)
    {
        if (game.time.now > nextFire && bullets.countDead() > 0 && player.alive )
        {
            //uses game clock to set fire constrains
            nextFire = game.time.now + playerShootSpeed

            // grab the first bullet we can from the pool of (5)
            var bullet = bullets.getFirstExists(false)

            // and fire it towards the mouse(pointer)
            bullet.reset(player.x+3, player.y);            //sets location to gun
            game.physics.arcade.moveToPointer(bullet, 300)  //move bullet to mouse with velocity

            //the bullet sprite will rotate to face the
            bullet.rotation = game.physics.arcade.moveToPointer(bullet, 1000, game.input.activePointer)

        }
    }
}


function generateZombies(  ){
    // This is used to ensure zombie does not spawn too close to player
    var newX = game.world.randomX
    var newY = game.world.randomy

    // calculate difference
    var deltaX = player.x - newX
    var deltaY = player.y - newY

    // Re-generate locations and check again
    while ( !( deltaX > 200 || deltaX < -200) ) {
      newX = game.world.randomX
      deltaX = player.x - newX
    }
    while ( !( deltaY > 200 || deltaY < -200) ) {
      newY = game.world.randomY
      deltaY = player.y - newY
    }

    // generate zombie once a suitable location is determined
    socket.emit('new zombie', { x:newX, y:newY});

    // call itself recursively to continually generate zombies
    setTimeout(generateZombies, zombieSpawnSpeed);
}
