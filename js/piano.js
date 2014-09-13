/*! Copyright (c) 2013 - Peter Coles (mrcoles.com)
 *  Licensed under the MIT license: http://mrcoles.com/media/mit-license.txt
 *  Modified by Appbase
 */

(function(){

  angular
    .module('pianoApp')
    .factory('PianoGenerator', pianoGenerator)
    .factory('PianoFactory', pianoFactory);


  function pianoFactory($rootScope, PianoClass){
    return function(color){
      var myColor = color;
      var colors = {};
      var piano = PianoGenerator(triggerKey, getColor); // Piano instance

      $rootScope.Piano = {
        playKeyInTheView: playKeyInTheView
      };

      //Mouse and keyboard events call below function.
      var myColor = color;
      
      function triggerKey(key) { //mnvr
        playKeyInTheView(key, myColor);
        $rootScope.Appbase.pushToAppbase(key);
      }

      function playKeyInTheView(key, color) {
        colors[key] = color;
        piano.trigger('note-'+key+'.play');
      }
      
      function getColor(key) {
        return colors[key] || "#fff";
      }

    }
  }

  function pianoClass(){
    return function(triggerKey, getColor){
      //
      // Setup keys!
      //

      var notesOffset = 0;

      var blackKeys = {
        1: 1,
        3: 3,
        6: 1,
        8: 2,
        10: 3
      };
      $.each(blackKeys, function(k, v) {
        blackKeys[k] = ' black black'+v;;
      });

      function blackKeyClass(i) {
        return blackKeys[(i % 12) + (i < 0 ? 12 : 0)] || '';
      }

      var $keys = $('<div>', {'class': 'keys'}).appendTo('#piano');

      var buildingPiano = false;

      var isIos = navigator.userAgent.match(/(iPhone|iPad)/i);

      function buildPiano() {
        if (buildingPiano) return;
        buildingPiano = true;

        $keys.trigger('build-start.piano');
        $keys.empty().off('.play');

        function addKey(i) {
          var dataURI = isIos ? '' : Notes.getDataURI(i);

          // trick to deal with note getting hit multiple times before finishing...
          var sounds = [
            new Audio(dataURI),
            new Audio(dataURI),
            new Audio(dataURI)
          ];
          var curSound = 0;
          var pressedTimeout;
          dataURI = null;
          function play(evt) {
            // sound
            sounds[curSound].pause();
            try {
              sounds[curSound].currentTime = 0.001; //HACK - was for mobile safari, but sort of doesn't matter...
            } catch (x) {
              console.log(x);
            }
            sounds[curSound].play();
            curSound = ++curSound % sounds.length;

            var $k = $keys.find('[data-key='+i+']').addClass('pressed');

            //TODO - it'd be nice to have a single event for triggering and reading
            $keys.trigger('played-note.piano', [i, $k]);

            // visual feedback
            window.clearTimeout(pressedTimeout);
            pressedTimeout = window.setTimeout(function() {
              $k.removeClass('pressed');
            }, 200);
          }
          $keys.on('note-'+i+'.play', play);
          var $key = $('<div>', {
            'class': 'key' + blackKeyClass(i),
            'data-key': i,
            mousedown: function(evt) { triggerKey(i); }
          }).appendTo($keys);
        }

        // delayed for-loop to stop browser from crashing :'(
        // go slower on Chrome...
        var i = -12, max = 14, addDelay = /Chrome/i.test(navigator.userAgent) ? 80 : 0;
        (function go() {
          addKey(i + notesOffset);
          if (++i < max) {
            window.setTimeout(go, addDelay);
          } else {
            buildingPiano = false;
            $keys.trigger('build-done.piano');
          }
        })();
      }

      buildPiano();


      //
      // Setup synth controls
      //

      function camelToText(x) {
        x = x.replace(/([A-Z])/g, ' $1');
        return x.charAt(0).toUpperCase() + x.substring(1);
      }

      //
      // Setup keyboard interaction
      //

      var keyNotes = {
        /*a*/ 65: 0, // c
        /*w*/ 87: 1, // c#
        /*s*/ 83: 2, // d
        /*e*/ 69: 3, // d#
        /*d*/ 68: 4, // e
        /*f*/ 70: 5, // f
        /*t*/ 84: 6, // f#
        /*g*/ 71: 7, // g
        /*y*/ 89: 8, // g#
        /*h*/ 72: 9, // a
        /*u*/ 85: 10, // a#
        /*j*/ 74: 11, // b
        /*k*/ 75: 12, // c
        /*o*/ 79: 13, // c#
        /*l*/ 76: 14, // d
        /*p*/ 80: 15, // d#
        /*;*/ 186: 16, // e
        /*;*/ 59: 16, // e ... gotta figure out why it's sometimes 186 and sometimes 59
        /*,*/ 222: 17, // f
        /*]*/ 221: 18, // f#
        /*enter*/ 13: 19 // g
      };
      var notesShift = -12;
      var downKeys = {};

      function isModifierKey(evt) {
        return evt.metaKey || evt.shiftKey || evt.altKey;
      }

      $(window).keydown(function(evt) {
        var keyCode = evt.keyCode;
        // prevent repeating keys
        if (!downKeys[keyCode] && !isModifierKey(evt)) {
          downKeys[keyCode] = 1;
          var key = keyNotes[keyCode];
          if (typeof key != 'undefined') {
            triggerKey(key+notesShift+notesOffset);
            evt.preventDefault();
          }
        }
      }).keyup(function(evt) {
          delete downKeys[evt.keyCode];
        });

      //
      // Help controls
      //

      var $help = $('.help');

      $(window).click(function(evt) {
        var $closestHelp = $(evt.target).closest('.help');
        if (!((evt.target.nodeName == 'A' || ~evt.target.className.search('hold')) && $closestHelp.length) &&
          ($closestHelp.length || $help.hasClass('show'))) {
          $help.toggleClass('show');
        }
      });

      var qTimeout, qCanToggle = true;;
      $(window).keypress(function(evt) {
        // trigger help when ? is pressed, but make sure it doesn't repeat crazy
        if (evt.which == 63 || evt.which == 48) {
          window.clearTimeout(qTimeout);
          qTimeout = window.setTimeout(function() {
            qCanToggle = true;
          }, 1000);
          if (qCanToggle) {
            qCanToggle = false;
            $help.toggleClass('show');
          }
        }
      });

      window.setTimeout(function() {
        $help.removeClass('show');
      }, 700);

      // prevent quick find...
      $(window).keydown(function(evt) {
        if (evt.target.nodeName != 'INPUT' && evt.target.nodeName != 'TEXTAREA') {
          if (evt.keyCode == 222) {
            evt.preventDefault();
            return false;
          }
        }
        return true;
      });

      //
      // Scroll nav
      //
      $.each([['#info', '#below'], ['#top', '#content']], function(i, x) {
        $(x[0]).click(function() {
          $('html,body').animate({
            scrollTop: $(x[1]).offset().top
          }, 1000);
        });
      });

      //
      // Silly colors
      //
      (function() {
        var shouldAnimate = true,
          $piano = $('#piano'),
          W = $piano.width(),
          H = 200,
          $canvas = $('<canvas>', {
            css: {
              position: 'fixed',
              top: ($piano.offset().top + $piano.outerHeight() - 1) + 'px',
              // left: '50%',
              // marginLeft: Math.floor(-W/2) + 'px', // need to figure this out...
              width: W,
              height: H
            }
          })
            .attr('width', W)
            .attr('height', H)
            .prependTo('#piano'),
          canvas = $canvas.get(0),
          ctx = canvas.getContext('2d');

        function getData(note) {
          var data = [], freq = Notes.noteToFreq(note), vol = 1, sampleRate = 2024, secs = .1;
          var volumeFn = DataGenerator.volume.default;
          var styleFn = DataGenerator.style.default;
          var maxI = sampleRate * secs;
          for (var i=0; i<maxI; i++) {
            var sf = styleFn(freq, vol, i, sampleRate, secs, maxI);
            data.push(volumeFn(
              styleFn(freq, vol, i, sampleRate, secs, maxI),
              freq, vol, i, sampleRate, secs, maxI));
          }
          return data;
        }

        var keyToData = {},
          keyAnimCounts = {};

        $keys.on('build-done.piano', function() {
          $keys.find('.key').each(function() {
            var key = $(this).data('key');
            keyToData[key] = getData(key);
          });
        });

        $keys.on('played-note.piano', function(evt, key, $elt) {
          if (!shouldAnimate) return;

          var eOffset = $elt.offset(),
            eWidth = $elt.width(),
            cOffset = $canvas.offset(),
            startX = (eOffset.left + eWidth/2) - cOffset.left,
            startY = 0,
            endY = 200,
            amplitude = 8,
            data = keyToData[key],
            animCount = keyAnimCounts[key] = (keyAnimCounts[key] || 0) + 1;

          if (!data) return;

          var len = data.length,
            maxTime = 500,
            stepRate = 80,
            cleanupStepDelay = 8,
            steps = Math.floor(maxTime / stepRate),
            iPerStep = len / steps,
            yPerStep = (endY - startY) / steps,
            yIncrement = yPerStep / iPerStep,
            step = 0,
            i = 0,
            color = getColor(key);

          // startY -> endY in steps
          // each step is yPerStep = (endY - startY) / steps long
          // each step covers iPerStep = len / steps data points
          //     at an increment of yIncrement = yPerStep / iPerStep

          (function draw() {

            if (step < steps) {
              ctx.strokeStyle = color;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              var newMax = i + iPerStep, first = true;
              for (; i<=newMax; i++) {
                startY += yIncrement;
                ctx[first ? 'moveTo' : 'lineTo'](startX + data[i]*amplitude, startY);
                first = false;
                if (startY > H) return;
              }
              i--; // keep an overlap between draws
              startY -= yIncrement;
              ctx.stroke();
            }

            if (keyAnimCounts[key] == animCount && step >= cleanupStepDelay) {
              var cleanupStep = step - cleanupStepDelay;
              ctx.clearRect(startX - amplitude - 5, yPerStep * cleanupStep,
                (amplitude + 5) * 2, yPerStep * (cleanupStep + 1));
            }

            if (++step < steps + cleanupStepDelay) {
              window.setTimeout(draw, stepRate);
            }
          })();
        });
      })();

      return $keys;
    } 
  } 

})();