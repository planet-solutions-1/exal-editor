/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        sage: '#6B705C',
        stone: '#B7B7A4',
        terracotta: '#C5866D',
        sand: '#DDBEA9',
        cream: '#F1E3D3',
        ivory: '#FFF6EB'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
