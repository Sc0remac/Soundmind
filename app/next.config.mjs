/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow dev asset loads when browsing on 127.0.0.1
  experimental: {
    allowedDevOrigins: ["http://127.0.0.1:3000"],
  },
};

export default nextConfig;
