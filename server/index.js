import 'dotenv/config';
import express from 'express';
import { createApp } from './app.js';

const app = createApp({ supabaseUrl: process.env.SUPABASE_URL, supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY });
const port = Number(process.env.API_PORT || process.env.PORT || 3001);
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (_req, res) => res.sendFile('index.html', { root: 'dist' }));
}
app.listen(port, '0.0.0.0', () => console.log(`Sora server listening on port ${port}`));
