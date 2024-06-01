import tailwindAnimate from "tailwindcss-animate";
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
        "sans-rounded": [
          "SF Pro Rounded",
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        link: "var(--link)",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ios-spin": "ios-spin 0.8333s steps(12) infinite",
        spin: "spin 1s linear infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "text-reveal": "text-reveal 1s forwards",
        "fade-in": "fade-in 0.3s forwards",
        "slide-up": "slide-up 0.8s forwards",
        "scale-from-bottom-left": "scale-from-bottom-left 0.6s forwards",
        "scale-from-bottom-right": "scale-from-bottom-right 0.6s forwards",
      },
    },
    keyframes: {
      pulse: {
        "50%": { opacity: "0.5" },
      },
      spin: {
        "0%": { transform: "rotate(0deg)" },
        "100%": { transform: "rotate(360deg)" },
      },
      "ios-spin": {
        "0%": { transform: "rotate(0deg)" },
        "100%": { transform: "rotate(360deg)" },
      },
      shimmer: {
        "0%": { backgroundPosition: "0% 0%" },
        "100%": { backgroundPosition: "-200% 0" },
      },
      "text-reveal": {
        "0%": { "background-position": "0% 0%" },
        "100%": { "background-position": "200% 0%" },
      },
      "fade-in": {
        "0%": { opacity: "0" },
        "100%": { opacity: "1" },
      },
      "slide-up": {
        "0%": { transform: "translateY(100%)", opacity: "0" },
        "100%": { transform: "translateY(0)", opacity: "1" },
      },
      "scale-from-bottom-left": {
        "0%": { transform: "scale(0)", opacity: "0", transformOrigin: "bottom left" },
        "100%": { transform: "scale(1)", opacity: "1" },
      },
      "scale-from-bottom-right": {
        "0%": { transform: "scale(0)", opacity: "0", transformOrigin: "bottom right" },
        "50%": { transform: "scale(1.03)", opacity: "1" },
        "100%": { transform: "scale(1)", opacity: "1" },
      },
    },
  },
  plugins: [
    tailwindAnimate,
    plugin(function ({ addVariant }) {
      addVariant("group-not-last", ".group:not(:last-child) &");
    }),
  ],
} as const satisfies Config;

export default config;
