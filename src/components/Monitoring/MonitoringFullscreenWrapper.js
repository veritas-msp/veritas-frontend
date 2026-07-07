// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { useEffect } from "react";
import styles from "./MonitoringFullscreenWrapper.module.css";

// ──────────────────────────────
// 📁 Composant : Wrapper plein écran pour l'élaboration du rapport
// ──────────────────────────────
export default function MonitoringFullscreenWrapper({ children, onExit }) {
  useEffect(() => {
    // Masquer la sidebar au montage (sans toucher au margin-left global)
    const sidebar =
      document.querySelector('[class*="sidebar"]') ||
      document.querySelector('[class*="Sidebar"]') ||
      document.querySelector("aside") ||
      document.querySelector('[role="navigation"]');

    if (sidebar) {
      sidebar.style.display = "none";
      sidebar.style.visibility = "hidden";
    }

    // Classe pour que le header prenne toute la largeur (left: 0) en vue rapport
    document.body.classList.add("monitoring-report-fullscreen");

    return () => {
      document.body.classList.remove("monitoring-report-fullscreen");
      // Restaurer la sidebar à la sortie
      if (sidebar) {
        sidebar.style.display = "";
        sidebar.style.visibility = "";
      }
    };
  }, []);

  return (
    <div className={styles.fullscreenWrapper}>
      {/* Contenu principal */}
      <div className={styles.content}>
        <div className={styles.scrollArea}>{children}</div>
      </div>
    </div>
  );
}


