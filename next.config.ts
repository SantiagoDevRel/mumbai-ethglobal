import type { NextConfig } from "next";

// Static export: no server routes (the writer is a Cloudflare Worker), which also keeps a
// later move to Swarm hosting easy.
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
