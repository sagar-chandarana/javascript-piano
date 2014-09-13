(function(){

	var pianoApp = angular.module('pianoApp');

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

	pianoApp.controller('RoomsCtrl', function($scope, $rootScope){
    $rootScope.rooms = [];
    $rootScope.$watch('Appbase.getCurrentRoom()', function(value){
      $scope.currentRoom = value;
    });
    $scope.addRoom = function(name){
      name = name || 'test';
      $rootScope.Appbase.addRoom(name);
    }
  });

	pianoApp.controller('UsersCtrl', function($scope, $rootScope){
    $rootScope.users = [];
	});

	pianoApp.controller('LoginCtrl', function($scope, Appbase, Piano){
		var randomColor = function() {
			var colors = 'f33 33f 3f3 ff3 f3f 3ff 000 ff6347 6a5acd daa520 d2691e ff8c00 00ced1 dc143c ff1493'
		               .split(' ');
		 	return '#' + colors[Math.floor(Math.random()*colors.length)];
		}

		$scope.login = function(username){
			if(username){
        Piano(randomColor);
				Appbase(username, randomColor);
			}
		};
	})

})()