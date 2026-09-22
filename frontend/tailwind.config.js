/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        latorre: {
          dark: '#1B4332', // verde oscuro institucional
          DEFAULT: '#2D6A4F', // verde medio
          light: '#74C69D', // verde claro (alquileres de vivienda)
          gold: '#C9A227', // dorado / acento
          'gold-light': '#E4C86B',
          cream: '#FAF7F0',
          ink: '#242724', // gris oscuro para textos
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px -4px rgba(27, 67, 50, 0.15)',
        'card-hover': '0 8px 32px -4px rgba(27, 67, 50, 0.22)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
};
