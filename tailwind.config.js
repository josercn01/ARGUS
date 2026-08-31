/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        m365: {
          blue: '#0078D4',
          'blue-dark': '#005A9E',
          'blue-light': '#DEECF9',
          purple: '#6B51A1',
          'purple-dark': '#742774',
          'purple-light': '#EDE7F6',
          gray: '#F3F2F1',
          'gray-light': '#F5F5F5',
          'gray-border': '#E1DFDD',
          'gray-text': '#605E5C',
          'gray-dark': '#323130',
          white: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
};
