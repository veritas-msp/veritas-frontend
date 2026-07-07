import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaSync, FaExclamationCircle, FaLink } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Firewalls.module.css";
import SmartTooltip from "../../SmartTooltip";
import API_BASE_URL from "../../../config";
import { getCheckMKReportPeriodData } from "../../../api/checkmkReportPeriod";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import CheckMKMappingModal from "../../AdminPage/MonitoringClientSkeleton/ClientSteps/CheckMKMappingModal";
import { useTheme } from "../../../hooks/useTheme";

// Options par défaut pour les toasts (bas à droite)
const toastOptions = { position: "bottom-right", autoClose: 3000 };

const defaultServices = ["CPU", "MEMOIRE", "TRAFIC", "UPTIME"];

// Liste des modules disponibles
const availableModules = [
    "Cloud Backup",
    "Lien HA",
    "Mémoire",
    "Certificats",
    "Reports",
    "CPU",
    "Température",
    "SD-WAN"
];

const Firewalls = ({ config, setConfig, data, setData, onSyncAllCheckMKReady }) => {
    const { theme } = useTheme();
    const firewallList = config?.client?.equipements?.Firewalls || [];
    const [checkmkMappings, setCheckmkMappings] = useState({});
    const [checkmkData, setCheckmkData] = useState({});
    const [loadingCheckMK, setLoadingCheckMK] = useState({});
    
    // Fonction helper pour obtenir le mapping CheckMK d'un firewall (par nom ou id)
    const getCheckMKMapping = useCallback((firewallNameOrId) => {
        if (!firewallNameOrId) return null;

        const idKey = String(firewallNameOrId);
        if (checkmkMappings[idKey]) {
            return checkmkMappings[idKey];
        }

        const firewall = firewallList.find(fw => fw.nom === firewallNameOrId);
        if (firewall?.id && checkmkMappings[String(firewall.id)]) {
            return checkmkMappings[String(firewall.id)];
        }

        return null;
    }, [checkmkMappings, firewallList]);
    const [openComments, setOpenComments] = useState({});
    const [syncMode, setSyncMode] = useState({}); // 'stats', 'checkmk' (stats avancée) ou 'modules' pour chaque firewall
    const [eventsCount, setEventsCount] = useState({}); // Nombre d'événements sur la période par firewall
    const [eventsData, setEventsData] = useState({}); // Données détaillées des événements par firewall
    const [availabilityData, setAvailabilityData] = useState({}); // Données de disponibilité par firewall
    const [hoveredTooltip, setHoveredTooltip] = useState(null); // { type: 'services' | 'events', firewallName, mouseX, mouseY }
    const [animatedScore, setAnimatedScore] = useState({}); // Score animé pour chaque firewall
    const [animatedAvailability, setAnimatedAvailability] = useState({}); // Disponibilité animée pour chaque firewall
    const [animatedServices, setAnimatedServices] = useState({}); // Services animés pour chaque firewall
    const [animatedEvents, setAnimatedEvents] = useState({}); // Événements animés pour chaque firewall
    const [scoreAnimationComplete, setScoreAnimationComplete] = useState({}); // Indique si l'animation du score est terminée
    const [editingScore, setEditingScore] = useState({}); // { firewallName: true/false } pour savoir quel score est en cours d'édition
    const [editingScoreValue, setEditingScoreValue] = useState({}); // Valeur temporaire pendant l'édition
    const [focusedInput, setFocusedInput] = useState(null); // { service, type } pour suivre quel champ est en focus
    const [editingFirewall, setEditingFirewall] = useState(null); // Firewall en cours d'édition
    const [editForm, setEditForm] = useState(null); // Formulaire d'édition
    const [isSaving, setIsSaving] = useState(false); // État de chargement lors de la sauvegarde
    const [checkmkMappingModal, setCheckmkMappingModal] = useState({ isOpen: false, firewallId: null }); // Modal de mapping CheckMK
    const [showExportModal, setShowExportModal] = useState(false); // Pour afficher/masquer le modal d'export
    const dataRef = useRef(data);
    const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);
    const syncAllCheckMKRef = useRef(null);
    const animationTimersRef = useRef({}); // Stocker tous les timers d'animation pour les nettoyer
    const hasRestoredDataRef = useRef(null); // Évite de restaurer plusieurs fois les mêmes données CheckMK

    // 🔁 Restaurer l'état d'ouverture des commentaires depuis les données du rapport
    useEffect(() => {
        if (!data) return;
        setOpenComments((prev) => {
            const next = { ...prev };
            Object.keys(data).forEach((firewallName) => {
                const isOpen = data[firewallName]?.isCommentOpen;
                if (typeof isOpen === 'boolean') {
                    next[firewallName] = isOpen;
                }
            });
            return next;
        });
    }, [data]);

    // Fonction pour nettoyer tous les timers d'animation pour un firewall
    const clearAnimationTimers = useCallback((firewallName) => {
        if (animationTimersRef.current[firewallName]) {
            const timers = animationTimersRef.current[firewallName];
            if (timers.scoreTimer) clearInterval(timers.scoreTimer);
            if (timers.availabilityTimer) clearInterval(timers.availabilityTimer);
            if (timers.servicesTimer) clearInterval(timers.servicesTimer);
            if (timers.eventsTimer) clearInterval(timers.eventsTimer);
            if (timers.scoreTimeout) clearTimeout(timers.scoreTimeout);
            delete animationTimersRef.current[firewallName];
        }
    }, []);

    const updateValue = (firewallName, service, level, value) => {
        const updated = {
            ...data,
            [firewallName]: {
                ...(data[firewallName] || {}),
                [service]: {
                    ...(data[firewallName]?.[service] || {}),
                    [level]: value
                }
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    const updateComment = (firewallName, comment) => {
        const updated = {
            ...data,
            [firewallName]: {
                ...(data[firewallName] || {}),
                comment
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    const toggleCommentVisibility = (firewallName) => {
        setOpenComments((prev) => {
            const nextIsOpen = !prev[firewallName];
            const nextState = {
                ...prev,
                [firewallName]: nextIsOpen,
            };

            // Persister aussi dans les données du rapport pour garder l'état en changeant d'onglet
            const currentData = dataRef.current || data || {};
            const updated = {
                ...currentData,
                [firewallName]: {
                    ...(currentData[firewallName] || {}),
                    isCommentOpen: nextIsOpen,
                },
            };
            setData(updated);
            dataRef.current = updated;

            return nextState;
        });
    };

    // Fonctions pour gérer l'édition manuelle de la note
    const startEditScore = (firewallName, currentScore) => {
        setEditingScore(prev => ({ ...prev, [firewallName]: true }));
        setEditingScoreValue(prev => ({ ...prev, [firewallName]: currentScore || '' }));
    };

    const applyManualScore = useCallback((firewallName, scoreValue) => {
        const currentData = dataRef.current || data || {};
        const updated = {
            ...currentData,
            [firewallName]: {
                ...(currentData[firewallName] || {}),
                manualHealthScore: scoreValue
            }
        };
        setData(updated);
        dataRef.current = updated;
        setEditingScore(prev => ({
            ...prev,
            [firewallName]: false
        }));
        setEditingScoreValue(prev => {
            if (prev?.[firewallName] === undefined) return prev;
            const newValue = { ...prev };
            delete newValue[firewallName];
            return newValue;
        });
    }, [data, setData]);

    const saveEditScore = (firewallName) => {
        const manualScore = editingScoreValue[firewallName];
        if (manualScore !== undefined && manualScore !== null && manualScore !== '') {
            const scoreValue = Math.max(0, Math.min(100, parseInt(manualScore, 10) || 0));
            applyManualScore(firewallName, scoreValue);
        } else {
            setEditingScore(prev => ({ ...prev, [firewallName]: false }));
            setEditingScoreValue(prev => {
                const newValue = { ...prev };
                delete newValue[firewallName];
                return newValue;
            });
        }
    };

    const cancelEditScore = (firewallName) => {
        setEditingScore(prev => ({ ...prev, [firewallName]: false }));
        setEditingScoreValue(prev => {
            const newValue = { ...prev };
            delete newValue[firewallName];
            return newValue;
        });
    };

    const handleManualLetterSelect = (firewallName, letter) => {
        const scoreValue = letterToScore(letter);
        if (scoreValue === null) return;
        applyManualScore(firewallName, scoreValue);
    };

    // Fonction pour sélectionner tout le contenu du champ au focus
    const handleInputFocus = (e, service, type) => {
        e.target.select();
        setFocusedInput({ service, type });
    };
    
    const handleInputBlur = () => {
        setFocusedInput(null);
    };

    // Fonction pour mettre à jour le statut d'un module
    const updateModuleStatus = (firewallName, moduleName, status) => {
        const updated = {
            ...data,
            [firewallName]: {
                ...(data[firewallName] || {}),
                modules: {
                    ...(data[firewallName]?.modules || {}),
                    [moduleName]: status
                }
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    const getTotal = (firewallName, service) => {
        const firewallData = data?.[firewallName]?.[service] || {};
        const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
        const ok = firewallData.ok !== undefined ? parse(firewallData.ok, 100) : 100;
        const warn = firewallData.warn !== undefined ? parse(firewallData.warn, 0) : 0;
        const crit = firewallData.crit !== undefined ? parse(firewallData.crit, 0) : 0;
        return ok + warn + crit;
    };

    const hasInvalidLines = (firewallName) => {
        return defaultServices.some(service => getTotal(firewallName, service) !== 100);
    };

    // Fonction pour obtenir les informations HA d'un firewall
    const getHAInfo = (firewall) => {
        if (!firewall.modeHA) return null;
        
        return {
            role: firewall.roleHA
        };
    };

    // Fonction pour obtenir une couleur progressive selon un score (0-100)
    const getProgressiveColor = (value) => {
        if (value >= 85) {
            return '#10b981'; // Vert
        } else if (value >= 70) {
            return '#f59e0b'; // Orange
        } else if (value >= 50) {
            return '#f97316'; // Orange foncé
        } else {
            return '#ef4444'; // Rouge
        }
    };

    // Fonction pour calculer le score de santé du firewall
    const getFirewallHealthScore = (firewallName) => {
        const sourceData = dataRef.current || data || {};
        const rawFirewallData = sourceData?.[firewallName];
        // Trouver le firewall correspondant pour obtenir son id
        const firewall = firewallList.find(fw => fw.nom === firewallName);
        const isMapped = Boolean(firewall?.id && checkmkMappings[firewall.id]);
        const hasSyncData = Boolean(rawFirewallData?.lastSyncDate);

        if (isMapped && !hasSyncData) {
            return null;
        }

        const firewallData = rawFirewallData || {};
        const serviceAvailabilityWeight = isMapped ? 0.3 : 0.5;
        let totalScore = 0;
        let weightSum = 0;

        // Détection des problèmes critiques
        let hasCriticalServices = false;
        let hasEvents = false;
        let hasLowAvailability = false;

        // 1. Score basé sur la table de services
        let serviceScore = 0;
        let serviceCount = 0;
        let totalCritRatio = 0; // Pour calculer le ratio global de crit
        defaultServices.forEach(service => {
            const serviceData = firewallData[service] || {};
            const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
            
            const ok = parse(serviceData.ok, 100);
            const warn = parse(serviceData.warn, 0);
            const crit = parse(serviceData.crit, 0);
            
            if (crit > 0) hasCriticalServices = true;
            
            const serviceTotal = ok + warn + crit;
            if (serviceTotal > 0) {
                const okRatio = ok / serviceTotal;
                const warnRatio = warn / serviceTotal;
                const critRatio = crit / serviceTotal;
                totalCritRatio += critRatio;
                // Impact progressif du crit : pénalité proportionnelle mais moins sévère pour les faibles ratios
                let critScore = 0;
                if (critRatio > 0.1) { // > 10% de crit
                    critScore = 0;
                } else if (critRatio > 0.05) { // 5-10% de crit
                    critScore = critRatio * 15; // Pénalité modérée
                } else { // < 5% de crit
                    critScore = critRatio * 30; // Pénalité légère (2% crit = 0.6 point de pénalité)
                }
                serviceScore += (okRatio * 100) + (warnRatio * 50) + critScore;
                serviceCount++;
            }
        });

        if (serviceCount > 0) {
            serviceScore = serviceScore / serviceCount;
            totalCritRatio = totalCritRatio / serviceCount; // Ratio moyen de crit
            totalScore += serviceScore * serviceAvailabilityWeight;
            weightSum += serviceAvailabilityWeight;
        }

        // 2. Score basé sur les événements (uniquement pour les périphériques mappés)
        let eventCount = 0;
        if (isMapped) {
            eventCount = eventsCount[firewallName] || 0;
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
            
            totalScore += eventScore * 0.2;
            weightSum += 0.2;
        }

        // 3. Score basé sur la disponibilité (uniquement pour les périphériques mappés)
        let availabilityValue = 100;
        if (isMapped && availabilityData[firewallName]) {
            availabilityValue = parseFloat(availabilityData[firewallName].up || 0);
            if (availabilityValue < 95) {
                hasLowAvailability = true;
            }
            
            let availabilityScore = availabilityValue;
            if (availabilityValue < 80) {
                availabilityScore = Math.min(availabilityValue, 50);
            } else if (availabilityValue < 95) {
                availabilityScore = Math.min(availabilityValue, 70);
            }
            
            totalScore += availabilityScore * 0.3;
            weightSum += 0.3;
        }

        // 4. Score basé sur l'état des modules
        let moduleScore = 100;
        let hasDisabledModules = false;
        let hasInactiveModules = false;
        if (firewallData?.modules) {
            let activeCount = 0;
            let inactiveCount = 0;
            let disabledCount = 0;
            let totalModules = 0;
            
            availableModules.forEach(module => {
                const moduleStatus = firewallData.modules[module] || "active";
                totalModules++;
                if (moduleStatus === "active") {
                    activeCount++;
                } else if (moduleStatus === "inactive") {
                    inactiveCount++;
                    hasInactiveModules = true;
                } else if (moduleStatus === "disabled") {
                    disabledCount++;
                    hasDisabledModules = true;
                }
            });
            
            if (totalModules > 0) {
                // Calcul du score : active = 100 (vert, bon), inactive = 100 (gris, bon), disabled = 0 (orange, pas bon)
                moduleScore = (activeCount * 100 + inactiveCount * 100 + disabledCount * 0) / totalModules;
            }
        }
        
        // Ajuster les poids selon si le firewall est mappé ou non
        // Réduire l'impact des modules (poids réduit)
        if (isMapped) {
            totalScore += moduleScore * 0.2;
            weightSum += 0.2;
        } else {
            totalScore += moduleScore * 0.5;
            weightSum += 0.5;
        }

        if (weightSum === 0) return null;
        
        let finalScore = Math.round(totalScore / weightSum);

        // APPLICATION DE PLAFONDS CRITIQUES - Progressif selon le ratio de crit
        if (hasCriticalServices && serviceCount > 0) {
            // Plafond progressif selon le ratio de crit
            let critCeiling = 100;
            if (totalCritRatio >= 0.2) { // >= 20% de crit
                critCeiling = 30;
            } else if (totalCritRatio >= 0.1) { // >= 10% de crit
                critCeiling = 50;
            } else if (totalCritRatio >= 0.05) { // >= 5% de crit
                critCeiling = 70;
            } else if (totalCritRatio >= 0.02) { // >= 2% de crit
                critCeiling = 85;
            } else { // < 2% de crit
                critCeiling = 95;
            }
            if (finalScore > critCeiling) {
                finalScore = Math.min(finalScore, critCeiling);
            }
        }
        
        if (isMapped && availabilityValue < 80) {
            finalScore = Math.min(finalScore, 50);
        } else if (isMapped && availabilityValue < 95) {
            finalScore = Math.min(finalScore, 70);
        }
        
        if (isMapped && hasEvents && finalScore > 70) {
            finalScore = Math.min(finalScore, 70);
        }
        if (isMapped && eventCount >= 4 && finalScore > 50) {
            finalScore = Math.min(finalScore, 50);
        }
        
        // Impact des modules désactivés (orange = pas bon) - Impact réduit
        // Les modules inactifs (gris) sont considérés comme bons, donc pas de plafond
        if (hasDisabledModules && finalScore > 75) {
            finalScore = Math.min(finalScore, 75); // Plafond augmenté de 50 à 75
        }

        return finalScore;
    };

    // Fonction pour formater les informations du firewall
    const getFirewallInfo = (firewall) => {
        const mainInfo = [];
        const deviceInfo = [];
        let warrantyInfo = null;
        let maintenanceInfo = null;

        // Ligne 1 : infos réseau (IP, firmware)
        if (firewall.ip) mainInfo.push(`IP : ${firewall.ip}`);
        if (firewall.firmware) mainInfo.push(`FW ${firewall.firmware}`);

        // Ligne 2 : informations matérielles (marque, modèle, S/N)
        if (firewall.fabricant && firewall.modele) deviceInfo.push(`${firewall.fabricant} ${firewall.modele}`);
        else if (firewall.fabricant) deviceInfo.push(firewall.fabricant);
        else if (firewall.modele) deviceInfo.push(firewall.modele);

        if (firewall.numeroSerie) deviceInfo.push(firewall.numeroSerie);

        // Ligne 2 : informations de garantie
        if (firewall.expirationGarantie) {
            const expirationDate = new Date(firewall.expirationGarantie);
            const today = new Date();
            const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

            warrantyInfo = {
                date: expirationDate.toLocaleDateString('fr-FR'),
                expired: daysUntilExpiration < 0,
                daysLeft: daysUntilExpiration >= 0 ? daysUntilExpiration : null,
            };
        }

        // Ligne 2 : information de licence de maintenance
        if (firewall.licences && Array.isArray(firewall.licences)) {
            const maintenanceLicence = firewall.licences.find(licence => {
                const nom = (licence.nom || '').toLowerCase();
                return nom.includes('maintenance');
            });

            if (maintenanceLicence && maintenanceLicence.expiration) {
                const expirationDate = new Date(maintenanceLicence.expiration);
                if (!isNaN(expirationDate.getTime())) {
                    maintenanceInfo = {
                        date: expirationDate.toLocaleDateString('fr-FR'),
                    };
                }
            }
        }

        return { mainInfo, deviceInfo, warrantyInfo, maintenanceInfo };
    };

    // Fonction pour calculer le statut de la licence
    const getLicenseStatus = (firewall) => {
        if (!firewall.expirationGarantie) return { status: "unknown", color: "gray" };
        
        const expirationDate = new Date(firewall.expirationGarantie);
        const today = new Date();
        const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiration < 0) {
            return { status: "expired", color: "red" };
        } else if (daysUntilExpiration <= 7) {
            return { status: "critical", color: "red" };
        } else if (daysUntilExpiration <= 30) {
            return { status: "warning", color: "orange" };
        } else {
            return { status: "valid", color: "green" };
        }
    };

    // Fonction pour vérifier si un firewall a du WARN ou CRIT
    const hasWarningOrCritical = (firewallName) => {
        const firewallData = data?.[firewallName];
        if (!firewallData) return false;

        return defaultServices.some(service => {
            const serviceData = firewallData[service] || {};
            const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
            const warn = serviceData.warn !== undefined ? parse(serviceData.warn, 0) : 0;
            const crit = serviceData.crit !== undefined ? parse(serviceData.crit, 0) : 0;
            return warn > 0 || crit > 0;
        });
    };

    // Fonction pour vérifier s'il y a des problèmes (WARN/ARIT dans la table OU modules désactivés)
    const hasProblems = (firewallName) => {
        // Vérifier WARN/ARIT dans la table de service
        if (hasWarningOrCritical(firewallName)) {
            return true;
        }

        // Vérifier si un module est désactivé (disabled = orange = problème, inactive = gris = bon, active = vert = bon)
        const firewallData = data?.[firewallName];
        if (firewallData?.modules) {
            return availableModules.some(module => {
                const moduleStatus = firewallData.modules[module] || "active";
                return moduleStatus === "disabled"; // Seul "disabled" (orange) est un problème
            });
        }

        return false;
    };

    // Fonction simplifiée pour sauvegarder un firewall
    const saveFirewall = async (firewallId, firewallData) => {
        const clientId = config?.client?.id;
        if (!clientId) {
            throw new Error("ID client manquant");
        }

        // Préparer les données pour la base (sans les métadonnées internes)
        const { id, __fromDb, __index, ...dataForDb } = firewallData;

        const body = {
            item_key: firewallData.nom || `firewall-${firewallId}`,
            name: firewallData.nom || `Firewall`,
            data: dataForDb,
            is_active: true
        };

        // PUT si on a un ID, POST sinon
        const method = firewallId ? "PUT" : "POST";
        const url = firewallId
            ? `${API_BASE_URL}/clients/modules/${clientId}/firewall/${firewallId}`
            : `${API_BASE_URL}/clients/modules/${clientId}/firewall`;

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

    // Fonction pour gérer la sauvegarde après édition
    const handleSaveFirewall = async () => {
        if (!editingFirewall || !editForm) return;

        setIsSaving(true);
        try {
            // Préparer les données du firewall mis à jour
            const updatedFirewall = {
                ...editingFirewall,
                nom: editForm.nom,
                ip: editForm.ip,
                firmware: editForm.firmware,
                fabricant: editForm.fabricant,
                modele: editForm.modele,
                numeroSerie: editForm.numeroSerie,
                expirationGarantie: editForm.expirationGarantie,
                site: editForm.site || '',
                vlan: editForm.vlan || '',
                licences: editForm.licences || []
            };

            // Sauvegarder l'ancien nom pour mettre à jour le mapping si nécessaire
            const oldName = editingFirewall.nom;
            const newName = editForm.nom;

            // Sauvegarder dans v_b_clients_m_firewall
            const savedRow = await saveFirewall(editingFirewall.id, updatedFirewall);

            // Mettre à jour la config locale avec la réponse de l'API
            setConfig((prev) => {
                if (!prev?.client?.equipements?.Firewalls) return prev;
                
                const updatedList = prev.client.equipements.Firewalls.map((fw) => {
                    // Utiliser l'ID pour trouver le bon firewall
                    if (fw.id === editingFirewall.id) {
                        // Reconstruire depuis la réponse de l'API
                        const { id: dataId, ...dataWithoutId } = savedRow.data || {};
                        return {
                            id: savedRow.id,
                            ...dataWithoutId,
                            nom: savedRow.data?.nom || savedRow.name || savedRow.item_key || "",
                            __fromDb: true
                        };
                    }
                    return fw;
                });

                return {
                    ...prev,
                    client: {
                        ...prev.client,
                        equipements: {
                            ...prev.client.equipements,
                            Firewalls: updatedList
                        }
                    }
                };
            });

            // Si le nom a changé, mettre à jour le mapping CheckMK
            if (oldName !== newName && checkmkMappings[oldName]) {
                setCheckmkMappings((prev) => {
                    const updated = { ...prev };
                    // Déplacer le mapping de l'ancien nom vers le nouveau nom
                    updated[newName] = {
                        ...updated[oldName],
                        equipment_name: newName
                    };
                    // Supprimer l'ancien mapping
                    delete updated[oldName];
                    return updated;
                });
            }

            // Recharger les mappings CheckMK pour s'assurer qu'ils sont à jour
            if (config?.client?.id) {
                try {
                    const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${config.client.id}`, {
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        const mappings = await response.json();
                        const mappingsMap = {};
                        mappings.forEach(m => {
                            if (m.equipment_type === 'Firewalls' && m.is_active !== false) {
                                mappingsMap[m.equipment_name] = m;
                            }
                        });
                        setCheckmkMappings(mappingsMap);
                    }
                } catch (error) {
                    console.error('❌ [Firewalls] Erreur rechargement mappings Check MK après sauvegarde:', error);
                }
            }

            toast.success("Firewall mis à jour", toastOptions);
            setEditingFirewall(null);
            setEditForm(null);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde:", error);
            toast.error("Erreur lors de la sauvegarde", toastOptions);
        } finally {
            setIsSaving(false);
        }
    };

    // Charger les firewalls depuis la base (v_b_clients_m_firewall) au montage
    useEffect(() => {
        if (!config?.client?.id || !setConfig) return;
        const controller = new AbortController();

        const loadFirewallsFromDb = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/firewall`, {
                    credentials: "include",
                    signal: controller.signal
                });
                if (!res.ok) return;
                const rows = await res.json();
                const firewallList = (rows || []).map((row) => {
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
                                Firewalls: firewallList
                            }
                        }
                    };
                });
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error("Erreur chargement firewalls:", err);
            }
        };

        loadFirewallsFromDb();
        return () => controller.abort();
    }, [config?.client?.id, setConfig]);

    // Charger les mappings Check MK
    useEffect(() => {
        if (!config?.client?.id) return;

        const loadMappings = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${config.client.id}`, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const mappings = await response.json();
                    const mappingsMap = {};
                    mappings.forEach(m => {
                        const type = (m.equipment_type || "").toLowerCase();
                        const isFirewallType = ['firewalls', 'firewall'].includes(type);
                        if (isFirewallType && m.is_active !== false && m.equipment_id) {
                            // Utiliser equipment_id comme clé principale
                            mappingsMap[m.equipment_id] = m;
                        }
                    });
                    setCheckmkMappings(mappingsMap);
                }
            } catch (error) {
                console.error('❌ [Firewalls] Erreur chargement mappings Check MK:', error);
            }
        };

        loadMappings();
    }, [config?.client?.id]);

    // Récupérer la période du rapport depuis la config
    const getReportPeriod = () => {
        if (config?.client?.checkmkPeriod) {
            return {
                start_time: config.client.checkmkPeriod.start_time,
                end_time: config.client.checkmkPeriod.end_time
            };
        }
        
        const now = new Date();
        const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const startTime = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0);
        
        return {
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
        };
    };

    // Récupérer le nombre d'événements pour un firewall (période du rapport)
    const loadEventsCount = async (firewallName, checkmkHostName) => {
        if (!checkmkHostName) return;

        const period = getReportPeriod();
        if (!period.start_time || !period.end_time) {
            setEventsCount(prev => ({ ...prev, [firewallName]: 0 }));
            setEventsData(prev => ({ ...prev, [firewallName]: [] }));

            if (typeof setData === 'function') {
                const currentData = dataRef.current || {};
                const updated = {
                    ...currentData,
                    [firewallName]: {
                        ...(currentData[firewallName] || {}),
                        eventsCount: 0,
                        eventsData: []
                    }
                };
                setData(updated);
                dataRef.current = updated;
            }
            return;
        }

        try {
            const url = new URL(`${API_BASE_URL}/checkmk/events-period/${encodeURIComponent(checkmkHostName)}`);
            url.searchParams.append('start_time', period.start_time);
            url.searchParams.append('end_time', period.end_time);
            
            const mapping = getCheckMKMapping(firewallName);
            if (mapping?.checkmk_site) {
                url.searchParams.append('site', mapping.checkmk_site);
            }
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                const eventsCountValue = result.events_count || 0;
                const eventsDataValue = result.events || [];

                setEventsCount(prev => ({ ...prev, [firewallName]: eventsCountValue }));
                setEventsData(prev => ({ ...prev, [firewallName]: eventsDataValue }));

                // Persister également dans les données du rapport pour conserver après changement de step
                if (typeof setData === 'function') {
                    const currentData = dataRef.current || {};
                    const updated = {
                        ...currentData,
                        [firewallName]: {
                            ...(currentData[firewallName] || {}),
                            eventsCount: eventsCountValue,
                            eventsData: eventsDataValue
                        }
                    };
                    setData(updated);
                    dataRef.current = updated;
                }
            } else {
                setEventsCount(prev => ({ ...prev, [firewallName]: 0 }));
                setEventsData(prev => ({ ...prev, [firewallName]: [] }));

                if (typeof setData === 'function') {
                    const currentData = dataRef.current || {};
                    const updated = {
                        ...currentData,
                        [firewallName]: {
                            ...(currentData[firewallName] || {}),
                            eventsCount: 0,
                            eventsData: []
                        }
                    };
                    setData(updated);
                    dataRef.current = updated;
                }
            }
        } catch (error) {
            console.error('Erreur récupération événements:', error);
            setEventsCount(prev => ({ ...prev, [firewallName]: 0 }));
            setEventsData(prev => ({ ...prev, [firewallName]: [] }));

            if (typeof setData === 'function') {
                const currentData = dataRef.current || {};
                const updated = {
                    ...currentData,
                    [firewallName]: {
                        ...(currentData[firewallName] || {}),
                        eventsCount: 0,
                        eventsData: []
                    }
                };
                setData(updated);
                dataRef.current = updated;
            }
        }
    };

    // Récupérer le tableau de disponibilité d'un firewall
    const loadAvailabilityData = async (firewallName, checkmkHostName) => {
        if (!checkmkHostName) return;

        try {
            const url = new URL(`${API_BASE_URL}/checkmk/availability-table/${encodeURIComponent(checkmkHostName)}`);
            const mapping = getCheckMKMapping(firewallName);
            if (mapping?.checkmk_site) {
                url.searchParams.append('site', mapping.checkmk_site);
            }
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                // L'API retourne un objet avec une propriété 'availability' qui contient les données
                const availabilityValue = result.availability || result;
                setAvailabilityData(prev => ({
                    ...prev,
                    [firewallName]: availabilityValue
                }));

                // Persister également dans les données du rapport
                if (typeof setData === 'function') {
                    const currentData = dataRef.current || {};
                    const updated = {
                        ...currentData,
                        [firewallName]: {
                            ...(currentData[firewallName] || {}),
                            availabilityData: availabilityValue
                        }
                    };
                    setData(updated);
                    dataRef.current = updated;
                }
            } else {
                console.warn(`⚠️ [Disponibilité] Erreur pour ${firewallName}: ${response.status}`);
            }
        } catch (error) {
            console.error('Erreur récupération disponibilité:', error);
        }
    };

    // Fonction pour charger les données CheckMK
    const loadCheckMKData = async (firewallName, checkmkHostName, showToast = true) => {
        if (loadingCheckMK[firewallName]) return;
        
        // Réinitialiser le switch à 'stats' au début de la synchronisation
        setSyncMode(prev => ({ ...prev, [firewallName]: 'stats' }));
        
        // Supprimer la note manuelle pour que la note calculée reprenne le dessus
        const currentDataBeforeSync = dataRef.current || {};
        const updatedBeforeSync = {
            ...currentDataBeforeSync,
            [firewallName]: {
                ...(currentDataBeforeSync[firewallName] || {}),
                syncMode: 'stats',
                manualHealthScore: undefined // Supprimer la note manuelle lors de la synchronisation
            }
        };
        setData(updatedBeforeSync);
        dataRef.current = updatedBeforeSync;
        
        // Initialiser l'animation à 0 immédiatement
        setAnimatedScore(prev => ({ ...prev, [firewallName]: 0 }));
        setScoreAnimationComplete(prev => ({ ...prev, [firewallName]: false }));
        
        setLoadingCheckMK(prev => ({ ...prev, [firewallName]: true }));
        
        try {
            const period = getReportPeriod();
            const url = new URL(`${API_BASE_URL}/checkmk/services/${encodeURIComponent(checkmkHostName)}`);
            if (period.start_time && period.end_time) {
                url.searchParams.append('start_time', period.start_time);
                url.searchParams.append('end_time', period.end_time);
            }
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                const services = result.services || [];
                
                const checkmkDataValue = {
                    services: services,
                    serviceInfo: {
                        total: services.length
                    }
                };
                
                setCheckmkData(prev => ({
                    ...prev,
                    [firewallName]: checkmkDataValue
                }));

                const currentData = dataRef.current || {};
                const updated = {
                    ...currentData,
                    [firewallName]: {
                        ...(currentData[firewallName] || {}),
                        checkmkData: checkmkDataValue,
                        lastSyncDate: new Date().toISOString()
                    }
                };
                setData(updated);
                dataRef.current = updated;
                
                // Événements et disponibilité : période du rapport si disponible, sinon appels séparés
                const period = getReportPeriod();
                const mapping = getCheckMKMapping(firewallName);
                if (period?.start_time && period?.end_time) {
                    try {
                        const reportData = await getCheckMKReportPeriodData(
                            checkmkHostName,
                            period.start_time,
                            period.end_time,
                            mapping?.checkmk_site || null
                        );
                        const ev = reportData?.events || {};
                        const av = reportData?.availability || {};
                        const eventsCountValue = ev.events_count ?? 0;
                        const eventsDataValue = ev.events || [];
                        const availabilityValue = av.availability || null;

                        setEventsCount(prev => ({ ...prev, [firewallName]: eventsCountValue }));
                        setEventsData(prev => ({ ...prev, [firewallName]: eventsDataValue }));
                        if (availabilityValue) {
                            setAvailabilityData(prev => ({ ...prev, [firewallName]: availabilityValue }));
                        } else {
                            await loadAvailabilityData(firewallName, checkmkHostName);
                        }

                        // Persister événements et disponibilité dans data pour conserver après changement de step
                        if (typeof setData === 'function') {
                            const currentData = dataRef.current || {};
                            const updated = {
                                ...currentData,
                                [firewallName]: {
                                    ...(currentData[firewallName] || {}),
                                    eventsCount: eventsCountValue,
                                    eventsData: eventsDataValue,
                                    ...(availabilityValue && { availabilityData: availabilityValue })
                                }
                            };
                            setData(updated);
                            dataRef.current = updated;
                        }
                    } catch (e) {
                        await Promise.all([
                            loadEventsCount(firewallName, checkmkHostName),
                            loadAvailabilityData(firewallName, checkmkHostName)
                        ]);
                    }
                } else {
                    await Promise.all([
                        loadEventsCount(firewallName, checkmkHostName),
                        loadAvailabilityData(firewallName, checkmkHostName)
                    ]);
                }
                
                // Ne pas afficher de notification individuelle lors de la synchronisation globale
                // (showToast est false lors de syncAllCheckMK)
            } else {
                // Ne pas afficher de notification individuelle
            }
        } catch (error) {
            console.error('Erreur synchronisation CheckMK:', error);
            // Ne pas afficher de notification individuelle
        } finally {
            setLoadingCheckMK(prev => ({ ...prev, [firewallName]: false }));
            
            // Nettoyer les anciens timers avant d'en créer de nouveaux
            clearAnimationTimers(firewallName);
            
            // Initialiser le stockage des timers pour ce firewall
            animationTimersRef.current[firewallName] = {};
            
            // Démarrer les animations après la synchronisation
            setTimeout(() => {
                // Animation de la note de santé
                const finalScore = getFirewallHealthScore(firewallName);
                if (finalScore !== null) {
                    setAnimatedScore(prev => ({ ...prev, [firewallName]: 0 }));
                    setScoreAnimationComplete(prev => ({ ...prev, [firewallName]: false }));
                    const duration = 3000;
                    const steps = 120;
                    const increment = finalScore / steps;
                    let currentStep = 0;
                    
                    const scoreTimer = setInterval(() => {
                        currentStep++;
                        const newValue = Math.min(increment * currentStep, finalScore);
                        setAnimatedScore(prev => ({ ...prev, [firewallName]: Math.round(newValue) }));
                        
                        if (currentStep >= steps) {
                            clearInterval(scoreTimer);
                            setAnimatedScore(prev => ({ ...prev, [firewallName]: finalScore }));
                            const scoreTimeout = setTimeout(() => {
                                setScoreAnimationComplete(prev => ({ ...prev, [firewallName]: true }));
                            }, 100);
                            if (animationTimersRef.current[firewallName]) {
                                animationTimersRef.current[firewallName].scoreTimeout = scoreTimeout;
                            }
                        }
                    }, duration / steps);
                    
                    if (animationTimersRef.current[firewallName]) {
                        animationTimersRef.current[firewallName].scoreTimer = scoreTimer;
                    }
                }

                // Animation de la disponibilité
                const availability = availabilityData[firewallName];
                if (availability && availability.up !== undefined) {
                    const finalAvailability = parseFloat(availability.up || 0);
                    setAnimatedAvailability(prev => ({ ...prev, [firewallName]: 0 }));
                    const duration = 2000;
                    const steps = 100;
                    const increment = finalAvailability / steps;
                    let currentStep = 0;
                    
                    const availabilityTimer = setInterval(() => {
                        currentStep++;
                        const newValue = Math.min(increment * currentStep, finalAvailability);
                        setAnimatedAvailability(prev => ({ ...prev, [firewallName]: Math.round(newValue) }));
                        
                        if (currentStep >= steps) {
                            clearInterval(availabilityTimer);
                            setAnimatedAvailability(prev => ({ ...prev, [firewallName]: finalAvailability }));
                        }
                    }, duration / steps);
                    
                    if (animationTimersRef.current[firewallName]) {
                        animationTimersRef.current[firewallName].availabilityTimer = availabilityTimer;
                    }
                }

                // Animation des services monitorés
                const finalServices = checkmkData[firewallName]?.services?.length || 0;
                if (finalServices > 0) {
                    setAnimatedServices(prev => ({ ...prev, [firewallName]: 0 }));
                    const duration = 2000;
                    const steps = 100;
                    const increment = finalServices / steps;
                    let currentStep = 0;
                    
                    const servicesTimer = setInterval(() => {
                        currentStep++;
                        const newValue = Math.min(increment * currentStep, finalServices);
                        setAnimatedServices(prev => ({ ...prev, [firewallName]: Math.round(newValue) }));
                        
                        if (currentStep >= steps) {
                            clearInterval(servicesTimer);
                            setAnimatedServices(prev => ({ ...prev, [firewallName]: finalServices }));
                        }
                    }, duration / steps);
                    
                    if (animationTimersRef.current[firewallName]) {
                        animationTimersRef.current[firewallName].servicesTimer = servicesTimer;
                    }
                }

                // Animation des événements (cible = nombre de critiques uniquement)
                const eventsArr = dataRef.current?.[firewallName]?.eventsData;
                const finalEvents = Array.isArray(eventsArr)
                    ? eventsArr.filter((e) => (e.state ?? e.state_type ?? 0) === 2).length
                    : eventsCount[firewallName];
                if (finalEvents !== undefined) {
                    setAnimatedEvents(prev => ({ ...prev, [firewallName]: 0 }));
                    const duration = 2000;
                    const steps = 100;
                    const increment = finalEvents / steps;
                    let currentStep = 0;
                    
                    const eventsTimer = setInterval(() => {
                        currentStep++;
                        const newValue = Math.min(increment * currentStep, finalEvents);
                        setAnimatedEvents(prev => ({ ...prev, [firewallName]: Math.round(newValue) }));
                        
                        if (currentStep >= steps) {
                            clearInterval(eventsTimer);
                            setAnimatedEvents(prev => ({ ...prev, [firewallName]: finalEvents }));
                        }
                    }, duration / steps);
                    
                    if (animationTimersRef.current[firewallName]) {
                        animationTimersRef.current[firewallName].eventsTimer = eventsTimer;
                    }
                }
            }, 100);
        }
    };

    // Synchroniser tous les firewalls mappés avec Check MK
    const syncAllCheckMK = useCallback(async () => {
        const mappedFirewalls = firewallList.filter(fw => fw.id && checkmkMappings[fw.id]);
        
        if (mappedFirewalls.length === 0) {
            toast.warning('Aucun firewall mappé avec Check MK', toastOptions);
            return;
        }
        
        const syncPromises = mappedFirewalls.map(fw => 
            loadCheckMKData(fw.nom, checkmkMappings[fw.id].checkmk_host_name, false)
        );
        
        try {
            await Promise.all(syncPromises);
            toast.success(`Synchronisation terminée`, toastOptions);
        } catch (error) {
            toast.error(`Erreur lors de la synchronisation`, toastOptions);
        }
    }, [firewallList, checkmkMappings]);

    // Mettre à jour la ref de syncAllCheckMK
    useEffect(() => {
        syncAllCheckMKRef.current = syncAllCheckMK;
    }, [syncAllCheckMK]);

    // Mettre à jour la ref de onSyncAllCheckMKReady
    useEffect(() => {
        onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
    }, [onSyncAllCheckMKReady]);

    // Exposer la fonction syncAllCheckMK et les états nécessaires au parent
    const lastNotifiedRef = useRef({ hasMappings: null, isLoading: null });

    useEffect(() => {
        if (onSyncAllCheckMKReadyRef.current && syncAllCheckMKRef.current) {
            const hasMappings = firewallList.some(fw => fw.id && checkmkMappings[fw.id]);
            const isLoading = Object.values(loadingCheckMK).some(loading => loading);

            // Éviter de renvoyer la même info en boucle pour stabiliser le bouton de synchro
            if (
                lastNotifiedRef.current.hasMappings === hasMappings &&
                lastNotifiedRef.current.isLoading === isLoading
            ) {
                return;
            }

            onSyncAllCheckMKReadyRef.current({
                syncAllCheckMK: syncAllCheckMKRef.current,
                hasCheckMKMappings: hasMappings,
                isLoading
            });

            lastNotifiedRef.current = { hasMappings, isLoading };
        }
    }, [checkmkMappings, loadingCheckMK, firewallList]);

    // Initialiser le mode à 'stats' par défaut pour tous les firewalls
    useEffect(() => {
        if (firewallList.length > 0) {
            setSyncMode(prev => {
                const updated = { ...prev };
                let hasChanges = false;
                firewallList.forEach(fw => {
                    if (updated[fw.nom] === undefined) {
                        updated[fw.nom] = 'stats';
                        hasChanges = true;
                    }
                });
                return hasChanges ? updated : prev;
            });
        }
    }, [firewallList]);

    // Mettre à jour dataRef quand data change
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Restaurer les données CheckMK (services, événements, disponibilité) depuis data
    useEffect(() => {
        if (!data || !firewallList.length) return;

        let hasCheckMKData = false;
        const restoredCheckmkData = {};
        const restoredEventsCount = {};
        const restoredEventsData = {};
        const restoredAvailabilityData = {};

        firewallList.forEach(firewall => {
            const firewallData = data[firewall.nom];
            if (!firewallData) return;

            const hasData =
                firewallData.checkmkData ||
                firewallData.eventsCount !== undefined ||
                firewallData.availabilityData;

            if (!hasData) return;

            hasCheckMKData = true;

            if (firewallData.checkmkData) {
                restoredCheckmkData[firewall.nom] = firewallData.checkmkData;
            }
            if (firewallData.eventsCount !== undefined) {
                restoredEventsCount[firewall.nom] = firewallData.eventsCount;
            }
            if (firewallData.eventsData) {
                restoredEventsData[firewall.nom] = firewallData.eventsData;
            }
            if (firewallData.availabilityData) {
                restoredAvailabilityData[firewall.nom] = firewallData.availabilityData;
            }
        });

        if (!hasCheckMKData) return;

        const key = JSON.stringify(Object.keys(restoredCheckmkData).sort());
        if (hasRestoredDataRef.current === key) return;

        if (Object.keys(restoredCheckmkData).length > 0) {
            setCheckmkData(prev => ({ ...prev, ...restoredCheckmkData }));
        }
        if (Object.keys(restoredEventsCount).length > 0) {
            setEventsCount(prev => ({ ...prev, ...restoredEventsCount }));
        }
        if (Object.keys(restoredEventsData).length > 0) {
            setEventsData(prev => ({ ...prev, ...restoredEventsData }));
        }
        if (Object.keys(restoredAvailabilityData).length > 0) {
            setAvailabilityData(prev => ({ ...prev, ...restoredAvailabilityData }));
        }

        hasRestoredDataRef.current = key;
    }, [data, firewallList]);

    // Nettoyer tous les timers d'animation au démontage
    useEffect(() => {
        return () => {
            // Nettoyer tous les timers existants
            Object.keys(animationTimersRef.current).forEach(firewallName => {
                clearAnimationTimers(firewallName);
            });
        };
    }, [clearAnimationTimers]);

    useEffect(() => {
        if (!firewallList.length || (data && Object.keys(data).length > 0)) return;

        const initializedData = {};
        firewallList.forEach(firewall => {
            const services = {};
            defaultServices.forEach(service => {
                services[service] = {
                    ok: 100,
                    warn: 0,
                    crit: 0
                };
            });
            // Initialiser les modules à "active" (vert) par défaut
            const modules = {};
            availableModules.forEach(module => {
                modules[module] = "active";
            });
            
            initializedData[firewall.nom] = {
                ...services,
                modules: modules,
                comment: ""
            };
        });

        setData(initializedData);
    }, [firewallList, data, setData]);

    // Grouper les firewalls par site
    const groupedBySite = firewallList.reduce((acc, fw) => {
        const siteName = fw.site || "Sans site";
        if (!acc[siteName]) {
            acc[siteName] = [];
        }
        acc[siteName].push(fw);
        return acc;
    }, {});

    // Trier les sites (Sans site en dernier)
    const sortedSites = Object.keys(groupedBySite).sort((a, b) => {
        if (a === "Sans site") return 1;
        if (b === "Sans site") return -1;
        return a.localeCompare(b);
    });

    if (!firewallList || firewallList.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <p>Aucun firewall configuré pour ce client.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {sortedSites.map((siteName) => {
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
                                {groupedBySite[siteName].length > 0 && (
                                  <span className={styles.siteCount}>
                                    {groupedBySite[siteName].length} firewall{groupedBySite[siteName].length > 1 ? 's' : ''}
                                  </span>
                                )}
                            </h2>
                        </div>
                        <div className={styles.firewallGrid}>
                            {groupedBySite[siteName]
                                .sort((a, b) => a.nom.localeCompare(b.nom))
                                .map((firewall, i) => {
                        const firewallInfo = getFirewallInfo(firewall);
                        const licenseStatus = getLicenseStatus(firewall);
                        const haInfo = getHAInfo(firewall);
                        const isModulesView = syncMode[firewall.nom] === 'modules';
                        const needsSyncAttention = Boolean(
                            firewall.id && checkmkMappings[firewall.id] &&
                            !data?.[firewall.nom]?.lastSyncDate &&
                            !loadingCheckMK[firewall.nom]
                        );
                        
                        return (
                            <React.Fragment key={i}>
                            <div className={`${styles.firewallCard} ${styles.withComment} ${styles.firewallCardFlex}`}>
                                {/* En-tête de la carte */}
                                <div className={styles.cardHeader}>
                                    <div className={styles.headerLeft}>
                                        <div className={styles.firewallInfo}>
                                            <h3 className={styles.firewallName}>
                                                <span className={styles.firewallNameSection}>
                                                    <span className={styles.iconWrapper}>
                                                        <IconifyIcon
                                                            icon="solar:shield-bold"
                                                            width={28}
                                                            height={28}
                                                            className={styles.iconStyle}
                                                        />
                                                    </span>
                                                    <span className={styles.firewallNameText}>
                                                        {firewall.nom}
                                                    </span>
                                                    {haInfo && (
                                                        <span className={`${styles.roleLabel} ${styles.roleLabelInline}`}>
                                                            HA {haInfo.role}
                                                        </span>
                                                    )}
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                    <div className={styles.firewallType}>
                                        {/* Boutons SYNC et GLPI */}
                                        <div className={styles.buttonGroup}>
                                            {firewall.id && checkmkMappings[firewall.id] && (
                                                <SmartTooltip content="Synchroniser avec Check MK" as="span" style={{ display: 'inline-flex' }}>
                                                <button
                                                    type="button"
                                                    className={`${styles.syncButton} ${needsSyncAttention ? styles.syncButtonAttention : ''}`}
                                                    onClick={() => {
                                                        if (!loadingCheckMK[firewall.nom]) {
                                                            loadCheckMKData(firewall.nom, checkmkMappings[firewall.id].checkmk_host_name);
                                                        }
                                                    }}
                                                    title={`Mappé vers Check MK: ${checkmkMappings[firewall.id].checkmk_host_name}. Cliquer pour synchroniser.`}
                                                    disabled={loadingCheckMK[firewall.nom]}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '0.35rem',
                                                        background: 'var(--bg-primary)',
                                                        color: '#6b7280',
                                                        border: '2px solid var(--border-secondary)',
                                                        borderRadius: '8px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '600',
                                                        cursor: loadingCheckMK[firewall.nom] ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        opacity: loadingCheckMK[firewall.nom] ? 0.5 : 1,
                                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!loadingCheckMK[firewall.nom]) {
                                                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!loadingCheckMK[firewall.nom]) {
                                                            e.currentTarget.style.borderColor = 'var(--border-secondary)';
                                                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                                        }
                                                    }}
                                                >
                                                    <IconifyIcon
                                                        icon="material-symbols:sync"
                                                        width={14}
                                                        height={14}
                                                        className={loadingCheckMK[firewall.nom] ? styles.loadingIcon : ''}
                                                    />
                                                </button>
                                                </SmartTooltip>
                                            )}
                                            <SmartTooltip content="Éditer le firewall" as="span" style={{ display: 'inline-flex' }}>
                                            <button
                                                type="button"
                                                className={styles.editButton}
                                                onClick={() => {
                                                    setEditingFirewall(firewall);
                                                    setEditForm({
                                                        nom: firewall.nom || '',
                                                        ip: firewall.ip || '',
                                                        firmware: firewall.firmware || '',
                                                        fabricant: firewall.fabricant || '',
                                                        modele: firewall.modele || '',
                                                        numeroSerie: firewall.numeroSerie || '',
                                                        expirationGarantie: firewall.expirationGarantie || '',
                                                        site: firewall.site || '',
                                                        vlan: firewall.vlan || '',
                                                        licences: firewall.licences ? [...firewall.licences] : []
                                                    });
                                                }}
                                                title="Éditer le firewall"
                                            >
                                                <IconifyIcon
                                                    icon="material-symbols:edit"
                                                    width={14}
                                                    height={14}
                                                />
                                            </button>
                                            </SmartTooltip>
                                        </div>
                                    </div>
                                </div>
                                {(firewallInfo.mainInfo.length > 0 ||
                                  firewallInfo.deviceInfo.length > 0 ||
                                  firewallInfo.warrantyInfo ||
                                  firewallInfo.maintenanceInfo) && (
                                    <div className={`${styles.firewallMeta} ${styles.firewallMetaFlex}`}>
                                        {/* Gauche : MARQUE MODELE SN - IP - FW */}
                                        <span className={styles.flexOne}>
                                            {[
                                                firewallInfo.deviceInfo.join(" "),
                                                firewallInfo.mainInfo.join(" • ")
                                            ].filter(Boolean).join(" • ")}
                                        </span>
                                        {/* Droite : Licences */}
                                        {(firewallInfo.warrantyInfo || firewallInfo.maintenanceInfo) && (
                                            <div className={styles.licenseInfoRow}>
                                                {firewallInfo.warrantyInfo && (
                                                    <span className={styles.iconTextRow}>
                                                        <IconifyIcon
                                                            icon="streamline-flex:warranty-badge-highlight-solid"
                                                            width={12}
                                                            height={12}
                                                            className={styles.iconGray}
                                                        />
                                                        {firewallInfo.warrantyInfo.date}
                                                    </span>
                                                )}
                                                {firewallInfo.maintenanceInfo && (
                                                    <>
                                                        {firewallInfo.warrantyInfo && '•'}
                                                        <span className={styles.iconTextRow}>
                                                            <IconifyIcon
                                                                icon="ix:maintenance-octagon-filled"
                                                                width={12}
                                                                height={12}
                                                                className={styles.iconGray}
                                                            />
                                                            {firewallInfo.maintenanceInfo.date}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={`${styles.firewallScrollable} ${styles.firewallScrollableDynamic} ${isModulesView ? styles.firewallScrollableHidden : styles.firewallScrollableAuto}`}>
                                <div className={styles.firewallCardContent}>
                                    {/* Wrapper fixe pour les 3 vues (Dashboard / Stats avancées / Modules) */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '140px',
                                            height: '140px',
                                            boxSizing: 'border-box',
                                            width: '100%',
                                            padding: '0.75rem 0.5rem'
                                        }}
                                    >
                                    {/* Statut des modules - Vue Modules */}
                                    {syncMode[firewall.nom] === 'modules' && (
                                        <div className={styles.modulesCompact}>
                                            <div className={styles.modulesGridCompact}>
                                                {availableModules.map((module) => {
                                                    const currentStatus = data?.[firewall.nom]?.modules?.[module] || "active";

                                                    const getNextStatus = (current) => {
                                                        const statusOrder = ["inactive", "active", "disabled"];
                                                        const currentIndex = statusOrder.indexOf(current);
                                                        return statusOrder[(currentIndex + 1) % statusOrder.length];
                                                    };

                                                    const getStatusClass = (status) => {
                                                        switch (status) {
                                                            case "active":
                                                                return "active";
                                                            case "disabled":
                                                                return "disabled";
                                                            default:
                                                                return "inactive";
                                                        }
                                                    };

                                                    const statusClass = getStatusClass(currentStatus);

                                                    return (
                                                        <button
                                                            key={module}
                                                            type="button"
                                                            className={`${styles.moduleItem} ${styles.moduleCompact} ${styles[statusClass]}`}
                                                            onClick={() => updateModuleStatus(firewall.nom, module, getNextStatus(currentStatus))}
                                                        >
                                                            <span className={styles.moduleName}>{module}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cartes statistiques - Vue Stats (Dashboard) */}
                                    {(syncMode[firewall.nom] === 'stats' || !syncMode[firewall.nom]) && (
                                        <div className={styles.statsWrapper}>
                                        {loadingCheckMK[firewall.nom] ? (
                                            <div className={styles.loadingWrapper}>
                                                <IconifyIcon
                                                    icon="material-symbols:sync"
                                                    width={32}
                                                    height={32}
                                                    className={styles.loadingIcon}
                                                />
                                                <span className={styles.loadingText}>
                                                    Synchronisation en cours
                                                </span>
                                            </div>
                                        ) : (
                                        <>
                                        {/* Carte: Santé du firewall */}
                                        {(() => {
                                            const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                            const isMapped = Boolean(mapping);
                                            const hasSyncData = Boolean(data?.[firewall.nom]?.lastSyncDate);
                                            const shouldShowNA = isMapped && !hasSyncData;
                                            const calculatedScore = shouldShowNA ? null : getFirewallHealthScore(firewall.nom);
                                            const manualScore = data?.[firewall.nom]?.manualHealthScore;
                                            const healthScore = shouldShowNA ? null : (manualScore !== undefined ? manualScore : calculatedScore);
                                            const isLoading = false;
                                            const isAnimating = animatedScore[firewall.nom] !== undefined && !scoreAnimationComplete[firewall.nom];
                                            const isEditing = editingScore[firewall.nom];
                                            const serviceAvailabilityWeightPercent = isMapped ? 30 : 50;

                                            const scoreBreakdown = [
                                                {
                                                    label: "Événements",
                                                    description: "Alertes remontées par CheckMK",
                                                    weight: isMapped ? "20 pts" : "0 pts"
                                                },
                                                {
                                                    label: "Disponibilité",
                                                    description: "Taux de disponibilité supervisé du firewall",
                                                    weight: isMapped ? "30 pts" : "0 pts"
                                                },
                                                {
                                                    label: "Disponibilité des services",
                                                    description: "OK / WARN / CRIT pour chaque service monitoré",
                                                    weight: `${serviceAvailabilityWeightPercent} pts`
                                                },
                                                {
                                                    label: "Modules firewall",
                                                    description: "Activation des modules Stormshield (VPN, SD-WAN, etc.)",
                                                    weight: isMapped ? "20 pts" : "50 pts"
                                                }
                                            ].filter(item => {
                                                const weightNum = parseInt(item.weight.replace(' pts', ''));
                                                return weightNum > 0;
                                            });
                                            
                                            // Score affiché : si non synchronisé, on garde une carte affichée (lettre par défaut) mais tout en gris
                                            const placeholderScore = 95;
                                            let displayScore = null;
                                            if (!isLoading) {
                                                if (shouldShowNA) {
                                                    displayScore = placeholderScore;
                                                } else {
                                                    displayScore = isAnimating ? animatedScore[firewall.nom] : healthScore;
                                                }
                                            }
                                            
                                            // Convertir le score en lettre (A, B, C, D, E, F)
                                            const displayLetter = displayScore !== null ? scoreToLetter(displayScore) : null;
                                            const scoreLetter = healthScore !== null ? scoreToLetter(healthScore) : null;
                                            
                                            // Déterminer la couleur selon la lettre
                                            const scoreColor = scoreLetter ? scoreToColor(healthScore) : '#9ca3af';
                                            const displayColor = shouldShowNA
                                                ? '#9ca3af'
                                                : (displayScore !== null ? scoreToColor(displayScore) : scoreColor);
                                            const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;
                                            
                                            return (
                                                <>
                                                <div
                                                    className={styles.scoreCardWrapper}
                                                    onMouseLeave={() => {
                                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.firewallName === firewall.nom) {
                                                            setHoveredTooltip(null);
                                                        }
                                                    }}
                                                >
                                                <div className={`${styles.scoreCardLeft} ${isLoading ? styles.statCardDisabled : ''}`}>
                                                    {isLoading && (
                                                        <div className={styles.loadingCenter}>
                                                            <FaSync className={styles.loadingSyncIcon} />
                                                            Synchronisation...
                                                        </div>
                                                    )}
                                                    {!isLoading && (
                                                        <div className={styles.scoreInfoIcon}>
                                                            <div className={styles.scoreTooltipContainer}>
                                                                <IconifyIcon
                                                                    icon="material-symbols:info"
                                                                    width={16}
                                                                    height={16}
                                                                    className={styles.scoreTooltipIcon}
                                                                    onMouseEnter={(e) => {
                                                                        setHoveredTooltip({
                                                                            type: 'score',
                                                                            firewallName: firewall.nom,
                                                                            mouseX: e.clientX,
                                                                            mouseY: e.clientY,
                                                                            scoreBreakdown
                                                                        });
                                                                    }}
                                                                    onMouseMove={(e) => {
                                                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.firewallName === firewall.nom) {
                                                                            setHoveredTooltip(prev => ({
                                                                                ...prev,
                                                                                mouseX: e.clientX,
                                                                                mouseY: e.clientY
                                                                            }));
                                                                        }
                                                                    }}
                                                                    onMouseLeave={() => {
                                                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.firewallName === firewall.nom) {
                                                                            setHoveredTooltip(null);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!isLoading && (
                                                        <div className={styles.scoreDisplayWrapper}>
                                                            <div className={styles.scoreInputWrapper}>
                                                                {isEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        value={editingScoreValue[firewall.nom] !== undefined ? editingScoreValue[firewall.nom] : displayScore}
                                                                        onChange={(e) => setEditingScoreValue(prev => ({ ...prev, [firewall.nom]: e.target.value }))}
                                                                        onBlur={() => saveEditScore(firewall.nom)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                saveEditScore(firewall.nom);
                                                                            } else if (e.key === 'Escape') {
                                                                                cancelEditScore(firewall.nom);
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                        className={styles.scoreInput}
                                                                        style={{
                                                                            color: displayColor,
                                                                            borderColor: displayColor
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        role="button"
                                                                        tabIndex={displayScore !== null ? 0 : -1}
                                                                        onKeyDown={(e) => {
                                                                            if (displayScore !== null && !isLoading && (e.key === 'Enter' || e.key === ' ')) {
                                                                                e.preventDefault();
                                                                                startEditScore(firewall.nom, displayScore);
                                                                            }
                                                                        }}
                                                                        title={displayScore !== null ? "Cliquer pour sélectionner une note, double-cliquer pour éditer précisément" : ""}
                                                                        className={`${displayScore !== null ? styles.scoreLetterWrapper : styles.scoreLetterWrapperDisabled} ${shouldShowNA ? styles.scoreLetterWrapperGrayscale : ''}`}
                                                                    >
                                                                        <LetterScale 
                                                                            activeLetter={displayLetter} 
                                                                            letters={["F", "E", "D", "C", "B", "A"]}
                                                                            size="normal"
                                                                            onSelect={!isLoading ? (letter) => handleManualLetterSelect(firewall.nom, letter) : undefined}
                                                                            highlightLetter={!shouldShowNA && manualScoreChanged && calculatedScore !== null && !isEditing ? scoreToLetter(calculatedScore) : null}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {calculatedScore !== null && manualScore !== undefined && isEditing && (
                                                                <div className={styles.scoreNoteHint}>
                                                                    Note calculée: {calculatedScore} ({scoreToLetter(calculatedScore)})
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Ligne : Services, Événements et Disponibilité (vue compacte, condensée) */}
                                                <div className={styles.statsGrid}>
                                            {/* Carte: Nombre de services monitorés */}
                                            <div 
                                                className={`${styles.statCard} ${loadingCheckMK[firewall.nom] ? styles.statCardDisabled : (checkmkData[firewall.nom] ? styles.statCardEnabled : styles.statCardDefault)}`}
                                                onMouseEnter={(e) => {
                                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                                    if (mapping && checkmkData[firewall.nom]) {
                                                        setHoveredTooltip({
                                                            type: 'services',
                                                            firewallName: firewall.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseMove={(e) => {
                                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                                    if (mapping && checkmkData[firewall.nom] && hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.firewallName === firewall.nom) {
                                                        setHoveredTooltip({
                                                            type: 'services',
                                                            firewallName: firewall.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    if (hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.firewallName === firewall.nom) {
                                                        setHoveredTooltip(null);
                                                    }
                                                }}
                                            >
                                                <IconifyIcon
                                                    icon="material-symbols-light:view-module"
                                                    width={22}
                                                    height={22}
                                                    className={styles.statIcon}
                                                />
                                                {!(firewall.id && getCheckMKMapping(firewall.id)) ? (
                                                    <div className={styles.statCardNotMapped}>
                                                        <div className={styles.statValueNotMapped}>
                                                            N/A
                                                        </div>
                                                        <div className={styles.statLabelNotMapped}>
                                                            Non mappé
                                                        </div>
                                                    </div>
                                                ) : loadingCheckMK[firewall.nom] ? (
                                                    <div className={styles.loadingRow}>
                                                        <FaSync className={styles.loadingIconSmall} />
                                                        Chargement...
                                                    </div>
                                                ) : (
                                                    <div className={`${styles.statValue} ${checkmkData[firewall.nom] ? styles.statValuePrimary : styles.statValueSecondary}`}>
                                                        {checkmkData[firewall.nom] 
                                                            ? (animatedServices[firewall.nom] !== undefined ? animatedServices[firewall.nom] : (checkmkData[firewall.nom]?.services?.length || 0))
                                                            : 'N/A'}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Carte: Nombre d'événements critiques */}
                                            {(() => {
                                                const arr = Array.isArray(eventsData[firewall.nom]) ? eventsData[firewall.nom] : [];
                                                const criticalCount = arr.filter((e) => (e.state ?? e.state_type ?? 0) === 2).length;
                                                const hasEventsData = arr.length > 0;
                                                const displayCount = hasEventsData ? criticalCount : (eventsCount[firewall.nom] !== undefined ? 0 : undefined);
                                                const showWarning = displayCount !== undefined && displayCount > 0;
                                                return (
                                            <div 
                                                className={`${styles.statCard} ${loadingCheckMK[firewall.nom] ? styles.statCardDisabled : (displayCount !== undefined ? styles.statCardEnabled : styles.statCardDefault)}`}
                                                onMouseEnter={(e) => {
                                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                                    if (mapping && hasEventsData) {
                                                        setHoveredTooltip({
                                                            type: 'events',
                                                            firewallName: firewall.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseMove={(e) => {
                                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                                    if (mapping && hasEventsData && hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.firewallName === firewall.nom) {
                                                        setHoveredTooltip({
                                                            type: 'events',
                                                            firewallName: firewall.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    if (hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.firewallName === firewall.nom) {
                                                        setHoveredTooltip(null);
                                                    }
                                                }}
                                            >
                                                <IconifyIcon
                                                    icon="mingcute:alert-fill"
                                                    width={22}
                                                    height={22}
                                                    className={styles.statIcon}
                                                />
                                                {!(firewall.id && getCheckMKMapping(firewall.id)) ? (
                                                    <div className={styles.statCardNotMapped}>
                                                        <div className={styles.statValueNotMapped}>
                                                            N/A
                                                        </div>
                                                        <div className={styles.statLabelNotMapped}>
                                                            Non mappé
                                                        </div>
                                                    </div>
                                                ) : loadingCheckMK[firewall.nom] ? (
                                                    <div className={styles.loadingRow}>
                                                        <FaSync className={styles.loadingIconSmall} />
                                                        Chargement...
                                                    </div>
                                                ) : (
                                                    <div className={`${styles.statValue} ${displayCount !== undefined ? (showWarning ? styles.statValueEventsWarning : styles.statValueEventsNormal) : styles.statValueSecondary}`}>
                                                        {displayCount !== undefined 
                                                            ? (hasEventsData ? displayCount : (animatedEvents[firewall.nom] ?? displayCount))
                                                            : (animatedEvents[firewall.nom] ?? 'N/A')}
                                                    </div>
                                                )}
                                            </div>
                                                );
                                            })()}
                                            
                                            {/* Carte: Disponibilité */}
                                            <div 
                                                className={`${styles.statCard} ${loadingCheckMK[firewall.nom] ? styles.statCardDisabled : (availabilityData[firewall.nom] ? styles.statCardEnabled : styles.statCardDefault)}`}
                                                onMouseEnter={(e) => {
                                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                                    if (mapping && availabilityData[firewall.nom]) {
                                                        setHoveredTooltip({
                                                            type: 'availability',
                                                            firewallName: firewall.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseMove={(e) => {
                                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                                    if (mapping && availabilityData[firewall.nom] && hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.firewallName === firewall.nom) {
                                                        setHoveredTooltip({
                                                            type: 'availability',
                                                            firewallName: firewall.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    if (hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.firewallName === firewall.nom) {
                                                        setHoveredTooltip(null);
                                                    }
                                                }}
                                            >
                                            <IconifyIcon
                                                icon="tabler:gauge"
                                                width={22}
                                                height={22}
                                                className={styles.statIcon}
                                            />
                                            {!(firewall.id && getCheckMKMapping(firewall.id)) ? (
                                                <div className={styles.statCardNotMapped}>
                                                    <div className={styles.statValueNotMapped}>
                                                        N/A
                                                    </div>
                                                    <div className={styles.statLabelNotMapped}>
                                                        Non mappé
                                                    </div>
                                                </div>
                                            ) : loadingCheckMK[firewall.nom] ? (
                                                <div className={styles.loadingRow}>
                                                    <FaSync className={styles.loadingIconSmall} />
                                                    Chargement...
                                                </div>
                                            ) : (
                                                <div 
                                                    className={styles.statValueAvailability}
                                                    style={{ 
                                                        color: availabilityData[firewall.nom] && availabilityData[firewall.nom].up !== undefined
                                                            ? (() => {
                                                                const displayValue = animatedAvailability[firewall.nom] !== undefined 
                                                                    ? animatedAvailability[firewall.nom] 
                                                                    : parseFloat(availabilityData[firewall.nom].up || 0);
                                                                return getProgressiveColor(displayValue);
                                                            })()
                                                            : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    {availabilityData[firewall.nom] && availabilityData[firewall.nom].up !== undefined 
                                                        ? `${animatedAvailability[firewall.nom] !== undefined 
                                                            ? animatedAvailability[firewall.nom] 
                                                            : Math.round(parseFloat(availabilityData[firewall.nom].up || 0))}%`
                                                        : 'N/A'
                                                    }
                                                </div>
                                            )}
                                            </div>
                                        </div>
                                                </div>
                                                </>
                                            );
                                        })()}
                                        </>
                                        )}
                                    </div>
                                    )}

                                    {/* Tableau des métriques - Uniquement en mode Stats avancée */}
                                    {syncMode[firewall.nom] === 'checkmk' && (
                                    <div className={styles.metricsTable}>
                                        {hasInvalidLines(firewall.nom) && (
                                            <div className={styles.metricsTableWarningIcon}>
                                                <IconifyIcon
                                                    icon="material-symbols:warning"
                                                    width={20}
                                                    height={20}
                                                />
                                            </div>
                                        )}
                                        <div className={styles.metricsGrid}>
                                            {defaultServices.map((service, index) => {
                                                    const firewallData = data?.[firewall.nom]?.[service] || {};
                                                    const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
                                                    const ok = firewallData.ok !== undefined ? parse(firewallData.ok, 100) : 100;
                                                    const warn = firewallData.warn !== undefined ? parse(firewallData.warn, 0) : 0;
                                                    const crit = firewallData.crit !== undefined ? parse(firewallData.crit, 0) : 0;
                                                    
                                                    // Obtenir l'icône correspondant au service
                                                    const getServiceIcon = (serviceName) => {
                                                        switch(serviceName) {
                                                            case 'CPU':
                                                                return 'lucide:cpu';
                                                            case 'MEMOIRE':
                                                                return 'fa-solid:memory';
                                                            case 'TRAFIC':
                                                                return 'ph:network-bold';
                                                            case 'UPTIME':
                                                                return 'mdi:tool-time';
                                                            default:
                                                                return null;
                                                        }
                                                    };
                                                    
                                                    const serviceIcon = getServiceIcon(service);
                                                    const isFirstRow = index < 2; // CPU et MEMOIRE sont dans la première ligne
                                                    const isOkFocused = focusedInput?.service === service && focusedInput?.type === 'ok';
                                                    const isWarnFocused = focusedInput?.service === service && focusedInput?.type === 'warn';
                                                    const isCritFocused = focusedInput?.service === service && focusedInput?.type === 'crit';
                                                    
                                                    return (
                                                        <div 
                                                            key={service} 
                                                            className={styles.metricServiceCard}
                                                        >
                                                            <div className={styles.metricInputsRow}>
                                                                {serviceIcon && (
                                                                    <IconifyIcon
                                                                        icon={serviceIcon}
                                                                        width={26}
                                                                        height={26}
                                                                        className={styles.metricServiceIcon}
                                                                    />
                                                                )}
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={ok}
                                                                    onChange={(e) => updateValue(firewall.nom, service, "ok", e.target.value)}
                                                                    className={`${styles.metricInput} ${ok !== 0 ? styles.okInput : ''} ${isOkFocused ? styles.metricInputFocusedOk : ''}`}
                                                                    aria-label={`OK pour ${service}`}
                                                                    onFocus={(e) => handleInputFocus(e, service, 'ok')}
                                                                    onBlur={handleInputBlur}
                                                                />
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={warn}
                                                                    onChange={(e) => updateValue(firewall.nom, service, "warn", e.target.value)}
                                                                    className={`${styles.metricInput} ${warn !== 0 ? styles.warnInput : ''} ${isWarnFocused ? styles.metricInputFocusedWarn : ''}`}
                                                                    aria-label={`WARN pour ${service}`}
                                                                    onFocus={(e) => handleInputFocus(e, service, 'warn')}
                                                                    onBlur={handleInputBlur}
                                                                />
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={crit}
                                                                    onChange={(e) => updateValue(firewall.nom, service, "crit", e.target.value)}
                                                                    className={`${styles.metricInput} ${crit !== 0 ? styles.critInput : ''} ${isCritFocused ? styles.metricInputFocusedCrit : ''}`}
                                                                    aria-label={`CRIT pour ${service}`}
                                                                    onFocus={(e) => handleInputFocus(e, service, 'crit')}
                                                                    onBlur={handleInputBlur}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                    )}
                                    </div>
                                </div>
                                </div>

                                {/* Zone de commentaire ou d'erreur - Footer en dehors de firewallScrollable */}
                                <div className={styles.firewallCardFooter}>
                                    <div style={{
                                        padding: '0.375rem 0.5rem',
                                        background: 'transparent',
                                        borderRadius: '4px',
                                        border: 'none',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        marginTop: '0rem'
                                    }}>
                                        {/* Onglets pour basculer entre les trois vues : Stats, Stats avancée, Modules */}
                                        <div className={styles.viewTabsContainer}>
                                            {hasProblems(firewall.nom) && (
                                                <FaExclamationCircle style={{
                                                    fontSize: '0.7rem',
                                                    color: '#f59e0b',
                                                    flexShrink: 0,
                                                    marginRight: '0.25rem',
                                                    marginLeft: '0.25rem'
                                                }} />
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (!loadingCheckMK[firewall.nom]) {
                                                        const newMode = 'stats';
                                                        setSyncMode(prev => ({ ...prev, [firewall.nom]: newMode }));
                                                        const currentData = dataRef.current || {};
                                                        const updated = {
                                                            ...currentData,
                                                            [firewall.nom]: {
                                                                ...(currentData[firewall.nom] || {}),
                                                                syncMode: newMode
                                                            }
                                                        };
                                                        setData(updated);
                                                        dataRef.current = updated;
                                                    }
                                                }}
                                                disabled={loadingCheckMK[firewall.nom]}
                                                className={`${styles.viewTabButton} ${(syncMode[firewall.nom] === 'stats' || !syncMode[firewall.nom]) ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}
                                            >
                                                <IconifyIcon
                                                    icon="material-symbols:dashboard-rounded"
                                                    width={16}
                                                    height={16}
                                                />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!loadingCheckMK[firewall.nom]) {
                                                        const newMode = 'checkmk';
                                                        setSyncMode(prev => ({ ...prev, [firewall.nom]: newMode }));
                                                        const currentData = dataRef.current || {};
                                                        const updated = {
                                                            ...currentData,
                                                            [firewall.nom]: {
                                                                ...(currentData[firewall.nom] || {}),
                                                                syncMode: newMode
                                                            }
                                                        };
                                                        setData(updated);
                                                        dataRef.current = updated;
                                                    }
                                                }}
                                                disabled={loadingCheckMK[firewall.nom]}
                                                className={`${styles.viewTabButton} ${syncMode[firewall.nom] === 'checkmk' ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}
                                            >
                                                <IconifyIcon
                                                    icon="material-symbols:query-stats-rounded"
                                                    width={16}
                                                    height={16}
                                                />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!loadingCheckMK[firewall.nom]) {
                                                        const newMode = 'modules';
                                                        setSyncMode(prev => ({ ...prev, [firewall.nom]: newMode }));
                                                        const currentData = dataRef.current || {};
                                                        const updated = {
                                                            ...currentData,
                                                            [firewall.nom]: {
                                                                ...(currentData[firewall.nom] || {}),
                                                                syncMode: newMode
                                                            }
                                                        };
                                                        setData(updated);
                                                        dataRef.current = updated;
                                                    }
                                                }}
                                                disabled={loadingCheckMK[firewall.nom]}
                                                className={`${styles.viewTabButton} ${syncMode[firewall.nom] === 'modules' ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}
                                            >
                                                <IconifyIcon
                                                    icon="streamline-block:programming-modules"
                                                    width={16}
                                                    height={16}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                {/* Zone de commentaire - toujours visible */}
                                <textarea
                                  id={`comment-${firewall.nom}`}
                                  className={styles.commentTextarea}
                                  value={data?.[firewall.nom]?.comment || ""}
                                  onChange={(e) => updateComment(firewall.nom, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  placeholder="Commentaire..."
                                  rows="2"
                                />
                            </div>
                            </React.Fragment>
                        );
                    })}
                        </div>
                    </div>
                );
            })}
            
            {/* Tooltip global pour les cartes statistiques */}
            {hoveredTooltip && (
                <div
                    style={{
                        position: 'fixed',
                        left: `${hoveredTooltip.mouseX + 10}px`,
                        top: `${hoveredTooltip.mouseY + 10}px`,
                        background: hoveredTooltip.type === 'score' ? '#ffffff' : 'var(--bg-primary)',
                        border: hoveredTooltip.type === 'score' ? '1px solid rgba(0,0,0,0.08)' : '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: hoveredTooltip.type === 'score' ? '1rem' : '0.75rem',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                        zIndex: 999999,
                        maxWidth: hoveredTooltip.type === 'services'
                            ? '500px'
                            : hoveredTooltip.type === 'events'
                                ? '600px'
                                : hoveredTooltip.type === 'availability'
                                    ? '400px'
                                    : hoveredTooltip.type === 'score'
                                        ? '700px'
                                        : '400px',
                        pointerEvents: 'none',
                        color: hoveredTooltip.type === 'score' ? '#111827' : 'var(--text-primary)'
                    }}
                >
                    {hoveredTooltip.type === 'score' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>
                                Comment la note est calculée
                            </div>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(2, 1fr)', 
                                gap: '0.75rem 1rem', 
                                fontSize: '0.82rem', 
                                color: '#374151' 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <span>Services (OK/WARN/CRIT)</span>
                                    <span style={{ fontWeight: 700 }}>{hoveredTooltip.scoreBreakdown?.find(b => b.label.includes('services'))?.weight || '–'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <span>Événements (CheckMK)</span>
                                    <span style={{ fontWeight: 700 }}>{hoveredTooltip.scoreBreakdown?.find(b => b.label.includes('Événements'))?.weight || '–'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <span>Disponibilité (CheckMK)</span>
                                    <span style={{ fontWeight: 700 }}>{hoveredTooltip.scoreBreakdown?.find(b => b.label.includes('Disponibilité'))?.weight || '–'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <span>Modules activés</span>
                                    <span style={{ fontWeight: 700 }}>{hoveredTooltip.scoreBreakdown?.find(b => b.label.includes('Modules'))?.weight || '–'}</span>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#6b7280', marginTop: '0.15rem' }}>
                                Les plafonds et pénalités s'appliquent en cas de CRIT, d'événements ou de faible disponibilité.
                            </div>
                        </div>
                    )}
                    {hoveredTooltip.type === 'availability' && availabilityData[hoveredTooltip.firewallName] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                Disponibilité
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                Temps UP / DOWN / UNREACH sur la période.
                            </div>
                            {['up','down','unreach'].map((key) => {
                                const value = availabilityData[hoveredTooltip.firewallName][key];
                                if (value === undefined) return null;
                                const labelMap = { up: 'UP', down: 'DOWN', unreach: 'UNREACH' };
                                const colorMap = { up: '#10b981', down: '#ef4444', unreach: '#dc2626' };
                                return (
                                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{labelMap[key]}:</span>
                                        <span style={{ fontWeight: 600, color: colorMap[key] || 'var(--text-primary)' }}>
                                            {Math.round(parseFloat(value || 0))} %
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {hoveredTooltip.type === 'events' && eventsData[hoveredTooltip.firewallName] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                Événements critiques
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                Alertes CRITICAL Check MK sur la période du rapport.
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                                maxHeight: '220px',
                                overflowY: 'auto',
                                width: '100%'
                            }}>
                                {(() => {
                                    const allEvents = Array.isArray(eventsData[hoveredTooltip.firewallName])
                                        ? eventsData[hoveredTooltip.firewallName]
                                        : [];
                                    const events = allEvents.filter((e) => {
                                        const state = e.state ?? e.state_type ?? 0;
                                        return state === 2;
                                    });
                                    if (events.length === 0) {
                                        return (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                Aucun événement critique
                                            </div>
                                        );
                                    }
                                    const stateLabels = { 0: 'OK', 1: 'WARNING', 2: 'CRITICAL', 3: 'UNKNOWN' };
                                    const stateColors = { 0: '#10b981', 1: '#f59e0b', 2: '#ef4444', 3: '#6b7280' };
                                    return events.slice(0, 50).map((event, idx) => {
                                        const raw = event.raw;
                                        const service = event.service ?? event.service_description ?? event.log_service_description ?? event.service_name ?? event.log_service ?? (Array.isArray(raw) ? raw[4] : null) ?? '';
                                        const message = event.message ?? event.plugin_output ?? event.log_plugin_output ?? event.event_text ?? event.long_plugin_output ?? event.description ?? (Array.isArray(raw) ? raw[6] : null) ?? '-';
                                        const time = event.time ?? event.timestamp ?? event.last_state_change ?? event.datetime ?? event.log_time;
                                        const timeStr = time != null && time !== ''
                                            ? (typeof time === 'number' ? new Date(time * (time < 1e12 ? 1000 : 1)) : new Date(time)).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                                            : '';
                                        const stateNum = event.state ?? event.state_type ?? 0;
                                        const stateLabel = event.state_info ?? stateLabels[stateNum] ?? String(stateNum);
                                        const stateColor = stateColors[stateNum] ?? '#6b7280';
                                        return (
                                            <div
                                                key={event.id ?? event.event_id ?? idx}
                                                style={{
                                                    fontSize: '0.72rem',
                                                    color: 'var(--text-primary)',
                                                    padding: '0.35rem 0.5rem',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--border-color)',
                                                    borderLeft: `3px solid ${stateColor}`
                                                }}
                                            >
                                                {service && (
                                                    <div style={{ fontWeight: 600, marginBottom: '0.2rem', color: 'var(--text-primary)' }}>
                                                        {String(service).trim()}
                                                    </div>
                                                )}
                                                {(message && message !== '-') && (
                                                    <div style={{ wordBreak: 'break-word', marginBottom: '0.2rem' }}>
                                                        {String(message).trim()}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                    <span style={{ fontWeight: 600, color: stateColor }}>
                                                        {typeof stateLabel === 'string' ? stateLabel : (stateLabels[stateNum] ?? stateNum)}
                                                    </span>
                                                    {timeStr && <span>{timeStr}</span>}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                            {(() => {
                                const allEvents = Array.isArray(eventsData[hoveredTooltip.firewallName]) ? eventsData[hoveredTooltip.firewallName] : [];
                                const criticalOnly = allEvents.filter((e) => (e.state ?? e.state_type ?? 0) === 2);
                                return criticalOnly.length > 50 ? (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        … et {criticalOnly.length - 50} autre(s) événement(s) critique(s)
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    )}
                    {hoveredTooltip.type === 'services' && checkmkData[hoveredTooltip.firewallName] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                Services monitorés
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                Services supervisés par Check MK pour cet équipement.
                            </div>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.3rem',
                                maxHeight: '220px',
                                overflowY: 'auto',
                                width: '100%'
                            }}>
                                {(() => {
                                    const services = checkmkData[hoveredTooltip.firewallName].serviceInfo?.services || 
                                                   checkmkData[hoveredTooltip.firewallName].services || 
                                                   [];
                                    
                                    if (services.length === 0) {
                                        return (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--text-secondary)',
                                                fontStyle: 'italic',
                                                width: '100%'
                                            }}>
                                                Aucun service
                                            </div>
                                        );
                                    }
                                    
                                    const checkmkHostName = checkmkData[hoveredTooltip.firewallName]?.checkmk_host_name;
                                    
                                    return services.map((service, idx) => {
                                        let serviceName = service.title || service.id || service.name || 'Service';
                                        
                                        if (checkmkHostName && serviceName.includes(checkmkHostName)) {
                                            serviceName = serviceName.replace(new RegExp(checkmkHostName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
                                        }
                                        serviceName = serviceName
                                            .replace(/\s*on\s+host\s*[^\s]*/gi, '')
                                            .replace(/\s+on\s+/gi, ' ')
                                            .replace(/^on\s+/gi, '')
                                            .replace(/\s+on$/gi, '')
                                            .trim();
                                        
                                        return (
                                            <div 
                                                key={service.id || service.title || idx}
                                                style={{
                                                    fontSize: '0.72rem',
                                                    color: 'var(--text-primary)',
                                                    padding: '0.2rem 0.4rem',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '4px',
                                                    whiteSpace: 'nowrap',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    border: '1px solid var(--border-color)',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {serviceName}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal d'édition pour un firewall */}
            {editingFirewall && editForm && (
            <div className={styles.editModalOverlay}>
                <div
                    className={`${styles.editModalContent} ${styles.editModalContentLarge}`}
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
                            Éditer le firewall
                        </h3>
                        <button
                            type="button"
                            className={styles.editModalCloseButton}
                            onClick={() => {
                                setEditingFirewall(null);
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
                                {/* Ligne 1 : Nom + IP */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Nom du firewall *
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.nom}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    nom: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: FortiGate-60F"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Adresse IP WAN
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.ip}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    ip: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 192.168.1.1"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 2 : Firmware + Fabricant */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Version Firmware
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.firmware}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    firmware: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 7.0.5"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Fabricant
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.fabricant}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    fabricant: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: Fortinet, Cisco, Palo Alto"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 2.5 : Site + VLAN */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Site
                                        <select
                                            className={styles.editModalSelect}
                                            value={editForm.site || ""}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    site: e.target.value
                                                }))
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
                                    <label className={styles.editModalLabel}>
                                        VLAN
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.vlan}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    vlan: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 10, 20, 30"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 3 : Modèle + Numéro de série */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Modèle
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.modele}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    modele: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 60F, ASA 5506-X"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Numéro de série
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.numeroSerie}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    numeroSerie: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: FG123456789"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 4 : Expiration garantie */}
                                <label className={styles.editModalLabel}>
                                    Expiration garantie
                                    <input
                                        type="date"
                                        className={styles.editModalInput}
                                        value={editForm.expirationGarantie}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                expirationGarantie: e.target.value
                                            }))
                                        }
                                    />
                                </label>

                                {/* Licences */}
                                <div className={styles.licensesSection}>
                                    <label className={styles.licensesLabel}>
                                        Licences
                                    </label>
                                    {editForm.licences && editForm.licences.length > 0 ? (
                                        <div className={styles.licensesList}>
                                            {editForm.licences.map((licence, licenceIndex) => (
                                                <div key={licenceIndex} className={styles.licenseRow}>
                                                    <label className={styles.licenseLabelSmall}>
                                                        Nom/Libellé
                                                        <input
                                                            type="text"
                                                            className={styles.licenseInputSmall}
                                                            value={licence.nom || ""}
                                                            onChange={(e) => {
                                                                const updatedLicences = [...editForm.licences];
                                                                updatedLicences[licenceIndex] = {
                                                                    ...updatedLicences[licenceIndex],
                                                                    nom: e.target.value
                                                                };
                                                                setEditForm((prev) => ({
                                                                    ...prev,
                                                                    licences: updatedLicences
                                                                }));
                                                            }}
                                                            placeholder="Ex: FortiCare, Security Bundle"
                                                        />
                                                    </label>
                                                    <label className={styles.licenseLabelSmall}>
                                                        Expiration
                                                        <input
                                                            type="date"
                                                            className={styles.licenseInputSmall}
                                                            value={licence.expiration || ""}
                                                            onChange={(e) => {
                                                                const updatedLicences = [...editForm.licences];
                                                                updatedLicences[licenceIndex] = {
                                                                    ...updatedLicences[licenceIndex],
                                                                    expiration: e.target.value
                                                                };
                                                                setEditForm((prev) => ({
                                                                    ...prev,
                                                                    licences: updatedLicences
                                                                }));
                                                            }}
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        className={styles.licenseDeleteButton}
                                                        onClick={() => {
                                                            const updatedLicences = editForm.licences.filter((_, idx) => idx !== licenceIndex);
                                                            setEditForm((prev) => ({
                                                                ...prev,
                                                                licences: updatedLicences
                                                            }));
                                                        }}
                                                        title="Supprimer cette licence"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={styles.licenseEmptyText}>
                                            Aucune licence configurée
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        className={styles.licenseAddButton}
                                        onClick={() => {
                                            setEditForm((prev) => ({
                                                ...prev,
                                                licences: [
                                                    ...(prev.licences || []),
                                                    { nom: "", expiration: "", type: "" }
                                                ]
                                            }));
                                        }}
                                    >
                                        + Ajouter une licence
                                    </button>
                                </div>

                                {/* CheckMK Mapping */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel} style={{ flex: '1 1 100%' }}>
                                        Mapping CheckMK
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCheckmkMappingModal({ isOpen: true, firewallId: editingFirewall.id });
                                            }}
                                            style={{
                                                width: '100%',
                                                marginTop: '0.25rem',
                                                padding: '0.5rem 0.75rem',
                                                border: '1px solid var(--border-secondary)',
                                                borderRadius: '6px',
                                                background: (editingFirewall.id && getCheckMKMapping(editingFirewall.id)) ? '#10b981' : '#ffffff',
                                                color: (editingFirewall.id && getCheckMKMapping(editingFirewall.id)) ? 'white' : '#4b5563',
                                                fontSize: '0.85rem',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                const mapping = editingFirewall.id ? getCheckMKMapping(editingFirewall.id) : null;
                                                if (!mapping) {
                                                    e.currentTarget.style.background = '#f3f4f6';
                                                    e.currentTarget.style.borderColor = '#d1d5db';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                const mapping = editingFirewall.id ? getCheckMKMapping(editingFirewall.id) : null;
                                                if (!mapping) {
                                                    e.currentTarget.style.background = '#ffffff';
                                                    e.currentTarget.style.borderColor = 'var(--border-secondary)';
                                                }
                                            }}
                                        >
                                            <FaLink size={14} />
                                            {(() => {
                                                const mapping = editingFirewall.id ? getCheckMKMapping(editingFirewall.id) : null;
                                                return mapping 
                                                    ? `Mappé: ${mapping.checkmk_host_name}`
                                                    : 'Mapper avec CheckMK';
                                            })()}
                                        </button>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isSaving && (
                        <div className={styles.editModalFooter}>
                            <button
                                type="button"
                                className={styles.editModalSaveButton}
                                onClick={handleSaveFirewall}
                                disabled={isSaving}
                            >
                                <IconifyIcon
                                    icon="material-symbols:save"
                                    width={16}
                                    height={16}
                                />
                                Enregistrer
                            </button>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Modal de mapping CheckMK */}
            {checkmkMappingModal.isOpen && checkmkMappingModal.firewallId !== null && editingFirewall && (
                <CheckMKMappingModal
                    isOpen={checkmkMappingModal.isOpen}
                    onClose={() => setCheckmkMappingModal({ isOpen: false, firewallId: null })}
                    equipmentName={editingFirewall.nom}
                    equipmentType="Firewalls"
                    equipmentId={editingFirewall.id}
                    equipmentIndex={editingFirewall.id}
                    clientId={config?.client?.id}
                    requireService={false}
                    onMappingSaved={(mapping) => {
                        if (mapping) {
                            // Mettre à jour le mapping local
                            setCheckmkMappings(prev => ({
                                ...prev,
                                [editingFirewall.nom]: mapping
                            }));
                            toast.success("Mapping mis à jour", toastOptions);
                        } else {
                            // Supprimer le mapping
                            setCheckmkMappings(prev => {
                                const newMappings = { ...prev };
                                delete newMappings[editingFirewall.nom];
                                return newMappings;
                            });
                            toast.success("Mapping supprimé", toastOptions);
                        }
                    }}
                />
            )}

            {/* Modal d'instructions d'export */}
            {showExportModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                        color: theme === 'dark' ? '#f3f4f6' : '#111827'
                    }}>
                        <h3 style={{
                            margin: '0 0 1rem 0',
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: theme === 'dark' ? '#f3f4f6' : '#111827'
                        }}>
                            📤 Instructions d'export Stormshield
                        </h3>
                        
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            fontSize: '0.95rem',
                            lineHeight: '1.6'
                        }}>
                            {/* Liste des objets */}
                            <div>
                                <div style={{
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
                                    color: '#10b981',
                                    fontSize: '1rem'
                                }}>
                                    📋 Liste des objets
                                </div>
                                <div style={{ paddingLeft: '1rem', color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Configuration</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Objects</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Network</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#10b981' : '#059669', fontWeight: '600' }}>Export</span>
                                </div>
                            </div>

                            {/* Filtrage et NAT */}
                            <div>
                                <div style={{
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
                                    color: '#10b981',
                                    fontSize: '1rem'
                                }}>
                                    🔒 Filtrage et NAT
                                </div>
                                <div style={{ paddingLeft: '1rem', color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Configuration</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Security Policy</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Filter - NAT</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#10b981' : '#059669', fontWeight: '600' }}>Export</span>
                                </div>
                            </div>

                            {/* Traffic */}
                            <div>
                                <div style={{
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
                                    color: '#10b981',
                                    fontSize: '1rem'
                                }}>
                                    🌐 Traffic
                                </div>
                                <div style={{ paddingLeft: '1rem', color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Monitoring</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Audit Logs</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Network Traffic</span>
                                    {' > '}
                                    Choisir une date dans la période du rapport
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#10b981' : '#059669', fontWeight: '600' }}>Export</span>
                                </div>
                            </div>

                            {/* Alarmes */}
                            <div>
                                <div style={{
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
                                    color: '#10b981',
                                    fontSize: '1rem'
                                }}>
                                    ⚠️ Alarmes
                                </div>
                                <div style={{ paddingLeft: '1rem', color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Monitoring</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Reports</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Security</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857', fontWeight: '500' }}>Alarms</span>
                                    {' > '}
                                    <span style={{ color: theme === 'dark' ? '#10b981' : '#059669', fontWeight: '600' }}>Export</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowExportModal(false)}
                            style={{
                                marginTop: '1.5rem',
                                width: '100%',
                                padding: '0.75rem',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#059669';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#10b981';
                            }}
                        >
                            J'ai compris
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Firewalls;
