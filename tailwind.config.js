/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#105463',
          50: '#e6f0f2',
          100: '#b3d1d8',
          200: '#80b2be',
          300: '#4d93a4',
          400: '#1a748a',
          500: '#105463',
          600: '#0d4451',
          700: '#0a343f',
          800: '#07242d',
          900: '#04141b',
        },
        chess: {
          dark: '#105463',
          light: '#F5E6D3',
        },
      },
      transitionProperty: {
        height: 'height',
      },
    },
  },
  plugins: [],
};
