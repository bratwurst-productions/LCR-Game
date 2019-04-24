/*
The Rules
https://plentifun.com/rules-to-play-left-right-center-lcr-dice-game
*/

/* global moment firebase */

// Initialize Firebase
// Make sure to match the configuration to the script version number in the HTML
// (Ex. 3.0 != 3.7.0)

var currentMatches = 0;
var chatHistory = [];
var chatRowLimit = 10;
var newUserComment = {
  commentator: "",
  comment: ""
}

let userTokens = 3; //all players begin game with three chips each
var centerTokens = 0;

var matched = false;
var waiting = false;
var playersWaiting = 0;
var myPlayerID = null;

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

// '.info/connected' is a special location provided by Firebase that is updated
// every time the client's connection state changes.
// '.info/connected' is a boolean value, true if the client is connected and false if they are not.
var connectedRef = database.ref(".info/connected");

// When the client's connection state changes...
connectedRef.on("value", function (snap) {

// If they are connected..
	if (snap.val()) {
	
		// Add user to the connections list.
		var con = connectionsRef.push({
			"waiting": false,
			"matched": false,
			"userTokens": userTokens
		});
	
		// Remove user from the connection list when they disconnect.
		con.onDisconnect().remove(); // update waiting players or matched players
	}
	window.con = con;
});

var connectionsUpdateFunc = function(snap) {
	// Display the viewer count in the html.
	// The number of online users is the number of children in the connections list.
	$("#connected-viewers").text(snap.numChildren() + " player(s) connected.");
	window.playerArray = Object.keys(snap.val());
	if (!myPlayerID) myPlayerID = playerArray[playerArray.length-1]
	window.connections = snap.val();
	$("#current-matches").text(currentMatches + " players currently joined.");
	//$("#waiting").text(playersWaiting + " player(s) waiting for a match");
	$("#center-chips").text(centerTokens);
	$("#chip-total").text(userTokens);
	playerArray.indexOf(myPlayerID);
	$("#player-number").text(playerArray.indexOf(myPlayerID)+1);
}
// When first loaded or when the connections list changes...
connectionsRef.on("value", connectionsUpdateFunc);

var childUpdateFunc = function(snap) {
	if (myPlayerID) {
		if (myPlayerID === snap.key) {
			userTokens = snap.val().userTokens;
			$("#chiptotal").text(userTokens);
		}
	}
}

connectionsRef.on("child_changed", childUpdateFunc);

$("#game-status").html('Click "Start or Join Game" to begin!<br><br><br><br><br><br><br><br><br><br><br><br>');

// --------------------------------------------------------------
// At the page load and subsequent value changes, get a snapshot of the local data.
// This function allows you to update your page in real-time when the values within the firebase node chatData changes

////////////////////////////////////
// chat functions:
////////////////////////////////////
database.ref("/chatData").on("value", function (snapshot) {
	if (snapshot.child("newComment").exists()) {
		newUserComment = snapshot.val().newComment;
		if (chatHistory[chatHistory.length - 1] !== snapshot.val().newComment)
			if (chatHistory.length > chatRowLimit) chatHistory = chatHistory.slice(1); //we only want a max of 16 comments after the push
	}
	else newUserComment = {};
	
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

// CLICK EVENT LISTENERS:
// --------------------------------------------------------------
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

////////////////////////////////////
// chat functions:
////////////////////////////////////

//This function rolls a single dice and returns the value of that dice
function rollDie() {
	let possibleDieValues = ["L","R","C","snake_eye","snake_eye","snake_eye"];
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

$("#roll-dice").on("click", function (event) {
	event.preventDefault();
	$("#dice-images").html("");
	renderDice(playerRoll(userTokens)); 
});

function renderDice(rollResultsArray) {
	
	var valChanged = false;
	var passLeft = false;
	var passRight = false;
	
	for (var i = 0; i < rollResultsArray.length; i++) {
		//Do nothing, player loses no chips 
		if (rollResultsArray[i] === "snake_eye") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/dot.png" />');
		}
		//pass chip to right of player, player loses a chip
		if (rollResultsArray[i] === "R") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/r.png" />');
			userTokens--;
			valChanged = true;
			passRight = true;
		}
		//pass chip to left, player loses a chip
		if (rollResultsArray[i] === "L") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/l.png" />');
			userTokens--;
			valChanged = true;
			passLeft = true;
		}
		//pass chip to the center pile, chip is out of circulation now , player loses a chip
		if (rollResultsArray[i] === "C") {
			$("#dice-images").append('<img class="diceimage" src="assets/images/c.png" />');
			userTokens--;
			valChanged = true;
		}
	}
	
	var leftPlayer;
	if (playerArray.indexOf(myPlayerID) === 0) leftPlayer = playerArray.length-1;
	else leftPlayer = playerArray.indexOf(myPlayerID)-1;
		
	var rightPlayer;
	if (playerArray.indexOf(myPlayerID) === playerArray.length-1) rightPlayer = 0;
	else rightPlayer = playerArray.indexOf(myPlayerID)+1;

	if (valChanged) con.update({ userTokens: userTokens });
	
	if (passLeft) {
		connections[playerArray[leftPlayer]].userTokens++;
		connectionsRef.child(playerArray[leftPlayer]).update({ userTokens: connections[playerArray[leftPlayer]].userTokens });
	}
	
	if (passRight) {
		connections[playerArray[rightPlayer]].userTokens++;
		connectionsRef.child(playerArray[rightPlayer]).update({ userTokens: connections[playerArray[rightPlayer]].userTokens });
	}
}