(function(){

  angular
    .module('pianoApp', [])
    .run(initialConfig);

  function initialConfig($rootScope){

    $rootScope.users = [];
    $rootScope.rooms = [];
    $rootScope.keyCount = initKeyCount();
    $rootScope.Appbase = {};
    $rootScope.Piano = {};
    $rootScope.safeApply = safeApply;

    function initKeyCount() {
      if (localStorage.getItem("keyCount") === null)
        localStorage.setItem("keyCount", 0);
      return parseInt(localStorage.getItem("keyCount"));
    }
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