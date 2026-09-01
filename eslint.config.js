import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Central PiM engine boundary — UI code may not reach past the façade.
    // See docs/pim-refactor/00-overzicht.md and .lovable/plan.md (Fase 2).
    files: ["src/routes/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/pim/policy",
                "@/lib/pim/risk",
                "@/lib/pim/egressGuard",
                "@/lib/pim/processing",
              ],
              message:
                "UI must go through @/lib/pim/engine, not the raw policy/risk/egress/processing modules.",
            },
          ],
        },
      ],
    },
  },
  {
    // Deze bestanden exporteren bewust ook varianten, context of routers
    // naast een component. Fast refresh is een dev-comfort, geen kwaliteits-
    // of veiligheidsregel; door hem hier uit te zetten kan de rest van de
    // lint blokkerend zijn (--max-warnings=0).
    files: [
      "src/components/ui/**/*.{ts,tsx}",
      "src/router.tsx",
      "src/components/pim/product/ProductShellContext.tsx",
      "src/components/pim/start-go/ExamplePicker.tsx",
    ],
    rules: { "react-refresh/only-export-components": "off" },
  },
  eslintPluginPrettier,
);
