(function(){

  /* To do:
   * Front-end separation
   * Remove unecessary functions from scope
   * OK - Timeout feature
   * IP - Keys should reference usersRef/edge and have a key property
   * OK - Register the piano as a dependency so it's not in the window
   * Don't let it send to appbase if keysref is not defined
   * Show number of users in room
   */

  var pianoApp = angular.module('pianoApp');

  pianoApp.factory('Appbase', function($rootScope){
    return function(username, randomColor){
      Appbase.credentials("piano", "a659f26b2eabb4985ae104ddcc43155d");
      var namespace = 'pianoapp/piano/';
      var mainRef = Appbase.ref(namespace);
      var currentRoom, removeListeners, keysRef, usersRef, userRef, userUUID, myColor=randomColor;

      var getTime = function(){
        var retVal = new Date();
        return retVal.valueOf();
      }

      var createUser = function(name, color){
        userUUID = Appbase.uuid();
        userRef = Appbase.create('user', userUUID);
        userRef.setData({name: name, color: color, time: getTime()}, throwIfError);

        mainRef.on('edge_added', function(error, edgeRef, edgeSnap){ //new room
          var handler = edgeRef.on('properties', function(error, ref, vSnap){
            edgeRef.off(handler);
            updateList(vSnap.properties().name, edgeSnap.name()); //add the room to the list
            if(!currentRoom) setRoom(edgeRef);
            //set user's room when first ran and when new room is created
            else updateHighlight();
          });
        });

        $(window).bind('beforeunload', events.window); // remove user if tab closes
      };

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

        removeListeners = function(){
          $rootScope.users = [];
          clearInterval(interval);
          events.usersRef.usersPropRefs.forEach(function(each){
            each.off();
          });
          events.usersRef.usersPropRefs = [];
          usersRef.removeEdge(userUUID);
          keysRef.off();
          usersRef.off();
        }
      };

      var updateHighlight = function(){
        // $scope.currentRoom = currentRoom;
        // $rootScope.$safeApply();
      }

      var events = {
        keyRef : {
          edge_added : function (error, edgeRef, edgeSnap) {
            throwIfError(error);
            var keyObj = decodeKey(edgeSnap.name());
            //ignore if key is from this user
            if(userUUID !== keyObj.userUUID) {
              $rootScope.Piano.playKeyInTheView(keyObj.key, keyObj.color, keyObj.name);
            }
          }
        }, 
        usersRef : {
          usersPropRefs : [],
          edge_added : function (error, edgeRef, edgeSnap) {
            throwIfError(error);
            events.usersRef.usersPropRefs.push(edgeRef);
            edgeRef.on('properties', function(error, ref, vSnap) {
              throwIfError(error);
              //edgeRef.off(); this is now done on setRoom
              var updated = false;
              var thisTime = getTime(), theirTime = vSnap.properties().time;
              $rootScope.users.forEach(function(each){
                if(each.id === edgeSnap.name()){ //there's already a user with this ID
                  each.time = theirTime;
                  updated = true;
                }
              });
              if(!updated && theirTime > thisTime - events.timePolling.timeout){
              //there are no users with that ID && their time is greater than the timeout threshold
                $rootScope.users.push({
                  name: vSnap.properties().name,
                  color: vSnap.properties().color,
                  id: edgeSnap.name(),
                  time: theirTime
                });
              }
              $rootScope.$safeApply();
            });
          },
          edge_removed : function (error, edgeRef, edgeSnap) {
            throwIfError(error);
            $rootScope.users = $rootScope.users.filter(function(each){
              return each.id !== edgeSnap.name();
            });
          }
        },
        window : function(eventObject) {
          var returnValue = 'Are you sure you want to close the window?';
          eventObject.returnValue = returnValue;
          usersRef.removeEdge(userUUID, throwIfError);
          return returnValue;
        },
        timePolling : {
          interval : 60000, // 1 minute
          timeout : 600000, // 10 minutes
          update : function(){
            var now = getTime();
            userRef.setData({time: now});
            $rootScope.users = $rootScope.users.filter(function(each){
              return each.time > now - events.timePolling.timeout;
            }); //if their time is greater than the timeout barrier, keep. else, remove
          }
        }
      };


      var updateList = function(name, id){
        $rootScope.rooms.push({name: name, id: id});
        $rootScope.$safeApply();
      };

      var throwIfError = function(error) {
        if(error) throw Error;
      }

      var createRoom = function(name){
        var roomID = Appbase.uuid();
        var roomRef = Appbase.create('room', roomID);
        roomRef.setData({name: name}, function(){
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

      createUser(username, randomColor);
      $rootScope.Appbase = {
        getCurrentRoom: function(){
          return currentRoom
        },
        pushToAppbase: function(key){
          keysRef.setEdge(keysRef, encodeKey(key, userUUID), throwIfError);
        },
        createRoom: function(name){
          createRoom(name);
        }
      };
    };
  });

})();