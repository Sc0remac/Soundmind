// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'i.spotifycdn.com' },
      { protocol: 'https', hostname: 'p.scdn.co' },
      { protocol: 'https', hostname: 'mosaic.scdn.co' },
      // keep any others you use (e.g., lastfm)
      { protocol: 'https', hostname: 'lastfm.freetls.fastly.net' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
};
