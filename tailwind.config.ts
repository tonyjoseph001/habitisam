import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Enable darker mode via class
  theme: {
    extend: {
      colors: {
        // Semantic colors mapped to CSS variables
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        "primary-foreground": "hsl(var(--primary-foreground) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        "card-foreground": "hsl(var(--card-foreground) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-foreground": "hsl(var(--secondary-foreground) / <alpha-value>)", // fallback

        // Literal palette (if needed directly)
        cosmic: {
          bg: '#0f172a', // slate-900
          text: '#f8fafc', // slate-50
          primary: '#7c3aed', // violet-600
          accent: '#fbbf24', // amber-400
        },
        enchanted: {
          bg: '#fdf2f8', // pink-50
          text: '#0f172a', // slate-900
          primary: '#ec4899', // pink-500
          accent: '#10b981', // emerald-500
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
        heading: ['var(--font-fredoka)'],
      },
    },
  },
  plugins: [],
};
export default config;
