/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070B14",
        surface: "#101827",
        "surface-alt": "#16202F",
        pitch: "#1AAE5C",
        "pitch-bright": "#2ED573",
        gold: "#FFC533",
        "gold-bright": "#FFDD6B",
        paper: "#F6F8FB",
        slate: "#8C9AB3",
        "slate-faint": "#4D5A72",
        line: "#1E2A3D",
        red: "#FF3B3B",
        "red-bright": "#FF6B6B",
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
        },
        "roll": {
          "0%": { transform: "translateX(0) rotate(0deg)" },
          "100%": { transform: "translateX(280px) rotate(480deg)" },
        },
        "sweep": {
          "0%": { transform: "translateX(-120%) skewX(-12deg)" },
          "100%": { transform: "translateX(220%) skewX(-12deg)" },
        },
        "rise": {
          "0%": { opacity: 0, transform: "translateY(18px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: 1 },
          "100%": { transform: "translateY(180px) rotate(360deg)", opacity: 0 },
        },
        "count-pop": {
          "0%": { transform: "scale(0.6)", opacity: 0 },
          "60%": { transform: "scale(1.08)", opacity: 1 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(255, 197, 51, 0.0)" },
          "50%": { boxShadow: "0 0 40px rgba(255, 197, 51, 0.35)" },
        },
      },
      animation: {
        "pulse-live": "pulse-live 1.6s ease-in-out infinite",
        "roll": "roll 3.6s linear infinite",
        "sweep": "sweep 3.5s ease-in-out infinite",
        "rise": "rise 0.6s ease both",
        "float": "float 4s ease-in-out infinite",
        "confetti-fall": "confetti-fall 1.8s ease-in forwards",
        "count-pop": "count-pop 0.5s ease both",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};