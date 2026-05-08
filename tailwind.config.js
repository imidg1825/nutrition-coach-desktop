/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#fbfaf6", // light cream
          card: "#ffffff",
          muted: "#f3f0e8", // warm sand
        },
        accent: {
          DEFAULT: "#0f766e", // teal
          hover: "#0b5f59",
        },
        tropical: {
          mint: "#78c7b8",
          aqua: "#63c7d6",
          coral: "#f4a79a",
          sand: "#e9ddc7",
          leaf: "#6fbf7a",
          ink: "#12332e",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(16, 24, 40, 0.06)",
        card: "0 6px 18px rgba(16, 24, 40, 0.06)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
