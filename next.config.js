// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Spotify
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'i.spotifycdn.com' },
      { protocol: 'https', hostname: 'p.scdn.co' },
      { protocol: 'https', hostname: 'mosaic.scdn.co' },
      // Last.fm
      { protocol: 'https', hostname: 'lastfm.freetls.fastly.net' },
      // YouTube
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/log-mood', destination: '/mood/new', permanent: true },
      { source: '/log-mood/:path*', destination: '/mood/new', permanent: true },
    ];
  },
};

module.exports = nextConfig;
