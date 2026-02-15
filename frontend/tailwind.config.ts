// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'
import forms from '@tailwindcss/forms'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', // Next.js App Router
    './components/**/*.{js,ts,jsx,tsx,mdx}', // Our components folder
  ],
  theme: {
    extend: {
      colors: {
        // We'll use "neutral" as our base gray
        gray: colors.neutral,
        // Define our "energetic" primary color
        primary: {
          '50': '#f5f3ff',
          '100': '#ede9fe',
          '200': '#ddd6fe',
          '300': '#c4b5fd',
          '400': '#a78bfa',
          '500': '#8b5cf6', // Our main primary color
          '600': '#7c3aed',
          '700': '#6d28d9',
          '800': '#5b21b6',
          '900': '#4c1d95',
          '950': '#2e1065',
        },
        success: colors.emerald,
        warning: colors.amber,
        error: colors.red,
        brand: {
          yellow: '#FACC15', // Yellow-400
          black: '#18181B',  // Zinc-900
          cream: '#FFFBEB',  // Amber-50
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', 'Courier New', 'monospace'],
      },
      ringColor: {
        DEFAULT: '#8b5cf6',
      },
      // Define animations for Modals and Toasts
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUpAndFade: {
          'from': { opacity: '0', transform: 'translateY(24px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          'from': { opacity: '0', transform: 'scale(0.98)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        slideDownAndFade: {
          'from': { opacity: '0', transform: 'translateY(-8px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        shine: {
          '0%': { left: '-100%' },
          '20%': { left: '200%' }, // Fast sweep
          '100%': { left: '200%' }, // Wait for next cycle
        },
      },
      animation: {
        fadeIn: 'fadeIn 200ms ease-out',
        slideUpAndFade: 'slideUpAndFade 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        scaleIn: 'scaleIn 200ms ease-out',
        slideDownAndFade: 'slideDownAndFade 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        shine: 'shine 4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          '2xl': '1280px',
        },
      },
    },
  },
  plugins: [
    forms,
  ],
}
export default config
