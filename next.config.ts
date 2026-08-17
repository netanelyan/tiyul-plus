import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turns off Next's floating dev indicator - it looks like a broken tab at the edge of
  // the screen when testing the dev server from a phone on the local network. Dev only anyway.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
