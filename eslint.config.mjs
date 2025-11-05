// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // your current Next.js presets
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Global rules you want
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  // ↓ Relax ONLY for API routes while we migrate types
  {
    files: ["pages/api/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // temporary
    },
  },

  // (optional) relax for dev/debug scripts
  {
    files: [
      "pages/api/debug/**/*.{ts,tsx}",
      "pages/api/dev/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
