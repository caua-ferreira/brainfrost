import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O cofre vive fora da pasta do app: o rastreamento do build precisa enxergar a raiz do repositório.
  outputFileTracingRoot: path.join(here, ".."),
};

export default nextConfig;
