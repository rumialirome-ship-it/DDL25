/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        fontFamily: {
            sans: ['Inter', 'sans-serif'],
        },
        colors: {
            'brand-bg': '#0d1117', // Base background, fallback
            'brand-surface': '#161b22', // Card backgrounds
            'brand-secondary': '#30363d', // Borders, secondary elements
            'brand-primary': '#f7c314', // A more vibrant gold
            'brand-accent': '#33a0e4', // A slightly softer blue for highlights
            'brand-text': '#e6edf3',
            'brand-text-secondary': '#8b949e',
            'success': '#28a745',
            'danger': '#dc3545',
        },
        keyframes: {
            'fade-in-down': {
                '0%': {
                    opacity: '0',
                    transform: 'translateY(-10px)'
                },
                '100%': {
                    opacity: '1',
                    transform: 'translateY(0)'
                },
            },
            'glow': {
                '0%, 100%': { boxShadow: '0 0 5px #f7c314' },
                '50%': { boxShadow: '0 0 20px #f7c314' },
            },
            /* New animation for dropdowns and pop-ups */
            'scale-in': {
               '0%': { opacity: '0', transform: 'scale(0.95)' },
               '100%': { opacity: '1', transform: 'scale(1)' }
            }
        },
        animation: {
            /* Smoother timing function for a more professional feel */
            'fade-in-down': 'fade-in-down 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            'glow': 'glow 1.5s ease-in-out infinite',
            'scale-in': 'scale-in 0.15s ease-out',
        },
        boxShadow: {
            'glow': '0 0 15px rgba(247, 195, 20, 0.6)',
        }
    }
  },
  plugins: [],
}