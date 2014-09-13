(function(){

  /* To do:
   * IP - Keys should reference usersRef/edge and have a key property
   * Show number of users in room
   */

  angular
    .module('pianoApp')
    .factory('AppbaseFactory', appbase);


  function appbase($rootScope, $interval, $location){
    return function(username, myColor){
      Appbase.credentials("piano", "a659f26b2eabb4985ae104ddcc43155d");
      var namespace = 'pianoapp/piano/';
      var mainRef = Appbase.ref(namespace);
      var currentRoom, removeListeners, keysRef, usersRef, userRef, userUUID;

      $rootScope.Appbase = {
        currentRoom: currentRoom,
        pushToAppbase: pushToAppbase,
        createRoom: function(name){
          createRoom(name);
        },
        switchRoom: function(room){
          room = Appbase.ref(namespace + room);
          setRoom(room);
        }
      };

      var events = {
        keyRef : {
          edge_added : function (error, edgeRef, edgeSnap) {
            throwIfError(error);

            var obj = decodeKey(edgeSnap.name());
            if(userUUID !== obj.user){
              $rootScope.Piano.playKeyInTheView(obj.key, obj.color);
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
              //edgeRef.off(); this is done on setRoom's removeListener
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
              $rootScope.safeApply();
            });
          },
          edge_removed : function (error, edgeRef, edgeSnap) {
            throwIfError(error);
            $rootScope.users = $rootScope.users.filter(function(each){
              return each.id !== edgeSnap.name();
            });
            $rootScope.safeApply();
          }
        },
        window : function(eventObject) {
          var returnValue = 'Are you sure you want to close the window?';
          eventObject.returnValue = returnValue;
          usersRef.removeEdge(userUUID, throwIfError);
          return returnValue;
        },
        timePolling : {
          interval : 30000, // 30 seconds
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

      createUser(username, myColor);

      function createUser(name, color){
        userUUID = Appbase.uuid();
        userRef = Appbase.create('user', userUUID);
        userRef.setData({name: name, color: color, time: getTime()}, throwIfError);

        mainRef.on('edge_added', function(error, edgeRef, edgeSnap){ //new room
          var handler = edgeRef.on('properties', function(error, ref, vSnap){
            edgeRef.off(handler);
            updateList(vSnap.properties().name, edgeSnap.name()); //add the room to the list
            if(!currentRoom) {
              setRoom(edgeRef);
            }
            //set user's room when first ran and when new room is created
          });
        });

        $(window).bind('beforeunload', events.window); // remove user if tab closes
      }

      function setRoom(room){
        var newRoom = room.path().replace(namespace, '');
        if(newRoom === currentRoom) {
          return; // No need to switch, inside the room.
        } else {
          currentRoom = newRoom;
        }
        
        // Check if it's the first run to set room to hash, or if it's not the first remove listeners
        if(!removeListeners){
          // first run, check for hash
          if($location.hash()) {
            currentRoom = $location.hash();
            room = Appbase.ref(namespace + currentRoom);
          }
        } else {
          removeListeners();
        }

        $location.hash(currentRoom);

        keysRef = Appbase.ref(room.path() + '/keys');
        usersRef = Appbase.ref(room.path() + '/users');

        // set users edge to yourself. you were already removed from the room.
        // when it's set, grab users list.
        // This is done after listeners are called off.
        usersRef.on('edge_added', events.usersRef.edge_added); //Listening for users
        usersRef.setEdge(userRef, userUUID, throwIfError); //Register the user inside the room
        keysRef.on('edge_added', events.keyRef.edge_added, true); //Listening for keys from Appbase
        usersRef.on('edge_removed', events.usersRef.edge_removed, true);
        
        var interval = $interval(events.timePolling.update, events.timePolling.interval);
        $rootScope.Appbase.currentRoom = currentRoom;

        removeListeners = function(){
          $rootScope.users = [];
          $interval.cancel(interval);
          events.usersRef.usersPropRefs.forEach(function(each){
            each.off();
          });
          events.usersRef.usersPropRefs = [];
          usersRef.removeEdge(userUUID);
          keysRef.off();
          usersRef.off();
        };
      };

      function updateList(name, id){
        $rootScope.rooms.push({name: name, id: id});
        $rootScope.safeApply();
      };

      function throwIfError(error) {
        if(error){
          throw error;
        }
      }

      function createRoom(name){
        var roomID = Appbase.uuid();
        var roomRef = Appbase.create('room', roomID);

        async.parallel([
          setRoomData,
          setRoomUsers,
          setRoomKeys
        ], callback );

        function setRoomData(callback){
          roomRef.setData({name: name}, callback);
        }
        function setRoomUsers(callback){
          roomRef.setEdge(Appbase.create('misc', Appbase.uuid()), 'users', callback);
        }
        function setRoomKeys(callback){
          roomRef.setEdge(Appbase.create('misc', Appbase.uuid()), 'keys', callback);
        }
        function callback(error){
          throwIfError(error);
          currentRoom = false;
          mainRef.setEdge(roomRef, roomID, throwIfError);
        }

      }

      function encodeKey(key) {
        return key.toString()
          + '_' + userUUID
          + '_' + myColor
          + '_' + Appbase.uuid();
      }

      function decodeKey(edgeName) {
        edgeName = edgeName.split('_');
        return {
          key: parseInt(edgeName[0]),
          user: edgeName[1],
          color: edgeName[2],
          keyuuid: edgeName[3]
        };
      }

      function getTime(){
        var retVal = new Date();
        return retVal.valueOf();
      }

      function pushToAppbase(key){
        keysRef.setEdge(keysRef, encodeKey(key), throwIfError);
      }

    };
  }

})();