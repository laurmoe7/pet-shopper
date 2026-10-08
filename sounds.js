/* Fumu's sounds, synthesised with the Web Audio API (no audio files).
 * Sounds.play(kind) where kind is one of:
 *   chomp, crunch, squish, jiggle, glug, slurp, sip, sweet, spicy, mystery, huh, spit, party,
 *   ooh (curious, for pointing at an outfit), excited (trying an outfit on),
 *   toss, bounce, squeak (the toy), tuck (tucking in at bedtime), lullaby (a hum for him while he sleeps), snore and snorebig (tucked in), owl, crickets (at night), yawn, click (the lamp's pull-cord),
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
    lullaby: function (t) {
      // a soft little lullaby, two phrases (resting the pointer on him while he sleeps)
      chime(t, [659, 784, 988, 784], 0.34, 0.5, 'sine');
      chime(t + 1.5, [880, 784, 659], 0.36, 0.42, 'sine');
    },
    notice: function (t) { chime(t, [988, 1319], 0.12, 0.85, 'sine'); chime(t + 0.34, [1568], 0.1, 0.5, 'sine'); },
    party: function (t) { chime(t, [523, 659, 784, 1047, 1319], 0.09, 1.1); },
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
