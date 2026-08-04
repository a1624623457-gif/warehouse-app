import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
