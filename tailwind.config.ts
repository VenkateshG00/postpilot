import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // Legacy brand scale remapped to accent red — keeps existing dashboard
      // pages from breaking while we upgrade them page by page
      colors: {
        brand: {
          50:  '#FFF0F0',
          100: '#FFE0E0',
          200: '#FFBDBD',
          300: '#FF9999',
          400: '#FF7070',
          500: '#FF4D4D',
          600: '#E63E3E',
          700: '#CC2E2E',
          800: '#B01F1F',
          900: '#8A1515',
          950: '#5C0A0A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
export default config
