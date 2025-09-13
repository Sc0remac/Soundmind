#!/usr/bin/env node
// One-off Supabase admin runner. Evaluates a JS expression with `supabase` in scope.
// Examples:
//   npm run db:run "await supabase.from('moods').select('*').limit(1)"
//   npm run db:run "await supabase.from('moods').insert({ score: 7 })"

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const root = path.resolve(__dirname, '..');
    const envPath = path.resolve(root, '.env.local');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {}
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!url) {
  console.error('Missing Supabase URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)');
  process.exit(1);
}
const key = serviceKey || anonKey;
if (!key) {
  console.error('Missing Supabase key (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const expr = process.argv.slice(2).join(' ').trim();
if (!expr) {
  console.error('Usage: node scripts/supabase-run.mjs "<js expression using supabase>"');
  process.exit(1);
}

try {
  const runner = new Function('supabase', `return (async () => { return (${expr}); })()`);
  const result = await runner(supabase);
  const safe = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
  console.log(safe);
} catch (e) {
  console.error(e);
  process.exit(1);
}
