import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FEF2F0',
          100: '#FDE5E1',
          200: '#FBCBC3',
          300: '#F7A99C',
          400: '#F08070',
          500: '#E8503A',
          600: '#D14530',
          700: '#B23826',
          800: '#8E2D1F',
          900: '#6E2318',
          950: '#3D120C',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
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
