// 📦 Librairies externes
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Icon } from "@iconify/react";

// 🎨 Style CSS
import styles from "./MonitoringSummary.module.css";

// 🔔 Notifications
import { showError, showSuccess } from "../../../utils/toast";
import { useMonitoringContext } from "../../../contexts/MonitoringContext";
import { useTheme } from "../../../hooks/useTheme";
import API_BASE_URL from "../../../config";
import { getLogoPath } from "../../../utils/assetHelper";
import { safeJsonClone } from "../../../utils/safeJson";

// 🧩 Composants overrides (un par type de module)
import ServeursSummary from "../MonitoringSummaryOverrides/ServeursSummary";
import SauvegardeSummary from "../MonitoringSummaryOverrides/SauvegardeSummary";
import StockageSummary from "../MonitoringSummaryOverrides/StockageSummary";
import StockageTopology from "../MonitoringSummaryOverrides/StockageTopology";
import FirewallsSummary from "../MonitoringSummaryOverrides/FirewallsSummary";
import FirewallReglesSummary from "../MonitoringSummaryOverrides/FirewallReglesSummary";
import AntivirusSummary from "../MonitoringSummaryOverrides/AntivirusSummary";
import AntispamSummary from "../MonitoringSummaryOverrides/AntispamSummary";
import O365Summary from "../MonitoringSummaryOverrides/O365Summary";
import NDDSummary from "../MonitoringSummaryOverrides/NDDSummary";
import InfrastructureTopology from "../MonitoringSummaryOverrides/InfrastructureTopology";
import ServersTopology from "../MonitoringSummaryOverrides/ServersTopology";
import ServersSummaryCards from "../MonitoringSummaryOverrides/ServersSummaryCards";
import SwitchesTopology from "../MonitoringSummaryOverrides/SwitchesTopology";
import SwitchesSummaryCards from "../MonitoringSummaryOverrides/SwitchesSummaryCards";
import WifiTopology from "../MonitoringSummaryOverrides/WifiTopology";
import WifiSummaryCards from "../MonitoringSummaryOverrides/WifiSummaryCards";

import { saveMonitoringDocument, fetchMonitoringDocuments, deleteMonitoringDocument } from "../../../api/monitoringDocuments";
import { toast } from "react-toastify";

// 📖 Utilitaires et constantes
import { exportMonitoringAsHTML, exportMonitoringAsZIP, generateZIPBlob } from "./exportMonitoringUtils";
import { uploadReportArchiveToClientVault } from "../../../utils/uploadReportToClientVault";
import ReportSaveVisibilitySwitch from "../../shared/ReportSaveVisibilitySwitch";
import {
  REPORT_OPTIONS,
  fallbackModulesByReport,
  reportTitleMap,
  reportDescriptionMap,
  reportSubtitleMap,
} from "./monitoringConstants";
import {
  getModuleIcon,
  formatModuleLabel,
  getModuleCategory,
  normalizeModuleName,
  getModuleId,
} from "./monitoringUtils";

// 🎨 Composants de titres animés
import InternetTitle from "./TitleComponents/InternetTitle";
import FirewallTitle from "./TitleComponents/FirewallTitle";
import ServerTitle from "./TitleComponents/ServerTitle";
import StorageTitle from "./TitleComponents/StorageTitle";
import SwitchTitle from "./TitleComponents/SwitchTitle";
import WifiTitle from "./TitleComponents/WifiTitle";
import AntivirusTitle from "./TitleComponents/AntivirusTitle";
import AntispamTitle from "./TitleComponents/AntispamTitle";
import FirewallReglesTitle from "./TitleComponents/FirewallReglesTitle";
import SauvegardeTitle from "./TitleComponents/SauvegardeTitle";
import Office365Title from "./TitleComponents/Office365Title";
import NDDTitle from "./TitleComponents/NDDTitle";

function MonitoringSummary({ config, data, onBack, resetFormData, onActionsReady = null }) {
  const { theme } = useTheme();
  const { setMonitoringConfig } = useMonitoringContext();
  const [previewUrl, setPreviewUrl] = useState(null);
  const summaryRef = useRef(null);
  const [showInfos, setShowInfos] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendStatus, setSendStatus] = useState("");
  const { resetComplet } = useMonitoringContext();
  const hasSavedRef = useRef(false);
  const [selectedReport, setSelectedReport] = useState("infrastructure"); // Rapport sélectionné
  const [selectedModule, setSelectedModule] = useState('internet'); // Module actuellement sélectionné (pour filtres/sites)
  const [selectedSites, setSelectedSites] = useState([]); // Sites actuellement sélectionnés (tableau)
  const [sites, setSites] = useState([]); // Liste des sites disponibles
  const [visibleSections, setVisibleSections] = useState(new Set()); // Sections visibles pour animations
  const sectionRefs = useRef({}); // Références aux sections pour Intersection Observer

  // Charger tous les équipements depuis la base au montage du summary
  useEffect(() => {
    if (!config?.client?.id || !setMonitoringConfig) return;
    const controller = new AbortController();

    const loadAllEquipements = async () => {
      try {
        const clientId = config.client.id;
        const equipementsToLoad = [
          { family: 'servers', key: 'Serveurs' },
          { family: 'stockage', key: 'NAS', key2: 'SAN' },
          { family: 'switch', key: 'Switch' },
          { family: 'wifi', key: 'BorneWifi' },
          { family: 'firewall', key: 'Firewalls' },
          { family: 'ndd', key: 'NDD' },
          { family: 'antivirus', key: 'Antivirus', isObject: true },
          { family: 'antispam', key: 'Antispam', isObject: true },
          { family: 'save', key: 'Sauvegarde', isObject: true },
          { family: 'o365', key: 'Office365', isObject: true },
        ];

        const loadPromises = equipementsToLoad.map(async ({ family, key, key2, isObject }) => {
          try {
            const res = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${family}`, {
              credentials: "include",
              signal: controller.signal
            });
            if (!res.ok) return null;
            const rows = await res.json();
            
            if (family === 'stockage') {
              // Séparer NAS et SAN
              const nasList = (rows || []).filter(row => {
                if (!row.data || typeof row.data !== 'object') return false;
                return row.data.type !== 'SAN';
              }).map((row) => {
                const { id: dataId, ...dataWithoutId } = row.data || {};
                return {
                  id: row.id,
                  ...dataWithoutId,
                  nom: row.data?.nom || row.name || row.item_key || "",
                  __fromDb: true
                };
              });
              
              const sanList = (rows || []).filter(row => {
                if (!row.data || typeof row.data !== 'object') return false;
                return row.data.type === 'SAN';
              }).map((row) => {
                const { id: dataId, ...dataWithoutId } = row.data || {};
                return {
                  id: row.id,
                  ...dataWithoutId,
                  nom: row.data?.nom || row.name || row.item_key || "",
                  __fromDb: true
                };
              });
              
              return { NAS: nasList, SAN: sanList };
            } else if (isObject) {
              // Pour Antivirus, Antispam, Sauvegarde, Office365 : objets (pas des tableaux)
              if (family === 'save') {
                // Sauvegarde : filtrer les vraies instances et les jobs
                const realItems = (rows || []).filter(row => {
                  if (!row.data || typeof row.data !== 'object') return false;
                  
                  // Exclure les flags "enabled" uniquement
                  const dataKeys = Object.keys(row.data);
                  if (dataKeys.length === 1 && row.data.enabled === true) return false;
                  
                  // Garder les jobs : item_key commence par 'job-'
                  if (row.item_key && row.item_key.startsWith('job-')) {
                    return true;
                  }
                  
                  // Garder les items qui ont un logiciel (nouvelle structure) ou instances: [] (ancienne structure)
                  return row.data.logiciel || (row.data.instances && Array.isArray(row.data.instances));
                });
                
                let sauvegardeData = { instances: [] };
                if (realItems.length > 0) {
                  const firstItem = realItems[0];
                  if (firstItem.data.instances && Array.isArray(firstItem.data.instances) && realItems.length === 1) {
                    // Ancienne structure : une seule ligne avec { instances: [...] }
                    sauvegardeData = firstItem.data;
                  } else {
                    // Nouvelle structure : une ligne par instance ET des lignes job-{instanceId} séparées
                    // Séparer les instances et les jobs
                    const instanceItems = realItems.filter(item => {
                      // Si c'est un job (item_key commence par 'job-'), ce n'est pas une instance
                      if (item.item_key && item.item_key.startsWith('job-')) return false;
                      // Si data.type === 'job', ce n'est pas une instance
                      if (item.data && item.data.type === 'job') return false;
                      // Si data.type === 'instance', c'est une instance
                      if (item.data && item.data.type === 'instance') return true;
                      // Sinon, si l'item a un logiciel, c'est une instance
                      return item.data && item.data.logiciel;
                    });
                    
                    const jobItems = realItems.filter(item => {
                      // Un job a item_key qui commence par 'job-' OU data.type === 'job'
                      return (item.item_key && item.item_key.startsWith('job-')) || 
                             (item.data && item.data.type === 'job');
                    });
                    
                    // Construire les instances avec leurs jobs
                    const instances = instanceItems.map(instanceItem => {
                      const instanceData = { ...instanceItem.data };
                      // Retirer le marqueur type
                      delete instanceData.type;
                      
                      // L'identifiant côté frontend peut être stocké dans instanceData.instanceId,
                      // sinon utiliser l'id de la ligne en base
                      const instanceFrontendId = instanceData.instanceId || instanceItem.id;
                      
                      // Trouver les jobs liés via l'item_key 'job-{instanceFrontendId}'
                      const instanceJobs = jobItems
                        .filter(jobItem => {
                          const jobItemKey = jobItem.item_key || '';
                          // L'item_key du job est 'job-{instanceId}'
                          if (jobItemKey.startsWith('job-')) {
                            const jobInstanceId = jobItemKey.substring(4); // Enlever 'job-'
                            return jobInstanceId === instanceFrontendId;
                          }
                          // Fallback : si le job a data.type === 'job' mais pas d'item_key, 
                          // on ne peut pas le lier (ne devrait pas arriver)
                          return false;
                        })
                        .map(jobItem => {
                          const jobData = { ...jobItem.data };
                          delete jobData.type;
                          return {
                            id: jobItem.id,
                            ...jobData
                          };
                        });
                      
                      return {
                        id: instanceFrontendId,
                        ...instanceData,
                        jobs: instanceJobs
                      };
                    });
                    
                    sauvegardeData = { instances };
                  }
                }
                return { [key]: sauvegardeData };
              } else {
                // Antivirus, Antispam, Office365 : prendre la première ligne
                if (rows && rows.length > 0) {
                  const itemData = rows[0].data || {};
                  // Pour Office365, vérifier que l'objet n'est pas vide ou juste un flag enabled
                  if (family === 'o365') {
                    const dataKeys = Object.keys(itemData);
                    // Si l'objet est vide ou ne contient que le flag enabled, ne pas l'ajouter
                    if (dataKeys.length === 0 || (dataKeys.length === 1 && itemData.enabled === true)) {
                      return null;
                    }
                  }
                  return { [key]: itemData };
                }
                return null;
              }
            } else {
              // Tableaux (Serveurs, Switch, Wifi, Firewalls, NDD)
              const list = (rows || []).map((row) => {
                const { id: dataId, ...dataWithoutId } = row.data || {};
                return {
                  id: row.id,
                  ...dataWithoutId,
                  nom: row.data?.nom || row.name || row.item_key || "",
                  __fromDb: true
                };
              });
              return { [key]: list };
            }
          } catch (err) {
            if (controller.signal.aborted) return null;
            console.error(`Erreur chargement ${family}:`, err);
            return null;
          }
        });

        const results = await Promise.all(loadPromises);
        const allEquipements = results.reduce((acc, result) => {
          if (result) {
            Object.assign(acc, result);
          }
          return acc;
        }, {});

        if (Object.keys(allEquipements).length > 0) {
          setMonitoringConfig((prev) => {
            if (!prev?.client) return prev;
            return {
              ...prev,
              client: {
                ...prev.client,
                equipements: {
                  ...(prev.client.equipements || {}),
                  ...allEquipements
                }
              }
            };
          });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Erreur chargement équipements:", err);
      }
    };

    loadAllEquipements();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.client?.id]);

  // Réactiver la scrollbar sur la page summary
  useEffect(() => {
    document.body.classList.add('summary-page-active');
    return () => {
      document.body.classList.remove('summary-page-active');
    };
  }, []);
  
  // États pour la sauvegarde
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveVisibleToClient, setSaveVisibleToClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [docsPerPage] = useState(5);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);

  // État pour la popup d'avertissement d'export HTML
  const [showExportWarning, setShowExportWarning] = useState(false);
  const hasExternalHeaderActions = typeof onActionsReady === 'function';

  // Fonction pour effectuer l'export HTML (ZIP avec 3 rapports)
  const performExportHTML = useCallback(async () => {
    console.log('🔵 performExportHTML appelé');
    try {
      console.log('📋 Vérification des références...');
      console.log('summaryRef:', summaryRef);
      console.log('summaryRef.current:', summaryRef?.current);
      console.log('config:', config);
      
      if (!summaryRef || !summaryRef.current) {
        const errorMsg = 'Erreur : Référence du résumé non disponible';
        console.error('❌', errorMsg);
        alert(errorMsg);
        return;
      }
      if (!config) {
        const errorMsg = 'Erreur : Configuration non disponible';
        console.error('❌', errorMsg);
        alert(errorMsg);
        return;
      }
      
      console.log('✅ Références OK, lancement de exportMonitoringAsZIP...');
      await exportMonitoringAsZIP(summaryRef, config, {
        hasInfraContent,
        hasCyberContent,
        hasServicesContent
      });
      console.log('✅ Export terminé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export HTML:', error);
      alert(`Erreur lors de l'export HTML: ${error.message || 'Erreur inconnue'}`);
    }
  }, [config, summaryRef]);

  // Exporter HTML en téléchargeant le fichier
  const handleExportHTML = useCallback(() => {
    console.log('🔵 handleExportHTML appelé, theme:', theme);
    // Vérifier si l'utilisateur est en mode dark
    if (theme === "dark") {
      console.log('⚠️ Mode dark détecté, affichage de l\'avertissement');
      setShowExportWarning(true);
      return;
    }
    
    console.log('✅ Mode light, lancement de l\'export...');
    // Si en mode light, procéder à l'export
    performExportHTML();
  }, [theme, performExportHTML]);

  // Passer les actions au header
  useEffect(() => {
    if (onActionsReady) {
      onActionsReady({
        openSaveModal: () => setShowSaveModal(true),
        exportHTML: handleExportHTML,
      });
    }
  }, [onActionsReady, handleExportHTML]);

  // Charger tous les documents de l'utilisateur quand le modal de sauvegarde s'ouvre
  useEffect(() => {
    if (showSaveModal) {
      fetchMonitoringDocuments().then(docs => {
        // Filtrer pour ne pas afficher les documents dans la corbeille
        const activeDocs = docs.filter(doc => !doc.is_trashed);
        setRecentDocs(activeDocs);
        setCurrentPage(1); // Réinitialiser à la première page
      }).catch(err => {
        console.error("Erreur lors de la récupération des documents:", err);
        setRecentDocs([]);
      });
    }
  }, [showSaveModal]);


  // Calculer les sites disponibles selon le module sélectionné
  useEffect(() => {
    if (!selectedModule || !config?.client) {
      setSelectedSites([]);
      setSites([]);
      return;
    }

    // Mapping des modules vers leurs équipements (modules qui peuvent avoir des sites)
    const moduleToEquipments = {
      internet: () => config?.client?.equipements?.Internet || [],
      serveurs: () => config?.client?.equipements?.Serveurs || [],
      stockage: () => {
        const nasList = config?.client?.equipements?.NAS || [];
        const sanList = config?.client?.equipements?.SAN || [];
        const allStorage = [...nasList, ...sanList];
        return allStorage.filter(eq => eq != null);
      },
      firewall: () => config?.client?.equipements?.Firewalls || [],
      switch: () => config?.client?.equipements?.Switch || [],
      wifi: () => config?.client?.equipements?.BorneWifi || [],
    };

    const modulesWithSites = new Set(['internet', 'serveurs', 'stockage', 'firewall', 'switch', 'wifi']);

    if (!modulesWithSites.has(selectedModule)) {
      setSelectedSites([]);
      setSites([]);
      return;
    }
    
    const getEquipments = moduleToEquipments[selectedModule];
    if (!getEquipments) {
      setSelectedSites([]);
      setSites([]);
      return;
    }

    const equipments = getEquipments();
    
    if (!Array.isArray(equipments) || equipments.length === 0) {
      setSelectedSites([]);
      setSites([]);
      return;
    }

    const sortSites = (list) => list.sort((a, b) => {
      if (a === "Sans site") return 1;
      if (b === "Sans site") return -1;
      return a.localeCompare(b);
    });

    const sitesSet = new Set();
    let hasNoSite = false;
    
    equipments.forEach(equipment => {
      const site = equipment?.site ? String(equipment.site).trim() : null;
      if (site && site.length > 0) {
        sitesSet.add(site);
      } else {
        hasNoSite = true;
      }
    });
    
    if (hasNoSite) {
      sitesSet.add("Sans site");
    }
    
    const rawSitesList = sortSites(Array.from(sitesSet));

    if (rawSitesList.length === 0) {
      setSelectedSites([]);
      setSites([]);
      return;
    }

    setSites(rawSitesList);
    
    // Par défaut, sélectionner tous les sites
    setSelectedSites(rawSitesList);
  }, [selectedModule, config]);

  const refreshRecentDocs = () => {
    fetchMonitoringDocuments().then(docs => {
      // Filtrer pour ne pas afficher les documents dans la corbeille
      const activeDocs = docs.filter(doc => !doc.is_trashed);
      setRecentDocs(activeDocs);
    }).catch(err => {
      console.error("Erreur lors de la récupération des documents:", err);
      setRecentDocs([]);
    });
  };

  // Fonction pour ouvrir le modal de confirmation de suppression
  const handleDeleteClick = (docId, docName, e) => {
    e.stopPropagation();
    setDocToDelete({ id: docId, name: docName });
    setShowDeleteConfirm(true);
  };

  // Fonction pour supprimer un document
  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    
    setDeletingDocId(docToDelete.id);
    try {
      const result = await deleteMonitoringDocument(docToDelete.id);
      if (result.success) {
        showSuccess("Document supprimé avec succès !");
        const newDocs = await fetchMonitoringDocuments();
        // Filtrer pour ne pas afficher les documents dans la corbeille
        const activeDocs = newDocs.filter(doc => !doc.is_trashed);
        setRecentDocs(activeDocs);
        // Réajuster la page si nécessaire
        const totalPages = Math.ceil((newDocs.length - 1) / docsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
        }
        setShowDeleteConfirm(false);
        setDocToDelete(null);
      } else {
        showError(result.error || "Erreur lors de la suppression du document.");
      }
    } catch (error) {
      showError(error.message || "Erreur lors de la suppression du document.");
    } finally {
      setDeletingDocId(null);
    }
  };

  // Fonction pour charger un document existant (pré-remplir le nom et demander écrasement)
  const handleLoadDocument = (doc) => {
    setSaveName(doc.name);
    // Vérifier si on doit demander l'écrasement
    const clientName = config?.client?.name || 'Anonyme';
    const reportPeriod = config?.client?.reportPeriod || null;
    const dataCopy = safeJsonClone(data);
    const configCopy = safeJsonClone(config);
    
    setPendingSave({ 
      name: doc.name, 
      client_name: clientName,
      report_period: reportPeriod,
      config: configCopy,
      data: dataCopy
    });
    setShowOverwriteConfirm(true);
  };

  const handleSendEmail = async (html) => {
    const emails = emailInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);

    if (!emails.length) {
      showError("Saisir au moins une adresse.");
      return;
    }

    // Préparation des infos à envoyer
    const infos = {
      client: config.client.name,
      frequency: config.client.report_frequency,
      period: config.client.reportPeriod,
      modules: Object.entries(config.client.modules)
        .filter(([_, val]) => val)
        .map(([key]) =>
          key.replace(/^cyber/i, "").replace(/^./, (c) => c.toUpperCase())
        )
        .join(", "),
    };

    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/email/send-monitoring-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, html, infos }),
      });

      if (res.ok) {
        showSuccess("📧 Rapport envoyé avec succès !");
      } else {
        showError("Erreur lors de l'envoi du mail.");
      }
    } catch (error) {
      showError("Erreur lors de l'envoi du mail.");
      console.error(error);
    }
  };

  function ModuleTitle({ title }) {
    return (
      <div className={styles.moduleTitleBlock}>
        <h3 className={styles.moduleTitle}>{title}</h3>
        <hr className={styles.moduleDivider} />
      </div>
    );
  }


  // Fonction pour forcer le passage en mode light
  const forceLightMode = useCallback(() => {
    // Forcer le thème en mode light via localStorage et classes CSS
    localStorage.setItem("theme", "light");
    
    // Supprimer la classe dark et ajouter la classe light
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    
    // Appliquer les variables CSS du mode light
    const lightVariables = {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f9fafb',
      '--bg-tertiary': '#f3f4f6',
      '--bg-sidebar': '#ffffff',
      '--text-primary': '#000000',
      '--text-secondary': '#000000',
      '--text-muted': '#6b7280',
      '--text-inverted': '#ffffff',
      '--border-primary': '#e5e7eb',
      '--border-secondary': '#d1d5db',
      '--accent-primary': '#4f46e5',
      '--accent-secondary': '#6366f1',
      '--shadow-color': 'rgba(0, 0, 0, 0.1)',
    };

    Object.entries(lightVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Mettre à jour la meta tag theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#ffffff');
    }

    // Attendre un peu que le thème soit appliqué puis exporter
    setTimeout(() => {
      performExportHTML();
    }, 200);
  }, [performExportHTML]);

  // Calcul des modules par catégorie
  const { infrastructureModules, cybersecuriteModules, servicesModules } = useMemo(() => {
    const modulesSet = new Set();
    const normalizedModules = [];

    const addModule = (moduleName) => {
      if (!moduleName) return;
      const normalized = normalizeModuleName(moduleName);
      if (!modulesSet.has(normalized)) {
        modulesSet.add(normalized);
        normalizedModules.push(normalized);
      }
    };

    Object.keys(config?.client?.modules_monitoring || {}).forEach((key) => {
      if (config?.client?.modules_monitoring?.[key]) {
        addModule(key);
      }
    });

    const addIf = (moduleName, condition) => {
      if (condition) {
        addModule(moduleName);
      }
    };

    addIf("internet", (config?.client?.modules_monitoring?.Internet) && (config?.client?.equipements?.Internet || []).length > 0);
    addIf("firewall", (config?.client?.modules_monitoring?.Firewall) && (config?.client?.equipements?.Firewalls || []).length > 0 && !!data?.firewalls);
    addIf("serveurs", (config?.client?.equipements?.Serveurs || []).length > 0 && !!data?.serveurs);
    addIf("stockage", ((config?.client?.equipements?.NAS || []).length > 0 || (config?.client?.equipements?.SAN || []).length > 0) && !!data?.stockage);
    addIf("switch", (config?.client?.equipements?.Switch || []).length > 0 && (config?.client?.modules_monitoring?.Switch));
    addIf("wifi", (config?.client?.equipements?.BorneWifi || []).length > 0 && (config?.client?.modules_monitoring?.Wifi));

    addIf("sauvegarde", !!config?.client?.modules_monitoring?.Sauvegarde);
    addIf("antivirus", !!config?.client?.modules_monitoring?.Antivirus);
    addIf("antispam", !!config?.client?.modules_monitoring?.Antispam);
    addIf("firewallregles", !!config?.client?.modules_monitoring?.FirewallRegles || !!config?.client?.modules_monitoring?.Firewall);

    addIf("ndd", (config?.client?.equipements?.NDD || []).length > 0);
    addIf("office365", !!config?.client?.modules_monitoring?.Office365 || !!data?.office365);

    const getInfrastructureOrder = (moduleName) => {
      const key = String(moduleName).toLowerCase();
      if (key.includes("internet")) return 1;
      if (key.includes("firewall") && !key.includes("regle")) return 2;
      if (key.includes("serveur")) return 3;
      if (key.includes("stockage")) return 4;
      if (key.includes("switch")) return 5;
      if (key.includes("wifi") || key.includes("borne")) return 6;
      return 99;
    };

    const getCybersecuriteOrder = (moduleName) => {
      const key = String(moduleName).toLowerCase();
      if (key.includes("antivirus")) return 1;
      if (key.includes("antispam")) return 2;
      if (key.includes("firewall") || key.includes("firewallregle")) return 3;
      if (key.includes("sauvegarde")) return 4;
      return 99;
    };

    const getServicesOrder = (moduleName) => {
      const key = String(moduleName).toLowerCase();
      if (key.includes("office365") || key.includes("o365")) return 1;
      if (key.includes("ndd")) return 2;
      return 99;
    };

    const infrastructureModules = normalizedModules
      .filter((m) => getModuleCategory(m) === "infrastructure")
      .sort((a, b) => getInfrastructureOrder(a) - getInfrastructureOrder(b));

    const cybersecuriteModules = normalizedModules
      .filter((m) => getModuleCategory(m) === "cybersecurite")
      .sort((a, b) => getCybersecuriteOrder(a) - getCybersecuriteOrder(b));

    const servicesModules = normalizedModules
      .filter((m) => getModuleCategory(m) === "services")
      .sort((a, b) => getServicesOrder(a) - getServicesOrder(b));

    return { infrastructureModules, cybersecuriteModules, servicesModules };
  }, [config, data]);

  const modulesForSelectedReport = useMemo(() => {
    if (selectedReport === "cybersecurite") return cybersecuriteModules;
    if (selectedReport === "services") return servicesModules;
    return infrastructureModules;
  }, [selectedReport, infrastructureModules, cybersecuriteModules, servicesModules]);

  const moduleNavList = modulesForSelectedReport.length > 0
    ? modulesForSelectedReport
    : fallbackModulesByReport[selectedReport] || [];

  const hasInfraContent = Boolean(
    infrastructureModules.length > 0
  );

  const hasCyberContent = Boolean(
    cybersecuriteModules.length > 0
  );

  const hasServicesContent = Boolean(
    servicesModules.length > 0
  );

  const archiveReportToClientVault = async ({ visibleToClient, documentName, reportPeriod }) => {
    if (!config?.client?.id || !summaryRef?.current) return { skipped: true };

    try {
      const zipBlob = await generateZIPBlob(summaryRef, config, {
        hasInfraContent,
        hasCyberContent,
        hasServicesContent,
      });
      if (!zipBlob) throw new Error("Échec de la génération du ZIP");

      await uploadReportArchiveToClientVault({
        blob: zipBlob,
        fileName: documentName ? `${documentName}.zip` : undefined,
        clientId: config.client.id,
        clientName: config.client.name || "",
        description: reportPeriod || "",
        visibleToClient,
      });
      return { success: true };
    } catch (err) {
      console.error("Archivage coffre-fort:", err);
      return { success: false, error: err.message };
    }
  };

  const handleSave = async (forceOverwrite = false) => {
    if (!saveName.trim()) return null;
    setSaving(true);
    try {
      const dataCopy = safeJsonClone(data);
      const configCopy = safeJsonClone(config);
      const clientName = config?.client?.name || "CLIENT";
      const reportPeriod = config?.client?.reportPeriod || null;

      const result = await saveMonitoringDocument({
        name: saveName,
        client_name: clientName,
        report_period: reportPeriod,
        config: configCopy,
        data: dataCopy,
        overwrite: forceOverwrite,
      });

      if (result.success) {
        const vaultResult = await archiveReportToClientVault({
          visibleToClient: saveVisibleToClient,
          documentName: saveName.trim(),
          reportPeriod,
        });
        setSaveSuccessVisible(true);
        setSaveName("");
        refreshRecentDocs();
        setTimeout(() => setSaveSuccessVisible(false), 3000);
        if (vaultResult.success) {
          toast.success(
            saveVisibleToClient
              ? "Rapport sauvegardé et partagé avec l'entreprise."
              : "Rapport sauvegardé (interne agents)."
          );
        } else if (!vaultResult.skipped) {
          toast.warn("Rapport sauvegardé, mais l'archivage documentaire a échoué.");
        } else {
          toast.success("Rapport sauvegardé.");
        }
        return result;
      }

      if (result.message && result.message.includes("Document déjà enregistré")) {
        setPendingSave({
          name: saveName,
          client_name: clientName,
          report_period: reportPeriod,
          config: configCopy,
          data: dataCopy,
          visibleToClient: saveVisibleToClient,
        });
        setShowOverwriteConfirm(true);
        return null;
      }

      const errorMessage =
        result.error || result.message || "Erreur lors de la sauvegarde.";
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(errorMessage);
      return result;
    } catch (error) {
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(error.message || "Erreur lors de la sauvegarde.");
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  };

  // Intersection Observer pour les animations au scroll
  useEffect(() => {
    const observers = [];
    const sectionElements = document.querySelectorAll(`.${styles.scrollSection}`);
    
    sectionElements.forEach((section) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add(styles.visible);
              setVisibleSections((prev) => new Set([...prev, entry.target.id]));
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -100px 0px'
        }
      );
      
      observer.observe(section);
      observers.push(observer);
    });
    
    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [config, data]);

  useEffect(() => {
    // Si le rapport sélectionné n'a pas de contenu, passer au premier rapport avec contenu
    const hasContent = {
      infrastructure: infrastructureModules.length > 0,
      cybersecurite: cybersecuriteModules.length > 0,
      services: servicesModules.length > 0
    };

    if (!hasContent[selectedReport]) {
      // Trouver le premier rapport avec contenu
      if (hasContent.infrastructure) setSelectedReport('infrastructure');
      else if (hasContent.cybersecurite) setSelectedReport('cybersecurite');
      else if (hasContent.services) setSelectedReport('services');
    }

    const reportModules = moduleNavList;
    if (reportModules.length === 0) {
      setSelectedModule(null);
      return;
    }
    if (!reportModules.includes(selectedModule)) {
      setSelectedModule(reportModules[0]);
    }
  }, [selectedReport, moduleNavList, selectedModule, infrastructureModules, cybersecuriteModules, servicesModules]);

  const handleModuleNavigation = (moduleName) => {
    setSelectedModule(moduleName);
    const targetId = getModuleId(moduleName);
    const element = document.getElementById(targetId);
    if (element) {
      // scroll-margin-top dans le CSS gère l'offset pour le header fixe
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={`${styles.summaryPage} ${theme === "dark" ? styles.dark : ""}`} ref={summaryRef}>
      {/* Nom du client en haut avec le même style que les titres de section */}
      <div className={styles.clientNameTitleContainer}>
        <div className={styles.clientNameTitleWrapper}>
          <div>
            <h1 className={styles.clientNameTitle}>
              {config?.client?.name || 'CLIENT'}
            </h1>
            <p className={styles.clientNameSubtitle}>
              {config?.client?.reportPeriod || 'Période non spécifiée'}
            </p>
          </div>
          <div className={styles.reportSelector}>
            {REPORT_OPTIONS.map((option) => {
              const hasContent = {
                infrastructure: infrastructureModules.length > 0,
                cybersecurite: cybersecuriteModules.length > 0,
                services: servicesModules.length > 0
              }[option.id];

              return (
                <button
                  key={option.id}
                  data-variant={option.id}
                  className={`${styles.reportPill} ${selectedReport === option.id ? styles.reportPillActive : ''} ${!hasContent ? styles.reportPillDisabled : ''}`}
                  onClick={() => hasContent && setSelectedReport(option.id)}
                  disabled={!hasContent}
                  title={!hasContent ? `Aucun module ${option.label.toLowerCase()} disponible` : ''}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.leftContent}>
          <div className={styles.reportSummary}>
            <div className={styles.headerStack}>
              <div className={styles.reportHero}>
                <h2
                  className={`${styles.reportHeroTitle} ${
                    selectedReport === "cybersecurite"
                      ? styles.reportHeroTitleCyber
                      : selectedReport === "services"
                      ? styles.reportHeroTitleServices
                      : styles.reportHeroTitleInfra
                  }`}
                >
                  {reportTitleMap[selectedReport]?.toUpperCase()}
                </h2>
                <p className={styles.reportHeroSubtitle}>
                  {reportDescriptionMap[selectedReport]}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation des modules */}
          <div className={styles.modulesSection}>
              {moduleNavList.length > 0 && (
                <div className={styles.moduleNavCluster}>
                  <div
                    className={styles.modulesDivider}
                    style={{
                      borderColor:
                        selectedReport === "cybersecurite"
                          ? "#ef4444"
                          : selectedReport === "services"
                          ? "#8b5cf6"
                          : "#3b82f6"
                    }}
                  ></div>
                  <nav className={styles.moduleNav}>
                    <div className={styles.moduleButtonsWrapper}>
                      <div className={styles.moduleButtonsRow}>
                        {moduleNavList.map((m) => {
                          const icon = getModuleIcon(m);
                          if (!icon) return null;
                          const isActive = selectedModule === m;
                          return (
                            <button
                              key={m}
                              data-report={selectedReport}
                              className={`${styles.moduleBtn} ${isActive ? styles.active : ''}`}
                              title={formatModuleLabel(m)}
                              onClick={() => handleModuleNavigation(m)}
                            >
                              {icon}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </nav>
                </div>
              )}
              <div 
                className={styles.internetPinned}
                style={{ display: selectedReport === "infrastructure" ? '' : 'none' }}
              >
                  {/* Titre des connexions Internet avant la topologie */}
                  {config?.client?.modules_monitoring?.Internet && (
                    <>
                      <div id="internet-section" className={styles.internetSection}>
                        <InternetTitle />
                      </div>
                      {/* Topologie Internet */}
                      <div className={styles.topologyWrapper}>
                        <h3 className={styles.sectionSubtitle}>Topologie des connexions internet</h3>
                        <InfrastructureTopology
                          config={config}
                          data={data}
                          selectedSites={[]}
                        />
                        <hr className={styles.moduleSeparator} />
                      </div>
                    </>
                  )}
                  {/* Détail des firewalls par lieux juste sous les connexions Internet */}
                  {config?.client?.modules_monitoring?.Firewall && data?.firewalls && (
                    <>
                      <div className={styles.firewallsSection}>
                        <div
                          id="firewalls-section"
                          className={styles.firewallTitleWrapper}
                        >
                          <FirewallTitle />
                        </div>
                        <h3 className={styles.sectionSubtitle}>État de santé des firewalls</h3>
                        <FirewallsSummary
                          data={data.firewalls}
                          config={config}
                          selectedSites={[]}
                        />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>
                  )}
                  {/* Topologie des serveurs par lieux */}
                  {data?.serveurs && (
                    <>
                      {/* Bloc TITRE uniquement */}
                      <ServerTitle />
                      {/* Bloc TOPOLOGIE uniquement */}
                      <div className={styles.serversTopologySection}>
                        <h3 className={styles.sectionSubtitle}>Heatmap des serveurs</h3>
                        <ServersTopology
                          config={config}
                          data={data}
                          selectedSites={[]}
                        />
                      </div>
                    </>
                  )}

                  {/* Cartes de serveurs regroupées par lieux */}
                  {data?.serveurs && (
                    <>
                      <div className={styles.serversCardsSection}>
                        <h3 className={styles.sectionSubtitle}>État de santé des serveurs</h3>
                        <ServersSummaryCards
                          config={config}
                          data={data}
                          selectedSites={[]}
                        />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>
                  )}

                  {/* STOCKAGE */}
                  {data?.stockage && (
                    <>
                      {/* Bloc TITRE STOCKAGE */}
                      <StorageTitle />

                      {/* Topologie des stockages */}
                      <div className={styles.storageTopologySection}>
                        <h3 className={styles.sectionSubtitle}>Heatmap des espaces de stockage</h3>
                        <StockageTopology
                          config={config}
                          data={data?.stockage || data || {}}
                          selectedSites={[]}
                        />
                      </div>

                      {/* Cartes de stockages */}
                      <div className={styles.storageCardsSection}>
                        <h3 className={styles.sectionSubtitle}>État de santé des espaces de stockage</h3>
                        <StockageSummary data={data?.stockage || data || {}} config={config} />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>
                  )}

                  {/* SWITCHS */}
                  {config?.client?.equipements?.Switch && config.client.equipements.Switch.length > 0 && (
                    <>
                      {/* Bloc TITRE uniquement */}
                      <SwitchTitle />
                      {/* Bloc TOPOLOGIE uniquement */}
                      <div className={styles.switchesTopologySection}>
                        <h3 className={styles.sectionSubtitle}>Heatmap des switchs</h3>
                        <SwitchesTopology
                          config={config}
                          data={data}
                          selectedSites={[]}
                        />
                      </div>
                    </>
                  )}

                  {/* Cartes de switchs regroupées par lieux */}
                  {config?.client?.equipements?.Switch && config.client.equipements.Switch.length > 0 && (
                    <>
                      <div className={styles.switchesCardsSection}>
                        <h3 className={styles.sectionSubtitle}>État de santé des switchs</h3>
                        <SwitchesSummaryCards
                          config={config}
                          data={data?.switches || data || {}}
                          selectedSites={[]}
                        />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>
                  )}

                  {/* BORNES WIFI */}
                  {config?.client?.equipements?.BorneWifi && config.client.equipements.BorneWifi.length > 0 && (
                    <>
                      {/* Bloc TITRE uniquement */}
                      <WifiTitle />
                      {/* Bloc SSID */}
                      {config?.client?.ssids && config.client.ssids.length > 0 && (
                        <div className={styles.wifiSsidSection}>
                          <h3 className={styles.sectionSubtitle}>SSID</h3>
                          <div className={styles.ssidCardsContainer}>
                            {config.client.ssids.map((ssid, idx) => {
                              const ssidId = typeof ssid === 'string' ? ssid : (ssid.id || `SSID-${idx + 1}`);
                              const ssidNom = typeof ssid === 'string' ? ssid : (ssid.nom || 'SSID sans nom');
                              return (
                                <div key={ssidId || idx} className={styles.ssidCard}>
                                  <span className={styles.ssidCardName}>{ssidNom}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Bloc TOPOLOGIE uniquement */}
                      <div className={styles.wifiTopologySection}>
                        <h3 className={styles.sectionSubtitle}>Heatmap des bornes WiFi</h3>
                        <WifiTopology
                          config={config}
                          data={data}
                          selectedSites={[]}
                        />
                      </div>
                    </>
                  )}

                  {/* Cartes de bornes WiFi regroupées par lieux */}
                  {config?.client?.equipements?.BorneWifi && config.client.equipements.BorneWifi.length > 0 && (
                    <div className={styles.wifiCardsSection}>
                      <h3 className={styles.sectionSubtitle}>État de santé des bornes WiFi</h3>
                      <WifiSummaryCards
                        config={config}
                        data={data?.wifi || data || {}}
                        selectedSites={[]}
                      />
                    </div>
                  )}
                </div>
              <div 
                className={styles.cybersecuritePinned}
                style={{ display: selectedReport === "cybersecurite" ? '' : 'none' }}
              >
                  {/* MODULE ANTIVIRUS */}
                  {config?.client?.modules_monitoring?.Antivirus && (
                    <>
                      <div id="antivirus-section" className={styles.cyberModuleSection}>
                        <AntivirusTitle data={data?.antivirus} config={config} />
                        <AntivirusSummary
                          data={data?.antivirus || {}}
                          config={config}
                          selectedSites={selectedSites}
                        />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>
                  )}

                  {/* MODULE ANTISPAM */}
                  {config?.client?.modules_monitoring?.Antispam && (
                    <>
                      <div id="antispam-section" className={styles.cyberModuleSection}>
                        <AntispamTitle data={data?.antispam} config={config} />
                        <AntispamSummary
                          data={data?.antispam || {}}
                          config={config}
                          selectedSites={selectedSites}
                        />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>
                  )}

                  {/* MODULE FIREWALL REGLES */}
                  {(config?.client?.modules_monitoring?.FirewallRegles || config?.client?.modules_monitoring?.Firewall) && (
                    <>
                      <div id="firewallregles-section" className={styles.cyberModuleSection}>
                        <FirewallReglesTitle data={data?.firewallregles} config={config} />
                        <FirewallReglesSummary
                          data={data?.firewallregles || {}}
                          config={config}
                          selectedSites={selectedSites}
                        />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>
                  )}

                  {/* MODULE SAUVEGARDE */}
                  {config?.client?.modules_monitoring?.Sauvegarde && (
                    <div id="sauvegarde-section" className={styles.cyberModuleSection}>
                      <SauvegardeTitle data={data?.sauvegarde} config={config} />
                      <SauvegardeSummary
                        data={data?.sauvegarde || {}}
                        config={config}
                        selectedSites={selectedSites}
                      />
                    </div>
                  )}
                </div>
              <div 
                className={styles.servicesPinned}
                style={{ display: selectedReport === "services" ? '' : 'none' }}
              >
                  {/* MODULE OFFICE 365 */}
                  {(data?.office365 || (config?.client?.equipements?.Office365 && config.client.equipements.Office365 && typeof config.client.equipements.Office365 === 'object' && Object.keys(config.client.equipements.Office365).length > 0 && !(Object.keys(config.client.equipements.Office365).length === 1 && config.client.equipements.Office365.enabled === true))) && (
                    <>
                      <div id="office365-section" className={styles.serviceModuleSection}>
                        <Office365Title data={data?.office365} config={config} />
                        <O365Summary
                          data={data?.office365 || {}}
                          config={config}
                          selectedSites={selectedSites}
                        />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>
                  )}

                  {/* MODULE NDD */}
                  {(config?.client?.equipements?.NDD && config.client.equipements.NDD.length > 0) && (
                    <>
                      <div id="ndd-section" className={styles.serviceModuleSection}>
                        <NDDTitle />
                        <NDDSummary
                          data={data}
                          config={config}
                          selectedSites={selectedSites}
                        />
                      </div>
                    </>
                  )}
                </div>
          </div>
        </div>
      </div>

      {/* Pied de page */}
      <footer className={styles.summaryFooter}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogos}>
            <img 
              src={getLogoPath('logo-psi.png')} 
              alt="PSI" 
              className={styles.footerLogoPSI}
            />
            <div className={styles.footerLogosSeparator}></div>
            <div className={styles.footerLogoWrapper}>
              <Icon icon="simple-icons:v" className={styles.footerLogoIcon} />
              <span className={styles.footerLogoText}>ERITAS</span>
            </div>
          </div>
          <div className={styles.footerText}>
            <p className={styles.footerMessage}>
              Besoin d'assistance ou d'informations complémentaires ?
            </p>
            <p className={styles.footerSubMessage}>
              Notre équipe est à votre disposition pour répondre à toutes vos questions.
            </p>
          </div>
          <div className={styles.footerContact}>
            <a href="mailto:support@psi.fr" className={styles.contactLink}>
              <span className={styles.contactIcon}>✉</span>
              support@psi.fr
            </a>
            <a href="tel:+33971007878" className={styles.contactLink}>
              <span className={styles.contactIcon}>📞</span>
              09 71 00 78 78
            </a>
          </div>
        </div>
      </footer>

      {/* Modal de sauvegarde */}
      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSaveModal(false);
          }
        }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon icon="mdi:content-save" className={styles.modalIcon} />
                <h3>Sauvegarder le rapport de monitoring</h3>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setShowSaveModal(false)}
                title="Fermer"
              >
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.saveInputSection}>
                <label className={styles.saveInputLabel}>
                  Nom du document
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Ex: Rapport Monitoring - Client Alpha"
                  className={styles.saveInput}
                />
              </div>

              <ReportSaveVisibilitySwitch
                visibleToClient={saveVisibleToClient}
                onChange={setSaveVisibleToClient}
                disabled={saving}
              />

              {/* Tableau de tous les documents */}
              {recentDocs.length > 0 && (() => {
                // Calcul de la pagination
                const totalPages = Math.ceil(recentDocs.length / docsPerPage);
                const startIndex = (currentPage - 1) * docsPerPage;
                const endIndex = startIndex + docsPerPage;
                const currentDocs = recentDocs.slice(startIndex, endIndex);

                return (
                  <div className={styles.recentDocs}>
                    <h4 className={styles.recentDocsTitle}>
                      <Icon icon="mdi:file-document-multiple" style={{ fontSize: '1.1rem', marginRight: '0.5rem' }} />
                      Mes documents ({recentDocs.length})
                    </h4>
                    <div className={styles.docsTableContainer}>
                      <table className={styles.docsTable}>
                        <thead>
                          <tr>
                            <th>Nom</th>
                            <th>Client</th>
                            <th>Période</th>
                            <th>Date de création</th>
                            <th>Dernière modification</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentDocs.map((doc) => {
                            const isDeleting = deletingDocId === doc.id;
                            return (
                              <tr 
                                key={doc.id} 
                                className={styles.docTableRow}
                                onClick={() => handleLoadDocument(doc)}
                                title="Cliquer pour charger ce document"
                              >
                                <td className={styles.docNameCell}>
                                  <span className={styles.docName}>{doc.name}</span>
                                </td>
                                <td className={styles.docCell}>{doc.client_name || '-'}</td>
                                <td className={styles.docCell}>{doc.report_period || '-'}</td>
                                <td className={styles.docCell}>
                                  {new Date(doc.created_at).toLocaleDateString('fr-FR', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </td>
                                <td className={styles.docCell}>
                                  {new Date(doc.updated_at).toLocaleString('fr-FR', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className={styles.docActionsCell}>
                                  <button
                                    className={styles.deleteDocButton}
                                    onClick={(e) => handleDeleteClick(doc.id, doc.name, e)}
                                    disabled={isDeleting}
                                    title="Supprimer ce document"
                                  >
                                    {isDeleting ? (
                                      <Icon icon="mdi:loading" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                      <Icon icon="mdi:delete-outline" style={{ fontSize: '1.1rem' }} />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className={styles.pagination}>
                        <button
                          className={styles.paginationButton}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          title="Page précédente"
                        >
                          <Icon icon="mdi:chevron-left" />
                        </button>
                        <span className={styles.paginationInfo}>
                          Page {currentPage} sur {totalPages}
                        </span>
                        <button
                          className={styles.paginationButton}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          title="Page suivante"
                        >
                          <Icon icon="mdi:chevron-right" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
              {recentDocs.length === 0 && (
                <div className={styles.emptyDocs}>
                  <Icon icon="mdi:file-document-outline" style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem' }} />
                  <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Aucun document sauvegardé</p>
                </div>
              )}
            </div>

            <div className={styles.modalActions} style={{ justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleSave()}
                className={styles.primaryButton}
                disabled={saving || !saveName.trim()}
                title="Sauvegarder"
              >
                {saving ? (
                  <Icon icon="mdi:loading" style={{ fontSize: '1.1rem', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Icon icon="mdi:content-save" style={{ fontSize: '1.1rem' }} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation d'écrasement */}
      {showOverwriteConfirm && pendingSave && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowOverwriteConfirm(false);
            setPendingSave(null);
          }
        }}>
          <div className={`${styles.modalContent} ${styles.overwriteModalContent}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon icon="mdi:alert" className={styles.modalIcon} />
                <h3>Document existant</h3>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setShowOverwriteConfirm(false);
                  setPendingSave(null);
                }}
                title="Fermer"
              >
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: '#1a1a1a' }}>
                Un document avec le nom "{saveName}" existe déjà. Voulez-vous l'écraser ?
              </p>
            </div>

            <div className={styles.modalActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const result = await saveMonitoringDocument({
                      name: pendingSave.name,
                      client_name: pendingSave.client_name,
                      report_period: pendingSave.report_period,
                      config: pendingSave.config,
                      data: pendingSave.data,
                      overwrite: true
                    });
                    
                    if (result.success) {
                      const vaultResult = await archiveReportToClientVault({
                        visibleToClient: pendingSave.visibleToClient ?? saveVisibleToClient,
                        documentName: pendingSave.name,
                        reportPeriod: pendingSave.report_period,
                      });
                      setSaveSuccessVisible(true);
                      setSaveName("");
                      setPendingSave(null);
                      setShowOverwriteConfirm(false);
                      refreshRecentDocs();
                      setTimeout(() => setSaveSuccessVisible(false), 3000);
                      if (vaultResult.success) {
                        toast.success(
                          (pendingSave.visibleToClient ?? saveVisibleToClient)
                            ? "Rapport sauvegardé et partagé avec l'entreprise."
                            : "Rapport sauvegardé (interne agents)."
                        );
                      } else if (!vaultResult.skipped) {
                        toast.warn("Rapport sauvegardé, mais l'archivage documentaire a échoué.");
                      }
                    } else {
                      setSaveErrorVisible(true);
                      setTimeout(() => setSaveErrorVisible(false), 3000);
                    }
                  } catch (error) {
                    setSaveErrorVisible(true);
                    setTimeout(() => setSaveErrorVisible(false), 3000);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className={styles.primaryButton}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 10px 20px rgba(220, 38, 38, 0.35)'
                }}
              >
                <Icon icon="mdi:check" />
                {saving ? "Enregistrement..." : "Oui, écraser"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && docToDelete && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDeleteConfirm(false);
            setDocToDelete(null);
          }
        }}>
          <div className={`${styles.modalContent} ${styles.overwriteModalContent}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon icon="mdi:alert-circle-outline" className={styles.modalIcon} style={{ color: '#ef4444' }} />
                <h3>Supprimer le document</h3>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDocToDelete(null);
                }}
                title="Fermer"
              >
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: '#1a1a1a' }}>
                Êtes-vous sûr de vouloir supprimer le document <strong>"{docToDelete.name}"</strong> ? Cette action est irréversible.
              </p>
            </div>

            <div className={styles.modalActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDocToDelete(null);
                }}
                className={styles.secondaryButton}
                disabled={deletingDocId === docToDelete.id}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteDocument}
                className={styles.dangerButton}
                disabled={deletingDocId === docToDelete.id}
              >
                {deletingDocId === docToDelete.id ? (
                  <>
                    <Icon icon="mdi:loading" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:delete" style={{ fontSize: '1rem' }} />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MonitoringSummary;
