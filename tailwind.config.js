/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'black-kite': '#351E1C',
        'garnet': '#733635',
        'garnet-light': '#8B4443',
        'garnet-dark': '#5C2A29',
        'kite-warm': '#4A2D2A',
        'cream': '#F5F0EB',
        'warm-gray': '#E8E0D8',
      }
    },
  },
  plugins: [],
}
