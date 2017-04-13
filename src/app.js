import $ from 'jquery';

const game = new Phaser.Game(800, 400, Phaser.AUTO, 'phaser-div', { preload: preload, create: create, update: update /* debug: , render: render */ });



function preload() {

	game.load.image('sky', 'assets/sky.png');
	game.load.image('ground', 'assets/platform.png');
	game.load.image('star', 'assets/star.png');
	game.load.spritesheet('dude', 'assets/plane.png', 100, 100);
	game.load.image('starfield', 'assets/starfield.png');
	game.load.image('laser', 'assets/bullet.png');
	game.load.image('enemy', 'assets/enemy.png');
	game.load.spritesheet('explosion', 'https://raw.githubusercontent.com/jschomay/phaser-demo-game/master/assets/explode.png', 128, 128);
}

let player;
let platforms;
let cursors;

let starfield;
let fireButton;
let ship;
let lasers;
let mouseTouchDown = false;
let enemies;
let explosions;
let difficulty = 30;
let enemySpeed = 200;
let difficultyLevelText = 0;
let difficultyText;
let score = 0;
let scoreText;
let isAlive = true;
let gameStarted = false;

function create() {

	//  Make the world larger than the actual canvas
	// game.world.setBounds(0, 0, 800, 10000);

	starfield = game.add.tileSprite(0, 0, 800, 600, 'starfield');

	//  We're going to be using physics, so enable the Arcade Physics system
	game.physics.startSystem(Phaser.Physics.ARCADE);

	//  A simple background for our game
	// game.add.sprite(0, 0, 'sky');

	//  The platforms group contains the ground and the 2 ledges we can jump on
	platforms = game.add.group();

	//  We will enable physics for any object that is created in this group
	platforms.enableBody = true;


	// Create the group using the group factory
	lasers = game.add.group();
	// To move the sprites later on, we have to enable the body
	lasers.enableBody = true;
	// We're going to set the body type to the ARCADE physics, since we don't need any advanced physics
	lasers.physicsBodyType = Phaser.Physics.ARCADE;
	/*
 
		This will create 20 sprites and add it to the stage. They're inactive and invisible, but they're there for later use.
		We only have 20 laser bullets available, and will 'clean' and reset they're off the screen.
		This way we save on precious resources by not constantly adding & removing new sprites to the stage
 
	*/
	lasers.createMultiple(2, 'laser');

	/*
 
		Behind the scenes, this will call the following function on all lasers:
			- events.onOutOfBounds.add(resetLaser)
		Every sprite has an 'events' property, where you can add callbacks to specific events.
		Instead of looping over every sprite in the group manually, this function will do it for us.
 
	// */
	lasers.callAll('events.onOutOfBounds.add', 'events.onOutOfBounds', resetLaser);
	// // Same as above, set the anchor of every sprite to 0.5, 1.0
	lasers.callAll('anchor.setTo', 'anchor', 0.5, 1.0);

	// // This will set 'checkWorldBounds' to true on all sprites in the group
	lasers.setAll('checkWorldBounds', true);

	// The player and its settings
	player = game.add.sprite(350, game.world.height - 150, 'dude');

	//  We need to enable physics on the player
	game.physics.arcade.enable(player);

	//  Player physics properties. Give the little guy a slight bounce.
	player.body.bounce.y = 0.5;
	player.body.gravity.y = 0;
	player.body.collideWorldBounds = true;
	player.body.setSize(50, 50, 25, 25);
	//  Our two animations, walking left and right.
	player.animations.add('left', [2], 10, true);
	player.animations.add('right', [1], 10, true);
	player.animations.add('still', [0, 5], 10, true);


	// The baddies!
	enemies = game.add.group();
	enemies.enableBody = true;
	enemies.physicsBodyType = Phaser.Physics.ARCADE;
	enemies.createMultiple(5, 'enemy');
	enemies.setAll('anchor.x', 0.5);
	enemies.setAll('anchor.y', 0.5);
	enemies.setAll('scale.x', 0.5);
	enemies.setAll('scale.y', 0.5);
	enemies.setAll('angle', 180);
	enemies.setAll('outOfBoundsKill', true);
	enemies.setAll('checkWorldBounds', true);
	launchGreenEnemy();

	//  An explosion pool
	explosions = game.add.group();
	explosions.enableBody = true;
	explosions.physicsBodyType = Phaser.Physics.ARCADE;
	explosions.createMultiple(30, 'explosion');
	explosions.setAll('anchor.x', 0.5);
	explosions.setAll('anchor.y', 0.5);
	explosions.forEach(function(explosion) {
		explosion.animations.add('explosion');
	});
	//  Our controls.
	cursors = game.input.keyboard.createCursorKeys();

	game.camera.follow(player);

	fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);



	difficultyText = game.add.text(16, 16, 'Difficulty Level: 0', { font: '20px pixFont', fill: '#fff' });
	scoreText = game.add.text(16, 60, 'Score: 0', { font: '20px pixFont', fill: '#fff', });

	setInterval(function() {
		if (isAlive && gameStarted) {
			if (difficulty > 1) {
				difficulty = difficulty - 1;
			}
			difficultyLevelText = difficultyLevelText + 1;
			difficultyText.text = 'Difficulty Level: ' + difficultyLevelText;

			if (difficulty > 20) {
				enemySpeed = enemySpeed + 20;
			} else if (difficulty > 10 && difficulty <= 20) {
				enemySpeed = enemySpeed + 15;
			} else if (difficulty <= 10) {
				enemySpeed = enemySpeed + 10;
			}
			score = score + 10;
			scoreText.text = 'Score: ' + score;

		}
	}, 3000);

	game.paused = true;

}



function update() {

	//  Collide the player and the stars with the platforms
	game.physics.arcade.collide(player, platforms);


	//  Reset the players velocity (movement)
	player.body.velocity.x = 0;
	player.body.velocity.y = 0;

	// player.body.velocity.y = -150;


	if (cursors.left.isDown) {
		//  Move to the left
		player.body.velocity.x = -150;
		// player.animations.play('left');
	} else if (cursors.right.isDown) {
		//  Move to the right
		player.body.velocity.x = 150;

		// player.animations.play('right');
	} else {
		//  Stand still
		// player.animations.stop();

		player.animations.play('still');
	}

	//  Allow the player to jump if they are touching the ground.
	if (cursors.up.isDown) {
		player.body.velocity.y = -150;
	}

	if (cursors.down.isDown) {
		player.body.velocity.y = 100;
	}

	if (fireButton.isDown) {
		playerFires();
	}

	game.physics.arcade.overlap(lasers, enemies, shipCollide, null, this);
	game.physics.arcade.overlap(player, enemies, playerCollide, null, this);
	starfield.tilePosition.y += 3;

	/********************************
	 *      FOR HTML CONTROLS        *
	 ********************************/
	$('.left').mousedown(function() {
		player.body.velocity.x = -550;
	})
	$('.right').mousedown(function() {
		player.body.velocity.x = 550;
	})
	$('.up').mousedown(function() {
		player.body.velocity.y = -550;
	})
	$('.down').mousedown(function() {
		player.body.velocity.y = 550;
	})
	if (isAlive) {
		$('.fireBtn').on('click', function(event) {
			event.preventDefault();
			playerFires();
		});
	} else {
		$('.fireBtn').off('click');
	}



}

function shipCollide(player, enemy) {
	var explosion = explosions.getFirstExists(false);
	explosion.reset(enemy.body.x + enemy.body.halfWidth, enemy.body.y + enemy.body.halfHeight);
	explosion.body.velocity.y = enemy.body.velocity.y;
	explosion.alpha = 0.7;
	explosion.play('explosion', 30, false, true);
	enemy.kill();
	score = score + 5;
	scoreText.text = 'Score: ' + score;

}

function playerCollide(player, enemy) {
	var explosion = explosions.getFirstExists(false);
	explosion.reset(player.body.x + player.body.halfWidth, player.body.y + player.body.halfHeight);
	explosion.body.velocity.y = player.body.velocity.y;
	explosion.alpha = 0.7;
	explosion.play('explosion', 30, false, true);
	player.kill();
	isAlive = false;
	game.paused = true;
	$('.gameOver').fadeIn('fast');
	$('.dynamicScore').text(score);
	$('.score').fadeIn('fast');

}

// debug
// function render() {
// 	game.debug.bodyInfo(player, 32, 32);
// 	game.debug.body(player);
// 	enemies.children.forEach((enemy) => {
// 		game.debug.body(enemy);
// 	})
// }

function playerFires() {
	// Get the first laser that's inactive, by passing 'false' as a parameter
	var laser = lasers.getFirstExists(false);
	if (laser) {
		// If we have a laser, set it to the starting position
		laser.reset(player.x + 50, player.y - 20);
		// Give it a velocity of -500 so it starts shooting
		laser.body.velocity.y = -500;
	}
}

function resetLaser(laser) {
	// Destroy the laser
	laser.kill();
}

function launchGreenEnemy() {
	let difficultyMulti = difficulty * 10;
	var MIN_ENEMY_SPACING = difficultyMulti;
	var MAX_ENEMY_SPACING = difficultyMulti * 10;
	var ENEMY_SPEED = enemySpeed;

	var enemy = enemies.getFirstExists(false);
	if (enemy) {
		enemy.reset(game.rnd.integerInRange(0, game.width), -20);
		enemy.body.velocity.x = game.rnd.integerInRange(-300, 300);
		enemy.body.velocity.y = ENEMY_SPEED;
		enemy.body.drag.x = 100;
		enemy.body.setSize(50, 50);
		enemy.update = function() {
			enemy.angle = 180 - game.math.radToDeg(Math.atan2(enemy.body.velocity.x, enemy.body.velocity.y));
		}
	}
	//  Send another enemy soon
	game.time.events.add(game.rnd.integerInRange(MIN_ENEMY_SPACING, MAX_ENEMY_SPACING), launchGreenEnemy);

}


$('.startBtn').on('click', function(event) {
	event.preventDefault();
	$(this).fadeOut('fast', function() {
		game.paused = false;
		gameStarted = true;
	});
});
