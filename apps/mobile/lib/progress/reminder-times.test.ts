import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  readReminder,
  REMINDER_OFF,
  REMINDER_TIMES,
  reminderLabel,
} from './reminder-times.ts';

test('a saved reminder reads back, and anything else is off', () => {
  assert.deepEqual(readReminder('{"on":true,"hour":8,"minute":0}'), {
    on: true,
    hour: 8,
    minute: 0,
  });
  assert.equal(readReminder(null), REMINDER_OFF);
  assert.equal(readReminder('nope'), REMINDER_OFF);
  assert.equal(readReminder('{"on":true,"hour":25,"minute":0}'), REMINDER_OFF);
  assert.equal(readReminder('{"on":"yes","hour":8,"minute":0}'), REMINDER_OFF);
});

test('the choices are distinct and read as a time', () => {
  assert.equal(
    new Set(REMINDER_TIMES.map((t) => t.id)).size,
    REMINDER_TIMES.length,
  );
  assert.equal(
    reminderLabel({ on: true, hour: 18, minute: 30 }, 'en-US'),
    '6:30 PM',
  );
});
