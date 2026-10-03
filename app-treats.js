// Treats: give Nibble a snack that is not from your list. Only a cute reaction (three a day);
// it never counts for goals, the Top 10 or personalities.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

$('treatBtn').addEventListener('click', function () {
  var treat = L.giveTreat(state.pet, new Date());
  if (!treat) {
    if (!busy) pulse('hop', 460);
    talk('treatFull', ['too full for treats!', 'tummy full, tomorrow?', 'no more today ♡'], 1600);
    return;
  }
  save();
  // it comes flying from the Pet button
  eat({ id: 'treat', emoji: treat.emoji, cat: treat.cat, treat: true }, $('petMenuBtn').getBoundingClientRect(), null);
});
