#!/usr/bin/env ts-node
/**
 * Backfill audio features from Reccobeats for any spotify_tracks rows
 * missing features (NULL or 0). Also consolidates bpm/tempo values where
 * one is present and the other is missing or zero.
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  try {
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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing Supabase URL/key');
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Feature = {
  href?: string;
  acousticness?: number;
  danceability?: number;
  energy?: number;
  instrumentalness?: number;
  key?: number;
  liveness?: number;
  loudness?: number;
  mode?: number;
  speechiness?: number;
  tempo?: number;
  valence?: number;
};

function extractSpotifyId(href?: string | null) {
  if (!href) return null;
  const m = href.match(/track\/([A-Za-z0-9]+)/);
  return m?.[1] || null;
}

async function countMissing() {
  const { count } = await supabase
    .from('spotify_tracks')
    .select('id', { count: 'exact', head: true })
    .or([
      'tempo.is.null','tempo.eq.0','bpm.is.null','bpm.eq.0',
      'danceability.is.null','energy.is.null','acousticness.is.null','instrumentalness.is.null',
      'liveness.is.null','loudness.is.null','speechiness.is.null','valence.is.null','key.is.null','mode.is.null',
    ].join(','));
  return count || 0;
}

async function consolidateBpmTempo() {
  // 1) bpm <- tempo where bpm missing/0 and tempo > 0
  const { data: a } = await supabase
    .from('spotify_tracks')
    .select('id,tempo,bpm')
    .or('bpm.is.null,bpm.eq.0')
    .gt('tempo', 0)
    .limit(10000);
  const rowsA = (a || []).filter(r => typeof r.tempo === 'number' && r.tempo > 0);
  if (rowsA.length) {
    const patches = rowsA.map(r => ({ id: r.id, bpm: r.tempo }));
    await supabase.from('spotify_tracks').upsert(patches, { onConflict: 'id' });
  }

  // 2) tempo <- bpm where tempo missing/0 and bpm > 0
  const { data: b } = await supabase
    .from('spotify_tracks')
    .select('id,tempo,bpm')
    .or('tempo.is.null,tempo.eq.0')
    .gt('bpm', 0)
    .limit(10000);
  const rowsB = (b || []).filter(r => typeof r.bpm === 'number' && r.bpm > 0);
  if (rowsB.length) {
    const patches = rowsB.map(r => ({ id: r.id, tempo: r.bpm }));
    await supabase.from('spotify_tracks').upsert(patches, { onConflict: 'id' });
  }
}

async function backfillMissing(maxTotal = 5000) {
  let totalLooked = 0;
  let totalUpdated = 0;
  const pageSize = 500;
  while (totalLooked < maxTotal) {
    const { data: rows } = await supabase
      .from('spotify_tracks')
      .select('id,name,meta_provider,tempo,bpm,danceability,energy,acousticness,instrumentalness,liveness,loudness,speechiness,valence,key,mode')
      .or([
        'tempo.is.null','tempo.eq.0','bpm.is.null','bpm.eq.0',
        'danceability.is.null','energy.is.null','acousticness.is.null','instrumentalness.is.null',
        'liveness.is.null','loudness.is.null','speechiness.is.null','valence.is.null','key.is.null','mode.is.null',
      ].join(','))
      .limit(pageSize);

    const batch = (rows || []).filter(r => r?.id);
    if (!batch.length) break;
    const ids = batch.map(r => r.id as string);

    const featuresById = new Map<string, Feature>();
    for (let i = 0; i < ids.length; i += 40) {
      const slice = ids.slice(i, i + 40);
      const rq = new URL('https://api.reccobeats.com/v1/audio-features');
      rq.searchParams.set('ids', slice.join(','));
      const res = await fetch(rq.toString());
      if (res.ok) {
        const j = (await res.json()) as { content?: Feature[] };
        for (const f of j?.content || []) {
          const sid = extractSpotifyId(f.href);
          if (sid) featuresById.set(sid, f);
        }
      } else {
        const text = await res.text();
        console.log(`reccobeats ${res.status}: ${text.slice(0,200)} ...`);
      }
      totalLooked += slice.length;
      if (i + 40 < ids.length) await new Promise(r => setTimeout(r, 80));
    }

    const nowIso = new Date().toISOString();
    const patches: any[] = [];
    console.log(`Fetched features for ${featuresById.size}/${ids.length} ids in this batch`);
    for (const r of batch) {
      const f = featuresById.get(r.id);
      if (!f) continue;
      patches.push({
        id: r.id,
        ...(r.name ? { name: r.name } : {}),
        tempo: typeof f.tempo === 'number' ? f.tempo : r.tempo,
        bpm: typeof f.tempo === 'number' ? f.tempo : r.bpm,
        danceability: typeof f.danceability === 'number' ? Number(f.danceability.toFixed(3)) : r.danceability,
        energy: typeof f.energy === 'number' ? Number(f.energy.toFixed(3)) : r.energy,
        acousticness: typeof f.acousticness === 'number' ? Number(f.acousticness.toFixed(3)) : r.acousticness,
        instrumentalness: typeof f.instrumentalness === 'number' ? Number(f.instrumentalness.toFixed(5)) : r.instrumentalness,
        liveness: typeof f.liveness === 'number' ? Number(f.liveness.toFixed(3)) : r.liveness,
        loudness: typeof f.loudness === 'number' ? Number(f.loudness.toFixed(3)) : r.loudness,
        speechiness: typeof f.speechiness === 'number' ? Number(f.speechiness.toFixed(3)) : r.speechiness,
        valence: typeof f.valence === 'number' ? Number(f.valence.toFixed(3)) : r.valence,
        key: typeof f.key === 'number' ? f.key : r.key,
        mode: typeof f.mode === 'number' ? f.mode : r.mode,
        features_fetched_at: nowIso,
        last_enriched_at: nowIso,
        meta_provider: {
          ...(typeof (r as any).meta_provider === 'object' && (r as any).meta_provider ? (r as any).meta_provider : {}),
          reccobeats: { ok: true, fetched_at: nowIso },
        },
      });
    }
    console.log(`Patches to upsert: ${patches.length}`);
    if (patches.length) {
      const { error } = await supabase.from('spotify_tracks').upsert(patches, { onConflict: 'id' });
      if (error) throw error;
      totalUpdated += patches.length;
    }
    await new Promise(r => setTimeout(r, 120));
  }
  return { totalLooked, totalUpdated };
}

(async () => {
  const before = await countMissing();
  console.log(`Missing before: ${before}`);
  await consolidateBpmTempo();
  const res = await backfillMissing(10000);
  const after = await countMissing();
  console.log(`Backfill looked: ${res.totalLooked}, updated: ${res.totalUpdated}`);
  console.log(`Missing after: ${after}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
