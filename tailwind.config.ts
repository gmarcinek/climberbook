import type { Config } from "tailwindcss";

const { nextui } = require("@nextui-org/react");

const config: Config = {
  important: ".alternatingCareRoot",
  corePlugins: {
    preflight: false,
  },
  content: [
    "./components/alternating-care/source/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/alternating-care/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial":
          "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      inset: {
        "8px": "8px",
        "12px": "12px",
        "16px": "16px",
        "24px": "24px",
        "32px": "32px",
        "48px": "48px",
        "64px": "64px",
        "80px": "80px",
      },
    },
  },
  plugins: [nextui({ addCommonColors: true })],
};

export default config;
