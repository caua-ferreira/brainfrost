import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(here, ".."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "graph.microsoft.com" },
    ],
  },
  experimental: {
    allowedDevOrigins: ["192.168.3.24", "192.168.3.24:3000", "localhost"],
  },
};

export default nextConfig;
