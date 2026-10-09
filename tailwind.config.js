/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        hebrew: ['Rubik', 'Heebo', 'system-ui', 'sans-serif'],
      },
      colors: {
        slate: {
          750: '#243044',
          850: '#151e2e',
        },
        behatsdaa: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          gold: '#f59e0b'
        },
        uniq: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          pink: '#ec4899'
        },
        mastercard: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          red: '#eb001b',
          amber: '#f79e1b'
        },
        mc: {
          red: '#EB001B',
          orange: '#FF5F00',
          yellow: '#F79E1B',
          dark: '#0B0F19',
          cardDark: '#161F30',
          borderDark: '#223048'
        }
      }
    },
  },
  plugins: [],
}
