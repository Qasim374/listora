import type { Config } from 'tailwindcss'

/**
 * Listora brand palette.
 * Deliberately not the generic purple-gradient-on-white look: deep evergreen
 * against a warm sand background reads "premium property" rather than "SaaS demo".
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#FBF9F5',
          100: '#F5F1EA',
          200: '#EAE3D7',
          300: '#D9CEBC',
        },
        ink: {
          DEFAULT: '#12211F',
          soft: '#3A4A47',
          muted: '#6B7B78',
        },
        brand: {
          50: '#EDF5F3',
          100: '#D2E6E1',
          200: '#A5CDC4',
          300: '#6FAEA1',
          400: '#3F8C7C',
          500: '#1F6B5C',
          600: '#155448',
          700: '#0F3D35',
          800: '#0A2A25',
          900: '#061A17',
        },
        accent: {
          DEFAULT: '#C9743C',
          soft: '#E8A97A',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      maxWidth: {
        content: '68rem',
      },
    },
  },
  plugins: [],
}

export default config
