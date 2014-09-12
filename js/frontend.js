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

})()