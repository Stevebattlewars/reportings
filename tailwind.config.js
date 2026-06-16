/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 60px rgba(14, 165, 233, 0.18)',
      },
    },
  },
  plugins: [],
}
