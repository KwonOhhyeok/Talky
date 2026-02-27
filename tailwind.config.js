/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#9CF6F6",
        secondary: "#B5D6D6",
        "accent-1": "#FF7477",
        "accent-2": "#E69597",
        "accent-3": "#CEB5B7",
        "background-light": "#FFFFFF",
        "background-dark": "#0F1717",
      },
      fontFamily: {
        display: ["Lexend", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "1.5rem",
        xl: "2.5rem",
        full: "9999px",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};
