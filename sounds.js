/* Fumu's sounds, synthesised with the Web Audio API (no audio files).
 * Sounds.play(kind) where kind is one of:
 *   chomp, crunch, squish, jiggle, glug, slurp, sip, sweet, spicy, mystery, huh, spit, party, birthday (the Happy Birthday tune), christmas (Jingle Bells), halloween (a spooky-cute tune), newyear (a disco groove), easter (a bouncy spring tune), peep (a chick), blower and blowerbig (party blower toots),
 *   ooh (curious, for pointing at an outfit), excited (trying an outfit on),
 *   toss, bounce, squeak (the toy), tuck (tucking in at bedtime), lullaby (a hum for him while he sleeps), bell, tink and smash (the night bell ringing, clinking and breaking), glass (a piece of window breaking off, the wrecking ball), snore and snorebig (tucked in), owl, crickets (at night), yawn, click (the lamp's pull-cord),
 *   tongue (the frog catching the toy), kiss (a goodnight kiss),
 *   notice (Claude's note arriving), done, sparkle, coin, ring (ticking off a to-do), stamp (the check mark landing), scribble (writing on the clipboard), shutter (the dressing room's camera),
 *   and menu sounds: tap, pick, open, close, on, off, locked, place, remove
 * Every play is pitch-shifted a little, and kinds with several variants pick a
 * different one each time, so nothing sounds exactly the same twice in a row.
 * Sounds.unlock() must run inside a tap once, so phones allow audio later.
 */
(function (root) {
  'use strict';

  var ctx = null, master = null, noiseBuf = null;
  // the random pitch for the sound playing now; tone() and noise() scale by it
  var pitch = 1;

  /**
   * Creates the audio engine on first use: a context, a soft compressor and a noise buffer.
   * @returns {?AudioContext} Null when Web Audio is missing.
   */
  function init() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp);
    comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  /** Wakes audio up from inside a tap, which phones require before any later sound can play. */
  function unlock() {
    try {
      if (!init()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      // a silent blip, which iOS needs before it plays anything from a timer
      var g = ctx.createGain(); g.gain.value = 0;
      var o = ctx.createOscillator(); o.connect(g); g.connect(master);
      o.start(); o.stop(ctx.currentTime + 0.01);
    } catch (e) { /* no audio */ }
  }

  /**
   * @param {number} a
   * @param {number} b
   * @returns {number} A random number between a and b.
   */
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /**
   * A gain envelope: silence, up to peak in a seconds, back to silence over d seconds.
   * @param {number} t Start time.
   * @param {number} a Attack in seconds.
   * @param {number} d Decay in seconds.
   * @param {number} peak
   * @returns {GainNode} Connected to the output.
   */
  function env(t, a, d, peak) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    g.connect(master);
    return g;
  }
  /**
   * Plays filtered noise into a node.
   * @param {number} t
   * @param {number} dur
   * @param {BiquadFilterType} filterType
   * @param {number} freq
   * @param {number} q
   * @param {AudioNode} out
   * @returns {BiquadFilterNode} The filter, so callers can sweep it.
   */
  function noise(t, dur, filterType, freq, q, out) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.setValueAtTime(freq * pitch, t); f.Q.value = q || 1;
    src.connect(f); f.connect(out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur);
    return f;
  }
  /**
   * Plays a tone, optionally sliding to a second pitch.
   * @param {number} t
   * @param {number} dur
   * @param {OscillatorType} type
   * @param {number} f0 Start frequency.
   * @param {?number} f1 End frequency, or null to hold.
   * @param {AudioNode} out
   * @returns {OscillatorNode}
   */
  function tone(t, dur, type, f0, f1, out) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0 * pitch, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1 * pitch, t + dur);
    o.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
    return o;
  }

  // ---- building blocks ----

  /**
   * One juicy bite: a jaw thump plus a wet, mid-range tear.
   * @param {number} t
   * @param {?number} [bright] Centre frequency of the tear.
   * @param {number} [vol=1]
   */
  function bite(t, bright, vol) {
    vol = vol || 1;
    tone(t, 0.07, 'sine', rnd(150, 180), 70, env(t, 0.004, 0.07, 0.55 * vol));
    noise(t, 0.12, 'bandpass', bright || rnd(900, 1300), 1.4, env(t, 0.006, 0.09, 0.7 * vol));
    noise(t + 0.01, 0.08, 'lowpass', 500, 0.7, env(t + 0.01, 0.004, 0.06, 0.35 * vol));
  }
  /**
   * A crisp bite: a dry snap, then a burst of crackly grains.
   * @param {number} t
   * @param {number} vol
   */
  function crackle(t, vol) {
    // the jaw thump
    tone(t, 0.06, 'sine', rnd(150, 190), 70, env(t, 0.003, 0.06, 0.32 * vol));
    // the snap as it breaks
    noise(t, 0.035, 'bandpass', rnd(2600, 3400), 1.2, env(t, 0.001, 0.03, 0.42 * vol));
    // crumbly grains, bunched near the start and thinning out, kept under 5 kHz so it isn't harsh
    var n = 9 + Math.floor(Math.random() * 5), tt = t + 0.006;
    for (var i = 0; i < n; i++) {
      tt += rnd(0.005, 0.012) + i * 0.0015;
      var out = env(tt, 0.001, rnd(0.012, 0.025), rnd(0.16, 0.34) * vol * (1 - i / (n * 1.6)));
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000; lp.connect(out);
      noise(tt, 0.03, 'bandpass', rnd(1400, 3800), 1.6, lp);
    }
  }
  /**
   * A soft "mmf": a low muffled squash with a drooping pitch.
   * @param {number} t
   * @param {number} vol
   */
  function squash(t, vol) {
    tone(t, 0.16, 'sine', rnd(260, 300), 110, env(t, 0.01, 0.15, 0.55 * vol));
    var f = noise(t, 0.2, 'lowpass', 900, 0.9, env(t, 0.015, 0.16, 1.0 * vol));
    f.frequency.exponentialRampToValueAtTime(250 * pitch, t + 0.18);
  }
  /**
   * One gulp: an upward bubble chirp.
   * @param {number} t
   * @param {number} base Starting pitch.
   * @param {number} vol
   */
  function gulp(t, base, vol) {
    var out = env(t, 0.012, 0.11, 0.6 * vol);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(out);
    tone(t, 0.09, 'sine', base, base * 2.3, lp);
    noise(t, 0.05, 'bandpass', base * 2, 3, env(t, 0.005, 0.04, 0.12 * vol));
  }
  /**
   * A slurp: noise swept upward through a narrow filter, wobbling like bubbles.
   * @param {number} t
   * @param {number} dur
   * @param {number} from Start frequency.
   * @param {number} to End frequency.
   * @param {number} vol
   */
  function slurpSweep(t, dur, from, to, vol) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.5 * vol, t + 0.05);
    g.gain.setValueAtTime(1.5 * vol, t + dur - 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var wob = ctx.createGain(); wob.gain.value = 0.6; wob.connect(g);
    var lfo = ctx.createOscillator(); lfo.frequency.value = 28;
    var lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.4;
    lfo.connect(lfoAmt); lfoAmt.connect(wob.gain); lfo.start(t); lfo.stop(t + dur);
    g.connect(master);
    var f = noise(t, dur, 'bandpass', from, 7, wob);
    f.frequency.exponentialRampToValueAtTime(to * pitch, t + dur);
    // a little whistle riding on top
    tone(t, dur, 'sine', from * 1.1, to * 0.7, env(t, 0.05, dur - 0.05, 0.05 * vol));
  }
  /**
   * A short run of chime notes.
   * @param {number} t
   * @param {number[]} notes Frequencies in Hz.
   * @param {number} gap Seconds between notes.
   * @param {number} vol
   * @param {OscillatorType} [type="triangle"]
   */
  function chime(t, notes, gap, vol, type) {
    notes.forEach(function (hz, i) {
      tone(t + i * gap, 0.35, type || 'triangle', hz, null, env(t + i * gap, 0.005, 0.33, 0.22 * vol));
    });
  }

  // ---- the sounds ----
  var KINDS = {
    chomp: function (t) { bite(t); bite(t + 0.16, null, 0.8); bite(t + 0.31, null, 0.6); },
    crunch: function (t) { crackle(t, 1); crackle(t + rnd(0.15, 0.18), 0.9); crackle(t + rnd(0.31, 0.35), 0.75); },
    squish: function (t) { squash(t, 1); squash(t + 0.2, 0.7); },
    glug: function (t) { for (var i = 0; i < 4; i++) gulp(t + i * 0.15, 170 + i * 25, 1 - i * 0.1); },
    slurp: function (t) { slurpSweep(t, 0.5, 450, 2600, 1); },
    sip: function (t) { slurpSweep(t, 0.28, 700, 2400, 0.8); gulp(t + 0.36, 220, 0.6); },
    sweet: function (t) { bite(t, 1500, 0.8); bite(t + 0.15, 1500, 0.6); chime(t + 0.28, [1568, 2093, 2637], 0.07, 1); },
    spicy: function (t) {
      bite(t); bite(t + 0.15, null, 0.7);
      // steam hiss with a cartoon "hoo!"
      var h = ctx.createGain();
      h.gain.setValueAtTime(0.0001, t + 0.3);
      h.gain.exponentialRampToValueAtTime(0.4, t + 0.45);
      h.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      h.connect(master);
      noise(t + 0.3, 0.7, 'highpass', 3500, 0.7, h);
      tone(t + 0.32, 0.3, 'sine', 520, 980, env(t + 0.32, 0.02, 0.28, 0.12));
    },
    mystery: function (t) {
      for (var i = 0; i < 5; i++) { var tt = t + i * 0.035; noise(tt, 0.03, 'bandpass', rnd(2500, 4000), 2, env(tt, 0.002, 0.025, 0.3)); }
      chime(t + 0.2, [1047, 1319], 0.08, 0.7, 'sine');
      bite(t + 0.38, null, 0.8);
    },
    purr: function (t) {
      // a very quiet, smooth purr under two tiny rising "mrrp" chirps
      for (var i = 0; i < 14; i++) {
        var tt = t + i * 0.065;
        tone(tt, 0.09, 'sine', 150 + (i % 2) * 8, 140, env(tt, 0.025, 0.07, 0.07));
      }
      tone(t + 0.05, 0.16, 'sine', 420, 600, env(t + 0.05, 0.03, 0.13, 0.1));
      tone(t + 0.3, 0.16, 'sine', 470, 700, env(t + 0.3, 0.03, 0.13, 0.09));
    },
    huh: function (t) {
      // a questioning "hm?" then a pocket pop
      tone(t, 0.22, 'triangle', 300, 430, env(t, 0.03, 0.2, 0.25));
      tone(t + 0.35, 0.06, 'sine', 600, 250, env(t + 0.35, 0.003, 0.06, 0.35));
    },
    spit: function (t) {
      noise(t, 0.06, 'bandpass', 1800, 1.5, env(t, 0.002, 0.05, 1.1));
      tone(t + 0.02, 0.14, 'sine', 620, 190, env(t + 0.02, 0.005, 0.13, 0.6));
    },
    // Claude's note arriving: two soft bells
    bell: function (t) {
      // a bright little hand bell: ding-ding
      chime(t, [2093, 2794], 0.0, 0.8, 'sine'); chime(t + 0.16, [2093, 2794], 0.0, 0.6, 'sine'); chime(t + 0.34, [2349], 0.0, 0.35, 'sine');
    },
    bedbell: [
      // the little bell tucked in his bed, jostled by a bump: a faint clink or two
      function (t) { chime(t, [2349], 0.0, 0.16, 'sine'); chime(t + 0.07, [2794], 0.0, 0.1, 'sine'); },
      function (t) { chime(t, [2093, 2637], 0.05, 0.14, 'sine'); },
      function (t) { chime(t, [2637], 0.0, 0.17, 'sine'); chime(t + 0.09, [2093], 0.0, 0.09, 'sine'); }
    ],
    tink: function (t) {
      // one small clink of the clapper
      chime(t, [2637], 0.0, 0.45, 'sine');
    },
    smash: function (t) {
      // the bell cracks and tinkles into pieces
      noise(t, 0.12, 'highpass', 1800, 0.8, env(t, 0.003, 0.11, 0.5));
      chime(t + 0.05, [2637, 3136, 2349, 1976, 1568], 0.045, 0.5, 'triangle');
    },
    glass: function (t) {
      // a pane cracks and a piece of glass breaks off: a sharp snap and a few high tinkles
      noise(t, 0.06, 'highpass', 3500, 0.9, env(t, 0.001, 0.05, 0.75));
      noise(t + 0.02, 0.2, 'bandpass', 6200, 1.2, env(t + 0.02, 0.004, 0.17, 0.35));
      chime(t + 0.035, [4186, 3520, 5274, 3136, 4699, 3951].sort(function () { return Math.random() - 0.5; }), 0.032, 0.3, 'triangle');
    },
    lullaby: function (t) {
      // a soft little lullaby, two phrases (resting the pointer on him while he sleeps)
      chime(t, [659, 784, 988, 784], 0.34, 0.5, 'sine');
      chime(t + 1.5, [880, 784, 659], 0.36, 0.42, 'sine');
    },
    swoosh: function (t) {
      // a soft whoosh as an alert is swiped away: airy noise that glides upwards and fades
      var f = noise(t, 0.3, 'bandpass', 420, 0.7, env(t, 0.08, 0.2, 0.22));
      f.frequency.exponentialRampToValueAtTime(2300 * pitch, t + 0.26);
    },
    swooshdone: function (t) {
      // swiped to Done: the same airy whoosh, a little brighter and quicker (a whoosh only, no extra notes)
      var f = noise(t, 0.26, 'bandpass', 700, 0.7, env(t, 0.06, 0.18, 0.22));
      f.frequency.exponentialRampToValueAtTime(3200 * pitch, t + 0.2);
    },
    swooshsnooze: function (t) {
      // swiped to snooze: a slower, lower whoosh that sinks (a whoosh only, no extra notes)
      var f = noise(t, 0.4, 'bandpass', 1500, 0.8, env(t, 0.1, 0.3, 0.2));
      f.frequency.exponentialRampToValueAtTime(320 * pitch, t + 0.36);
    },
    notice: function (t) { chime(t, [988, 1319], 0.12, 0.85, 'sine'); chime(t + 0.34, [1568], 0.1, 0.5, 'sine'); },
    party: function (t) { chime(t, [523, 659, 784, 1047, 1319], 0.09, 1.1); },
    birthday: function (t) {
      // the "Happy Birthday" tune (a very old one, in the public domain) played on bells in C with a waltz under it, about 14 s: the party's length, until the cake goes (build 610)
      var u = 0.57;   // one beat
      var lead = [   // [pitch in Hz, beats]: "happy birthday to you" four times over
        [392, .75], [392, .25],
        [440, 1], [392, 1], [523, 1], [494, 2], [392, .75], [392, .25],
        [440, 1], [392, 1], [587, 1], [523, 2], [392, .75], [392, .25],
        [784, 1], [659, 1], [523, 1], [494, 1], [440, 1], [698, .75], [698, .25],
        [659, 1], [523, 1], [587, 1], [523, 3]
      ];
      var at = t;
      lead.forEach(function (n) {
        var d = Math.min(n[1] * u * 1.05, 1.3);
        tone(at, d + 0.1, 'triangle', n[0], null, env(at, 0.012, d, 0.22));
        tone(at, d + 0.1, 'sine', n[0] * 2, null, env(at, 0.012, d * 0.7, 0.05));
        at += n[1] * u;
      });
      // the waltz: a bass note on the first beat of each bar, a soft chord on the other two (the first bar starts one beat in)
      var bass = [131, 98, 98, 131, 131, 87, 98, 131], chord = [[262, 330, 392], [247, 294, 392], [247, 294, 392], [262, 330, 392], [262, 330, 392], [262, 349, 440], [247, 294, 392], [262, 330, 392]];
      for (var b = 0; b < 8; b++) {
        var bar = t + u * (1 + b * 3);
        tone(bar, 0.5, 'triangle', bass[b], null, env(bar, 0.012, 0.48, 0.24));
        for (var k = 1; k <= 2; k++) chord[b].forEach(function (hz) { tone(bar + k * u, 0.3, 'sine', hz, null, env(bar + k * u, 0.01, 0.26, 0.04)); });
      }
      chime(t + u * 25 - 0.15, [1047, 1319, 1568, 2093], 0.1, 1.2);
    },
    christmas: function (t) {
      // "Jingle Bells" (1857, in the public domain) on bells with a sleigh-bell rattle and an oom-pah bass, about 15 s: the Christmas celebration's length (build 614)
      var u = 0.46;   // one beat
      var E = 659, F = 698, G = 784, C = 523, D = 587, Cl = 1047;
      var lead = [   // [pitch in Hz, beats]
        [E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2], [E, 1], [G, 1], [C, 1.5], [D, .5], [E, 4],
        [F, 1], [F, 1], [F, 1.5], [F, .5], [F, 1], [E, 1], [E, 1], [E, .5], [E, .5], [E, 1], [D, 1], [D, 1], [E, 1], [D, 1], [G, 1], [Cl, 2]
      ];
      var at = t;
      lead.forEach(function (n) {
        var d = Math.min(n[1] * u * 1.05, 1.4);
        tone(at, d + 0.1, 'triangle', n[0], null, env(at, 0.01, d, 0.22));
        tone(at, d + 0.1, 'sine', n[0] * 2, null, env(at, 0.01, d * 0.6, 0.06));
        at += n[1] * u;
      });
      var total = at - t;
      // oom-pah: a low note on the beat, a soft chord on the off beat (C for the first half, F, then C and G)
      var chords = [[131, [262, 330, 392]], [131, [262, 330, 392]], [131, [262, 330, 392]], [131, [262, 330, 392]], [87, [262, 349, 440]], [87, [262, 349, 440]], [131, [262, 330, 392]], [98, [247, 294, 392]]];
      for (var bar = 0; bar < 8; bar++) for (var k = 0; k < 4; k++) {
        var bt = t + (bar * 4 + k) * u;
        if (bt - t > total) break;
        if (k % 2 === 0) tone(bt, 0.3, 'triangle', chords[bar][0] * (k === 2 ? 1.5 : 1), null, env(bt, 0.01, 0.28, 0.2));
        else chords[bar][1].forEach(function (hz) { tone(bt, 0.2, 'sine', hz, null, env(bt, 0.01, 0.16, 0.035)); });
      }
      // sleigh bells: a shimmer of high bright notes on every beat and a lighter one between
      for (var j = 0; j < total / (u / 2); j++) {
        var jt = t + j * (u / 2), loud = j % 2 === 0 ? 0.06 : 0.03;
        [3520, 4186, 5274].forEach(function (hz, q) { tone(jt + q * 0.012, 0.09, 'sine', hz, null, env(jt + q * 0.012, 0.002, 0.08, loud)); });
      }
      chime(t + total - 0.1, [1047, 1319, 1568, 2093], 0.1, 1.2);
    },
    halloween: function (t) {
      // spooky but cute (an original tune): a wobbly theremin voice creeping through A minor in waltz time over a plucked bass, with a church-bell toll, a ghostly "woo" and a few bat squeaks, about 15 s (build 616)
      var u = 0.41;   // one beat
      var A4 = 440, Gs4 = 415, B4 = 494, C5 = 523, Ds5 = 622, E5 = 659, D5 = 587, F5 = 698, A5 = 880;
      var lead = [
        [A4, 1.5], [Gs4, .5], [A4, 1],  [C5, 1.5], [B4, .5], [C5, 1],  [E5, 1.5], [Ds5, .5], [E5, 1],  [A5, 2], [E5, 1],
        [F5, 1.5], [E5, .5], [D5, 1],  [C5, 1.5], [B4, .5], [A4, 1],  [Gs4, 1.5], [A4, .5], [B4, 1],  [E5, 3],
        [A4, 1.5], [Gs4, .5], [A4, 1],  [C5, 1.5], [B4, .5], [C5, 1],  [E5, 1], [F5, 1], [E5, 1],  [A4, 3]
      ];
      var at = t;
      lead.forEach(function (n) {
        var d = Math.min(n[1] * u * 1.02, 1.3), o = tone(at, d + 0.12, 'sine', n[0], null, env(at, 0.05, d, 0.2));
        var lfo = ctx.createOscillator(), depth = ctx.createGain();   // the wobble that makes it sound like a theremin
        lfo.frequency.value = 5.5; depth.gain.value = n[0] * pitch * 0.012;
        lfo.connect(depth); depth.connect(o.frequency); lfo.start(at); lfo.stop(at + d + 0.14);
        tone(at, d + 0.1, 'triangle', n[0] / 2, null, env(at, 0.05, d * 0.8, 0.05));
        at += n[1] * u;
      });
      var total = at - t;
      // a plucked bass on the first beat of each bar and soft chords on the other two (Am Am Am Am Dm Am E E Am Am Dm Am)
      var bass = [110, 110, 110, 110, 147, 110, 165, 165, 110, 110, 147, 110];
      var chord = [[220, 262, 330], [220, 262, 330], [220, 262, 330], [220, 262, 330], [294, 349, 440], [220, 262, 330], [330, 415, 494], [330, 415, 494], [220, 262, 330], [220, 262, 330], [294, 349, 440], [220, 262, 330]];
      for (var bar = 0; bar < 12; bar++) {
        var b0 = t + bar * 3 * u;
        tone(b0, 0.28, 'triangle', bass[bar], null, env(b0, 0.006, 0.26, 0.26));
        for (var k = 1; k <= 2; k++) chord[bar].forEach(function (hz) { tone(b0 + k * u, 0.16, 'sine', hz, null, env(b0 + k * u, 0.006, 0.14, 0.04)); });
      }
      chime(t + 12 * u, [1760], 0.1, 0.8, 'sine'); chime(t + 24 * u, [1760, 1319], 0.12, 0.8, 'sine');   // a church bell toll at the start of the middle and last lines
      var wt = t + 22 * u, wo = tone(wt, 1.1, 'sine', 740, 330, env(wt, 0.2, 0.9, 0.12));   // a ghostly "woo"
      var wl = ctx.createOscillator(), wd = ctx.createGain(); wl.frequency.value = 6; wd.gain.value = 18 * pitch; wl.connect(wd); wd.connect(wo.frequency); wl.start(wt); wl.stop(wt + 1.15);
      [4.2, 7.5, 9.6, 13.1].forEach(function (when) { var bt = t + when; tone(bt, 0.07, 'sine', 3200, 5200, env(bt, 0.004, 0.06, 0.06)); tone(bt + 0.1, 0.06, 'sine', 3600, 5600, env(bt + 0.1, 0.004, 0.05, 0.05)); });   // bat squeaks
      chime(t + total - 0.2, [440, 523, 659, 880], 0.12, 1.1, 'sine');
    },
    blower: function (t) {
      // a party blower: a honking paper horn, a rising "pweee" with a flutter, and the rattle of the paper unrolling
      var o = tone(t, 0.5, 'square', 520, 880, env(t, 0.015, 0.46, 0.16));
      tone(t, 0.5, 'sawtooth', 524, 888, env(t, 0.015, 0.46, 0.09));
      tone(t, 0.5, 'sine', 1040, 1760, env(t, 0.02, 0.4, 0.05));
      var lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 22; depth.gain.value = 26 * pitch; lfo.connect(depth); depth.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.52);
      noise(t, 0.46, 'bandpass', 2600, 1.3, env(t, 0.01, 0.42, 0.14));
    },
    blowerbig: function (t) {
      // the big toot: longer, higher, with a fall at the end like a real one running out of breath
      var o = tone(t, 0.95, 'square', 480, 1000, env(t, 0.02, 0.9, 0.17));
      o.frequency.setValueAtTime(1000 * pitch, t + 0.7); o.frequency.exponentialRampToValueAtTime(620 * pitch, t + 0.95);
      tone(t, 0.95, 'sawtooth', 484, 1008, env(t, 0.02, 0.9, 0.1));
      tone(t, 0.95, 'sine', 960, 2000, env(t, 0.02, 0.8, 0.05));
      var lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 24; depth.gain.value = 30 * pitch; lfo.connect(depth); depth.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.97);
      noise(t, 0.9, 'bandpass', 2800, 1.3, env(t, 0.01, 0.85, 0.15));
    },
    easter: function (t) {
      // a bouncy spring tune (an original one): a marimba playing hop-hop-hop arpeggios in C over an oom-pah bass, shakers on every eighth, a couple of springy boings, about 15 s (build 622)
      var q = 0.42;   // one beat
      var C5 = 523, D5 = 587, E5 = 659, F5 = 698, G5 = 784, A5 = 880, B5 = 988, C6 = 1047, G4 = 392;
      var A = [[E5, .5], [G5, .5], [C6, 1], [G5, .5], [E5, .5], [C5, 1],  [F5, .5], [A5, .5], [C6, 1], [A5, .5], [F5, .5], [C5, 1]];
      var Bp = [[D5, .5], [F5, .5], [B5, 1], [F5, .5], [D5, .5], [G5, 1],  [E5, .5], [G5, .5], [C6, 1], [G5, 1], [C6, 1]];
      var end = [[C6, .5], [G5, .5], [E5, .5], [C5, .5], [C6, 2]];
      var lead = A.concat(Bp, A, Bp, end), at = t;
      lead.forEach(function (n) {
        var d = Math.min(n[1] * q * 1.1, 0.7);
        tone(at, d + 0.08, 'triangle', n[0], null, env(at, 0.004, d, 0.24));
        tone(at, 0.2, 'sine', n[0] * 2, null, env(at, 0.004, 0.16, 0.07));
        tone(at, 0.06, 'sine', n[0] * 4, null, env(at, 0.002, 0.05, 0.03));
        at += n[1] * q;
      });
      var total = at - t;
      var chords = [[131, [262, 330, 392]], [175, [262, 349, 440]], [98, [247, 294, 392]], [131, [262, 330, 392]], [131, [262, 330, 392]], [175, [262, 349, 440]], [98, [247, 294, 392]], [131, [262, 330, 392]], [131, [262, 330, 392]]];
      for (var bar = 0; bar < 9; bar++) for (var k = 0; k < 4; k++) {
        var bt = t + (bar * 4 + k) * q;
        if (bt - t > total) break;
        if (k % 2 === 0) tone(bt, 0.3, 'triangle', chords[bar][0] * (k === 2 ? 1.5 : 1), null, env(bt, 0.008, 0.28, 0.22));
        else chords[bar][1].forEach(function (hz) { tone(bt, 0.16, 'sine', hz, null, env(bt, 0.006, 0.14, 0.04)); });
      }
      for (var j = 0; j < total / (q / 2); j++) { var jt = t + j * (q / 2); noise(jt, 0.04, 'highpass', 7000, 1, env(jt, 0.002, 0.035, j % 2 ? 0.035 : 0.06)); }   // shakers
      [8 * q, 24 * q, 32 * q].forEach(function (when) { var bt = t + when + q * 1.5; tone(bt, 0.28, 'sine', 170, 540, env(bt, 0.01, 0.26, 0.2)); });   // boing!
      chime(t + total - 0.1, [1047, 1319, 1568, 2093], 0.09, 1.2);
    },
    peep: function (t) {
      // a chick peeping: two quick high chirps
      tone(t, 0.09, 'sine', 2300, 3100, env(t, 0.004, 0.08, 0.14)); tone(t + 0.13, 0.1, 'sine', 2500, 3300, env(t + 0.13, 0.004, 0.09, 0.14));
    },
    newyear: function (t) {
      // a disco groove (original, about 15 s, 128 beats a minute): a kick on every beat, handclaps on two and four, open hats between, a funky octave-jumping bass, string stabs, a squelchy synth riff and a whoop up into it; ends on a big chord with a sparkle (build 619)
      var u = 0.47;   // one beat
      var bars = 8, bassOct = [[110, 220, 110, 220, 131, 262, 147, 196], [110, 220, 110, 220, 98, 196, 131, 165]];
      var riff = [0, 659, 784, 880, 784, 659, 587, 523,   587, 0, 659, 0, 523, 0, 440, 0];   // two bars of eighth notes, 0 is a rest
      for (var bar = 0; bar < bars; bar++) {
        var b0 = t + bar * 4 * u;
        for (var beat = 0; beat < 4; beat++) {
          var bt = b0 + beat * u;
          tone(bt, 0.16, 'sine', 160, 48, env(bt, 0.003, 0.15, 0.55));   // kick
          if (beat % 2 === 1) { noise(bt, 0.1, 'bandpass', 1700, 1.1, env(bt, 0.002, 0.09, 0.4)); noise(bt + 0.012, 0.08, 'bandpass', 2400, 1.1, env(bt + 0.012, 0.002, 0.07, 0.25)); }   // clap
          noise(bt + u / 2, 0.11, 'highpass', 7000, 1, env(bt + u / 2, 0.002, 0.1, 0.12));   // open hat on the off beat
          noise(bt, 0.03, 'highpass', 8000, 1, env(bt, 0.001, 0.025, 0.05)); noise(bt + u / 4, 0.025, 'highpass', 8000, 1, env(bt + u / 4, 0.001, 0.02, 0.035)); noise(bt + u * 0.75, 0.025, 'highpass', 8000, 1, env(bt + u * 0.75, 0.001, 0.02, 0.035));   // 16th ticks
        }
        for (var e = 0; e < 8; e++) { var et = b0 + e * u / 2; tone(et, 0.2, 'sawtooth', bassOct[bar % 2][e], null, env(et, 0.006, 0.18, 0.2)); }   // funky bass: root, octave, root, octave...
        [0, 2.5].forEach(function (beatPos) {   // string stabs (Am7) on the one and the and of two
          var st = b0 + beatPos * u;
          [220, 262, 330, 392].forEach(function (hz) { tone(st, 0.2, 'triangle', hz * 2, null, env(st, 0.01, 0.17, 0.05)); tone(st, 0.2, 'sine', hz, null, env(st, 0.01, 0.17, 0.035)); });
        });
        if (bar >= 2) for (var r = 0; r < 8; r++) {   // the synth riff from bar three, a little squelch on each note
          var hz = riff[(bar % 2) * 8 + r], rt = b0 + r * u / 2;
          if (hz) { var o = tone(rt, 0.17, 'square', hz * 0.9, hz, env(rt, 0.008, 0.15, 0.07)); }
        }
      }
      var wt = t + 4 * u * 2 - 0.9, w = tone(wt, 0.9, 'sawtooth', 220, 1320, env(wt, 0.3, 0.6, 0.08));   // a whoop up into bar three
      var end = t + bars * 4 * u;
      [262, 330, 392, 494, 659].forEach(function (hz) { tone(end - 0.05, 0.9, 'triangle', hz, null, env(end - 0.05, 0.01, 0.85, 0.1)); });
      chime(end - 0.05, [1047, 1319, 1568, 2093, 2637], 0.07, 1.2);
    },
    jiggle: function (t) {
      // a belly wobble: soft boings that get smaller and lower
      for (var i = 0; i < 4; i++) tone(t + i * 0.12, 0.13, 'sine', 330 - i * 28, 230 - i * 22, env(t + i * 0.12, 0.008, 0.12, 0.3 - i * 0.05));
    },
    toss: function (t) {
      // a swish through the air and a little "wheee"
      var f = noise(t, 0.22, 'bandpass', 700, 2, env(t, 0.03, 0.18, 0.35)); f.frequency.exponentialRampToValueAtTime(2600 * pitch, t + 0.22);
      tone(t + 0.05, 0.25, 'triangle', 600, 1100, env(t + 0.05, 0.02, 0.22, 0.12));
    },
    bounce: function (t) {
      // a soft rubbery boing on the floor
      tone(t, 0.14, 'sine', 260, 120, env(t, 0.004, 0.13, 0.35));
      tone(t, 0.1, 'sine', 520, 300, env(t, 0.004, 0.09, 0.06));
    },
    squeak: function (t) {
      // a squeaky toy: squee-eek
      tone(t, 0.1, 'square', 1300, 1900, env(t, 0.01, 0.09, 0.05));
      tone(t + 0.12, 0.13, 'square', 1700, 1250, env(t + 0.12, 0.01, 0.12, 0.045));
    },
    tuck: function (t) {
      // the blanket swishing up, then a soft lullaby chime
      var f = noise(t, 0.35, 'lowpass', 900, 0.7, env(t, 0.08, 0.27, 0.3)); f.frequency.exponentialRampToValueAtTime(400 * pitch, t + 0.35);
      chime(t + 0.3, [784, 659, 523], 0.16, 0.6, 'sine');
    },
    snorebig: function (t) {
      // a bigger, rumblier snore with a little snort, and a long whistle out
      var g = env(t, 0.5, 0.45, 0.32);
      noise(t, 1, 'lowpass', 300, 2, g);
      for (var i = 0; i < 12; i++) tone(t + 0.08 + i * 0.065, 0.07, 'sawtooth', 70, 62, env(t + 0.08 + i * 0.065, 0.015, 0.05, 0.05));
      noise(t + 0.86, 0.08, 'bandpass', 600, 2, env(t + 0.86, 0.005, 0.07, 0.25));
      tone(t + 1.15, 0.6, 'sine', 1000, 560, env(t + 1.15, 0.1, 0.48, 0.04));
    },
    owl: function (t) {
      // an owl outside: hoo… hoo-hoo, with a soft breathy edge
      [[0, 0.36], [0.62, 0.16], [0.84, 0.42]].forEach(function (h) {
        var tt = t + h[0];
        tone(tt, h[1] + 0.1, 'sine', 560, 500, env(tt, 0.05, h[1], 0.4));
        tone(tt, h[1] + 0.1, 'sine', 1120, 1000, env(tt, 0.05, h[1], 0.05));
        noise(tt, h[1], 'bandpass', 560, 4, env(tt, 0.05, h[1] * 0.8, 0.12));
      });
    },
    tongue: function (t) {
      // the frog's tongue: a quick rising "thwip" out and a wet little "shlup" back in
      tone(t, 0.08, 'sine', 500, 1500, env(t, 0.005, 0.07, 0.22));
      noise(t, 0.06, 'bandpass', 2400, 3, env(t, 0.004, 0.05, 0.12));
      tone(t + 0.16, 0.12, 'sine', 900, 320, env(t + 0.16, 0.01, 0.11, 0.2));
      noise(t + 0.16, 0.1, 'lowpass', 1200, 2, env(t + 0.16, 0.01, 0.08, 0.15));
    },
    kiss: function (t) {
      // a cartoony smooch: a squeaky pucker sliding up, a big wet "MWAH" pop, and a little smack after
      tone(t, 0.13, 'sine', 330, 760, env(t, 0.03, 0.1, 0.17));
      noise(t, 0.12, 'bandpass', 1400, 3, env(t, 0.03, 0.1, 0.05));
      tone(t + 0.14, 0.09, 'sine', 1250, 260, env(t + 0.14, 0.002, 0.085, 0.42));
      noise(t + 0.14, 0.05, 'bandpass', 1700, 1.4, env(t + 0.14, 0.002, 0.045, 0.4));
      tone(t + 0.24, 0.05, 'sine', 900, 420, env(t + 0.24, 0.002, 0.045, 0.18));
      chime(t + 0.3, [1319, 1760], 0.07, 0.3, 'sine');
    },
    done: function (t) {
      // a to-do ticked off: a crisp tick, then two bright notes going up
      noise(t, 0.02, 'bandpass', 3200, 3, env(t, 0.001, 0.018, 0.5));
      chime(t + 0.05, [784, 1175], 0.1, 0.9, 'sine');
    },
    magic: function (t) {
      // a magic spell: an airy shimmer sweeping up, a harp run climbing over it and a few high twinkles at the end
      tone(t, 1.4, 'sine', 300, 1500, env(t, 0.35, 1.0, 0.045));
      [523, 659, 784, 988, 1175, 1319, 1568, 1976, 2349, 2637, 3136].forEach(function (hz, i) { tone(t + i * 0.1, 0.55, 'sine', hz, null, env(t + i * 0.1, 0.004, 0.5, 0.1)); });
      for (var k = 0; k < 7; k++) { var at = t + 1.1 + rnd(0, 0.9); tone(at, 0.28, 'sine', rnd(2400, 4200), null, env(at, 0.003, 0.25, 0.05)); }
      chime(t + 1.15, [1568, 2093, 2637], 0.12, 0.8, 'sine');
    },
    sparkle: function (t) {
      // a cleaning sparkle: a quick run of tiny bells climbing up
      [1568, 1976, 2349, 2637, 3136].forEach(function (hz, i) { tone(t + i * 0.055, 0.2, 'sine', hz, null, env(t + i * 0.055, 0.004, 0.18, 0.13)); });
    },
    coin: function (t) {
      // cha-ching: two bright metallic pings
      tone(t, 0.25, 'square', 1568, null, env(t, 0.002, 0.08, 0.05));
      tone(t, 0.3, 'sine', 1568, null, env(t, 0.002, 0.25, 0.2));
      tone(t + 0.09, 0.45, 'sine', 2093, null, env(t + 0.09, 0.002, 0.4, 0.22));
      tone(t + 0.09, 0.45, 'sine', 4186, null, env(t + 0.09, 0.002, 0.3, 0.06));
    },
    ring: function (t) {
      // a little phone: brrring-brrring, picked up
      for (var i = 0; i < 2; i++) for (var j = 0; j < 4; j++) {
        var tt = t + i * 0.26 + j * 0.05;
        tone(tt, 0.05, 'square', j % 2 ? 1250 : 1000, null, env(tt, 0.003, 0.04, 0.07));
      }
      noise(t + 0.6, 0.02, 'bandpass', 1500, 3, env(t + 0.6, 0.001, 0.018, 0.4));
    },
    stamp: function (t) {
      // a rubber stamp thunk
      tone(t, 0.12, 'sine', 190, 70, env(t, 0.003, 0.11, 0.6));
      noise(t, 0.06, 'lowpass', 900, 1, env(t, 0.002, 0.05, 0.3));
    },
    shutter: function (t) {
      // a camera shutter: a quick click-clack, then a tiny whirr of the film
      noise(t, 0.012, 'bandpass', 3200, 2, env(t, 0.001, 0.01, 0.55));
      tone(t, 0.04, 'square', 1800, 900, env(t, 0.001, 0.035, 0.12));
      noise(t + 0.055, 0.016, 'bandpass', 2200, 2, env(t + 0.055, 0.001, 0.014, 0.5));
      tone(t + 0.055, 0.05, 'square', 1200, 600, env(t + 0.055, 0.001, 0.045, 0.1));
      noise(t + 0.14, 0.12, 'highpass', 5000, 1, env(t + 0.14, 0.02, 0.1, 0.05));
    },
    scribble: function (t) {
      // a pencil scribbling: a run of quick scratchy strokes
      for (var i = 0; i < 8; i++) noise(t + i * 0.11, 0.09, 'bandpass', rnd(2300, 3000), 2.2, env(t + i * 0.11, 0.01, 0.08, 0.14));
    },
    crickets: function (t) {
      // a few gentle cricket trills: tiny high pulses in twos and threes
      var n = 2 + Math.floor(Math.random() * 3);
      for (var j = 0; j < n; j++) {
        var tt = t + j * rnd(0.32, 0.45), hz = rnd(4300, 4700);
        for (var i = 0; i < 4; i++) tone(tt + i * 0.03, 0.022, 'sine', hz, null, env(tt + i * 0.03, 0.003, 0.018, 0.035));
      }
    },
    yawn: function (t) {
      // a sleepy "hwaaah" sliding down, with breath
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1400 * pitch, t); lp.frequency.exponentialRampToValueAtTime(500 * pitch, t + 0.8);
      lp.connect(env(t, 0.15, 0.7, 0.2));
      tone(t, 0.85, 'triangle', 520, 260, lp);
      noise(t, 0.8, 'bandpass', 900, 0.8, env(t, 0.12, 0.65, 0.12));
    },
    click: function (t) {
      // a pull-cord switch: a sharp tick down and a softer one back up
      noise(t, 0.018, 'bandpass', 3800, 3, env(t, 0.001, 0.016, 0.9));
      tone(t, 0.03, 'square', 1900, 1200, env(t, 0.001, 0.025, 0.06));
      noise(t + 0.09, 0.015, 'bandpass', 2900, 3, env(t + 0.09, 0.001, 0.013, 0.5));
    },
    snore: function (t) {
      // a tiny snore: a soft rumbly breath in, then a little whistle out
      var g = env(t, 0.45, 0.4, 0.3);
      noise(t, 0.85, 'lowpass', 380, 1.5, g);
      for (var i = 0; i < 9; i++) tone(t + 0.1 + i * 0.07, 0.07, 'sine', 95, 85, env(t + 0.1 + i * 0.07, 0.02, 0.05, 0.08));
      tone(t + 1.0, 0.45, 'sine', 900, 620, env(t + 1.0, 0.08, 0.36, 0.035));
      noise(t + 1.0, 0.4, 'bandpass', 1800, 1.2, env(t + 1.0, 0.06, 0.32, 0.06));
    },
    ooh: function (t) {
      // a soft, curious "ooh?" that lifts at the end
      tone(t, 0.2, 'triangle', rnd(480, 540), 860, env(t, 0.03, 0.18, 0.16));
      tone(t, 0.2, 'sine', 960, 1700, env(t, 0.03, 0.16, 0.04));
    },
    // ---- menu sounds: each is a list of variants ----
    // Claude's alert: a different little jingle each time
    claude: [
      function (t) { chime(t, [988, 1319], 0.12, 0.85, 'sine'); chime(t + 0.34, [1568], 0.1, 0.5, 'sine'); },
      function (t) { chime(t, [523, 659, 784], 0.1, 0.8, 'sine'); chime(t + 0.42, [1047], 0.1, 1, 'triangle'); },
      function (t) { chime(t, [1319, 1760, 1568, 2093], 0.08, 0.6, 'triangle'); },
      function (t) { chime(t, [1175], 0.1, 0.9, 'sine'); chime(t + 0.24, [880], 0.1, 0.8, 'sine'); chime(t + 0.5, [1568], 0.1, 0.5, 'sine'); },
      function (t) { chime(t, [523, 659, 784, 1047, 1319, 1568, 2093], 0.055, 0.6, 'sine'); },
      function (t) { chime(t, [988, 988, 1319], 0.11, 0.7, 'sine'); chime(t + 0.5, [1760, 2349], 0.07, 0.45, 'triangle'); }
    ],
    tap: [
      function (t) { tone(t, 0.06, 'sine', rnd(650, 760), 1150, env(t, 0.003, 0.06, 0.22)); },
      function (t) { tone(t, 0.08, 'triangle', 560, 380, env(t, 0.004, 0.08, 0.2)); },
      function (t) { noise(t, 0.02, 'highpass', 3000, 0.8, env(t, 0.001, 0.02, 0.25)); tone(t, 0.05, 'sine', 1500, 1300, env(t, 0.002, 0.05, 0.1)); },
      function (t) { tone(t, 0.05, 'sine', 900, 600, env(t, 0.002, 0.05, 0.2)); tone(t + 0.05, 0.05, 'sine', 1200, 900, env(t + 0.05, 0.002, 0.05, 0.12)); }
    ],
    pick: [
      function (t) { chime(t, [784, 1047], 0.06, 0.7); },
      function (t) { chime(t, [659, 988], 0.05, 0.7); },
      function (t) { chime(t, [880, 1175, 1397], 0.045, 0.6, 'sine'); },
      function (t) { tone(t, 0.1, 'triangle', 600, 1300, env(t, 0.005, 0.1, 0.2)); chime(t + 0.08, [1568], 0.05, 0.5, 'sine'); }
    ],
    open: [
      function (t) { tone(t, 0.14, 'sine', 380, 900, env(t, 0.01, 0.13, 0.2)); chime(t + 0.1, [1319], 0.05, 0.4, 'sine'); },
      function (t) { var f = noise(t, 0.16, 'bandpass', 600, 2.5, env(t, 0.03, 0.12, 0.35)); f.frequency.exponentialRampToValueAtTime(2400 * pitch, t + 0.16); tone(t + 0.06, 0.1, 'triangle', 700, 1050, env(t + 0.06, 0.01, 0.1, 0.14)); },
      function (t) { chime(t, [523, 784, 1047], 0.05, 0.55); }
    ],
    close: [
      function (t) { tone(t, 0.13, 'sine', 900, 420, env(t, 0.008, 0.12, 0.18)); },
      function (t) { var f = noise(t, 0.14, 'bandpass', 2200, 2.5, env(t, 0.02, 0.11, 0.3)); f.frequency.exponentialRampToValueAtTime(500 * pitch, t + 0.14); },
      function (t) { chime(t, [1047, 784], 0.05, 0.5, 'sine'); }
    ],
    on: [
      function (t) { chime(t, [659, 988], 0.06, 0.7, 'sine'); },
      function (t) { tone(t, 0.09, 'triangle', 500, 1000, env(t, 0.005, 0.09, 0.2)); }
    ],
    off: [
      function (t) { chime(t, [988, 659], 0.06, 0.6, 'sine'); },
      function (t) { tone(t, 0.1, 'triangle', 800, 420, env(t, 0.005, 0.1, 0.18)); }
    ],
    locked: [
      function (t) {
        // a soft "bonk" and a little rattle, like a tiny padlock
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(env(t, 0.004, 0.14, 0.35));
        tone(t, 0.12, 'square', 230, 150, lp);
        for (var i = 0; i < 3; i++) noise(t + 0.08 + i * 0.03, 0.02, 'bandpass', 3200, 3, env(t + 0.08 + i * 0.03, 0.001, 0.02, 0.15));
      },
      function (t) { tone(t, 0.09, 'triangle', 330, 250, env(t, 0.004, 0.09, 0.25)); tone(t + 0.11, 0.12, 'triangle', 300, 210, env(t + 0.11, 0.004, 0.12, 0.22)); }
    ],
    place: [
      function (t) { tone(t, 0.1, 'sine', 170, 85, env(t, 0.003, 0.1, 0.5)); noise(t, 0.06, 'lowpass', 700, 0.8, env(t, 0.002, 0.05, 0.4)); chime(t + 0.08, [1175, 1568], 0.05, 0.45, 'sine'); },
      function (t) { tone(t, 0.08, 'sine', 200, 100, env(t, 0.003, 0.08, 0.45)); squash(t + 0.02, 0.4); chime(t + 0.1, [988, 1319], 0.05, 0.4); }
    ],
    remove: [
      function (t) { var f = noise(t, 0.2, 'bandpass', 2600, 3, env(t, 0.02, 0.17, 0.35)); f.frequency.exponentialRampToValueAtTime(400 * pitch, t + 0.2); },
      function (t) { tone(t, 0.12, 'sine', 700, 260, env(t, 0.005, 0.12, 0.2)); tone(t + 0.04, 0.05, 'sine', 1400, 900, env(t + 0.04, 0.002, 0.05, 0.08)); }
    ],
    excited: function (t) {
      // two quick squeaky "kya!"s and a sparkle
      tone(t, 0.11, 'triangle', 620, 1250, env(t, 0.01, 0.1, 0.26));
      tone(t + 0.13, 0.15, 'triangle', 720, 1560, env(t + 0.13, 0.01, 0.14, 0.28));
      tone(t + 0.13, 0.15, 'sine', 1440, 3100, env(t + 0.13, 0.01, 0.12, 0.05));
      chime(t + 0.3, [1319, 1568, 2093], 0.06, 0.8);
    }
  };

  var lastVariant = {};
  /**
   * The function for a sound: one fixed sound, or a variant other than the one played last time.
   * @param {string} kind
   * @returns {function(number)}
   */
  function variant(kind) {
    var v = KINDS[kind];
    if (typeof v === 'function') return v;
    var i = Math.floor(Math.random() * v.length);
    if (v.length > 1 && i === lastVariant[kind]) i = (i + 1 + Math.floor(Math.random() * (v.length - 1))) % v.length;
    lastVariant[kind] = i;
    return v[i];
  }

  root.Sounds = {
    unlock: unlock,
    kinds: Object.keys(KINDS),
    variant: variant,
    play: function (kind) {
      try {
        if (!init()) return;
        if (ctx.state === 'suspended') ctx.resume().catch(function () {});
        var k = KINDS[kind] ? kind : 'chomp';
        // a slightly different pitch every time
        pitch = rnd(0.9, 1.12);
        variant(k)(ctx.currentTime + 0.01);
      } catch (e) { /* no audio */ } finally { pitch = 1; }
    }
  };
})(typeof self !== 'undefined' ? self : globalThis);
