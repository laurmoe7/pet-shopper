const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic: L } = require('./load');

test('the desktop pet has five scenes', () => {
  assert.equal(L.deskScene({ night: false, bed: false, todo: false }), 'day');
  assert.equal(L.deskScene({ night: false, bed: false, todo: true }), 'day-clip');
  assert.equal(L.deskScene({ night: true, bed: true, todo: false }), 'night-bed');
  assert.equal(L.deskScene({ night: true, bed: true, todo: true }), 'night-bed');   // the clipboard is put away in bed
  assert.equal(L.deskScene({ night: true, bed: false, todo: false }), 'night-drowsy');
  assert.equal(L.deskScene({ night: true, bed: false, todo: true }), 'night-drowsy-clip');
  assert.equal(L.deskScene({ night: false, bed: true, todo: false }), 'day');   // a bed that is still out in the morning is not a night scene
});
