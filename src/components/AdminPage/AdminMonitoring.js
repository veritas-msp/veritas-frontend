// ──────────────────────────────
// 📦 Dépendances & API
// ──────────────────────────────
import React, { useState } from "react";
import styles from "./AdminPanel.module.css";
import ClientSkeletonConfig from "./MonitoringClientSkeleton/MonitoringClientSkeleton";
import { useAuthContext } from "../../contexts/AuthContext";
import { Icon } from "@iconify/react";


// ──────────────────────────────
// 🧩 Composant principal
// ──────────────────────────────
export default function AdminMonitoring() {
  const { user } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className={styles.simpleLayout}>
      {/* Section Clients avec Monitoring */}
      <div className={styles.simpleContent}>
        <div style={{ width: '100%' }}>
          <div className={styles.sectionBlock} style={{ padding: '1.5rem', boxShadow: 'none', marginBottom: 0 }}>
            <div className={styles.titleCardBlockHeader} style={{ marginBottom: '1rem' }}>
              <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon icon="mdi:monitor-eye" style={{ fontSize: '1.4rem', color: '#13BA8E' }} />
                Clients avec Monitoring
              </h3>
              <div className={styles.searchInputWrapper} style={{ maxWidth: '420px' }}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Rechercher par nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className={styles.searchClearButton}
                    title="Effacer la recherche"
                  >
                    <Icon icon="mdi:close-circle" style={{ fontSize: '1.1rem' }} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '1rem' }} />

            <div style={{width: '100%'}}>
              <ClientSkeletonConfig searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
