import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Turbopack resolves deps from the frontend folder.
    root: __dirname,
  },
};

export default nextConfig;
