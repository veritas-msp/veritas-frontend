import React, { useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import {
  mdiOfficeBuilding,
  mdiCertificate,
  mdiNas,
  mdiServerNetworkOutline,
  mdiHarddisk,
  mdiVhs
} from "@mdi/js";
import { FaHdd } from "react-icons/fa";
import { HardDrive } from "lucide-react";
import { BsCpu } from "react-icons/bs";
import { PiMemory, PiListMagnifyingGlassLight } from "react-icons/pi";
import { TbClockUp } from "react-icons/tb";
import { MdOutlineWifiTetheringError, MdOutlineNetworkCheck } from "react-icons/md";
import { scoreToLetter, scoreToColor } from "../../../utils/gradeUtils";
import styles from "./ServersSummaryCards.module.css";

const defaultServices = ["CPU", "MEMOIRE", "DISQUE", "UPTIME"];
const SERVICE_LABELS = {
  CPU: "CPU",
  MEMOIRE: "RAM",
  DISQUE: "STOCKAGE",
  UPTIME: "Uptime"
};
const SERVICE_ICONS = {
  CPU: BsCpu,
  MEMOIRE: PiMemory,
  DISQUE: FaHdd,
  UPTIME: TbClockUp
};

const SCORE_LABELS = {
  A: "Excellente",
  B: "Bonne",
  C: "Moyenne",
  D: "Fragile",
  E: "Critique",
  F: "Défaillante"
};

// Formatage simple de date d'expiration
const formatExpirationDate = (rawDate) => {
  if (!rawDate) return null;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return String(rawDate);
  }
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Conversion capacité en Go
const convertCapacityToGo = (capacity) => {
  if (!capacity) return 0;
  const capacityStr = capacity.toString().toUpperCase();
  if (capacityStr.includes("TB")) {
    const value = parseFloat(capacityStr.replace("TB", ""));
    return Math.round(value * 1024);
  }
  if (capacityStr.includes("GB") || capacityStr.includes("GO")) {
    const value = parseFloat(capacityStr.replace(/GB|GO/, ""));
    return Math.round(value);
  }
  if (capacityStr.includes("MB")) {
    const value = parseFloat(capacityStr.replace("MB", ""));
    return Math.round(value / 1024);
  }
  const n = parseFloat(capacityStr);
  return Number.isNaN(n) ? 0 : Math.round(n);
};

// Formater la capacité en Go ou To
const formatCapacity = (goValue) => {
  if (!goValue || goValue === 0) return { value: 0, unit: "Go", display: "0 Go" };
  if (goValue >= 1024) {
    const toValue = (goValue / 1024).toFixed(2);
    return { value: goValue, unit: "To", display: `${parseFloat(toValue)} To` };
  }
  return { value: goValue, unit: "Go", display: `${goValue} Go` };
};

const parsePercentValue = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const buildServiceMetrics = (storageData = {}) => {
  return defaultServices.map((service) => {
    const serviceData = storageData[service] || {};
    return {
      service: service,
      label: SERVICE_LABELS[service] || service,
      ok: parsePercentValue(serviceData.ok ?? serviceData.OK, 100),
      warn: parsePercentValue(serviceData.warn ?? serviceData.WARN, 0),
      crit: parsePercentValue(serviceData.crit ?? serviceData.CRIT, 0)
    };
  });
};

const getServicesCount = (storageData = {}, fallback = 0) => {
  const checkmkServicesTotal = storageData?.checkmkData?.serviceInfo?.total;
  if (typeof checkmkServicesTotal === "number" && checkmkServicesTotal >= 0) {
    return checkmkServicesTotal;
  }
  const checkmkServicesList = storageData?.checkmkData?.services;
  if (Array.isArray(checkmkServicesList)) {
    return checkmkServicesList.length;
  }
  const servicesList = storageData?.services;
  if (Array.isArray(servicesList)) {
    return servicesList.length;
  }
  return fallback;
};

const getEventsCountValue = (storageData = {}) => {
  if (typeof storageData.eventsCount === "number") {
    return storageData.eventsCount;
  }
  if (Array.isArray(storageData.eventsData)) {
    return storageData.eventsData.length;
  }
  const checkmkEvents = storageData?.checkmkData?.events;
  if (Array.isArray(checkmkEvents)) {
    return checkmkEvents.length;
  }
  return null;
};

const getAvailabilityValue = (storageData = {}) => {
  const raw =
    storageData?.availabilityData?.up ??
    storageData?.availability?.up ??
    storageData?.availability;
  if (raw === null || raw === undefined) return null;
  const numeric = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : null;
};

// Fonction pour calculer le score de santé d'un stockage (identique à getStorageHealthScore de Stockage.js)
const computeStorageHealthScore = (storageName, storageConfig, storageData = {}) => {
  // Vérifier si le stockage est mappé CheckMK
  const isMapped = Boolean(storageConfig?.checkmk_host_name);
  const hasSyncData = Boolean(storageData?.lastSyncDate);

  // Si mappé mais pas encore synchronisé, retourner null
  if (isMapped && !hasSyncData) {
    return null;
  }

  if (!storageData) return null;
  
  const servicesCoverageWeight = isMapped ? 0.15 : 0;
  const eventsWeight = isMapped ? 0.15 : 0;
  const availabilityWeight = isMapped ? 0.15 : 0;
  const diskWeight = isMapped ? 0.25 : 0.4;
  const spaceWeight = isMapped ? 0.15 : 0.3;
  const serviceTableWeight = isMapped ? 0.15 : 0.3;
  let totalScore = 0;
  let weightSum = 0;

  // Score basé sur la couverture des services CheckMK
  if (servicesCoverageWeight > 0) {
    let servicesCoverageScore = 100;
    const checkmkData = storageData?.checkmkData;
    const servicesInfo = checkmkData?.serviceInfo;
    const totalServices = servicesInfo?.total ?? checkmkData?.services?.length ?? 0;
    const expectedServices = defaultServices.length || 1;
    if (totalServices > 0) {
      const ratio = Math.min(1, totalServices / expectedServices);
      servicesCoverageScore = Math.round(ratio * 100);
    } else if (checkmkData) {
      servicesCoverageScore = 30;
    }
    totalScore += servicesCoverageScore * servicesCoverageWeight;
    weightSum += servicesCoverageWeight;
  }

  // Score basé sur les disques
  const diskStates = storageData.diskStates || {};
  const currentDisks = parseInt(storageConfig?.nbDisquesActuels) || 0;
  let okCount = 0;
  let warnCount = 0;
  let critCount = 0;
  
  if (currentDisks > 0 && diskWeight > 0) {
    for (let i = 0; i < currentDisks; i++) {
      const state = diskStates[i] || 'ok';
      if (state === 'ok') okCount++;
      else if (state === 'warn') warnCount++;
      else if (state === 'crit') critCount++;
    }
    
    const okRatio = okCount / currentDisks;
    const warnRatio = warnCount / currentDisks;
    const critRatio = critCount / currentDisks;
    let diskScore = (okRatio * 100) + (warnRatio * 40) + (critRatio * 0);
    
    if (critRatio > 0) {
      diskScore = Math.min(diskScore, 30);
    } else if (warnRatio > 0) {
      diskScore = Math.min(diskScore, 60);
    }
    
    totalScore += diskScore * diskWeight;
    weightSum += diskWeight;
  }

  // Score basé sur l'espace disponible
  const usedSpace = parseInt(storageData.espaceUtiliseGo) || 0;
  const totalSpace = convertCapacityToGo(storageConfig?.capacite);
  if (totalSpace > 0 && usedSpace >= 0 && spaceWeight > 0) {
    const usagePercentage = (usedSpace / totalSpace) * 100;
    let spaceScore = 100;
    
    if (usagePercentage >= 90) {
      spaceScore = 0;
    } else if (usagePercentage >= 75) {
      spaceScore = 50;
    } else if (usagePercentage >= 50) {
      spaceScore = 75;
    } else {
      spaceScore = 100;
    }
    
    totalScore += spaceScore * spaceWeight;
    weightSum += spaceWeight;
  }

  // Score basé sur les événements
  let hasEvents = false;
  let eventCount = 0;
  if (eventsWeight > 0) {
    eventCount = storageData.eventsCount || 0;
    if (eventCount > 0) {
      hasEvents = true;
    }
    
    let eventScore = 100;
    if (eventCount === 0) {
      eventScore = 100;
    } else if (eventCount === 1) {
      eventScore = 70;
    } else if (eventCount <= 3) {
      eventScore = 50;
    } else if (eventCount <= 6) {
      eventScore = 30;
    } else {
      eventScore = 15;
    }
    
    totalScore += eventScore * eventsWeight;
    weightSum += eventsWeight;
  }

  // Score basé sur la disponibilité
  let availabilityValue = 100;
  let hasLowAvailability = false;
  if (availabilityWeight > 0) {
    const availabilityData = storageData?.availabilityData;
    if (availabilityData) {
      availabilityValue = parseFloat(availabilityData.up || 0);
      if (availabilityValue < 95) {
        hasLowAvailability = true;
      }
    }
    let availabilityScore = availabilityValue;
    if (availabilityValue < 80) {
      availabilityScore = Math.min(availabilityValue, 50);
    } else if (availabilityValue < 95) {
      availabilityScore = Math.min(availabilityValue, 70);
    }
    totalScore += availabilityScore * availabilityWeight;
    weightSum += availabilityWeight;
  }

  // Score basé sur la table de disponibilité des services
  if (serviceTableWeight > 0) {
    let serviceTableScore = 0;
    let serviceTableCount = 0;
    
    defaultServices.forEach(service => {
      const serviceData = storageData[service] || {};
      const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
      
      const ok = parse(serviceData.ok, 100);
      const warn = parse(serviceData.warn, 0);
      const crit = parse(serviceData.crit, 0);
      
      const serviceTotal = ok + warn + crit;
      if (serviceTotal > 0) {
        const okRatio = ok / serviceTotal;
        const warnRatio = warn / serviceTotal;
        const critRatio = crit / serviceTotal;
        
        let critScore = 0;
        if (critRatio > 0.1) {
          critScore = 0;
        } else if (critRatio > 0.05) {
          critScore = critRatio * 15;
        } else {
          critScore = critRatio * 30;
        }
        
        serviceTableScore += (okRatio * 100) + (warnRatio * 50) + critScore;
        serviceTableCount++;
      }
    });
    
    if (serviceTableCount > 0) {
      serviceTableScore = serviceTableScore / serviceTableCount;
    } else {
      serviceTableScore = 100;
    }
    
    totalScore += serviceTableScore * serviceTableWeight;
    weightSum += serviceTableWeight;
  }

  if (weightSum === 0) return null;
  
  let finalScore = Math.round(totalScore / weightSum);

  // APPLICATION DE PLAFONDS CRITIQUES
  // Si disque CRITIQUE : score maximum = 30
  if (critCount > 0) {
    finalScore = Math.min(finalScore, 30);
  }
  // Si disque WARNING : score maximum = 60
  else if (warnCount > 0) {
    finalScore = Math.min(finalScore, 60);
  }

  // Si disponibilité < 80% : score maximum = 50
  if (isMapped && availabilityValue < 80) {
    finalScore = Math.min(finalScore, 50);
  }
  // Si disponibilité < 95% : score maximum = 70
  else if (isMapped && availabilityValue < 95) {
    finalScore = Math.min(finalScore, 70);
  }
  
  // Si événements > 0 : score maximum = 70
  if (isMapped && hasEvents && finalScore > 70) {
    finalScore = Math.min(finalScore, 70);
  }
  // Si événements >= 4 : score maximum = 50
  if (isMapped && eventCount >= 4 && finalScore > 50) {
    finalScore = Math.min(finalScore, 50);
  }
  
  return finalScore;
};

const getStorageStatus = (storageName, storageData = {}) => {
  if (!storageData) return { status: "unknown", color: "#6b7280" };

  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;

  defaultServices.forEach((service) => {
    const serviceData = storageData[service] || {};
    const parse = (val, fallback) => (isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10));
    totalCrit += parse(serviceData.crit, 0);
    totalWarn += parse(serviceData.warn, 0);
    totalOk += parse(serviceData.ok, 100);
  });

  const avgCrit = totalCrit / defaultServices.length;
  const avgWarn = totalWarn / defaultServices.length;
  const avgOk = totalOk / defaultServices.length;

  if (avgCrit > 20) return { status: "critical", color: "#ef4444" };
  if (avgCrit > 10 || avgWarn > 30) return { status: "warning", color: "#f59e0b" };
  if (avgOk >= 90) return { status: "excellent", color: "#10b981" };
  if (avgOk >= 70) return { status: "good", color: "#84cc16" };
  return { status: "poor", color: "#eab308" };
};

const getStorageLetterFromStatus = (status) => {
  switch (status) {
    case "excellent":
      return "A";
    case "good":
      return "B";
    case "poor":
      return "C";
    case "warning":
      return "D";
    case "critical":
      return "E";
    default:
      return "?";
  }
};

const renderPieChart = (ok, warn, crit, size = 32, isGreyed = false) => {
  const total = ok + warn + crit;
  if (total === 0) {
    ok = 100;
    warn = 0;
    crit = 0;
  }
  
  const okPercent = (ok / total) * 100;
  const warnPercent = (warn / total) * 100;
  const critPercent = (crit / total) * 100;
  
  const radius = size / 2 - 2;
  const center = size / 2;
  
  // Couleurs grises si le stockage n'est pas mappé
  const okColor = isGreyed ? "#9ca3af" : "#10b981";
  const warnColor = isGreyed ? "#6b7280" : "#f59e0b";
  const critColor = isGreyed ? "#4b5563" : "#ef4444";
  
  const getArcPath = (startPercent, endPercent) => {
    const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };
  
  const okStart = 0;
  const okEnd = okPercent;
  const warnStart = okEnd;
  const warnEnd = warnStart + warnPercent;
  const critStart = warnEnd;
  const critEnd = critStart + critPercent;
  
  if (okPercent === 100 && warnPercent === 0 && critPercent === 0) {
    return (
      <svg width={size} height={size} className={styles.pieChart}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={okColor}
          fillOpacity="1"
        />
      </svg>
    );
  }
  
  if (warnPercent === 100 && okPercent === 0 && critPercent === 0) {
    return (
      <svg width={size} height={size} className={styles.pieChart}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={warnColor}
        />
      </svg>
    );
  }
  
  if (critPercent === 100 && okPercent === 0 && warnPercent === 0) {
    return (
      <svg width={size} height={size} className={styles.pieChart}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={critColor}
        />
      </svg>
    );
  }
  
  return (
    <svg width={size} height={size} className={styles.pieChart}>
      {okPercent > 0 && (
        <path
          d={getArcPath(okStart, okEnd)}
          fill={okColor}
          fillOpacity="1"
        />
      )}
      {warnPercent > 0 && (
        <path
          d={getArcPath(warnStart, warnEnd)}
          fill={warnColor}
        />
      )}
      {critPercent > 0 && (
        <path
          d={getArcPath(critStart, critEnd)}
          fill={critColor}
        />
      )}
    </svg>
  );
};

// Composant pour afficher les disques visuellement
const DiskVisual = ({ current, max, diskStates = {} }) => {
    const circles = [];
    
    for (let i = 0; i < max; i++) {
        const isFilled = i < current;
    const diskState = diskStates[i] || 'ok'; // 'ok', 'warn', 'crit'
    
    let diskColor = '#9ca3af'; // Gris par défaut (vide)
    if (isFilled) {
      if (diskState === 'crit') {
        diskColor = '#ef4444'; // Rouge
      } else if (diskState === 'warn') {
        diskColor = '#f59e0b'; // Orange
      } else {
        diskColor = '#10b981'; // Vert
      }
    }
    
        circles.push(
            <div
                key={i}
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: diskColor,
          border: isFilled ? 'none' : '1px solid #d1d5db',
          display: 'inline-block',
          marginRight: '4px'
        }}
        title={`Disque ${i + 1} ${isFilled ? `(${diskState.toUpperCase()})` : '(vide)'}`}
            />
        );
    }
    
    return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', paddingTop: '3px' }}>
            {circles}
        </div>
    );
};

// Composant pour la barre de progression du stockage
const StorageProgress = ({ used, total, unit = "Go" }) => {
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
    const remaining = total - used;
    
  let progressColor = "#10b981"; // Vert
    if (percentage >= 90) {
    progressColor = "#ef4444"; // Rouge
    } else if (percentage >= 75) {
    progressColor = "#f59e0b"; // Orange
    } else if (percentage >= 50) {
    progressColor = "#eab308"; // Jaune
    }
    
    return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    }}>
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div 
          style={{ 
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: progressColor,
            transition: 'width 0.3s ease'
          }}
                />
            </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.7rem',
        color: '#6b7280'
      }}>
        <span>{remaining} {unit} disponible</span>
        <span style={{ fontWeight: '600' }}>{percentage}%</span>
            </div>
        </div>
    );
};

// Fonction pour obtenir l'icône selon le type de stockage
const getStorageTypeIcon = (storageType) => {
  switch (storageType) {
    case 'NAS':
      return mdiNas;
    case 'SAN':
      return mdiServerNetworkOutline;
    case 'DISQUE':
    case 'Disque dur externe':
      return mdiHarddisk;
    case 'RDX':
    case 'Robot de sauvegarde':
      return mdiVhs;
    default:
      return mdiNas;
  }
};

const StockageSummary = ({ data = {}, config, selectedSites = [] }) => {
    const { theme } = useTheme();
  const rawStockages = useMemo(() => {
    const list1 = config?.client?.equipements?.Stockage || [];
    const nasList = config?.client?.equipements?.NAS || [];
    const sanList = config?.client?.equipements?.SAN || [];
    return [...list1, ...nasList, ...sanList].filter(Boolean);
  }, [config]);
  
  // Les données sont dans data directement (data[storageName])
  // data correspond à data.stockage passé depuis MonitoringSummary
  const storageData = data || {};

  // Filtrer par sites sélectionnés
  const filteredStorages = useMemo(() => {
    if (selectedSites && selectedSites.length > 0) {
      return rawStockages.filter((stg) => {
        const equipmentSite = stg?.site ? String(stg.site).trim() : null;
        const siteToCheck = equipmentSite || "Sans site";
        return selectedSites.includes(siteToCheck);
      });
    }
    return rawStockages;
  }, [rawStockages, selectedSites]);

  // Grouper par site
  const groupedBySite = useMemo(() => {
    const grouped = filteredStorages.reduce((acc, storage) => {
      const siteName = storage.site || "Sans site";
      if (!acc[siteName]) acc[siteName] = [];
      acc[siteName].push(storage);
      return acc;
    }, {});

    // Trier chaque groupe par type puis nom
    // Ordre : SAN (1), NAS (2), Disque dur externe/DISQUE (3), Robot de sauvegarde/RDX (4)
    Object.keys(grouped).forEach((siteName) => {
      grouped[siteName].sort((a, b) => {
        const getTypeOrder = (type) => {
          if (type === 'SAN') return 1;
          if (type === 'NAS') return 2;
          if (type === 'Disque dur externe' || type === 'DISQUE') return 3;
          if (type === 'Robot de sauvegarde' || type === 'RDX') return 4;
          return 99;
        };
        // Déterminer le type de manière intelligente
        const getStorageType = (storage) => {
          let type = storage.type;
          if (!type) {
            // Si pas de type défini, essayer de déterminer automatiquement
            if (storage.nbDisquesActuels && storage.nbDisquesActuels > 0) {
              type = "SAN"; // Si a des disques, probablement un SAN
            } else {
              type = "NAS"; // Valeur par défaut
            }
          }
          return type;
        };

        const typeA = getStorageType(a);
        const typeB = getStorageType(b);
        const orderA = getTypeOrder(typeA);
        const orderB = getTypeOrder(typeB);
        if (orderA !== orderB) return orderA - orderB;
        return (a.nom || "").localeCompare(b.nom || "");
      });
    });

    return grouped;
  }, [filteredStorages]);

  if (rawStockages.length === 0) {
    return (
      <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>Aucun stockage configuré pour ce client.</p>
        </div>
      </div>
    );
  }

  if (Object.keys(groupedBySite).length === 0) {
        return (
            <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
          <p>Aucun stockage ne correspond aux filtres sélectionnés.</p>
                </div>
            </div>
        );
    }

  // Trier les sites selon l'ordre défini dans config.client.sites (premier lieu en premier, puis second lieu)
  const siteEntries = Object.entries(groupedBySite).sort(([siteA], [siteB]) => {
    // "Sans site" en dernier
    if (siteA === "Sans site") return 1;
    if (siteB === "Sans site") return -1;
    
    // Utiliser l'ordre défini dans config.client.sites si disponible
    const clientSites = config?.client?.sites || [];
    const indexA = clientSites.indexOf(siteA);
    const indexB = clientSites.indexOf(siteB);
    
    // Si les deux sites sont dans la liste, utiliser leur ordre
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // Si seul A est dans la liste, A vient en premier
    if (indexA !== -1) return -1;
    // Si seul B est dans la liste, B vient en premier
    if (indexB !== -1) return 1;
    // Sinon, tri alphabétique
    return siteA.localeCompare(siteB);
  });
  const siteCount = siteEntries.length;
  const isSingleSite = siteCount === 1;

    return (
    <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div
        className={styles.serversGridBySite}
        style={{ gridTemplateColumns: `repeat(${siteCount}, minmax(0, 1fr))` }}
      >
        {siteEntries.map(([siteName, siteStorages]) => (
          <div key={siteName} className={styles.siteGroup}>
            <div className={styles.siteHeader}>
              <div className={styles.siteHeaderLeft}>
                <Icon path={mdiOfficeBuilding} size="1.1rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                <span className={styles.siteHeaderLabel}>{siteName}</span>
                    </div>
                </div>
            <div
              className={styles.siteColumn}
              style={isSingleSite ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '1rem'
              } : undefined}
            >
              {(() => {
                // Fonction pour déterminer le type de stockage de manière intelligente
                const getStorageType = (storage) => {
                  let type = storage.type;
                  if (!type) {
                    // Si pas de type défini, essayer de déterminer automatiquement
                    if (storage.nbDisquesActuels && storage.nbDisquesActuels > 0) {
                      type = "SAN"; // Si a des disques, probablement un SAN
                    } else {
                      type = "NAS"; // Valeur par défaut
                    }
                  }
                  return type;
                };

                // Séparer les stockages par type dans l'ordre : SAN, NAS, HDD externe, Robot de sauvegarde
                const sanStorages = siteStorages.filter(s => getStorageType(s) === 'SAN');
                const nasStorages = siteStorages.filter(s => getStorageType(s) === 'NAS');
                const disquesExternes = siteStorages.filter(s => {
                  const type = getStorageType(s);
                  return type === 'Disque dur externe' || type === 'DISQUE';
                });
                const robotsSauvegarde = siteStorages.filter(s => {
                  const type = getStorageType(s);
                  return type === 'Robot de sauvegarde' || type === 'RDX';
                });

                // Fonction pour rendre une carte de disque dur externe
                const renderDisqueExterne = (storage, idx) => {
                  const stgData = storageData?.[storage.nom] || {};
                  const totalSpace = convertCapacityToGo(storage.capacite);
                  const isMapped = Boolean(storage.checkmk_host_name);
                  
                  const subtitleParts = [
                    storage.fabricant,
                    storage.modele,
                    storage.numeroSerie ? `S/N ${storage.numeroSerie}` : null
                  ].filter(Boolean);
                  
                  const subtitleLine = subtitleParts.length > 0 
                    ? [
                        subtitleParts.join(" "),
                        storage.raid ? `RAID ${storage.raid}` : null,
                        storage.ip
                      ].filter(Boolean).join(" - ")
                    : null;

                  return (
                    <article key={idx} className={styles.serverHealthCard}>
                      <span
                        className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`}
                        title={isMapped ? "Synchronisé CheckMK" : "Non mappé"}
                      >
                        <IconifyIcon
                          icon={isMapped ? "simple-icons:checkmk" : "picon:not"}
                          width={16}
                          height={16}
                          color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                        />
                      </span>
                      <div className={styles.cardContent}>
                        {/* Titre */}
                        <div className={styles.healthTitleRow}>
                          <div className={styles.serverTitleMain}>
                            <h3 className={styles.serverName}>
                              <Icon
                                path={mdiHarddisk}
                                size="1rem"
                                style={{ marginRight: "0.5rem", verticalAlign: "middle", position: "relative", top: "-2px" }}
                                color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                              />
                              {storage.nom}
                            </h3>
                          </div>
                        </div>

                        {/* Sous-titre : marque modèle SN - RAID - IP */}
                        {subtitleLine && (
                          <div className={styles.serverMeta}>
                            <span className={styles.serverMetaLine}>
                              {subtitleLine}
                            </span>
                          </div>
                        )}

                        {/* Grosse icône HDD centrée */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2rem 1rem',
                          gap: '1rem'
                        }}>
                          <Icon
                            path={mdiHarddisk}
                            size="4rem"
                            color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                          />
                          
                          {/* Espace de stockage maximal */}
                          {totalSpace > 0 && (() => {
                            const totalFormatted = formatCapacity(totalSpace);
                            return (
                              <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: theme === "dark" ? "#9ca3af" : "#6b7280",
                                textAlign: 'center'
                              }}>
                                {totalFormatted.display}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Commentaire */}
                      {stgData.comment && (
                        <div 
                          className={styles.commentBubble}
                          style={{ 
                            marginTop: '1rem'
                          }}
                        >
                          {stgData.comment}
                        </div>
                      )}
                    </article>
                  );
                };

                return (
                  <>
                    {/* 1. SAN */}
                    {sanStorages.map((storage, idx) => {
                      const stgData = storageData?.[storage.nom] || {};
                      const storageType = storage.type || "NAS";
                      const storageIcon = getStorageTypeIcon(storageType);
                      
                      const eventsCount = getEventsCountValue(stgData);
                      const availabilityValue = getAvailabilityValue(stgData);
                      const serviceMetrics = buildServiceMetrics(stgData);
                      const servicesCount = getServicesCount(stgData, serviceMetrics.length);
                      const isMapped = Boolean(storage.checkmk_host_name);
                      const manualScore = stgData.manualHealthScore;
                      const calculatedHealthScore = computeStorageHealthScore(storage.nom, storage, stgData);
                      const resolvedScore = manualScore !== undefined && manualScore !== null
                        ? manualScore
                        : calculatedHealthScore;
                      const statusFallback = getStorageStatus(storage.nom, stgData);
                      const healthLetter = resolvedScore !== undefined && resolvedScore !== null
                        ? scoreToLetter(resolvedScore)
                        : getStorageLetterFromStatus(statusFallback.status);
                      const healthColor = resolvedScore !== undefined && resolvedScore !== null
                        ? scoreToColor(resolvedScore)
                        : statusFallback.color;
                      const scoreLabel = SCORE_LABELS[healthLetter] || "Non évalué";

                      const subtitleParts = [
                        storage.fabricant,
                        storage.modele,
                        storage.numeroSerie ? `S/N ${storage.numeroSerie}` : null
                      ].filter(Boolean);
                      
                      const subtitleLine = subtitleParts.length > 0 
                        ? [
                            subtitleParts.join(" "),
                            storage.raid ? `RAID ${storage.raid}` : null,
                            storage.ip
                          ].filter(Boolean).join(" - ")
                        : null;

                      const totalSpace = convertCapacityToGo(storage.capacite);
                      const currentDisks = parseInt(storage.nbDisquesActuels) || 0;
                      const maxDisks = parseInt(storage.nbDisquesMax) || 0;
                      const diskStates = stgData?.diskStates || {};
                      const usedSpace = parseInt(stgData?.espaceUtiliseGo) || 0;

                      return (
                        <article key={`san-${idx}`} className={styles.serverHealthCard}>
                          <span
                            className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`}
                            title={isMapped ? "Synchronisé CheckMK" : "Non mappé"}
                          >
                            <IconifyIcon
                              icon={isMapped ? "simple-icons:checkmk" : "picon:not"}
                              width={16}
                              height={16}
                              color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                            />
                          </span>
                          <div className={styles.cardContent}>
                            {/* Titre + rôles + info licence */}
                            <div className={styles.healthTitleRow}>
                              <div className={styles.serverTitleMain}>
                                <h3 className={styles.serverName}>
                                  <Icon
                                    path={storageIcon}
                                    size="1rem"
                                    style={{ marginRight: "0.5rem", verticalAlign: "middle", position: "relative", top: "-2px" }}
                                    color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                  />
                                  {storage.nom}
                                </h3>
                                {storage.role && (
                                  <div className={styles.serverRolesInline}>
                                    {(Array.isArray(storage.role) ? storage.role : [storage.role]).map((role, roleIndex) => (
                                      <span key={roleIndex} className={styles.roleBadge}>
                                        {role}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {storage.expirationGarantie && (
                                <div className={styles.serverLicenseRow}>
                                  <Icon
                                    path={mdiCertificate}
                                    size="0.85rem"
                                    color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                  />
                                  <span className={styles.serverLicenseText}>
                                    {formatExpirationDate(storage.expirationGarantie)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Sous-titre : marque modèle SN - RAID - IP */}
                            {subtitleLine && (
                              <div className={styles.serverMeta}>
                                <span className={styles.serverMetaLine}>
                                  {subtitleLine}
                                </span>
                              </div>
                            )}

                            {/* Disques visuels - placés après le sous-titre */}
                            {maxDisks > 0 && (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                                marginTop: '0.25rem',
                                marginBottom: '0.5rem'
                              }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  color: '#6b7280',
                                  fontWeight: '500'
                                }}>
                                  État des disques
                                </span>
                                <DiskVisual 
                                  current={currentDisks} 
                                  max={maxDisks}
                                  diskStates={diskStates}
                                />
                              </div>
                            )}
                            
                            {/* Note + stats compactes + grille 2x2 */}
                            <div className={styles.healthScoreAndInfos}>
                              <div className={styles.healthScore}>
                                <div className={styles.healthScoreValueContainer}>
                                  <span
                                    className={styles.healthScoreValue}
                                    style={{ color: healthLetter === "A" || healthLetter === "B" ? "#10b981" : healthColor }}
                                  >
                                    {healthLetter && healthLetter !== "?" ? healthLetter : "--"}
                                  </span>
                                </div>
                                <span className={styles.healthScoreLabel}>Santé</span>
                                <span
                                  className={styles.healthScoreLetter}
                                  style={{ color: healthLetter === "A" || healthLetter === "B" ? "#10b981" : healthColor }}
                                >
                                  {scoreLabel}
                                </span>
                              </div>
                              {/* Colonne de droite : stats + grille CPU/RAM/STOCKAGE/UPTIME */}
                              <div className={styles.healthInfos}>
                                <div className={styles.statsAndServicesContainer}>
                                  {/* Grid 2x2 : Services / Événements / Disponibilité */}
                                  <div className={styles.compactStatsGrid2x2}>
                                    <div className={styles.compactStatCard}>
                                      <PiListMagnifyingGlassLight size="1.5rem" color="#6b7280" />
                                      <span className={styles.compactStatValueNeutral}>
                                        {isMapped ? servicesCount : "N/A"}
                                      </span>
                                    </div>
                                    <div className={styles.compactStatCard}>
                                      {!isMapped ? (
                                        <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#6b7280" />
                                          <span className={`${styles.eventsCount} ${styles.eventsCountZero}`}>N/A</span>
                                        </div>
                                      ) : eventsCount && eventsCount > 0 ? (
                                        <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#ef4444" />
                                          <span className={styles.eventsCount}>{eventsCount}</span>
                                        </div>
                                      ) : (
                                        <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#6b7280" />
                                          <span className={`${styles.eventsCount} ${styles.eventsCountZero}`}>0</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className={styles.compactStatCard}>
                                      <MdOutlineNetworkCheck size="1.5rem" color="#6b7280" />
                                      <span
                                        className={
                                          !isMapped
                                            ? styles.compactStatValueNeutral
                                            : availabilityValue !== null && availabilityValue < 99
                                            ? styles.compactStatValueWarnActive
                                            : styles.compactStatValueNeutral
                                        }
                                      >
                                        {!isMapped ? "N/A" : availabilityValue !== null ? `${availabilityValue.toFixed(1)}%` : "NS"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Grid 2x2 : CPU / RAM / STOCKAGE / UPTIME (camemberts) */}
                                  <div className={styles.modulesSummary}>
                                    <div className={styles.modulesSummaryList}>
                                      {serviceMetrics.map((service) => {
                                        const ServiceIcon = SERVICE_ICONS[service.service] || FaHdd;
                                        const hasData = (Number(service.ok) + Number(service.warn) + Number(service.crit)) > 0;
                                        const shouldGrey = !isMapped && !hasData;
                                        return (
                                          <div key={`${storage.nom}-${service.label}`} className={styles.serviceStatCard}>
                                            <ServiceIcon 
                                              size="1.6rem" 
                                              color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                              className={styles.serviceIcon}
                                            />
                                            <div className={styles.serviceStatValues}>
                                              {renderPieChart(Number(service.ok), Number(service.warn), Number(service.crit), 40, shouldGrey)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>

                          {stgData.comment && (
                            <div 
                              className={styles.commentBubble}
                              style={{ 
                                color: healthLetter === "A" || healthLetter === "B" ? undefined : healthColor 
                              }}
                            >
                              {stgData.comment}
                            </div>
                          )}
                        </article>
                      );
                    })}

                    {/* 2. NAS */}
                    {nasStorages.map((storage, idx) => {
                      const stgData = storageData?.[storage.nom] || {};
                      const storageType = storage.type || "NAS";
                      const storageIcon = getStorageTypeIcon(storageType);
                      
                      const eventsCount = getEventsCountValue(stgData);
                      const availabilityValue = getAvailabilityValue(stgData);
                      const serviceMetrics = buildServiceMetrics(stgData);
                      const servicesCount = getServicesCount(stgData, serviceMetrics.length);
                      const isMapped = Boolean(storage.checkmk_host_name);
                      const manualScore = stgData.manualHealthScore;
                      const calculatedHealthScore = computeStorageHealthScore(storage.nom, storage, stgData);
                      const resolvedScore = manualScore !== undefined && manualScore !== null
                        ? manualScore
                        : calculatedHealthScore;
                      const statusFallback = getStorageStatus(storage.nom, stgData);
                      const healthLetter = resolvedScore !== undefined && resolvedScore !== null
                        ? scoreToLetter(resolvedScore)
                        : getStorageLetterFromStatus(statusFallback.status);
                      const healthColor = resolvedScore !== undefined && resolvedScore !== null
                        ? scoreToColor(resolvedScore)
                        : statusFallback.color;
                      const scoreLabel = SCORE_LABELS[healthLetter] || "Non évalué";

                      const subtitleParts = [
                        storage.fabricant,
                        storage.modele,
                        storage.numeroSerie ? `S/N ${storage.numeroSerie}` : null
                      ].filter(Boolean);
                      
                      const subtitleLine = subtitleParts.length > 0 
                        ? [
                            subtitleParts.join(" "),
                            storage.raid ? `RAID ${storage.raid}` : null,
                            storage.ip
                          ].filter(Boolean).join(" - ")
                        : null;

                      const totalSpace = convertCapacityToGo(storage.capacite);
                      const currentDisks = parseInt(storage.nbDisquesActuels) || 0;
                      const maxDisks = parseInt(storage.nbDisquesMax) || 0;
                      const diskStates = stgData?.diskStates || {};
                      const usedSpace = parseInt(stgData?.espaceUtiliseGo) || 0;

                      return (
                        <article key={`nas-${idx}`} className={styles.serverHealthCard}>
                          <span
                            className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`}
                            title={isMapped ? "Synchronisé CheckMK" : "Non mappé"}
                          >
                            <IconifyIcon
                              icon={isMapped ? "simple-icons:checkmk" : "picon:not"}
                              width={16}
                              height={16}
                              color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                            />
                          </span>
                          <div className={styles.cardContent}>
                            {/* Titre + rôles + info licence */}
                            <div className={styles.healthTitleRow}>
                              <div className={styles.serverTitleMain}>
                                <h3 className={styles.serverName}>
                                  <Icon
                                    path={storageIcon}
                                    size="1rem"
                                    style={{ marginRight: "0.5rem", verticalAlign: "middle", position: "relative", top: "-2px" }}
                                    color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                  />
                                  {storage.nom}
                                </h3>
                                {storage.role && (
                                  <div className={styles.serverRolesInline}>
                                    {(Array.isArray(storage.role) ? storage.role : [storage.role]).map((role, roleIndex) => (
                                      <span key={roleIndex} className={styles.roleBadge}>
                                        {role}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {storage.expirationGarantie && (
                                <div className={styles.serverLicenseRow}>
                                  <Icon
                                    path={mdiCertificate}
                                    size="0.85rem"
                                    color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                  />
                                  <span className={styles.serverLicenseText}>
                                    {formatExpirationDate(storage.expirationGarantie)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Sous-titre : marque modèle SN - RAID - IP */}
                            {subtitleLine && (
                              <div className={styles.serverMeta}>
                                <span className={styles.serverMetaLine}>
                                  {subtitleLine}
                                </span>
                              </div>
                            )}

                            {/* Disques visuels + Barre de progression - placés après le sous-titre */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'row',
                              gap: '1rem',
                              marginTop: '0.25rem',
                              marginBottom: '0.5rem',
                              alignItems: 'flex-start'
                            }}>
                              {/* État des disques à gauche */}
                              {maxDisks > 0 && (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.25rem',
                                  flex: '0 0 auto'
                                }}>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    color: '#6b7280',
                                    fontWeight: '500'
                                  }}>
                                    État des disques
                                  </span>
                                  <DiskVisual 
                                    current={currentDisks} 
                                    max={maxDisks}
                                    diskStates={diskStates}
                                  />
                                </div>
                              )}
                              
                              {/* Barre de progression à droite */}
                              {totalSpace > 0 && (() => {
                                const percentage = Math.round((usedSpace / totalSpace) * 100);
                                const usedFormatted = formatCapacity(usedSpace);
                                const totalFormatted = formatCapacity(totalSpace);
                                const progressColor = percentage >= 90 ? '#ef4444' : percentage >= 75 ? '#f59e0b' : percentage >= 50 ? '#eab308' : '#10b981';
                                
                                return (
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem',
                                    flex: '1 1 auto',
                                    minWidth: '200px'
                                  }}>
                                    <span style={{
                                      fontSize: '0.7rem',
                                      color: '#6b7280',
                                      fontWeight: '500'
                                    }}>
                                      Stockage
                                    </span>
                                    <div style={{
                                      width: '100%',
                                      height: '20px',
                                      backgroundColor: theme === 'dark' ? '#3a3a5a' : '#e5e7eb',
                                      borderRadius: '10px',
                                      overflow: 'hidden',
                                      position: 'relative'
                                    }}>
                                      {/* Barre de progression */}
                                      <div 
                                        style={{ 
                                          width: `${percentage}%`,
                                          height: '100%',
                                          backgroundColor: progressColor,
                                          transition: 'width 0.3s ease'
                                        }}
                                      />
                                      
                                      {/* Texte dans la barre : X / X Go (ou To) */}
                                      <div style={{
                                        position: 'absolute',
                                        left: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        color: theme === 'dark' ? '#e5e7eb' : '#111827',
                                        whiteSpace: 'nowrap',
                                        zIndex: 1
                                      }}>
                                        {usedFormatted.value} / {totalFormatted.value} {totalFormatted.unit}
                                      </div>
                                      
                                      {/* Pourcentage à droite */}
                                      <div style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        color: progressColor,
                                        whiteSpace: 'nowrap',
                                        zIndex: 1
                                      }}>
                                        {percentage}%
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            
                            {/* Note + stats compactes + grille 2x2 */}
                            <div className={styles.healthScoreAndInfos}>
                              <div className={styles.healthScore}>
                                <div className={styles.healthScoreValueContainer}>
                                  <span
                                    className={styles.healthScoreValue}
                                    style={{ color: healthLetter === "A" || healthLetter === "B" ? "#10b981" : healthColor }}
                                  >
                                    {healthLetter && healthLetter !== "?" ? healthLetter : "--"}
                                  </span>
                                </div>
                                <span className={styles.healthScoreLabel}>Santé</span>
                                <span
                                  className={styles.healthScoreLetter}
                                  style={{ color: healthLetter === "A" || healthLetter === "B" ? "#10b981" : healthColor }}
                                >
                                  {scoreLabel}
                                </span>
                              </div>
                              {/* Colonne de droite : stats + grille CPU/RAM/STOCKAGE/UPTIME */}
                              <div className={styles.healthInfos}>
                                <div className={styles.statsAndServicesContainer}>
                                  {/* Grid 2x2 : Services / Événements / Disponibilité */}
                                  <div className={styles.compactStatsGrid2x2}>
                                    <div className={styles.compactStatCard}>
                                      <PiListMagnifyingGlassLight size="1.5rem" color="#6b7280" />
                                      <span className={styles.compactStatValueNeutral}>
                                        {isMapped ? servicesCount : "N/A"}
                                      </span>
                                    </div>
                                    <div className={styles.compactStatCard}>
                                      {!isMapped ? (
                                        <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#6b7280" />
                                          <span className={`${styles.eventsCount} ${styles.eventsCountZero}`}>N/A</span>
                                        </div>
                                      ) : eventsCount && eventsCount > 0 ? (
                                        <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#ef4444" />
                                          <span className={styles.eventsCount}>{eventsCount}</span>
                                        </div>
                                      ) : (
                                        <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#6b7280" />
                                          <span className={`${styles.eventsCount} ${styles.eventsCountZero}`}>0</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className={styles.compactStatCard}>
                                      <MdOutlineNetworkCheck size="1.5rem" color="#6b7280" />
                                      <span
                                        className={
                                          !isMapped
                                            ? styles.compactStatValueNeutral
                                            : availabilityValue !== null && availabilityValue < 99
                                            ? styles.compactStatValueWarnActive
                                            : styles.compactStatValueNeutral
                                        }
                                      >
                                        {!isMapped ? "N/A" : availabilityValue !== null ? `${availabilityValue.toFixed(1)}%` : "NS"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Grid 2x2 : CPU / RAM / STOCKAGE / UPTIME (camemberts) */}
                                  <div className={styles.modulesSummary}>
                                    <div className={styles.modulesSummaryList}>
                                      {serviceMetrics.map((service) => {
                                        const ServiceIcon = SERVICE_ICONS[service.service] || FaHdd;
                                        const hasData = (Number(service.ok) + Number(service.warn) + Number(service.crit)) > 0;
                                        const shouldGrey = !isMapped && !hasData;
                                        return (
                                          <div key={`${storage.nom}-${service.label}`} className={styles.serviceStatCard}>
                                            <ServiceIcon 
                                              size="1.6rem" 
                                              color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                              className={styles.serviceIcon}
                                            />
                                            <div className={styles.serviceStatValues}>
                                              {renderPieChart(Number(service.ok), Number(service.warn), Number(service.crit), 40, shouldGrey)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>

                          {stgData.comment && (
                            <div 
                              className={styles.commentBubble}
                              style={{ 
                                color: healthLetter === "A" || healthLetter === "B" ? undefined : healthColor 
                              }}
                            >
                              {stgData.comment}
                            </div>
                          )}
                        </article>
                      );
                    })}

                    {/* 3. Disques durs externes - Grille horizontale */}
                    {disquesExternes.length > 0 && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.min(disquesExternes.length, 3)}, 1fr)`,
                        gap: '0.75rem',
                        marginBottom: robotsSauvegarde.length > 0 ? '0.75rem' : '0'
                      }}>
                        {disquesExternes.map((storage, idx) => renderDisqueExterne(storage, idx))}
                      </div>
                    )}

                    {/* 4. Robots de sauvegarde */}
                    {robotsSauvegarde.map((storage, idx) => {
                      // Récupérer les données depuis data[storageName] (structure du rapport)
                      const stgData = storageData?.[storage.nom] || {};
                      const storageType = storage.type || "NAS";
                      const storageIcon = getStorageTypeIcon(storageType);
                      
                      const eventsCount = getEventsCountValue(stgData);
                      const availabilityValue = getAvailabilityValue(stgData);
                      const serviceMetrics = buildServiceMetrics(stgData);
                      const servicesCount = getServicesCount(stgData, serviceMetrics.length);
                      const isMapped = Boolean(storage.checkmk_host_name);
                      const manualScore = stgData.manualHealthScore;
                      // Utiliser la fonction identique à Stockage.js
                      const calculatedHealthScore = computeStorageHealthScore(storage.nom, storage, stgData);
                      const resolvedScore = manualScore !== undefined && manualScore !== null
                        ? manualScore
                        : calculatedHealthScore;
                      const statusFallback = getStorageStatus(storage.nom, stgData);
                      const healthLetter = resolvedScore !== undefined && resolvedScore !== null
                        ? scoreToLetter(resolvedScore)
                        : getStorageLetterFromStatus(statusFallback.status);
                      const healthColor = resolvedScore !== undefined && resolvedScore !== null
                        ? scoreToColor(resolvedScore)
                        : statusFallback.color;
                      const scoreLabel = SCORE_LABELS[healthLetter] || "Non évalué";

                      // Construire le sous-titre : marque modèle SN - RAID - IP
                      const subtitleParts = [
                        storage.fabricant,
                        storage.modele,
                        storage.numeroSerie ? `S/N ${storage.numeroSerie}` : null
                      ].filter(Boolean);
                      
                      const subtitleLine = subtitleParts.length > 0 
                        ? [
                            subtitleParts.join(" "),
                            storage.raid ? `RAID ${storage.raid}` : null,
                            storage.ip
                          ].filter(Boolean).join(" - ")
                        : null;

                      // Capacité totale (en Go, puis formatée dynamiquement en Go/To pour l'affichage)
                      const totalSpace = convertCapacityToGo(storage.capacite);
                      const capacityLabel = totalSpace > 0 ? formatCapacity(totalSpace).display : null;

                      // Disques - récupérer depuis les données du rapport
                      const currentDisks = parseInt(storage.nbDisquesActuels) || 0;
                      const maxDisks = parseInt(storage.nbDisquesMax) || 0;
                      const diskStates = stgData?.diskStates || {};
                      const disksLabel = maxDisks > 0 ? `${currentDisks}/${maxDisks} disques` : null;
                      
                      // Espace utilisé - récupérer depuis les données du rapport
                      const usedSpace = parseInt(stgData?.espaceUtiliseGo) || 0;

                      // Identifier les types spéciaux
                      const rdxCassettes = storage.cassettesRDX || [];

                      // Carte spécifique pour Robot de sauvegarde
                      return (
                        <article key={`rdx-${idx}`} className={styles.serverHealthCard}>
                          <span
                            className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`}
                            title={isMapped ? "Synchronisé CheckMK" : "Non mappé"}
                          >
                            <IconifyIcon
                              icon={isMapped ? "simple-icons:checkmk" : "picon:not"}
                              width={16}
                              height={16}
                              color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                            />
                          </span>
                          <div className={styles.cardContent}>
                            {/* Titre */}
                            <div className={styles.healthTitleRow}>
                              <div className={styles.serverTitleMain}>
                                <h3 className={styles.serverName}>
                                  <Icon
                                    path={mdiVhs}
                                    size="1rem"
                                    style={{ marginRight: "0.5rem", verticalAlign: "middle", position: "relative", top: "-2px" }}
                                    color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                  />
                                  {storage.nom}
                                </h3>
                              </div>
                            </div>

                            {/* Sous-titre : marque modèle SN - RAID - IP */}
                            {subtitleLine && (
                              <div className={styles.serverMeta}>
                                <span className={styles.serverMetaLine}>
                                  {subtitleLine}
                                </span>
                              </div>
                            )}

                            {/* Listing des cassettes */}
                            {rdxCassettes && rdxCassettes.length > 0 && (
                              <div style={{
                                marginTop: '1rem',
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                              }}>
                                <div style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: 'var(--text-secondary)',
                                  marginBottom: '0.75rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  textAlign: 'center'
                                }}>
                                  Cassettes ({rdxCassettes.length})
                                </div>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  flexWrap: 'wrap'
                                }}>
                                  {rdxCassettes.map((cassette, cassetteIndex) => (
                                    <div key={cassetteIndex} style={{
                                      minWidth: '100px',
                                      padding: '0.75rem 1rem',
                                      background: 'var(--bg-primary)',
                                      borderRadius: '4px',
                                      border: '2px solid var(--border-color)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: '0.4rem'
                                    }}>
                                      <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        color: 'var(--text-primary)',
                                        textAlign: 'center'
                                      }}>
                                        #{cassetteIndex + 1}
                                      </div>
                                      {cassette.numero && (
                                        <div style={{
                                          fontSize: '0.8rem',
                                          color: 'var(--text-primary)',
                                          fontWeight: '600',
                                          textAlign: 'center'
                                        }}>
                                          {cassette.numero}
                                        </div>
                                      )}
                                      {cassette.capacite && (
                                        <div style={{
                                          fontSize: '0.7rem',
                                          color: 'var(--text-secondary)',
                                          fontWeight: '500',
                                          textAlign: 'center'
                                        }}>
                                          {cassette.capacite.toString().includes('Go') || cassette.capacite.toString().includes('GB') || cassette.capacite.toString().includes('TB') || cassette.capacite.toString().includes('Mo') || cassette.capacite.toString().includes('MB') 
                                            ? cassette.capacite 
                                            : `${cassette.capacite} GB`}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Commentaire */}
                          {stgData.comment && (
                            <div 
                              className={styles.commentBubble}
                              style={{ 
                                marginTop: '1rem'
                              }}
                            >
                              {stgData.comment}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        ))}
            </div>
        </div>
    );
};

export default StockageSummary;
