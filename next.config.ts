import type { NextConfig } from "next";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/home',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: '/dashboard',
        permanent: false,
      }
    ];
  },
};
export default nextConfig;
