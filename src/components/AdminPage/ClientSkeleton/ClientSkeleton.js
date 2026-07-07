// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { useEffect, useState, useRef } from "react";
import styles from "../AdminPanel.module.css";
import { deleteClient as deleteClientAPI } from "../../../api/clients";
import {
  loadAdminClientsListCached,
  ADMIN_CLIENTS_LIST_CACHE_KEY,
} from "../adminClientsListHelpers";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import ClientModal from "./ClientModal";

// Fonction utilitaire pour formater les dates
const formatDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Si la date n'est pas valide, retourner la chaîne originale
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString; // En cas d'erreur, retourner la chaîne originale
  }
};

const INFRA_KEYS = ["Internet", "Firewall", "Firewalls", "Serveurs", "Stockage", "NAS", "Switch", "BorneWifi"];
const CYBER_KEYS = ["Antivirus", "Antispam", "Campaign", "Campagne", "Sauvegarde"];
const SERVICE_KEYS = ["Office365", "NDD"];

const getModulesSnapshot = (client) => {
  const raw = client?.modules_monitoring || client?.modules || {};
  if (raw && typeof raw === "object") return raw;
  return {};
};

const countEnabledByKeys = (client, keys) => {
  const modules = getModulesSnapshot(client);
  return keys.reduce((total, key) => total + (modules?.[key] ? 1 : 0), 0);
};

const countTotalAssets = (client) =>
  countEnabledByKeys(client, INFRA_KEYS) +
  countEnabledByKeys(client, CYBER_KEYS) +
  countEnabledByKeys(client, SERVICE_KEYS);

// ──────────────────────────────
// 🧩 Composant principal
// ──────────────────────────────
export default function ClientSkeleton({ isLoading }) {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedClientIds, setSelectedClientIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const clientsLoadAbortRef = useRef(null);

  // Chargement initial : liste légère (pas de rafale /clients/:id/modules)
  useEffect(() => {
    clientsLoadAbortRef.current?.abort();
    const ac = new AbortController();
    clientsLoadAbortRef.current = ac;
    loadAdminClientsListCached({ signal: ac.signal, cacheKey: ADMIN_CLIENTS_LIST_CACHE_KEY })
      .then((rows) => {
        if (!ac.signal.aborted) setClients(rows);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") console.error(err);
      });
    return () => ac.abort();
  }, []);

  // Filtrage et tri des clients
  useEffect(() => {
    let filtered = clients;
    
    // Filtrage par recherche
    if (searchTerm.trim()) {
      filtered = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Tri
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        
        // Gestion des valeurs nulles/undefined
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        
        if (sortKey === "infra_count") {
          aVal = countEnabledByKeys(a, INFRA_KEYS);
          bVal = countEnabledByKeys(b, INFRA_KEYS);
        }
        if (sortKey === "cyber_count") {
          aVal = countEnabledByKeys(a, CYBER_KEYS);
          bVal = countEnabledByKeys(b, CYBER_KEYS);
        }
        if (sortKey === "service_count") {
          aVal = countEnabledByKeys(a, SERVICE_KEYS);
          bVal = countEnabledByKeys(b, SERVICE_KEYS);
        }
        
        // Tri spécial pour les dates de contrat
        if (sortKey === 'contrat_debut') {
          aVal = a.contrat?.debut || '';
          bVal = b.contrat?.debut || '';
        }
        if (sortKey === 'contrat_fin') {
          aVal = a.contrat?.expiration || '';
          bVal = b.contrat?.expiration || '';
        }
        // Tri spécial pour les sites (nombre de lieux)
        if (sortKey === 'sites') {
          aVal = a.sites?.length || 0;
          bVal = b.sites?.length || 0;
        }
        
        // Conversion en string pour comparaison
        if (typeof aVal !== 'string') aVal = String(aVal);
        if (typeof bVal !== 'string') bVal = String(bVal);
        
        const comparison = aVal.localeCompare(bVal, 'fr', { numeric: true });
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }
    
    setFilteredClients(filtered);
  }, [clients, searchTerm, sortKey, sortDir]);

  // Remettre la page à 1 quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortKey, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setSelectedClientIds((prev) => {
      const validIds = new Set(clients.map((client) => client.id));
      const next = new Set();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [clients]);

  const isClientDeletable = (client) => countTotalAssets(client) === 0;

  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = filteredClients.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEndIndex = Math.min(currentPage * pageSize, filteredClients.length);
  const paginatedClients = filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const deletablePaginatedClients = paginatedClients.filter(isClientDeletable);
  const allDeletablePageSelected =
    deletablePaginatedClients.length > 0 &&
    deletablePaginatedClients.every((client) => selectedClientIds.has(client.id));
  const selectedCount = selectedClientIds.size;

  // Fonction de tri
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelectClient = (clientId) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (allDeletablePageSelected) {
        deletablePaginatedClients.forEach((client) => next.delete(client.id));
      } else {
        deletablePaginatedClients.forEach((client) => next.add(client.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedClientIds(new Set());

  const openDeleteConfirmation = (ids) => {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0) return;
    setConfirmDeleteIds(uniqueIds);
  };

  const openBulkDeleteConfirmation = () => {
    const ids = [...selectedClientIds].filter((id) => {
      const client = clients.find((item) => item.id === id);
      return client && isClientDeletable(client);
    });
    if (ids.length === 0) {
      toast.error("Aucune entreprise sélectionnée ne peut être supprimée (actifs détectés).");
      return;
    }
    openDeleteConfirmation(ids);
  };

  const closeDeleteConfirmation = () => {
    if (bulkDeleting) return;
    setConfirmDeleteIds([]);
  };

  const removeClientsFromState = (deletedIds) => {
    const deletedSet = new Set(deletedIds);
    setClients((prev) => prev.filter((client) => !deletedSet.has(client.id)));
    try {
      const raw = sessionStorage.getItem(ADMIN_CLIENTS_LIST_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.data)) return;
      const nextData = parsed.data.filter((client) => !deletedSet.has(client.id));
      sessionStorage.setItem(
        ADMIN_CLIENTS_LIST_CACHE_KEY,
        JSON.stringify({ savedAt: Date.now(), data: nextData })
      );
    } catch {
      // ignore cache write errors
    }
  };

  // Suppression définitive (une ou plusieurs entreprises)
  const confirmDelete = async () => {
    const idsToDelete = [...confirmDeleteIds];
    if (idsToDelete.length === 0) return;

    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(idsToDelete.map((id) => deleteClientAPI(id)));
      const succeededIds = idsToDelete.filter((_, index) => results[index].status === "fulfilled");
      const failed = results.length - succeededIds.length;

      if (succeededIds.length > 0) {
        removeClientsFromState(succeededIds);
        setSelectedClientIds((prev) => {
          const next = new Set(prev);
          succeededIds.forEach((id) => next.delete(id));
          return next;
        });
        window.dispatchEvent(new CustomEvent("refreshEnterprises"));
        toast.success(
          succeededIds.length === 1
            ? "Entreprise supprimée."
            : `${succeededIds.length} entreprise${succeededIds.length > 1 ? "s" : ""} supprimée${succeededIds.length > 1 ? "s" : ""}.`
        );
      }
      if (failed > 0) {
        const firstError = results.find((result) => result.status === "rejected");
        toast.error(
          failed === 1
            ? (firstError?.reason?.message || "Échec de la suppression.")
            : `${failed} suppression${failed > 1 ? "s" : ""} en échec.`
        );
      }
    } catch (error) {
      toast.error(error?.message || "Échec de la suppression");
    } finally {
      setBulkDeleting(false);
      setConfirmDeleteIds([]);
    }
  };



  return (
    <div className={styles.simpleContent}>
      <div style={{ width: '100%' }}>
        <div className={styles.sectionBlock} style={{ padding: '1.5rem', boxShadow: 'none', marginBottom: 0 }}>
          <div className={`${styles.sectionHeader} ${styles.adminTablesHeaderRow}`}>
            <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
              <Icon icon="mingcute:building-1-fill" style={{ fontSize: '1.4rem', color: '#13BA8E' }} />
              Gestion des entreprises
            </h3>
            <div className={styles.adminHeaderSearchSlot}>
              <div className={`${styles.searchInputWrapper} ${styles.searchInputWrapperCentered}`}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Rechercher par nom, email ou téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className={styles.searchClearButton}
                    title="Effacer la recherche"
                  >
                    <Icon icon="mingcute:close-circle-fill" style={{ fontSize: '1.1rem' }} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className={styles.searchMeta}>
            {filteredClients.length} entreprise{filteredClients.length > 1 ? "s" : ""} trouvee{filteredClients.length > 1 ? "s" : ""}
          </div>

          {selectedCount > 0 && (
            <div className={styles.bulkActionsBar}>
              <span className={styles.bulkActionsInfo}>
                {selectedCount} entreprise{selectedCount > 1 ? "s" : ""} sélectionnée{selectedCount > 1 ? "s" : ""}
              </span>
              <div className={styles.bulkActionsButtons}>
                <button
                  type="button"
                  className={styles.bulkActionButton}
                  onClick={clearSelection}
                >
                  Tout désélectionner
                </button>
                <button
                  type="button"
                  className={`${styles.bulkActionButton} ${styles.bulkActionButtonDanger}`}
                  onClick={openBulkDeleteConfirmation}
                >
                  <Icon icon="mingcute:delete-2-fill" />
                  Supprimer la sélection
                </button>
              </div>
            </div>
          )}

          {/* Tableau des clients */}
          <div className={`${styles.userTableWrapper} ${styles.cleanTableWrapper}`}>
            <table className={`${styles.userTable} ${styles.clientTable}`}>
              <thead>
                <tr>
                  <th className={styles.tableCheckboxCell}>
                    <input
                      type="checkbox"
                      className={styles.tableCheckbox}
                      checked={allDeletablePageSelected}
                      disabled={deletablePaginatedClients.length === 0}
                      onChange={toggleSelectAllPage}
                      title="Sélectionner les entreprises supprimables de la page"
                      aria-label="Sélectionner les entreprises supprimables de la page"
                    />
                  </th>
                  <th onClick={() => toggleSort('name')} style={{cursor:'pointer'}}>
                    NOM {sortKey==='name' ? (sortDir==='asc'?'▲':'▼') : ''}
                  </th>
                  <th onClick={() => toggleSort("infra_count")} style={{cursor:'pointer'}}>
                    INFRA {sortKey==="infra_count" ? (sortDir==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => toggleSort("cyber_count")} style={{cursor:'pointer'}}>
                    CYBER {sortKey==="cyber_count" ? (sortDir==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => toggleSort("service_count")} style={{cursor:'pointer'}}>
                    SERVICE {sortKey==="service_count" ? (sortDir==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "1.25rem", color: "#64748b" }}>
                      Aucune entreprise a afficher
                    </td>
                  </tr>
                )}
                {paginatedClients.map((client) => {
                  const canDelete = isClientDeletable(client);
                  return (
                  <tr 
                    key={client.id} 
                    className={styles.userRow}
                  >
                    <td className={styles.tableCheckboxCell}>
                      <input
                        type="checkbox"
                        className={styles.tableCheckbox}
                        checked={selectedClientIds.has(client.id)}
                        disabled={!canDelete}
                        onChange={() => toggleSelectClient(client.id)}
                        onClick={(e) => e.stopPropagation()}
                        title={canDelete ? "Sélectionner pour suppression" : "Suppression impossible: actifs détectés"}
                        aria-label={canDelete ? `Sélectionner ${client.name || "l'entreprise"}` : "Entreprise non supprimable"}
                      />
                    </td>
                    <td>{client.name || "-"}</td>
                    <td>{countEnabledByKeys(client, INFRA_KEYS)}</td>
                    <td>{countEnabledByKeys(client, CYBER_KEYS)}</td>
                    <td>{countEnabledByKeys(client, SERVICE_KEYS)}</td>
                    <td className={styles.actionsCell}>
                      <button
                        className={`${styles.actionButton} ${styles.danger}`}
                        disabled={!canDelete}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canDelete) {
                            toast.error("Suppression impossible: cette entreprise possède des actifs.");
                            return;
                          }
                          openDeleteConfirmation([client.id]);
                        }}
                        title={canDelete ? "Supprimer" : "Suppression impossible: actifs detectes"}
                      >
                        <Icon icon="mingcute:delete-2-fill" />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
          {filteredClients.length > 0 && (
            <div className={styles.paginationBar}>
              <div className={styles.paginationLeft}>
                <span className={styles.paginationLabel}>Lignes par page</span>
                <select
                  className={styles.paginationSelect}
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className={styles.paginationRange}>
                  {pageStartIndex}-{pageEndIndex} sur {filteredClients.length}
                </span>
              </div>
              <div className={styles.paginationRight}>
                <button
                  type="button"
                  className={styles.paginationButton}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Page précédente"
                >
                  <FaChevronLeft />
                </button>
                <span className={styles.paginationInfo}>Page {currentPage} / {totalPages}</span>
                <button
                  type="button"
                  className={styles.paginationButton}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  title="Page suivante"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal édition/ajout client */}
      {showModal && (
        <ClientModal
          initialClient={selectedClient}
          onClose={async () => {
            const refreshed = await loadAdminClientsListCached({
              force: true,
              cacheKey: ADMIN_CLIENTS_LIST_CACHE_KEY,
            });
            setClients(refreshed);
            setShowModal(false);
          }}
        />
      )}

      {/* Confirmation suppression */}
      {confirmDeleteIds.length > 0 && (
        <div className={styles.modalOverlay} onClick={closeDeleteConfirmation}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon icon="mingcute:delete-2-fill" className={styles.modalIcon} />
                <h3>
                  {confirmDeleteIds.length === 1
                    ? "Supprimer l'entreprise"
                    : `Supprimer ${confirmDeleteIds.length} entreprises`}
                </h3>
              </div>
              <button
                className={styles.closeButton}
                onClick={closeDeleteConfirmation}
                disabled={bulkDeleting}
                title="Fermer"
              >
                <Icon icon="mingcute:close-line" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: '#1a1a1a' }}>
                {confirmDeleteIds.length === 1
                  ? "Êtes-vous sûr de vouloir supprimer cette entreprise ? Cette action est irréversible."
                  : `Êtes-vous sûr de vouloir supprimer ces ${confirmDeleteIds.length} entreprises ? Cette action est irréversible.`}
              </p>
            </div>

            <div className={styles.modalActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeDeleteConfirmation}
                disabled={bulkDeleting}
              >
                Annuler
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={confirmDelete}
                disabled={bulkDeleting}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 10px 20px rgba(220, 38, 38, 0.35)',
                  cursor: bulkDeleting ? 'not-allowed' : 'pointer',
                  opacity: bulkDeleting ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!bulkDeleting) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(185, 28, 28, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!bulkDeleting) {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(220, 38, 38, 0.35)';
                  }
                }}
                title="Supprimer définitivement"
              >
                <Icon icon="mingcute:delete-2-fill" style={{ fontSize: '1.1rem' }} />
                {bulkDeleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
