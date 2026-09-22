/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        petroleo: {
          900: '#013440', // Fundo principal
          800: '#234D68', // Fundo do card
          700: '#566B81', // Bordas e botões
        },
        cinza: {
          400: '#BCBCBC', // Placeholders
          200: '#E3E3E3', // Texto principal
        }
      }
    },
  },
  plugins: [],
}