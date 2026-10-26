import type { NextConfig } from "next";

// The pages are static; /api/* is the workshop writer on Vercel Functions (lib/server/writer.ts).
const config: NextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
