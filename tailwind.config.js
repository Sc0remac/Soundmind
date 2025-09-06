/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        positive: '#34d399', // green
        negative: '#f87171', // red
        neutral: '#fbbf24'  // yellow
      }
    }
  },
  plugins: []
};