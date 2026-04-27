/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#f8faf7",
          card: "#ffffff",
          muted: "#eef2ec",
        },
        accent: {
          DEFAULT: "#3d7a5a",
          hover: "#32654a",
        },
      },
    },
  },
  plugins: [],
};
