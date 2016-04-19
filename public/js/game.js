/* ************************************************ */
/* 				GLOBAL VARIABLES 					*/
/* ************************************************ */

/*		GAME OBJECT VARIABLES	*/
var land;            		// terrain sprite
var bullets;         		// group for players bullets
var player = null;   		// this player
var friends;         		// group for friendly players
var zombies;         		// group for enemy zombies
var blood;					// group for blood splatter sprites
var cars;					// group for car terrain
var ammoPacks;				// group for ammo packs


/*    	DIFFICULTY VARIABLES	*/
var zombieSpawnSpeed = 700; 	// Default = 700
var playerMoveSpeed = 150;   	// Default = 150
var playerShootSpeed = 150;  	// Default = 150
var difficulty = 2;				// Easy:1 	Medium:2 	Hard:3
var maxAmmo = 30;				// Maximum ammo packs at one time
var currentAmmo = maxAmmo;		// Ammo of player
var fireRate = 150;  			//variable that holds milliseconds
var nextFire = 0;    			//resets for each fire


/* 		SCORE VARIABLES			*/
var zombiesKilled = 0;
var currentSpeed = 0;


/*		TIMING VARIABLES		*/
var startTime;
var currentTime = 0;
var endTime = 120000;


/*		INPUT VARIABLES			*/
var cursors;         		// variable taking input from keyboard
var spaceBar;
var wKey;
var aKey;
var sKey;
var dKey;

/*		GENERAL VARIABLES		*/
var socket;       			// Socket connection
var GameStates = {};
var map;             		// Holds the entire game tilemap
var layerGround;    	 	// Holds ground layer of the tilemap
var debugMode = false; 		// Enables and disables the debug displays
var gamePlaying = false;	// True when in Game state
var backgroundAudio;
var isHost = false; 		// Determines whether it sends zombie locations to server


/* ************************************************ */
/* 				GAME STATES 						*/
/* ************************************************ */

/*		START STATE				*/
// First screen when you see the game
// Goes to settings, instructions, or game state
GameStates.Start = function (game) {};
GameStates.Start.prototype = {
    preload: function () {

		// Load sprite sheets
        this.load.spritesheet('startButton','assets/button32.png');
        this.load.spritesheet('info','assets/Info-96.png');
        this.load.spritesheet('settings','assets/Settings-96.png');
        this.load.spritesheet('dou', 'assets/pair.png');
        this.load.spritesheet('title', 'assets/aggie_zombie_title.png');

		// Load audio
        game.load.audio('zombieAudio', 'assets/audio/zombies/zombie-24.wav');
        game.load.audio('bangAudio', 'assets/audio/bang.wav');
        game.load.audio('reload', 'assets/audio/reload.wav');
        game.load.audio('backgroundAudio', 'assets/audio/crypto.mp3');
    },
    create: function () {

        game.stage.backgroundColor = '#500000';

		// Sets the game as arcade physics
        game.physics.startSystem(Phaser.Physics.ARCADE);

		// Add game title and display
        game.add.sprite(65, 85, 'title');
        game.add.sprite(175, 200, 'dou');

		// Add buttons to other states
        game.startButton = this.add.button(330, 350, 'startButton', this.gotoStateGame, this, 2, 1, 0);
        game.startButton = this.add.button(25, 485, 'settings', this.gotoStateSettings, this, 2, 1, 0);
        game.startButton = this.add.button(675, 485, 'info', this.gotoStateInstructions, this, 2, 1, 0);
        game.cursors = this.input.keyboard.createCursorKeys();

        // Lets the game go full screen when clicked
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.input.onDown.add(gofull, this);
    },
    update: function () {
    },
    render: function () {
    },
    gotoStateGame: function () {
        this.state.start('Game');
    },
    gotoStateInstructions: function () {
        this.state.start('Instructions');
    },
    gotoStateSettings: function () {
        this.state.start('Settings');
    }
};


/*		INSTRUCTION STATE				*/
// Displays game instructions
// Can go backwards to start state
GameStates.Instructions = function (game) {};
GameStates.Instructions.prototype = {
    preload: function () {

		// Load button back to start state
        game.load.spritesheet('startButton','assets/CircledLeft2-96.png');
        game.load.spritesheet('ammo', 'assets/ammo3.png', 25, 19);
    },
    create: function () {
        game.stage.backgroundColor = '#500000';

		// Sets the game as arcade physics
        game.physics.startSystem(Phaser.Physics.ARCADE);

		// game title
        game.add.text(85, 35, "AGGIES VS ZOMBIES",{font: '60px Courier', fill: '#ffffff'});

        // game story
        game.add.text(145, 150, "A virus has been brought to Texas A&M campus\ninfecting the entire population of College Station,\nturning them into zombies. You are the only\nperson that can protect the remaining survivors.\nYour mission is to serve as our line of defense,\nyour mission is to be our twelfth man and save us.",{font: '15px Courier', fill: '#ffffff'});

		// rules
        game.add.text(145, 300, "Rules:\n1. Use your arrow keys or WASD to move around the game.\n2. Do not let the zombies touch you or you will die\n3. To kill the zombies use your mouse to aim your gun and\n\tleft click to shoot. \n4. Ammo is not unlimited! Keep an eye on your ammo levels \n\tand pick up more when you can.\n5. You can invite one friend to help you play by accessing \n\tthis webpage on their computer. \n6. Try and survive 2 minutes to win the game!",{font: '15px Courier', fill: '#ffffff'});

		game.add.sprite(425, 425, 'ammo');

        game.startButton = this.add.button(0, 500, 'startButton', this.gotoStateStart, this, 2, 1, 0);
        game.cursors = this.input.keyboard.createCursorKeys();

        // Lets the game go full screen when clicked
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.input.onDown.add(gofull, this);
    },
    update: function () {
    },
    render: function () {
    },
    gotoStateStart: function () {
        this.state.start('Start');
    }
};


/*		GAME STATE				*/
// Where actual play occurs
// Can result in gameOver or gameWon state
GameStates.Game = function (game) {};
GameStates.Game.prototype = {
    preload: function () {

        // Load the map info and map tile images
        game.load.tilemap('map', 'assets/tilemap2.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('tilesImage', 'assets/tiles.png');
        game.load.image('earth', 'assets/light_grass.png');

		// Load actor/object sprites
        game.load.image('bullet', 'assets/bullet-3.png');
        game.load.spritesheet('dude', 'assets/sprities.png', 100, 100);
        game.load.spritesheet('zombie', 'assets/sprities.png', 100, 100);
        game.load.spritesheet('blood', 'assets/bloodSplatter.png', 50, 40);
        game.load.spritesheet('cars', 'assets/carsLarge.png', 54, 100);
        game.load.spritesheet('ammo', 'assets/ammo3.png', 25, 19);

		// Load audio
        game.load.audio('zombieAudio', 'assets/audio/zombies/zombie-24.wav');
        game.load.audio('bangAudio', 'assets/audio/bang.wav');

        console.log('Game loaded\n');
    },
    create: function () {

        // Connects to server
        socket = io.connect();
		gamePlaying = true;

        //  The 'map' key here is the Loader key given in game.load.tilemap
        map = game.add.tilemap('map');

        //  The first parameter is the tileset name, as specified in the Tiled map editor (and in the tilemap json file)
        //  The second parameter maps this name to the Phaser.Cache key 'tiles'
        map.addTilesetImage('tiles', 'tilesImage');

        //  Creates a layer from the ground layer in the map data.
        //  A Layer is effectively like a Phaser.Sprite, so is added to the display list.
        layerGround = map.createLayer('ground');
        layerWalls  = map.createLayer('detail');

        //  This resizes world to the map size and starts physics
        layerGround.resizeWorld();
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.physics.setBoundsToWorld();

		// Allows game to update when window is out of focus
		game.stage.disableVisibilityChange = true;

		// Our blood splatter group
		blood = game.add.group();

		// Add ammo pack group to the game and give it physics
		ammoPacks = game.add.physicsGroup();
		ammoPacks.enableBody = true;
		ammoPacks.physicsBodyType = Phaser.Physics.arcade;

		// Add zombies group to the game and give it physics
        zombies = game.add.physicsGroup();
        zombies.enableBody = true;
        zombies.physicsBodyType = Phaser.Physics.arcade;

		// Add car group to the game and give it physics
		cars = game.add.physicsGroup();
		cars.enableBody = true;
		cars.physicsBodyType = Phaser.Physics.arcade;
		createCars();

        // Initialize group of allies
        friends = [];

        // The player is generated at a random map location, given animation, and given physics
        player = game.add.sprite( game.world.randomX, game.world.randomY, 'dude');
        player.anchor.setTo(0.5, 0.5);
        player.animations.add('walk', [2, 3] , 10000, true);
        player.animations.play('walk');
        game.physics.arcade.enable(player,true);

        // Set the size of the player's collision box
        // http://phaser.io/examples/v2/arcade-physics/offset-bounding-box
        player.body.setSize(20, 20, 0, 0);
        player.body.collideWorldBounds=true;    //player do not leave the map

        // Brings the player to visibility, and allows the camera to follow the player
        player.bringToTop();
        game.camera.follow(player);
        game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
        game.camera.focusOnXY(0, 0);

        // Creates Phaser keyboard
        cursors = game.input.keyboard.createCursorKeys();
        spaceBar = game.input.keyboard.addKey( Phaser.Keyboard.SPACEBAR );
        wKey = game.input.keyboard.addKey( Phaser.Keyboard.W );
        aKey = game.input.keyboard.addKey( Phaser.Keyboard.A );
        sKey = game.input.keyboard.addKey( Phaser.Keyboard.S );
        dKey = game.input.keyboard.addKey( Phaser.Keyboard.D );

        // Start listening for events
        setEventHandlers();

        //  Initialize bullet group
        bullets = game.add.group();
        bullets.enableBody = true;
        bullets.physicsBodyType = Phaser.Physics.ARCADE;
        bullets.createMultiple(6, 'bullet');
        bullets.setAll('player.x', 0.5);
        bullets.setAll('player.y', 1);
        bullets.setAll('outOfBoundsKill', true);
        bullets.setAll('checkWorldBounds', true);
		currentAmmo = maxAmmo;

        // Start generation of zombies and ammo 5 seconds in
        setTimeout(generateZombies, 5000);
		setTimeout(generateAmmo, 5000);

		// Initialize game time
		startTime = game.time.time;

		// Begin audio
        backgroundAudio = game.add.audio('backgroundAudio');
        reload =  game.add.audio('reload');
        backgroundAudio.loopFull();
    },
    update: function () {

        // Updates locations of friendly players
        for (var i = 0; i < friends.length; i++) {
			if (friends[i].alive) {
				friends[i].update();
				game.physics.arcade.collide(player, friends[i].player);
            }
        }

		// Tells server to send out location zombies should move towards
		socket.emit( 'move zombie');

		// Allows collision detection between bullets and zombies and calls onZombieShot
		game.physics.arcade.collide(bullets, zombies, callZombieShot, null, this);

		// Prevents zombies from overlapping
		game.physics.arcade.collide(zombies, zombies, null, null, this);

		// Allows collision detection between player and zombies and calls onPlayerKilled
		game.physics.arcade.collide(player, zombies, callPlayerKill, null, this);

		// Allows collision between cars and everything else (players, zombies, bullets)
		game.physics.arcade.collide(player, cars, null, null, this);
		game.physics.arcade.collide(zombies, cars, null, null, this);
		game.physics.arcade.collide(bullets, cars, function(bullet, car) { bullet.kill(); }, null, this);

		// Allows collisions between the player and ammo packs
		game.physics.arcade.collide(player, ammoPacks, function(player, ammo) {
            ammo.kill();
            currentAmmo = maxAmmo;
            reload.play();
        }, null, this);

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

		//update game timer
		currentTime = game.time.time - startTime;

		// Check if game has been won
		if ( currentTime >= endTime )
			callPlayerWon(player);

    },
    render: function () {

		// Displays all info if in debug mode
		if (debugMode){
			game.debug.text('Active Bullets: ' + bullets.countLiving() + '/' + 5  , 500, 60);
			game.debug.text('Player coordinates X: ' + player.x , 450, 90);
			game.debug.text('Player coordinates Y:   ' + player.y, 450, 100);
			game.debug.body(player);
			game.debug.body(zombies);
		}

		// Displays score, timer, and ammo
		game.debug.text('Zombies Killed: ' + zombiesKilled, 32, 30);
		game.debug.text( 'Game Time: ' + currentTime/1000 + 's' , 32, 60 );
		game.debug.text( 'Current Ammo: ' + currentAmmo + '/' + maxAmmo, 32, 100 );

		// Displays difficulty
		if ( difficulty == 1 ){
			game.debug.text( 'Level: Easy', 600, 30 );
		}
		else if ( difficulty == 2 ){
			game.debug.text( 'Level: Medium', 600, 30 );
		}
		else if ( difficulty == 3 ){
			game.debug.text( 'Level: Hard', 600, 30 );
		}
		else{
			game.debug.text( 'Level: FIX ME!', 600, 30 );
		}
    },
    gotoStateGame: function () {
    }
};


/*		GAME OVER STATE				*/
// If the player gets touched by a zombie
// Can go back to start state
GameStates.GameOver = function (game) {};
GameStates.GameOver.prototype = {
    preload: function () {
        this.load.spritesheet('startButton','assets/CircledLeft2-96.png');
        this.load.spritesheet('zombiehuman', 'assets/newzombiemem1.png');
    },
    create: function () {

		// Display score
        game.stage.backgroundColor = '#500000';

        game.add.sprite(350,200,'zombiehuman');
        game.add.text(100, 100, "You Lost",{font: '60px Courier', fill: '#ffffff'});
		console.log( "You Lost");
        game.add.text(100, 200, "Total time: "+ currentTime/1000 + 's', {fill:'#ffffff'});
        console.log( "Total time: "+ currentTime/1000 + 's');
        game.add.text(100, 250, "Total kills: "+ zombiesKilled, {fill:'#ffffff'});
        console.log("Total kills: "+ zombiesKilled);

        game.add.button(25, 500, 'startButton', this.fromGameOvertoStart, this, 2, 1, 0);

        // Remove Zombies
        zombies.removeAll();
		// Display difficulty
		if( difficulty == 1 ) {
			 game.add.text(100, 300, "Difficulty: Easy", {fill:'#ffffff'});
		}
		else if( difficulty == 2 ) {
			 game.add.text(100, 300, "Difficulty: Medium", {fill:'#ffffff'});
		}
		else if( difficulty == 3 ) {
			 game.add.text(100, 300, "Difficulty: Hard", {fill:'#ffffff'});
		}

        // Reset zombies
        zombies = [];

    },
    update: function () {
    },
    render: function () {
    },
    fromGameOvertoStart: function () {
        console.log("From Game Over to Start");
        game.state.start('Start');
    }
};


/*		GAME WON STATE				*/
// If the player lives the game duration
// Can go back to start state
GameStates.GameWon = function (game) {};
GameStates.GameWon.prototype = {
    preload: function () {
        this.load.spritesheet('startButton','assets/CircledLeft2-96.png');
    },
    create: function () {

		// Display score
        game.stage.backgroundColor = '#500000';
        game.add.text(100, 100, "You Won!",{font: '60px Courier', fill: '#ffffff'});
		console.log( "You Won!");
        game.add.text(100, 200, "Total time: "+ currentTime/1000 + 's', {fill:'#ffffff'});
        console.log( "Total time: "+ currentTime/1000 + 's');
        game.add.text(100, 250, "Total kills: "+ zombiesKilled, {fill:'#ffffff'});
        console.log("Total kills: "+ zombiesKilled);
        game.add.button(25, 500, 'startButton', this.fromGameWontoStart, this, 2, 1, 0);

		// Display difficulty
		if( difficulty == 1 ) {
			 game.add.text(100, 300, "Difficulty: Easy", {fill:'#ffffff'});
		}
		else if( difficulty == 2 ) {
			 game.add.text(100, 300, "Difficulty: Medium", {fill:'#ffffff'});
		}
		else if( difficulty == 3 ) {
			 game.add.text(100, 300, "Difficulty: Hard", {fill:'#ffffff'});
		}

        // Reset zombies
        zombies = [];
    },
    update: function () {
    },
    render: function () {
    },
    fromGameWontoStart: function () {
        console.log("From Game Won to Start");
        game.state.start('Start');
    }
};


/*		SETTINGS STATE			*/
// Allows the player to choose a difficulty
// Can go back to start state
GameStates.Settings = function (game) {};
GameStates.Settings.prototype = {
    preload: function () {
        game.load.spritesheet('startButton','assets/CircledLeft2-96.png');
        game.load.spritesheet('one','assets/1C-96.png');
        game.load.spritesheet('two','assets/2C-96.png');
        game.load.spritesheet('three','assets/3C-96.png');
        console.log('Settings loaded\n');
    },
    create: function () {

		// Display buttons and text
        game.stage.backgroundColor = '#500000';
        game.add.button(0, 500, 'startButton', this.gotoStart, this, 2, 1, 0);
        game.add.text(85, 35, "AGGIES VS ZOMBIES",{font: '60px Courier', fill: '#ffffff'});
        game.add.text(300, 250, "Difficulty",{font: '30px Courier', fill: '#ffffff'});
        game.add.button(400-48-96, 250+48, 'one', this.easyLevel, this, 2, 1, 0);
        game.add.button(400-48, 250+48, 'two', this.mediumLevel, this, 2, 1, 0);
        game.add.button(400-48+96, 250+48, 'three', this.hardLevel, this, 2, 1, 0);

    },
    update: function () {
    },
    render: function () {
    },
    gotoStart: function () {
        this.state.start('Start');
    },

	// Sets game to EASY
    easyLevel: function () {
		difficulty = 1;
        zombieSpawnSpeed = 1000;  	// Default = 700
        playerMoveSpeed = 175;   	// Default = 150
        playerShootSpeed = 50;  	// Default = 150
		maxAmmo = 500; 				// Default = 30
        console.log('Level Easy');
        game.state.start('Start');
    },

	// Sets game to MEDIUM
    mediumLevel: function () {
		difficulty = 2;
        zombieSpawnSpeed = 700;  	// Default = 700
        playerMoveSpeed = 150;   	// Default = 150
        playerShootSpeed = 150;  	// Default = 150
		maxAmmo = 30; 				// Default = 30
        console.log('Level Medium');
        game.state.start('Start');
    },

	// Sets game to HARD
    hardLevel: function () {
		difficulty = 3;
        zombieSpawnSpeed = 350;	  	// Default = 700
        playerMoveSpeed = 125;   	// Default = 150
        playerShootSpeed = 150;  	// Default = 150
		maxAmmo = 30;				// Default = 30
        console.log('Level Hard');
        game.state.start('Start');
    }
};

// Adds game states to the phaser game
var game = new Phaser.Game(800, 600, Phaser.AUTO, 'GamePhaser');
game.state.add('Start', GameStates.Start);
game.state.add('Game', GameStates.Game);
game.state.add('Instructions', GameStates.Instructions);
game.state.add('GameOver', GameStates.GameOver);
game.state.add('GameWon', GameStates.GameWon);
game.state.add('Settings', GameStates.Settings);
game.state.start('Start');  //initial state at 'Start'



/* ************************************************ */
/* 			HELPER METHODS + CALLBACK FUNCTIONS		*/
/* ************************************************ */
function gofull() {
    game.scale.startFullScreen(false);
}

var setEventHandlers = function () {
  socket.on('connect', onSocketConnected);   // Socket connection successful
  socket.on('is host', onIsHost);    // Sets this player as host or not
  socket.on('disconnect', onSocketDisconnect);   // Socket disconnection
  socket.on('new player', onNewPlayer);  // New player message received
  socket.on('move player', onMovePlayer);  // Player move message received
  socket.on('remove player', onRemovePlayer);  // Player removed message received
  socket.on('new zombie', onNewZombie);   // Zombies move message received
  socket.on('move zombie', onMoveZombie);   // Zombies move message received
  socket.on('zombie shot', onZombieShot);   // Zombies move message received
};

function onIsHost (data) {
	if (data.isHost)
		isHost = true;
	else
		isHost = false;
}

// Callback for when a zombie touches a player
function onPlayerKill (player, zombie) {
   player.kill();   // Player is remover/made invisible
}

// Socket connected
function onSocketConnected () {
  console.log('Connected to socket server');
  // Send local player data to the game server
  socket.emit('new player', { x: player.x, y: player.y });
}

// Socket disconnected
function onSocketDisconnect () {
  console.log('Disconnected from socket server');
}

// New player
function onNewPlayer (data) {
  console.log('New player connected:', data.id);

  // Avoid possible duplicate players
  var duplicate = playerById(data.id);
  if (duplicate) {
    console.log('Duplicate player!');
    return;
  }
  // Add new player to the remote players array
  friends.push(new RemotePlayer(data.id, game, player, data.x, data.y));
}

// Move player
function onMovePlayer (data) {
  var movePlayer = playerById(data.id);

  // Player not found
  if (!movePlayer) {
    console.log('Player moved not found: ', data.id);
    return;
  }

  // Update player position
  movePlayer.player.x = data.x;
  movePlayer.player.y = data.y;
}


// New Zombie
function onNewZombie (data) {

	  // When a new zombie is spawned, each client adds it to their zombie group
	  var zombie = zombies.create(data.x, data.y, 'zombie');

	  // Sets the size of the zombie for physics purposes
	  zombie.body.setSize(20, 20, 0, 0);

	  //zombies.children[ zombies.length-1 ].id = data.x
	  zombie.id = data.i;
	  zombie.animations.add('walk', [4, 5] , 10, true);
	  zombie.animations.play('walk');
	  zombie.anchor.setTo(0.5, 0.5);
	  zombie.bringToTop();
}


// Move Zombie
function onMoveZombie (data) {

  for ( i = 0; i < zombies.length; i++) {
	//zombies.children[i].id === data.id ) {
	if ( (i%2) === 0 ) {
		game.physics.arcade.moveToXY( zombies.children[i], data.x1, data.y1, 80);
		zombies.children[i].rotation = game.physics.arcade.angleToXY(zombies.children[i], data.x1, data.y1);
	}
	else {
		game.physics.arcade.moveToXY( zombies.children[i], data.x2, data.y2, 80);
		zombies.children[i].rotation = game.physics.arcade.angleToXY(zombies.children[i], data.x2, data.y2);
	}
  }
}


// Callback for when a zombie is hit by a bullet
function callZombieShot (bullet, zombie) {
  bullet.kill();
  zombie.kill();
  zombiesKilled += 1;

  //play sounds for zombie kill
  game.sound.play('zombieAudio');
  socket.emit('zombie shot', { id:zombie.id });
  console.log('shot id: ' + zombie.id);
}


// Callback for when a zombie touches a player
function callPlayerKill (player, zombie) {
  player.kill();
  socket.emit('player killed', { id:player.id });

  gamePlaying = false;
  socket.disconnect();
  backgroundAudio.pause();
  game.state.start('GameOver');
}


// Callback for when a player wins
function callPlayerWon (player) {
  player.kill();
  socket.emit('player killed', { id:player.id });

  gamePlaying = false;
  socket.disconnect();
  backgroundAudio.pause();
  game.state.start('GameWon');
}


// Callback for when a zombie is hit by a bullet
function onZombieShot (data) {

  // The shot zombie is removed
  var i;
  for ( i = 0; i < zombies.length; i++) {
	if ( zombies.children[i].id === data.id ) {

        // Creates new blood splatter
		var splat = blood.create(zombies.children[i].x-35, zombies.children[i].y-30, 'blood');
		var picture = ( i % 5 );
		splat.anchor.setTo( 0.5, 0.5 );
		splat.rotation = game.world.randomX %360;
		splat.animations.add('splat', [picture]);
		splat.animations.play('splat');

		// Removes zombie
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

  // Kill player in each game
  removePlayer.player.kill();

  // Remove player from array
  friends.splice(friends.indexOf(removePlayer), 1);
}


// Find player by ID
function playerById (id) {
  for (var i = 0; i < friends.length; i++) {
    if (friends[i].player.name === id) {
      return friends[i];
    }
  }

  return false;
}


// PLAYER MOVEMENT FUNCTIONS
function movement(){
    if (cursors.left.isDown || aKey.isDown) {
        player.body.velocity.x = -playerMoveSpeed;  	//moves to the left
    }else if (cursors.right.isDown || dKey.isDown) {
        player.body.velocity.x = +playerMoveSpeed;   	//moves to the right
    }else{
        player.body.velocity.x = 0;      				//stays put
    }
    if (cursors.up.isDown || wKey.isDown) {
        player.body.velocity.y = -playerMoveSpeed;   	//moves up
    }
    else if (cursors.down.isDown || sKey.isDown) {
        player.body.velocity.y = +playerMoveSpeed;   	//moves down
    }
    else{
        player.body.velocity.y = 0;      				//stays put
    }

    //player sprite will rotate towards the mouse(pointer)
    player.rotation = game.physics.arcade.angleToPointer(player);

	//tells the server that the player has been moved and should be updated in each client
	socket.emit('move player', { x: player.x, y: player.y });
}


function fire(){

	// Only shoots if left click or space bar are down
    if ( game.input.activePointer.leftButton.isDown || spaceBar.isDown )
    {
		// Times shots and check ammo
        if (game.time.now > nextFire && bullets.countDead() > 0 && player.alive && currentAmmo > 0 )
        {
			currentAmmo--;

            //uses game clock to set fire constrains
            nextFire = game.time.now + playerShootSpeed;

            // grab the first bullet we can from the pool of (5)
            var bullet = bullets.getFirstExists(false);
            game.sound.play('bangAudio');

			//sets location of bullet
            bullet.reset(player.x+3, player.y);

			//move bullet to mouse with velocity
            game.physics.arcade.moveToPointer(bullet, 3000);

            //the bullet sprite will rotate to face the
            bullet.rotation = game.physics.arcade.moveToPointer(bullet, 1000, game.input.activePointer);
        }
    }
}


function generateZombies(  ){

    // This is used to ensure zombie does not spawn too close to player
    var newX = game.world.randomX;
    var newY = game.world.randomy;

    // calculate difference
    var deltaX = player.x - newX;
    var deltaY = player.y - newY;

    // Re-generate locations and check again
    while ( !( deltaX > 200 || deltaX < -200) ) {
      newX = game.world.randomX;
      deltaX = player.x - newX;
    }
    while ( !( deltaY > 200 || deltaY < -200) ) {
      newY = game.world.randomY;
      deltaY = player.y - newY;
    }

    // generate zombie once a suitable location is determined
    socket.emit('new zombie', { x:newX, y:newY});

    // call itself recursively to continually generate zombies
    setTimeout(generateZombies, zombieSpawnSpeed);
}


function generateAmmo(  ){

	if (ammoPacks.length < 30  && gamePlaying) {
		var ammo = ammoPacks.create( game.world.randomX, game.world.randomY, 'ammo');
		ammo.body.moves = false;
		ammo.anchor.setTo(0.5, 0.5);
	}

    // call itself recursively to continually generate ammo
    if (gamePlaying)
        setTimeout(generateAmmo, 2000);
}


// Helper function for adding cars
function generateCar( x, y , turned){

	// Create sprite
	var car = cars.create( x, y, 'cars');
	car.body.moves = false;
	car.anchor.setTo(0.5, 0.5);

	// Select image
	var picture = game.world.randomX % 6;
	car.animations.add('carImage', [ picture ] );
	car.animations.play('carImage');

	// Rotate car
	if ( turned ) {
		car.body.setSize(100, 54, 0, 0);
		car.rotation = game.physics.arcade.moveToXY(car, 1000, x-100000, y );
	}
}


// Creates the cars at game start
function createCars( ){

	// Parking lot
	generateCar( 400, 300, false);
	generateCar( 400, 405, false);
	generateCar( 450, 220, true);
	generateCar( 575, 390, false);
	generateCar( 855, 260, true);
	generateCar( 1150, 380, true);
	generateCar( 875, 510, true);

	// Road 1
	generateCar( 1295, 300, false);
	generateCar( 1295, 450, false);
	generateCar( 1293, 590, false);
	generateCar( 1297, 710, false);
	generateCar( 1290, 825, false);
	generateCar( 1295, 940, false);
	generateCar( 1295, 1040, false);
	generateCar( 1305, 1300, false);
	generateCar( 1295, 1450, false);
	generateCar( 1300, 1650, false);
	generateCar( 1295, 1770, false);

	// Road 2
	generateCar( 1385, 230, false);
	generateCar( 1385, 340, false);
	generateCar( 1385, 490, false);
	generateCar( 1385, 715, false);
	generateCar( 1385, 835, false);
	generateCar( 1385, 1940, false);
	generateCar( 1385, 1140, false);
	generateCar( 1385, 1330, false);
	generateCar( 1385, 1470, false);
	generateCar( 1385, 1750, false);
}
