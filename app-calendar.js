// The calendar (to-do list only): a month at a glance for birthdays and other plans made ahead. A plan is simply a task
// with a due day (birthdays repeat every year), so it also shows up in the to-do list when its day comes near.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var calSheet = $('calSheet'), calGrid = $('calGrid'), calList = $('calList'), calInput = $('calInput'), calYearly = $('calYearly');
var calYear = 0, calMonth = 0, calSel = '';
var CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var CAL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** @returns {string} A day as "Thursday 15 October". */
function calDayName(day) {
  var d = new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), 12);
  return CAL_DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + CAL_MONTHS[d.getMonth()];
}
/** Draws the month: a button per day, with a small dot for each plan that day. */
function renderCalendar() {
  var today = todayKey();
  // the month and year are drop-down menus, to jump straight to a month
  var ms = $('calMonthSel'), ys = $('calYearSel');
  if (!ms.options.length) CAL_MONTHS.forEach(function (m, i) { ms.add(new Option(m, i)); });
  var y0 = +today.slice(0, 4) - 1, y1 = Math.max(+today.slice(0, 4) + 8, calYear);
  if (ys.options.length !== y1 - y0 + 1 || +ys.options[0].value !== y0) {
    ys.replaceChildren();
    for (var y = y0; y <= y1; y++) ys.add(new Option(y, y));
  }
  if (calYear < y0) ys.add(new Option(calYear, calYear), 0);
  ms.value = calMonth; ys.value = calYear;
  calGrid.replaceChildren.apply(calGrid, L.monthGrid(calYear, calMonth).map(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.day = c.day;
    b.className = 'cal-cell' + (c.inMonth ? '' : ' out') + (c.day === today ? ' today' : '') + (c.day === calSel ? ' sel' : '');
    b.setAttribute('aria-label', calDayName(c.day));
    var n = document.createElement('span');
    n.textContent = +c.day.slice(8, 10);
    var dots = document.createElement('span');
    dots.className = 'cal-dots';
    L.tasksOn(state.items, c.day).slice(0, 3).forEach(function (t) {
      var dot = document.createElement('i');
      dot.className = (t.repeat === 'yearly' ? 'yearly' : '') + (t.done ? ' done' : '');
      dots.appendChild(dot);
    });
    b.append(n, dots);
    return b;
  }));
  renderCalDay();
}
/** Shows the chosen day's plans, and the box to add one (not for days that are over). */
function renderCalDay() {
  $('calDayTitle').textContent = calDayName(calSel) + (calSel === todayKey() ? ' (today)' : '');
  var tasks = L.tasksOn(state.items, calSel);
  calList.replaceChildren.apply(calList, tasks.length ? tasks.map(function (t) {
    var li = document.createElement('li');
    li.className = t.done ? 'done' : '';
    var text = document.createElement('span');
    text.textContent = t.text + (t.time ? ' · ' + fmtTime(t.time) : '') + (t.repeat === 'yearly' ? ' ↻' : '');
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'text-btn cal-del'; del.dataset.id = t.id;
    del.setAttribute('aria-label', 'Remove ' + t.text); del.textContent = '✕';
    li.append(emojiImg(t.emoji, ''), text, del);
    return li;
  }) : [Object.assign(document.createElement('li'), { className: 'cal-empty', textContent: calSel < todayKey() ? 'Nothing was planned.' : 'Nothing planned yet.' })]);
  $('calAdd').hidden = calSel < todayKey();
}
/**
 * Puts a plan on the calendar: a task due on that day. It also joins the to-do list.
 * @param {string} text
 * @param {string} day
 * @param {string} [repeat]  A repeat id ('yearly' for birthdays).
 */
function addPlan(text, day, repeat) {
  text = text.trim();
  if (!text || day < todayKey()) return;
  var item = L.createItem(text, state.overrides, newId(), Date.now(), 'todo');
  item.due = day;
  if (repeat) item.repeat = repeat;
  L.addToList(state.items, item);
  state.items = L.sortByDue(state.items, todayKey());
  freshIds[item.id] = true;
  save();
  render();
  renderCalendar();
  sound('pick');
  if (!busy && baseState() !== 'sleepy') say(pick(['on the calendar!', 'I\'ll remind you!', 'noted ✦', repeat === 'yearly' ? 'every year, got it!' : 'got it!']), 1500);
}
/** Opens the sheet on this month, with today picked. */
function openCalendar() {
  var now = L.dayKey(petNow());
  calYear = +now.slice(0, 4); calMonth = +now.slice(5, 7) - 1; calSel = now;
  calInput.value = ''; calYearly.setAttribute('aria-pressed', 'false');
  renderCalendar();
  openDialog(calSheet);
}
/** After the month changes: the chosen day goes to today (in this month) or the 1st, so what's shown is what you add to. */
function calPick() {
  var today = todayKey(), key = calYear + '-' + (calMonth < 9 ? '0' : '') + (calMonth + 1);
  calSel = today.slice(0, 7) === key ? today : key + '-01';
}
/** Moves the month shown by n. */
function calStep(n) {
  calMonth += n;
  if (calMonth < 0) { calMonth = 11; calYear--; } else if (calMonth > 11) { calMonth = 0; calYear++; }
  calPick();
  renderCalendar();
  sound('tap');
}

$('calBtn').addEventListener('click', openCalendar);
$('calMonthSel').addEventListener('change', function () { calMonth = +this.value; calPick(); sound('tap'); renderCalendar(); });
$('calYearSel').addEventListener('change', function () { calYear = +this.value; calPick(); sound('tap'); renderCalendar(); });
$('farNote').addEventListener('click', openCalendar);
$('calPrev').addEventListener('click', function () { calStep(-1); });
$('calNext').addEventListener('click', function () { calStep(1); });
calGrid.addEventListener('click', function (e) {
  var b = e.target.closest('.cal-cell');
  if (!b) return;
  calSel = b.dataset.day;
  if (!b.classList.contains('out') || +calSel.slice(5, 7) - 1 === calMonth) { /* same month */ } else { calYear = +calSel.slice(0, 4); calMonth = +calSel.slice(5, 7) - 1; }
  sound('tap');
  renderCalendar();
});
calYearly.addEventListener('click', function () { calYearly.setAttribute('aria-pressed', String(calYearly.getAttribute('aria-pressed') !== 'true')); });
// a birthday (or an anniversary) is probably yearly: switch it on as it is typed
calInput.addEventListener('input', function () {
  if (/birthday|bday|verjaardag|anniversary|jubileum/i.test(calInput.value)) calYearly.setAttribute('aria-pressed', 'true');
});
function submitPlan() {
  addPlan(calInput.value, calSel, calYearly.getAttribute('aria-pressed') === 'true' ? 'yearly' : '');
  calInput.value = ''; calYearly.setAttribute('aria-pressed', 'false');
}
$('calAddBtn').addEventListener('click', submitPlan);
calInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submitPlan(); } });
calList.addEventListener('click', function (e) {
  var del = e.target.closest('.cal-del');
  if (!del) return;
  state.items = state.items.filter(function (i) { return i.id !== del.dataset.id; });
  save();
  render();
  renderCalendar();
  sound('remove');
});
