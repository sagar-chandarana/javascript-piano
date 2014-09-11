var pianoApp = angular.module('pianoApp', []);

pianoApp.directive("badge", function(){
  return {
    restrict: 'C',
    scope: {
      color: '='
    },
    link: function(scope, element){
      if(scope.color) element.css('background-color', scope.color);
    }
  };
});

pianoApp.controller("PianoCtrl", function($scope){
  $scope.rooms = [];
  $scope.users = [];

  Appbase.credentials("piano", "a659f26b2eabb4985ae104ddcc43155d");
  var namespace = 'pianoapp/piano/';
  var mainRef = Appbase.ref(namespace);
  
  //User name and color

  //chooses a random color
  function choice(x) {
    return x[Math.floor(Math.random()*x.length)];
  }
  var myColor = '#' +
      choice('f33 33f 3f3 ff3 f3f 3ff 000 ff6347 6a5acd daa520 d2691e ff8c00 00ced1 dc143c ff1493'.split(' '));

  var myName;
  do {
    myName = prompt("enter your handle (alphanumeric only)");
  } while(!myName);
  var userUUID = Appbase.uuid();
  var userRef = Appbase.create('user', userUUID);
  userRef.setData({name: myName, color: myColor}, throwIfError);

  var currentRoom;
  mainRef.on('edge_added', function(error, edgeRef, edgeSnap){ //new room
    var handler = edgeRef.on('properties', function(error, ref, vSnap){
      edgeRef.off(handler);
      updateList(vSnap.properties().name, edgeSnap.name()); //add the room to the list
      if(!currentRoom) setRoom(edgeRef);  //set user's room when first ran and when new room is created
      else updateHighlight('#' + currentRoom);
    });
  });

  var removeListeners, keysRef, usersRef;
  var setRoom = function(room){
    var newRoom = room.path().replace(namespace, '');
    if(newRoom === currentRoom) return; // No need to switch, inside the room.
    else currentRoom = newRoom;

    // Check if it's the first run to set room to hash, or if it's not the first remove listeners
    removeListeners ? removeListeners() : (function(){
      // first run, check for hash
      if(window.location.hash) {
        currentRoom = window.location.hash.substring(1);
        room = Appbase.ref(namespace + currentRoom);
      }
    })();

    window.location.hash = currentRoom;

    keysRef = Appbase.ref(room.path() + '/keys');
    usersRef = Appbase.ref(room.path() + '/users');

    // set users edge to yourself. you were already removed from the room.
    // when it's set, grab users list.
    // This is done after listeners are called off.
    usersRef.on('edge_added', events.usersRef.edge_added); //Listening for users
    usersRef.setEdge(userRef, userUUID, throwIfError); //Register the user inside the room
    keysRef.on('edge_added', events.keyRef.edge_added, true); //Listening for keys from Appbase
    usersRef.on('edge_removed', events.usersRef.edge_removed, true);
    
    var roomSelector = '#'+currentRoom;
    updateHighlight(roomSelector); //highlight the current room
    $(window).bind('beforeunload', events.window);

    removeListeners = function(){
      $(roomSelector).removeClass('disabled');
      usersRef.removeEdge(userUUID);
      $('#usernames').html('');
      $(window).unbind('beforeunload');
      keysRef.off();
      usersRef.off();
    }
  };

  var updateHighlight = function(){
    $scope.currentRoom = currentRoom;
    $scope.$apply();
  }

  $(document).ready(function(){$('#addRoom').on('click', createRoom)});

  var events = {
    keyRef : {
      edge_added : function (error, edgeRef, edgeSnap) {
        throwIfError(error);
        var keyObj = decodeKey(edgeSnap.name());
        //ignore if key is from this user
        if(userUUID !== keyObj.userUUID) {
          playKeyInTheView(keyObj.key, keyObj.color, keyObj.name);
        }
      }
    }, 
    usersRef : {
      edge_added : function (error, edgeRef, edgeSnap) {
        throwIfError(error);
        edgeRef.on('properties', function(error, ref, vSnap) {
          throwIfError(error);
          edgeRef.off();
          $scope.users.push({
            name: vSnap.properties().name,
            color: vSnap.properties().color,
            id: edgeSnap.name()
          });
          $scope.$apply();
        });
      },
      edge_removed : function (error, edgeRef, edgeSnap) {
        throwIfError(error);
        $scope.users.filter(function(each){
          return each.id !== edgeSnap.name();
        });
      }
    },
    window : function(eventObject) {
      var returnValue = 'Close?';
      eventObject.returnValue = returnValue;
      usersRef.removeEdge(userUUID, throwIfError);
      return returnValue;
    }
  }

  $scope.roomClick = function(id){
    setRoom(Appbase.ref(namespace + id));
  }

  $scope.getCurrentRoom = function(){
    return currentRoom;
  }

  var updateList = function(name, id){
    $scope.rooms.push({name: name, id: id});
    $scope.$apply();
  };

  //old
  // var keysRef = Appbase.ref('try/piano1/keys');

  var throwIfError = function(error) {
    if(error) throw Error;
  }

  var createRoom = function(){
    var roomName;
    do {
      roomName = prompt("enter room name (alphanumeric only)");
    } while(!roomName);
    var roomID = Appbase.uuid();
    var roomRef = Appbase.create('room', roomID);
    roomRef.setData({name: roomName}, function(){
      roomRef.setEdge(Appbase.create('misc', Appbase.uuid()), 'users', function(){
        roomRef.setEdge(Appbase.create('misc', Appbase.uuid()), 'keys', function(){
          currentRoom = false;
          mainRef.setEdge(roomRef, roomID, throwIfError);
        });
      });
    });
  }

  var encodeKey = function(key, userUUID) {
    return key.toString() + '_' + userUUID + (myColor!== undefined? '_' + myColor + '_' + myName : '');
  }

  var decodeKey = function(edgeName) {
    edgeName = edgeName.split('_');
    return {key: parseInt(edgeName[0]), userUUID: edgeName[1], color: edgeName[2], name: edgeName[3]};
  }

  var pushToAppbase = function(key) {
    keysRef.setEdge(keysRef, encodeKey(key, userUUID), throwIfError);
  }

  //Mouse and keyboard events call below function.
  var triggerKey = function(key) {
    playKeyInTheView(key, myColor, myName);
    pushToAppbase(key);
  }

  var colors = {};
  var getColor = function(key) {
    return colors[key] || "#fff";
  }

  var piano = new Piano(triggerKey, getColor); // Piano instance
  //var piano;
  // This function plays a key.
  var playKeyInTheView = function(key, color, name) {
    colors[key] = color;
    piano.trigger('note-'+key+'.play');
  }

  var invertColor = function (hexTripletColor) {
    var color = hexTripletColor;
    color = color.substring(1);           // remove #
    color = parseInt(color, 16);          // convert to integer
    color = 0xFFFFFF ^ color;             // invert three bytes
    color = color.toString(16);           // convert to hex
    color = ("000000" + color).slice(-6); // pad with leading zeros
    color = "#" + color;                  // prepend #
    return color;
  } 
});