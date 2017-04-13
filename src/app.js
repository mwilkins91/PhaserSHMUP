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
	game.load.spritesheet('explosion', 'assets/explode.png', 128, 128);
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
	starfield = game.add.tileSprite(0, 0, 800, 600, 'starfield');

	//  Enable physics for the game
	game.physics.startSystem(Phaser.Physics.ARCADE);
	// Group to define laser behaviours
	lasers = game.add.group();
	// enable body to allow lasers to move (fire)
	lasers.enableBody = true;
	lasers.physicsBodyType = Phaser.Physics.ARCADE;

	//allow only 2 lasers to be spawned at a time.
	lasers.createMultiple(2, 'laser');
	lasers.callAll('events.onOutOfBounds.add', 'events.onOutOfBounds', resetLaser);
	lasers.callAll('anchor.setTo', 'anchor', 0.5, 1.0);
	lasers.setAll('checkWorldBounds', true);

	// The player and its settings
	player = game.add.sprite(350, game.world.height - 150, 'dude');
	game.physics.arcade.enable(player);
	player.body.collideWorldBounds = true;
	player.body.setSize(50, 50, 25, 25);
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


	//score and difficulty handling
	difficultyText = game.add.text(16, 16, 'Difficulty Level: 0', { font: '20px pixFont', fill: '#fff' });
	scoreText = game.add.text(16, 60, 'Score: 0', { font: '20px pixFont', fill: '#fff', });

	//increase score and difficulty over time
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

	//keeps the game from starting until the player hits Start!
	game.paused = true;
	$('.startBtn').fadeIn('fast');
}



function update() {
	//  Reset the players velocity (movement)
	player.body.velocity.x = 0;
	player.body.velocity.y = 0;

	if (cursors.left.isDown) {
		//  Move to the left
		player.body.velocity.x = -150;
	} else if (cursors.right.isDown) {
		//  Move to the right
		player.body.velocity.x = 150;
	} else {
		//  Stand still
		player.animations.play('still');
	}

	//  Move Up
	if (cursors.up.isDown) {
		player.body.velocity.y = -150;
	}
	//  Move Down
	if (cursors.down.isDown) {
		player.body.velocity.y = 100;
	}
	// Fire the laser!
	if (fireButton.isDown) {
		playerFires();
	}
	// If laser hits enemy, kill it and increase score by 5
	game.physics.arcade.overlap(lasers, enemies, shipCollide, null, this);
	// If enemy his player, end game!
	game.physics.arcade.overlap(player, enemies, playerCollide, null, this);
	
	//scroll the background
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

//function to handle enemy being hit by laser
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

//function to handle player getting hit by enemy
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

// debug function, displays hitboxes!
// function render() {
// 	game.debug.bodyInfo(player, 32, 32);
// 	game.debug.body(player);
// 	enemies.children.forEach((enemy) => {
// 		game.debug.body(enemy);
// 	})
// }


//creates the laser, defines its speed
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

//kills laser if off screen
function resetLaser(laser) {
	// Destroy the laser
	laser.kill();
}

//spawn enemies, speed and rate of spawn based on difficulty level
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

//starts the game!
$('.startBtn').on('click', function(event) {
	event.preventDefault();
	$(this).fadeOut('fast', function() {
		game.paused = false;
		gameStarted = true;
	});
});
