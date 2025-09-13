const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing Supabase URL/key');
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
(async () => {
  const id = '00v2tOidHdS70IEOQC6wTo';
  const { data } = await supabase.from('spotify_tracks').select('id,name,tempo,bpm').eq('id', id).limit(1);
  console.log('row', data);
  const res = await fetch('https://api.reccobeats.com/v1/audio-features?ids=' + id);
  const j = await res.json();
  const featuresById = new Map();
  for (const f of (j.content || [])) {
    const href = f.href || '';
    const m = href.match(/track\/([A-Za-z0-9]+)/);
    const sid = m && m[1];
    if (sid) featuresById.set(sid, f);
  }
  console.log('has feature?', featuresById.has(id));
  console.log('feature', featuresById.get(id));
})();
