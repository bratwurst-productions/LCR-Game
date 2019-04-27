/*
The Rules
https://plentifun.com/rules-to-play-left-right-center-lcr-dice-game
*/

//Load randomized background image:

switch (Math.floor(Math.random() * 3)) {
	case 0:
		$("body").css("background", `darkslategray url(./assets/background_images/Oriental_Lizard-reduced.jpg) no-repeat top center/cover fixed`);
		break;
	case 1:
		$("body").css("background", `darkslategray url("./assets/background_images/sugarloaf_sunrise_reduced_cropped.jpg") no-repeat top center/cover fixed`); // this one seems to slow down the loading of the app the most. Can it be reduced in size?
		break;
	case 2:
		$("body").css("background", `darkslategray url("./assets/background_images/Gulls_on_Morro_Strand_State_Beach_reduced_cropped.jpg") no-repeat top center/cover fixed`);
		break;
		// no default case needed because we have a fallback in style.css for background color
}

////////////////////////////////////
// global definitions:
////////////////////////////////////

let userTokens = 3; //all players begin game with three chips each
var centerTokens = 0;
var myPlayerID = null;
var myAvatarURL = "";
var currentWaitingPlayers = 0;
var gameStarted = false;
var connectedUsers = 0;
var gamesObj;
var gameName;

////////////////////////////////////
// firebase functions:
////////////////////////////////////

/* global moment firebase */

// Initialize Firebase
// Make sure to match the configuration to the script version number in the HTML
// (Ex. 3.0 != 3.7.0)

var config = {
	apiKey: "AIzaSyBw0KSKijEdaesz-Unx7jMrhHqw4SBYHU4",
	authDomain: "lcr-game.firebaseapp.com",
	databaseURL: "https://lcr-game.firebaseio.com",
	projectId: "lcr-game",
	storageBucket: "lcr-game.appspot.com",
	messagingSenderId: "797678842345"
};

firebase.initializeApp(config);

// Create a variable to reference the database.
var database = firebase.database();

// connectionsRef references a specific location in our database.
// All of our connections will be stored in this directory.
var connectionsRef = database.ref("/connections");

// gamesRef refers to the firebase location where games will be stored.
var gamesRef = database.ref("/games");

// '.info/connected' is a special location provided by Firebase that is updated every time the client's connection state changes.
// '.info/connected' is a boolean value, true if the client is connected and false if they are not.
var connectedRef = database.ref(".info/connected");

// When the client's connection state changes...
connectedRef.on("value", function (snap) {

	// If they are connected..
	if (snap.val()) {

		if (!myAvatarURL) {
			myAvatarURL = generateRandomAvatar();
			$("#avatar").html(`<img src=${myAvatarURL} alt="player avatar" height="25%" width="25%">`);
		}

		// Add user to the connections list.
		var con = connectionsRef.push({
			"waiting": false,
			"matched": false,
			"myAvatarURL": myAvatarURL,
			"userTokens": userTokens
		});

		// Remove user from the connection list when they disconnect.
		con.onDisconnect().remove();

		/*con.onDisconnect().disconnectFunction() // this isn't working but the idea is to remove yourself from the game and reduce waitingCount as appropriate, even if you are the last connection to disconnect, in which case the game should be removed as well.
		function disconnectFunction() {
			
		var waiting = updateWaitingCount();
		database.ref("/games/" + snapshot.val().gameID).update({"waitingCount": waiting}); // also need to remove player from games/gamePlayers
		con.remove(); // update waiting players or matched players
		}*/


	}
	window.con = con;
});

var connectionsUpdateFunc = function (snap) {

	// Display the viewer count in the html.
	// The number of online users is the number of children in the connections list.
	var numChildren = snap.numChildren();
	window.playerArray = Object.keys(snap.val());
	window.connections = snap.val();
	$("#connected-viewers").text(numChildren + " player(s) connected.");
	if (!myPlayerID) myPlayerID = playerArray[playerArray.length - 1];
	$("#chip-total").text(userTokens);
	playerArray.indexOf(myPlayerID);
	$("#player-number").text(playerArray.indexOf(myPlayerID) + 1); // ultimately, we don't want to display this number on the screen, because if someone leaves or becomes disconnected during a game, a player's player-number can change on the fly
	// we want to identify player's via their avataaar
	checkifanyplayerhaswon();
}

function checkifanyplayerhaswon() {
	let userswithtokensleft = 0;
	for (i = 0; i < gamesObj[gameName].gamePlayers.length; i++) {
		if (connections[gamesObj[gameName].gamePlayers[i]].userTokens > 0) {
			userswithtokensleft++;
		}
	}
	if (userswithtokensleft === 1 && (playerArray.length > 1)) { // problem with this logic is that it is not looking at the gamePlayers. It is just looking at the playerArray, which includes connected players and waiting(joined) players
		if (userTokens > 0) {
			$("#game-status").prepend('<em><strong>game_agent</strong></em>&emsp;You Won!<br>');
		} else {
			$("#game-status").prepend('<em><strong>game_agent</strong></em>&emsp;You lost!<br>');
		}
		//whether this user won or lost, the game is over, so we want to disable the roll dice button and perhaps hide it as well
		deactivateGameButton("#roll-dice");
		if (!$("#dice-row").hasClass("invisible")) toggleInvisible("#dice-row");
	}
	//this function should iterate through all of the connections(players) to
	//check if only one player has chips remaining
}

function updateWaitingCount() {
	connectionsRef.once("value").then(function (snapshot) {
		connections = snapshot.val();
		playerArray = Object.keys(connections);
	});
	var waiting = 0;
	for (var x = 0; x < playerArray.length; x++) {
		if (connections[playerArray[x]].waiting) waiting++;
	}
	return waiting;
}

connectionsRef.on("value", connectionsUpdateFunc);
connectionsRef.on("child_removed", function (snapshot) {
	if (typeof snapshot.val().gameID !== "undefined") {
		var waiting = updateWaitingCount();
		database.ref("/games/" + snapshot.val().gameID).update({
			"waitingCount": waiting
		});
		// also remove player from list of players in the game, and forfeit player chips to center chips.
		// if he is the last player to disconnect from the game, remove the game as well.
		console.log("need to remove this id from gamePlayers: " + snapshot.key);
		
	}
});

// When first loaded or when the connections list changes...
var childUpdateFunc = function (snap) {

	if (myPlayerID) {
		if (myPlayerID === snap.key) {
			userTokens = snap.val().userTokens;
			$("#chiptotal").text(userTokens);
		}
	}
}
connectionsRef.on("child_changed", childUpdateFunc);

gamesRef.on("value", function(snapshot){
	gamesObj = snapshot.val();
	if (gamesObj) {
		console.log(gamesObj);
		gameName = Object.keys(gamesObj);
		console.log("game name / ID is " + gameName);
		console.log(gamesObj[gameName].gameStarted);
		if (gamesObj[gameName].gameStarted) { // game has been started
			//
			
			console.log(gamesObj[gameName].gamePlayers);
			if (myPlayerID && typeof gamesObj[gameName].gamePlayers !== "undefined") {
				if (gamesObj[gameName].gamePlayers.length === gamesObj[gameName].waitingCount && gamesObj[gameName].waitingCount >= 3) {
					if (typeof gamesObj[gameName].currentPlayerIndex === "undefined") {
						var randomizedIndex = Math.floor(Math.random() * gamesObj[gameName].waitingCount);
						database.ref("/games/"+gameName).update({
							"currentPlayerIndex": randomizedIndex
						});
					}
				}
				if (gamesObj[gameName].gamePlayers.includes(myPlayerID)) {
					if (gamesObj[gameName].gamePlayers[gamesObj[gameName].currentPlayerIndex] === myPlayerID) {
						console.log("It is your turn, " + myPlayerID)
						//activate roll dice button
						activateGameButton("#roll-dice");
					}
					else deactivateGameButton("#roll-dice");
				}
			}
		}
	}
});

gamesRef.on("child_added", function (snapshot) {
	database.ref("/games/" + snapshot.key + "/waitingCount").on("value", function (snapshot) {
		var waiting = snapshot.val();
		//console.log("waiting on game: " + snapshot.val());
		$("#currently-joined").text("There are " + waiting + " player(s) currently joined and waiting to begin.");
		if (waiting >= 3) {
			//if start button not active for waiting players, activate start button for all waiting players
			if ($("#start-game").attr("disabled")) activateGameButton("#start-game");
			//
		} else if (waiting < 3) {
			//if start button active for waiting players, inactivate it for all waiting players
			if (!$("#start-game").attr("disabled")) deactivateGameButton("#start-game");
			//
		}
	});
	database.ref("/games/" + snapshot.key + "/centerPot").on("value", function (snapshot) {
		centerTokens = snapshot.val();
		$("#center-chips").text(centerTokens);
	});
	database.ref("/games/" + snapshot.key + "/gameStarted").on("value", function (snapshot) {
		//activateGameButton("#roll-dice"); // this should actually be done by a listener that only activates the button when it is a player's
		if (snapshot.val()) { // then the firebase value for gameStarted has changed now to true
			if (!$("#start-join-row").hasClass("invisible") && $("#dice-row").hasClass("invisible")) {
				toggleInvisible("#start-join-row");
				toggleInvisible("#dice-row");
				//activiate roll dice button only for the player whose turn it is
			}
			if (!gameStarted) gameStarted = true;
			$("#game-status").html('<em><strong>game_agent</strong></em>&emsp;Game Started!');
			//console.log(snapshot.ref.parent.key); // key of game started

			var gamePlayers = [];

			connectionsRef.orderByChild("gameID").equalTo(snapshot.ref.parent.key).on("child_added", function (snapshot) {
				gamePlayers.push(snapshot.key);
			}); //get keys of all connections who are playing this game, in an ordered array called gamePlayers

			//update firebase game with gamePlayers
			//start initial turn at a random position in this array
			snapshot.ref.parent.update({
				"gamePlayers": gamePlayers
			});
			database.ref("/games/" + snapshot.ref.parent.key + "/currentRollAvatar").on("value", function (snapshot) {
				
				if (typeof snapshot.val() !== "undefined" && snapshot.val()) {
					var AvatarID = snapshot.val();
					$("#game-status").html(`<em><strong>game_agent</strong></em>&emsp;Player <img src="${AvatarID}" alt="player" height="10%" width="10%"> rolled:`);
				}
				
				//var diceArray = 
				database.ref("/games/" + snapshot.ref.parent.key + "/currentRoll").once("value").then(function (snapshot) {
					if (snapshot.val()) {
						
						showDice(snapshot.val());
					}
					//console.log("current roll equals:");
					//console.log(snapshot.val());
					
					
				});
			});

			/*database.ref("/games/" + snapshot.ref.parent.key + "/currentPlayerIndex").on("value", function (snapshot) {
				console.log(snapshot);
				console.log(snapshot.key);
				console.log(snapshot.val());
			});*/
			//this will also guarantee that any player who doesn't get into the game will just be spectating
			//the avatar of the rolling player will be shown in the game panel, perhaps in the dice row so that we don't confuse them with the players' own avatar

			//note: currentPlayerTurn will be tracked as a child of the game we are in
			//all players will have an event listener set which will notify them when the current player is equal to myPlayerID, and will activate their roll dice button,
			//also, the game_agent will inform the player that it is his turn

			//re-deactivate or hide start game and join game buttons
			//show inactive roll dice button
			//perhaps have start game and join game in one row and roll dice in another row, 
			//and simply toggle rows invisible/visible
			//game_agent should determine who goes first pseudo-randomly and then proceed in order.
			//if someone doesn't roll within a reasonable amount of time, they either forfeit their chips to the center pot (attribute of the active game), or they roll automatically.
			//if they leave by closing browser or tab or otherwise disconnecting, their chips are forfeited to center pot.
			// forfeits are mentioned by game agent.
			//game agent history should be available if one were to scroll upward.

			//also update the connection-text with number of players currently playing, (for all players, at least right now before we allow for multiple concurrent games)
		}
	});

});

$("#game-status").html('<em><strong>game_agent</strong></em>&emsp;Click "Join Game" to enter waiting pool.');
// $("#game-status").html('Click "Start or Join Game" to begin!');

////////////////////////////////////
// chat feature:
////////////////////////////////////

var chatHistory = [];
var chatRowLimit = 10;
var newUserComment = {
	commentator: "",
	comment: ""
}

// --------------------------------------------------------------
// At the page load and subsequent value changes, get a snapshot of the local data.
// This function allows you to update your page in real-time when the values within the firebase node chatData changes

database.ref("/chatData").on("value", function (snapshot) {
	if (snapshot.child("newComment").exists()) {
		newUserComment = snapshot.val().newComment;
		if (chatHistory[chatHistory.length - 1] !== snapshot.val().newComment)
			if (chatHistory.length > chatRowLimit) chatHistory = chatHistory.slice(1); //we only want a max of 16 comments after the push
	} else newUserComment = {};

	for (; chatHistory.length < chatRowLimit; chatHistory.push({})) {};
	chatHistory.push(newUserComment);
	$("#chat-history").html(chatHistory.map(showHistory));

	// If any errors are experienced, log them to console.
}, function (errorObject) {
	console.log("The read failed: " + errorObject.code);
});

function showHistory(commentObj) {
	if (typeof commentObj["commentator"] !== "undefined") return `<div class="row"><div class="col-auto mr-auto" style="text-align:left;"><strong>${commentObj["commentator"]}</strong></div><div class="col">${commentObj["comment"]}</div></div>`;
	else return `<div class="row"><div class="col" style="min-height:1.5em"></div></div>`;
}

////////////////////////////////////
// game functions:
////////////////////////////////////

//This function rolls a single dice and returns the value of that dice
function rollDie() {
	let possibleDieValues = ["L", "R", "C", "snake_eye", "snake_eye", "snake_eye"];
	let rand = possibleDieValues[Math.floor(Math.random() * possibleDieValues.length)];
	return rand;
}

//this function takes care of the players dice roll depending on the amount of tokens they have
//if the player has 4 tokens then the function will return an array of 4 dice/values
function playerRoll(dice) {
	let rollResults = [];

	for (var i = 0; i < dice; i++) {
		rollResults.push(rollDie());
	}
	//push results to game location in firebase so they can be rendered for other players as well.
	database.ref("/games/"+gameName).update({
		"currentRoll":rollResults,
		"currentRollPlayer": myPlayerID,
		"currentRollAvatar": myAvatarURL
	});
	return rollResults;
}

function renderDice(rollResultsArray) {


	var leftPlayer; // this logic needs to be updated to use the order of game players
	//console.log(gamesObj);
	if (gamesObj[gameName].gamePlayers.indexOf(myPlayerID) === 0) leftPlayer = gamesObj[gameName].gamePlayers[gamesObj[gameName].gamePlayers.length-1];
	else leftPlayer = gamesObj[gameName].gamePlayers[gamesObj[gameName].gamePlayers.indexOf(myPlayerID) - 1];
	console.log("leftPlayer: " + leftPlayer);

	var rightPlayer; // this logic needs to be updated to use the order of game players
	if (gamesObj[gameName].gamePlayers.indexOf(myPlayerID) === gamesObj[gameName].gamePlayers.length - 1) rightPlayer = gamesObj[gameName].gamePlayers[0];
	else rightPlayer = gamesObj[gameName].gamePlayers[gamesObj[gameName].gamePlayers.indexOf(myPlayerID) + 1];
	console.log("rightPlayer: " + rightPlayer);
	
	for (var i = 0; i < rollResultsArray.length; i++) {
		if (rollResultsArray[i] === "R") { //pass chip to left, player loses a chip
			userTokens--;
			con.update({userTokens: userTokens});
			connections[rightPlayer].userTokens++;
			connectionsRef.child(rightPlayer).update({userTokens:connections[rightPlayer].userTokens});
		}
		if (rollResultsArray[i] === "L") { //pass chip to left, player loses a chip
			userTokens--;
			con.update({userTokens: userTokens});
			connections[leftPlayer].userTokens++;
			connectionsRef.child(leftPlayer).update({userTokens: connections[leftPlayer].userTokens});
		}
		if (rollResultsArray[i] === "C") { //pass chip to the center pile, chip is out of circulation now , player loses a chip
			userTokens--;
			con.update({userTokens: userTokens});
			database.ref("/games/"+gameName+"/centerPot").once("value").then(function(snapshot) {
			database.ref("/games/"+gameName).update({"centerPot":snapshot.val()+1});
			});
		}
	}
}

function showDice(rollResultsArray) {

	$("#dice-images").html("");

	for (var i = 0; i < rollResultsArray.length; i++) {
		if (rollResultsArray[i] === "snake_eye") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/dot.png" />');
		}
		if (rollResultsArray[i] === "R") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/r.png" />');
		}
		if (rollResultsArray[i] === "L") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/l.png" />');
		}
		if (rollResultsArray[i] === "C") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/c.png" />');
		}
	}
}

////////////////////////////////////
// click listener functions:
////////////////////////////////////

//CHAT button listeners:

// Whenever a user clicks the submit button
$("#submit-comment").on("click", function (event) {
	event.preventDefault();
	// Get the input values
	var commenterName = $("#commenter-name").val().trim();
	var newUserComment = $("#new-comment").val().trim();
	if (newUserComment && commenterName) {
		database.ref("/chatData").set({
			newComment: {
				commentator: commenterName,
				comment: newUserComment
			},
		});
	}
	$("#new-comment").val("");
});

// Whenever a user clicks the clear chat button
$("#clear-comments").on("click", function (event) {

	event.preventDefault();
	chatHistory = [];
	database.ref("/chatData").set({});

	for (; chatHistory.length < chatRowLimit; chatHistory.push({})) {};
	$("#chat-history").html(chatHistory.map(showHistory));
});

//GAME button listeners:

// Whenever a user clicks the roll dice button
$("#roll-dice").on("click", function (event) {
	event.preventDefault(); //is this necessary for all buttons or only for "input" type buttons?
	renderDice(playerRoll(userTokens));
	
	//increment currentPlayerIndex:
	console.log("current player index: " + gamesObj[gameName].currentPlayerIndex);
	console.log("length of player array " + gamesObj[gameName].gamePlayers.length);
	var nextIndex;
	if (gamesObj[gameName].currentPlayerIndex < gamesObj[gameName].gamePlayers.length-1) nextIndex = gamesObj[gameName].currentPlayerIndex + 1;
	else if (gamesObj[gameName].currentPlayerIndex === gamesObj[gameName].gamePlayers.length-1) nextIndex = 0;
	// write next index to game location in firebase and disable roll button
	database.ref("/games/"+gameName).update({
							"currentPlayerIndex": nextIndex
						});
	deactivateGameButton("#roll-dice");
	
});

function toggleInvisible(selector) {
	if ($(selector).hasClass("invisible")) $(selector).removeClass("invisible");
	else $(selector).addClass("invisible");
}

function activateGameButton(selector) {
	$(selector).addClass("btn-primary").removeClass("btn-secondary");
	$(selector).attr("disabled", false);
	if (selector.includes("start")) $("#start-game").html("Start Game");
	else if (selector.includes("join")) $(selector).html("Join Game");
}

function deactivateGameButton(selector) {
	$(selector).addClass("btn-secondary").removeClass("btn-primary");
	$(selector).attr("disabled", "disabled");
	if (selector.includes("join")) $(selector).html("<i>Join Game</i>");
	else if (selector.includes("start")) $(selector).html("<i>Start Game</i>");
}

// Whenever a user clicks the join-game button
$("#join-game").on("click", function (event) {
	event.preventDefault(); // commenting this out didn't seem to cause any issues for this "submit" type button
	//if waiting = false, then deactive join game button but don't activate start game button until at least three players are waiting (maybe cause start button to become visible if it begins invisible
	// also, change waiting to true, and set matched to false and push to firebase
	var readOnce = con.once("value").then(function (snapshot) {
		var myValues = snapshot.val();
		if (!myValues.waiting) {
			con.update({
				"waiting": true,
				"matched": false
			});
			deactivateGameButton("#join-game");
			$("#game-status").html('<em><strong>game_agent</strong></em>&emsp;Waiting to start game....');
			gamesRef.once("value").then(function (snapshot) {
				if (snapshot.numChildren() === 0) {
					var newGame = gamesRef.push({
						"gameStarted": false,
						"waitingCount": 1,
						"centerPot":0
					});
					$("#currently-joined").text("You are currently the only player who has joined and is waiting to begin."); // remove this -- it should be handled elsewhere
					con.update({
						"gameID": newGame.key
					});
				} else if (snapshot.numChildren() === 1) {
					database.ref("/games/" + Object.keys(snapshot.val())[0]).update({
						"waitingCount": updateWaitingCount()
					});
					con.update({
						"gameID": Object.keys(snapshot.val())[0]
					});
				} else if (snapshot.numChildren() > 1) {
					console.log("current Games: " + snapshot.numChildren());
				} else console.log("something went wrong");
			});
		}
	});
});

// Whenever a user clicks the start-game button
$("#start-game").on("click", function (event) {
	event.preventDefault();
	console.log("begin game");
	//$("#game-status").html('<em><strong>game_agent</strong></em>&emsp;Starting game.');

	gamesRef.once("value").then(function (snapshot) {
		if (snapshot.numChildren() === 1) {
			database.ref("/games/" + Object.keys(snapshot.val())[0]).update({
				"gameStarted": true,
				"centerPot": 0
			});
		}
	});
});