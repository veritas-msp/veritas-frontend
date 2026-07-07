// src/components/MyDocPage/MyDocPage.js
import { useEffect, useState, useMemo } from "react";
import { deleteDocumentById, updateDocumentName, moveDocumentToTrash, restoreDocumentById, purgeDocumentById } from "../../api/history";
import { fetchMonitoringDocuments, updateMonitoringDocumentName, deleteMonitoringDocument, restoreMonitoringDocument, purgeMonitoringDocument } from "../../api/monitoringDocuments";
import ConfirmationModal from "../Misc/ConfirmationModal/ConfirmationModal";
import styles from "./MyDocPage.module.css";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAuthContext } from "../../contexts/AuthContext";
import { FaSearch, FaTimes } from "react-icons/fa";

export default function MesDocumentsPage({ onNavigate }) {
  const { userRole } = useAuthContext();
  const toastOpts = { position: "bottom-right" };
  
  // États principaux
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [editOriginalName, setEditOriginalName] = useState("");
  const [editDoc, setEditDoc] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // États des modales et messages
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // active | trash | all
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    // Récupérer uniquement les documents de v_b_d_monitoring
    // La route gère automatiquement le filtrage selon le rôle (admin = tous, utilisateur = ses documents)
    (async () => {
      try {
        const docs = await fetchMonitoringDocuments();
        // Formater les documents pour correspondre au format attendu
        const formattedDocs = docs.map(doc => ({
          ...doc,
          type: 'monitoring',
          // Mapper user_email vers author pour l'affichage
          author: doc.user_email || 'Anonyme'
        }));
        setDocuments(formattedDocs);
      } catch (err) {
        console.error("❌ Erreur lors du chargement des documents:", err);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDeleteClick = (doc) => {
    setDocumentToDelete(doc);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    
    // Utiliser la bonne API selon le type de document
    const ok = documentToDelete.type === 'monitoring'
      ? await deleteMonitoringDocument(documentToDelete.id)
      : await moveDocumentToTrash(documentToDelete.id);
    
    if (ok) {
      setDocuments((prev) => prev.map((doc) => doc.id === documentToDelete.id ? { ...doc, trashed: true, is_trashed: true } : doc));
      setSuccessMessage("Document déplacé dans la corbeille");
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage("");
      }, 3000);
      toast.success("Document déplacé dans la corbeille", toastOpts);
    } else {
      toast.error("Erreur lors du déplacement du document dans la corbeille.", toastOpts);
    }
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };


  const startEdit = (doc) => {
    setEditDoc(doc);
    setEditName(doc.name);
    setEditOriginalName(doc.name);
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setEditDoc(null);
    setShowEditModal(false);
    setEditName("");
    setEditOriginalName("");
  };

  const saveEdit = async () => {
    const trimmed = editName.trim();
    if (trimmed.length < 3) {
      toast.warning("Le nom doit contenir au moins 3 caractères", toastOpts);
      cancelEdit();
      return;
    }
    if (trimmed === editOriginalName) {
      cancelEdit();
      return;
    }
    if (!editDoc) return;
    
    // Utiliser la bonne API selon le type de document
    const ok = editDoc.type === 'monitoring'
      ? await updateMonitoringDocumentName(editDoc.id, trimmed)
      : await updateDocumentName(editDoc.id, trimmed);
    
    if (ok) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === editDoc.id ? { ...doc, name: trimmed } : doc
        )
      );
      toast.success("Nom mis à jour", toastOpts);
    } else {
      toast.error("Erreur lors de la mise à jour du nom", toastOpts);
    }
    cancelEdit();
  };

  // Récupérer le nom du client
  const getClientName = (doc) => {
    // Tous les documents sont maintenant de type monitoring avec client_name
    return doc.client_name || "";
  };

  const isTrashed = (doc) => {
    // Tolère plusieurs variantes de champs
    return !!(doc.trashed || doc.isTrashed || doc.is_trashed || doc.deleted);
  };

  const byFilters = (doc) => {
    if (statusFilter === "active" && isTrashed(doc)) return false;
    if (statusFilter === "trash" && !isTrashed(doc)) return false;
    if (filterType && doc.type !== filterType) return false;
    const clientName = getClientName(doc);
    if (filterClient && clientName !== filterClient) return false;
    if (userRole === "admin" && filterUser && (doc.author || "Anonyme") !== filterUser) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (doc.name || "").toLowerCase();
      const client = (clientName || "").toLowerCase();
      const author = (doc.author || "").toLowerCase();
      if (!name.includes(q) && !client.includes(q) && !author.includes(q)) return false;
    }
    return true;
  };

  const filtered = documents.filter(byFilters);
  const sortedDocs = useMemo(() => [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [filtered]);
  const totalItems = sortedDocs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedDocs = sortedDocs.slice(startIndex, endIndex);

  const allTypes = Array.from(new Set(documents.map(d => d.type).filter(Boolean)));
  const allClients = Array.from(new Set(documents.map(d => getClientName(d)).filter(Boolean)));
  const allUsers = Array.from(new Set(documents.map(d => (d.author || 'Anonyme')).filter(Boolean)));

  // Compteurs pour indicateurs
  const trashedCount = documents.filter(d => {
    return !!(d.trashed || d.isTrashed || d.is_trashed || d.deleted);
  }).length;
  const activeCount = documents.length - trashedCount;
  const totalCount = documents.length;

  const activeFiltersCount =
    (searchQuery.trim() ? 1 : 0) +
    (statusFilter !== "active" ? 1 : 0) +
    (filterType ? 1 : 0) +
    (filterClient ? 1 : 0) +
    (userRole === "admin" && filterUser ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;

  const handleTotalCardClick = () => {
    setStatusFilter("all");
    setFilterType("");
    setFilterClient("");
    setFilterUser("");
    setSearchQuery("");
  };
  const handleActiveCardClick = () => {
    setStatusFilter("active");
  };
  const handleTrashCardClick = () => {
    setStatusFilter("trash");
  };

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [statusFilter, filterType, filterClient, filterUser, searchQuery]);

  // Assurer l'index de page valide quand la liste change
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);

  return (
    <div className={styles.contratPage}>
      {/* Message de succès */}
      {showSuccessMessage && (
        <div className={styles.successMessage}>
          <Icon icon="mdi:check-circle" className={styles.successIcon} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Sidebar filtres (style Entreprises) */}
      <div className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.sidebarHeader}>
          {!sidebarCollapsed && <h2>Filtres</h2>}
          <button
            type="button"
            className={`${styles.collapseButton} ${hasActiveFilters ? styles.collapseButtonHasFilters : ""}`}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Déplier les filtres" : "Plier les filtres"}
          >
            <Icon icon="mdi:filter" />
            {activeFiltersCount > 0 && (
              <span className={styles.filterBadge}>{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            {/* Filtre Type */}
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Type</h3>
              <select className={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Tous</option>
                {allTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Filtre Client */}
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Client</h3>
              <select className={styles.filterSelect} value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
                <option value="">Tous</option>
                {allClients.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filtre Utilisateur (admin seulement) */}
            {userRole === 'admin' && (
              <div className={styles.filterSection}>
                <h3 className={styles.filterTitle}>Utilisateur</h3>
                <select className={styles.filterSelect} value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
                  <option value="">Tous</option>
                  {allUsers.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtre Statut */}
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Statut</h3>
              <div className={styles.filterList}>
                <button
                  className={`${styles.filterItem} ${statusFilter === 'active' ? styles.active : ''}`}
                  onClick={() => setStatusFilter('active')}
                >
                  <Icon icon="mdi:check-circle" className={styles.filterIcon} />
                  <span>Actifs ({activeCount})</span>
                </button>
                <button
                  className={`${styles.filterItem} ${statusFilter === 'trash' ? styles.active : ''} ${trashedCount === 0 ? styles.disabled : ''}`}
                  onClick={() => setStatusFilter('trash')}
                  disabled={trashedCount === 0}
                >
                  <Icon icon="mdi:delete" className={styles.filterIcon} />
                  <span>Corbeille ({trashedCount})</span>
                </button>
                <button
                  className={`${styles.filterItem} ${statusFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  <Icon icon="mdi:folder-multiple" className={styles.filterIcon} />
                  <span>Tous ({totalCount})</span>
                </button>
              </div>
            </div>

            {/* Bouton réinitialiser */}
            {(statusFilter !== 'active' || filterType || filterClient || (userRole === 'admin' && filterUser)) && (
              <div className={styles.filterSection}>
                <button className={styles.actionButton} onClick={() => { setStatusFilter('active'); setFilterType(""); setFilterClient(""); setFilterUser(""); }}>
                  <Icon icon="mdi:filter-off" className={styles.actionIcon} />
                  Réinitialiser
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Contenu principal (style Entreprises) */}
      <div className={styles.mainContent}>
        <div className={styles.tableHeader}>
          <h1 className={styles.title}>
            <Icon icon="mdi:file-document-multiple" className={styles.titleIcon} />
            Mes documents
          </h1>
          <div className={styles.searchBarContainer}>
            <div className={styles.searchBox}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className={styles.clearButton}>
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          <div className={styles.tableActions}>
            <span className={styles.resultCount}>
              {filtered.length} document{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Chargement des documents...</div>
        ) : (
          <div className={styles.tablesContainer}>
            {/* Cartes KPI filtrables (style Entreprises) */}
            <div className={styles.statsCards}>
              <div className={styles.statCard} onClick={handleTotalCardClick} style={{ cursor: "pointer" }}>
                <div className={styles.statCardIcon}>
                  <Icon icon="mdi:file-document-multiple" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue}>{totalCount}</div>
                  <div className={styles.statCardLabel}>Total</div>
                </div>
              </div>
              <div
                className={`${styles.statCard} ${statusFilter === "active" ? styles.statCardActive : ""}`}
                onClick={handleActiveCardClick}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.statCardIcon} style={{ color: "#13BA8E" }}>
                  <Icon icon="mdi:check-circle" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue} style={{ color: "#13BA8E" }}>{activeCount}</div>
                  <div className={styles.statCardLabel}>Actifs</div>
                </div>
              </div>
              <div
                className={`${styles.statCard} ${statusFilter === "trash" ? styles.statCardActive : ""}`}
                onClick={handleTrashCardClick}
                style={{ cursor: trashedCount === 0 ? "default" : "pointer" }}
              >
                <div className={styles.statCardIcon} style={{ color: "#ef4444" }}>
                  <Icon icon="mdi:delete" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardValue} style={{ color: "#ef4444" }}>{trashedCount}</div>
                  <div className={styles.statCardLabel}>Corbeille</div>
                </div>
              </div>
            </div>

          <div className={styles.contentCard}>
          {sortedDocs.length === 0 ? (
            <div className={styles.emptyState}>
              <Icon icon="mdi:file-document-outline" className={styles.emptyIcon} />
              <h3>Aucun document trouvé</h3>
              <p>Vous n'avez pas encore de documents.</p>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <div className={styles.tableScroll}>
                <table className={styles.docTable}>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Type</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Créateur</th>
                      <th className={styles.actionsCol}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <span className={styles.docName}>{doc.name}</span>
                        </td>
                      <td>{doc.type ? doc.type.toUpperCase() : ""}</td>
                        <td>{getClientName(doc) || '-'}</td>
                        <td>{new Date(doc.created_at).toLocaleString('fr-FR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                        <td>{doc.author || (doc.user_id ? 'Utilisateur inconnu' : 'Anonyme')}</td>
                        <td className={styles.rowActions}>
                          {isTrashed(doc) ? (
                            userRole === 'admin' ? (
                              <>
                                <button className={styles.actionBtn} onClick={async () => {
                                  const ok = doc.type === 'monitoring'
                                    ? await restoreMonitoringDocument(doc.id)
                                    : await restoreDocumentById(doc.id);
                                  if (ok) {
                                    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, trashed: false, isTrashed: false, is_trashed: false, deleted: false } : d));
                                  toast.success('Document restauré', toastOpts);
                                  } else {
                                  toast.error('Échec de la restauration', toastOpts);
                                  }
                                }} title="Restaurer">
                                  <Icon icon="mdi:restore" className={styles.actionIcon} />
                                </button>
                                <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={async () => {
                                  const ok = doc.type === 'monitoring'
                                    ? await purgeMonitoringDocument(doc.id)
                                    : await purgeDocumentById(doc.id);
                                  if (ok) {
                                    setDocuments(prev => prev.filter(d => d.id !== doc.id));
                                  toast.success('Document définitivement supprimé', toastOpts);
                                  } else {
                                  toast.error('Échec de la purge', toastOpts);
                                  }
                                }} title="Purger définitivement">
                                  <Icon icon="mdi:delete-forever" className={styles.actionIcon} />
                                </button>
                              </>
                            ) : null
                          ) : (
                            <>
                              <button
                                className={styles.actionBtn}
                                onClick={() => startEdit(doc)}
                                title="Éditer le document"
                              >
                                <Icon icon="mdi:pencil" className={styles.actionIcon} />
                              </button>
                              <button className={`${styles.actionBtn} ${styles.warningBtn}`} onClick={() => handleDeleteClick(doc)} title="Mettre à la corbeille">
                                <Icon icon="mdi:delete" className={styles.actionIcon} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className={styles.paginationBar}>
                <div className={styles.pageInfo}>
                  {totalItems > 0 && (
                    <span>
                      {startIndex + 1}-{endIndex} sur {totalItems}
                    </span>
                  )}
                </div>
                <div className={styles.pageControls}>
                  <button
                    className={styles.pageBtn}
                    disabled={currentPage === 1}
                    onClick={() => setPage(1)}
                    title="Première page"
                  >«</button>
                  <button
                    className={styles.pageBtn}
                    disabled={currentPage === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    title="Précédent"
                  >‹</button>
                  <span className={styles.pageCurrent}>
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    className={styles.pageBtn}
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    title="Suivant"
                  >›</button>
                  <button
                    className={styles.pageBtn}
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(totalPages)}
                    title="Dernière page"
                  >»</button>
                </div>
              </div>
            </div>
          )}
          </div>
          </div>
        )}
      </div>

      {/* Modal édition document */}
      {showEditModal && editDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
          }}
          onClick={cancelEdit}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 480,
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Éditer le document</h3>
              <button className={styles.actionBtn} onClick={cancelEdit} title="Fermer">
                <Icon icon="mdi:close" className={styles.actionIcon} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.9rem' }}>Nom du document</label>
              <input
                className={styles.editInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                className={styles.actionBtn}
                onClick={cancelEdit}
                title="Annuler"
              >
                <Icon icon="mdi:close" className={styles.actionIcon} />
              </button>
              <button
                className={styles.actionBtn}
                onClick={saveEdit}
                title="Enregistrer"
                style={{ background: '#15D1A0', borderColor: '#15D1A0', color: '#ffffff' }}
              >
                <Icon icon="mdi:check" className={styles.actionIcon} />
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        title={"Mettre à la corbeille"}
        message={`Voulez-vous déplacer le document "${documentToDelete?.name}" vers la corbeille ?`}
        confirmLabel="Oui, déplacer"
        cancelLabel="Non, annuler"
        confirmColor="danger"
      />
    </div>
  );
}
