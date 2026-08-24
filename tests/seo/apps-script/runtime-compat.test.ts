import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calendarDateParts,
  formatCalendarDate,
  isValidHostname,
  isValidIanaTimeZone,
} from '../../../seo/apps-script/src/RuntimeCompat.ts';

test('calendar helpers honor named source calendars and DST', () => {
  assert.deepEqual(calendarDateParts(new Date('2026-08-06T21:30:00Z'), 'Europe/Athens'), {
    year: 2026, month: 8, day: 7,
  });
  assert.deepEqual(calendarDateParts(new Date('2026-08-06T05:00:00Z'), 'America/Los_Angeles'), {
    year: 2026, month: 8, day: 5,
  });
  assert.equal(formatCalendarDate(new Date('2026-11-02T21:30:00Z'), 'Europe/Athens'), '2026-11-02');
});

test('runtime validators preserve existing timezone and hostname policy', () => {
  assert.equal(isValidIanaTimeZone('Europe/Athens'), true);
  assert.equal(isValidIanaTimeZone('Not/A_Timezone'), false);
  assert.equal(isValidHostname('www.evochia.gr'), true);
  assert.equal(isValidHostname('https://www.evochia.gr'), false);
  assert.equal(isValidHostname('www.evochia.gr:443'), false);
  assert.equal(isValidHostname('WWW.evochia.gr'), false);
});
