import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname), "server-only": path.resolve(__dirname, "tests/stubs/empty.ts") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/rules/**"],
    environment: "node",
  },
});
