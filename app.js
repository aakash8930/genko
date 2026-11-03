import { loadPublishedLessons } from './learning-data.js';
import { LEGACY_LESSON_IDS, readProgress, validIds } from './progress.js';

const dialog = document.querySelector('#lesson');
const body = document.querySelector('#lesson-body');
const guestLegacyKey = 'sora-japanese-progress-v1';
const guestKey = 'sora-japanese-progress-v2';
let storageKey = guestKey;
let legacyKey = guestLegacyKey;
let account = null;
let syncStatus = '';
let syncVersion = 0;
let lessons = [
  { id: LEGACY_LESSON_IDS[0], title: 'Your first character', subtitle: 'Meet hiragana', character: 'あ', sound: 'a (ah)', description: 'Japanese has three writing systems. Hiragana is a great place to start. This character is pronounced like the “a” in “father.”', answers: ['I (ee)', 'A (ah)', 'U (oo)', 'E (eh)'], correct: 1 },
  { id: LEGACY_LESSON_IDS[1], title: 'One more sound', subtitle: 'Build your hiragana', character: 'い', sound: 'i (ee)', description: 'This hiragana character makes an “ee” sound, like the “ee” in “see.” Say it out loud a few times.', answers: ['A (ah)', 'E (eh)', 'I (ee)', 'O (oh)'], correct: 2 },
  { id: LEGACY_LESSON_IDS[2], title: 'Say hello', subtitle: 'Your first phrase', character: 'こんにちは', sound: 'konnichiwa', description: 'This is a common way to say “hello” in Japanese. Try saying it: kon-nee-chee-wah.', answers: ['Thank you', 'Goodbye', 'Good night', 'Hello'], correct: 3 }
];
let lessonSource = 'Loading lessons…';
let completed = loadProgress();
let selected = 0;
let phase = 'list';
let reviewIds = [];
let reviewIndex = 0;
let reviewCorrect = 0;
let reviewHadMistake = false;
let reviewAnswered = false;
function loadProgress() { return readProgress(localStorage, storageKey, legacyKey); }
function saveProgress() { try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch { syncStatus = 'This browser could not save progress locally.'; } updateProgress(); if (account) syncProgress(); }
function updateProgress() {
  const count = lessons.filter(lesson => completed.includes(lesson.id)).length;
  const percent = Math.round(count / lessons.length * 100);
  document.querySelector('#course-progress-text').textContent = `${count} of ${lessons.length} lessons complete`;
  document.querySelector('#course-progress-percent').textContent = `${percent}%`;
  document.querySelector('#course-progress-bar').style.width = `${percent}%`;
  document.querySelectorAll('[data-start]').forEach(button => { if (button.classList.contains('round-button')) return; const text = completed.length ? 'Continue learning' : (button.closest('.hero-actions') ? 'Start learning for free' : button.closest('.closing') ? "Let's get started" : button.closest('.how') ? 'Give it a try' : 'Start learning'); button.innerHTML = `${text} <span>↗</span>`; });
}
function render() {
  if (phase === 'list') {
    if (pendingLessons) { lessons = pendingLessons; pendingLessons = null; updateProgress(); }
    body.innerHTML = `<div class="eyebrow"><span class="spark">✳</span> YOUR LEARNING PATH</div><h2>A little Japanese, every day.</h2><p>Start anywhere, take your time, and revisit a lesson whenever you like.</p><div class="path-list">${lessons.map((lesson, i) => `<button class="path-item" data-lesson="${i}"><span class="path-number ${completed.includes(lesson.id) ? 'done' : ''}">${completed.includes(lesson.id) ? '✓' : `0${i + 1}`}</span><span class="path-copy"><strong>${lesson.title}</strong><small>${lesson.subtitle} · 1 min</small></span><span class="path-arrow">↗</span></button>`).join('')}</div><p class="storage-note">✳ ${lessonSource} ${account ? syncStatus : 'Guest progress is saved on this device, in this browser.'}</p>${lessons.some(lesson => completed.includes(lesson.id)) ? '<button class="button button-dark review-start" data-action="start-review">Review what you learned <span>↗</span></button>' : '<p class="review-hint">Complete a lesson to unlock a quick review.</p>'}${lessonSource.startsWith('Showing built-in') ? '<button class="auth-switch" data-action="retry-lessons">Retry loading lessons</button>' : ''}`;
    return;
  }
  if (phase === 'review' || phase === 'review-result') {
    if (phase === 'review-result') {
      body.innerHTML = `<button class="back-link" data-action="back">← All lessons</button><div class="eyebrow"><span class="spark">✳</span> REVIEW COMPLETE</div><h2>Nice work showing up. ✳</h2><p>You got <strong>${reviewCorrect} of ${reviewIds.length}</strong> right on the first try. Every review is a chance to make it stick.</p><button class="button button-dark lesson-next" data-action="start-review">Practice again <span>↗</span></button><br><button class="auth-switch" data-action="back">Back to your path</button>`;
      return;
    }
    const lesson = lessons.find(item => item.id === reviewIds[reviewIndex]);
    if (!lesson) { phase = 'list'; render(); return; }
    body.innerHTML = `<button class="back-link" data-action="back">← All lessons</button><div class="eyebrow"><span class="spark">✳</span> QUICK REVIEW · ${reviewIndex + 1} OF ${reviewIds.length}</div><div class="lesson-progress"><span>KEEP GOING</span><div><i style="width:${(reviewIndex + 1) / reviewIds.length * 100}%"></i></div></div><h2>Do you remember?</h2><p>${lesson.question || (lesson.id === LEGACY_LESSON_IDS[2] ? 'What does this phrase mean?' : 'What sound does this hiragana character make?')}</p><div class="character ${lesson.character.length > 3 ? 'phrase' : ''}" lang="ja">${lesson.character}</div><div class="answer-grid">${lesson.answers.map((answer, i) => `<button class="answer" data-review-answer="${i}" ${reviewAnswered ? 'disabled' : ''}>${answer}</button>`).join('')}</div><p class="feedback" aria-live="polite">${reviewAnswered ? 'You got it! ✳' : ''}</p>${reviewAnswered ? `<button class="button button-dark lesson-next" data-action="review-next">${reviewIndex + 1 === reviewIds.length ? 'See results' : 'Next question'} <span>↗</span></button>` : ''}`;
    return;
  }
  const lesson = lessons[selected];
  const heading = `<button class="back-link" data-action="back">← All lessons</button><div class="eyebrow"><span class="spark">✳</span> JAPANESE · LESSON ${selected + 1} OF ${lessons.length}</div><div class="lesson-progress"><span>${phase === 'learn' ? 'LEARN' : phase === 'quiz' ? 'PRACTICE' : 'COMPLETE'}</span><div><i style="width:${phase === 'learn' ? 33 : phase === 'quiz' ? 66 : 100}%"></i></div></div>`;
  if (phase === 'learn') body.innerHTML = `${heading}<h2>${lesson.title}.</h2><p>${lesson.description}</p><div class="character ${lesson.character.length > 3 ? 'phrase' : ''}" lang="ja">${lesson.character}</div><p>Remember: <strong>${lesson.sound}</strong></p><button class="button button-dark lesson-next" data-action="quiz">Let's practice <span>↗</span></button>`;
  if (phase === 'quiz') body.innerHTML = `${heading}<h2>A quick little check.</h2><p>${lesson.question || (lesson.id === LEGACY_LESSON_IDS[2] ? 'What does this phrase mean?' : 'What sound does this hiragana character make?')}</p><div class="character ${lesson.character.length > 3 ? 'phrase' : ''}" lang="ja">${lesson.character}</div><div class="answer-grid">${lesson.answers.map((answer, i) => `<button class="answer" data-answer="${i}">${answer}</button>`).join('')}</div><p class="feedback" aria-live="polite"></p>`;
  if (phase === 'complete') body.innerHTML = `${heading}<h2>Look at you go! ✳</h2><p>Another little win for your learning journey. You can always come back and practice again.</p><div class="character ${lesson.character.length > 3 ? 'phrase' : ''}" lang="ja">${lesson.character} <span class="character-meaning">= ${lesson.sound}</span></div>${selected < lessons.length - 1 ? '<button class="button button-dark lesson-next" data-action="next">Next lesson <span>↗</span></button>' : account ? '<button class="button button-dark lesson-next" data-action="back">See your path <span>↗</span></button>' : '<p class="account-note">You finished the starter lessons! Create an account or sign in to get ready for what’s next. You can also keep learning as a guest.</p><button class="button button-dark lesson-next" data-action="account">Sign in or create account <span>↗</span></button><br><button class="auth-switch" data-action="back">Back to your path</button>'}`;
}
document.querySelectorAll('[data-start]').forEach(button => button.addEventListener('click', () => { phase = 'list'; render(); dialog.showModal(); }));
document.querySelector('.close').addEventListener('click', () => dialog.close());
body.addEventListener('click', event => {
  const lessonButton = event.target.closest('[data-lesson]');
  const action = event.target.closest('[data-action]')?.dataset.action;
  const answer = event.target.closest('[data-answer]');
  const reviewAnswer = event.target.closest('[data-review-answer]');
  if (lessonButton) { selected = Number(lessonButton.dataset.lesson); phase = 'learn'; render(); }
  else if (action === 'back') { phase = 'list'; render(); }
  else if (action === 'start-review') { reviewIds = lessons.filter(lesson => completed.includes(lesson.id)).map(lesson => lesson.id); if (reviewIds.length) { reviewIndex = 0; reviewCorrect = 0; reviewHadMistake = false; reviewAnswered = false; phase = 'review'; render(); } }
  else if (action === 'review-next') { reviewIndex++; reviewHadMistake = false; reviewAnswered = false; if (reviewIndex >= reviewIds.length) phase = 'review-result'; render(); }
  else if (reviewAnswer && !reviewAnswered) { const lesson = lessons.find(item => item.id === reviewIds[reviewIndex]); if (lesson && Number(reviewAnswer.dataset.reviewAnswer) === lesson.correct) { if (!reviewHadMistake) reviewCorrect++; reviewAnswered = true; render(); } else { reviewHadMistake = true; body.querySelector('.feedback').textContent = 'Not quite—try once more!'; reviewAnswer.classList.add('incorrect'); } }
  else if (action === 'next') { selected++; phase = 'learn'; render(); }
  else if (action === 'account') { dialog.close(); document.querySelector('#account-button').click(); }
  else if (action === 'retry-lessons') { loadLessons(); }
  else if (action === 'quiz') { phase = 'quiz'; render(); }
  else if (answer) { if (Number(answer.dataset.answer) === lessons[selected].correct) { if (!completed.includes(lessons[selected].id)) completed.push(lessons[selected].id); saveProgress(); phase = 'complete'; render(); } else { body.querySelector('.feedback').textContent = 'Not quite—give it another try!'; answer.classList.add('incorrect'); } }
});
updateProgress();

// Load public course content in the browser: the sandbox server cannot reach Supabase.
let loadVersion = 0;
let pendingLessons = null;
async function loadLessons() {
  const version = ++loadVersion;
  lessonSource = 'Loading lessons…';
  if (dialog.open && phase === 'list') render();
  try {
    const loaded = await loadPublishedLessons();
    if (version !== loadVersion) return;
    if (dialog.open && phase !== 'list') pendingLessons = loaded;
    else lessons = loaded;
    lessonSource = 'Lessons are up to date.';
  } catch {
    if (version !== loadVersion) return;
    lessonSource = 'Showing built-in lessons while the learning service is unavailable.';
  }
  updateProgress();
  if (dialog.open && phase === 'list') render();
}
loadLessons();

// Account caches are isolated from guest and other users. Guest import is explicit.
async function syncProgress() {
  if (!account) return;
  const current = account;
  const version = ++syncVersion;
  syncStatus = 'Syncing account progress…';
  try {
    const { data: course, error: ce } = await current.client.from('courses').select('id').eq('slug', 'japanese-beginner').single();
    if (ce) throw ce;
    const { data: rows, error: le } = await current.client.from('lessons').select('id').eq('course_id', course.id).order('position');
    if (le) throw le;
    if (account !== current || version !== syncVersion) return;
    const available = new Set(rows.map(row => row.id));
    const pending = completed.filter(id => available.has(id));
    if (pending.length) {
      const { error } = await current.client.from('lesson_progress').upsert(pending.map(id => ({ user_id: current.user.id, lesson_id: id })), { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });
      if (error) throw error;
    }
    const { data: saved, error: pe } = await current.client.from('lesson_progress').select('lesson_id').eq('user_id', current.user.id);
    if (pe) throw pe;
    if (account !== current || version !== syncVersion) return;
    completed = validIds([...completed, ...saved.map(row => row.lesson_id)]);
    try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch { /* Server has the saved copy. */ }
    syncStatus = 'Account progress is synced.';
  } catch {
    if (account !== current || version !== syncVersion) return;
    syncStatus = 'Could not sync. Progress is kept on this device and will retry when you sign in or complete another lesson.';
  }
  updateProgress();
  if (dialog.open && phase === 'list') render();
}
window.addEventListener('sora-auth', event => {
  const { client, user } = event.detail;
  if (account?.user.id === user?.id && (account || !user)) return;
  syncVersion++;
  account = user && client ? { client, user } : null;
  legacyKey = account ? `sora-japanese-progress-user-${account.user.id}` : guestLegacyKey;
  storageKey = account ? `${legacyKey}-v2` : guestKey;
  completed = loadProgress();
  syncStatus = account ? 'Connecting to your account…' : '';
  updateProgress();
  if (dialog.open && phase === 'list') render();
  if (account) syncProgress();
});
window.addEventListener('sora-import-guest', () => {
  if (!account) return;
  const guest = readProgress(localStorage, guestKey, guestLegacyKey);
  completed = validIds([...completed, ...guest]);
  saveProgress();
});
