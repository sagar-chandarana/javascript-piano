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

	pianoApp.run(function($rootScope){
	  $rootScope.$safeApply = function(fn){
	    var phase = this.$root.$$phase;
	    if(phase == '$apply' || phase == '$digest') {
	      if(fn && (typeof(fn) === 'function')) {
	        fn();
	      }
	    } else {
	      this.$apply(fn);
	    }
	  };
	});


})()