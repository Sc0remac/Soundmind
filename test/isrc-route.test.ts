const { buildTrackArtistMaps, mergeArtistImages } = require("../app/api/enrich/isrc/helpers");
const assert = require("node:assert");

const trackResp = [
  {
    id: "t1",
    name: "Song",
    explicit: false,
    duration_ms: 123,
    preview_url: null,
    external_ids: { isrc: "ISRC1" },
    album: { name: "Album", images: [{ url: "trackimg" }] },
    artists: [{ id: "a1", name: "Artist1" }],
  },
];

const { trackMap, artistMap, linkRows } = buildTrackArtistMaps(trackResp);
mergeArtistImages(artistMap, [{ id: "a1", images: [{ url: "artistimg" }] }]);

const trackRows = Array.from(trackMap.values());
const artistRows = Array.from(artistMap.values());

assert.equal((trackRows as any[])[0].image_url, "trackimg");
assert.equal((artistRows as any[])[0].image_url, "artistimg");
assert.deepStrictEqual(linkRows, [{ track_id: "t1", artist_id: "a1" }]);
