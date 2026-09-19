import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // News images come from many publisher CDNs; allow any http(s) host.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
