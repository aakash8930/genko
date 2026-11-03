import express from 'express';
import { createClient } from '@supabase/supabase-js';

function isPublicKey(key) {
  if (key.startsWith('sb_publishable_')) return true;
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { return false; }
}

export function createApp({ supabaseUrl = '', supabaseKey = '', supabaseClient } = {}) {
  if (supabaseKey && !isPublicKey(supabaseKey)) throw new Error('SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key, never a secret or service-role key');
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  // Use a publishable key only. RLS, not this client, protects the database.
  const supabase = supabaseClient ?? (supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(5000) }) } })
    : null);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', supabase: supabase ? 'configured' : 'not configured' }));
  // Only the public project URL and publishable key are exposed to browsers.
  app.get('/api/config', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Accounts are not configured' });
    return res.json({ supabaseUrl, supabaseKey });
  });
  app.get('/api/courses/:slug/lessons', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Learning service is not configured' });
    try {
      const { data: course, error: courseError } = await supabase.from('courses').select('id').eq('slug', req.params.slug).maybeSingle();
      if (courseError) throw courseError;
      if (!course) return res.status(404).json({ error: 'Course not found' });
      const { data, error } = await supabase.from('lessons').select('id,title,position,content').eq('course_id', course.id).order('position');
      if (error) throw error;
      return res.json({ lessons: data });
    } catch {
      return res.status(503).json({ error: 'Learning service is temporarily unavailable' });
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}
