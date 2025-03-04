/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'deep-blue': 'rgb(32, 42, 68)',
        'action-green': 'rgb(34, 197, 94)',
        'pebble': 'rgb(255, 224, 214)',
        'mist': 'rgb(250, 250, 250)',
        'marine': 'rgb(3, 136, 165)',
        'ice': 'rgb(255, 255, 255)',
        'error': 'rgb(239, 68, 68)',
      },
      fontFamily: {
        'exo': ['Exo\\ 2', 'sans-serif'],
      },
    },
  },
  plugins: [],
};