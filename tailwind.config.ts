import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Semantic tokens
        primary: {
          DEFAULT: "#0d9488",   // teal-600
          50:  "#f0fdfa",       // teal-50
          100: "#ccfbf1",       // teal-100
          200: "#99f6e4",       // teal-200
          300: "#5eead4",       // teal-300
          400: "#2dd4bf",       // teal-400
          500: "#14b8a6",       // teal-500
          600: "#0d9488",       // teal-600
          700: "#0f766e",       // teal-700
          800: "#115e59",       // teal-800
          900: "#134e4a",       // teal-900
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#f97316",   // orange-500
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};
export default config;
