import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Read persisted preference, default to 'dark'
  const [theme, setTheme] = useState(() => localStorage.getItem('giantek_theme') || 'dark');

  useEffect(() => {
    // Apply theme to <html> element so CSS variables take effect globally
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('giantek_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
