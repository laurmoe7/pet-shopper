// Phone alerts (build 729): in the Android app (android/, Capacitor) a task with a day and a time gets a notification at
// that time, even when the app is closed. They are scheduled on the phone itself (@capacitor/local-notifications),
// nothing goes to a server: to-dos stay private. L.alertPlan picks which ones; this file keeps the phone's list in step
// after every save, and handles Done / In 10 min on the notification. Off by Options > Phone alerts (state.settings.phoneAlerts).
// The plain web page (Chrome) cannot schedule alerts without a server, so nothing here runs there.

var phoneNotes = (function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
  try { return (C.Plugins && C.Plugins.LocalNotifications) || C.registerPlugin('LocalNotifications'); } catch (e) { return null; }   // (an APK from before build 729 has no such plugin)
})();
var PHONE_SNOOZE = 0x40000000, PHONE_SNOOZE_MS = 10 * 60 * 1000;   // a snoozed alert's number is the task's plus this
var phoneSig = '', phoneTimer = 0, phoneAsked = false, phoneReady = false;

/** Whether this is the phone app with alerts available and switched on. */
function phoneAlertsOn() { return !!phoneNotes && state.settings.phoneAlerts !== false; }

/** @returns {Promise<boolean>} Whether the phone lets the app post notifications (asks once, the first time there is one to post). */
function phoneAllowed(ask) {
  return phoneNotes.checkPermissions().then(function (p) {
    if (p.display === 'granted') return true;
    if (!ask || p.display === 'denied' || phoneAsked) return false;
    phoneAsked = true;
    return phoneNotes.requestPermissions().then(function (r) { return r.display === 'granted'; });
  }).catch(function () { return false; });
}

/** Sets up the channel and the Done / In 10 min buttons once. */
function phoneSetup() {
  if (phoneReady) return Promise.resolve();
  phoneReady = true;
  return Promise.all([
    phoneNotes.createChannel({ id: 'reminders', name: T('Task reminders'), importance: 4, visibility: 1, vibration: true }).catch(function () {}),
    phoneNotes.registerActionTypes({ types: [{ id: 'task', actions: [{ id: 'done', title: T('Done') }, { id: 'snooze', title: T('In 10 min') }] }] }).catch(function () {})
  ]);
}

/** One notification for a task. @param {{id: number, task: string, text: string, emoji: string, at: number}} a @param {boolean} [snoozed] */
function phoneNote(a, snoozed) {
  return {
    id: a.id, title: (a.emoji ? a.emoji + ' ' : '') + a.text, body: petName() + ': ' + (snoozed ? T('here it is again!') : T("it's time!") + ' · ' + fmtTime(clockOf(a.at))),
    schedule: { at: new Date(a.at), allowWhileIdle: true }, channelId: 'reminders', actionTypeId: 'task',
    smallIcon: 'ic_stat_fumu', iconColor: '#c9805f', autoCancel: true, extra: { task: a.task }
  };
}
/** @returns {string} HH:MM of a time in ms. */
function clockOf(ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

/**
 * Makes the phone's waiting alerts match the tasks: cancels the ones that are gone or moved and schedules the new ones
 * (snoozes are kept). Called a moment after each save; does nothing when nothing changed.
 */
function phoneSync() {
  if (!phoneNotes) return;
  var plan = phoneAlertsOn() ? L.alertPlan(state.items.concat(state.stash), Date.now()) : [];
  var sig = plan.map(function (a) { return a.id + '@' + a.at + ':' + a.text; }).join('|') + '|' + state.settings.time24;
  if (sig === phoneSig) return;
  phoneSig = sig;
  phoneNotes.getPending().then(function (r) {
    var waiting = (r && r.notifications) || [];
    // a snooze stays while its task is still to do; a task alert not in the plan any more goes (the rest are set again, same number)
    var keep = {}; plan.forEach(function (a) { keep[a.id] = true; });
    var stale = waiting.filter(function (n) { return n.id >= PHONE_SNOOZE ? !phoneAlertsOn() || !phoneLive(n.extra && n.extra.task) : !keep[n.id]; });
    var cancel = stale.length ? phoneNotes.cancel({ notifications: stale.map(function (n) { return { id: n.id }; }) }) : Promise.resolve();
    return cancel.then(function () {
      if (!plan.length) return;
      return phoneAllowed(true).then(function (ok) {
        if (!ok) { phoneStatus(); return; }
        return phoneSetup().then(function () { return phoneNotes.schedule({ notifications: plan.map(function (a) { return phoneNote(a); }) }); });
      });
    });
  }).catch(function () { phoneSig = ''; });   // try again after the next save
}
/** @returns {boolean} Whether a task is still on a list and not done (a snooze for it stays). */
function phoneLive(id) { var i = state.items.concat(state.stash).filter(function (x) { return String(x.id) === String(id); })[0]; return !!i && !i.done; }
/** After a save: the alerts follow a moment later (several saves in a row make one update). */
function phoneSoon() { if (!phoneNotes) return; clearTimeout(phoneTimer); phoneTimer = setTimeout(phoneSync, 800); }

/** Done or In 10 min on a notification (the app opens for it), or a tap on it: shows the to-do list. */
function phoneAction(ev) {
  var n = ev && ev.notification, id = n && n.extra && n.extra.task, item = id && state.items.concat(state.stash).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!item) return;
  var go = function () {
    if (pending > 0) { setTimeout(go, 800); return; }   // (the list cannot swap while he eats)
    if (!isTodo()) switchList();
    if (ev.actionId === 'done') { if (!item.done && state.items.indexOf(item) !== -1) setTimeout(function () { toggle(item.id); }, 600); return; }
    if (ev.actionId === 'snooze') {
      var at = Date.now() + PHONE_SNOOZE_MS;
      phoneSetup().then(function () {
        return phoneNotes.schedule({ notifications: [phoneNote({ id: L.alertId(item.id) + PHONE_SNOOZE, task: String(item.id), text: item.text, emoji: item.emoji, at: at }, true)] });
      }).catch(function () {});
      if (baseState() !== 'sleepy') say(pick([T('ok, I\'ll remind you!'), T('back in 10 minutes!'), T('I\'ll poke you later ♡')]), 1500);
    }
  };
  go();
}

/** The line under the Options switch, only when the phone blocks alerts or may make them late. */
function phoneStatus() {
  var box = $('phoneBox');
  if (!box) return;
  var show = function (text, exact) { $('phoneStatus').textContent = text; $('phoneExact').hidden = !exact; box.hidden = !text; };
  show('');
  if (!phoneAlertsOn()) return;
  phoneNotes.checkPermissions().then(function (p) {
    if (p.display === 'denied') { show(T('Notifications are off for Fumufumu in the phone\'s settings.')); return; }
    if (!phoneNotes.checkExactNotificationSetting) return;
    return phoneNotes.checkExactNotificationSetting().then(function (x) { if (x && x.exact_alarm === 'denied') show(T('Alerts may be a few minutes late.'), true); });
  }).catch(function () {});
}

if (phoneNotes) {
  // Options: the switch (the shared change handler in app-options.js saves it) and its status line
  var phoneRow = document.createElement('label'), phoneBox = document.createElement('div');
  phoneRow.className = 'option';
  phoneRow.innerHTML = '<span class="option-title">Phone alerts</span><input type="checkbox" role="switch" data-key="phoneAlerts">';
  phoneBox.className = 'option-phone'; phoneBox.id = 'phoneBox'; phoneBox.hidden = true;
  phoneBox.innerHTML = '<p class="option-text" id="phoneStatus" aria-live="polite"></p><button type="button" class="pill-btn" id="phoneExact" hidden>Allow exact times</button>';
  var phoneAfter = optionsList.querySelector('input[data-key="vibration"]');
  phoneAfter = phoneAfter && phoneAfter.closest('.option');
  if (phoneAfter) phoneAfter.after(phoneRow, phoneBox); else optionsList.append(phoneRow, phoneBox);
  phoneRow.querySelector('input').addEventListener('change', function () { phoneSig = ''; phoneSoon(); setTimeout(phoneStatus, 1200); });
  $('phoneExact').addEventListener('click', function () { phoneNotes.changeExactNotificationSetting().catch(function () {}); });
  $('optionsBtn').addEventListener('click', phoneStatus);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { phoneStatus(); phoneSig = ''; phoneSoon(); } });   // (back from the phone's settings)

  phoneNotes.addListener('localNotificationActionPerformed', phoneAction);   // (kept by the app until heard, so a tap that opened it still arrives)
  // with the app open Fumu rings himself (timeCheck): the notification is taken away again (not a snooze: he does not ring for those)
  phoneNotes.addListener('localNotificationReceived', function (n) {
    if (!document.hidden && n && n.id && n.id < PHONE_SNOOZE) phoneNotes.removeDeliveredNotifications({ notifications: [{ id: n.id }] }).catch(function () {});
  });
  phoneSoon();
}
