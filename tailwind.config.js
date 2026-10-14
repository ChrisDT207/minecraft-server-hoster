/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        surface: {
          50: '#1e222d',
          100: '#181b24',
          200: '#14161f',
          300: '#0f1118',
          400: '#0b0d13',
        },
        border: {
          subtle: '#232733',
          DEFAULT: '#2a3040',
          hover: '#3b4359',
        },
        accent: {
          DEFAULT: '#10b981', // emerald-500
          hover: '#059669',   // emerald-600
          dark: '#064e3b',    // emerald-900
          light: '#34d399',   // emerald-400
        },
        brand: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          amber: '#f59e0b',
          rose: '#ef4444',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', 'monospace'],
        sans: ['Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
