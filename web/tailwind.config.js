/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        aqua: {
          DEFAULT: '#789A99',
          dark: '#5F8180',
        },
        peach: {
          DEFAULT: '#FFD2C2',
          light: '#FFF0EB',
        },
      },
    },
  },
  plugins: [],
};
