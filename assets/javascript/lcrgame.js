/*
The Rules
https://plentifun.com/rules-to-play-left-right-center-lcr-dice-game

Step 1
Sit in a circular formation, ideally on a table or an open area. Keep ample space in the center; this area would be utilized as a pot to place chips.

Step 2
Distribute 3 chips to every player. To decide the opening player, all players can roll the three dice. The player to have most dots starts the game.

Step 3
The first player must roll the dice to begin playing.

Step 4
There could be four probable outcomes after the dice has been rolled. The dice could either show an L, C, R, or dots.

If any of the dice turns up to be an L, the player gives a chip to the player on the left. If any of the dice turns out to be a C, place one chip in the pot (in the center). Finally, if a dice turns out to be R, give a chip to the player on your right.

Step 5
In case you get one or multiple dots, those many chips stay with you. For instance, if you get an L, an R, and a dot, you give one chip each to the players on the left and right, and one chips stays with you.

Step 6
Roll only those many dice that correspond with the number of chips you have. If you have one chip, roll one, and so on.

Step 7
The best part is that even if you lose all your chips, you don't lose the game. There is a very high chance that a player besides you might give you a chip on his/her respective turn. However, you don't get to roll the die unless you have chips.

Step 8
The game continues till one player dominates and acquires all the chips. This player is the winner, and he/she also gets all the chips from the pot.

If you're playing with money, try not to lose too much. You can ideally play with lesser denominations. Roll the dice and enjoy!

*/

// Definitions: L means pay a chip to the left  << which means decrease index, unless it decreases below zero in which case it is equal to index of final game.player
//Similarly for right/ 
// C means pay to the central pot

// 
const gamestatus1 = document.getElementById("gamestatus1");
var gamestatus2 = document.getElementById("gamestatus2");

const game = {
	players		:	[],
	over		:	false,
	initialized	:	false,
	rollDice	:	function(player) { console.log(player.chips); }
};

function initialize(gameobj) {
	var enteredPlayers = null;
	gamestatus1.textContent = "How many players? (For 3 to 20 players)";
	gamestatus2.textContent = "";
	
	document.onkeyup = function(event) {
		var pressedkey = event.key;
		var numString = "";
		if ("1234567890".includes(pressedkey)) {
			if(gamestatus2.textContent.length < 2) gamestatus2.textContent += pressedkey;
			else if (gamestatus2.textContent.length === 2) {
				numString = gamestatus2.textContent.charAt(1) + pressedkey;
				gamestatus2.textContent = numString;
			}
		}
		if (event.which === 13) {
			
			if (parseInt(gamestatus2.textContent) > 2 && parseInt(gamestatus2.textContent) < 21) {
				document.onkeyup = null; // good number of players, stop listening for numbers
				enteredPlayers = parseInt(gamestatus2.textContent);
				gamestatus1.textContent = "";
				gamestatus2.textContent = "";
				initializePlayers(enteredPlayers);
				gameobj.initialized = true;
			}
			else {
				gamestatus1.textContent = "please choose a number of players from 3 to 20."; gamestatus2.textContent = "";
			}
		}
	}
	
	function initializePlayers(num) {
		for (var x = 0; x < num; x++) {
			var newPlayer = {};
			newPlayer.chips = 3;
			gameobj.players.push(newPlayer);
		}
	}	
}

function play(gameobj) {
	var currentPlayer = 0;
	gamestatus1.textContent = "Player " + currentPlayer;
	gamestatus2.textContent = "Click the button to roll one die each of your chips.";
	var r= $('<input type="button" value="click to roll"/>');
	$("#gamestatus2").append(r);

	gameobj.players.forEach(function(){	gameobj.rollDice(gameobj.players[currentPlayer]); });
}
	
initialize(game);

var newInterv = setInterval(function(){if (game.initialized) { clearInterval(newInterv); play(game);}}, 2000);



//This function rolls a single dice and returns the value of that dice
function rollonedice(){
	let possibledicevalues =["L", "R", "C", "snake_eye","snake_eye","snake_eye"]
	let rand = possibledicevalues[Math.floor(Math.random() * possibledicevalues.length)];
	return rand;
}


//this function takes care of the players dice roll depending on the amount of tokens they have
//if the player has 4 tokens then the function will return an array of 4 dice/values
function playersroll(numberofplayerstokens){
	let playerrollresults =[]
	for (var i= 0; i<numberofplayerstokens;i++){
		playerrollresults.push(rollonedice())
	}
	return playerrollresults;
}

console.log(playersroll(4))



