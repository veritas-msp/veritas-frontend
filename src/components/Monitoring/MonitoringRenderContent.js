import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import { fetchClients } from "../../api/clientsMonitoring";

import { useMonitoringContext } from "../../contexts/MonitoringContext";

import MonitoringSummary from "./MonitoringSummary/MonitoringSummary";
import MonitoringHome from "./MonitoringHome/MonitoringHome";
import MonitoringHeader from "./MonitoringHeader";
import MonitoringFullscreenWrapper from "./MonitoringFullscreenWrapper";

import MonitoringModuleInternet from "./Modules/Internet";
import MonitoringModuleServeurs from "./Modules/Serveurs";
import MonitoringModuleStockage from "./Modules/Stockage";
import MonitoringModuleFirewalls from "./Modules/Firewalls";
import MonitoringModuleSwitch from "./Modules/Switch";
import MonitoringModuleWifi from "./Modules/Wifi";
import MonitoringModuleSauvegarde from "./Modules/Sauvegarde";
import MonitoringModuleAntivirus from "./Modules/Antivirus";
import MonitoringModuleAntispam from "./Modules/Antispam";
import MonitoringModuleNDD from "./Modules/NDD";
import MonitoringModuleO365 from "./Modules/O365";
import MonitoringModuleFirewallRegles from "./Modules/FirewallRegles";
import ConfirmationModal from "../Misc/ConfirmationModal/ConfirmationModal";

import styles from "./MonitoringRenderContent.module.css";

const MonitoringRenderContent = ({ 
  onNavigate, 
  initialConfig = null, 
  initialData = null, 
  initialGatePassed = false,
  initialGoToSummary = false,
  initialScrollY = 0,
  initialStep = 0,
  isFullscreen = true,
  forceNewOnMount = false,
  onStateChange = null,
  onMonitoringReportGuardChange = null,
}) => {
  const {
    monitoringConfig,
    setMonitoringConfig,
    monitoringData,
    setMonitoringData,
    refreshDraftStatus
  } = useMonitoringContext();

  // 🔁 Alias locaux pour conserver l'existant
  const config = monitoringConfig;
  const setConfig = setMonitoringConfig;
  const data = monitoringData;
  const setData = setMonitoringData;
  const { resetComplet } = useMonitoringContext();

  // 🔢 Gestion du step (étape courante) avec isolation par rapport
  const [step, setStep] = useState(initialStep ?? 0);
  const stepByReportKeyRef = useRef({});
  const [scrollY, setScrollY] = useState(initialScrollY ?? 0);
  const hasRestoredScrollRef = useRef(false);
  const onStateChangeRef = useRef(onStateChange);
  const [clients, setClients] = useState([]);
  const [checkMKSyncInfo, setCheckMKSyncInfo] = useState(null);
  const [csvImportInfo, setCsvImportInfo] = useState(null);
  // Initialize gatePassed based on localStorage to bypass gate when editing from "My Documents"
  // or from initialGatePassed prop (when creating new document from modal)
  const [gatePassed, setGatePassed] = useState(() => {
    const editData = localStorage.getItem('editDocumentData');
    // Si initialGatePassed est fourni, l'utiliser en priorité
    if (initialGatePassed !== undefined) {
      return initialGatePassed;
    }
    return !!editData; // If editData exists, start with gatePassed = true
  });

  useEffect(() => {
    const active = gatePassed && !!monitoringConfig;
    onMonitoringReportGuardChange?.(active);
    return () => onMonitoringReportGuardChange?.(false);
  }, [gatePassed, monitoringConfig, onMonitoringReportGuardChange]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const fetched = await fetchClients();
        setClients(fetched);
      } catch (err) {
        toast.error("❌ Impossible de charger les clients de monitoring");
      }
    };

    loadClients();
  }, []);

  // Initialiser avec initialConfig et initialData si fournis (pour les onglets)
  // et forcer un nouveau rapport sur la page "Mon" une seule fois
  const lastReportKeyRef = useRef(null);
  const hasForcedNewOnMountRef = useRef(false);

  useEffect(() => {
    // Cas page "Mon" : on veut juste nettoyer l'état une fois au montage
    if (forceNewOnMount) {
      if (!hasForcedNewOnMountRef.current) {
        setConfig(null);
        setData({});
        setGatePassed(false);
        lastReportKeyRef.current = null;
        hasForcedNewOnMountRef.current = true;
      }
      return;
    }

    // Cas onglet MonitoringDetail : initialiser à partir des props si fourni
    if (!initialConfig) return;

    // Clé basée sur le client et éventuellement le nom de document
    const clientId = initialConfig?.client?.id || initialConfig?.clientId || null;
    const docName = initialConfig?.documentName || null;
    const reportKey = clientId ? `${clientId}-${docName || "default"}` : docName || "default";

    // Pour les onglets, n'appliquer l'init que si on change de rapport
    if (reportKey && lastReportKeyRef.current === reportKey) {
      return;
    }

    setConfig(initialConfig);
    setData(initialData || {});

    if (initialGatePassed) {
      setGatePassed(true);
    }

    // Si on veut aller directement au summary, le faire après l'initialisation
    if (initialGoToSummary) {
      setGoToSummaryDirectly(true);
    }

    lastReportKeyRef.current = reportKey;
  }, [initialConfig, initialData, initialGatePassed, initialGoToSummary, forceNewOnMount, setConfig, setData]);

  // Clé de rapport dérivée de la config courante (un rapport par client/document)
  const currentReportKey = useMemo(() => {
    if (!config || !config.client) return null;
    const clientId = config.client.id || config.clientId;
    const docName = config.documentName || null;
    if (!clientId) return null;
    return `${clientId}-${docName || "default"}`;
  }, [config]);

  // Helper pour mettre à jour le step et mémoriser par rapport (en RAM + localStorage)
  const updateStep = useCallback(
    (updater) => {
      setStep(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (currentReportKey) {
          stepByReportKeyRef.current[currentReportKey] = next;
          // Sauvegarder aussi le step dans localStorage pour persistance
          try {
            const raw = localStorage.getItem("monitoring_steps");
            const map = raw ? JSON.parse(raw) : {};
            map[currentReportKey] = next;
            localStorage.setItem("monitoring_steps", JSON.stringify(map));
          } catch (e) {
            // Erreurs de localStorage ignorées (quota, mode privé, etc.)
          }
        }
        return next;
      });
    },
    [currentReportKey]
  );

  useEffect(() => {
    if (!config || !currentReportKey) return;

    // Charger le step persistant éventuel depuis localStorage
    let persistedStep = null;
    try {
      const raw = localStorage.getItem("monitoring_steps");
      if (raw) {
        const map = JSON.parse(raw);
        if (Object.prototype.hasOwnProperty.call(map, currentReportKey)) {
          const val = map[currentReportKey];
          if (typeof val === "number") {
            persistedStep = val;
          }
        }
      }
    } catch (e) {
      // En cas d'erreur de parsing, on ignore et on repart sur les valeurs en mémoire
    }

    // Première fois pour ce rapport : utiliser d'abord le step persistant, sinon initialStep, sinon 0
    if (stepByReportKeyRef.current[currentReportKey] == null) {
      const initial = 
        typeof persistedStep === "number"
          ? persistedStep
          : (typeof initialStep === "number" ? initialStep : 0);

      stepByReportKeyRef.current[currentReportKey] = initial;
      setStep(initial);
      return;
    }

    // Si on revient sur un rapport déjà visité, restaurer le step mémorisé
    const savedStep = stepByReportKeyRef.current[currentReportKey];
    if (typeof savedStep === "number" && savedStep !== step) {
      setStep(savedStep);
    }
  }, [config, currentReportKey, initialStep, step]);

  // 🔁 Suivi de la position de scroll pour pouvoir la restaurer quand on revient sur l'onglet
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        window.scrollY ||
        0;
      setScrollY(currentScroll);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Garder la dernière version de onStateChange dans une ref pour éviter de recréer l'effet
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  // Remonter l'état courant vers le parent (pour persister dans l'onglet actif)
  useEffect(() => {
    if (typeof onStateChangeRef.current === 'function' && config && config.client) {
      onStateChangeRef.current({
        client: config.client,
        documentName: config.documentName,
        data,
        gatePassed,
        step,
        scrollY
      });
    }
  }, [config, data, gatePassed, step, scrollY]);

  // Vérifier s'il y a des données d'édition depuis la page "Mes Documents"
  useEffect(() => {
    const editData = localStorage.getItem('editDocumentData');
    if (editData) {
      try {
        const parsedData = JSON.parse(editData);
        if (parsedData.config && parsedData.data) {
          setConfig(parsedData.config);
          setData(parsedData.data);
        } else if (parsedData.data) {
          setData(parsedData.data);
          if (parsedData.data.config) {
            setConfig(parsedData.data.config);
          }
        }
        setGatePassed(true); // S'assurer que la gate est passée
        // Nettoyer le localStorage après utilisation
        localStorage.removeItem('editDocumentData');
      } catch (error) {
        console.error('Erreur lors du parsing des données d\'édition:', error);
        localStorage.removeItem('editDocumentData');
      }
    }
  }, []);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [goToSummaryDirectly, setGoToSummaryDirectly] = useState(false);
  const [currentSite, setCurrentSite] = useState(null);
  const [sites, setSites] = useState([]);
  const [summaryHeaderActions, setSummaryHeaderActions] = useState(null);
  const siteObserversRef = useRef([]);

  // Si on va directement au summary, forcer l'étape summary
  useEffect(() => {
    if (goToSummaryDirectly && config && config.client) {
      updateStep(999);
      setGoToSummaryDirectly(false);
    }
  }, [goToSummaryDirectly, config, updateStep]);

  // Détecter le site actuellement visible (pour tous les modules avec équipements classés par lieux)
  // Ce useEffect doit être avant les early returns pour respecter les règles des hooks
  useEffect(() => {
    // Vérifier que nous sommes dans le bon contexte (gate passée, config présente)
    if (!config || !config.client) {
      setCurrentSite(null);
      setSites([]);
      return;
    }

    const client = config.client;

    // Mapping des modules vers leurs équipements (modules qui peuvent avoir des sites)
    const moduleToEquipments = {
      internet: () => client?.equipements?.Internet || [],
      serveurs: () => client?.equipements?.Serveurs || [],
      stockage: () => {
        const nasList = client?.equipements?.NAS || [];
        const sanList = client?.equipements?.SAN || [];
        const allStorage = [...nasList, ...sanList];
        return allStorage.filter(eq => eq != null);
      },
      firewalls: () => client?.equipements?.Firewalls || [],
      switch: () => client?.equipements?.Switch || [],
      wifi: () => client?.equipements?.BorneWifi || [],
    };

    const sortSites = (list) => list.sort((a, b) => {
      if (a === "Sans site") return 1;
      if (b === "Sans site") return -1;
      return a.localeCompare(b);
    });

    // 🔎 Collecter tous les lieux présents dans n'importe quel module ayant des sites
    const sitesSet = new Set();
    let hasNoSiteGlobal = false;

    Object.values(moduleToEquipments).forEach(getEquipments => {
      if (!getEquipments) return;
      const equipments = getEquipments();
      if (!Array.isArray(equipments) || equipments.length === 0) return;

      equipments.forEach(equipment => {
        const site = equipment?.site ? String(equipment.site).trim() : null;
        if (site && site.length > 0) {
          sitesSet.add(site);
        } else {
          hasNoSiteGlobal = true;
        }
      });
    });

    if (hasNoSiteGlobal) {
      sitesSet.add("Sans site");
    }

    const allSitesList = sortSites(Array.from(sitesSet));

    if (allSitesList.length === 0) {
      setCurrentSite(null);
      setSites([]);
      return;
    }

    // Mettre à disposition TOUS les lieux dans le header, quel que soit le module courant
    setSites(allSitesList);
    setCurrentSite(null);

    const getRenderedSites = () => {
      const siteElements = Array.from(document.querySelectorAll('[data-site-label]'));
      return siteElements
        .filter(el => {
          const card = el.querySelector('[class*="Card"]');
          return Boolean(card);
        })
        .map(el => el.getAttribute('data-site-label'))
        .filter(site => typeof site === 'string' && site.trim().length > 0);
    };

    const initializeObservers = (sitesList) => {
      if (!sitesList || sitesList.length === 0) {
        setCurrentSite(null);
        return;
      }

      // Nettoyer les anciens observers
      siteObserversRef.current.forEach(io => {
        if (io && typeof io.disconnect === 'function') {
          io.disconnect();
        }
      });
      siteObserversRef.current = [];

      // Variable pour éviter les mises à jour inutiles
      let lastActiveSite = null;
      const updateCurrentSite = () => {
        const header = document.querySelector('[class*="headerSection"]');
        const headerHeight = header ? header.offsetHeight : 120;
        const triggerPoint = headerHeight + 50;

        let activeSite = null;
        let bestScore = -Infinity;

        sitesList.forEach(site => {
          const siteId = `site-${site}`;
          const el = document.getElementById(siteId);
          if (!el) return;

          const siteTitle = el.querySelector('h2');
          if (!siteTitle) return;

          const rect = siteTitle.getBoundingClientRect();
          const titleTop = rect.top;
          const titleBottom = rect.bottom;
          const titleCenter = (titleTop + titleBottom) / 2;

          if (titleBottom > 0 && titleTop < window.innerHeight) {
            let score = 0;

            if (titleTop <= triggerPoint) {
              score = triggerPoint - titleTop;
            } else {
              score = -(titleTop - triggerPoint) * 0.5;
            }

            if (Math.abs(titleCenter - triggerPoint) < 50) {
              score += 100;
            }

            if (score > bestScore) {
              bestScore = score;
              activeSite = site;
            }
          }
        });

        if (!activeSite && sitesList.length > 0) {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          if (scrollTop < 100) {
            activeSite = sitesList[0];
          } else {
            sitesList.forEach(site => {
              if (!activeSite) {
                const siteId = `site-${site}`;
                const el = document.getElementById(siteId);
                if (!el) return;

                const siteTitle = el.querySelector('h2');
                if (!siteTitle) return;

                const rect = siteTitle.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                  activeSite = site;
                }
              }
            });
          }
        }

        // Ne mettre à jour que si le site a changé
        if (activeSite && activeSite !== lastActiveSite) {
          lastActiveSite = activeSite;
          setCurrentSite(activeSite);
        }
      };

      const header = document.querySelector('[class*="headerSection"]');
      const headerHeight = header ? header.offsetHeight : 120;

      const handleScroll = () => {
        if (siteObserversRef.current._scrollTimeout) {
          clearTimeout(siteObserversRef.current._scrollTimeout);
        }
        siteObserversRef.current._scrollTimeout = setTimeout(() => {
          updateCurrentSite();
        }, 200); // Augmenter le debounce pour réduire les re-renders
      };
      
      const handleIntersection = () => {
        if (siteObserversRef.current._observerTimeout) {
          clearTimeout(siteObserversRef.current._observerTimeout);
        }
        siteObserversRef.current._observerTimeout = setTimeout(() => {
          updateCurrentSite();
        }, 150); // Debounce pour l'IntersectionObserver aussi
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });

      updateCurrentSite();

      sitesList.forEach(site => {
        const siteId = `site-${site}`;
        const el = document.getElementById(siteId);
        if (!el) return;

        const siteTitle = el.querySelector('h2');
        if (!siteTitle) return;

        const io = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              handleIntersection();
            }
          });
        }, { 
          root: null, 
          rootMargin: `-${headerHeight + 50}px 0px -50% 0px`, 
          threshold: [0, 0.1, 0.5, 1] 
        });
        
        io.observe(siteTitle);
        siteObserversRef.current.push(io);
      });

      siteObserversRef.current._scrollHandler = handleScroll;
      siteObserversRef.current._resizeHandler = handleScroll;
    };

    const timeoutId = setTimeout(() => {
      const domSites = getRenderedSites();
      const domSitesSet = new Set(domSites);

      let visibleSites = allSitesList.filter(site => domSitesSet.has(site));

      if (visibleSites.length === 0 && domSites.length > 0) {
        visibleSites = sortSites(Array.from(new Set(domSites)));
      }

      initializeObservers(visibleSites);
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      if (siteObserversRef.current._scrollTimeout) {
        clearTimeout(siteObserversRef.current._scrollTimeout);
      }
      if (siteObserversRef.current._observerTimeout) {
        clearTimeout(siteObserversRef.current._observerTimeout);
      }
      siteObserversRef.current.forEach(io => {
        if (io && typeof io.disconnect === 'function') {
          io.disconnect();
        }
      });
      if (siteObserversRef.current._scrollHandler) {
        window.removeEventListener('scroll', siteObserversRef.current._scrollHandler);
      }
      if (siteObserversRef.current._resizeHandler) {
        window.removeEventListener('resize', siteObserversRef.current._resizeHandler);
      }
      siteObserversRef.current = [];
    };
  }, [config, step]);



  // Réinitialiser checkMKSyncInfo et csvImportInfo quand on change de module
  // Ce useEffect doit être avant tous les returns conditionnels
  useEffect(() => {
    if (!config) return;
    const client = config.client;
    if (!client) return;
    // Réinitialiser csvImportInfo si on change de module
    setCsvImportInfo(null);
    
    const moduleOrder = [
      "Serveurs", "Stockage", "Firewall", "Switch", "BorneWifi",
      "Sauvegarde", "Antivirus", "Antispam", "Office365", "NDD",
    ];
    const moduleMap = {
      Serveurs: "serveurs", Stockage: "stockage", Firewall: "firewalls",
      Switch: "switch", BorneWifi: "wifi", Sauvegarde: "sauvegarde",
      Antivirus: "antivirus", Antispam: "antispam", Office365: "office365", NDD: "ndd",
    };
    const activeModules = moduleOrder.filter(moduleName => 
      client?.modules_monitoring?.[moduleName] === true
    );
    const steps = activeModules.map(moduleName => moduleMap[moduleName]);
    
    // Ajouter automatiquement le module "Règles de filtrage" après antispam si Firewall est actif
    if (client?.modules_monitoring?.Firewall === true) {
      const antispamIndex = steps.indexOf("antispam");
      if (antispamIndex !== -1) {
        steps.splice(antispamIndex + 1, 0, "firewallregles");
      } else {
        // Si antispam n'est pas présent, l'ajouter après sauvegarde ou à la fin des modules cybersécurité
        const sauvegardeIndex = steps.indexOf("sauvegarde");
        const antivirusIndex = steps.indexOf("antivirus");
        const insertIndex = antivirusIndex !== -1 ? antivirusIndex + 1 : (sauvegardeIndex !== -1 ? sauvegardeIndex + 1 : steps.length);
        steps.splice(insertIndex, 0, "firewallregles");
      }
    }
    
    steps.push("summary");
    const actualStep = step === 999 ? steps.length - 1 : step;
    const currentModule = steps[actualStep];
    
    // Ne réinitialiser checkMKSyncInfo que si on change vers un module qui ne supporte pas CheckMK
    // Les modules qui supportent CheckMK le mettront à jour eux-mêmes via onSyncAllCheckMKReady
    if (currentModule !== 'serveurs' && currentModule !== 'stockage' && currentModule !== 'firewalls' && currentModule !== 'switch' && currentModule !== 'wifi' && currentModule !== 'sauvegarde' && currentModule !== 'antivirus' && currentModule !== 'ndd') {
      setCheckMKSyncInfo(null);
    }
    // Ne pas réinitialiser checkMKSyncInfo pour les modules qui supportent CheckMK
    // Ils le mettront à jour eux-mêmes une fois leurs mappings chargés
  }, [config, step]);

  // Contrôler l'overflow du body pour éviter le scroll indésirable
  useEffect(() => {
    if (!config || !config.client) {
      // Si pas de config, retirer la classe
      document.body.classList.remove('monitoring-active', 'monitoring-summary-active');
      document.documentElement.classList.remove('monitoring-active', 'monitoring-summary-active');
      return;
    }

    // Recalculer steps et actualStep pour déterminer le module actuel
    const client = config.client;
    const moduleOrder = [
      "Internet",
      "Firewall",
      "Serveurs",
      "Stockage", 
      "Switch",
      "BorneWifi",
      "Antivirus",
      "Antispam",
      "Sauvegarde",
      "Office365",
      "NDD",
    ];
    const moduleMap = {
      Internet: "internet",
      Serveurs: "serveurs", 
      Stockage: "stockage", 
      Firewall: "firewalls",
      Switch: "switch", 
      BorneWifi: "wifi", 
      Sauvegarde: "sauvegarde",
      Antivirus: "antivirus", 
      Antispam: "antispam", 
      Office365: "office365", 
      NDD: "ndd",
    };
    const activeModules = moduleOrder.filter(moduleName => 
      client?.modules_monitoring?.[moduleName] === true
    );
    const calculatedSteps = activeModules.map(moduleName => moduleMap[moduleName]);
    
    // Ajouter automatiquement le module "Règles de filtrage" après antispam si Firewall est actif
    if (client?.modules_monitoring?.Firewall === true) {
      const antispamIndex = calculatedSteps.indexOf("antispam");
      if (antispamIndex !== -1) {
        calculatedSteps.splice(antispamIndex + 1, 0, "firewallregles");
      } else {
        const sauvegardeIndex = calculatedSteps.indexOf("sauvegarde");
        const antivirusIndex = calculatedSteps.indexOf("antivirus");
        const insertIndex = antivirusIndex !== -1 ? antivirusIndex + 1 : (sauvegardeIndex !== -1 ? sauvegardeIndex + 1 : calculatedSteps.length);
        calculatedSteps.splice(insertIndex, 0, "firewallregles");
      }
    }
    
    calculatedSteps.push("summary");
    
    // Calculer l'étape actuelle de manière sécurisée
    let calculatedActualStep = 0;
    if (step === 999) {
      calculatedActualStep = calculatedSteps.length - 1;
    } else if (typeof step === 'number' && step >= 0 && step < calculatedSteps.length) {
      calculatedActualStep = step;
    } else {
      calculatedActualStep = 0;
    }
    
    const currentModule = calculatedSteps[calculatedActualStep] || calculatedSteps[0] || 'summary';
    const isSummary = currentModule === 'summary';

    // Ajouter la classe appropriée au body et html
    if (isSummary) {
      document.body.classList.remove('monitoring-active');
      document.body.classList.add('monitoring-summary-active');
      document.documentElement.classList.remove('monitoring-active');
      document.documentElement.classList.add('monitoring-summary-active');
    } else {
      document.body.classList.remove('monitoring-summary-active');
      document.body.classList.add('monitoring-active');
      document.documentElement.classList.remove('monitoring-summary-active');
      document.documentElement.classList.add('monitoring-active');
    }

    // Nettoyage au démontage
    return () => {
      document.body.classList.remove('monitoring-active', 'monitoring-summary-active');
      document.documentElement.classList.remove('monitoring-active', 'monitoring-summary-active');
    };
  }, [config, step]);

  // Scroll vers le haut quand on change de module (sans réinitialiser les données)
  // Les valeurs (synchro CheckMK, notes, commentaires, stats avancées, syncMode, viewMode) sont conservées.
  useEffect(() => {
    if (config && config.client && step !== undefined) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [step, config]);

  // 🔁 Restaurer la position de scroll quand on revient sur un onglet de monitoring
  useEffect(() => {
    // Ne restaurer que pour le mode onglet (pas pour le plein écran classique "Mon")
    if (isFullscreen) return;
    if (hasRestoredScrollRef.current) return;
    const y =
      typeof initialScrollY === "number" && initialScrollY > 0
        ? initialScrollY
        : 0;

    // Si aucune position enregistrée, ne rien faire de spécial
    if (y === 0) {
      hasRestoredScrollRef.current = true;
      return;
    }

    // Restaurer la position sans animation, avec une légère temporisation
    // pour laisser le temps aux animations / layouts de se terminer.
    const applyScroll = () => {
      window.scrollTo({ top: y, left: 0, behavior: "auto" });
      setScrollY(y);
    };

    // Premier scroll dès que possible
    applyScroll();

    // Deuxième passage après un court délai pour contrer un éventuel scrollTo(0) déclenché ailleurs
    const timeoutId = setTimeout(() => {
      applyScroll();
      hasRestoredScrollRef.current = true;
    }, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [initialScrollY, isFullscreen]);

  if (!gatePassed) {
    // Fonction helper pour extraire config et data d'un document
    const extractDocData = (doc) => {
      let docConfig = null;
      let docData = {};
      
      if (doc.data && doc.data.config && doc.data.data) {
        docConfig = doc.data.config;
        docData = doc.data.data;
      } else if (doc.data && doc.data.data) {
        docData = doc.data.data;
        if (doc.data.data.config) {
          docConfig = doc.data.data.config;
        }
      } else if (doc.config && doc.data) {
        docConfig = doc.config;
        docData = doc.data;
      }
      
      return { docConfig, docData };
    };

    return (
      <MonitoringHome
        clients={clients}
        onNewDocument={(cfg) => {
          // 🧹 Nouveau rapport : toujours repartir du premier step
          // => on supprime le step persistant éventuel pour ce rapport dans localStorage
          try {
            const clientId = cfg?.client?.id || cfg?.clientId || null;
            const docName = cfg?.documentName || null;
            const reportKey = clientId
              ? `${clientId}-${docName || "default"}`
              : (docName || "default");

            const rawSteps = localStorage.getItem("monitoring_steps");
            if (rawSteps && reportKey) {
              const map = JSON.parse(rawSteps);
              if (map && Object.prototype.hasOwnProperty.call(map, reportKey)) {
                delete map[reportKey];
                localStorage.setItem("monitoring_steps", JSON.stringify(map));
              }
            }
          } catch (e) {
            // En cas d'erreur de parsing / quota, on ignore simplement
          }

          // Créer un onglet directement avec le nouveau document
          if (onNavigate) {
            onNavigate("MonitoringDetail", {
              client: cfg.client,
              documentName: cfg.documentName,
              reportPeriod: cfg.client?.reportPeriod,
              data: {},
              gatePassed: true
            });
          } else {
            // Fallback : utiliser l'ancien comportement
            setConfig(cfg);
            setData({});
            setGatePassed(true);
          }
        }}
        onEditDocument={(doc) => {
          // Éditer un document : ouvrir directement dans un onglet
          const { docConfig, docData } = extractDocData(doc);
          
          if (!docConfig) {
            toast.error("❌ Ce document ne contient pas de données valides.");
            return;
          }
          
          if (onNavigate) {
            onNavigate("MonitoringDetail", {
              client: docConfig.client,
              documentName: docConfig.documentName || doc.name,
              reportPeriod: docConfig.client?.reportPeriod || doc.report_period,
              data: docData,
              gatePassed: true
            });
          } else {
            // Fallback : utiliser l'ancien comportement
            setConfig(docConfig);
            setData(docData);
            setGatePassed(true);
          }
        }}
        onViewSummary={(doc) => {
          // Voir le résumé : ouvrir directement dans un onglet au summary
          const { docConfig, docData } = extractDocData(doc);
          
          if (!docConfig) {
            toast.error("❌ Ce document ne contient pas de données valides.");
            return;
          }
          
          if (onNavigate) {
            onNavigate("MonitoringDetail", {
              client: docConfig.client,
              documentName: docConfig.documentName || doc.name,
              reportPeriod: docConfig.client?.reportPeriod || doc.report_period,
              data: docData,
              gatePassed: true,
              goToSummary: true  // Flag pour indiquer qu'on veut aller au summary
            });
          } else {
            // Fallback : utiliser l'ancien comportement
            setConfig(docConfig);
            setData(docData);
            setGatePassed(true);
            setGoToSummaryDirectly(true);
          }
        }}
      />
    );
  }

  if (!config) {
    // Cette condition ne devrait plus être atteinte normalement
    // mais on la garde pour la sécurité
    return null;
  }

  const { client } = config;

  // Mapping des modules de monitoring vers les clés de données
  const moduleMap = {
    Internet: "internet",
    Serveurs: "serveurs",
    Stockage: "stockage", 
    Firewall: "firewalls",
    Switch: "switch",
    BorneWifi: "wifi",
    Sauvegarde: "sauvegarde",
    Antivirus: "antivirus",
    Antispam: "antispam",
    Office365: "office365",
    NDD: "ndd",
  };

  // Ordre des modules pour l'affichage - correspond à l'ordre dans le header
  // Infrastructure : Internet, Firewall, Serveurs, Stockage, Switch, Wifi
  // Cybersécurité : Antivirus, Antispam, FirewallRegles, Sauvegarde
  // Services : Office365, NDD
  const moduleOrder = [
    // Infrastructure
    "Internet",
    "Firewall",
    "Serveurs",
    "Stockage", 
    "Switch",
    "BorneWifi",
    // Cybersécurité
    "Antivirus",
    "Antispam",
    "Sauvegarde",
    // Services
    "Office365",
    "NDD",
  ];

  // Filtrer les modules de monitoring activés pour ce client
  const activeModules = moduleOrder.filter(moduleName => 
    client?.modules_monitoring?.[moduleName] === true
  );

  // Créer les étapes basées sur les modules activés
  const steps = activeModules.map(moduleName => moduleMap[moduleName]);
  
  // Ajouter automatiquement le module "Règles de filtrage" après Antispam si Firewall est actif
  // L'ordre dans le header est : Antivirus, Antispam, FirewallRegles, Sauvegarde
  if (client?.modules_monitoring?.Firewall === true) {
    const antispamIndex = steps.indexOf("antispam");
    if (antispamIndex !== -1) {
      // Insérer après Antispam
      steps.splice(antispamIndex + 1, 0, "firewallregles");
    } else {
      // Si antispam n'est pas présent, l'insérer après Antivirus ou avant Sauvegarde
      const antivirusIndex = steps.indexOf("antivirus");
      const sauvegardeIndex = steps.indexOf("sauvegarde");
      if (antivirusIndex !== -1) {
        steps.splice(antivirusIndex + 1, 0, "firewallregles");
      } else if (sauvegardeIndex !== -1) {
        steps.splice(sauvegardeIndex, 0, "firewallregles");
      } else {
        // Si ni Antivirus ni Sauvegarde, l'ajouter à la fin des modules cybersécurité
        steps.push("firewallregles");
      }
    }
  }
  
  steps.push("summary"); // Ajouter l'étape de résumé

  // Si step est 999, on va directement au summary
  const actualStep = step === 999 ? steps.length - 1 : step;
  const currentModule = steps[actualStep];
  const keyForMotion = currentModule || "module";

  const goTo = (dir) => {
    const next = actualStep + dir;
    if (next >= 0 && next < steps.length) updateStep(next);
  };

  const handleBack = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (actualStep === 0) {
      // Retour à l'intro gate depuis le premier module
      setConfig(null);
      setData({});
      setGatePassed(false);
    } else {
      goTo(-1);
    }
  };

  const handleNext = async () => {
    const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    if (currentModule === "serveurs") {
      const serveurs = client?.equipements?.Serveurs || [];
      const isInvalid = serveurs.some((srv) =>
        ["CPU", "C:/", "RAM", "UPTIME"].some((service) => {
          const entry = data.serveurs?.[srv.nom]?.[service] || {};
          const total =
            parse(entry.ok, 100) +
            parse(entry.warn, 0) +
            parse(entry.crit, 0);
          return total !== 100;
        })
      );
      if (isInvalid) {
        toast.error("❗ Une ou plusieurs lignes serveurs ne totalisent pas 100%");
        return;
      }
    }

    if (currentModule === "stockage") {
      const stockages = client?.equipements?.NAS || [];
      const isInvalid = stockages.some((nas) =>
        ["CPU", "STOCKAGE", "RAM", "UPTIME"].some((service) => {
          const entry = data.stockage?.[nas.nom]?.[service] || {};
          const total =
            parse(entry.ok, 100) +
            parse(entry.warn, 0) +
            parse(entry.crit, 0);
          return total !== 100;
        })
      );
      if (isInvalid) {
        toast.error("❗ Une ou plusieurs lignes stockage ne totalisent pas 100%");
        return;
      }
    }

    if (currentModule === "firewalls") {
      const firewalls = client?.equipements?.Firewalls || client?.equipements?.firewalls || [];
      const isInvalid = firewalls.some((fw) =>
        ["CPU", "RAM", "UPTIME", "TEMP"].some((service) => {
          const entry = data.firewalls?.[fw.nom]?.[service] || {};
          const total =
            parse(entry.ok, 100) +
            parse(entry.warn, 0) +
            parse(entry.crit, 0);
          return total !== 100;
        })
      );
      if (isInvalid) {
        toast.error("❗ Une ou plusieurs lignes firewalls ne totalisent pas 100%");
        return;
      }
    }

    if (currentModule === "switch") {
      const switches = client?.equipements?.Switch || [];
      const isInvalid = switches.some((sw) =>
        ["CPU", "RAM", "TRAFIC", "UPTIME"].some((service) => {
          const entry = data.switch?.[sw.nom]?.[service] || {};
          const total =
            parse(entry.ok, 100) +
            parse(entry.warn, 0) +
            parse(entry.crit, 0);
          return total !== 100;
        })
      );
      if (isInvalid) {
        toast.error("❗ Une ou plusieurs lignes switch ne totalisent pas 100%");
        return;
      }
    }

    if (currentModule === "wifi") {
      const wifis = client?.equipements?.BorneWifi || [];
      const isInvalid = wifis.some((ap) =>
        ["CPU", "RAM", "TRAFIC", "UPTIME"].some((service) => {
          const entry = data.wifi?.[ap.nom]?.[service] || {};
          const total =
            parse(entry.ok, 100) +
            parse(entry.warn, 0) +
            parse(entry.crit, 0);
          return total !== 100;
        })
      );
      if (isInvalid) {
        toast.error("❗ Une ou plusieurs lignes WiFi ne totalisent pas 100%");
        return;
      }
    }



    if (currentModule === "antivirus") {
      // Validation supprimée - permet de passer sans renseigner les menaces bloquées
    }

    if (currentModule === "antispam") {
      const antispamData = data.antispam || {};
      const requiredFields = ["routés", "quarantaine", "supprimés"];
      const parse = (val) => val === "" || val === undefined || isNaN(Number(val));

      const missingCoreField = requiredFields.some((field) => parse(antispamData[field]));

      if (missingCoreField) {
        toast.error("❗ Merci de renseigner les quantitatifs de mails routés, en quarantaine et supprimés.");
        return;
      }

      const customTypes = antispamData.types || [];
      const hasInvalidType = customTypes.some(
        (type) => !type.label?.trim() || parse(type.count)
      );

      if (hasInvalidType) {
        toast.error("❗ Merci de compléter tous les types de mails personnalisés ajoutés (libellé et quantité).");
        return;
      }
    }

    if (currentModule === "office365") {
      // Validation supprimée - permet de passer sans CSV
      // L'import de CSV est maintenant optionnel
    }


    goTo(1);
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const handleQuit = () => {
    setShowQuitModal(true);
  };

  const confirmQuit = () => {
    setShowQuitModal(false);
    setConfig(null);
    setData({});
    setGatePassed(false);
    // On ne supprime plus le step persistant : si l'utilisateur revient sur ce rapport,
    // il sera replacé sur la dernière étape connue
    setStep(0);
  };

  const confirmReset = async () => {
    setShowResetModal(false);
    await resetComplet();
    // Retour à l'intro gate après reset
    setGatePassed(false);
  };

  // Fonction pour obtenir le titre du module actuel
  const getModuleTitle = (moduleKey) => {
    const titles = {
      internet: "Internet",
      serveurs: "Serveurs",
      stockage: "Stockage",
      firewalls: "Firewalls",
      switch: "Switch",
      wifi: "Borne WiFi",
      sauvegarde: "Sauvegarde",
      antivirus: "Antivirus",
      antispam: "Antispam",
      office365: "Office 365",
      ndd: "Noms de domaine",
      firewallregles: "Règles de filtrage",
      summary: "Résumé"
    };
    return titles[moduleKey] || moduleKey;
  };

  // Fonction pour calculer le pourcentage de progression
  const getProgressPercent = () => {
    return Math.round(((actualStep + 1) / steps.length) * 100);
  };

  // Fonction pour valider le module actuel
  const isModuleValid = () => {
    // Logique de validation spécifique à chaque module
    // Pour l'instant, on retourne true (à implémenter selon les besoins)
    return true;
  };

  // Contenu principal (sans wrapper plein écran)
  const mainContent = (
      <div className={styles.renderContainer}>
        {/* Header avec navigation */}
        <MonitoringHeader
          clientName={config?.client?.name || config?.client?.nom || ''}
          title={getModuleTitle(currentModule)}
          stepLabel={`Étape ${actualStep + 1} sur ${steps.length}`}
          progressPercent={getProgressPercent()}
          reportStartDate={config?.client?.checkmkPeriod?.start_time || config?.client?.reportStartDate || null}
          reportEndDate={config?.client?.checkmkPeriod?.end_time || config?.client?.reportEndDate || null}
          modules={steps}
          currentModule={currentModule}
          currentSite={currentModule === 'ndd' ? null : currentSite}
          sites={currentModule === 'ndd' ? [] : sites}
          summaryActions={currentModule === 'summary' ? summaryHeaderActions : null}
          checkMKSyncInfo={(currentModule === 'serveurs' || currentModule === 'stockage' || currentModule === 'firewalls' || currentModule === 'switch' || currentModule === 'wifi' || currentModule === 'sauvegarde' || currentModule === 'antivirus' || currentModule === 'ndd') ? checkMKSyncInfo : null}
          csvImportInfo={(currentModule === 'antispam' || currentModule === 'firewallregles') ? csvImportInfo : null}
          isFullscreen={isFullscreen}
          onSelectSite={(site) => {
            // Fonction pour scroller vers le site
            const scrollToSite = () => {
              const siteId = `site-${site}`;
              
              // Chercher l'élément
              let el = document.getElementById(siteId);
              
              // Si pas trouvé, essayer querySelector
              if (!el) {
                el = document.querySelector(`[id="${siteId}"]`);
              }
              
              // Si toujours pas trouvé, chercher par le texte du h2
              if (!el) {
                const allH2s = document.querySelectorAll('h2');
                for (const h2 of allH2s) {
                  if (h2.textContent && h2.textContent.includes(site)) {
                    el = h2.closest('[id^="site-"]');
                    if (el) break;
                  }
                }
              }
              
              if (!el) {
                return false;
              }

              // Trouver le titre h2
              const siteTitle = el.querySelector('h2');
              if (!siteTitle) {
                return false;
              }

              // Trouver le conteneur scrollable (fullscreenWrapper)
              const scrollContainer = document.querySelector('[class*="fullscreenWrapper"]') || window;
              
              // Obtenir la hauteur du header
              const header = document.querySelector('[class*="headerSection"]');
              const headerHeight = header ? header.offsetHeight : 120;
              const offset = headerHeight + 40; // Espace pour bien voir le nom du site
              
              // Obtenir la position actuelle du titre
              const rect = siteTitle.getBoundingClientRect();
              
              // Obtenir la position de scroll actuelle du conteneur
              let currentScroll = 0;
              if (scrollContainer === window) {
                currentScroll = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
              } else {
                currentScroll = scrollContainer.scrollTop || 0;
              }
              
              // Calculer la position relative au conteneur scrollable
              let titleTop = 0;
              if (scrollContainer === window) {
                // Position absolue dans le document
                titleTop = rect.top + currentScroll;
              } else {
                // Position relative au conteneur scrollable
                const containerRect = scrollContainer.getBoundingClientRect();
                titleTop = rect.top - containerRect.top + currentScroll;
              }
              
              // Calculer la position cible : titre moins header moins offset
              const targetScroll = Math.max(0, titleTop - offset);
              
              // Scroller sur le bon conteneur
              if (scrollContainer === window) {
                window.scrollTo({
                  top: targetScroll,
                  behavior: "smooth"
                });
              } else {
                scrollContainer.scrollTo({
                  top: targetScroll,
                  behavior: "smooth"
                });
              }
              
              return true;
            };

            // Essayer immédiatement
            if (!scrollToSite()) {
              // Réessayer après un délai
              setTimeout(() => {
                scrollToSite();
              }, 200);
            }
          }}
          onSelectModule={(moduleName) => {
            const index = steps.indexOf(moduleName);
            if (index !== -1) {
              updateStep(index);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          onPrev={handleBack}
          onNext={handleNext}
          onReset={handleReset}
          onQuit={handleQuit}
          hasPrev={actualStep > 0}
          hasNext={actualStep < steps.length - 1}
          isLastItem={actualStep === steps.length - 1}
          isFormValid={isModuleValid()}
          nextLabel={actualStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
          prevLabel="Précédent"
          resetLabel="Réinitialiser"
          nextDisabled={!isModuleValid()}
        />

      {currentModule === "summary" ? (
        <div>
          <MonitoringSummary
            config={config}
            data={data}
            onBack={handleBack}
            onActionsReady={setSummaryHeaderActions}
            resetFormData={() => {
              setConfig(null);
              setData({});
              if (refreshDraftStatus) refreshDraftStatus(); // ✅ comme en synthèse
            }}
          />
        </div>
      ) : (
        <div className={styles.moduleScrollContainer}>
          {currentModule === "internet" && (
            <div>
              <MonitoringModuleInternet
                config={config}
                setConfig={setConfig}
                data={data.internet || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, internet: newData }))
                }
              />
            </div>
          )}

          {currentModule === "serveurs" && (
            <div>
              <MonitoringModuleServeurs
                config={config}
                setConfig={setConfig}
                data={data.serveurs || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, serveurs: newData }))
                }
                onSyncAllCheckMKReady={(info) => setCheckMKSyncInfo(info)}
              />
            </div>
          )}

          {currentModule === "stockage" && (
            <div>
              <MonitoringModuleStockage
                config={config}
                setConfig={setConfig}
                data={data.stockage || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, stockage: newData }))
                }
                onSyncAllCheckMKReady={(info) => {
                  if (currentModule === 'stockage') {
                    setCheckMKSyncInfo(info);
                  }
                }}
              />
            </div>
          )}

          {currentModule === "firewalls" && (
            <div>
              <MonitoringModuleFirewalls
                config={config}
                setConfig={setMonitoringConfig}
                data={data.firewalls || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, firewalls: newData }))
                }
                onSyncAllCheckMKReady={(info) => setCheckMKSyncInfo(info)}
              />
            </div>
          )}

          {currentModule === "switch" && (
            <div>
              <MonitoringModuleSwitch
                config={config}
                setConfig={setConfig}
                data={data.switch || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, switch: newData }))
                }
                onSyncAllCheckMKReady={(info) => {
                  if (currentModule === 'switch') {
                    setCheckMKSyncInfo(info);
                  }
                }}
              />
            </div>
          )}

          {currentModule === "wifi" && (
            <div>
              <MonitoringModuleWifi
                config={config}
                setConfig={setConfig}
                data={data.wifi || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, wifi: newData }))
                }
                onSyncAllCheckMKReady={(info) => {
                  if (currentModule === 'wifi') {
                    setCheckMKSyncInfo(info);
                  }
                }}
              />
            </div>
          )}

          {currentModule === "sauvegarde" && (
            <div>
              <MonitoringModuleSauvegarde
                config={config}
                setConfig={setConfig}
                data={data.sauvegarde || []}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, sauvegarde: newData }))
                }
                onSyncAllCheckMKReady={(info) => {
                  if (info) {
                    setCheckMKSyncInfo(info);
                  }
                }}
              />
            </div>
          )}

          {currentModule === "antivirus" && (
            <div>
              <MonitoringModuleAntivirus
                config={config}
                setConfig={setMonitoringConfig}
                data={data.antivirus || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, antivirus: newData }))
                }
                onSyncAllCheckMKReady={(info) => {
                  if (info) {
                    setCheckMKSyncInfo(info);
                  }
                }}
              />
            </div>
          )}

          {currentModule === "antispam" && (
            <div>
              <MonitoringModuleAntispam
                config={config}
                setConfig={setMonitoringConfig}
                data={data.antispam || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, antispam: newData }))
                }
                onCSVImportReady={(info) => {
                  if (currentModule === 'antispam') {
                    setCsvImportInfo(info);
                  }
                }}
              />
            </div>
          )}

          {currentModule === "firewallregles" && (
            <div>
              <MonitoringModuleFirewallRegles
                config={config}
                data={data.firewallregles || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, firewallregles: newData }))
                }
                onCSVImportReady={(info) => {
                  if (currentModule === 'firewallregles') {
                    setCsvImportInfo(info);
                  }
                }}
              />
            </div>
          )}

          {currentModule === "ndd" && (
            <div>
              <MonitoringModuleNDD
                config={config}
                setConfig={setConfig}
                data={data.ndd || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, ndd: newData }))
                }
                onSyncAllCheckMKReady={(info) => {
                  if (currentModule === 'ndd') {
                    setCheckMKSyncInfo(info);
                  }
                }}
              />
            </div>
          )}

          {currentModule === "office365" && (
            <div>
              <MonitoringModuleO365
                config={config}
                data={data.office365 || {}}
                setData={(newData) =>
                  setData((prev) => ({ ...prev, office365: newData }))
                }
                onUpdateConfig={(updatedConfig) => {
                  setConfig(updatedConfig);
                  // Mettre à jour aussi les données pour maintenir la cohérence
                  setData((prev) => ({
                    ...prev,
                    office365: updatedConfig.client.equipements?.Office365 || {}
                  }));
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmation pour quitter */}
      <ConfirmationModal
        isOpen={showQuitModal}
        onConfirm={confirmQuit}
        onCancel={() => setShowQuitModal(false)}
        title="Quitter le rapport ?"
        message="Attention ! Si vous quittez maintenant, toutes vos modifications non sauvegardées seront perdues. Êtes-vous sûr de vouloir quitter ?"
        confirmLabel="Oui, quitter"
        cancelLabel="Annuler"
        confirmColor="danger"
      />

      {showResetModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3>⚠️ Réinitialiser le rapport ?</h3>
              <p>Cette action supprimera toutes les données du rapport en cours.</p>
              <div className={styles.modalActions}>
                <button className={styles.cancel} onClick={() => setShowResetModal(false)}>
                  Annuler
                </button>
                <button
                  className={styles.confirm}
                  onClick={confirmReset}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
  );

  // En mode plein écran (accès classique via "Mon"), on garde le wrapper actuel
  if (isFullscreen) {
    return (
      <MonitoringFullscreenWrapper onExit={() => {
        setConfig(null);
        setData({});
        setGatePassed(false);
      }}>
        {mainContent}
      </MonitoringFullscreenWrapper>
    );
  }

  // En mode onglet, on rend simplement le contenu sans wrapper plein écran
  return mainContent;
};

export default MonitoringRenderContent;
