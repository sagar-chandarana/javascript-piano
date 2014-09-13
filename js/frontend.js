(function(){

	angular
    .module('pianoApp')
    .directive('badge', badge)
    .controller('UtilCtrl', utilCtrl)
    .controller('LoginCtrl', loginCtrl)
    .controller('UsersCtrl', usersCtrl)
    .controller('RoomsCtrl', roomsCtrl);

	function badge(){
	  return {
	    restrict: 'C',
	    scope: {
	      color: '='
	    },
	    link: function(scope, element){
	      if(scope.color) element.css('background-color', scope.color);
	    }
	  };
	};

	function utilCtrl($rootScope){
    var vm = this;
    vm.currentRoom = $rootScope.Appbase.currentRoom;
    $rootScope.$watch('Appbase.currentRoom', updateRoom);

    function updateRoom(room){
      vm.currentRoom = room;
      $rootScope.safeApply();
      /* This updates the highlighted room in the list,
         necessary because the async call happens outside of Angular */
    }

  }

	function loginCtrl(PianoFactory, AppbaseFactory){
    var vm = this;
    var color = randomColor();
    vm.setUser = setUser;
    vm.logging = false;
    vm.logged = false;

		function randomColor() {
			var colors = 'f33 33f 3f3 ff3 f3f 3ff 000 ff6347 6a5acd daa520 d2691e ff8c00 00ced1 dc143c ff1493'
		               .split(' ');
		 	return '#' + colors[Math.floor(Math.random()*colors.length)];
		}

		function setUser(username){
			if(username){
        vm.logging = true;
        PianoFactory(color);
				AppbaseFactory(username, color);
        vm.logged = true;
			}
		}

	}

  function usersCtrl($rootScope){
    var vm = this;
    vm.users = $rootScope.users;
    $rootScope.$watch('users', updateUsers);

    function updateUsers(users){
      vm.users = users;
    }
  }

  function roomsCtrl($rootScope){
    var vm = this;
    vm.createRoom = createRoom;
    vm.switchRoom = switchRoom;
    vm.rooms = $rootScope.rooms;
    vm.add = add;
    vm.adding = false;
    $rootScope.$watch('rooms', updateRooms);

    function createRoom(){
      var name = window.prompt('Set a name for the new room.');
      if(name){
        $rootScope.Appbase.createRoom(name);
      }
    }

    function switchRoom(room){
      $rootScope.Appbase.switchRoom(room);
    }

    function updateRooms(rooms){
      vm.rooms = rooms;
    }

    function add(){
      vm.adding = !vm.adding;
    }

  }


})();