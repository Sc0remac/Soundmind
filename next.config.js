/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow dev assets (/_next/*) to be requested from 127.0.0.1 in dev.
  experimental: {
    allowedDevOrigins: ["http://127.0.0.1:3000"],
  },
};

module.exports = nextConfig;
