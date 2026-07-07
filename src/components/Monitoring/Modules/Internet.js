import React from "react";
import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  mdiRouterWireless,
  mdiNetwork,
  mdiWifi,
  mdiEthernetCable
} from "@mdi/js";
import styles from "./Internet.module.css";
import API_BASE_URL from "../../../config";

// Options par défaut pour les toasts (bas à droite)
const toastOptions = { position: "bottom-right", autoClose: 3000 };

const Internet = ({ config, setConfig, data, setData }) => {
  const connexions = config?.client?.equipements?.Internet || [];
  const [editingConnection, setEditingConnection] = React.useState(null);
  const [editForm, setEditForm] = React.useState(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Options de type de connexion
  const connectionTypes = [
    "Fibre",
    "ADSL",
    "4G",
    "5G",
    "Satellite"
  ];

  const debitOptions = [
    "10 Mbps", "25 Mbps", "50 Mbps", "100 Mbps", "200 Mbps", "500 Mbps",
    "1 Gbps", "2 Gbps", "5 Gbps", "10 Gbps", "25 Gbps", "50 Gbps", "100 Gbps"
  ];

  // Charger les connexions Internet depuis la base (v_b_clients_m_internet) au montage
  React.useEffect(() => {
    if (!config?.client?.id || !setConfig) return;
    const controller = new AbortController();

    const loadInternetFromDb = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/internet`, {
          credentials: "include",
          signal: controller.signal
        });
        if (!res.ok) return;
        const rows = await res.json();
        const internetList = (rows || []).map((row) => {
          const { id: dataId, ...dataWithoutId } = row.data || {};
          return {
            id: row.id, // ID de la table pour PUT
            ...dataWithoutId,
            nom: row.data?.nom || row.name || row.item_key || "",
            __fromDb: true
          };
        });

        setConfig((prev) => {
          if (!prev?.client) return prev;
          return {
            ...prev,
            client: {
              ...prev.client,
              equipements: {
                ...(prev.client.equipements || {}),
                Internet: internetList
              }
            }
          };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Erreur chargement connexions Internet:", err);
      }
    };

    loadInternetFromDb();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.client?.id]);


  // Fonction simplifiée pour sauvegarder une connexion
  const saveConnection = async (connectionId, connectionData) => {
    const clientId = config?.client?.id;
    if (!clientId) {
      throw new Error("ID client manquant");
    }

    // Préparer les données pour la base (sans les métadonnées internes)
    const { id, __fromDb, __index, ...dataForDb } = connectionData;

    const body = {
      item_key: connectionData.nom || connectionData.fournisseur || `internet-${connectionId}`,
      name: connectionData.nom || connectionData.fournisseur || `Connexion Internet`,
      data: dataForDb,
      is_active: true
    };

    // PUT si on a un ID, POST sinon
    const method = connectionId ? "PUT" : "POST";
    const url = connectionId
      ? `${API_BASE_URL}/clients/modules/${clientId}/internet/${connectionId}`
      : `${API_BASE_URL}/clients/modules/${clientId}/internet`;

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Erreur lors de la sauvegarde (${res.status})`);
    }

    const savedRow = await res.json();
    return savedRow;
  };


  // Fonction pour obtenir l'icône en fonction du type de connexion
  const getConnectionIcon = (connexion) => {
    const type = (connexion?.type || "").toLowerCase();
    const nom = (connexion?.nom || "").toLowerCase();
    const combined = `${type} ${nom}`;

    const commonStyle = {
      color: "#000000",
      verticalAlign: "middle",
      display: "inline-block"
    };

    if (type.includes("fibre") || type.includes("fiber") || combined.includes("fibre") || combined.includes("fiber")) {
      return (
        <IconifyIcon
          icon="streamline-ultimate:fiber-access-1"
          width={28}
          height={28}
          style={commonStyle}
        />
      );
    }

    if (type.includes("5g") || combined.includes("5g")) {
      return (
        <IconifyIcon
          icon="material-symbols:5g-mobiledata-badge"
          width={28}
          height={28}
          style={commonStyle}
        />
      );
    }

    if (type.includes("4g") || combined.includes("4g") || type.includes("lte") || combined.includes("lte")) {
      return (
        <IconifyIcon
          icon="material-symbols:4g-mobiledata-badge"
          width={28}
          height={28}
          style={commonStyle}
        />
      );
    }

    if (type.includes("adsl") || combined.includes("adsl") || type.includes("dsl") || combined.includes("dsl")) {
      return (
        <Icon
          path={mdiEthernetCable}
          size="1.75rem"
          style={commonStyle}
        />
      );
    }

    if (type.includes("satellite") || combined.includes("satellite")) {
      return (
        <IconifyIcon
          icon="tabler:satellite"
          width={28}
          height={28}
          style={commonStyle}
        />
      );
    }

    if (type.includes("wifi") || combined.includes("wifi") || type.includes("wireless") || combined.includes("wireless")) {
      return <Icon path={mdiWifi} size="1.75rem" style={commonStyle} />;
    }

    if (type.includes("ethernet") || combined.includes("ethernet") || type.includes("cable") || combined.includes("cable")) {
      return <Icon path={mdiNetwork} size="1.75rem" style={commonStyle} />;
    }

    return <Icon path={mdiRouterWireless} size="1.75rem" style={commonStyle} />;
  };

  const getConnectionInfo = (connexion) => {
    const info = [];
    if (connexion.ip) {
      info.push(`IP : ${connexion.ip}`);
    }
    if (connexion.debit) {
      info.push(connexion.debit);
    }
    if (connexion.categorie) {
      const raw = String(connexion.categorie).toLowerCase();
      const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
      info.push(capitalized);
    }
    return info.join(" • ");
  };

  // Fonction pour générer une clé unique et STABLE pour une connexion
  const getConnectionKey = (connexion) => {
    // Utiliser l'ID de la table en priorité
    if (connexion.id != null) {
      return `internet-${connexion.id}`;
    }
    // Fallback sur un hash des infos
    const parts = [
      connexion.nom || "",
      connexion.fournisseur || "",
      connexion.ip || "",
      connexion.type || "",
      connexion.site || ""
    ];
    return parts.filter(Boolean).join("|");
  };

  // Fonction pour gérer les changements de commentaires
  const handleCommentChange = (connectionKey, comment) => {
    if (setData && typeof setData === 'function') {
      const updated = {
        ...data,
        [connectionKey]: {
          ...(data?.[connectionKey] || {}),
          comment: comment
        }
      };
      setData(updated);
    } else {
      console.warn('setData function is not available');
    }
  };

  // Fonction pour gérer la sauvegarde après édition
  const handleSave = async () => {
    if (!editingConnection || !editForm) return;

    setIsSaving(true);
    try {
      // Préparer les données de la connexion mise à jour
      const updatedConnection = {
        ...editingConnection,
        fournisseur: editForm.fournisseur,
        site: editForm.site || '',
        type: editForm.type,
        debit: editForm.debit,
        ip: editForm.ip,
        ipNonFixe: Boolean(editForm.ipNonFixe),
        categorie: editForm.categorie
      };

      // Sauvegarder dans v_b_clients_m_internet
      const savedRow = await saveConnection(editingConnection.id, updatedConnection);

      // Mettre à jour la config locale avec la réponse de l'API
      setConfig((prev) => {
        if (!prev?.client?.equipements?.Internet) return prev;
        
        const updatedList = prev.client.equipements.Internet.map((conn) => {
          // Utiliser l'ID pour trouver la bonne connexion
          if (conn.id === editingConnection.id) {
            // Reconstruire depuis la réponse de l'API
            const { id: dataId, ...dataWithoutId } = savedRow.data || {};
            return {
              id: savedRow.id,
              ...dataWithoutId,
              nom: savedRow.data?.nom || savedRow.name || savedRow.item_key || "",
              __fromDb: true
            };
          }
          return conn;
        });

        return {
          ...prev,
          client: {
            ...prev.client,
            equipements: {
              ...prev.client.equipements,
              Internet: updatedList
            }
          }
        };
      });

      toast.success("Connexion Internet mise à jour", toastOptions);
      setEditingConnection(null);
      setEditForm(null);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde", toastOptions);
    } finally {
      setIsSaving(false);
    }
  };

  if (connexions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Aucune connexion Internet configurée pour ce client.</p>
        </div>
      </div>
    );
  }

  // Grouper les connexions par site
  const groupedBySite = connexions.reduce((acc, connexion) => {
    const siteName = connexion.site || "Sans site";
    if (!acc[siteName]) {
      acc[siteName] = [];
    }
    acc[siteName].push(connexion);
    return acc;
  }, {});

  // Trier les sites (Sans site en dernier)
  const sortedSites = Object.keys(groupedBySite).sort((a, b) => {
    if (a === "Sans site") return 1;
    if (b === "Sans site") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className={styles.container}>
      {sortedSites.map((siteName) => {
        const siteConnexions = groupedBySite[siteName];
        const connexionCount = siteConnexions.length;
        
        return (
          <div
            key={siteName}
            className={styles.siteGroup}
            id={`site-${siteName}`}
            data-site-label={siteName}
          >
            <div className={styles.siteSeparator}>
              <h2 className={styles.siteTitle}>
                <IconifyIcon
                  icon="mingcute:building-4-fill"
                  width={24}
                  height={24}
                  style={{ 
                    marginRight: '0.75rem',
                    flexShrink: 0,
                    color: '#4b5563'
                  }}
                />
                <span>{siteName}</span>
                {connexionCount > 0 && (
                  <span className={styles.siteCount}>
                    {connexionCount} connexion{connexionCount > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
            </div>
            <div className={styles.internetGrid}>
              {siteConnexions.map((connexion) => {
                const connectionInfo = getConnectionInfo(connexion);
                const connectionKey = getConnectionKey(connexion);

                return (
                  <div
                    key={connectionKey}
                    className={styles.internetCard}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.headerLeft}>
                        <div className={styles.internetInfo}>
                          <h3 className={styles.internetName}>
                            <span className={styles.internetNameSection}>
                              <span style={{ marginRight: '0.5rem' }}>
                                {getConnectionIcon(connexion)}
                              </span>
                              <span className={styles.internetNameText}>
                                {connexion.fournisseur || connexion.nom}
                              </span>
                              {connexion.type && (
                                <span 
                                  className={styles.typeLabel}
                                  style={{ 
                                    backgroundColor: "var(--bg-tertiary)", 
                                    color: "var(--text-primary)",
                                    marginLeft: "0.75rem"
                                  }}
                                >
                                  {connexion.type}
                                </span>
                              )}
                            </span>
                            {connectionInfo && (
                              <span className={styles.connectionMeta}>
                                {connectionInfo}
                              </span>
                            )}
                          </h3>
                        </div>
                      </div>
                      <div className={styles.internetType} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        
                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => {
                            setEditingConnection(connexion);
                            setEditForm({
                              nom: connexion.nom || '',
                              fournisseur: connexion.fournisseur || '',
                              site: connexion.site || '',
                              type: connexion.type || '',
                              debit: connexion.debit || '',
                              ip: connexion.ip || '',
                              ipNonFixe: Boolean(connexion.ipNonFixe),
                              categorie: connexion.categorie || 'Principale'
                            });
                          }}
                          title="Éditer la connexion"
                        >
                          <IconifyIcon
                            icon="material-symbols:edit"
                            width={14}
                            height={14}
                          />
                        </button>
                      </div>
                    </div>

                    <textarea
                      id={`comment-${connectionKey}`}
                      className={styles.commentTextarea}
                      value={data?.[connectionKey]?.comment || ""}
                      onChange={(e) => handleCommentChange(connectionKey, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Commentaire..."
                      rows="2"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Modal d'édition simplifiée */}
      {editingConnection && editForm && (
        <div className={styles.editModalOverlay}>
          <div
            className={styles.editModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.editModalHeader}>
              <h3 className={styles.editModalTitle}>
                <IconifyIcon
                  icon="material-symbols:edit"
                  width={18}
                  height={18}
                  style={{ color: '#6b7280' }}
                />
                Éditer la connexion internet
              </h3>
              <button
                type="button"
                className={styles.editModalCloseButton}
                onClick={() => {
                  setEditingConnection(null);
                  setEditForm(null);
                }}
                title="Fermer"
                disabled={isSaving}
              >
                <IconifyIcon
                  icon="material-symbols:cancel-rounded"
                  width={20}
                  height={20}
                />
              </button>
            </div>

            <div className={styles.editModalBody}>
              {isSaving ? (
                <div className={styles.editModalLoading}>
                  <IconifyIcon
                    icon="svg-spinners:3-dots-fade"
                    width={48}
                    height={48}
                    style={{ color: '#6b7280' }}
                  />
                </div>
              ) : (
                <div className={styles.editModalForm}>
                  {/* Ligne 1 : Fournisseur + Catégorie */}
                  <div className={styles.editModalFormRow}>
                    <label className={styles.editModalLabel}>
                      Fournisseur
                      <input
                        type="text"
                        className={styles.editModalInput}
                        value={editForm.fournisseur}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            fournisseur: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label className={styles.editModalLabel}>
                      Catégorie
                      <select
                        className={styles.editModalSelect}
                        value={editForm.categorie}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            categorie: e.target.value
                          }))
                        }
                      >
                        <option value="Principale">Principale</option>
                        <option value="Backup">Backup</option>
                      </select>
                    </label>
                  </div>

                  {/* Ligne 2 : Site */}
                  <label className={styles.editModalLabel}>
                    Site
                    <select
                      className={styles.editModalSelect}
                      value={editForm.site || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, site: e.target.value }))
                      }
                    >
                      <option value="">Sans site</option>
                      {(() => {
                        // Récupérer tous les sites uniques depuis les équipements
                        const allSites = new Set();
                        if (config?.client?.equipements) {
                          Object.values(config.client.equipements).forEach(equipmentList => {
                            if (Array.isArray(equipmentList)) {
                              equipmentList.forEach(equipment => {
                                if (equipment.site && equipment.site !== "Sans site") {
                                  allSites.add(equipment.site);
                                }
                              });
                            }
                          });
                        }
                        return Array.from(allSites).sort().map((site) => (
                          <option key={site} value={site}>
                            {site}
                          </option>
                        ));
                      })()}
                    </select>
                  </label>

                  {/* Ligne 3 : Type de connexion + Débit */}
                  <div className={styles.editModalFormRow}>
                    <label className={styles.editModalLabel}>
                      Type de connexion
                      <input
                        type="text"
                        className={styles.editModalInput}
                        value={editForm.type || ""}
                        disabled
                        style={{ 
                          backgroundColor: '#f3f4f6',
                          cursor: 'not-allowed',
                          color: '#6b7280'
                        }}
                      />
                    </label>

                    <label className={styles.editModalLabel}>
                      Débit
                      <select
                        className={styles.editModalSelect}
                        value={editForm.debit || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            debit: e.target.value
                          }))
                        }
                      >
                        <option value="">Sélectionner un débit</option>
                        {debitOptions.map((debit) => (
                          <option key={debit} value={debit}>
                            {debit}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className={styles.editModalLabel}>
                    IP publique
                    <div className={styles.editModalIpRow}>
                      <input
                        type="text"
                        className={styles.editModalIpInput}
                        value={editForm.ip}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, ip: e.target.value }))
                        }
                        placeholder="192.168.1.1"
                        disabled={editForm.ipNonFixe}
                      />
                      <button
                        type="button"
                        className={`${styles.editModalIpToggle} ${editForm.ipNonFixe ? styles.active : ''}`}
                        onClick={() => {
                          setEditForm((prev) => {
                            const newValue = !prev.ipNonFixe;
                            return {
                              ...prev,
                              ipNonFixe: newValue,
                              ip: newValue ? "Non fixe" : ""
                            };
                          });
                        }}
                      >
                        IP non fixe
                      </button>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {!isSaving && (
              <div className={styles.editModalFooter}>
                <button
                  type="button"
                  className={styles.editModalSaveButton}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <IconifyIcon
                    icon="material-symbols:save"
                    width={18}
                    height={18}
                  />
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Internet;
