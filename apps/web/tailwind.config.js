/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        podium: {
          black:    '#08080D',
          surface:  '#0F0F18',
          card:     '#16161F',
          border:   '#1E1E2E',
          muted:    '#2A2A3E',
          dim:      '#6B6B8A',
          text:     '#E8E8F0',
          sub:      '#9090A8',
          indigo:   '#5B4CFF',
          'indigo-dim': '#3D31CC',
          'indigo-glow': '#7B6FFF',
          amber:    '#F5A623',
          'amber-dim': '#C4841A',
          green:    '#22C55E',
          red:      '#EF4444',
          teal:     '#14B8A6',
        },
      },
      fontFamily: {
        sans:    ['var(--font-space)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'rank-up':    'rankUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'rank-down':  'rankDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'score-tick': 'scoreTick 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in':   'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-up':    'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer':    'shimmer 1.5s linear infinite',
        'ticker':     'ticker 20s linear infinite',
        'number-up':  'numberUp 0.25s ease-out',
      },
      keyframes: {
        rankUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0', background: 'rgba(91,76,255,0.15)' },
          '60%':  { background: 'rgba(91,76,255,0.08)' },
          '100%': { transform: 'translateY(0)', opacity: '1', background: 'transparent' },
        },
        rankDown: {
          '0%':   { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scoreTick: {
          '0%':   { transform: 'scale(1.15)', color: '#F5A623' },
          '100%': { transform: 'scale(1)', color: 'inherit' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(91,76,255,0.3)' },
          '50%':      { boxShadow: '0 0 24px rgba(91,76,255,0.6)' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(-16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        numberUp: {
          '0%':   { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'indigo-glow': 'radial-gradient(ellipse at top, rgba(91,76,255,0.15) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
}
