/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: { DEFAULT: '#3A3A3A', fg: '#FFFFFF' },
        lime: { DEFAULT: '#8CC63F', hover: '#76A92F', fg: '#1E1E1E' },
        surface: '#F5F6F4',
        line: '#E4E6E2',
        muted: '#6B6F69',
        destructive: '#E5484D',
      },
      fontFamily: {
        display: ['Cairo', 'sans-serif'],
        body: ['Tajawal', 'Cairo', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(58,58,58,0.06)',
        cardHover: '0 8px 28px rgba(58,58,58,0.12)',
      },
    },
  },
  plugins: [],
};
