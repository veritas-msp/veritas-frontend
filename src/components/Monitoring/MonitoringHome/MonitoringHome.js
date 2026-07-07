// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaTimes, FaPlus } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import Icon from "@mdi/react";
import { mdiWeb, mdiWallFire, mdiWifiMarker, mdiBug } from "@mdi/js";
import { FaEthernet } from "react-icons/fa";
import { IoServerSharp } from "react-icons/io5";
import { fetchMonitoringDocuments } from "../../../api/monitoringDocuments";
import styles from "./MonitoringHome.module.css";

export default function MonitoringPage({ clients = [], onNewDocument, onEditDocument, onViewSummary }) {
  // État pour la liste des documents
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [clientFilters, setClientFilters] = useState(new Set());
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const docsPerPage = 5;

  // État pour le modal de création (une seule étape : client + dates + lancer)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClientKey, setSelectedClientKey] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrer les clients avec au moins un module de monitoring activé
  const monitoringClients = clients.filter(client => {
    const modulesMonitoring = client.modules_monitoring || {};
    const hasMonitoringModules = Object.values(modulesMonitoring).some(value => value === true);
    const options = client.options || client.modules || {};
    const hasMonitoringOption = options.Monitoring === true || options.monitoring === true ||
                               options.Monitoring === "true" || options.monitoring === "true";
    return hasMonitoringModules || hasMonitoringOption;
  });

  const selectedClient = monitoringClients.find(c => c.name === selectedClientKey);

  // Helper pour convertir la période en libellé mois
  const getMonthLabelFromPeriod = (period, fallbackYear) => {
    if (!period) return "";
    const match = period.match(/du\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+au\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
    if (!match) return period + (fallbackYear ? ` ${fallbackYear}` : "");
    
    const startMonth = parseInt(match[2], 10);
    const endMonth = parseInt(match[5], 10);
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const startLabel = monthNames[startMonth - 1] || period;
    const endLabel = monthNames[endMonth - 1] || period;
    const monthsLabel = startMonth === endMonth || !endMonth ? startLabel : `${startLabel}-${endLabel}`;
    return fallbackYear ? `${monthsLabel} ${fallbackYear}` : monthsLabel;
  };

  // Charger les documents récents
  const fetchRecentDocs = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await fetchMonitoringDocuments();
      const adaptedDocs = docs
        .filter(doc => {
          if (doc.is_trashed || doc.isTrashed || doc.trashed || doc.deleted) return false;
          if (!doc.config || !doc.data) {
            console.warn("⚠️ Document sans config ou data (ID:", doc.id, "), ignoré");
            return false;
          }
          return true;
        })
        .map(doc => ({
          id: doc.id,
          name: doc.name,
          client_name: doc.client_name,
          client: doc.client_name,
          report_period: doc.report_period,
          report_frequency: doc.report_frequency || "",
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          user_email: doc.user_email,
          data: { config: doc.config, data: doc.data }
        }));
      setRecentDocs(adaptedDocs);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des documents:", error);
      setRecentDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentDocs();
  }, [fetchRecentDocs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Fonctions utilitaires pour les modules
  const mapModuleKey = (moduleKey) => {
    const map = {
      'Serveurs': 'serveurs', 'Sauvegarde': 'sauvegarde', 'Stockage': 'stockage',
      'Firewall': 'firewalls', 'Switch': 'switch', 'BorneWifi': 'wifi',
      'Antispam': 'antispam', 'Antivirus': 'antivirus', 'Office365': 'office365',
      'NDD': 'ndd', 'Internet': 'internet'
    };
    return map[moduleKey] || moduleKey.toLowerCase();
  };

  const getModuleIcon = (moduleKey) => {
    const key = mapModuleKey(moduleKey);
    const size = 22;
    switch (key) {
      case "internet": return <Icon path={mdiWeb} size={size} />;
      case "serveurs": return <IconifyIcon icon="mingcute:server-fill" width={size} height={size} />;
      case "stockage": return <IoServerSharp size={size} />;
      case "firewalls": case "firewall": return <Icon path={mdiWallFire} size={size} />;
      case "switch": return <FaEthernet size={size} />;
      case "wifi": case "bornewifi": return <Icon path={mdiWifiMarker} size={size} />;
      case "sauvegarde": return <IconifyIcon icon="material-symbols:backup" width={size} height={size} />;
      case "antivirus": return <Icon path={mdiBug} size={size} />;
      case "antispam": return <IconifyIcon icon="material-symbols:mail-shield-outline" width={size} height={size} />;
      case "office365": return <IconifyIcon icon="hugeicons:office-365" width={size} height={size} />;
      case "ndd": return <IconifyIcon icon="stash:domain" width={size} height={size} />;
      default: return null;
    }
  };

  const getAllModulesForClient = (client) => {
    let modules = client?.modules_monitoring || {};
    if (Object.keys(modules).length === 0 && client?.modules) {
      const generalModules = client.modules;
      const monitoringModuleKeys = ['Serveurs', 'Sauvegarde', 'Stockage', 'Firewall', 'Switch', 'BorneWifi', 'Antispam', 'Antivirus', 'Office365', 'NDD', 'Internet'];
      monitoringModuleKeys.forEach(key => {
        if (generalModules[key] === true) modules[key] = true;
      });
    }
    return Object.keys(modules)
      .map(moduleKey => ({
        key: moduleKey,
        icon: getModuleIcon(moduleKey),
        enabled: modules[moduleKey] === true
      }))
      .filter(module => module.icon !== null);
  };

  // Gestion du modal de création
  const formatDateDDMM = (dateString) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}`;
  };

  const formatInputDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const generatedPeriod = dateDebut && dateFin
    ? `du ${formatDateDDMM(dateDebut)} au ${formatDateDDMM(dateFin)}`
    : "";

  const documentName = selectedClientKey && generatedPeriod
    ? `${selectedClientKey} - ${generatedPeriod}`
    : "";

  useEffect(() => {
    if (showCreateModal) {
      setSelectedClientKey("");
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      setDateDebut(formatInputDate(firstDay));
      setDateFin(formatInputDate(lastDay));
    }
  }, [showCreateModal]);

  useEffect(() => {
    if (showCreateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCreateModal]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showCreateModal) {
        setShowCreateModal(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showCreateModal]);

  const handleCreateDocument = async () => {
    if (!selectedClientKey || !dateDebut || !dateFin || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const selectedClient = monitoringClients.find(c => c.name === selectedClientKey);
      const startDate = new Date(dateDebut);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      const updatedClient = {
        ...selectedClient,
        reportPeriod: generatedPeriod,
        documentName: documentName,
        checkmkPeriod: {
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString()
        }
      };
      onNewDocument({
        documentName: documentName,
        client: { ...updatedClient }
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Erreur lors de la création du document:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => selectedClientKey && dateDebut && dateFin;

  // Comptages par client (KPI filtrables)
  const clientCounts = useMemo(() => {
    const counts = {};
    recentDocs.forEach((doc) => {
      const name = doc.client_name || doc.client || "Sans client";
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [recentDocs]);

  const toggleClientFilter = (clientName) => {
    setClientFilters((prev) => {
      const next = new Set(prev);
      if (next.has(clientName)) next.delete(clientName);
      else next.add(clientName);
      return next;
    });
  };

  const handleTotalCardClick = () => {
    setClientFilters(new Set());
  };

  const handleClientCardClick = (clientName) => {
    setClientFilters(new Set([clientName]));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setClientFilters(new Set());
  };

  const activeFiltersCount = (searchTerm.trim() ? 1 : 0) + clientFilters.size;
  const hasActiveFilters = activeFiltersCount > 0;

  // Filtrage, tri et pagination des documents
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredDocs = useMemo(() => {
    let list = recentDocs;
    if (normalizedSearch) {
      list = list.filter((doc) => {
        const docName = (doc.name || "").toString();
        const clientName = (doc.client_name || doc.client || "").toString();
        const haystack = [docName, clientName].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }
    if (clientFilters.size > 0) {
      list = list.filter((doc) => {
        const name = doc.client_name || doc.client || "Sans client";
        return clientFilters.has(name);
      });
    }
    const dir = sortOrder === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "name":
          aVal = (a.name || "").toLowerCase();
          bVal = (b.name || "").toLowerCase();
          return dir * (aVal < bVal ? -1 : aVal > bVal ? 1 : 0);
        case "client":
          aVal = (a.client_name || a.client || "").toLowerCase();
          bVal = (b.client_name || b.client || "").toLowerCase();
          return dir * (aVal < bVal ? -1 : aVal > bVal ? 1 : 0);
        case "created_at":
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dir * (aVal - bVal);
        case "creator":
          aVal = (a.user_email || "").toLowerCase();
          bVal = (b.user_email || "").toLowerCase();
          return dir * (aVal < bVal ? -1 : aVal > bVal ? 1 : 0);
        case "period":
          aVal = (a.report_period || "").toLowerCase();
          bVal = (b.report_period || "").toLowerCase();
          return dir * (aVal < bVal ? -1 : aVal > bVal ? 1 : 0);
        default:
          return 0;
      }
    });
    return list;
  }, [recentDocs, normalizedSearch, clientFilters, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null;
    return <span className={styles.sortIcon}>{sortOrder === "asc" ? " ↑" : " ↓"}</span>;
  };

  const totalPages = Math.ceil(filteredDocs.length / docsPerPage);
  const startIndex = (currentPage - 1) * docsPerPage;
  const endIndex = startIndex + docsPerPage;
  const paginatedDocs = filteredDocs.slice(startIndex, endIndex);

  const handleRecentDocClick = (doc, e) => {
    e.stopPropagation();
    if (!doc) return;
    const hasValidData = 
      (doc.data && doc.data.config && doc.data.data) ||
      (doc.config && doc.data) ||
      (doc.data && doc.data.data);
    if (hasValidData) {
      onEditDocument(doc);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Sidebar filtres (style EntreprisesPage) */}
      <div className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.sidebarHeader}>
          {!sidebarCollapsed && <h2>Filtres</h2>}
          <button
            type="button"
            className={`${styles.collapseButton} ${hasActiveFilters ? styles.collapseButtonHasFilters : ""}`}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Déplier les filtres" : "Plier les filtres"}
          >
            <IconifyIcon icon="mdi:filter" />
            {activeFiltersCount > 0 && (
              <span className={styles.filterBadge}>{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className={styles.filterSection}>
            <div className={styles.sidebarSearchBox}>
              <FaSearch className={styles.sidebarSearchIcon} />
              <input
                type="text"
                placeholder="Rechercher un rapport..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.sidebarSearchInput}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className={styles.sidebarClearButton}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        )}

        {!sidebarCollapsed && (
          <div className={styles.filterSection}>
            <h3 className={styles.filterTitle}>Client</h3>
            <div className={styles.filterList}>
              <button
                type="button"
                className={`${styles.filterItem} ${clientFilters.size === 0 ? styles.active : ""}`}
                onClick={() => setClientFilters(new Set())}
              >
                <span>Tous les rapports ({recentDocs.length})</span>
              </button>
              {Object.entries(clientCounts)
                .sort((a, b) => (b[1] - a[1]))
                .map(([clientName, count]) => (
                  <button
                    key={clientName}
                    type="button"
                    className={`${styles.filterItem} ${clientFilters.has(clientName) ? styles.active : ""}`}
                    onClick={() => toggleClientFilter(clientName)}
                  >
                    <span>{clientName} ({count})</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {!sidebarCollapsed && (
          <div className={styles.filterSection}>
            <button type="button" className={styles.actionButton} onClick={clearFilters}>
              <IconifyIcon icon="mdi:filter-off" /> Effacer les filtres
            </button>
          </div>
        )}
      </div>

      <div className={styles.mainContent}>
        <div className={styles.tableHeader}>
          <h1 className={styles.title}>
            <IconifyIcon icon="mdi:monitor-dashboard" className={styles.titleIcon} />
            Rapports de monitoring
          </h1>
          <div className={styles.searchBarContainer}>
            <div className={styles.headerSearchBox}>
              <FaSearch className={styles.headerSearchIcon} />
              <input
                type="text"
                placeholder="Rechercher un rapport..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.headerSearchInput}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className={styles.headerClearButton}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          <div className={styles.tableActions}>
            <span className={styles.resultCount}>
              {filteredDocs.length} rapport{filteredDocs.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setShowCreateModal(true)}
              title="Ajouter un rapport"
            >
              <FaPlus />
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Chargement des rapports...</div>
        ) : recentDocs.length === 0 ? (
          <div className={styles.emptyState}>
            <IconifyIcon icon="mdi:file-document-outline" className={styles.emptyIcon} />
            <p>Aucun rapport de monitoring</p>
          </div>
        ) : (
          <div className={styles.tablesContainer}>
            {/* Cartes KPI filtrables */}
            <div className={styles.statsCards}>
              <div
                className={styles.statCard}
                onClick={handleTotalCardClick}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.statCardIcon}>
                  <IconifyIcon icon="mdi:file-document-multiple" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue}>{recentDocs.length}</div>
                  <div className={styles.statCardLabel}>Rapports</div>
                </div>
              </div>
              {Object.entries(clientCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([clientName, count]) => (
                  <div
                    key={clientName}
                    className={`${styles.statCard} ${clientFilters.has(clientName) ? styles.statCardActive : ""}`}
                    onClick={() => handleClientCardClick(clientName)}
                    style={{ cursor: "pointer" }}
                    title={clientName}
                  >
                    <div className={styles.statCardIcon}>
                      <IconifyIcon icon="mdi:office-building" />
                    </div>
                    <div className={styles.statCardContent}>
                      <div className={styles.statCardValue}>{count}</div>
                      <div className={styles.statCardLabel}>{clientName}</div>
                    </div>
                  </div>
                ))}
            </div>

            <div className={styles.equipmentTableSection}>
              <div className={styles.reportsTableWrapper}>
                <table className={styles.docTable}>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("name")} className={styles.sortable}>Nom <SortIcon column="name" /></th>
                      <th onClick={() => handleSort("client")} className={styles.sortable}>Client <SortIcon column="client" /></th>
                      <th onClick={() => handleSort("created_at")} className={styles.sortable}>Date de création <SortIcon column="created_at" /></th>
                      <th onClick={() => handleSort("creator")} className={styles.sortable}>Créateur <SortIcon column="creator" /></th>
                      <th onClick={() => handleSort("period")} className={styles.sortable}>Période <SortIcon column="period" /></th>
                      <th className={styles.actionsCol}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocs.map((doc) => {
                      const docName = doc.name || "Document sans nom";
                      const clientName = doc.client_name || doc.client || "Client non spécifié";
                      const creatorEmail = doc.user_email || "Anonyme";
                      const createdAtDate = doc.created_at ? new Date(doc.created_at) : null;
                      const createdAtLabel = createdAtDate && !Number.isNaN(createdAtDate.getTime())
                        ? createdAtDate.toLocaleString("fr-FR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })
                        : "";
                      const reportPeriod = doc.report_period || "-";

                      return (
                        <motion.tr
                          key={doc.id}
                          className={styles.tableRow}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <td className={styles.docName}>{docName}</td>
                          <td>{clientName}</td>
                          <td>{createdAtLabel || "Date inconnue"}</td>
                          <td>{creatorEmail}</td>
                          <td>{reportPeriod}</td>
                          <td className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={(e) => handleRecentDocClick(doc, e)}
                              title="Éditer le document"
                            >
                              <IconifyIcon icon="mdi:pencil" className={styles.actionIcon} />
                            </button>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewSummary(doc);
                              }}
                              title="Voir le résumé"
                            >
                              <IconifyIcon icon="mdi:chart-box" className={styles.actionIcon} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredDocs.length === 0 && (
              <div className={styles.noData}>Aucun rapport trouvé</div>
            )}

            {filteredDocs.length > docsPerPage && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <IconifyIcon icon="mdi:chevron-left" className={styles.buttonIcon} />
                  <span>Précédent</span>
                </button>
                <span className={styles.pageInfo}>
                  Page {currentPage} sur {totalPages} ({filteredDocs.length} document{filteredDocs.length > 1 ? "s" : ""})
                </span>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <span>Suivant</span>
                  <IconifyIcon icon="mdi:chevron-right" className={styles.buttonIcon} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de création : client + dates + lancer */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Nouveau rapport</h2>
                <button type="button" className={styles.modalClose} onClick={() => setShowCreateModal(false)} title="Fermer">
                  <FaTimes />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.modalField}>
                  <label htmlFor="create-client">Client</label>
                  <select
                    id="create-client"
                    value={selectedClientKey}
                    onChange={(e) => setSelectedClientKey(e.target.value)}
                    className={styles.modalSelect}
                  >
                    <option value="">Choisir un client</option>
                    {monitoringClients
                      .filter((c) => getAllModulesForClient(c).some((m) => m.enabled))
                      .map((c) => (
                        <option key={c.id || c.name} value={c.name}>{c.name}</option>
                      ))}
                  </select>
                </div>
                <div className={styles.modalRow}>
                  <div className={styles.modalField}>
                    <label htmlFor="date-debut">Date de début</label>
                    <input
                      id="date-debut"
                      type="date"
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      className={styles.modalInput}
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label htmlFor="date-fin">Date de fin</label>
                    <input
                      id="date-fin"
                      type="date"
                      value={dateFin}
                      onChange={(e) => setDateFin(e.target.value)}
                      min={dateDebut}
                      className={styles.modalInput}
                    />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={`${styles.modalSubmit} ${!isFormValid() || isSubmitting ? styles.modalSubmitDisabled : ""}`}
                    onClick={handleCreateDocument}
                    disabled={!isFormValid() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <IconifyIcon icon="mdi:loading" className={styles.modalSubmitIcon} />
                    ) : (
                      <IconifyIcon icon="mdi:rocket-launch" className={styles.modalSubmitIcon} />
                    )}
                    Lancer le rapport
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

