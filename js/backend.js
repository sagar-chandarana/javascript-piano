(function(){

  /* To do:
   * Front-end separation
   * Remove unecessary functions from scope
   * Timeout feature
   * Keys should reference usersRef/edge and have a key property
   * Register the piano as a dependency so it's not in the window
   */

  var pianoApp = angular.module('pianoApp', []);

  pianoApp.controller("PianoCtrl", function($scope, $piano){
    Appbase.credentials("piano", "a659f26b2eabb4985ae104ddcc43155d");
    var namespace = 'pianoapp/piano/';
    var mainRef = Appbase.ref(namespace);

    $scope.rooms = [];
    $scope.users = [];
    
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
        else updateHighlight();
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
      
      updateHighlight(); //highlight the current room
      var interval = setInterval(events.timePolling.update, events.timePolling.interval);
      $(window).bind('beforeunload', events.window);

      removeListeners = function(){
        $scope.users = [];
        clearInterval(interval);
        usersRef.removeEdge(userUUID);
        $(window).unbind('beforeunload');
        keysRef.off();
        usersRef.off();
      }
    };

    var updateHighlight = function(){
      $scope.currentRoom = currentRoom;
      $scope.$apply();
    }

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
            //edgeRef.off(); 
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
      },
      timePolling : {
        interval : 60000,
        update : function(){

        }    
      }
    };

    $scope.roomClick = function(id){
      setRoom(Appbase.ref(namespace + id));
    }

    $scope.createRoom = function(){
      createRoom();
    }

    var updateList = function(name, id){
      $scope.rooms.push({name: name, id: id});
      $scope.$apply();
    };

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

    var piano = $piano(triggerKey, getColor); // Piano instance

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

})();