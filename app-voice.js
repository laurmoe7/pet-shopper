// Adding to the list by voice: the mic button, the speech language option and the "Add by voice" shortcut.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- voice ----------
/**
 * The speech engine. The web version uses the browser's SpeechRecognition (Chrome, Safari). A store app swaps this one
 * object for the phone's own recognition: `listen` starts, and calls back with text so far (`onText(text, final)`),
 * an error (`onError(code)`: 'not-allowed', 'no-speech', ...), and when it stops (`onEnd`). It returns `{ stop }`.
 */
var Voice = (function () {
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  return {
    supported: !!Rec,
    listen: function (lang, onText, onError, onEnd) {
      var rec = new Rec();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = function (e) {
        var text = '', final = false;
        for (var i = 0; i < e.results.length; i++) { text += e.results[i][0].transcript; if (e.results[i].isFinal) final = true; }
        onText(text, final);
      };
      rec.onerror = function (e) { onError(e.error); };
      rec.onend = onEnd;
      rec.start();
      return { stop: function () { try { rec.stop(); } catch (e) { /* already stopped */ } } };
    }
  };
})();

var micBtn = $('micBtn'), listening = null, heard = '', voiceFailed = false;
var VOICE_LANGS = [['auto', 'Auto'], ['en-GB', 'English'], ['nl-NL', 'Nederlands']];
var voiceLang = 'auto';
try { voiceLang = localStorage.getItem('nibble-voice') || 'auto'; } catch (e) { /* storage not available */ }
/** @returns {string} The language the speech engine should listen for. */
function speechLang() { return voiceLang === 'auto' ? (navigator.language || 'en-US') : voiceLang; }

/** Stops listening and puts the face and the button back. */
function micDone() {
  if (!listening) return;
  listening = null;
  micBtn.classList.remove('on');
  micBtn.setAttribute('aria-pressed', 'false');
  addInput.placeholder = state.mode === 'todo' ? 'Add a to-do, like call mum' : 'Add an item…';
  busy--;
  if (!busy) settle();
}
/** Adds each thing that was said, one after another so each gets its reaction. */
function addSpoken(text) {
  var items = L.splitSpoken(text, state.mode);
  if (!items.length) { say('hm? say it again?', 1500); return; }
  items.forEach(function (t, i) { setTimeout(function () { addItem(t); }, i * 450); });
}
/** Starts listening (a second tap stops it). @param {boolean} [auto] Started by the shortcut rather than a tap. */
function listenNow(auto) {
  if (listening) { listening.stop(); return; }
  heard = '';
  voiceFailed = false;
  busy++;
  micBtn.classList.add('on');
  micBtn.setAttribute('aria-pressed', 'true');
  addInput.placeholder = 'Listening…';
  sound('pick');
  if (baseState() !== 'sleepy') setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: ['question'] });
  try {
    listening = Voice.listen(speechLang(), function (text, final) {
      heard = text;
      addInput.value = text;
    }, function (code) {
      voiceFailed = true;
      if (code === 'not-allowed' || code === 'service-not-allowed') say(auto ? 'tap the mic to talk to me' : 'I can\'t hear you… allow the microphone?', 2600);
      else if (code === 'no-speech') say('I didn\'t hear anything', 1800);
      else if (code !== 'aborted') say('hm, I couldn\'t listen just now', 2200);
      if (auto && code === 'not-allowed') micBtn.classList.add('call');
    }, function () {
      var text = heard;
      addInput.value = '';
      micDone();
      if (text && !voiceFailed) addSpoken(text);
    });
  } catch (e) {
    listening = {};   // so micDone runs
    micDone();
    say('hm, I couldn\'t listen just now', 2200);
  }
}
if (Voice.supported) {
  micBtn.hidden = false;
  micBtn.addEventListener('click', function () { micBtn.classList.remove('call'); listenNow(false); });
}

// the "Add by voice" shortcut on the app icon opens the app with ?voice=1: listen right away
if (Voice.supported && /[?&]voice=1\b/.test(location.search)) {
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* not allowed here */ }
  setTimeout(function () { listenNow(true); }, 1600);
}

// the speech language, in Options next to Appearance
if (Voice.supported) {
  var voiceRow = document.createElement('div');
  voiceRow.className = 'option option-theme';
  voiceRow.innerHTML = '<span class="option-title">Voice language</span>';
  var voiceBtns = document.createElement('span');
  voiceBtns.className = 'theme-btns';
  VOICE_LANGS.forEach(function (l) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'pill-btn'; b.textContent = l[1];
    b.setAttribute('aria-pressed', String(l[0] === voiceLang));
    b.addEventListener('click', function () {
      voiceLang = l[0];
      try { localStorage.setItem('nibble-voice', l[0]); } catch (e) { /* storage not available */ }
      voiceBtns.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      sound('pick');
    });
    voiceBtns.appendChild(b);
  });
  voiceRow.appendChild(voiceBtns);
  optionsList.appendChild(voiceRow);
}
