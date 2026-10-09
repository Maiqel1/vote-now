module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#09090b",
        muted: "#71717a",
        faint: "#a1a1aa",
        line: "#e4e4e7",
        paper: "#fcfcfc",
        card: "#ffffff",
        wash: "#f4f4f5",
        brand: { DEFAULT: "#ea580c", strong: "#c2410c", soft: "#fff7ed", line: "#fed7aa" },
        good: { DEFAULT: "#16a34a", soft: "#dcfce7" },
        info: { DEFAULT: "#2563eb", soft: "#dbeafe" },
      },
    },
  },
  plugins: [],
};
