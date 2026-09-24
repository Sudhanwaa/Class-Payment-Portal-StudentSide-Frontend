import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "rgb(var(--color-primary-soft) / <alpha-value>)",
          100: "rgb(var(--color-primary-soft) / <alpha-value>)",
          500: "rgb(var(--color-primary) / <alpha-value>)",
          600: "rgb(var(--color-primary) / <alpha-value>)",
          700: "rgb(var(--color-primary-hover) / <alpha-value>)",
          900: "rgb(var(--color-header) / <alpha-value>)",
        },
        ink: "rgb(var(--color-heading) / <alpha-value>)",
        muted: "rgb(var(--color-body) / <alpha-value>)",
        canvas: "rgb(var(--color-page) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        tenantBorder: "rgb(var(--color-border) / <alpha-value>)",
        buttonText: "rgb(var(--color-button-text) / <alpha-value>)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(18, 59, 57, 0.04), 0 12px 34px rgba(24, 33, 32, 0.06)",
        lift: "0 16px 40px rgba(13, 105, 100, 0.16)",
      },
      fontFamily: {
        sans: ["Manrope", "Avenir Next", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
