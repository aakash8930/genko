import { createClient } from '@supabase/supabase-js';

const escapeText = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeLessons(rows) {
  if (!Array.isArray(rows) || !rows.length || new Set(rows.map(item => item.id)).size !== rows.length || rows.some((item, i) =>
    typeof item.id !== 'string' || !uuid.test(item.id) || typeof item.title !== 'string' ||
    !Number.isInteger(item.position) || item.position < 1 || (i > 0 && item.position <= rows[i - 1].position) || !item.content ||
    !Array.isArray(item.content.answers) || item.content.answers.length !== 4 ||
    !Number.isInteger(item.content.correct) || item.content.correct < 0 || item.content.correct > 3 ||
    !['subtitle', 'character', 'sound', 'description'].every(k => typeof item.content[k] === 'string') ||
    !item.content.answers.every(a => typeof a === 'string') ||
    (item.content.question !== undefined && typeof item.content.question !== 'string')
  )) throw new Error('Invalid learning path');
  return rows.map(item => ({ id: item.id, title: escapeText(item.title), subtitle: escapeText(item.content.subtitle), character: escapeText(item.content.character), sound: escapeText(item.content.sound), description: escapeText(item.content.description), question: escapeText(item.content.question ?? (item.content.character === 'こんにちは' ? 'What does this phrase mean?' : 'What sound does this hiragana character make?')), answers: item.content.answers.map(escapeText), correct: item.content.correct }));
}

export async function fetchPublishedLessons(client) {
  const { data: course, error: courseError } = await client.from('courses').select('id').eq('slug', 'japanese-beginner').maybeSingle();
  if (courseError || !course) throw courseError || new Error('Course unavailable');
  const { data, error } = await client.from('lessons').select('id,title,position,content').eq('course_id', course.id).order('position');
  if (error) throw error;
  return normalizeLessons(data);
}

export async function loadPublishedLessons() {
  const response = await fetch('/api/config', { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error('Learning service is not configured');
  const { supabaseUrl, supabaseKey } = await response.json();
  // An anonymous read-only client avoids interfering with the signed-in session.
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(7000) }) }
  });
  return fetchPublishedLessons(client);
}
