import { createClient } from '@supabase/supabase-js';

const dialog = document.querySelector('#account-dialog');
const content = document.querySelector('#account-content');
const accountButton = document.querySelector('#account-button');
let client = null;
let user = null;
let mode = 'signin'; // signin, signup, reset, signup-code, recovery-code, new-password
let email = '';
let notice = '';
let busy = false;
function broadcast() { window.dispatchEvent(new CustomEvent('sora-auth', { detail: { client, user } })); }

function render() {
  accountButton.textContent = user ? 'My account' : 'Sign in';
  const code = mode === 'signup-code' || mode === 'recovery-code';
  const recovery = mode === 'new-password';
  if (recovery) {
    content.innerHTML = `<h2 id="account-title">Choose a new password.</h2><p>Make it something you haven't used before.</p><form id="auth-form"><label for="auth-password">New password</label><input id="auth-password" name="password" type="password" autocomplete="new-password" minlength="6" required><p class="account-message" role="status" aria-live="polite"></p><button class="button button-dark auth-submit" type="submit">Update password <span>↗</span></button></form>`;
  } else if (code) {
    content.innerHTML = `<h2 id="account-title">Check your email.</h2><p>Enter the code we sent you. If it has expired, request another one.</p><form id="auth-form"><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" autocomplete="email" required><label for="auth-code">Email code</label><input id="auth-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" minlength="6" maxlength="8" required><p class="account-message" role="status" aria-live="polite"></p><button class="button button-dark auth-submit" type="submit">Verify code <span>↗</span></button></form><button class="auth-switch" data-auth="resend">Send a new code</button><br><button class="auth-switch" data-auth="signin">Back to sign in</button>`;
    content.querySelector('#auth-email').value = email;
  } else if (user) {
    content.innerHTML = `<h2 id="account-title">Welcome back. ✳</h2><p>You’re signed in as <strong id="account-email"></strong>.</p><p class="account-note">Your account progress can sync when the learning service is available. Guest progress is separate.</p><p class="account-message" role="status" aria-live="polite"></p><button class="auth-switch" data-auth="import">Import guest progress from this device</button><br><button class="button button-dark lesson-next" data-auth="signout">Sign out <span>↗</span></button>`;
    content.querySelector('#account-email').textContent = user.email || 'your account';
  } else {
    const signup = mode === 'signup';
    const reset = mode === 'reset';
    content.innerHTML = `<h2 id="account-title">${reset ? 'Reset your password.' : signup ? 'Join the journey.' : 'Welcome back.'}</h2><p>${reset ? 'We’ll email you a code to choose a new password.' : signup ? 'Create an account to get ready for more learning.' : 'Sign in to your Sora account.'}</p><form id="auth-form"><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" autocomplete="email" required>${reset ? '' : `<label for="auth-password">Password</label><input id="auth-password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required>`}<p class="account-message" role="status" aria-live="polite"></p><button class="button button-dark auth-submit" type="submit">${reset ? 'Send reset code' : signup ? 'Create account' : 'Sign in'} <span>↗</span></button></form><button class="auth-switch" data-auth="${signup || reset ? 'signin' : 'signup'}">${signup || reset ? 'Back to sign in' : 'New to Sora? Create an account'}</button>${!signup && !reset ? '<button class="auth-switch reset-link" data-auth="reset">Forgot password?</button><button class="auth-switch reset-link" data-auth="signup-code">Already have a confirmation code?</button>' : ''}<p class="account-note">You can still learn without an account. Guest progress stays in this browser.</p>`;
    content.querySelector('#auth-email').value = email;
  }
  const message = content.querySelector('.account-message');
  if (message) message.textContent = notice;
  content.querySelectorAll('button, input').forEach(el => { el.disabled = busy; });
}
function errorMessage(error) {
  if (!error) return 'Something went wrong. Please try again.';
  if (/fetch|network/i.test(error.message || '')) return 'Could not reach the account service. Please check your connection and try again.';
  return error.message || 'Something went wrong. Please try again.';
}
function openAccount() { notice = client ? '' : 'Account service is unavailable right now. You can still learn as a guest.'; render(); if (!dialog.open) dialog.showModal(); }
accountButton.addEventListener('click', openAccount);
document.querySelector('#account-close').addEventListener('click', () => dialog.close());
content.addEventListener('click', async event => {
  const action = event.target.closest('[data-auth]')?.dataset.auth;
  if (['signin', 'signup', 'reset', 'signup-code'].includes(action)) { email = content.querySelector('#auth-email')?.value.trim() || email; mode = action; notice = ''; render(); return; }
  if (action === 'import') { window.dispatchEvent(new Event('sora-import-guest')); notice = 'Import requested. Check your learning path for sync status.'; render(); return; }
  if (!client || busy) return;
  if (action === 'resend') {
    email = content.querySelector('#auth-email').value.trim();
    if (!email || !content.querySelector('#auth-email').checkValidity()) { content.querySelector('#auth-email').reportValidity(); return; }
    busy = true; render();
    try {
      const result = mode === 'signup-code' ? await client.auth.resend({ type: 'signup', email }) : await client.auth.resetPasswordForEmail(email);
      notice = result.error ? errorMessage(result.error) : 'If eligible, a new code has been sent. Check your inbox and spam folder.';
    } catch (error) { notice = errorMessage(error); }
    busy = false; render(); return;
  }
  if (action === 'signout') {
    busy = true; render();
    try { const { error } = await client.auth.signOut(); notice = error ? errorMessage(error) : 'You have signed out.'; if (!error) user = null; }
    catch (error) { notice = errorMessage(error); }
    busy = false; render();
  }
});
content.addEventListener('submit', async event => {
  event.preventDefault();
  if (!client || busy) { notice = 'Account service is unavailable right now. Please try again later.'; render(); return; }
  const form = new FormData(event.target);
  if (form.has('email')) email = String(form.get('email')).trim();
  const password = String(form.get('password') || '');
  const token = String(form.get('code') || '').trim();
  const submittedMode = mode;
  busy = true;
  const submit = event.target.querySelector('button[type="submit"]');
  submit.disabled = true; submit.textContent = 'Please wait…';
  content.querySelector('.account-message').textContent = '';
  try {
    let result;
    if (submittedMode === 'signup') result = await client.auth.signUp({ email, password });
    else if (submittedMode === 'signin') result = await client.auth.signInWithPassword({ email, password });
    else if (submittedMode === 'reset') result = await client.auth.resetPasswordForEmail(email);
    else if (submittedMode === 'signup-code' || submittedMode === 'recovery-code') result = await client.auth.verifyOtp({ email, token, type: submittedMode === 'signup-code' ? 'signup' : 'recovery' });
    else result = await client.auth.updateUser({ password });
    if (result.error) notice = errorMessage(result.error);
    else if (submittedMode === 'new-password') { mode = 'signin'; notice = 'Password updated successfully.'; }
    else if (submittedMode === 'recovery-code') { mode = 'new-password'; notice = ''; }
    else if (submittedMode === 'reset') { mode = 'recovery-code'; notice = 'If an account exists for that email, a code will be sent.'; }
    else if (submittedMode === 'signup' && !result.data.session) { mode = 'signup-code'; notice = 'Check your email for a confirmation code.'; }
    else { user = result.data?.user ?? user; mode = 'signin'; notice = ''; }
  } catch (error) { notice = errorMessage(error); }
  busy = false; render();
});
async function initialize() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('Not configured');
    const { supabaseUrl, supabaseKey } = await response.json();
    client = createClient(supabaseUrl, supabaseKey);
    client.auth.onAuthStateChange((event, session) => {
      user = session?.user ?? null;
      // Recovery OTP also emits PASSWORD_RECOVERY. Do not interrupt a pending verify call.
      if (event === 'PASSWORD_RECOVERY') { mode = 'new-password'; notice = ''; if (!dialog.open) dialog.showModal(); }
      if (event === 'SIGNED_OUT') { mode = 'signin'; }
      setTimeout(broadcast, 0);
      if (dialog.open && !busy) render();
      else accountButton.textContent = user ? 'My account' : 'Sign in';
    });
    const { data } = await client.auth.getSession();
    user = data.session?.user ?? null;
  } catch { client = null; }
  accountButton.textContent = user ? 'My account' : 'Sign in';
  broadcast();
}
initialize();
