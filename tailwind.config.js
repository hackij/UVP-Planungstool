/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c2340",
        paper: "#f4f6f8",
        moss: "#174a87",
        lime: "#d8e7f7",
        clay: "#a82028",
        sky: "#75a8d9",
      },
      fontFamily: {
        sans: ["Helvetica Neue", "Helvetica", "Arial", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Helvetica Neue Condensed", "HelveticaNeue-CondensedBold", "Arial Narrow", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 45px rgba(12, 35, 64, .09)",
      },
    },
  },
  plugins: [],
};
