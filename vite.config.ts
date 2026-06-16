import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { DEPLOYMENT_BASE_PATH } from "./src/lib/deployment-base";

export default defineConfig(({ mode }) => ({
  base: mode === "development" || mode === "test" ? "/" : DEPLOYMENT_BASE_PATH,
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
  },
}));
