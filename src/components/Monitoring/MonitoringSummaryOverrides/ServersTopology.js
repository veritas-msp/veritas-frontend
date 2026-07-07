import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { 
  mdiOfficeBuilding
} from "@mdi/js";
import { FaServer, FaCube } from "react-icons/fa";
import { scoreToLetter, letterToBackground } from "../../../utils/gradeUtils";
import { computeServerHealthScore } from "./ServersSummaryCards";
import styles from "./TopologyCommon.module.css";

// Services utilisés pour évaluer l'état global (alignés sur ServersSummaryCards)
const DEFAULT_SERVICES = ["CPU", "MEMOIRE", "DISQUE", "UPTIME"];

// Helpers simplifiés copiés de ServersSummaryCards pour les événements / disponibilité
const getEventsCountValue = (serverData = {}) => {
  if (typeof serverData.eventsCount === "number") {
    return serverData.eventsCount;
  }

  if (Array.isArray(serverData.eventsData)) {
    return serverData.eventsData.length;
  }

  const checkmkEvents = serverData?.checkmkData?.events;
  if (Array.isArray(checkmkEvents)) {
    return checkmkEvents.length;
  }

  return null;
};

const getAvailabilityValue = (serverData = {}) => {
  const raw =
    serverData?.availabilityData?.up ??
    serverData?.availability?.up ??
    serverData?.availability;
  if (raw === null || raw === undefined) return null;
  const numeric = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : null;
};

// Fallback basique sur les pourcentages de services si on n'a vraiment aucun score
const getServerStatusFallback = (serverData = {}) => {
  if (!serverData) return { status: "unknown" };

  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;

  DEFAULT_SERVICES.forEach((service) => {
    const svc = serverData[service] || {};
    const parse = (val, fallback) => {
      const parsed = parseInt(val, 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    };
    totalCrit += parse(svc.crit, 0);
    totalWarn += parse(svc.warn, 0);
    totalOk += parse(svc.ok, 100);
  });

  const avgCrit = totalCrit / DEFAULT_SERVICES.length;
  const avgWarn = totalWarn / DEFAULT_SERVICES.length;
  const avgOk = totalOk / DEFAULT_SERVICES.length;

  if (avgCrit > 20) return { status: "critical" };
  if (avgCrit > 10 || avgWarn > 30) return { status: "warning" };
  if (avgOk >= 90) return { status: "excellent" };
  if (avgOk >= 70) return { status: "good" };
  return { status: "poor" };
};

const getServerLetterFromStatus = (status) => {
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
      return null;
  }
};

const ServersTopology = ({ config, data, selectedSites = [] }) => {
    const { theme } = useTheme();
    const serveurs = config?.client?.equipements?.Serveurs || [];
    const serversData = data?.serveurs || {};
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 1400, height: 600 });

    // Calculer les dimensions du conteneur
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                // Les cartes serveurs utilisent max-width: 1400px avec padding: 0 1rem (16px de chaque côté)
                // Donc la largeur interne des cartes = 1400 - 32 = 1368px
                // Le topologyContainer a padding: 2rem (32px de chaque côté)
                // Donc pour que le SVG ait la même largeur interne que les cartes, on doit faire:
                // SVG width = 1368px (largeur interne des cartes)
                const maxWidth = 1368;           // largeur interne des cartes serveurs (1400 - 32)
                const containerWidth = Math.min(maxWidth, rect.width - 64); // 64 = 2rem * 2 de chaque côté
                setDimensions({
                    width: containerWidth,
                    height: 600
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Filtrer par sites sélectionnés
    const filteredServers = useMemo(() => {
        if (selectedSites.length > 0) {
            return serveurs.filter(srv => {
                const equipmentSite = srv?.site ? String(srv.site).trim() : null;
                const siteToCheck = equipmentSite || "Sans site";
                return selectedSites.includes(siteToCheck);
            });
        }
        return serveurs;
    }, [serveurs, selectedSites]);

    // Grouper les serveurs par site puis par VLAN
    const groupedBySiteAndVLAN = useMemo(() => {
        return filteredServers.reduce((acc, serveur) => {
            const siteName = serveur.site || "Sans site";
            const vlan = serveur.vlan || "Sans VLAN";
            
            if (!acc[siteName]) {
                acc[siteName] = {};
            }
            if (!acc[siteName][vlan]) {
                acc[siteName][vlan] = [];
            }
            acc[siteName][vlan].push(serveur);
            return acc;
        }, {});
    }, [filteredServers]);

    // Fonction pour trier les serveurs : physiques d'abord, puis virtuels
    const sortServers = (servers) => {
        return [...servers].sort((a, b) => {
            const aIsVirtual = a.type === "virtuel";
            const bIsVirtual = b.type === "virtuel";
            if (aIsVirtual && !bIsVirtual) return 1; // Virtuel après physique
            if (!aIsVirtual && bIsVirtual) return -1; // Physique avant virtuel
            return 0; // Garder l'ordre pour les mêmes types
        });
    };

    const sites = Object.keys(groupedBySiteAndVLAN).sort(); // Trier les sites pour que le premier soit à gauche
    const maxSitesPerRow = 2; // Maximum 2 sites par ligne (gauche/droite)
    const numRows = Math.ceil(sites.length / maxSitesPerRow);
    const buildingY = 50; // Position du bâtiment en haut
    const serversStartY = 150; // Position de départ des serveurs
    const serverSpacingX = 80; // Espacement horizontal entre serveurs (réduit)
    const serverSpacingY = 100; // Espacement vertical entre lignes
    const maxServersPerLine = 4; // Maximum de serveurs par ligne
    const siteWidth = dimensions.width / 2; // Largeur pour chaque site (gauche/droite)

    /**
     * Calcul de la hauteur : 50px par VLAN + pixels supplémentaires si plusieurs lignes
     */
    const totalHeight = useMemo(() => {
        let totalHeight = 0;
        
        sites.forEach((siteName) => {
            const vlans = Object.keys(groupedBySiteAndVLAN[siteName] || {});
            
            vlans.forEach((vlan) => {
                const servers = groupedBySiteAndVLAN[siteName][vlan] || [];
                const totalLines = Math.ceil(servers.length / maxServersPerLine);
                
                // 50px de base par VLAN
                totalHeight += 120;
                
                // Si plusieurs lignes, ajouter 50px par ligne supplémentaire
                if (totalLines > 1) {
                    totalHeight += (totalLines - 1) * 50;
                }
            });
        });
        
        return totalHeight || 200; // Minimum 200px si aucun VLAN
    }, [sites, groupedBySiteAndVLAN, maxServersPerLine]);

    // Vérifier si on a des serveurs
    if (serveurs.length === 0) {
        return (
            <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>Aucun serveur configuré pour ce client.</p>
                </div>
            </div>
        );
    }

    // Si pas de sites après filtrage
    if (Object.keys(groupedBySiteAndVLAN).length === 0) {
        return (
            <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>Aucun serveur ne correspond aux filtres sélectionnés.</p>
                </div>
            </div>
        );
    }

    // Fonction pour tronquer le nom du serveur s'il dépasse X caractères
    const truncateServerName = (name, maxLength = 10) => {
        if (!name) return '';
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 3) + '...';
    };

    return (
        <div 
            ref={containerRef}
            className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}
        >
            {/* Vue topologique SVG */}
            <div className={styles.serversTopologyViewport}>
                <svg
                    ref={svgRef}
                    width={dimensions.width}
                    height={totalHeight}
                    className={styles.topologySvg}
                >
                    {/* Sites en lignes (2 par ligne max) */}
                    {sites.map((siteName, siteIndex) => {
                        const rowIndex = Math.floor(siteIndex / maxSitesPerRow);
                        const positionInRow = siteIndex % maxSitesPerRow; // 0 = gauche, 1 = droite
                        const buildingX = positionInRow === 0 
                            ? siteWidth / 2  // Gauche
                            : siteWidth + (siteWidth / 2); // Droite
                        const siteStartY = buildingY + (rowIndex * 400); // Espacement vertical entre lignes de sites (réduit de 600 à 400)
                        const vlans = Object.keys(groupedBySiteAndVLAN[siteName]);
                        let currentY = siteStartY + serversStartY;

                        // Boîte englobante des serveurs du site (pour le cadre pointillé)
                        let siteMinX = Infinity;
                        let siteMaxX = -Infinity;
                        let siteMinY = Infinity;
                        let siteMaxY = -Infinity;

                        return (
                            <g key={`site-${siteName}`}>
                                {/* Serveurs groupés par VLAN : VLAN à gauche, serveurs à droite */}
                                {vlans.map((vlan) => {
                                    // Trier les serveurs : physiques d'abord, puis virtuels
                                    const sortedServers = sortServers(groupedBySiteAndVLAN[siteName][vlan]);
                                    const totalLines = Math.ceil(sortedServers.length / maxServersPerLine);
                                    
                                    // Position du label VLAN à gauche
                                    const vlanLabelX = positionInRow === 0 
                                        ? 50  // Gauche du site de gauche
                                        : siteWidth + 50; // Gauche du site de droite
                                    const vlanStartY = currentY;
                                    
                                    // Position de départ des serveurs à droite du label VLAN
                                    const serversStartX = vlanLabelX + 120; // Espacement entre label VLAN et serveurs
                                    const serversPerLine = Math.min(sortedServers.length, maxServersPerLine);

                                    currentY += totalLines * serverSpacingY + 10; // Espacement entre VLANs (réduit)

                                    // Étendre la boîte englobante du site au label VLAN
                                    siteMinX = Math.min(siteMinX, vlanLabelX);
                                    siteMinY = Math.min(siteMinY, vlanStartY);
                                    
                                    // Calculer les positions de tous les serveurs pour les liens
                                    const serverPositions = sortedServers.map((server, idx) => {
                                        const lineIndex = Math.floor(idx / maxServersPerLine);
                                        const colIndex = idx % maxServersPerLine;
                                        const serverX = serversStartX + colIndex * serverSpacingX;
                                        const serverY = vlanStartY + lineIndex * serverSpacingY;

                                        // Mettre à jour la boîte englobante du site
                                        siteMinX = Math.min(siteMinX, serverX);
                                        siteMaxX = Math.max(siteMaxX, serverX);
                                        siteMinY = Math.min(siteMinY, serverY);
                                        siteMaxY = Math.max(siteMaxY, serverY);

                                        return {
                                            server,
                                            x: serverX,
                                            y: serverY,
                                            idx
                                        };
                                    });

                                    return (
                                        <g key={`vlan-${siteName}-${vlan}`}>
                                            {/* Label VLAN à gauche */}
                                            <text
                                                x={vlanLabelX}
                                                y={vlanStartY + 5}
                                                textAnchor="start"
                                                fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                                                fontWeight="700"
                                                fontSize="14"
                                            >
                                                {vlan === "Sans VLAN" ? "Sans VLAN" : `VLAN ${vlan}`}
                                            </text>
                                            {/* Serveurs (triés : physiques puis virtuels) à droite */}
                                            {serverPositions.map((serverPos) => {
                                                const { server, x: serverX, y: serverY, idx } = serverPos;
                                                // Icônes différentes : FaServer pour physique, FaCube pour virtuel (uniformisé avec les cartes)
                                                const ServerIcon = server.type === "virtuel" ? FaCube : FaServer;
                                                const iconColor = theme === 'dark' ? '#111827' : '#1f2937';

                                                // Récupération de la note du serveur pour la heatmap
                                                const serverData = serversData?.[server.nom] || {};
                                                const eventsCount = getEventsCountValue(serverData);
                                                const availabilityValue = getAvailabilityValue(serverData);
                                                const isMapped = Boolean(serverData.lastSyncDate);
                                                const manualScore = serverData.manualHealthScore;
                                                const calculatedHealthScore = computeServerHealthScore(serverData, {
                                                    eventsCount,
                                                    availabilityValue,
                                                    isMapped
                                                });
                                                const resolvedScore = manualScore !== undefined && manualScore !== null
                                                    ? manualScore
                                                    : calculatedHealthScore;

                                                let healthLetter = null;
                                                if (resolvedScore !== undefined && resolvedScore !== null) {
                                                    healthLetter = scoreToLetter(resolvedScore);
                                                } else {
                                                    const statusFallback = getServerStatusFallback(serverData);
                                                    healthLetter = getServerLetterFromStatus(statusFallback.status);
                                                }

                                                const nodeFill = healthLetter
                                                    ? letterToBackground(healthLetter)
                                                    : (theme === 'dark' ? '#1e1e3f' : '#ffffff');
                                                
                                                return (
                                                    <g key={`server-${server.nom}-${idx}`}>
                                                        {/* Bloc serveur : carré à coins arrondis (au lieu d'un cercle) */}
                                                        <rect
                                                            x={serverX - 20}
                                                            y={serverY - 20}
                                                            width="40"
                                                            height="40"
                                                            rx="8"
                                                            fill={nodeFill}
                                                            stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                                                            strokeWidth="2"
                                                        />
                                                        
                                                        {/* Icône serveur */}
                                                        <foreignObject
                                                            x={serverX - 12}
                                                            y={serverY - 12}
                                                            width="24"
                                                            height="24"
                                                        >
                                                            <div className={styles.connectionIconWrapper} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                                                <ServerIcon style={{ fontSize: '1.2rem', color: iconColor }} />
                                                            </div>
                                                        </foreignObject>
                                                        
                                                        {/* Nom du serveur avec défilement si trop long */}
                                                        {server.nom && server.nom.length > 10 ? (
                                                            <foreignObject
                                                                x={serverX - 40}
                                                                y={serverY + 33}
                                                                width="80"
                                                                height="15"
                                                            >
                                                                <div className={styles.scrollingServerName}>
                                                                    <span>{server.nom}</span>
                                                                </div>
                                                            </foreignObject>
                                                        ) : (
                                                            <text
                                                                x={serverX}
                                                                y={serverY + 45}
                                                                textAnchor="middle"
                                                                fill={theme === 'dark' ? '#e5e7eb' : '#111827'}
                                                                fontWeight="600"
                                                                fontSize="11"
                                                            >
                                                                {server.nom || ''}
                                                            </text>
                                                        )}
                                                        
                                                        {/* IP du serveur */}
                                                        <text
                                                            x={serverX}
                                                            y={serverY + 60}
                                                            textAnchor="middle"
                                                            fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                                                            fontWeight="400"
                                                            fontSize="10"
                                                        >
                                                            {server.ip || 'N/A'}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    );
                                })}
                                {/* Cadre pointillé autour du site :
                                    - même largeur que la carte serveur correspondante
                                    - gap entre les deux rectangles (comme entre les cartes serveurs)
                                    - titre de lieu au-dessus, dans le même esprit que les cartes serveurs */}
                                {Number.isFinite(siteMinY) && Number.isFinite(siteMaxY) && (() => {
                                    const paddingTop = 50;       // espace au-dessus des contenus
                                    const paddingBottom = 100;   // espace supplémentaire en bas du cadre (réduit de 100 à 50)
                                    const gap = 48;              // gap entre les deux rectangles (1.5rem * 2 = 3rem = 48px, comme le padding des siteGroup)

                                    // Largeur de chaque rectangle pointillé :
                                    // - on retire le gap de la largeur totale pour avoir deux rectangles de même taille
                                    // - chaque rectangle = (dimensions.width - gap) / 2
                                    const boxWidth = (dimensions.width - gap) / 2;

                                    // Position horizontale :
                                    // - colonne gauche : commence à 0
                                    // - colonne droite : commence après le rectangle gauche + gap
                                    const boxX = positionInRow === 0
                                        ? 0
                                        : boxWidth + gap;
                                    const boxY = siteMinY - paddingTop;
                                    const boxHeight = (siteMaxY - siteMinY) + paddingTop + paddingBottom;

                                    return (
                                        <>
                                            {/* Titre du lieu avec icône à gauche, au-dessus du cadre (comme les cartes serveurs) */}
                                            <foreignObject
                                                x={boxX - 3}      // légèrement plus à gauche
                                                y={boxY - 48}     // légèrement plus haut
                                                width={boxWidth - 16}
                                                height="24"
                                            >
                                                <div className={styles.siteHeaderLeft}>
                                                    <Icon
                                                        path={mdiOfficeBuilding}
                                                        size="1.1rem"
                                                        color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                                    />
                                                    <span className={styles.siteHeaderLabel}>
                                                        {siteName}
                                                    </span>
                                                </div>
                                            </foreignObject>
                                            <rect
                                                x={boxX}
                                                y={boxY}
                                                width={boxWidth}
                                                height={boxHeight}
                                                rx="16"
                                                fill="none"
                                                stroke={theme === 'dark' ? '#4b5563' : '#cbd5e1'}
                                                strokeWidth="2"
                                                strokeDasharray="6 6"
                                            />
                                        </>
                                    );
                                })()}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

export default ServersTopology;
