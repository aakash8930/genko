import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

async function setup() {
  const dom = new JSDOM('<button id="account-button">Sign in</button><dialog id="account-dialog"><button id="account-close"></button><div id="account-content"></div></dialog>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const { window } = dom;
  const calls = [];
  let callback = () => {};
  const auth = {
    onAuthStateChange: fn => { callback = fn; },
    getSession: async () => ({ data: { session: null } }),
    signUp: async args => { calls.push(['signup', args]); return { data: { session: null }, error: null }; },
    resend: async args => { calls.push(['resend', args]); return { error: null }; },
    resetPasswordForEmail: async address => { calls.push(['reset', address]); return { data: {}, error: null }; },
    verifyOtp: async args => { calls.push(['verify', args]); if (args.type === 'recovery') callback('PASSWORD_RECOVERY', { user: { id: 'u', email: args.email } }); else callback('SIGNED_IN', { user: { id: 'u', email: args.email } }); return { data: { user: { id: 'u', email: args.email }, session: {} }, error: null }; },
    updateUser: async args => { calls.push(['update', args]); return { data: {}, error: null }; },
    signOut: async () => ({ error: null })
  };
  window.createClient = () => ({ auth });
  window.fetch = async () => ({ ok: true, json: async () => ({ supabaseUrl: 'https://example.test', supabaseKey: 'public' }) });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const source = (await readFile(new URL('../auth.js', import.meta.url), 'utf8')).replace("import { createClient } from '@supabase/supabase-js';", '');
  window.eval(source);
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  await flush();
  return { window, calls, flush };
}
function click(w, selector) { const element = w.document.querySelector(selector); assert.ok(element, `missing ${selector}`); element.click(); }
async function submit(w, values, flush) {
  for (const [name, value] of Object.entries(values)) w.document.querySelector(`[name="${name}"]`).value = value;
  w.document.querySelector('#auth-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
}
test('signup sends and verifies an emailed code; resend uses signup type', async () => {
  const { window: w, calls, flush } = await setup();
  click(w, '#account-button'); click(w, '[data-auth="signup"]');
  await submit(w, { email: 'learner@example.com', password: 'test-password' }, flush);
  assert.ok(w.document.querySelector('[name="code"]'));
  click(w, '[data-auth="resend"]'); await flush();
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), ['resend', { type: 'signup', email: 'learner@example.com' }]);
  await submit(w, { email: 'learner@example.com', code: '12345678' }, flush);
  assert.equal(calls[2][1].type, 'signup');
  assert.equal(w.document.querySelector('#account-email').textContent, 'learner@example.com');
  w.close();
});
test('recovery code opens the new-password form even if auth emits recovery during verification', async () => {
  const { window: w, calls, flush } = await setup();
  click(w, '#account-button'); click(w, '[data-auth="reset"]');
  await submit(w, { email: 'learner@example.com' }, flush);
  await submit(w, { email: 'learner@example.com', code: '12345678' }, flush);
  assert.equal(calls[1][1].type, 'recovery');
  assert.equal(w.document.querySelector('#account-title').textContent, 'Choose a new password.');
  await submit(w, { password: 'new-password' }, flush);
  assert.equal(calls[2][0], 'update');
  assert.match(w.document.querySelector('.account-message').textContent, /Password updated/);
  w.close();
});
