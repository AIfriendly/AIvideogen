import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Externalize chromadb and its optional dependencies for server-side only
  // This prevents Turbopack from trying to bundle optional deps like cohere-ai
  serverExternalPackages: ['chromadb', 'cohere-ai'],

  // Empty turbopack config to silence Next.js 16 warning about webpack config
  turbopack: {},
};

export default nextConfig;
