(function(){

	angular
    .module('pianoApp', [])
    .run(initialConfig);

  function initialConfig($rootScope){

    $rootScope.users = [];
    $rootScope.rooms = [];
    $rootScope.Appbase = {};
    $rootScope.Piano = {};
    $rootScope.safeApply = safeApply;

    function safeApply(fn){
      var phase = this.$root.$$phase;
      if(phase == '$apply' || phase == '$digest') {
        if(fn && (typeof(fn) === 'function')) {
          fn();
        }
      } else {
        this.$apply(fn);
      }
    }

  }

})();