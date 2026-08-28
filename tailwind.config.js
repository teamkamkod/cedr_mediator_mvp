/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cedr: {
          navy:    '#1B2B4B',
          'navy-dark': '#132036',
          teal:    '#00A896',
          'teal-light': '#E6F7F5',
          light:   '#F5F7FA',
          border:  '#E5E7EB',
          text:    '#1A1A2E',
          muted:   '#6B7280',
        },
        status: {
          available:  '#16A34A',
          unavailable:'#DC2626',
          ask_me:     '#D97706',
          provisional:'#7C3AED',
          confirmed:  '#0891B2',
          not_set:    '#9CA3AF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        popover: '0 4px 24px rgba(0,0,0,0.12)',
      }
    },
  },
  plugins: [],
}
