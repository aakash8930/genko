import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLessons, fetchPublishedLessons } from '../learning-data.js';
import { LEGACY_LESSON_IDS } from '../progress.js';
const rows = ['Your first character', 'One more sound', 'Say hello'].map((title, i) => ({ id: LEGACY_LESSON_IDS[i], title, position: i + 1, content: { subtitle: 'Practice', character: '<script>', sound: 'a', description: 'Learn', answers: ['a', 'b', 'c', 'd'], correct: 0 } }));
test('validates IDs and content while permitting course growth and reordering', () => {
  assert.equal(normalizeLessons(rows)[0].character, '&lt;script&gt;');
  assert.equal(normalizeLessons([rows[1], { ...rows[0], position: 4 }])[1].id, rows[0].id);
  assert.throws(() => normalizeLessons([{ ...rows[0], id: 'bad' }]));
  assert.throws(() => normalizeLessons([rows[0], rows[0]]));
  assert.throws(() => normalizeLessons([{ ...rows[0], content: { ...rows[0].content, correct: 4 } }]));
});
test('loads published course and lessons using the browser client', async () => {
  const calls = [];
  const client = { from(table) { calls.push(table); return table === 'courses'
    ? { select() { return { eq() { return { maybeSingle: async () => ({ data: { id: 'course' }, error: null }) }; } }; } }
    : { select() { return { eq() { return { order: async () => ({ data: rows, error: null }) }; } }; } }; } };
  assert.equal((await fetchPublishedLessons(client)).length, 3);
  assert.deepEqual(calls, ['courses', 'lessons']);
});
test('surfaces database errors rather than claiming content is current', async () => {
  const client = { from() { return { select() { return { eq() { return { maybeSingle: async () => ({ data: null, error: new Error('offline') }) }; } }; } }; } };
  await assert.rejects(fetchPublishedLessons(client), /offline/);
});
