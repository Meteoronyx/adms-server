/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ground: '#f2f4f7',
        sheet: '#fafbfc',
        surface: '#ffffff',
        raised: '#f3f5f8',
        active: '#e5e8ec',
        border: '#e4e7eb',
        rule: '#eef0f3',
        control: '#cfd3d8',
        ink: '#131416',
        muted: '#55585c',
        faint: '#686b6f',
        accent: {
          DEFAULT: '#1b6c80',
          hover: '#155666',
          soft: '#e3f1f4',
          ink: '#124957',
        },
        positive: {
          DEFAULT: '#1e7b4f',
          bg: '#dcfae5',
          ink: '#04250e',
        },
        negative: {
          DEFAULT: '#c4242a',
          bg: '#ffedea',
          ink: '#831c1e',
        },
        warning: {
          DEFAULT: '#92400e',
          bg: '#fffbeb',
          ink: '#92400e',
        },
      },
    },
  },
  plugins: [],
}
