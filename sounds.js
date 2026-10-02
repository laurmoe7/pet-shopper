/* Nibble's sounds, synthesised with the Web Audio API (no audio files).
 * Sounds.play(kind) where kind is one of:
 *   chomp, crunch, squish, glug, slurp, sip, sweet, spicy, mystery, huh, spit, party
 * Sounds.unlock() must run inside a tap once, so phones allow audio later.
 */
(function (root) {
  'use strict';

  var ctx = null, master = null, noiseBuf = null;

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
    f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
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
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
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
   * A crisp bite: a quick crackle of tiny clicks.
   * @param {number} t
   * @param {number} vol
   */
  function crackle(t, vol) {
    tone(t, 0.05, 'sine', 170, 80, env(t, 0.003, 0.05, 0.4 * vol));
    var n = 6 + Math.floor(Math.random() * 4);
    for (var i = 0; i < n; i++) {
      var tt = t + i * rnd(0.006, 0.014);
      noise(tt, 0.02, 'highpass', rnd(2200, 4200), 0.8, env(tt, 0.001, 0.015, rnd(0.35, 0.7) * vol));
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
    f.frequency.exponentialRampToValueAtTime(250, t + 0.18);
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
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
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
    crunch: function (t) { crackle(t, 1); crackle(t + 0.15, 0.85); crackle(t + 0.29, 0.7); },
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
    huh: function (t) {
      // a questioning "hm?" then a pocket pop
      tone(t, 0.22, 'triangle', 300, 430, env(t, 0.03, 0.2, 0.25));
      tone(t + 0.35, 0.06, 'sine', 600, 250, env(t + 0.35, 0.003, 0.06, 0.35));
    },
    spit: function (t) {
      noise(t, 0.06, 'bandpass', 1800, 1.5, env(t, 0.002, 0.05, 1.1));
      tone(t + 0.02, 0.14, 'sine', 620, 190, env(t + 0.02, 0.005, 0.13, 0.6));
    },
    party: function (t) { chime(t, [523, 659, 784, 1047, 1319], 0.09, 1.1); }
  };

  root.Sounds = {
    unlock: unlock,
    kinds: Object.keys(KINDS),
    play: function (kind) {
      try {
        if (!init()) return;
        if (ctx.state === 'suspended') ctx.resume().catch(function () {});
        (KINDS[kind] || KINDS.chomp)(ctx.currentTime + 0.01);
      } catch (e) { /* no audio */ }
    }
  };
})(typeof self !== 'undefined' ? self : globalThis);
