import type { NextConfig } from "next";

// In dev, /api/* proxies to the FastAPI backend on :8897.
// In prod (Docker), API_INTERNAL_URL points at the api container; nginx can also
// route /api directly to the api service — the rewrite is the fallback.
const API_URL = process.env.API_INTERNAL_URL || "http://127.0.0.1:8897";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
