/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Prompt', 'sans-serif'],
      },
      colors: {
        pastel: {
          blue: '#E3F2FD',
          darkBlue: '#90CAF9',
          green: '#E0F2F1',
          darkGreen: '#80CBC4',
          pink: '#FCE4EC',
          purple: '#F3E5F5',
          text: '#37474F',
          accent: '#00897B',
          gold: '#C5A059'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}