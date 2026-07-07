import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { 
  mdiRouterWireless, 
  mdiRouter, 
  mdiSatelliteVariant, 
  mdiCableData,
  mdiNetwork,
  mdiWifi,
  mdiAccessPoint,
  mdiOfficeBuilding,
  mdiWeb,
  mdiSecurityNetwork
} from "@mdi/js";
import { scoreToLetter, letterToBackground } from "../../../utils/gradeUtils";
import { computeFirewallHealthScore } from "./FirewallsSummary";
import styles from "./TopologyCommon.module.css";

const InfrastructureTopology = ({ config, data, selectedSites = [] }) => {
    const { theme } = useTheme();
    const connections = config?.client?.equipements?.Internet || [];
    const firewalls = config?.client?.equipements?.Firewalls || [];
    const firewallsData = data?.firewalls || {};
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });

    // Fonction pour obtenir l'icône en fonction du type de connexion
    const getConnectionIcon = (connexion) => {
        const type = connexion?.type?.toLowerCase() || '';
        const nom = connexion?.nom?.toLowerCase() || '';
        const combined = `${type} ${nom}`.toLowerCase();
        
        if (type.includes('fibre') || type.includes('fiber') || combined.includes('fibre') || combined.includes('fiber')) {
            return mdiCableData;
        }
        if (type.includes('5g') || combined.includes('5g')) {
            return mdiAccessPoint;
        }
        if (type.includes('4g') || combined.includes('4g') || type.includes('lte') || combined.includes('lte')) {
            return mdiAccessPoint;
        }
        if (type.includes('adsl') || combined.includes('adsl') || type.includes('dsl') || combined.includes('dsl')) {
            return mdiRouter;
        }
        if (type.includes('satellite') || combined.includes('satellite')) {
            return mdiSatelliteVariant;
        }
        if (type.includes('wifi') || combined.includes('wifi') || type.includes('wireless') || combined.includes('wireless')) {
            return mdiWifi;
        }
        if (type.includes('ethernet') || combined.includes('ethernet') || type.includes('cable') || combined.includes('cable')) {
            return mdiNetwork;
        }
        return mdiRouterWireless;
    };

    // Tronquer les libellés trop longs
    const truncateLabel = (label, maxLength = 14) => {
        if (!label || typeof label !== "string") return label;
        if (label.length <= maxLength) return label;
        return `${label.slice(0, maxLength - 1)}…`;
    };

    // Fonction pour obtenir le label d'un type de connexion
    const getConnectionTypeLabel = (iconPath) => {
        if (iconPath === mdiCableData) return "Fibre";
        if (iconPath === mdiAccessPoint) return "4G/5G";
        if (iconPath === mdiRouter) return "ADSL";
        if (iconPath === mdiSatelliteVariant) return "Satellite";
        if (iconPath === mdiWifi) return "WiFi";
        if (iconPath === mdiNetwork) return "Ethernet";
        return "Connexion";
    };

    // Filtrer par sites sélectionnés
    const filteredConnections = useMemo(() => {
        if (selectedSites.length > 0) {
            return connections.filter(conn => {
                const equipmentSite = conn?.site ? String(conn.site).trim() : null;
                const siteToCheck = equipmentSite || "Sans site";
                return selectedSites.includes(siteToCheck);
            });
        }
        return connections;
    }, [connections, selectedSites]);

    // Grouper les connexions par site
    const groupedBySite = useMemo(() => {
        return filteredConnections.reduce((acc, connexion) => {
            const siteName = connexion.site || "Sans site";
            if (!acc[siteName]) {
                acc[siteName] = [];
            }
            acc[siteName].push(connexion);
            return acc;
        }, {});
    }, [filteredConnections]);

    // Grouper les firewalls par site (même logique que les connexions)
    const firewallsBySite = useMemo(() => {
        const filteredFirewalls = selectedSites.length > 0
            ? firewalls.filter(fw => {
                const equipmentSite = fw?.site ? String(fw.site).trim() : null;
                const siteToCheck = equipmentSite || "Sans site";
                return selectedSites.includes(siteToCheck);
            })
            : firewalls;
        return filteredFirewalls.reduce((acc, firewall) => {
            const siteName = firewall.site || "Sans site";
            if (!acc[siteName]) {
                acc[siteName] = [];
            }
            acc[siteName].push(firewall);
            return acc;
        }, {});
    }, [firewalls, selectedSites]);

    // Calculer les dimensions du conteneur (largeur seulement, hauteur calculée dynamiquement)
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const maxWidth = 1600;
                const padding = 2 * 16;
                const containerWidth = Math.max(800, Math.min(maxWidth, rect.width - padding)); // Largeur minimale de 800px
                setDimensions(prev => ({
                    width: containerWidth,
                    height: prev.height // Conserver la hauteur actuelle, elle sera calculée dynamiquement
                }));
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [groupedBySite]);

    // Identifier tous les types de connexions uniques présents
    const uniqueConnectionTypes = useMemo(() => {
        const types = new Set();
        filteredConnections.forEach(conn => {
            const icon = getConnectionIcon(conn);
            types.add(icon);
        });
        return Array.from(types);
    }, [filteredConnections]);

    // Vérifier s'il y a des firewalls
    const hasFirewalls = useMemo(() => {
        return Object.keys(firewallsBySite).length > 0;
    }, [firewallsBySite]);

    // Calculer les positions des sites - TOPOLOGIE PAR COLONNES AVEC LIGNE PRINCIPALE
    const siteLayouts = useMemo(() => {
        const sites = Object.keys(groupedBySite).sort(); // Trier les sites pour que le premier soit à gauche
        if (sites.length === 0) return [];

        const columnWidth = 350;
        const columnSpacing = 100;
        const siteNameHeight = 40; // Hauteur réservée pour le nom du site
        const topPadding = 50;
        const internetRowY = topPadding;
        const firewallRowY = topPadding + 170;
        const elementSpacing = 120;
        const iconSize = 50;
        const iconHalf = iconSize / 2;
        const backupOffset = 150; // Distance à droite de la ligne principale pour les backups

        // Centrer toutes les colonnes horizontalement
        const totalWidth = sites.length * columnWidth + (sites.length - 1) * columnSpacing;
        const columnStartX = (dimensions.width - totalWidth) / 2;

        const layouts = [];

        sites.forEach((siteName, siteIndex) => {
            const siteConnections = groupedBySite[siteName] || [];
            const siteFirewalls = firewallsBySite[siteName] || [];
            
            const columnX = columnStartX + siteIndex * (columnWidth + columnSpacing);
            const columnCenterX = columnX + columnWidth / 2;
            
            // Séparer les connexions principales et backups
            const principalConnections = siteConnections.filter(c => c.categorie === "Principale");
            const backupConnections = siteConnections.filter(c => c.categorie === "Backup");
            const otherConnections = siteConnections.filter(c => c.categorie !== "Principale" && c.categorie !== "Backup");
            
            // Positionner les connexions principales sur la ligne principale (centrée)
            const connectionPositions = [];
            
            // Connexions principales et autres sur la ligne principale
            const mainConnections = [...principalConnections, ...otherConnections];
            const mainConnCount = mainConnections.length;
            const mainConnStartX = columnCenterX - ((mainConnCount - 1) * elementSpacing) / 2;
            
            mainConnections.forEach((conn, idx) => {
                connectionPositions.push({
                    conn,
                    connIdx: siteConnections.indexOf(conn),
                    x: mainConnStartX + idx * elementSpacing,
                    y: internetRowY,
                    isPrincipal: conn.categorie === "Principale",
                    isBackup: false
                });
            });
            
            // Connexions backup à droite de la ligne principale
            backupConnections.forEach((conn, idx) => {
                connectionPositions.push({
                    conn,
                    connIdx: siteConnections.indexOf(conn),
                    x: columnCenterX + backupOffset,
                    y: internetRowY + idx * (iconSize + 20), // Empiler verticalement
                    isPrincipal: false,
                    isBackup: true
                });
            });
            
            // Positionner les firewalls (comme les connexions : principal centré, secondaires à droite)
            const firewallPositions = [];
            const processedFirewalls = new Set();
            
            // Identifier les paires HA
            const haPairs = [];
            siteFirewalls.forEach((firewall, fwIdx) => {
                if (processedFirewalls.has(fwIdx)) return;
                
                if (firewall.modeHA && (firewall.firewallHA !== null && firewall.firewallHA !== undefined || firewall.firewallHAName)) {
                    let partnerIndex = -1;
                    if (typeof firewall.firewallHA === 'number') {
                        partnerIndex = firewall.firewallHA;
                        if (partnerIndex < 0 || partnerIndex >= siteFirewalls.length || 
                            !siteFirewalls[partnerIndex].modeHA) {
                            partnerIndex = -1;
                        }
                    }
                    if (partnerIndex === -1 && firewall.firewallHAName) {
                        partnerIndex = siteFirewalls.findIndex(fw => 
                            fw.nom === firewall.firewallHAName && fw.modeHA
                        );
                    }
                    
                    if (partnerIndex !== -1 && partnerIndex !== fwIdx && !processedFirewalls.has(partnerIndex)) {
                        // Déterminer lequel est principal (le premier ou celui avec roleHA === "Primary")
                        const isFirstPrincipal = fwIdx < partnerIndex || firewall.roleHA === "Primary";
                        haPairs.push({
                            principal: isFirstPrincipal ? firewall : siteFirewalls[partnerIndex],
                            principalIdx: isFirstPrincipal ? fwIdx : partnerIndex,
                            secondary: isFirstPrincipal ? siteFirewalls[partnerIndex] : firewall,
                            secondaryIdx: isFirstPrincipal ? partnerIndex : fwIdx
                        });
                        processedFirewalls.add(fwIdx);
                        processedFirewalls.add(partnerIndex);
                    }
                }
            });
            
            // Positionner les firewalls alignés avec les connexions principales
            // Trier les firewalls pour que les primaires soient en premier
            const sortedFirewalls = [...siteFirewalls].sort((a, b) => {
                // Priorité aux firewalls HA primaires
                const aIsPrimary = a.roleHA === "Primary" || (a.modeHA && !b.modeHA);
                const bIsPrimary = b.roleHA === "Primary" || (b.modeHA && !a.modeHA);

                if (aIsPrimary && !bIsPrimary) return -1;
                if (!aIsPrimary && bIsPrimary) return 1;

                // Ensuite par nom pour un ordre cohérent
                return (a.nom || "").localeCompare(b.nom || "");
            });

            const allFirewalls = sortedFirewalls;
            const firewallCount = allFirewalls.length;

            if (firewallCount > 0) {
                // Trouver la position X de la première connexion principale pour aligner le premier firewall
                const firstPrincipalConn = connectionPositions.find(cp => cp.isPrincipal);
                const firewallStartX = firstPrincipalConn
                    ? firstPrincipalConn.x  // Aligner avec la connexion principale
                    : columnCenterX - ((firewallCount - 1) * elementSpacing) / 2; // Fallback au centrage

                allFirewalls.forEach((firewall, idx) => {
                    firewallPositions.push({
                        firewall: firewall,
                        fwIdx: idx,
                        x: firewallStartX + idx * elementSpacing,
                        y: firewallRowY,
                        isHA: false,
                        isPrincipal: true
                    });
                });
            }
            
            layouts.push({
                siteName,
                columnX,
                columnWidth,
                columnCenterX,
                connections: connectionPositions,
                firewalls: firewallPositions,
                internetRowY,
                firewallRowY
            });
        });
        
        return layouts;
    }, [groupedBySite, firewallsBySite, dimensions.width]);

    // Calculer la hauteur totale de manière simple
    const totalHeight = useMemo(() => {
        // Vérifier s'il y a au moins une connexion internet
        const hasConnections = connections.length > 0;
        // Vérifier s'il y a au moins un firewall
        const hasFirewalls = firewalls.length > 0;

        let height = 0;
        if (hasConnections) {
            height = 130; // 130px si au moins une connexion internet
        }
        if (hasFirewalls) {
            height += 120; // +120px si au moins un firewall
        }

        return height || 200; // Hauteur minimale si rien
    }, [connections, firewalls]);

    // Vérifier si on a des connexions
    if (connections.length === 0) {
        return (
            <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>Aucune connexion Internet configurée pour ce client.</p>
                </div>
            </div>
        );
    }

    // Si pas de sites après filtrage
    if (Object.keys(groupedBySite).length === 0) {
        return (
            <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>Aucune connexion Internet ne correspond aux filtres sélectionnés.</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}
        >
            <div className={styles.topologyViewport}>
                <svg
                    ref={svgRef}
                    width={dimensions.width}
                    height={totalHeight}
                    className={styles.topologySvg}
                >
                    <defs>
                        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor={theme === 'dark' ? '#4b5563' : '#d1d5db'} stopOpacity="0.7" />
                            <stop offset="50%" stopColor={theme === 'dark' ? '#6b7280' : '#9ca3af'} stopOpacity="0.9" />
                            <stop offset="100%" stopColor={theme === 'dark' ? '#4b5563' : '#d1d5db'} stopOpacity="0.7" />
                        </linearGradient>
                        {/* Animation pour les liens - mouvement du haut vers le bas */}
                        <style>{`
                            @keyframes flowDown {
                                0% {
                                    stroke-dashoffset: 12;
                                }
                                100% {
                                    stroke-dashoffset: 0;
                                }
                            }
                            @keyframes flowUp {
                                0% {
                                    stroke-dashoffset: 0;
                                }
                                100% {
                                    stroke-dashoffset: 12;
                                }
                            }
                            .animated-line {
                                stroke-dasharray: 8 4;
                                animation: flowDown 2s linear infinite;
                            }
                            .animated-line-up {
                                stroke-dasharray: 8 4;
                                animation: flowUp 2s linear infinite;
                            }
                        `}</style>
                    </defs>

                    {/* Rendu des sites */}
                    {siteLayouts.map((layout) => {
                        const iconSize = 50;
                        const iconHalf = iconSize / 2;
                        
                        return (
                            <g key={`site-${layout.siteName}`}>
                                {/* Titre du site */}
                                <foreignObject
                                    x={layout.columnX}
                                    y={-25}
                                    width={layout.columnWidth}
                                    height="30"
                                >
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        width: '100%',
                                        height: '100%'
                                    }}>
                                        <Icon
                                            path={mdiOfficeBuilding}
                                            size="1.2rem"
                                            color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                            style={{ marginRight: '8px' }}
                                        />
                                        <span style={{
                                            color: theme === "dark" ? "#9ca3af" : "#6b7280",
                                            fontSize: "16px",
                                            fontWeight: "700"
                                        }}>
                                            {layout.siteName}
                                        </span>
                                    </div>
                                </foreignObject>

                                {/* Ligne principale verticale au centre - pointillée - seulement s'il y a des firewalls */}
                                {(() => {
                                    // Ne pas afficher la ligne s'il n'y a pas de firewalls
                                    if (!layout.firewalls || !Array.isArray(layout.firewalls) || layout.firewalls.length === 0) {
                                        return null;
                                    }
                                    
                                    // Trouver la première connexion principale pour démarrer derrière
                                    const firstMainConn = layout.connections
                                        .filter(c => !c.isBackup)
                                        .sort((a, b) => a.x - b.x)[0];
                                    const startY = firstMainConn ? firstMainConn.y + iconHalf : layout.internetRowY + iconHalf;
                                    
                                    // Trouver le premier firewall principal pour arrêter la ligne avant
                                    const principalFirewalls = layout.firewalls.filter(f => f.isPrincipal !== false);
                                    if (principalFirewalls.length === 0) {
                                        return null;
                                    }
                                    
                                    const firstPrincipalFw = principalFirewalls.sort((a, b) => a.x - b.x)[0];
                                    
                                    // Arrêter avant le premier firewall
                                    const endY = firstPrincipalFw.y - iconHalf;
                                    
                                    return (
                                        <line
                                            key={`main-line-${layout.siteName}`}
                                            x1={layout.columnCenterX}
                                            y1={startY}
                                            x2={layout.columnCenterX}
                                            y2={endY}
                                            stroke={theme === 'dark' ? '#6b7280' : '#9ca3af'}
                                            strokeWidth="2"
                                            strokeDasharray="4 4"
                                            opacity="0.5"
                                            className="animated-line"
                                        />
                                    );
                                })()}

                                {/* Lignes entre connexions principales sur la ligne principale */}
                                {layout.connections
                                    .filter(c => !c.isBackup)
                                    .sort((a, b) => a.x - b.x)
                                    .map((connPos, idx, arr) => {
                                        if (idx < arr.length - 1) {
                                            return (
                                                <line
                                                    key={`conn-line-${idx}`}
                                                    x1={connPos.x + iconHalf}
                                                    y1={connPos.y}
                                                    x2={arr[idx + 1].x - iconHalf}
                                                    y2={connPos.y}
                                                    stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                                                    strokeWidth="2"
                                                    strokeDasharray="4 4"
                                                    opacity="0.5"
                                                    className="animated-line"
                                                />
                                            );
                                        }
                                        return null;
                                    })}

                                {/* Lignes depuis le centre de la carte principale vers le centre de la carte backup */}
                                {layout.connections
                                    .filter(c => c.isBackup)
                                    .map((backupConn) => {
                                        // Trouver la connexion principale associée (la première principale)
                                        const principalConn = layout.connections
                                            .filter(c => c.isPrincipal)
                                            .sort((a, b) => a.x - b.x)[0];
                                        
                                        if (!principalConn) return null;
                                        
                                        // Ligne du centre de la principale vers le centre du backup
                                        return (
                                            <line
                                                key={`backup-line-${backupConn.connIdx}`}
                                                x1={principalConn.x}
                                                y1={principalConn.y}
                                                x2={backupConn.x}
                                                y2={backupConn.y}
                                                stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                                                strokeWidth="2"
                                                strokeDasharray="4 4"
                                                opacity="0.5"
                                            />
                                        );
                                    })}


                                {/* Lignes entre firewalls principaux sur la ligne principale */}
                                {layout.firewalls
                                    .filter(f => f.isPrincipal !== false)
                                    .sort((a, b) => a.x - b.x)
                                    .map((fwPos, idx, arr) => {
                                        if (idx < arr.length - 1) {
                                            return (
                                                <line
                                                    key={`fw-line-${fwPos.fwIdx}`}
                                                    x1={fwPos.x + iconHalf}
                                                    y1={fwPos.y}
                                                    x2={arr[idx + 1].x - iconHalf}
                                                    y2={arr[idx + 1].y}
                                                    stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                                                    strokeWidth="2"
                                                    strokeDasharray="4 4"
                                                    opacity="0.5"
                                                    className="animated-line"
                                                />
                                            );
                                        }
                                        return null;
                                    })}

                                {/* Lignes depuis le centre du firewall principal vers le centre du firewall secondaire (HA) */}
                                {layout.firewalls
                                    .filter(f => f.isPrincipal === false && f.isHA && f.principalPartnerIdx !== undefined)
                                    .map((secondaryFw) => {
                                        // Trouver le firewall principal associé via la référence
                                        const principalFw = layout.firewalls.find(f => 
                                            f.fwIdx === secondaryFw.principalPartnerIdx
                                        );
                                        
                                        if (!principalFw) return null;
                                        
                                        // Ligne du centre du principal vers le centre du secondaire
                                        return (
                                            <line
                                                key={`fw-secondary-line-${secondaryFw.fwIdx}`}
                                                x1={principalFw.x}
                                                y1={principalFw.y}
                                                x2={secondaryFw.x}
                                                y2={secondaryFw.y}
                                                stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                                                strokeWidth="2"
                                                strokeDasharray="4 4"
                                                opacity="0.5"
                                            />
                                        );
                                    })}

                                {/* Connexions Internet */}
                                {layout.connections.filter(connPos => connPos && connPos.conn).map((connPos) => {
                                    const iconPath = getConnectionIcon(connPos.conn);
                                    const iconColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
                                    const connectionType = (connPos.conn.type || "").toUpperCase();
                                    const rawNom = connPos.conn.nom || "";
                                    const fournisseur = connPos.conn.fournisseur || "";
                                    const isUnnamed = !rawNom || rawNom.toLowerCase().trim() === "unnamed" || rawNom.toLowerCase().trim() === "sans nom";
                                    // Nom à afficher : fournisseur en priorité, sinon nom, sinon type
                                    const connectionName = isUnnamed 
                                        ? (fournisseur || connectionType || "Connexion")
                                        : (fournisseur || rawNom);
                                    const connectionIP = connPos.conn.ip || "";
                                    
                                    // Titre : TYPE + NOM (ex: "FIBRE ORANGE")
                                    const titleText = connectionType && connectionName 
                                        ? `${connectionType} ${connectionName.toUpperCase()}`
                                        : (connectionType || connectionName.toUpperCase());
                                    
                                    return (
                                        <g key={`connection-${layout.siteName}-${connPos.connIdx}`}>
                                            <rect
                                                x={connPos.x - iconHalf}
                                                y={connPos.y - iconHalf}
                                                width={iconSize}
                                                height={iconSize}
                                                rx="8"
                                                fill={theme === 'dark' ? '#e5e7eb' : '#ffffff'}
                                                stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                                                strokeWidth="2"
                                            />
                                            <foreignObject
                                                x={connPos.x - iconHalf}
                                                y={connPos.y - iconHalf}
                                                width={iconSize}
                                                height={iconSize}
                                            >
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    width: '100%',
                                                    height: '100%'
                                                }}>
                                                    <Icon path={iconPath} size="2.5rem" color={iconColor} />
                                                </div>
                                            </foreignObject>
                                            {/* Titre : TYPE + NOM */}
                                            <text
                                                x={connPos.x}
                                                y={connPos.y + iconHalf + 20}
                                                textAnchor="middle"
                                                fill={theme === 'dark' ? '#f9fafb' : '#111827'}
                                                fontSize="13"
                                                fontWeight="700"
                                            >
                                                {truncateLabel(titleText, 25)}
                                            </text>
                                            {/* Sous-titre : IP */}
                                            {connectionIP && (
                                                <text
                                                    x={connPos.x}
                                                    y={connPos.y + iconHalf + 38}
                                                    textAnchor="middle"
                                                    fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                                                    fontSize="11"
                                                    fontWeight="400"
                                                >
                                                    {connectionIP}
                                                </text>
                                            )}
                                            {/* Badge Principal/Backup - à droite de la carte */}
                                            {(connPos.isPrincipal || connPos.isBackup) && (
                                                <>
                                                    <rect
                                                        x={connPos.x + iconHalf + 5}
                                                        y={connPos.y - 10}
                                                        width="20"
                                                        height="20"
                                                        rx="10"
                                                        fill={theme === 'dark' ? '#6b7280' : '#9ca3af'}
                                                        opacity="0.7"
                                                    />
                                                    <text
                                                        x={connPos.x + iconHalf + 15}
                                                        y={connPos.y + 3}
                                                        textAnchor="middle"
                                                        fill="#ffffff"
                                                        fontSize="11"
                                                        fontWeight="700"
                                                    >
                                                        {connPos.isPrincipal ? "P" : "B"}
                                                    </text>
                                                </>
                                            )}
                                        </g>
                                    );
                                })}

                                {/* Firewalls */}
                                {layout.firewalls.filter(fwPos => fwPos && fwPos.firewall).map((fwPos) => {
                                    const firewall = fwPos.firewall;
                                    if (!firewall) return null;
                                    const firewallData = firewallsData?.[firewall.nom] || {};
                                    const eventsCount = firewallData ? (firewallData.eventsCount ?? null) : null;
                                    const availabilityValue = firewallData?.availability?.up ?? firewallData?.availability ?? null;
                                    const moduleStats = firewallData?.moduleStats || { active: 0, inactive: 0, disabled: 0, total: 0 };
                                    const isMapped = Boolean(firewallData.lastSyncDate);
                                    const manualScore = firewallData.manualHealthScore;
                                    const calculatedHealthScore = computeFirewallHealthScore(firewallData, {
                                        eventsCount,
                                        availabilityValue,
                                        moduleStats,
                                        isMapped
                                    });
                                    const resolvedScore = manualScore !== undefined && manualScore !== null
                                        ? manualScore
                                        : calculatedHealthScore;
                                    const letter = resolvedScore !== undefined && resolvedScore !== null
                                        ? scoreToLetter(resolvedScore)
                                        : null;
                                    const fillColor = letter ? letterToBackground(letter) : (theme === 'dark' ? '#1e1e3f' : '#ffffff');
                                    const firewallName = firewall.nom || "Firewall";
                                    const firewallIP = firewall.ip || "";
                                    
                                    return (
                                        <g key={`firewall-${layout.siteName}-${fwPos.fwIdx}`}>
                                            <rect
                                                x={fwPos.x - iconHalf}
                                                y={fwPos.y - iconHalf}
                                                width={iconSize}
                                                height={iconSize}
                                                rx="8"
                                                fill={fillColor}
                                                stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                                                strokeWidth="2"
                                            />
                                            <foreignObject
                                                x={fwPos.x - iconHalf}
                                                y={fwPos.y - iconHalf}
                                                width={iconSize}
                                                height={iconSize}
                                            >
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    width: '100%',
                                                    height: '100%'
                                                }}>
                                                    <Icon path={mdiSecurityNetwork} size="2.5rem" color={theme === 'dark' ? '#111827' : '#111827'} />
                                                </div>
                                            </foreignObject>
                                            <text
                                                x={fwPos.x}
                                                y={fwPos.y + iconHalf + 20}
                                                textAnchor="middle"
                                                fill={theme === 'dark' ? '#f9fafb' : '#111827'}
                                                fontSize="13"
                                                fontWeight="700"
                                            >
                                                {truncateLabel(firewallName, 20)}
                                            </text>
                                            {firewallIP && (
                                                <text
                                                    x={fwPos.x}
                                                    y={fwPos.y + iconHalf + 38}
                                                    textAnchor="middle"
                                                    fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                                                    fontSize="11"
                                                    fontWeight="400"
                                                >
                                                    {firewallIP}
                                                </text>
                                            )}
                                            {/* Badge HA - à droite de la carte */}
                                            {fwPos.isHA && (
                                                <>
                                                    <rect
                                                        x={fwPos.x + iconHalf + 5}
                                                        y={fwPos.y - 10}
                                                        width="20"
                                                        height="20"
                                                        rx="10"
                                                        fill={theme === 'dark' ? '#6b7280' : '#9ca3af'}
                                                        opacity="0.7"
                                                    />
                                                    <text
                                                        x={fwPos.x + iconHalf + 15}
                                                        y={fwPos.y + 3}
                                                        textAnchor="middle"
                                                        fill="#ffffff"
                                                        fontSize="10"
                                                        fontWeight="700"
                                                    >
                                                        HA
                                                    </text>
                                                </>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Légende */}
            <div className={styles.topologyLegendContainer}>
                {uniqueConnectionTypes.map((iconPath, index) => {
                    const label = getConnectionTypeLabel(iconPath);
                    return (
                        <div key={`connection-${index}`} className={styles.legendItem}>
                            <div className={styles.legendIconWrapper}>
                                <Icon path={iconPath} size="2rem" color={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                            </div>
                            <span className={styles.legendLabel}>{label}</span>
                        </div>
                    );
                })}
                {hasFirewalls && (
                    <div className={styles.legendItem}>
                        <div className={styles.legendIconWrapper}>
                            <Icon path={mdiSecurityNetwork} size="2rem" color={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                        </div>
                        <span className={styles.legendLabel}>Firewall</span>
                    </div>
                )}
                {/* Séparateur horizontal */}
                <div style={{
                    width: '100%',
                    height: '1px',
                    backgroundColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                    margin: '0.5rem 0',
                    opacity: 0.5
                }} />
                {/* Badge Primaire */}
                <div className={styles.legendItem}>
                    <div style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        borderRadius: '50%',
                        backgroundColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7
                    }}>
                        <span style={{ color: '#ffffff', fontSize: '10px', fontWeight: '700' }}>P</span>
                    </div>
                    <span className={styles.legendLabel}>Primaire</span>
                </div>
                {/* Badge Backup */}
                <div className={styles.legendItem}>
                    <div style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        borderRadius: '50%',
                        backgroundColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7
                    }}>
                        <span style={{ color: '#ffffff', fontSize: '10px', fontWeight: '700' }}>B</span>
                    </div>
                    <span className={styles.legendLabel}>Backup</span>
                </div>
                {/* Badge HA */}
                <div className={styles.legendItem}>
                    <div style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        borderRadius: '50%',
                        backgroundColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7
                    }}>
                        <span style={{ color: '#ffffff', fontSize: '10px', fontWeight: '700' }}>HA</span>
                    </div>
                    <span className={styles.legendLabel}>HA</span>
                </div>
            </div>
        </div>
    );
};

export default InfrastructureTopology;
