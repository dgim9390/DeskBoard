/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // 어두운 화면이 너무 새까매서 오래 보면 눈이 피로함 → 가장 어두운 단계만 살짝 밝게
      colors: { zinc: { 800: "#2a2a2f", 900: "#1d1d21", 950: "#141417" } },
    },
  },
  plugins: [],
};
