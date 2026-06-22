import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/adapter-better-sqlite3', 'better-sqlite3'],
  // turbopackFileSystemCacheForDev is intentionally disabled — the inherited cache
  // from another machine causes corrupted SST files and Turbopack panics.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig;
