/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        blue: {
          neon: '#00d4ff',
          400:  '#3b8cff',
          500:  '#1a6fef',
          600:  '#0d52cc',
          700:  '#0941a8',
          800:  '#062f7e',
          900:  '#031d54',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
