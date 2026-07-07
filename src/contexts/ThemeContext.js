// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { createContext, useState, useEffect, useContext, useMemo } from "react";

// ──────────────────────────────
//  createContext
// ──────────────────────────────
export const ThemeContext = createContext();

// ──────────────────────────────
// 👨‍👩‍👧‍👦 Provider
// ──────────────────────────────
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 1. Lire le thème depuis le localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme;
    }
    // 2. Sinon, utiliser "light" par défaut
    return "light";
  });

  // 🕶️ Effet pour appliquer le thème immédiatement
  useEffect(() => {
    const root = document.documentElement;
    root.className = theme;
    
    // Applique les variables CSS directement pour un changement instantané
    if (theme === 'dark') {
      root.style.setProperty('--bg-primary', '#0f0f23');
      root.style.setProperty('--bg-secondary', '#1a1a2e');
      root.style.setProperty('--bg-tertiary', '#1e1e3f');
      root.style.setProperty('--bg-sidebar', '#1a1a2e');
      root.style.setProperty('--text-primary', '#f9fafb');
      root.style.setProperty('--text-secondary', '#d1d5db');
      root.style.setProperty('--text-muted', '#9ca3af');
      root.style.setProperty('--text-inverted', '#111827');
      root.style.setProperty('--border-primary', '#2a2a4a');
      root.style.setProperty('--border-secondary', '#3a3a5a');
      root.style.setProperty('--accent-primary', '#6366f1');
      root.style.setProperty('--accent-secondary', '#818cf8');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f9fafb');
      root.style.setProperty('--bg-tertiary', '#f3f4f6');
      root.style.setProperty('--bg-sidebar', '#ffffff');
      // Texte clair : noir pur par défaut
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--text-secondary', '#000000');
      root.style.setProperty('--text-muted', '#6b7280');
      root.style.setProperty('--text-inverted', '#ffffff');
      root.style.setProperty('--border-primary', '#e5e7eb');
      root.style.setProperty('--border-secondary', '#d1d5db');
      root.style.setProperty('--accent-primary', '#4f46e5');
      root.style.setProperty('--accent-secondary', '#6366f1');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 🔄 Fonction pour basculer le thème
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  //  memo pour optimiser
  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ──────────────────────────────
// 🪝 Hook personnalisé
// ──────────────────────────────
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
} 
