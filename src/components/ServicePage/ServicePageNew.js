// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { useState, useEffect, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaSync } from "react-icons/fa";
import { toast } from 'react-toastify';
import { fetchClients } from "../../api/clients";
import API_BASE_URL from "../../config";
import styles from "./ServicePage.module.css";

// ──────────────────────────────
// 🧩 Composant : ServicePage
// ──────────────────────────────
const TABS = [
  { key: "overview", icon: "mdi:view-dashboard", label: "Vue d'ensemble" },
  { key: "microsoft", icon: "mdi:microsoft-azure", label: "Microsoft" },
  { key: "domain", icon: "mdi:web", label: "Nom de domaine" }
];

export default function ServicePage({ onNavigate }) {
  const publicUrl = process.env.PUBLIC_URL || '';
  const [activeTab, setActiveTab] = useState("overview");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await fetchClients();
      setClients(clientsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = () => ({});

  // Données Microsoft
  const microsoftData = useMemo(() => {
    const data = [];
    clients.forEach(client => {
      if (client.Office365 || client.microsoft) {
        data.push({
          clientId: client.id,
          clientName: client.name,
          status: client.Office365?.status || 'actif',
          tenantId: client.Office365?.tenantId || '-',
          email: client.Office365?.email || '-',
          lastSync: client.Office365?.lastSync || null
        });
      }
    });
    return data;
  }, [clients]);

  // Données Domaine
  const domainData = useMemo(() => {
    const data = [];
    clients.forEach(client => {
      const domains = client.domaines || [];
      domains.forEach(domain => {
        data.push({
          clientId: client.id,
          clientName: client.name,
          domain: domain.name || domain,
          status: domain.status || 'actif',
          registrar: domain.registrar || '-',
          expirationDate: domain.expirationDate || '-',
          lastSync: domain.lastSync || null
        });
      });
    });
    return data;
  }, [clients]);

  const microsoftStats = useMemo(() => {
    const total = microsoftData.length;
    const active = microsoftData.filter(item => item.status === 'actif').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [microsoftData]);

  const domainStats = useMemo(() => {
    const total = domainData.length;
    const active = domainData.filter(item => item.status === 'actif').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [domainData]);

  const handleSyncMicrosoft = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress(0);
    setSyncStatus('Préparation...');

    try {
      toast.success('Synchronisation Microsoft en cours...');
      // Implémentation API si nécessaire
      setSyncProgress(100);
      setSyncStatus('Terminé');
      setTimeout(() => {
        setSyncing(false);
        setSyncProgress(0);
        setSyncStatus('');
      }, 1500);
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      toast.error('Erreur lors de la synchronisation');
      setSyncing(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.contentWrapper}>
        <div className={styles.header}>
          <div className={styles.title}>
            <Icon icon="mdi:cog-outline" className={styles.titleIcon} />
            <h1>Services</h1>
          </div>
          <p className={styles.subtitle}>Gestion des services Microsoft et domaines</p>
        </div>

        {/* Onglets */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabBar}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`${styles.tabItem} ${activeTab === tab.key ? styles.active : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon icon={tab.icon} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className={styles.tabContent}>
          {/* VUE D'ENSEMBLE */}
          {activeTab === "overview" && (
            <div className={styles.tabPanel}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <Icon icon="mdi:microsoft-azure" className={styles.statIcon} style={{ color: '#0078d4' }} />
                  <div>
                    <div className={styles.statValue}>{microsoftStats.total}</div>
                    <div className={styles.statLabel}>Comptes Microsoft</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <Icon icon="mdi:web" className={styles.statIcon} style={{ color: '#0078d4' }} />
                  <div>
                    <div className={styles.statValue}>{domainStats.total}</div>
                    <div className={styles.statLabel}>Domaines</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <Icon icon="mdi:check-circle" className={styles.statIcon} style={{ color: '#10b981' }} />
                  <div>
                    <div className={styles.statValue}>{microsoftStats.active + domainStats.active}</div>
                    <div className={styles.statLabel}>Services actifs</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MICROSOFT */}
          {activeTab === "microsoft" && (
            <div className={styles.tabPanel}>
              <div className={styles.tablesContainer}>
                <div className={styles.equipmentTableSection}>
                  <div className={styles.tableSectionHeader}>
                    <div className={styles.tableSectionTitle}>
                      <Icon icon="mdi:microsoft-azure" className={styles.tableSectionIcon} />
                      <h2>Microsoft</h2>
                      <span className={styles.tableSectionCount}>({microsoftData.length})</span>
                    </div>
                    <div className={styles.tableHeaderActions}>
                      <button
                        className={styles.syncButton}
                        onClick={handleSyncMicrosoft}
                        disabled={syncing || microsoftData.length === 0}
                        title={syncing ? 'Synchronisation en cours...' : 'Synchroniser Microsoft'}
                      >
                        {syncing ? (
                          <span className={styles.syncSpinner} aria-hidden="true"></span>
                        ) : (
                          <FaSync />
                        )}
                      </button>
                    </div>
                  </div>
                  {syncing && (
                    <div className={styles.progressBarWrapper}>
                      <div className={styles.progressBarHeader}>
                        <span className={styles.progressBarStatus}>{syncStatus || 'Synchronisation en cours...'}</span>
                        <span className={styles.progressBarPercent}>{syncProgress}%</span>
                      </div>
                      <div className={styles.progressBarContainer}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${syncProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {loading ? (
                    <div className={styles.loadingState}>
                      <Icon icon="mdi:loading" className={styles.loadingIcon} />
                      <p>Chargement des données Microsoft...</p>
                    </div>
                  ) : microsoftData.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Icon icon="mdi:cloud-off-outline" className={styles.emptyIcon} />
                      <h4>Aucun compte Microsoft</h4>
                      <p>Configurez Microsoft Entra dans les fiches clients</p>
                    </div>
                  ) : (
                    <div className={styles.tableWrapper}>
                      <table className={styles.equipmentTable}>
                        <thead>
                          <tr>
                            <th>Client</th>
                            <th>État</th>
                            <th>Tenant ID</th>
                            <th>Email</th>
                            <th>Dernière synchronisation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {microsoftData.map((item, index) => (
                            <tr key={`${item.clientId}-${index}`} className={styles.equipmentRow}>
                              <td>
                                <div className={styles.nameCell}>
                                  <span className={styles.statusIndicator} style={{
                                    backgroundColor: item.status === 'actif' ? '#10b981' : '#ef4444'
                                  }}></span>
                                  <span>{item.clientName}</span>
                                </div>
                              </td>
                              <td>
                                <span className={styles.statusBadge} style={{
                                  backgroundColor: item.status === 'actif' ? '#10b981' : '#ef4444'
                                }}>
                                  {item.status === 'actif' ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.8em' }}>
                                  {item.tenantId}
                                </span>
                              </td>
                              <td>{item.email}</td>
                              <td className={styles.dateCell}>
                                {item.lastSync ? new Date(item.lastSync).toLocaleString('fr-FR') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NOM DE DOMAINE */}
          {activeTab === "domain" && (
            <div className={styles.tabPanel}>
              <div className={styles.tablesContainer}>
                <div className={styles.equipmentTableSection}>
                  <div className={styles.tableSectionHeader}>
                    <div className={styles.tableSectionTitle}>
                      <Icon icon="mdi:web" className={styles.tableSectionIcon} />
                      <h2>Noms de domaine</h2>
                      <span className={styles.tableSectionCount}>({domainData.length})</span>
                    </div>
                  </div>
                  {loading ? (
                    <div className={styles.loadingState}>
                      <Icon icon="mdi:loading" className={styles.loadingIcon} />
                      <p>Chargement des domaines...</p>
                    </div>
                  ) : domainData.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Icon icon="mdi:domain-off" className={styles.emptyIcon} />
                      <h4>Aucun domaine</h4>
                      <p>Aucun domaine configuré pour les clients</p>
                    </div>
                  ) : (
                    <div className={styles.tableWrapper}>
                      <table className={styles.equipmentTable}>
                        <thead>
                          <tr>
                            <th>Client</th>
                            <th>Domaine</th>
                            <th>État</th>
                            <th>Registrar</th>
                            <th>Date d'expiration</th>
                            <th>Dernière synchronisation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {domainData.map((item, index) => (
                            <tr key={`${item.clientId}-${item.domain}-${index}`} className={styles.equipmentRow}>
                              <td>
                                <div className={styles.nameCell}>
                                  <span className={styles.statusIndicator} style={{
                                    backgroundColor: item.status === 'actif' ? '#10b981' : '#ef4444'
                                  }}></span>
                                  <span>{item.clientName}</span>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                                  {item.domain}
                                </span>
                              </td>
                              <td>
                                <span className={styles.statusBadge} style={{
                                  backgroundColor: item.status === 'actif' ? '#10b981' : '#ef4444'
                                }}>
                                  {item.status === 'actif' ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td>{item.registrar}</td>
                              <td className={styles.dateCell}>
                                {item.expirationDate !== '-' ? new Date(item.expirationDate).toLocaleDateString('fr-FR') : '-'}
                              </td>
                              <td className={styles.dateCell}>
                                {item.lastSync ? new Date(item.lastSync).toLocaleString('fr-FR') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
