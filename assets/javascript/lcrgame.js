/*
The Rules
https://plentifun.com/rules-to-play-left-right-center-lcr-dice-game
*/

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

switch (Math.floor(Math.random() * 3)) {
	case 0:
		$("body").css("background", `darkslategray url(./assets/background_images/Oriental_Lizard-reduced.jpg) no-repeat top center/cover fixed`);
		break;
	case 1:
		$("body").css("background", `darkslategray url("./assets/background_images/sugarloaf_sunrise_reduced_cropped.jpg") no-repeat top center/cover fixed`);
		break;
	case 2:
		$("body").css("background", `darkslategray url("./assets/background_images/Gulls_on_Morro_Strand_State_Beach_reduced_cropped.jpg") no-repeat top center/cover fixed`);
		break;
		// no default case needed because we have a fallback in style.css for background color
}

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
var gamesRef = database.ref("/games");

// '.info/connected' is a special location provided by Firebase that is updated
// every time the client's connection state changes.
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
		con.onDisconnect().remove(); // update waiting players or matched players
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
	$("#center-chips").text(centerTokens);
	$("#chip-total").text(userTokens);
	playerArray.indexOf(myPlayerID);
	$("#player-number").text(playerArray.indexOf(myPlayerID)+1); // ultimately, we don't want to display this number on the screen, because if someone leaves or becomes disconnected during a game, a player's player-number can change on the fly
	// we want to identify player's via their avataaar
}
// When first loaded or when the connections list changes...
var childUpdateFunc = function (snap) {
	
	if (myPlayerID) {
		if (myPlayerID === snap.key) {
			userTokens = snap.val().userTokens;
			$("#chiptotal").text(userTokens);
		}
	}
}

function updateWaitingCount() {
	connectionsRef.once("value").then(function(snapshot) {
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
connectionsRef.on("child_removed", function(snapshot) {
	if (typeof snapshot.val().gameID !== "undefined") {
		var waiting = updateWaitingCount();
		database.ref("/games/" + snapshot.val().gameID).update({"waitingCount": waiting});
	}
});

connectionsRef.on("child_changed", childUpdateFunc);

gamesRef.on("child_added", function(snapshot) {
	database.ref("/games/"+snapshot.key+"/waitingCount").on("value", function(snapshot) {
		var waiting = snapshot.val();
		//console.log("waiting on game: " + snapshot.val());
		$("#currently-joined").text("There are " + waiting + " player(s) currently joined and waiting to begin.");
	if (waiting >= 3) {
		//if start button not active for waiting players, activate start button for all waiting players
		if ($("#start-game").attr("disabled")) activateGameButton("#start-game");
		//
	}
	else if (waiting < 3) {
		//if start button active for waiting players, inactivate it for all waiting players
		if (!$("#start-game").attr("disabled")) deactivateGameButton("#start-game");
		//
	}
	});
	database.ref("/games/"+snapshot.key+"/gameStarted").on("value", function(snapshot) {
			if (snapshot.val()) { 				//gameStarted === true
				if (!$("#start-join-row").hasClass("invisible") && $("#dice-row").hasClass("invisible")) {
					toggleInvisible("#start-join-row");
					toggleInvisible("#dice-row");
				}
				

				//once we implement the current player turn logic, we will active the roll dice button for current player
				//activateGameButton("#dice-row");
				
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
	return rollResults;
}

function renderDice(rollResultsArray) {

	
	var leftPlayer; 
	if (playerArray.indexOf(myPlayerID) === 0) leftPlayer = playerArray.length - 1;
	else leftPlayer = playerArray.indexOf(myPlayerID) - 1;

	var rightPlayer;
	if (playerArray.indexOf(myPlayerID) === playerArray.length - 1) rightPlayer = 0;
	else rightPlayer = playerArray.indexOf(myPlayerID) + 1;

	for (var i = 0; i < rollResultsArray.length; i++) {
		//Do nothing, player loses no chips 
		if (rollResultsArray[i] === "snake_eye") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/dot.png" />');
		}
		//pass chip to right of player, player loses a chip
		if (rollResultsArray[i] === "R") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/r.png" />');
			userTokens--;
			con.update({userTokens: userTokens});
			connections[playerArray[rightPlayer]].userTokens++;
			connectionsRef.child(playerArray[rightPlayer]).update({
				userTokens: connections[playerArray[rightPlayer]].userTokens
			});
		}
		//pass chip to left, player loses a chip
		if (rollResultsArray[i] === "L") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/l.png" />');
			userTokens--;
			con.update({userTokens: userTokens});
			connections[playerArray[leftPlayer]].userTokens++;
			connectionsRef.child(playerArray[leftPlayer]).update({
				userTokens: connections[playerArray[leftPlayer]].userTokens
			});
		}
		//pass chip to the center pile, chip is out of circulation now , player loses a chip
		if (rollResultsArray[i] === "C") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/c.png" />');
			userTokens--;
			con.update({userTokens: userTokens});
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
	$("#dice-images").html("");
	renderDice(playerRoll(userTokens));
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

function deactivateGameButton (selector) {
	$(selector).addClass("btn-secondary").removeClass("btn-primary");
	$(selector).attr("disabled","disabled");
	if (selector.includes("join")) $(selector).html("<i>Join Game</i>");
	else if (selector.includes("start")) $(selector).html("<i>Start Game</i>");
}

// Whenever a user clicks the join-game button
$("#join-game").on("click", function (event) {
	event.preventDefault(); // commenting this out didn't seem to cause any issues for this "submit" type button
	//if waiting = false, then deactive join game button but don't activate start game button until at least three players are waiting (maybe cause start button to become visible if it begins invisible
	// also, change waiting to true, and set matched to false and push to firebase
	var readOnce = con.once("value").then(function(snapshot) {
		var myValues = snapshot.val();
		if (!myValues.waiting) {
			con.update({"waiting": true, "matched":false});
			deactivateGameButton("#join-game");
			$("#game-status").html('<em><strong>game_agent</strong></em>&emsp;Waiting to start game....');
			gamesRef.once("value").then(function(snapshot) {
				if (snapshot.numChildren() === 0) {
					var newGame = gamesRef.push({"gameStarted":false, "waitingCount":1});
					$("#currently-joined").text("You are currently the only player who has joined and is waiting to begin."); // remove this -- it should be handled elsewhere
					con.update({"gameID": newGame.key});
				}
				else if (snapshot.numChildren() === 1) {
					database.ref("/games/" +Object.keys(snapshot.val())[0]).update({"waitingCount":updateWaitingCount()});
					con.update({"gameID": Object.keys(snapshot.val())[0]});
				}
				else if (snapshot.numChildren() > 1) {
					console.log("current Games: " + snapshot.numChildren());
				}
				else console.log("something went wrong");
			});
		}
	});
});

// Whenever a user clicks the start-game button
$("#start-game").on("click", function (event) {
	event.preventDefault();
	console.log("begin game");
	//$("#game-status").html('<em><strong>game_agent</strong></em>&emsp;Starting game.');
	
	gamesRef.once("value").then(function(snapshot) {
		if (snapshot.numChildren() === 1) {
					database.ref("/games/" +Object.keys(snapshot.val())[0]).update({"gameStarted":true, "centerPot": 0});
		}
	});
});