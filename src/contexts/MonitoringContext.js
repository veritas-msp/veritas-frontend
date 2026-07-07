// ──────────────────────────────
// 📦 Imports
// ──────────────────────────────
import { createContext, useContext, useState, useMemo } from "react";
import { useMonitoring } from "../hooks/useMonitoring";

// ──────────────────────────────
// 📚 Contexte & Hook
// ──────────────────────────────
export const MonitoringContext = createContext(null);
export const useMonitoringContext = () => useContext(MonitoringContext);

// ──────────────────────────────
// 🧩 Provider persistant (utilise localStorage via useMonitoring)
// ──────────────────────────────
export function MonitoringProvider({ children, refreshDraftStatus }) {
  const monitoring = useMonitoring();

  const resetComplet = async () => {
    const userId = localStorage.getItem("id");

    try {
      // 1. Suppression en base
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/drafts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, type: "monitoring" }),
      });

      if (!response.ok) throw new Error("Échec suppression");

      // 2. Reset local
      monitoring.setMonitoringConfig(null);
      monitoring.setMonitoringData({});

      // 3. Refresh global
      if (refreshDraftStatus) await refreshDraftStatus();

      // 4. Notifie les composants
      window.dispatchEvent(new CustomEvent('draftDeleted', {
        detail: { type: "monitoring" }
      }));
    } catch (err) {
      console.error("Erreur reset monitoring:", err);
    }
  };

  const value = {
    ...monitoring,
    refreshDraftStatus,
    resetComplet // ← Expose la fonction
  };

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
}

// ──────────────────────────────
// 🧩 Provider éphémère pour les onglets (pas de localStorage)
// ──────────────────────────────
export function EphemeralMonitoringProvider({
  children,
  initialConfig = null,
  initialData = null,
  refreshDraftStatus = null,
}) {
  const [monitoringConfig, setMonitoringConfig] = useState(initialConfig);
  const [monitoringData, setMonitoringData] = useState(initialData || {});

  const resetComplet = async () => {
    // Pour les onglets, on se contente de vider l'état local
    setMonitoringConfig(null);
    setMonitoringData({});
    // Pas de suppression en base ni d'appel à refreshDraftStatus ici
  };

  const value = useMemo(
    () => ({
      monitoringConfig,
      setMonitoringConfig,
      monitoringData,
      setMonitoringData,
      refreshDraftStatus,
      resetComplet,
      // Pour compatibilité avec useMonitoring (au cas où)
      resetMonitoring: resetComplet,
      isIntroForm: !monitoringConfig,
    }),
    [monitoringConfig, monitoringData, refreshDraftStatus]
  );

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
}
