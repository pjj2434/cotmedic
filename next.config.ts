import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow cross-origin requests from network IP for development/testing
  allowedDevOrigins: ["192.168.0.86:3000"],
};

export default nextConfig;
