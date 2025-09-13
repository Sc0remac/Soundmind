#!/usr/bin/env node
// Lightweight Supabase admin REPL for direct DB access.
// Usage: npm run db:repl

import repl from 'repl';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Best-effort .env.local loader (no external deps)
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
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (e) {
    // Non-fatal
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url) {
  console.error('Missing Supabase URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)');
  process.exit(1);
}

// Prefer service role if present, else fall back to anon (RLS enforced)
const key = serviceKey || anonKey;
if (!key) {
  console.error('Missing Supabase key (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('Connected to Supabase project:', url);
console.log(serviceKey ? 'Mode: service role (admin)' : 'Mode: anon (RLS enforced)');
console.log('Examples:');
console.log("  await supabase.from('moods').select('*').limit(5)");
console.log("  await supabase.from('moods').insert({ score: 8, energy: 7, stress: 3 })");
console.log("  await supabase.from('moods').update({ score: 9 }).eq('id', '<uuid>')");
console.log('Type .help for tips, Ctrl+C to exit.');

const r = repl.start({ prompt: 'supabase> ', useGlobal: true });
r.context.supabase = supabase;
r.context.admin = supabase;
r.defineCommand('help', {
  help: 'Show usage tips',
  action() {
    console.log('\nTips:');
    console.log('- This REPL does not support top-level await by default.');
    console.log("  Use .await <expr> to await results or append .then(console.log).\n");
    console.log('Commands:');
    console.log("  .await <expr>    Evaluate an expression with await, e.g. .await supabase.from('moods').select('*')");
    console.log("  .help            Show this help\n");
    this.displayPrompt();
  },
});

// Simple helper to allow awaiting a single expression
r.defineCommand('await', {
  help: 'Await a promise expression',
  async action(expr) {
    try {
      const result = await eval(expr);
      console.dir(result, { depth: 5, colors: true });
    } catch (e) {
      console.error(e);
    }
    this.displayPrompt();
  },
});

