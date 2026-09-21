/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6f4',
          100: '#d7ebe5',
          200: '#b0d7cc',
          300: '#82bdad',
          400: '#569f8c',
          500: '#357e6c', // primary accent
          600: '#296457',
          700: '#224f46',
          800: '#1c3f38',
          900: '#17332e',
        },
        ink: {
          50: '#f6f7f7',
          100: '#e8eaea',
          200: '#c9cdcd',
          300: '#a5abab',
          400: '#767f7f',
          500: '#5a6363',
          600: '#454d4d',
          700: '#363c3c',
          800: '#242828',
          900: '#181b1b',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(24,27,27,0.06), 0 1px 3px 0 rgba(24,27,27,0.08)',
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
}
