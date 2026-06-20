import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal, self-contained server build for the Docker image.
  output: "standalone",
  experimental: {
    // Audits can submit several screenshots in one action; raise the default
    // ~1MB server-action body cap to fit them (they are downscaled client-side).
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
