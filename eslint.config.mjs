import nextPlugin from "@next/eslint-plugin-next";

export default [
  nextPlugin.flatConfig.recommended,
  {
    ignores: [".next/**", "node_modules/**"],
  },
];