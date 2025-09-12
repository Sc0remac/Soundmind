/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },               // Spotify album art
      { protocol: "https", hostname: "lastfm.freetls.fastly.net" },// Last.fm images (if used)
      { protocol: "https", hostname: "i.ytimg.com" },             // YouTube thumbs (optional)
    ],
  },
};

module.exports = nextConfig;
