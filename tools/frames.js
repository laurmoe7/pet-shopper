// Cuts a screen recording into a contact sheet you can look at (needs ffmpeg).
//   node tools/frames.js video.mp4 sheet.png [--fps 3] [--width 400] [--cols 5] [--crop x,y,w,h as fractions of the picture, e.g. 0.5,0.5,0.5,0.5] [--from seconds] [--to seconds]
// Prints how many frames there are and how long the video is; frame n is at (n - 1) / fps seconds.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const args = process.argv.slice(2);
const [video, sheet] = args;
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
if (!video || !sheet) { console.error('Usage: node tools/frames.js video.mp4 sheet.png [--fps n] [--width px] [--cols n] [--crop x,y,w,h] [--from s] [--to s]'); process.exit(1); }
const fps = Number(opt('fps', 3)), width = Number(opt('width', 400)), cols = Number(opt('cols', 5));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
const vf = [];
const crop = opt('crop', '');
if (crop) { const [x, y, w, h] = crop.split(',').map(Number); vf.push(`crop=iw*${w}:ih*${h}:iw*${x}:ih*${y}`); }
vf.push('fps=' + fps, 'scale=' + width + ':-1');
const timing = [];
if (opt('from', '')) timing.push('-ss', opt('from'));
if (opt('to', '')) timing.push('-to', opt('to'));
execFileSync('ffmpeg', ['-v', 'error', ...timing, '-i', video, '-vf', vf.join(','), path.join(dir, 'f%03d.png')]);
const n = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).length;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, 'f%03d.png'), '-frames:v', '1', '-vf', `tile=${cols}x${Math.ceil(n / cols)}`, sheet]);
console.log(n + ' frames at ' + fps + ' per second (frame n is at (n - 1) / ' + fps + ' s), sheet: ' + sheet);
