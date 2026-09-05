// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Allow pdfjs-dist ESM module in API routes
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
