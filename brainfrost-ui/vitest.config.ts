import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Um único ambiente serve pra tudo — o que testamos é lógica pura ou
    // funções que dependem de fs (nesse caso rodam em Node normalmente).
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
