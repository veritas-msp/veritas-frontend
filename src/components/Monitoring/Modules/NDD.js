import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import { FaSync, FaGlobe } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import { toast } from "react-toastify";
import styles from "./NDD.module.css";
import commonStyles from "./ModuleCommon.module.css";
import API_BASE_URL from "../../../config";

// Options par défaut pour les toasts (bas à droite)
const toastOptions = { position: "bottom-right", autoClose: 3000 };

const NDD = ({ config, setConfig, data, setData, onSyncAllCheckMKReady }) => {
  const { theme } = useTheme();
  const currentClientId = config?.client?.id;
  
  // Filtrer les domaines pour ne garder que ceux du client actuel
  // et charger depuis la base de données
  const [domainesFromDb, setDomainesFromDb] = useState([]);
  const [loadingSync, setLoadingSync] = useState({});
  const syncAllOvhRef = useRef(null);
  const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);
  const lastNotifiedRef = useRef({ domainesLength: 0, isLoading: false });

  // Charger les noms de domaine depuis la base (v_b_clients_m_ndd) au montage
  useEffect(() => {
    if (!currentClientId || !setConfig) return;
    const controller = new AbortController();

    const loadNDDFromDb = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clients/modules/${currentClientId}/ndd`, {
          credentials: "include",
          signal: controller.signal
        });
        if (!res.ok) {
          console.warn(`Erreur lors du chargement des domaines: ${res.status}`);
          setDomainesFromDb([]);
          return;
        }
        const rows = await res.json();
        const nddList = (rows || []).map((row) => {
          const { id: dataId, ...dataWithoutId } = row.data || {};
          return {
            id: row.id,
            ...dataWithoutId,
            nom: row.data?.nom || row.name || row.item_key || "",
            __fromDb: true
          };
        });

        // Filtrer pour s'assurer que seuls les domaines du client actuel sont inclus
        // (double vérification au cas où l'API retournerait des données incorrectes)
        const filteredNddList = nddList.filter(ndd => {
          // Si les données contiennent un client_id, vérifier qu'il correspond
          if (ndd.client_id !== undefined && ndd.client_id !== null) {
            return String(ndd.client_id) === String(currentClientId);
          }
          // Sinon, on fait confiance à l'API qui a déjà filtré
          return true;
        });

        setDomainesFromDb(filteredNddList);

        setConfig((prev) => {
          if (!prev?.client) return prev;
          return {
            ...prev,
            client: {
              ...prev.client,
              equipements: {
                ...(prev.client.equipements || {}),
                NDD: filteredNddList
              }
            }
          };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Erreur chargement noms de domaine:", err);
        setDomainesFromDb([]);
      }
    };

    loadNDDFromDb();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClientId]);

  // Utiliser les domaines chargés depuis la DB plutôt que ceux de config
  // pour éviter les problèmes de données mélangées entre clients
  const domaines = domainesFromDb.length > 0 ? domainesFromDb : (config?.client?.equipements?.NDD || []);

  // Fonction pour générer une couleur basée sur le rôle du domaine
  const getRoleColor = (role) => {
    if (!role) return { bg: "#9ca3af", text: "#ffffff" };
    
    const roleColors = {
      // Domaines principaux
      "principal": { bg: "#3b82f6", text: "#ffffff" },
      "primaire": { bg: "#3b82f6", text: "#ffffff" },
      "main": { bg: "#3b82f6", text: "#ffffff" },
      
      // Domaines de redirection
      "redirection": { bg: "#10b981", text: "#ffffff" },
      "redirect": { bg: "#10b981", text: "#ffffff" },
      "alias": { bg: "#10b981", text: "#ffffff" },
      
      // Domaines de test
      "test": { bg: "#f59e0b", text: "#ffffff" },
      "staging": { bg: "#f59e0b", text: "#ffffff" },
      "dev": { bg: "#f59e0b", text: "#ffffff" },
      
      // Domaines de sauvegarde
      "backup": { bg: "#8b5cf6", text: "#ffffff" },
      "sauvegarde": { bg: "#8b5cf6", text: "#ffffff" },
      "mirror": { bg: "#8b5cf6", text: "#ffffff" },
      
      // Domaines de marketing
      "marketing": { bg: "#ec4899", text: "#ffffff" },
      "promo": { bg: "#ec4899", text: "#ffffff" },
      "campaign": { bg: "#ec4899", text: "#ffffff" },
      
      // Domaines d'API
      "api": { bg: "#06b6d4", text: "#ffffff" },
      "rest": { bg: "#06b6d4", text: "#ffffff" },
      "service": { bg: "#06b6d4", text: "#ffffff" },
      
      // Domaines d'administration
      "admin": { bg: "#f97316", text: "#ffffff" },
      "management": { bg: "#f97316", text: "#ffffff" },
      "control": { bg: "#f97316", text: "#ffffff" },
      
      // Domaines de monitoring
      "monitoring": { bg: "#84cc16", text: "#ffffff" },
      "monitor": { bg: "#84cc16", text: "#ffffff" },
      "stats": { bg: "#84cc16", text: "#ffffff" },
      
      // Domaines de sécurité
      "security": { bg: "#ef4444", text: "#ffffff" },
      "securite": { bg: "#ef4444", text: "#ffffff" },
      "ssl": { bg: "#ef4444", text: "#ffffff" },
    };
    
    const roleLower = role.toLowerCase();
    
    // Recherche exacte d'abord
    if (roleColors[roleLower]) {
      return roleColors[roleLower];
    }
    
    // Recherche par mot-clé
    for (const [key, color] of Object.entries(roleColors)) {
      if (roleLower.includes(key)) {
        return color;
      }
    }
    
    // Couleur par défaut basée sur le hash du rôle
    const hash = role.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      { bg: "#3b82f6", text: "#ffffff" }, // bleu
      { bg: "#10b981", text: "#ffffff" }, // vert
      { bg: "#f59e0b", text: "#ffffff" }, // orange
      { bg: "#8b5cf6", text: "#ffffff" }, // violet
      { bg: "#ec4899", text: "#ffffff" }, // rose
      { bg: "#06b6d4", text: "#ffffff" }, // cyan
      { bg: "#f97316", text: "#ffffff" }, // orange foncé
      { bg: "#84cc16", text: "#ffffff" }, // vert lime
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const now = new Date();
    const expiration = new Date(dateStr);
    const inThreeMonths = new Date();
    inThreeMonths.setMonth(now.getMonth() + 3);
    return expiration < inThreeMonths;
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const now = new Date();
    const expiration = new Date(dateStr);
    return expiration < now;
  };

  const getDomainStatus = (domaine) => {
    if (isExpired(domaine.expiration)) return "critical";
    if (isExpiringSoon(domaine.expiration)) return "warning";
    return "good";
  };

  const getDomainInfo = (domaine) => {
    const info = [];
    if (domaine.expiration) {
      info.push(`Expire le ${domaine.expiration}`);
      const daysUntilExpiration = Math.ceil((new Date(domaine.expiration) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiration > 0) {
        info.push(`${daysUntilExpiration} jours restants`);
      } else if (daysUntilExpiration < 0) {
        info.push(`Expiré depuis ${Math.abs(daysUntilExpiration)} jours`);
      } else {
        info.push("Expire aujourd'hui");
      }
    }
    return info.join(" • ");
  };

  // Fonction pour gérer les changements de commentaires
  const handleCommentChange = (domaineNom, comment) => {
    if (setData && typeof setData === 'function') {
      const updated = {
        ...data,
        [domaineNom]: {
          ...(data?.[domaineNom] || {}),
          comment: comment
        }
      };
      setData(updated);
    } else {
      console.warn('setData function is not available');
    }
  };


  // Fonction pour synchroniser un domaine individuel avec OVH
  const syncDomainExpiration = useCallback(async (domaineNom) => {
    setLoadingSync(prev => ({ ...prev, [domaineNom]: true }));
    
    try {
      const response = await fetch(`${API_BASE_URL}/ovh/domain/${encodeURIComponent(domaineNom)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Ne pas afficher de notification individuelle lors de la synchronisation globale
        return;
      }

      const result = await response.json();
      
      if (result.success && result.domain) {
        // Mettre à jour la date d'expiration dans la config si disponible
        if (result.domain.expiration) {
          setData(prev => ({
            ...prev,
            [domaineNom]: {
              ...(prev?.[domaineNom] || {}),
              expiration: result.domain.expiration
            }
          }));
        }
        // Ne pas afficher de notification individuelle lors de la synchronisation globale
      } else {
        // Ne pas afficher de notification individuelle
      }
    } catch (err) {
      console.error('Erreur synchronisation domaine OVH:', err);
      // Ne pas afficher de notification individuelle
    } finally {
      setLoadingSync(prev => ({ ...prev, [domaineNom]: false }));
    }
  }, [setData]);

  // Fonction pour synchroniser tous les domaines avec OVH
  const syncAllOvh = useCallback(async () => {
    if (domaines.length === 0) {
      toast.warning('Aucun domaine à synchroniser', toastOptions);
      return;
    }
    
    const syncPromises = domaines.map(domaine => 
      syncDomainExpiration(domaine.nom)
    );
    
    try {
      await Promise.all(syncPromises);
      toast.success(`Synchronisation terminée`, toastOptions);
    } catch (error) {
      toast.error(`Erreur lors de la synchronisation`, toastOptions);
    }
  }, [domaines, syncDomainExpiration]);

  // Mettre à jour la ref de syncAllOvh
  useEffect(() => {
    syncAllOvhRef.current = syncAllOvh;
  }, [syncAllOvh]);

  // Mettre à jour la ref de onSyncAllCheckMKReady
  useEffect(() => {
    onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
  }, [onSyncAllCheckMKReady]);

  // État dérivé pour l'état de chargement global
  const isLoading = Object.values(loadingSync).some(loading => loading);

  // Exposer la fonction syncAllOvh au parent
  useEffect(() => {
    // S'assurer que les refs sont à jour
    if (onSyncAllCheckMKReadyRef.current) {
      const syncFunction = syncAllOvhRef.current;
      if (syncFunction) {
        const currentDomainesLength = (domaines || []).length;

        // Éviter les notifications inutiles si rien n'a changé
        const lastNotified = lastNotifiedRef.current;
        if (
          lastNotified.domainesLength === currentDomainesLength &&
          lastNotified.isLoading === isLoading
        ) {
          return; // Pas de changement, ne pas notifier
        }

        // Notifier uniquement si quelque chose a changé
        onSyncAllCheckMKReadyRef.current({
          syncAllCheckMK: syncFunction,
          hasCheckMKMappings: currentDomainesLength > 0,
          isLoading: isLoading
        });

        // Mettre à jour la ref
        lastNotifiedRef.current = {
          domainesLength: currentDomainesLength,
          isLoading: isLoading
        };
      }
    }
  }, [domaines?.length, isLoading]); // Dépendre de la longueur et de l'état de chargement

  const expirationGroups = useMemo(() => {
    if (!domaines || domaines.length === 0) {
      return [];
    }

    const groups = {
      expired: [],
      less7: [],
      less30: [],
      less365: [],
      more365: [],
      unknown: []
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMs = 1000 * 60 * 60 * 24;

    domaines.forEach((domaine) => {
      if (!domaine?.expiration) {
        groups.unknown.push(domaine);
        return;
      }

      const expirationDate = new Date(domaine.expiration);
      if (Number.isNaN(expirationDate.getTime())) {
        groups.unknown.push(domaine);
        return;
      }

      const diffDays = Math.ceil((expirationDate - startOfToday) / dayMs);

      if (diffDays < 0) {
        groups.expired.push(domaine);
      } else if (diffDays <= 7) {
        groups.less7.push(domaine);
      } else if (diffDays <= 30) {
        groups.less30.push(domaine);
      } else if (diffDays <= 365) {
        groups.less365.push(domaine);
      } else {
        groups.more365.push(domaine);
      }
    });

    const sortByExpiration = (list) =>
      list.slice().sort((a, b) => {
        const aTime = a?.expiration ? new Date(a.expiration).getTime() : Infinity;
        const bTime = b?.expiration ? new Date(b.expiration).getTime() : Infinity;

        if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
          return (a?.nom || "").localeCompare(b?.nom || "");
        }
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;

        return aTime - bTime;
      });

    const sections = [
      { key: "expired", label: "Expirés" },
      { key: "less7", label: "Dans moins de 7 jours" },
      { key: "less30", label: "Dans moins d'un mois" },
      { key: "less365", label: "Dans moins d'un an" },
      { key: "more365", label: "Dans plus d'un an" },
      { key: "unknown", label: "Sans date d'expiration" }
    ];

    return sections
      .map((section) => ({
        ...section,
        domaines:
          section.key === "unknown"
            ? groups[section.key].slice().sort((a, b) => (a?.nom || "").localeCompare(b?.nom || ""))
            : sortByExpiration(groups[section.key])
      }))
      .filter((section) => section.domaines.length > 0);
  }, [domaines]);

  if (domaines.length === 0) {
    return (
      <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>Aucun nom de domaine configuré pour ce client.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      {expirationGroups.map((group) => (
        <div key={group.key} className={styles.sectionGroup} id={`expiration-${group.key}`}>
          <div className={styles.sectionSeparator}>
            <h2 className={styles.sectionTitle}>
              {group.label}
              <span className={styles.sectionCount}>
                {group.domaines.length} domaine{group.domaines.length > 1 ? "s" : ""}
              </span>
            </h2>
          </div>
          <div className={styles.nddGrid}>
        {group.domaines.map((domaine, index) => {
          // Utiliser la date d'expiration depuis data si disponible, sinon depuis la config
          const domaineWithUpdatedExpiration = {
            ...domaine,
            expiration: data?.[domaine.nom]?.expiration || domaine.expiration
          };
          const status = getDomainStatus(domaineWithUpdatedExpiration);
          const domainInfo = getDomainInfo(domaineWithUpdatedExpiration);
          const roleColor = getRoleColor(domaine.role);
          // Un domaine a besoin d'attention s'il n'a pas de date d'expiration (ni dans data ni dans la config) et qu'il n'est pas en cours de chargement
          const hasExpiration = !!(data?.[domaine.nom]?.expiration || domaine.expiration);
          const needsSyncAttention = !hasExpiration && !loadingSync[domaine.nom];
          
          return (
            <div
              key={index}
              className={styles.nddCard}
              style={{
                opacity: loadingSync[domaine.nom] ? 0.6 : 1,
                position: 'relative'
              }}
            >
              {loadingSync[domaine.nom] && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  zIndex: 10,
                  background: 'var(--bg-primary)',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}>
                  <FaSync style={{ 
                    animation: 'spin 1s linear infinite',
                    fontSize: '0.75rem'
                  }} />
                  Synchronisation...
                </div>
              )}
              <div className={styles.cardHeader}>
                <div className={styles.headerLeft}>
                  <div className={styles.nddInfo}>
                    <h3 className={styles.nddName}>
                      <span className={styles.nddNameSection}>
                        <span style={{ marginRight: '0.5rem' }}>
                          <FaGlobe style={{
                            fontSize: '1.75rem',
                            color: theme === 'dark' ? '#d1d5db' : '#000000',
                            verticalAlign: 'middle',
                            display: 'inline-block'
                          }} />
                        </span>
                        <span className={styles.nddNameText}>
                          {domaine.nom}
                        </span>
                      </span>
                      {domainInfo && (
                        <span className={styles.connectionMeta}>
                          {domainInfo}
                        </span>
                      )}
                    </h3>
                  </div>
                </div>
                <div className={styles.headerRight} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Bouton Commentaire */}
                  {/* Bouton SYNC */}
                  <button
                    type="button"
                    className={`${commonStyles.syncButton} ${needsSyncAttention ? commonStyles.syncButtonAttention : ''}`}
                    onClick={() => syncDomainExpiration(domaine.nom)}
                    title="Synchroniser la date d'expiration depuis OVH"
                    disabled={loadingSync[domaine.nom]}
                  >
                    <IconifyIcon
                      icon="material-symbols:sync"
                      width={14}
                      height={14}
                      className={loadingSync[domaine.nom] ? styles.loadingIcon : ''}
                    />
                  </button>
                  {/* Bouton GLPI */}
                  <div style={{ flex: '0 0 auto' }}>
                    
                  </div>
                </div>
              </div>

              {/* Zone de commentaire - toujours visible */}
              <textarea
                id={`comment-${domaine.nom}`}
                className={styles.commentTextarea}
                value={data?.[domaine.nom]?.comment || ""}
                onChange={(e) => handleCommentChange(domaine.nom, e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Commentaire..."
                disabled={!setData}
                rows="2"
              />
            </div>
          );
        })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NDD;
