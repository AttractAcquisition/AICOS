/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['"Barlow"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        base: {
          950: '#0A0800',
          900: '#110D00',
          850: '#161000',
          800: '#1C1400',
          750: '#211900',
          700: '#2A2000',
          600: '#3D3010',
          500: '#524020',
        },
        electric: {
          DEFAULT: '#FF8000',
          dim:     '#CC6600',
          glow:    'rgba(255,128,0,0.15)',
        },
        amber: {
          op:   '#FF5C30',
          dim:  '#CC4824',
          glow: 'rgba(255,92,48,0.15)',
        },
        red: {
          op:   '#FF4444',
          dim:  '#CC3333',
          glow: 'rgba(255,68,68,0.15)',
        },
        green: {
          op:   '#00E676',
          dim:  '#00B85C',
          glow: 'rgba(0,230,118,0.15)',
        },
        purple: {
          op:   '#9B6DFF',
          dim:  '#7A54D4',
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(255,128,0,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,128,0,0.03) 1px, transparent 1px)`,
        'scanline': `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.03) 2px,
          rgba(0,0,0,0.03) 4px
        )`,
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      boxShadow: {
        'electric': '0 0 20px rgba(255,128,0,0.2), 0 0 60px rgba(255,128,0,0.05)',
        'amber':    '0 0 20px rgba(255,92,48,0.2)',
        'red':      '0 0 20px rgba(255,68,68,0.2)',
        'green':    '0 0 20px rgba(0,230,118,0.2)',
        'panel':    '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        'glow-sm':  '0 0 8px rgba(255,128,0,0.3)',
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink':         'blink 1.2s step-end infinite',
        'slide-in':      'slideIn 0.3s ease-out',
        'slide-in-right':'slideInRight 0.25s ease-out',
        'fade-up':       'fadeUp 0.4s ease-out',
        'scan':          'scan 8s linear infinite',
      },
      keyframes: {
        blink:        { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        slideIn:      { from: { transform: 'translateX(-12px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(100%)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        fadeUp:       { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        scan: {
          '0%':   { backgroundPosition: '0 -100%' },
          '100%': { backgroundPosition: '0 200%' },
        },
      },
    },
  },
  plugins: [],
}
