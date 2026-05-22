import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 18px 50px -34px rgba(24, 24, 27, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;

