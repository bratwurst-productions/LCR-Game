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


//usertokens should start at 3 for each player
let usertokens = 3;
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
      "usertokens": usertokens
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
	// console.log(Object.keys(snap.val()));
	window.playerArray = Object.keys(snap.val());
	if (!myPlayerID) myPlayerID = playerArray[playerArray.length-1]
	// console.log("myPlayerID: " + myPlayerID); 
	window.connections = snap.val();
	$("#current-matches").text(currentMatches + " players currently joined.");
	//$("#waiting").text(playersWaiting + " player(s) waiting for a match");
	$("#center-chips").text(centerTokens);
	$("#chiptotal").text(usertokens);
	playerArray.indexOf(myPlayerID)
	$("#player-number").text(playerArray.indexOf(myPlayerID)+1);
	
}
// When first loaded or when the connections list changes...
connectionsRef.on("value", connectionsUpdateFunc);

var childUpdateFunc = function(snap) {
	if (myPlayerID) {
		if (myPlayerID === snap.key) {
			usertokens = snap.val().usertokens;
			$("#chiptotal").text(usertokens);
		}
	}
}

connectionsRef.on("child_changed", childUpdateFunc);

// --------------------------------------------------------------
// At the page load and subsequent value changes, get a snapshot of the local data.
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


///////////////////////////////////////////////////
// game stuff below


//This function rolls a single dice and returns the value of that dice
function rollonedice() {
  let possibledicevalues = [
    "L",
    "R",
    "C",
    "snake_eye",
    "snake_eye",
    "snake_eye"
  ];
  let rand =
    possibledicevalues[Math.floor(Math.random() * possibledicevalues.length)];
  return rand;
}

//this function takes care of the players dice roll depending on the amount of tokens they have
//if the player has 4 tokens then the function will return an array of 4 dice/values
function playersroll(numberofplayerstokens) {
  let playerrollresults = [];
  for (var i = 0; i < numberofplayerstokens; i++) {
    playerrollresults.push(rollonedice());
  }
  return playerrollresults;
}



$("#rolldice").on("click", function (event) {
  $(".displaydiceimages").html("")
  renderdiceimagesfromroll(playersroll(3));
})

function renderdiceimagesfromroll(arrofdicefaces) {

var valChanged = false;
var passLeft = false;
var passRight = false;

  for (var i = 0; i < arrofdicefaces.length; i++) {

    //Do nothing, player loses no chips 
    if (arrofdicefaces[i] === "snake_eye") {
      $(".displaydiceimages").append(
        '<img class="diceimage" src="assets/Images/snake eyes dice face.png" />'
      );
    }
    //pass chip to right of player, player loses a chip
    if (arrofdicefaces[i] === "R") {
      $(".displaydiceimages").append(
        '<img class="diceimage" src="assets/Images/Rdice.png" />'
      );
      usertokens--;
	  valChanged = true;
	  passRight = true;

      // connections.ref().update({ usertokens: usertokens });
    }

    //pass chip to left, player loses a chip
    if (arrofdicefaces[i] === "L") {
      $(".displaydiceimages").append(
        '<img class="diceimage" src="assets/Images/Ldice.png" />'
      );
      usertokens--;
	  valChanged = true;
	  passLeft = true;
    }

    //pass chip to the center pile, chip is out of circulation now , player loses a chip
    if (arrofdicefaces[i] === "C") {
      $(".displaydiceimages").append(
        '<img class="diceimage" src="assets/Images/Cdice.png" />'
      );
      usertokens--;
	valChanged = true;
	
			}
	}
	
	// console.log("playerArray:");
	// console.log(playerArray);
	
//	console.log("connections");
	// console.log(connections);
	
	// console.log("playerArray.indexOf(myPlayerID)"); use this for "you are player #"
	// console.log(playerArray.indexOf(myPlayerID));
	
	var leftPlayer;
	if (playerArray.indexOf(myPlayerID) === 0) leftPlayer = playerArray.length-1;
	else leftPlayer = playerArray.indexOf(myPlayerID)-1;
	//console.log("left player:");
	//console.log(playerArray[leftPlayer]);
	
	var rightPlayer;
	if (playerArray.indexOf(myPlayerID) === playerArray.length-1) rightPlayer = 0;
	else rightPlayer = playerArray.indexOf(myPlayerID)+1;
	//console.log("right player:");
	//console.log(playerArray[rightPlayer]);
	
	if (valChanged) con.update({ usertokens: usertokens });
	
	if (passLeft) {
		connections[playerArray[leftPlayer]].usertokens++;
		connectionsRef.child(playerArray[leftPlayer]).update({ usertokens: connections[playerArray[leftPlayer]].usertokens });
	}
	
	if (passRight) {
		connections[playerArray[rightPlayer]].usertokens++;
		connectionsRef.child(playerArray[rightPlayer]).update({ usertokens: connections[playerArray[rightPlayer]].usertokens });
	}
}