export function buildTrackArtistMaps(tracks: any[]) {
  const trackMap = new Map<string, any>();
  const artistMap = new Map<string, { id: string; name: string; image_url: string | null }>();
  const linkSet = new Set<string>();
  const linkRows: { track_id: string; artist_id: string }[] = [];

  for (const t of tracks || []) {
    const albumImg = t.album?.images?.[0]?.url || null;
    const albumName = t.album?.name || null;

    trackMap.set(t.id, {
      id: t.id,
      name: t.name || "(unknown)",
      album_name: albumName,
      image_url: albumImg,
      preview_url: t.preview_url ?? null,
      duration_ms: t.duration_ms ?? null,
      explicit: typeof t.explicit === "boolean" ? t.explicit : null,
      isrc: t.external_ids?.isrc || null,
      artist_name: Array.isArray(t.artists)
        ? t.artists.map((a: any) => a.name).filter(Boolean).join(", ")
        : null,
      meta_provider: { spotify_track: true },
    });

    if (Array.isArray(t.artists)) {
      for (const a of t.artists) {
        if (!a?.id) continue;
        if (!artistMap.has(a.id)) {
          artistMap.set(a.id, { id: a.id, name: a.name ?? "", image_url: null });
        }
        const key = `${t.id}:${a.id}`;
        if (!linkSet.has(key)) {
          linkSet.add(key);
          linkRows.push({ track_id: t.id, artist_id: a.id });
        }
      }
    }
  }

  return { trackMap, artistMap, linkRows };
}

export function mergeArtistImages(
  artistMap: Map<string, { id: string; name: string; image_url: string | null }>,
  artists: Array<{ id: string; images?: Array<{ url: string }> }>
) {
  artists?.forEach((ar) => {
    const img = ar?.images?.[0]?.url || null;
    const existing = artistMap.get(ar.id);
    if (existing) existing.image_url = img;
  });
  return artistMap;
}
