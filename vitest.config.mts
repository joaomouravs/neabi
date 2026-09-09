import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vitest.
 *
 * Dois projetos com necessidades diferentes: regras de domínio rodam em Node
 * (rápido, sem DOM); componentes rodam em jsdom com Testing Library.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts"],
          include: ["tests/components/**/*.test.tsx"],
        },
      },
    ],
  },
});
