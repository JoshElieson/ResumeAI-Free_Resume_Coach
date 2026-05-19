import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Use this project folder as root (avoids parent lockfile confusing webpack)
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: [
    "pdfjs-dist",
    "@napi-rs/canvas",
    "pdf-parse",
  ],
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias.canvas = false;

    // Avoid pdfjs-dist breaking under eval-* devtools (Next.js webpack)
    if (!isServer && dev) {
      config.devtool = "cheap-module-source-map";
    }

    return config;
  },
};

export default nextConfig;
