// tailwind.config.js
const config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bridge: {
          blue: "#ff7a00",      // 🔸 Naranja principal
          dark: "#0d0d0d",      // 🖤 Fondo casi negro
          gray: "#b0b0b0",      // ⚪ Gris neutro
          accent: "#ff8c1a",    // ✨ Naranja más brillante
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
