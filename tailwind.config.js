/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18231f",
        paper: "#f5f3ee",
        moss: "#315f4d",
        lime: "#d9f45f",
        clay: "#e97b58",
        sky: "#89c5d2",
      },
      fontFamily: {
        sans: ["Helvetica Neue", "Helvetica", "Arial", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Helvetica Neue", "Helvetica", "Arial", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 45px rgba(24, 35, 31, .08)",
      },
    },
  },
  plugins: [],
};
