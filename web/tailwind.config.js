/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'page-bg': '#060b14',
        'sidebar-bg': 'rgba(15,23,42,0.95)',
        teal: {
          300: '#5eead4',
          400: '#2dd4bf',
          600: '#0d9488',
        },
        peach: {
          DEFAULT: '#FFD2C2',
          light: '#FFF0EB',
        },
        aqua: {
          DEFAULT: '#789A99',
          dark: '#5F8180',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
      backdropBlur: {
        glass: '12px',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
};
