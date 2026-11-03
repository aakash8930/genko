import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

test('health endpoint reports configuration without exposing credentials', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  t.after(() => server.close());
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/health`);
  assert.deepEqual(await response.json(), { status: 'ok', supabase: 'not configured' });
  assert.equal((await fetch(`${base}/api/missing`)).status, 404);
});

test('lessons endpoint handles missing configuration and database failures', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  t.after(() => server.close());
  await new Promise(resolve => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/courses/japanese-beginner/lessons`);
  assert.equal(response.status, 503);
});

test('lessons endpoint returns published course data', async (t) => {
  const client = { from(table) { return table === 'courses'
    ? { select() { return { eq() { return { maybeSingle: async () => ({ data: { id: 'course' }, error: null }) }; } }; } }
    : { select() { return { eq() { return { order: async () => ({ data: [{ title: 'Lesson', position: 1, content: {} }], error: null }) }; } }; } }; } };
  const server = createApp({ supabaseClient: client }).listen(0, '127.0.0.1');
  t.after(() => server.close());
  await new Promise(resolve => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/courses/japanese-beginner/lessons`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).lessons[0].title, 'Lesson');
});

test('public config endpoint does not return missing or private configuration', async (t) => {
  const server = createApp({ supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_publishable_test' }).listen(0, '127.0.0.1');
  t.after(() => server.close());
  await new Promise(resolve => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/config`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_publishable_test' });
});

 test('refuses to expose a secret key', () => {
  assert.throws(() => createApp({ supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_secret_unsafe' }), /publishable/);
});
