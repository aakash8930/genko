// IDs assigned to the original three seeded lessons. Never reassign these IDs.
export const LEGACY_LESSON_IDS = [
  '9e3f3448-ed79-4ab4-942d-fc9b40c218d4',
  'd909fd79-7715-4127-8bba-d4d3405f07c4',
  '5456438b-d9cc-4179-91d7-04fe103b2e3b'
];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validIds(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && uuid.test(id)))] : [];
}
export function readProgress(storage, key, oldKey) {
  try {
    const saved = storage.getItem(key);
    if (saved !== null) return validIds(JSON.parse(saved));
    const legacy = JSON.parse(storage.getItem(oldKey));
    const ids = Array.isArray(legacy) ? [...new Set(legacy.filter(n => Number.isInteger(n) && n >= 0 && n < LEGACY_LESSON_IDS.length).map(n => LEGACY_LESSON_IDS[n]))] : [];
    // Keep the original key as a backup, and never overwrite a v2 record.
    try { storage.setItem(key, JSON.stringify(ids)); } catch { /* Continue with migrated values in memory. */ }
    return ids;
  } catch { return []; }
}
