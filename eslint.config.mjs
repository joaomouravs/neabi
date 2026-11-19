import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Todo link passa por `src/components/ui/link.tsx`, sem prefetch
    // automático. Um `next/link` direto voltaria a pré-carregar cada link
    // visível — o que, com páginas dinâmicas, tirou o site do ar.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/link.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message: 'Use `import Link from "@/components/ui/link"` (sem prefetch automático).',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
