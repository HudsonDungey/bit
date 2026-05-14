import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          50:  "#f1f0ff",
          100: "#e6e4ff",
          200: "#d0cbff",
          300: "#aea6ff",
          400: "#8c80ff",
          500: "#635bff",
          600: "#5248d6",
          700: "#4338ca",
          800: "#372fa6",
          900: "#2b2580",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg,#7a73ff 0%,#635bff 45%,#4b3df2 100%)",
        "brand-gradient-hover": "linear-gradient(135deg,#8b85ff 0%,#6f67ff 45%,#5346ff 100%)",
        "hero-mesh":
          "radial-gradient(1200px 600px at 0% -20%, rgba(99,91,255,0.18), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(0,212,255,0.12), transparent 55%), radial-gradient(700px 400px at 50% 100%, rgba(142,123,255,0.10), transparent 50%)",
      },
      boxShadow: {
        brand: "0 8px 24px -6px rgba(99,91,255,0.45), 0 2px 6px -1px rgba(99,91,255,0.25)",
        "brand-lg": "0 12px 28px -6px rgba(99,91,255,0.55), 0 4px 10px -2px rgba(99,91,255,0.25)",
        soft: "0 1px 3px rgba(15,23,42,0.05), 0 1px 2px rgba(15,23,42,0.03)",
        lift: "0 16px 40px -12px rgba(15,23,42,0.18), 0 4px 12px -4px rgba(15,23,42,0.08)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        soft: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "page-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "modal-in": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "overlay-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateX(40px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
        "toast-out": {
          to: { opacity: "0", transform: "translateX(40px) scale(0.96)" },
        },
        "row-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        flash: {
          "0%": { background: "rgba(99,91,255,0.18)" },
          "100%": { background: "transparent" },
        },
        ripple: { to: { transform: "scale(2.5)", opacity: "0" } },
        "live-ping": {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "0.95" },
          "50%": { opacity: "0.5" },
        },
        drift1: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%":      { transform: "translate(180px,120px) scale(1.1)" },
          "66%":      { transform: "translate(60px,220px) scale(0.95)" },
        },
        drift2: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%":      { transform: "translate(-200px,-120px) scale(1.15)" },
        },
        "slide-down": {
          from: { transform: "translateY(-100%)", opacity: "0" },
          to:   { transform: "translateY(0)",     opacity: "1" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "page-in": "page-in 0.45s cubic-bezier(0.16,1,0.3,1) both",
        "modal-in": "modal-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        "overlay-in": "overlay-in 0.25s ease-out both",
        "toast-in": "toast-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
        "toast-out": "toast-out 0.3s ease-out forwards",
        "row-in": "row-in 0.45s cubic-bezier(0.16,1,0.3,1) both",
        flash: "flash 1.6s ease-out",
        ripple: "ripple 0.65s cubic-bezier(0.16,1,0.3,1)",
        "live-ping": "live-ping 1.6s ease-out infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        drift1: "drift1 24s ease-in-out infinite",
        drift2: "drift2 28s ease-in-out infinite",
        "slide-down": "slide-down 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        "spin-slow": "spin 4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
