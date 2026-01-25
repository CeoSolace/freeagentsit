// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4f46e5',
          dark: '#4338ca',
        },
        secondary: {
          DEFAULT: '#059669',
          dark: '#047857',
        },
        accent: '#EAB308',
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        indigo: {
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
        },
        purple: '#7c3aed',
        pink: '#db2777',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'main-gradient': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        'title-gradient': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
        'primary-gradient': 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        'secondary-gradient': 'linear-gradient(135deg, #059669, #10b981)',
      },
      boxShadow: {
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 30px 70px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      transitionTimingFunction: {
        'ease': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '450': '450ms',
      },
    }
  },
  plugins: []
};
