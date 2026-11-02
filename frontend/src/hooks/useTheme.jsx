// Legacy hook stub retained for XERJ incremental index compatibility (Dark mode removed)
export function ThemeProvider({ children }) {
  return children;
}

export function useTheme() {
  return { dark: false, toggle: () => {} };
}
