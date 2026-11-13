import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        orbit: {
          bg: 'rgb(var(--orbit-bg) / <alpha-value>)',
          panel: 'rgb(var(--orbit-panel) / <alpha-value>)',
          border: 'rgb(var(--orbit-border) / <alpha-value>)',
          text: 'rgb(var(--orbit-text) / <alpha-value>)',
          muted: 'rgb(var(--orbit-muted) / <alpha-value>)',
          cyan: 'rgb(var(--orbit-cyan) / <alpha-value>)',
          blue: 'rgb(var(--orbit-blue) / <alpha-value>)',
          violet: 'rgb(var(--orbit-violet) / <alpha-value>)',
          green: 'rgb(var(--orbit-green) / <alpha-value>)',
          amber: 'rgb(var(--orbit-amber) / <alpha-value>)',
          red: 'rgb(var(--orbit-red) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 18px rgb(var(--orbit-cyan) / 0.35)',
        'glow-sm': '0 0 10px rgb(var(--orbit-cyan) / 0.3)',
        'glow-lg': '0 0 40px rgb(var(--orbit-cyan) / 0.25)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
