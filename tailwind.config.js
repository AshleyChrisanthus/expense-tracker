/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bgPrimary: 'var(--bg-primary)',
        bgSecondary: 'var(--bg-secondary)',
        bgTertiary: 'var(--bg-tertiary)',
        bgHover: 'var(--bg-hover)',
        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        textTertiary: 'var(--text-tertiary)',
        borderBase: 'var(--border)',
        borderLight: 'var(--border-light)',
        accent: 'var(--accent)',
        accentHover: 'var(--accent-hover)',
        accentBg: 'var(--accent-bg)',
        cardBg: 'var(--card-bg)',
        cardBorder: 'var(--card-border)',
        modalBg: 'var(--modal-bg)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
