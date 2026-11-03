import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_LESSON_IDS, readProgress, validIds } from '../progress.js';
function storage(initial = {}) { const values = new Map(Object.entries(initial)); return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }; }
test('migrates original positions to stable IDs and retains the old data', () => {
  const db = storage({ old: '[0,2,2,17]' });
  assert.deepEqual(readProgress(db, 'new', 'old'), [LEGACY_LESSON_IDS[0], LEGACY_LESSON_IDS[2]]);
  assert.equal(db.getItem('old'), '[0,2,2,17]');
  assert.deepEqual(JSON.parse(db.getItem('new')), [LEGACY_LESSON_IDS[0], LEGACY_LESSON_IDS[2]]);
});
test('does not reimport legacy progress when v2 already exists', () => {
  const db = storage({ old: '[0,1,2]', new: '[]' });
  assert.deepEqual(readProgress(db, 'new', 'old'), []);
});
test('progress keeps stable valid IDs and removes duplicates', () => {
  assert.deepEqual(validIds([LEGACY_LESSON_IDS[1], 1, LEGACY_LESSON_IDS[1], 'bad']), [LEGACY_LESSON_IDS[1]]);
});
