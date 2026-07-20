/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        crimson: '#c43c3c',
        felt: {
          50: '#eef2f8',
          100: '#d6e0ef',
          200: '#b0c4df',
          300: '#7c9bc7',
          400: '#4a74a9',
          500: '#2a568c',
          600: '#1c4270',
          700: '#17355a',
          800: '#142a48',
          900: '#11223b',
          950: '#07111f',
        },
        gold: {
          300: '#f5d78e',
          400: '#e8c15a',
          500: '#d4a017',
          600: '#b8860b',
        },
        ink: {
          900: '#1a1208',
          800: '#2c2114',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Moul', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Hanuman', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.35)',
        glow: '0 0 40px rgba(212,160,23,0.25)',
      },
      backgroundImage: {
        'felt-radial':
          'radial-gradient(ellipse at center, #1c4270 0%, #07111f 70%)',
        'hero-mesh':
          'radial-gradient(at 18% 18%, rgba(224,184,74,0.2) 0px, transparent 45%), radial-gradient(at 82% 12%, rgba(196,60,60,0.18) 0px, transparent 42%), linear-gradient(160deg, #050d18 0%, #0c1c34 48%, #07111f 100%)',
        'card-shine':
          'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 50%)',
      },
      minHeight: {
        dvh: '100dvh',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      },
    },
  },
  plugins: [],
};
