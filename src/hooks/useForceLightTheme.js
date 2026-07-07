import { useEffect } from "react";
import { applyThemeToRoot } from "../styles/themeVariables";

/**
 * Force le thème clair sur les pages d'authentification (login, reset MDP).
 * Restaure le thème utilisateur à la sortie de la page.
 */
export function useForceLightTheme() {
  useEffect(() => {
    applyThemeToRoot("light");

    return () => {
      const savedTheme = localStorage.getItem("theme") || "light";
      applyThemeToRoot(savedTheme);
    };
  }, []);
}
