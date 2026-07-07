import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { FaDesktop, FaServer, FaApple, FaLaptop, FaCloud, FaSync, FaInfoCircle } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Antivirus.module.css";
import commonStyles from "./ModuleCommon.module.css";
import { useTheme } from "../../../hooks/useTheme";
import API_BASE_URL from "../../../config";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, scoreToLabel, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import MetricLetter from "../common/MetricLetter";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getIconPath } from "../../../utils/assetHelper";

// Options par défaut pour les toasts (bas à droite)
const toastOptions = { position: "bottom-right", autoClose: 3000 };

const Antivirus = ({ config, setConfig, data, setData, onSyncAllCheckMKReady }) => {
    const { theme } = useTheme();
    // Les données antivirus sont déjà chargées via fetchClientModules dans config.client.equipements.Antivirus
    // La structure attendue est : { solutions: [...] } ou { logiciel: "...", ... } (ancien format)
    const staticData = config?.client?.equipements?.Antivirus || {};
    const antivirus = data || {};
    
    // Charger les solutions antivirus depuis la base (v_b_clients_m_antivirus) au montage
    useEffect(() => {
        if (!config?.client?.id || !setConfig) return;
        const controller = new AbortController();

        const loadAntivirusFromDb = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/antivirus`, {
                    credentials: "include",
                    signal: controller.signal
                });
                if (!res.ok) return;
                const rows = await res.json();
                
                // Filtrer les items qui sont de vraies solutions (item_key commence par "solution-")
                const realItems = (rows || []).filter(item => {
                    if (!item.data || typeof item.data !== 'object') return false;
                    const dataKeys = Object.keys(item.data);
                    
                    // Exclure les flags d'activation simples
                    if (dataKeys.length === 1 && item.data.enabled === true) return false;
                    
                    // Si l'item_key commence par "solution-", c'est une vraie solution
                    if (item.item_key && item.item_key.startsWith('solution-')) {
                        return true;
                    }
                    
                    // Si l'item a des solutions ou une solution, c'est une vraie donnée antivirus
                    const hasSolutions = item.data.solutions && Array.isArray(item.data.solutions) && item.data.solutions.length > 0;
                    const hasSolution = item.data.solution && typeof item.data.solution === 'string' && item.data.solution.trim() !== '';
                    
                    if (hasSolutions || hasSolution) {
                        return true;
                    }
                    
                    // Si le name contient le nom d'une solution connue
                    if (item.name && (item.name.includes('BitDefender') || item.name.includes('Kaspersky') || 
                        item.name.includes('Symantec') || item.name.includes('Trend') || 
                        item.name.includes('McAfee') || item.name.includes('Norton') || 
                        item.name.includes('Avast') || item.name.includes('AVG'))) {
                        return true;
                    }
                    
                    // Si l'item a d'autres données (pas juste enabled)
                    if (dataKeys.length > 0 && !(dataKeys.length === 1 && dataKeys[0] === 'enabled')) {
                        return true;
                    }
                    
                    return false;
                });
                
                // Transformer les données en format attendu
                let antivirusData = { solutions: [] };
                
                if (realItems.length > 0) {
                    const firstItem = realItems[0];
                    // Si on a un seul item avec solutions: [], c'est l'ancienne structure
                    if (firstItem.data.solutions && Array.isArray(firstItem.data.solutions) && realItems.length === 1) {
                        antivirusData = firstItem.data;
                    } else {
                        // Nouvelle structure : une ligne par solution, on les agrège
                        const sortedItems = [...realItems].sort((a, b) => {
                            const nameA = a.name || a.item_key || '';
                            const nameB = b.name || b.item_key || '';
                            return nameA.localeCompare(nameB);
                        });
                        antivirusData = {
                            solutions: sortedItems.map(item => ({
                                id: item.id,
                                ...item.data
                            }))
                        };
                    }
                }

                setConfig((prev) => {
                    if (!prev?.client) return prev;
                    return {
                        ...prev,
                        client: {
                            ...prev.client,
                            equipements: {
                                ...(prev.client.equipements || {}),
                                Antivirus: antivirusData
                            }
                        }
                    };
                });
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error("Erreur chargement solutions antivirus:", err);
            }
        };

        loadAntivirusFromDb();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config?.client?.id]);
    
    // Vérifier si on a des données antivirus (plusieurs formats possibles)
    const hasData = useCallback(() => {
        // Si staticData est vide ou null, pas de données
        if (!staticData || typeof staticData !== 'object' || Object.keys(staticData).length === 0) {
            return false;
        }
        
        // Vérifier le nouveau format avec solutions
        if (staticData.solutions && Array.isArray(staticData.solutions) && staticData.solutions.length > 0) {
            return true;
        }
        
        // Vérifier l'ancien format avec logiciel
        if (staticData.logiciel && typeof staticData.logiciel === 'string' && staticData.logiciel.trim() !== '') {
            return true;
        }
        
        // Vérifier le format direct avec solution (string)
        if (staticData.solution && typeof staticData.solution === 'string' && staticData.solution.trim() !== '') {
            return true;
        }
        
        // Vérifier si on a d'autres données (version, expiration, endpoints, etc.)
        const otherDataKeys = Object.keys(staticData).filter(key => 
            key !== 'solutions' && 
            key !== 'logiciel' && 
            key !== 'solution' &&
            staticData[key] !== null &&
            staticData[key] !== undefined &&
            staticData[key] !== ''
        );
        
        if (otherDataKeys.length > 0) {
            return true;
        }
        
        return false;
    }, [staticData]);



    // Initialisation des données si nécessaire
    useEffect(() => {
        if (!hasData() || Object.keys(antivirus).length > 0) return;

        const initializedData = {
            threats: [],
            comment: ""
        };

        setData(initializedData);
    }, [hasData, antivirus, setData]);

    const handleChange = (key, value) => {
        setData({ ...antivirus, [key]: value });
    };

    // Fonction pour appliquer une note manuelle pour une solution
    const applyManualScore = (solutionIndex, scoreValue) => {
        const updated = {
            ...antivirus,
            solutions: {
                ...(antivirus.solutions || {}),
                [solutionIndex]: {
                    ...(antivirus.solutions?.[solutionIndex] || {}),
                    manualHealthScore: scoreValue
                }
            }
        };
        setData(updated);
    };

    // Fonction pour gérer la sélection manuelle d'une lettre
    const handleManualLetterSelect = (solutionIndex, letter) => {
        const scoreValue = letterToScore(letter);
        if (scoreValue === null) return;
        applyManualScore(solutionIndex, scoreValue);
    };

    // Fonctions pour gérer l'édition manuelle de la note
    const startEditScore = (solutionIndex, currentScore) => {
        setEditingScore(prev => ({ ...prev, [solutionIndex]: true }));
        setEditingScoreValue(prev => ({ ...prev, [solutionIndex]: currentScore || '' }));
    };

    const saveEditScore = (solutionIndex) => {
        const manualScore = editingScoreValue[solutionIndex];
        if (manualScore !== undefined && manualScore !== null && manualScore !== '') {
            const scoreValue = Math.max(0, Math.min(100, parseInt(manualScore, 10) || 0));
            applyManualScore(solutionIndex, scoreValue);
        }
        setEditingScore(prev => ({ ...prev, [solutionIndex]: false }));
        setEditingScoreValue(prev => {
            const newValue = { ...prev };
            delete newValue[solutionIndex];
            return newValue;
        });
    };

    const cancelEditScore = (solutionIndex) => {
        setEditingScore(prev => ({ ...prev, [solutionIndex]: false }));
        setEditingScoreValue(prev => {
            const newValue = { ...prev };
            delete newValue[solutionIndex];
            return newValue;
        });
    };

    // Fonction pour basculer l'affichage des commentaires
    const toggleCommentVisibility = (solutionIndex) => {
        setOpenComments((prev) => {
            const nextIsOpen = !prev[solutionIndex];
            const nextState = {
                ...prev,
                [solutionIndex]: nextIsOpen,
            };

            // Persister aussi dans les données du rapport pour garder l'état en changeant d'onglet
            const currentData = dataRef.current || data || {};
            const updated = {
                ...currentData,
                openComments: {
                    ...(currentData.openComments || {}),
                    [solutionIndex]: nextIsOpen,
                },
            };
            setData(updated);
            dataRef.current = updated;

            return nextState;
        });
    };

    // Fonction pour sélectionner tout le contenu du champ au focus
    const handleInputFocus = (e) => {
        e.target.select();
    };

    const handleThreatChange = (index, key, value) => {
        const updated = [...(antivirus.threats || [])];
        updated[index] = { ...updated[index], [key]: value };
        setData({ ...antivirus, threats: updated });
    };

    const addThreat = () => {
        const updated = [...(antivirus.threats || []), { type: "", count: 0 }];
        setData({ ...antivirus, threats: updated });
    };

    const removeThreat = (index) => {
        const updated = [...(antivirus.threats || [])];
        updated.splice(index, 1);
        setData({ ...antivirus, threats: updated });
    };

    // Fonction pour calculer le total des menaces
    const getTotalThreats = () => {
        return (antivirus.threats || []).reduce((total, threat) => {
            return total + (parseInt(threat.count) || 0);
        }, 0);
    };

    // Fonction pour calculer le statut global de l'antivirus
    const getAntivirusStatus = () => {
        const totalMenaces = getTotalThreats();
        
        if (totalMenaces === 0) {
            return { status: "unknown", icon: "●", color: "gray" };
        } else if (totalMenaces > 100) {
            return { status: "critical", icon: "●", color: "red" };
        } else if (totalMenaces > 50) {
            return { status: "warning", icon: "●", color: "orange" };
        } else if (totalMenaces > 10) {
            return { status: "good", icon: "●", color: "lightgreen" };
        } else {
            return { status: "excellent", icon: "●", color: "green" };
        }
    };

    // Fonction pour formater les informations de l'antivirus
    const getAntivirusInfo = () => {
        const info = [];
        
        if (staticData.version) info.push(`Version ${staticData.version}`);
        if (staticData.expiration) info.push(`Expire le ${staticData.expiration}`);
        
        const totalEndpoints = (staticData.stationsWindows || 0) + 
                              (staticData.ServeursWindows || 0) + 
                              (staticData.macos || 0) + 
                              (staticData.machinesPhysiques || 0) + 
                              (staticData.machinesVirtuelles || 0);
        
        if (totalEndpoints > 0) info.push(`${totalEndpoints} endpoints protégés`);
        
        return info;
    };

    // Fonction pour obtenir l'icône de l'endpoint
    const getEndpointIcon = (type) => {
        switch (type) {
            case 'stationsWindows':
                return <FaDesktop className={styles.endpointIcon} />;
            case 'ServeursWindows':
                return <FaServer className={styles.endpointIcon} />;
            case 'macos':
                return <FaApple className={styles.endpointIcon} />;
            case 'machinesPhysiques':
                return <FaLaptop className={styles.endpointIcon} />;
            case 'machinesVirtuelles':
                return <FaCloud className={styles.endpointIcon} />;
            case 'physique':
                return <FaLaptop className={styles.endpointIcon} />;
            case 'virtuel':
                return <FaCloud className={styles.endpointIcon} />;
            default:
                return <FaDesktop className={styles.endpointIcon} />;
        }
    };

    // Fonction pour formater la date
    const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
            return dateString;
        } catch (e) {
            return dateString;
        }
    };

    // Fonction pour formater la date et l'heure
    const formatDateTime = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            return dateString;
        } catch (e) {
            return dateString;
        }
    };

    // Refs pour la synchronisation globale
    const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);
    const syncAllBitDefenderRef = useRef(null);
    const [syncingSolutions, setSyncingSolutions] = useState(new Set());
    const [syncedSolutionsData, setSyncedSolutionsData] = useState({}); // Stocker les données synchronisées localement
    const [enrichedEndpointsData, setEnrichedEndpointsData] = useState({}); // Stocker les endpoints enrichis par solution
    const [policiesData, setPoliciesData] = useState({}); // Stocker les politiques par solution
    const [viewMode, setViewMode] = useState({}); // Gérer la vue active pour chaque solution : 'dashboard', 'endpoints', 'politiques'
    const [animatedHealthScore, setAnimatedHealthScore] = useState({}); // Score de santé animé pour chaque solution
    const [animatedManagedRate, setAnimatedManagedRate] = useState({}); // Taux de gestion animé
    const [animatedInfectionRate, setAnimatedInfectionRate] = useState({}); // Taux d'infection animé
    const [animatedOnlineRate, setAnimatedOnlineRate] = useState({}); // Taux en ligne animé
    const [animatedMalwareRate, setAnimatedMalwareRate] = useState({}); // Taux malware animé
    const [animatedTotalEndpoints, setAnimatedTotalEndpoints] = useState({}); // Total endpoints animé
    const [animatedManaged, setAnimatedManaged] = useState({}); // Endpoints gérés animés
    const [animatedUnmanaged, setAnimatedUnmanaged] = useState({}); // Endpoints non gérés animés
    const [animatedInfectionCount, setAnimatedInfectionCount] = useState({}); // Nombre d'infections animé
    const [editingScore, setEditingScore] = useState({}); // { solutionIndex: true/false } pour savoir quel score est en cours d'édition
    const [editingScoreValue, setEditingScoreValue] = useState({}); // Valeur temporaire pendant l'édition
    const [hoveredTooltip, setHoveredTooltip] = useState(null); // { solutionIndex, mouseX, mouseY, scoreBreakdown }
    const [openComments, setOpenComments] = useState({}); // { solutionIndex: true/false } pour afficher/masquer les commentaires
    const [endpointsPagination, setEndpointsPagination] = useState({}); // { solutionIndex: currentPage } pour la pagination des endpoints
    const dataRef = useRef(data);
    const hasRestoredDataRef = useRef(false);

    // Restaurer l'état d'ouverture des commentaires depuis les données du rapport
    useEffect(() => {
        if (!data?.openComments) return;
        setOpenComments(data.openComments || {});
    }, [data?.openComments]);

    // Mettre à jour la ref de data
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Restaurer les données synchronisées depuis data si disponibles
    useEffect(() => {
        const hasSolutions = staticData?.solutions && Array.isArray(staticData.solutions) && staticData.solutions.length > 0;
        if (hasRestoredDataRef.current || !hasSolutions) return;
        
        const solutions = staticData.solutions || [];
        const bitDefenderSolutions = solutions.filter(sol => sol.solution === "GravityZone BitDefender");
        
        if (bitDefenderSolutions.length > 0 && data?.bitdefenderSolutions) {
            const restoredData = {};
            const restoredEnriched = {};
            const restoredPolicies = {};
            bitDefenderSolutions.forEach((sol, index) => {
                const restoredSolution = data.bitdefenderSolutions[index];
                if (restoredSolution) {
                    restoredData[index] = restoredSolution;
                    // Restaurer les endpoints enrichis si disponibles
                    if (data.bitdefenderEnrichedEndpoints && data.bitdefenderEnrichedEndpoints[index]) {
                        restoredEnriched[index] = data.bitdefenderEnrichedEndpoints[index];
                    }
                    // Restaurer les politiques si disponibles
                    if (data.bitdefenderPolicies && data.bitdefenderPolicies[index]) {
                        restoredPolicies[index] = data.bitdefenderPolicies[index];
                    }
                }
            });
            
            if (Object.keys(restoredData).length > 0) {
                setSyncedSolutionsData(restoredData);
                if (Object.keys(restoredEnriched).length > 0) {
                    setEnrichedEndpointsData(restoredEnriched);
                }
                if (Object.keys(restoredPolicies).length > 0) {
                    setPoliciesData(restoredPolicies);
                }
                hasRestoredDataRef.current = true;
            }
        }
    }, [data, staticData]);

    // Mettre à jour la ref de onSyncAllCheckMKReady
    useEffect(() => {
        onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
    }, [onSyncAllCheckMKReady]);

    const getAuthHeaders = () => ({});

    // Fonction pour récupérer la période du rapport
    const getReportPeriod = () => {
        if (config?.client?.checkmkPeriod) {
            return {
                start_time: config.client.checkmkPeriod.start_time,
                end_time: config.client.checkmkPeriod.end_time
            };
        }
        // Période par défaut : dernier mois
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        return {
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString()
        };
    };

    // Fonction pour charger les statistiques BitDefender
    const loadStatistics = useCallback(async (companyId) => {
        try {
            const period = getReportPeriod();
            const url = new URL(`${API_BASE_URL}/bitdefender/statistics/${companyId}`);
            if (period.start_time && period.end_time) {
                url.searchParams.append('startDate', period.start_time);
                url.searchParams.append('endDate', period.end_time);
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
            }

            const responseData = await response.json();
            
            if (responseData.success && responseData.statistics) {
                return responseData.statistics;
            }
            
            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            return null;
        }
    }, [config]);

    // Fonction pour charger les endpoints enrichis avec événements et infections
    const loadEnrichedEndpoints = useCallback(async (companyId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/bitdefender/endpoints/${companyId}/enriched`, {
                method: 'GET',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (response.ok) {
                const responseData = await response.json();
                if (responseData.success && responseData.endpoints) {
                    return responseData;
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.warn(`Erreur HTTP ${response.status} pour les endpoints enrichis:`, errorData);
            }
            
            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération des endpoints enrichis:', error);
            return null;
        }
    }, []);

    // Fonction pour charger les politiques de sécurité
    const loadPolicies = useCallback(async (companyId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/bitdefender/policies/${companyId}`, {
                method: 'GET',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (response.ok) {
                const responseData = await response.json();
                if (responseData.success && responseData.policies) {
                    return responseData;
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.warn(`Erreur HTTP ${response.status} pour les politiques:`, errorData);
            }
            
            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération des politiques:', error);
            return null;
        }
    }, []);

    // Fonction pour synchroniser une solution BitDefender
    const syncBitDefenderSolution = useCallback(async (solutionIndex, companyIdOverride = null) => {
        const solutions = staticData?.solutions || [];
        const solution = solutions[solutionIndex];
        
        // Utiliser le companyId passé en paramètre ou celui stocké dans la solution
        const companyId = companyIdOverride || solution?.companyId;
        
        if (!solution || !companyId || companyId.trim() === "") {
            toast.warning(`Solution BitDefender sans entreprise configurée`, toastOptions);
            return;
        }

        setSyncingSolutions(prev => new Set([...prev, solutionIndex]));

        // Déclarer les variables avant le try pour qu'elles soient accessibles dans le finally
        let statistics = null;
        let enrichedData = null;
        let endpointsList = [];
        let policiesData = null;

        try {
            const response = await fetch(`${API_BASE_URL}/bitdefender/sync/${companyId}`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
            }

            const responseData = await response.json();
            
            // Récupérer les statistiques, endpoints enrichis et politiques en parallèle
            [statistics, enrichedData, policiesData] = await Promise.all([
                loadStatistics(companyId),
                loadEnrichedEndpoints(companyId),
                loadPolicies(companyId)
            ]);

            if (responseData.success && responseData.data) {
                endpointsList = responseData.data.endpoints?.list || [];
                
                // Extraire les informations de licence
                let licencesTotales = "";
                let licencesUtilisees = "";
                let expirationDate = "";
                
                if (responseData.data.license) {
                    const license = responseData.data.license;
                    
                    if (license.totalLicenses !== null && license.totalLicenses !== undefined) {
                        licencesTotales = String(license.totalLicenses);
                    }
                    
                    if (license.usedLicenses !== null && license.usedLicenses !== undefined) {
                        licencesUtilisees = String(license.usedLicenses);
                    }
                    
                    // Si toujours vide, explorer les données brutes
                    if ((!licencesTotales || !licencesUtilisees) && license.raw) {
                        const raw = license.raw;
                        
                        if (!licencesTotales) {
                            if (raw.totalSlots !== null && raw.totalSlots !== undefined) {
                                licencesTotales = String(raw.totalSlots);
                            } else if (raw.slots && typeof raw.slots === 'object' && raw.slots.total !== undefined) {
                                licencesTotales = String(raw.slots.total);
                            }
                        }
                        
                        if (!licencesUtilisees) {
                            if (raw.usedSlots !== null && raw.usedSlots !== undefined) {
                                licencesUtilisees = String(raw.usedSlots);
                            } else if (raw.slots && typeof raw.slots === 'object' && raw.slots.used !== undefined) {
                                licencesUtilisees = String(raw.slots.used);
                            }
                        }
                    }
                    
                    // Formater la date d'expiration
                    const rawDate = license.expirationDate;
                    
                    if (rawDate) {
                        if (typeof rawDate === 'number') {
                            const expDate = new Date(rawDate > 1000000000000 ? rawDate : rawDate * 1000);
                            if (!isNaN(expDate.getTime())) {
                                expirationDate = expDate.toISOString().split('T')[0];
                            }
                        } else {
                            const dateStr = String(rawDate);
                            const expDate = new Date(dateStr);
                            if (!isNaN(expDate.getTime())) {
                                expirationDate = expDate.toISOString().split('T')[0];
                            } else if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                expirationDate = dateStr.split('T')[0].split(' ')[0];
                            }
                        }
                    } else if (license.raw) {
                        const rawLicense = license.raw;
                        const possibleDateFields = ['expiration', 'expirationDate', 'expiryDate', 'expires', 'validUntil', 'endDate', 'validUntilDate'];
                        for (const field of possibleDateFields) {
                            if (rawLicense[field]) {
                                const rawDateValue = rawLicense[field];
                                const expDate = new Date(rawDateValue);
                                if (!isNaN(expDate.getTime())) {
                                    expirationDate = expDate.toISOString().split('T')[0];
                                    break;
                                }
                            }
                        }
                    }
                }

                // Mettre à jour les données localement pour l'affichage dynamique
                const physicalEndpoints = endpointsList.filter(ep => ep.type === 'physique').length;
                const virtualEndpoints = endpointsList.filter(ep => ep.type === 'virtuel').length;
                
                const updatedSolutionData = {
                    ...solution,
                    licencesTotales: licencesTotales || solution.licencesTotales || "",
                    licencesUtilisees: licencesUtilisees || solution.licencesUtilisees || "",
                    expiration: expirationDate || solution.expiration || "",
                    endpoints: endpointsList.map(ep => ({
                        id: ep.id,
                        name: ep.name || 'Sans nom',
                        ip: ep.ip || '',
                        type: ep.type || 'autre',
                        machineType: ep.machineType,
                        operatingSystem: ep.operatingSystem || '',
                        fqdn: ep.fqdn || '',
                        isManaged: ep.isManaged || false
                    })),
                    statistics: statistics || null,
                    syncData: {
                        license: responseData.data.license || null,
                        endpoints: responseData.data.endpoints || null,
                        company: responseData.data.company || null,
                        monthlyUsage: responseData.data.monthlyUsage || null,
                        physicalEndpoints: physicalEndpoints,
                        virtualEndpoints: virtualEndpoints,
                        totalEndpoints: endpointsList.length,
                        lastSync: new Date().toISOString()
                    }
                };
                
                // Mettre à jour le state local avec les données synchronisées
                setSyncedSolutionsData(prev => ({
                    ...prev,
                    [solutionIndex]: updatedSolutionData
                }));
                
                // Stocker les endpoints enrichis
                if (enrichedData) {
                    setEnrichedEndpointsData(prev => ({
                        ...prev,
                        [solutionIndex]: enrichedData
                    }));
                }
                
                // Stocker les politiques
                if (policiesData) {
                    setPoliciesData(prev => ({
                        ...prev,
                        [solutionIndex]: policiesData
                    }));
                }
                
                // Sauvegarder aussi dans data pour la persistance
                const currentData = dataRef.current || {};
                const updatedData = {
                    ...currentData,
                    bitdefenderSolutions: {
                        ...(currentData.bitdefenderSolutions || {}),
                        [solutionIndex]: updatedSolutionData
                    }
                };
                
                // Sauvegarder les endpoints enrichis si disponibles
                if (enrichedData) {
                    updatedData.bitdefenderEnrichedEndpoints = {
                        ...(currentData.bitdefenderEnrichedEndpoints || {}),
                        [solutionIndex]: enrichedData
                    };
                }
                
                // Sauvegarder les politiques si disponibles
                if (policiesData) {
                    updatedData.bitdefenderPolicies = {
                        ...(currentData.bitdefenderPolicies || {}),
                        [solutionIndex]: policiesData
                    };
                }
                
                setData(updatedData);
                dataRef.current = updatedData;
                
                return {
                    success: true,
                    endpointsCount: endpointsList.length,
                    solutionName: solution.solution || solution.companyName || 'Solution BitDefender',
                    solutionData: updatedSolutionData
                };
            } else {
                throw new Error(responseData.error || 'Erreur lors de la synchronisation');
            }
        } catch (error) {
            console.error('❌ Erreur synchronisation BitDefender:', error);
            throw error;
        } finally {
            setSyncingSolutions(prev => {
                const newSet = new Set(prev);
                newSet.delete(solutionIndex);
                return newSet;
            });

            // Démarrer les animations après la synchronisation
            setTimeout(() => {
                // Calculer les valeurs finales
                const healthScore = calculateHealthScore(statistics, enrichedData, endpointsList);
                const totalEndpoints = statistics?.endpoints?.total || endpointsList.length || 0;
                const managedEndpoints = statistics?.endpoints?.managed || 0;
                const unmanagedEndpoints = statistics?.endpoints?.unmanaged || 0;
                const managedRate = statistics?.availability?.managedRate || (totalEndpoints > 0 ? (managedEndpoints / totalEndpoints) * 100 : 0);
                const enrichedEndpoints = enrichedData?.endpoints || [];
                const infectedCount = enrichedEndpoints.filter(ep => ep.isInfected).length;
                const infectionRate = enrichedEndpoints.length > 0 ? (infectedCount / enrichedEndpoints.length) * 100 : 0;
                const onlineCount = enrichedEndpoints.filter(ep => ep.endpointState === 1).length;
                const onlineRate = enrichedEndpoints.length > 0 ? (onlineCount / enrichedEndpoints.length) * 100 : 0;
                const malwareDetectedCount = enrichedEndpoints.filter(ep => ep.malwareDetected).length;
                const malwareRate = enrichedEndpoints.length > 0 ? (malwareDetectedCount / enrichedEndpoints.length) * 100 : 0;

                // Animation de la note de santé
                if (healthScore) {
                    setAnimatedHealthScore(prev => ({ ...prev, [solutionIndex]: 0 }));
                    const duration = 3000;
                    const steps = 120;
                    const increment = healthScore.score / steps;
                    let currentStep = 0;
                    
                    const scoreTimer = setInterval(() => {
                        currentStep++;
                        const newValue = Math.min(increment * currentStep, healthScore.score);
                        setAnimatedHealthScore(prev => ({ ...prev, [solutionIndex]: Math.round(newValue) }));
                        
                        if (currentStep >= steps) {
                            clearInterval(scoreTimer);
                            setAnimatedHealthScore(prev => ({ ...prev, [solutionIndex]: healthScore.score }));
                        }
                    }, duration / steps);
                }

                // Animation du taux de gestion
                setAnimatedManagedRate(prev => ({ ...prev, [solutionIndex]: 0 }));
                const managedRateDuration = 2000;
                const managedRateSteps = 100;
                const managedRateIncrement = managedRate / managedRateSteps;
                let managedRateStep = 0;
                
                const managedRateTimer = setInterval(() => {
                    managedRateStep++;
                    const newValue = Math.min(managedRateIncrement * managedRateStep, managedRate);
                    setAnimatedManagedRate(prev => ({ ...prev, [solutionIndex]: newValue.toFixed(1) }));
                    
                    if (managedRateStep >= managedRateSteps) {
                        clearInterval(managedRateTimer);
                        setAnimatedManagedRate(prev => ({ ...prev, [solutionIndex]: managedRate.toFixed(1) }));
                    }
                }, managedRateDuration / managedRateSteps);

                // Animation du taux d'infection
                setAnimatedInfectionRate(prev => ({ ...prev, [solutionIndex]: 0 }));
                const infectionDuration = 2000;
                const infectionSteps = 100;
                const infectionIncrement = infectionRate / infectionSteps;
                let infectionStep = 0;
                
                const infectionTimer = setInterval(() => {
                    infectionStep++;
                    const newValue = Math.min(infectionIncrement * infectionStep, infectionRate);
                    setAnimatedInfectionRate(prev => ({ ...prev, [solutionIndex]: newValue.toFixed(1) }));
                    
                    if (infectionStep >= infectionSteps) {
                        clearInterval(infectionTimer);
                        setAnimatedInfectionRate(prev => ({ ...prev, [solutionIndex]: infectionRate.toFixed(1) }));
                    }
                }, infectionDuration / infectionSteps);

                // Animation du taux en ligne
                setAnimatedOnlineRate(prev => ({ ...prev, [solutionIndex]: 0 }));
                const onlineDuration = 2000;
                const onlineSteps = 100;
                const onlineIncrement = onlineRate / onlineSteps;
                let onlineStep = 0;
                
                const onlineTimer = setInterval(() => {
                    onlineStep++;
                    const newValue = Math.min(onlineIncrement * onlineStep, onlineRate);
                    setAnimatedOnlineRate(prev => ({ ...prev, [solutionIndex]: newValue.toFixed(1) }));
                    
                    if (onlineStep >= onlineSteps) {
                        clearInterval(onlineTimer);
                        setAnimatedOnlineRate(prev => ({ ...prev, [solutionIndex]: onlineRate.toFixed(1) }));
                    }
                }, onlineDuration / onlineSteps);

                // Animation du taux malware
                setAnimatedMalwareRate(prev => ({ ...prev, [solutionIndex]: 0 }));
                const malwareDuration = 2000;
                const malwareSteps = 100;
                const malwareIncrement = malwareRate / malwareSteps;
                let malwareStep = 0;
                
                const malwareTimer = setInterval(() => {
                    malwareStep++;
                    const newValue = Math.min(malwareIncrement * malwareStep, malwareRate);
                    setAnimatedMalwareRate(prev => ({ ...prev, [solutionIndex]: newValue.toFixed(1) }));
                    
                    if (malwareStep >= malwareSteps) {
                        clearInterval(malwareTimer);
                        setAnimatedMalwareRate(prev => ({ ...prev, [solutionIndex]: malwareRate.toFixed(1) }));
                    }
                }, malwareDuration / malwareSteps);

                // Animation du total endpoints
                setAnimatedTotalEndpoints(prev => ({ ...prev, [solutionIndex]: 0 }));
                const totalDuration = 2000;
                const totalSteps = 100;
                const totalIncrement = totalEndpoints / totalSteps;
                let totalStep = 0;
                
                const totalTimer = setInterval(() => {
                    totalStep++;
                    const newValue = Math.min(totalIncrement * totalStep, totalEndpoints);
                    setAnimatedTotalEndpoints(prev => ({ ...prev, [solutionIndex]: Math.round(newValue) }));
                    
                    if (totalStep >= totalSteps) {
                        clearInterval(totalTimer);
                        setAnimatedTotalEndpoints(prev => ({ ...prev, [solutionIndex]: totalEndpoints }));
                    }
                }, totalDuration / totalSteps);

                // Animation des endpoints gérés
                setAnimatedManaged(prev => ({ ...prev, [solutionIndex]: 0 }));
                const managedDuration = 2000;
                const managedSteps = 100;
                const managedIncrement = managedEndpoints / managedSteps;
                let managedStep = 0;
                
                const managedTimer = setInterval(() => {
                    managedStep++;
                    const newValue = Math.min(managedIncrement * managedStep, managedEndpoints);
                    setAnimatedManaged(prev => ({ ...prev, [solutionIndex]: Math.round(newValue) }));
                    
                    if (managedStep >= managedSteps) {
                        clearInterval(managedTimer);
                        setAnimatedManaged(prev => ({ ...prev, [solutionIndex]: managedEndpoints }));
                    }
                }, managedDuration / managedSteps);

                // Animation des endpoints non gérés
                setAnimatedUnmanaged(prev => ({ ...prev, [solutionIndex]: 0 }));
                const unmanagedDuration = 2000;
                const unmanagedSteps = 100;
                const unmanagedIncrement = unmanagedEndpoints / unmanagedSteps;
                let unmanagedStep = 0;
                
                const unmanagedTimer = setInterval(() => {
                    unmanagedStep++;
                    const newValue = Math.min(unmanagedIncrement * unmanagedStep, unmanagedEndpoints);
                    setAnimatedUnmanaged(prev => ({ ...prev, [solutionIndex]: Math.round(newValue) }));
                    
                    if (unmanagedStep >= unmanagedSteps) {
                        clearInterval(unmanagedTimer);
                        setAnimatedUnmanaged(prev => ({ ...prev, [solutionIndex]: unmanagedEndpoints }));
                    }
                }, unmanagedDuration / unmanagedSteps);

                // Animation du nombre d'infections
                setAnimatedInfectionCount(prev => ({ ...prev, [solutionIndex]: 0 }));
                const infectionCountDuration = 2000;
                const infectionCountSteps = 100;
                const infectionCountIncrement = infectedCount / infectionCountSteps;
                let infectionCountStep = 0;
                
                const infectionCountTimer = setInterval(() => {
                    infectionCountStep++;
                    const newValue = Math.min(infectionCountIncrement * infectionCountStep, infectedCount);
                    setAnimatedInfectionCount(prev => ({ ...prev, [solutionIndex]: Math.round(newValue) }));
                    
                    if (infectionCountStep >= infectionCountSteps) {
                        clearInterval(infectionCountTimer);
                        setAnimatedInfectionCount(prev => ({ ...prev, [solutionIndex]: infectedCount }));
                    }
                }, infectionCountDuration / infectionCountSteps);
            }, 100);
        }
    }, [staticData, loadStatistics]);

    // Fonction pour synchroniser toutes les solutions BitDefender
    const syncAllBitDefender = useCallback(async () => {
        const solutions = staticData?.solutions || [];
        const bitDefenderSolutions = solutions.filter(
            sol => sol.solution === "GravityZone BitDefender" && sol.companyId
        );

        if (bitDefenderSolutions.length === 0) {
            toast.warning('Aucune solution BitDefender avec entreprise configurée', toastOptions);
            return;
        }

        const syncPromises = bitDefenderSolutions.map((solution, index) => {
            const solutionIndex = solutions.findIndex(s => s === solution);
            return syncBitDefenderSolution(solutionIndex, solution.companyId);
        });

        try {
            const results = await Promise.all(syncPromises);
            const totalEndpoints = results.reduce((sum, r) => sum + (r?.endpointsCount || 0), 0);
            const successCount = results.filter(r => r?.success).length;
            
            if (successCount === bitDefenderSolutions.length) {
                toast.success(`Synchronisation terminée: ${totalEndpoints} endpoint(s)`, toastOptions);
            } else {
                toast.warning(`Synchronisation partielle: ${successCount}/${bitDefenderSolutions.length}`, toastOptions);
            }
        } catch (error) {
            toast.error(`Erreur lors de la synchronisation`, toastOptions);
        }
    }, [staticData, syncBitDefenderSolution]);

    // Mettre à jour la ref de syncAllBitDefender
    useEffect(() => {
        syncAllBitDefenderRef.current = syncAllBitDefender;
    }, [syncAllBitDefender]);

    // Exposer la fonction syncAllBitDefender au parent
    // Pour le module Antivirus, le bouton doit toujours être visible si le module existe
    // Si le composant est rendu, c'est que le module existe, donc hasCheckMKMappings = true
    useEffect(() => {
        // Utiliser un petit délai pour s'assurer que les refs sont prêtes
        const timer = setTimeout(() => {
            if (onSyncAllCheckMKReadyRef.current && syncAllBitDefenderRef.current) {
                onSyncAllCheckMKReadyRef.current({
                    syncAllCheckMK: syncAllBitDefenderRef.current,
                    hasCheckMKMappings: true, // Toujours true car le composant est rendu
                    isLoading: syncingSolutions.size > 0
                });
            }
        }, 100);
        
        return () => clearTimeout(timer);
    }, [syncingSolutions, onSyncAllCheckMKReady]);

    // Obtenir les solutions BitDefender synchronisées (fusionner avec les données synchronisées locales)
    const getBitDefenderSolutions = () => {
        // Si staticData a directement un champ solution (pas dans un tableau), le convertir
        let solutions = staticData?.solutions || [];
        
        // Si staticData a directement un champ solution, créer un tableau avec cet élément
        if (!Array.isArray(solutions) && staticData?.solution) {
            solutions = [staticData];
        }
        
        // Si solutions est toujours vide mais qu'on a des données, essayer de créer un tableau
        if (solutions.length === 0 && staticData && Object.keys(staticData).length > 0) {
            // Si staticData a un champ solution, créer un tableau avec cet élément
            if (staticData.solution) {
                solutions = [staticData];
            }
        }
        
        const bitDefenderSolutions = solutions.filter(sol => {
            // Vérifier si c'est une solution BitDefender
            const solutionName = sol.solution || sol.logiciel || '';
            return solutionName.includes('BitDefender') || solutionName.includes('GravityZone');
        });
        
        // Fusionner avec les données synchronisées locales si disponibles
        return bitDefenderSolutions.map((sol, index) => {
            const syncedData = syncedSolutionsData[index];
            if (syncedData) {
                return syncedData;
            }
            return sol;
        });
    };

    // Obtenir les solutions BitDefender avec endpoints (pour l'affichage)
    const getBitDefenderSolutionsWithEndpoints = () => {
        const solutions = getBitDefenderSolutions();
        return solutions;
    };

    // Fonction pour obtenir le nom du type de rapport
    const getReportTypeName = (type) => {
        const reportTypes = {
            2: 'Applications bloquées',
            3: 'Sites web bloqués',
            5: 'Protection des données',
            11: 'Activité malware',
            12: 'Statut malware',
            17: 'Audit de sécurité'
        };
        return reportTypes[type] || `Type ${type}`;
    };

    // Fonction pour obtenir le nom de l'occurrence
    const getOccurrenceName = (occurrence) => {
        const occurrences = {
            2: 'Horaire',
            3: 'Quotidien',
            4: 'Hebdomadaire',
            5: 'Mensuel'
        };
        return occurrences[occurrence] || 'Inconnu';
    };

    // Fonction pour formater le nom du système d'exploitation
    const formatOSName = (osName) => {
        if (!osName) return "N/A";
        
        const os = String(osName).trim();
        
        // Normaliser les noms Windows
        if (os.toLowerCase().includes('windows')) {
            // Vérifier Windows 11 d'abord
            if (os.match(/windows\s*11/i)) return "Windows 11";
            
            // Vérifier Windows 10
            if (os.match(/windows\s*10/i)) return "Windows 10";
            
            // Vérifier les versions Server spécifiques
            if (os.match(/windows\s*server\s*2022/i)) return "Windows Server 2022";
            if (os.match(/windows\s*server\s*2019/i)) return "Windows Server 2019";
            if (os.match(/windows\s*server\s*2016/i)) return "Windows Server 2016";
            if (os.match(/windows\s*server\s*2012\s*r2/i)) return "Windows Server 2012 R2";
            if (os.match(/windows\s*server\s*2012/i)) return "Windows Server 2012";
            
            // Autres versions Windows Server
            if (os.match(/windows\s*server/i)) {
                // Essayer d'extraire la version si présente
                const serverVersionMatch = os.match(/windows\s*server\s*(\d+)/i);
                if (serverVersionMatch) {
                    return `Windows Server ${serverVersionMatch[1]}`;
                }
                return "Windows Server";
            }
            
            // Autres versions Windows (8, 7, etc.)
            const windowsVersionMatch = os.match(/windows\s*(\d+)/i);
            if (windowsVersionMatch) {
                return `Windows ${windowsVersionMatch[1]}`;
            }
            
            // Windows générique si aucune version spécifique trouvée
            return "Windows";
        }
        
        // Normaliser les noms macOS
        if (os.toLowerCase().includes('mac') || os.toLowerCase().includes('darwin')) {
            const macVersionMatch = os.match(/(?:macos|mac\s*os)\s*x?\s*(\d+[._]\d+)/i);
            if (macVersionMatch) {
                const version = macVersionMatch[1].replace('_', '.');
                return `macOS ${version}`;
            }
            return "macOS";
        }
        
        // Normaliser les noms Linux
        if (os.toLowerCase().includes('linux')) {
            const ubuntuMatch = os.match(/ubuntu/i);
            const debianMatch = os.match(/debian/i);
            const centosMatch = os.match(/centos/i);
            const redhatMatch = os.match(/red\s*hat|rhel/i);
            
            if (ubuntuMatch) return "Ubuntu";
            if (debianMatch) return "Debian";
            if (centosMatch) return "CentOS";
            if (redhatMatch) return "Red Hat";
            return "Linux";
        }
        
        return os;
    };

    // Vérifier s'il y a des solutions BitDefender configurées (pour afficher le bouton)
    const hasBitDefenderSolutions = () => {
        const solutions = getBitDefenderSolutions();
        return solutions.some(sol => {
            const solutionName = sol.solution || sol.logiciel || '';
            return (solutionName.includes('BitDefender') || solutionName.includes('GravityZone')) && sol.companyId;
        });
    };

    // Fonction pour calculer la note globale de santé du parc
    const calculateHealthScore = (statistics, enrichedData, endpoints) => {
        if (!statistics && (!enrichedData || !enrichedData.endpoints || enrichedData.endpoints.length === 0)) {
            return null; // Pas assez de données
        }

        let score = 100;
        const factors = [];
        const enrichedEndpoints = enrichedData?.endpoints || [];

        // 1. Taux de gestion (0-25 points)
        const totalEndpoints = statistics?.endpoints?.total || endpoints?.length || 0;
        const managedEndpoints = statistics?.endpoints?.managed || 0;
        const managedRate = totalEndpoints > 0 ? (managedEndpoints / totalEndpoints) * 100 : 0;
        const managementScore = (managedRate / 100) * 25;
        score -= (25 - managementScore);
        factors.push({ name: 'Gestion', value: managedRate, weight: 25, earnedPoints: Math.round(managementScore) });

        // 2. Taux d'infection (0-20 points)
        const infectedCount = enrichedEndpoints.filter(ep => ep.isInfected).length;
        const infectionRate = enrichedEndpoints.length > 0 ? (infectedCount / enrichedEndpoints.length) * 100 : 0;
        const infectionScore = Math.max(0, 20 - (infectionRate * 20 / 10)); // Pénalité si > 10% d'infection
        score -= (20 - infectionScore);
        factors.push({ name: 'Infection', value: infectionRate, weight: 20, earnedPoints: Math.round(infectionScore) });

        // 3. Taux d'endpoints en ligne (0-20 points)
        const onlineCount = enrichedEndpoints.filter(ep => ep.endpointState === 1).length;
        const onlineRate = enrichedEndpoints.length > 0 ? (onlineCount / enrichedEndpoints.length) * 100 : 0;
        const onlineScore = (onlineRate / 100) * 20;
        score -= (20 - onlineScore);
        factors.push({ name: 'Disponibilité', value: onlineRate, weight: 20, earnedPoints: Math.round(onlineScore) });

        // 4. Base antivirale à jour (0-15 points)
        const upToDateEndpoints = enrichedEndpoints.filter(ep => {
            const agent = ep.agent || {};
            return !agent.signatureOutdated && !agent.productOutdated;
        }).length;
        const upToDateRate = enrichedEndpoints.length > 0 ? (upToDateEndpoints / enrichedEndpoints.length) * 100 : 0;
        const upToDateScore = (upToDateRate / 100) * 15;
        score -= (15 - upToDateScore);
        factors.push({ name: 'Base antivirale', value: upToDateRate, weight: 15, earnedPoints: Math.round(upToDateScore) });

        // 5. Endpoints déconnectés depuis plus de 24h (0-10 points)
        const disconnected24h = enrichedEndpoints.filter(ep => {
            if (!ep.lastSeen) return false;
            const lastSeenDate = new Date(ep.lastSeen);
            const now = new Date();
            const diffHours = (now - lastSeenDate) / (1000 * 60 * 60);
            return diffHours > 24;
        }).length;
        const disconnectedRate = enrichedEndpoints.length > 0 ? (disconnected24h / enrichedEndpoints.length) * 100 : 0;
        const disconnectedScore = Math.max(0, 10 - (disconnectedRate * 10 / 20)); // Pénalité si > 20% déconnectés
        score -= (10 - disconnectedScore);
        factors.push({ name: 'Connexion', value: 100 - disconnectedRate, weight: 10, earnedPoints: Math.round(disconnectedScore) });

        // 6. Taux de détection de malware (0-10 points)
        const malwareDetectedCount = enrichedEndpoints.filter(ep => ep.malwareDetected).length;
        const malwareRate = enrichedEndpoints.length > 0 ? (malwareDetectedCount / enrichedEndpoints.length) * 100 : 0;
        const malwareScore = Math.max(0, 10 - (malwareRate * 10 / 20)); // Pénalité si > 20% de détection
        score -= (10 - malwareScore);
        factors.push({ name: 'Malware', value: malwareRate, weight: 10, earnedPoints: Math.round(malwareScore) });

        // S'assurer que le score est entre 0 et 100
        score = Math.max(0, Math.min(100, score));

        return {
            score: Math.round(score),
            factors,
            managedRate,
            infectionRate,
            onlineRate,
            malwareRate,
            upToDateRate,
            disconnectedRate
        };
    };


    const bitDefenderSolutions = getBitDefenderSolutionsWithEndpoints();
    const hasBitDefender = hasBitDefenderSolutions();

    const parseRateValue = useCallback((value) => {
        if (value === null || value === undefined || value === 'N/A') return null;
        const numeric = typeof value === 'string' ? parseFloat(value) : value;
        return Number.isNaN(numeric) ? null : numeric;
    }, []);

    const renderMetricRow = useCallback((label, value, higherIsBetter = true) => (
        <div style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#d1d5db' : '#374151', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MetricLetter value={value} higherIsBetter={higherIsBetter} theme={theme} showValue={false} />
            <strong>{label}</strong>
        </div>
    ), [theme]);

    // Si pas de données, afficher le message vide
    if (!hasData()) {
        return (
            <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>Aucun antivirus configuré pour ce client.</p>
                </div>
            </div>
        );
    }

    // Skeleton fantôme pendant une synchronisation
    if (syncingSolutions.size > 0) {
        return (
            <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.antivirusGrid}>
                    {[1, 2].map((cardIndex) => (
                        <div key={cardIndex} className={`${styles.antivirusCard} ${styles.syncSkeletonCard}`}>
                            <div className={styles.syncSkeletonHeader}>
                                <div className={`${styles.syncSkeletonShimmer} ${styles.syncSkeletonLogo}`} />
                                <div className={`${styles.syncSkeletonShimmer} ${styles.syncSkeletonTitle}`} />
                            </div>
                            <div className={styles.syncSkeletonStatsRow}>
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className={styles.syncSkeletonStatBlock}>
                                        <div className={`${styles.syncSkeletonShimmer} ${styles.syncSkeletonStatValue}`} />
                                        <div className={`${styles.syncSkeletonShimmer} ${styles.syncSkeletonStatLabel}`} />
                                    </div>
                                ))}
                            </div>
                            <div className={`${styles.syncSkeletonShimmer} ${styles.syncSkeletonSectionTitle}`} />
                            <div className={styles.syncSkeletonTable}>
                                {[1, 2, 3, 4, 5].map((row) => (
                                    <div key={row} className={styles.syncSkeletonTableRow}>
                                        {[1, 2, 3, 4].map((j) => (
                                            <div key={j} className={`${styles.syncSkeletonShimmer} ${styles.syncSkeletonTableCell}`} style={{ width: j === 2 ? '70%' : undefined }} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const antivirusStatus = getAntivirusStatus();
    const antivirusInfo = getAntivirusInfo();
    const totalThreats = getTotalThreats();

    return (
        <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
            <div className={styles.antivirusGrid}>
                {/* Cartes pour les solutions BitDefender synchronisées */}
                {bitDefenderSolutions.map((solution, solIndex) => {
                    const syncData = solution.syncData || {};
                    const endpoints = solution.endpoints || [];
                    const statistics = solution.statistics || null;
                    const enrichedData = enrichedEndpointsData[solIndex] || null;
                    const policies = policiesData[solIndex] || null;
                    const totalEndpoints = syncData.totalEndpoints || endpoints.length || 0;
                    const physicalEndpoints = syncData.physicalEndpoints || endpoints.filter(ep => ep.type === 'physique').length || 0;
                    const virtualEndpoints = syncData.virtualEndpoints || endpoints.filter(ep => ep.type === 'virtuel').length || 0;
                    const managedEndpointsCount = statistics?.endpoints?.managed ?? endpoints.filter(ep => ep.isManaged).length ?? 0;
                    const licencesTotales = solution.licencesTotales || "";
                    const licencesUtilisees = managedEndpointsCount;
                    const expiration = solution.expiration || "";
                    const lastSync = syncData.lastSync || "";
                    const isSyncing = syncingSolutions.has(solIndex);

                    return (
                        <div key={`bitdefender-${solIndex}`} className={`${styles.antivirusCard} ${styles.withComment}`}>
                            {/* Contenu de la carte */}
                            <div>
                            {/* En-tête de la carte */}
                            <div className={styles.cardHeader} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', paddingBottom: '1rem' }}>
                                {/* Gauche : Icône + Titre */}
                                <div className={styles.headerLeft} style={{ zIndex: 1 }}>
                                    <div className={styles.antivirusInfo}>
                                        <h3 className={styles.antivirusName}>
                                            <img 
                                                src={getIconPath('bitdefender.png')} 
                                                alt="BitDefender" 
                                                style={{ width: '20px', height: '20px', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem', borderRadius: '4px' }} 
                                            />
                                            <a 
                                                href="https://gravityzone.bitdefender.com/" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ 
                                                    color: 'inherit', 
                                                    textDecoration: 'none',
                                                    transition: 'opacity 0.2s ease',
                                                    transform: 'translateY(4px)',
                                                    display: 'inline-block'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                title="Ouvrir GravityZone BitDefender"
                                            >
                                                {solution.solution}
                                            </a>
                                        </h3>
                                    </div>
                                </div>

                                {/* Centre : Boutons de navigation avec icônes - Centrés absolument */}
                                <div style={{
                                    position: 'absolute',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                    marginTop: '1rem'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        background: theme === 'dark' ? '#2d2d4f' : '#f3f4f6',
                                        padding: '0.5rem',
                                        borderRadius: '8px',
                                        border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                                        pointerEvents: 'auto'
                                    }}>
                                        <button
                                        onClick={() => setViewMode(prev => ({ ...prev, [solIndex]: 'dashboard' }))}
                                        title="Dashboard"
                                        style={{
                                            padding: '0.5rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.25rem',
                                            minWidth: '70px',
                                            width: '70px',
                                            color: (viewMode[solIndex] === 'dashboard' || !viewMode[solIndex]) 
                                                ? (theme === 'dark' ? '#f9fafb' : '#111827')
                                                : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                                            background: (viewMode[solIndex] === 'dashboard' || !viewMode[solIndex])
                                                ? (theme === 'dark' ? '#1e1e3f' : '#ffffff')
                                                : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: (viewMode[solIndex] === 'dashboard' || !viewMode[solIndex])
                                                ? '0 2px 4px rgba(0,0,0,0.1)' 
                                                : 'none',
                                            pointerEvents: 'auto'
                                        }}
                                    >
                                        <IconifyIcon
                                            icon="material-symbols:dashboard-rounded"
                                            width={20}
                                            height={20}
                                            style={{ pointerEvents: 'none' }}
                                        />
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: '500',
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none'
                                        }}>
                                            Dashboard
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setViewMode(prev => ({ ...prev, [solIndex]: 'politiques' }))}
                                        title="Licences et Politiques"
                                        style={{
                                            padding: '0.5rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.25rem',
                                            minWidth: '70px',
                                            width: '70px',
                                            color: viewMode[solIndex] === 'politiques'
                                                ? (theme === 'dark' ? '#f9fafb' : '#111827')
                                                : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                                            background: viewMode[solIndex] === 'politiques'
                                                ? (theme === 'dark' ? '#1e1e3f' : '#ffffff')
                                                : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: viewMode[solIndex] === 'politiques'
                                                ? '0 2px 4px rgba(0,0,0,0.1)' 
                                                : 'none',
                                            pointerEvents: 'auto'
                                        }}
                                    >
                                        <IconifyIcon
                                            icon="material-symbols:policy"
                                            width={20}
                                            height={20}
                                            style={{ pointerEvents: 'none' }}
                                        />
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: '500',
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none'
                                        }}>
                                            Politiques
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setViewMode(prev => ({ ...prev, [solIndex]: 'endpoints' }));
                                            setEndpointsPagination(prev => ({ ...prev, [solIndex]: 1 }));
                                        }}
                                        title="Endpoints"
                                        style={{
                                            padding: '0.5rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.25rem',
                                            minWidth: '70px',
                                            width: '70px',
                                            color: viewMode[solIndex] === 'endpoints'
                                                ? (theme === 'dark' ? '#f9fafb' : '#111827')
                                                : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                                            background: viewMode[solIndex] === 'endpoints'
                                                ? (theme === 'dark' ? '#1e1e3f' : '#ffffff')
                                                : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: viewMode[solIndex] === 'endpoints'
                                                ? '0 2px 4px rgba(0,0,0,0.1)' 
                                                : 'none',
                                            pointerEvents: 'auto'
                                        }}
                                    >
                                        <IconifyIcon
                                            icon="mingcute:computer-fill"
                                            width={20}
                                            height={20}
                                            style={{ pointerEvents: 'none' }}
                                        />
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: '500',
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none'
                                        }}>
                                            Endpoints
                                        </span>
                                    </button>
                                    </div>
                                </div>

                                {/* Droite : Barre d'action */}
                                <div className={styles.headerRight} style={{ zIndex: 1 }}>
                                    {/* Bouton Commentaire */}
                                    {/* Bouton Synchronisation */}
                                    {solution.companyId && (
                                        <button
                                            type="button"
                                            className={`${commonStyles.syncButton} ${!lastSync && !isSyncing ? commonStyles.syncButtonAttention : ''}`}
                                            onClick={() => {
                                                if (!isSyncing) {
                                                    syncBitDefenderSolution(solIndex, solution.companyId);
                                                }
                                            }}
                                            title={`${lastSync ? 'Resynchroniser' : 'Synchroniser'} les données BitDefender pour ${solution.companyName || solution.solution}`}
                                            disabled={isSyncing}
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
                                                cursor: isSyncing ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s ease',
                                                opacity: isSyncing ? 0.5 : 1,
                                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSyncing) {
                                                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSyncing) {
                                                    e.currentTarget.style.borderColor = 'var(--border-secondary)';
                                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                                }
                                            }}
                                        >
                                            <IconifyIcon
                                                icon="material-symbols:sync"
                                                width={14}
                                                height={14}
                                                className={isSyncing ? styles.loadingIcon : ''}
                                            />
                                        </button>
                                    )}
                                    
                                    {/* Bouton GLPI */}
                                    <div style={{ flexShrink: 0 }}>
                                        
                                    </div>
                                </div>
                            </div>

                            {/* Contenu conditionnel selon la vue active */}
                            
                            {/* Vue Dashboard - Statistiques avec graphiques */}
                            {(!viewMode[solIndex] || viewMode[solIndex] === 'dashboard') && (
                                <div className={styles.statisticsSection} style={{ position: 'relative', marginTop: '1.5rem' }}>
                                    {isSyncing && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                            fontSize: '0.75rem',
                                            zIndex: 10,
                                            backgroundColor: theme === 'dark' ? 'rgba(30, 30, 63, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            boxShadow: theme === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
                                            border: theme === 'dark' ? '1px solid #4a4a6a' : 'none'
                                        }}>
                                            <FaSync style={{ 
                                                animation: 'spin 1s linear infinite',
                                                fontSize: '0.75rem'
                                            }} />
                                            Synchronisation...
                                    </div>
                                    )}
                                    <div style={{ opacity: isSyncing ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
                                    {/* Note globale de santé du parc */}
                                    {(() => {
                                        const healthScore = calculateHealthScore(statistics, enrichedData, endpoints);
                                        // Toujours afficher la note globale, même si healthScore est null
                                        // Si la synchro est possible (solution BitDefender existe) mais pas de données, afficher N/A
                                        const hasSyncPossible = solution && solution.companyId;
                                        const shouldShowNA = !healthScore && hasSyncPossible;

                                        const calculatedScore = shouldShowNA ? null : healthScore?.score;
                                        const manualScore = antivirus.solutions?.[solIndex]?.manualHealthScore;
                                        const healthScoreValue = shouldShowNA ? null : (manualScore !== undefined ? manualScore : calculatedScore);

                                        const scoreColor = shouldShowNA ? '#6b7280' : (healthScoreValue !== null ? scoreToColor(healthScoreValue) : '#6b7280');

                                        const animatedScoreValue = shouldShowNA ? null : (animatedHealthScore[solIndex] !== undefined ? animatedHealthScore[solIndex] : healthScoreValue);
                                        const managedRateValue = shouldShowNA ? null : parseRateValue(animatedManagedRate[solIndex] !== undefined ? animatedManagedRate[solIndex] : healthScore?.managedRate);
                                        const infectionRateValue = shouldShowNA ? null : parseRateValue(animatedInfectionRate[solIndex] !== undefined ? animatedInfectionRate[solIndex] : healthScore?.infectionRate);
                                        const onlineRateValue = shouldShowNA ? null : parseRateValue(animatedOnlineRate[solIndex] !== undefined ? animatedOnlineRate[solIndex] : healthScore?.onlineRate);
                                        const malwareRateValue = shouldShowNA ? null : parseRateValue(animatedMalwareRate[solIndex] !== undefined ? animatedMalwareRate[solIndex] : healthScore?.malwareRate);
                                        const upToDateRateValue = shouldShowNA ? null : parseRateValue(healthScore?.upToDateRate);
                                        const disconnectedRateValue = shouldShowNA ? null : parseRateValue(healthScore?.disconnectedRate);
                                        
                                        // Recalculer la couleur en fonction du score animé
                                        const animatedScoreLetter = shouldShowNA ? null : (scoreToLetter(animatedScoreValue) || null);
                                        const isEditing = editingScore[solIndex];
                                        const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;

                                        return (
                                            <div style={{
                                                marginBottom: '1.5rem',
                                                padding: '1rem',
                                                borderRadius: '12px',
                                                background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
                                                border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '1.5rem',
                                                minHeight: '140px'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    minWidth: '120px'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={editingScoreValue[solIndex] !== undefined ? editingScoreValue[solIndex] : animatedScoreValue}
                                                                onChange={(e) => setEditingScoreValue(prev => ({ ...prev, [solIndex]: e.target.value }))}
                                                                onBlur={() => saveEditScore(solIndex)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        saveEditScore(solIndex);
                                                                    } else if (e.key === 'Escape') {
                                                                        cancelEditScore(solIndex);
                                                                    }
                                                                }}
                                                                autoFocus
                                                                style={{
                                                                    fontSize: '2.5rem',
                                                                    fontWeight: '700',
                                                                    color: scoreColor,
                                                                    lineHeight: '1',
                                                                    width: '80px',
                                                                    border: `2px solid ${scoreColor}`,
                                                                    borderRadius: '4px',
                                                                    padding: '0.25rem',
                                                                    background: theme === 'dark' ? '#2d2d4f' : '#ffffff',
                                                                    textAlign: 'center'
                                                                }}
                                                                onFocus={handleInputFocus}
                                                            />
                                                        ) : (
                                                            <div
                                                                role="button"
                                                                tabIndex={animatedScoreValue !== null ? 0 : -1}
                                                                onKeyDown={(e) => {
                                                                    if (animatedScoreValue !== null && (e.key === 'Enter' || e.key === ' ')) {
                                                                        e.preventDefault();
                                                                        startEditScore(solIndex, animatedScoreValue);
                                                                    }
                                                                }}
                                                                title={animatedScoreValue !== null ? "Cliquer pour sélectionner une note, double-cliquer pour éditer précisément" : ""}
                                                                style={{ 
                                                                    cursor: animatedScoreValue !== null ? 'pointer' : 'default',
                                                                    outline: 'none'
                                                                }}
                                                            >
                                                                <LetterScale 
                                                                    activeLetter={animatedScoreLetter} 
                                                                    theme={theme}
                                                                    letters={["F", "E", "D", "C", "B", "A"]}
                                                                    size="normal"
                                                                    onSelect={animatedScoreValue !== null ? (letter) => handleManualLetterSelect(solIndex, letter) : undefined}
                                                                    highlightLetter={manualScoreChanged && calculatedScore !== null && !isEditing ? scoreToLetter(calculatedScore) : null}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className={styles.scoreTooltipContainer}>
                                                            <FaInfoCircle 
                                                                className={styles.scoreTooltipIcon}
                                                                onMouseEnter={(e) => {
                                                                    const getFactorLabel = (name) => {
                                                                        const labels = {
                                                                            'Gestion': 'Taux de gestion',
                                                                            'Infection': 'Taux d\'infection',
                                                                            'Disponibilité': 'Endpoints en ligne',
                                                                            'Base antivirale': 'Base antivirale à jour',
                                                                            'Connexion': 'Déconnectés > 24h',
                                                                            'Malware': 'Malware détecté'
                                                                        };
                                                                        return labels[name] || name;
                                                                    };
                                                                    const getFactorDescription = (name) => {
                                                                        const descriptions = {
                                                                            'Gestion': 'Pourcentage d\'endpoints effectivement gérés par GravityZone parmi tous les postes découverts',
                                                                            'Infection': 'Pourcentage d\'endpoints actuellement infectés ou ayant des menaces détectées',
                                                                            'Disponibilité': 'Pourcentage d\'endpoints actuellement connectés et actifs dans GravityZone',
                                                                            'Base antivirale': 'Pourcentage d\'endpoints avec les signatures et l\'agent Bitdefender à jour',
                                                                            'Connexion': 'Pourcentage d\'endpoints n\'ayant pas communiqué avec GravityZone depuis plus de 24 heures',
                                                                            'Malware': 'Pourcentage d\'endpoints avec des malwares détectés ou en quarantaine'
                                                                        };
                                                                        return descriptions[name] || '';
                                                                    };
                                                                    const breakdown = healthScore?.factors && healthScore.factors.length > 0 
                                                                        ? healthScore.factors.map(factor => ({
                                                                            label: getFactorLabel(factor.name),
                                                                            description: getFactorDescription(factor.name),
                                                                            weight: `${factor.weight} pts`
                                                                        }))
                                                                        : [
                                                                            { label: 'Taux de gestion', description: 'Pourcentage d\'endpoints effectivement gérés par GravityZone parmi tous les postes découverts', weight: '25 pts' },
                                                                            { label: 'Taux d\'infection', description: 'Pourcentage d\'endpoints actuellement infectés ou ayant des menaces détectées', weight: '20 pts' },
                                                                            { label: 'Endpoints en ligne', description: 'Pourcentage d\'endpoints actuellement connectés et actifs dans GravityZone', weight: '20 pts' },
                                                                            { label: 'Base antivirale à jour', description: 'Pourcentage d\'endpoints avec les signatures et l\'agent Bitdefender à jour', weight: '15 pts' },
                                                                            { label: 'Déconnectés > 24h', description: 'Pourcentage d\'endpoints n\'ayant pas communiqué avec GravityZone depuis plus de 24 heures', weight: '10 pts' },
                                                                            { label: 'Malware détecté', description: 'Pourcentage d\'endpoints avec des malwares détectés ou en quarantaine', weight: '10 pts' }
                                                                        ];
                                                                    setHoveredTooltip({
                                                                        solutionIndex: solIndex,
                                                                        mouseX: e.clientX,
                                                                        mouseY: e.clientY,
                                                                        scoreBreakdown: breakdown
                                                                    });
                                                                }}
                                                                onMouseMove={(e) => {
                                                                    if (hoveredTooltip?.solutionIndex === solIndex) {
                                                                        setHoveredTooltip(prev => ({
                                                                            ...prev,
                                                                            mouseX: e.clientX,
                                                                            mouseY: e.clientY
                                                                        }));
                                                                    }
                                                                }}
                                                                onMouseLeave={() => {
                                                                    if (hoveredTooltip?.solutionIndex === solIndex) {
                                                                        setHoveredTooltip(null);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {calculatedScore !== null && manualScore !== undefined && isEditing && (
                                                        <div style={{
                                                            fontSize: '0.65rem',
                                                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                                            fontStyle: 'italic',
                                                            opacity: 0.7,
                                                            marginTop: '0.5rem'
                                                        }}>
                                                            Note calculée: {calculatedScore} ({scoreToLetter(calculatedScore)})
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                                    gap: '0.5rem 1rem',
                                                    flex: 1,
                                                    maxWidth: '400px'
                                                }}>
                                                    {renderMetricRow('Gestion', managedRateValue, true)}
                                                    {renderMetricRow('Infection', infectionRateValue, false)}
                                                    {renderMetricRow('En ligne', onlineRateValue, true)}
                                                    {renderMetricRow('Base antivirale', upToDateRateValue, true)}
                                                    {renderMetricRow('Déconnectés > 24h', disconnectedRateValue, false)}
                                                    {renderMetricRow('Malware détecté', malwareRateValue, false)}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                {/* Métriques principales compactes */}
                                <div className={styles.metricsRow}>
                                    <div className={styles.metricItem}>
                                        <div className={styles.metricLabel}>Total endpoints</div>
                                        <div className={styles.metricValue}>
                                            {animatedTotalEndpoints[solIndex] !== undefined 
                                                ? animatedTotalEndpoints[solIndex] 
                                                : (statistics?.endpoints?.total ?? "N/A")}
                                            </div>
                                            </div>
                                    <div className={styles.metricItem}>
                                        <div className={styles.metricLabel}>Gérés</div>
                                        <div className={styles.metricValue} style={{ color: '#10b981' }}>
                                            {animatedManaged[solIndex] !== undefined 
                                                ? animatedManaged[solIndex] 
                                                : (statistics?.endpoints?.managed ?? "N/A")}
                                            </div>
                                                </div>
                                    <div className={styles.metricItem}>
                                        <div className={styles.metricLabel}>Non gérés</div>
                                        <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                                            {animatedUnmanaged[solIndex] !== undefined 
                                                ? animatedUnmanaged[solIndex] 
                                                : (statistics?.endpoints?.unmanaged ?? "N/A")}
                                        </div>
                                            </div>
                                    <div className={styles.metricItem}>
                                        <div className={styles.metricLabel}>Taux de gestion</div>
                                        <div className={styles.metricValue}>
                                            {animatedManagedRate[solIndex] !== undefined 
                                                ? `${animatedManagedRate[solIndex]}%` 
                                                : (statistics?.availability?.managedRate !== undefined ? `${statistics.availability.managedRate}%` : "N/A")}
                                            </div>
                                            </div>
                                                </div>

                                {/* Métriques supplémentaires */}
                                {(() => {
                                    const enrichedEndpoints = enrichedData?.endpoints || [];
                                    const totalEnriched = enrichedEndpoints.length;
                                    
                                    // Compter les endpoints déconnectés depuis plus de 24h
                                    const disconnected24h = enrichedEndpoints.filter(ep => {
                                        if (!ep.lastSeen) return false;
                                        const lastSeenDate = new Date(ep.lastSeen);
                                        const now = new Date();
                                        const diffHours = (now - lastSeenDate) / (1000 * 60 * 60);
                                        return diffHours > 24;
                                    }).length;
                                    
                                    // Compter les endpoints à jour en terme de base antivirale
                                    const upToDateEndpoints = enrichedEndpoints.filter(ep => {
                                        const agent = ep.agent || {};
                                        return !agent.signatureOutdated && !agent.productOutdated;
                                    }).length;
                                    
                                    const upToDateRate = totalEnriched > 0 ? (upToDateEndpoints / totalEnriched) * 100 : 0;
                                    
                                    // Calculer le taux d'infection
                                    const infectedCount = enrichedEndpoints.filter(ep => ep.isInfected).length;
                                    const infectionRate = totalEnriched > 0 ? (infectedCount / totalEnriched) * 100 : 0;
                                    
                                    const animatedInfectionRateValue = animatedInfectionRate[solIndex] !== undefined ? parseFloat(animatedInfectionRate[solIndex]) : infectionRate;
                                    const animatedInfectionCountValue = animatedInfectionCount[solIndex] !== undefined ? animatedInfectionCount[solIndex] : infectedCount;
                                    
                                    const infectionRateMetricValue = totalEnriched > 0 ? animatedInfectionRateValue : null;
                                    const upToDateMetricValue = totalEnriched > 0 ? upToDateRate : null;
                                    
                                    return (
                                        <div className={styles.metricsRow} style={{ marginTop: '1rem' }}>
                                            <div className={styles.metricItem}>
                                                <div className={styles.metricLabel}>Déconnectés {'>'} 24h</div>
                                                <div className={styles.metricValue} style={{ color: disconnected24h > 0 ? '#ef4444' : '#10b981' }}>
                                                    {disconnected24h}
                                            </div>
                                            </div>
                                            <div className={styles.metricItem}>
                                                <div className={styles.metricLabel}>Taux d'infection</div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '0.5rem',
                                                    width: '100%'
                                                }}>
                                                    <MetricLetter value={infectionRateMetricValue} higherIsBetter={false} theme={theme} showValue={false} />
                                                    {totalEnriched > 0 && (
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                                            textAlign: 'right',
                                                            flexShrink: 0
                                                        }}>
                                                            {animatedInfectionCountValue} endpoint{animatedInfectionCountValue !== 1 ? 's' : ''} infecté{animatedInfectionCountValue !== 1 ? 's' : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.metricItem}>
                                                <div className={styles.metricLabel}>Base antivirale à jour</div>
                                                <MetricLetter value={upToDateMetricValue} higherIsBetter theme={theme} showValue={false} />
                                            </div>
                                                    </div>
                                    );
                                })()}
                                                    </div>

                                {/* Graphiques - Répartition par OS et Modules activés */}
                                <div className={styles.chartsContainer} style={{ marginTop: '1.5rem' }}>
                                    {(() => {
                                        const enrichedEndpoints = enrichedData?.endpoints || [];
                                        const endpoints = solution.endpoints || [];
                                        
                                        // Filtrer uniquement les endpoints gérés
                                        const managedEndpoints = endpoints.filter(ep => ep.isManaged);
                                        
                                        // Grouper par OS et compter
                                        const osDistribution = {};
                                        managedEndpoints.forEach(ep => {
                                            const os = ep.operatingSystem || 'N/A';
                                            const formattedOS = formatOSName(os);
                                            if (!osDistribution[formattedOS]) {
                                                osDistribution[formattedOS] = 0;
                                            }
                                            osDistribution[formattedOS]++;
                                        });
                                        
                                        // Convertir en tableau et trier par quantité
                                        const chartData = Object.entries(osDistribution)
                                            .map(([os, count]) => ({
                                                name: os,
                                                value: count
                                            }))
                                            .sort((a, b) => b.value - a.value);
                                        
                                        const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];
                                        
                                        return (
                                            <div className={styles.chartCard}>
                                                <h5 className={styles.chartTitle}>Répartition par OS (appareils gérés)</h5>
                                                {chartData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height={300}>
                                                        <BarChart
                                                            data={chartData}
                                                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                                        >
                                                            <XAxis 
                                                                dataKey="name" 
                                                                angle={-45}
                                                                textAnchor="end"
                                                                height={80}
                                                                stroke={theme === 'dark' ? '#d1d5db' : '#374151'}
                                                                fontSize={11}
                                                            />
                                                            <YAxis 
                                                                stroke={theme === 'dark' ? '#d1d5db' : '#374151'}
                                                                fontSize={11}
                                                                label={{ 
                                                                    value: "Nombre d'endpoints", 
                                                                    angle: -90, 
                                                                    position: 'insideLeft',
                                                                    style: { textAnchor: 'middle', fill: theme === 'dark' ? '#d1d5db' : '#374151' }
                                                                }}
                                                            />
                                                            <Tooltip 
                                                                contentStyle={{
                                                                    backgroundColor: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                                                                    border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                                                                    borderRadius: '6px',
                                                                    color: theme === 'dark' ? '#d1d5db' : '#374151'
                                                                }}
                                                                formatter={(value, name) => [`${value} endpoint${value > 1 ? 's' : ''}`, 'Endpoints']}
                                                            />
                                                            <Bar 
                                                                dataKey="value" 
                                                                radius={[4, 4, 0, 0]}
                                                            >
                                                                {chartData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div style={{
                                                        padding: '2rem',
                                                        textAlign: 'center',
                                                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {managedEndpoints.length === 0 
                                                            ? 'Aucun appareil géré disponible'
                                                            : 'N/A (non synchronisé ou aucune donnée OS disponible)'}
                                                </div>
                                            )}
                                            </div>
                                        );
                                    })()}

                                    {/* Graphique des modules activés sur les endpoints */}
                                    {(() => {
                                        const enrichedEndpoints = enrichedData?.endpoints || [];
                                        
                                        // Mapper les noms de modules en français
                                        const getModuleName = (moduleName) => {
                                            const moduleNames = {
                                                'advancedThreatControl': 'Contrôle avancé des menaces',
                                                'antimalware': 'Antimalware',
                                                'contentControl': 'Contrôle de contenu',
                                                'deviceControl': 'Contrôle des périphériques',
                                                'firewall': 'Pare-feu',
                                                'powerUser': 'Utilisateur avancé'
                                            };
                                            return moduleNames[moduleName] || moduleName;
                                        };
                                        
                                        // Compter les endpoints par module directement depuis les endpoints
                                        const moduleCounts = {};
                                        
                                        enrichedEndpoints.forEach(ep => {
                                            const modules = ep.modules || [];
                                            
                                            // Extraire les modules actifs
                                            let activeModules = [];
                                            if (Array.isArray(modules)) {
                                                activeModules = modules;
                                            } else if (modules && typeof modules === 'object') {
                                                // Si c'est un objet, extraire les clés où la valeur est true
                                                activeModules = Object.keys(modules).filter(key => modules[key] === true);
                                            }
                                            
                                            // Compter chaque module
                                            activeModules.forEach(module => {
                                                if (!moduleCounts[module]) {
                                                    moduleCounts[module] = 0;
                                                }
                                                moduleCounts[module]++;
                                            });
                                        });
                                        
                                        // Convertir en tableau et trier par quantité
                                        const chartData = Object.entries(moduleCounts)
                                            .map(([module, count]) => ({
                                                name: getModuleName(module),
                                                value: count,
                                                moduleKey: module
                                            }))
                                            .sort((a, b) => b.value - a.value);
                                        
                                        const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
                                        
                                        return (
                                            <div className={styles.chartCard}>
                                                <h5 className={styles.chartTitle}>Modules activés sur les endpoints</h5>
                                                {chartData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height={300}>
                                                        <BarChart
                                                            data={chartData}
                                                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                                        >
                                                            <XAxis 
                                                                dataKey="name" 
                                                                angle={-45}
                                                                textAnchor="end"
                                                                height={80}
                                                                stroke={theme === 'dark' ? '#d1d5db' : '#374151'}
                                                                fontSize={11}
                                                            />
                                                            <YAxis 
                                                                stroke={theme === 'dark' ? '#d1d5db' : '#374151'}
                                                                fontSize={11}
                                                                label={{ 
                                                                    value: "Nombre d'endpoints", 
                                                                    angle: -90, 
                                                                    position: 'insideLeft',
                                                                    style: { textAnchor: 'middle', fill: theme === 'dark' ? '#d1d5db' : '#374151' }
                                                                }}
                                                            />
                                                            <Tooltip 
                                                                contentStyle={{
                                                                    backgroundColor: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                                                                    border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                                                                    borderRadius: '6px',
                                                                    color: theme === 'dark' ? '#d1d5db' : '#374151'
                                                                }}
                                                                formatter={(value, name) => [`${value} endpoint${value > 1 ? 's' : ''}`, 'Endpoints']}
                                                            />
                                                            <Bar 
                                                                dataKey="value" 
                                                                radius={[4, 4, 0, 0]}
                                                            >
                                                                {chartData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div style={{
                                                        padding: '2rem',
                                                        textAlign: 'center',
                                                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {enrichedEndpoints.length === 0 
                                                            ? 'N/A (non synchronisé ou aucune donnée disponible)'
                                                            : 'Aucun module activé trouvé sur les endpoints'}
                                                </div>
                                            )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}


                            {/* Vue Politiques */}
                            {viewMode[solIndex] === 'politiques' && (
                                <div className={styles.licenseSection} style={{ position: 'relative', marginTop: '1.5rem' }}>
                                    {isSyncing && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                                                fontSize: '0.75rem',
                                            zIndex: 10,
                                            backgroundColor: theme === 'dark' ? 'rgba(30, 30, 63, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            boxShadow: theme === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
                                            border: theme === 'dark' ? '1px solid #4a4a6a' : 'none'
                                        }}>
                                            <FaSync style={{ 
                                                animation: 'spin 1s linear infinite',
                                                fontSize: '0.75rem'
                                            }} />
                                            Synchronisation...
                                                </div>
                                            )}
                                    <div style={{ opacity: isSyncing ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
                                    {/* Informations de licence */}
                                    <h4 className={styles.sectionTitle}>Informations de licence</h4>
                                    <div className={styles.licenseGrid} style={{ marginBottom: '1.5rem', padding: '0.5rem' }}>
                                        <div className={styles.licenseItem}>
                                            <label>Licences totales</label>
                                            <div className={styles.licenseValue}>{licencesTotales || "N/A"}</div>
                                            </div>
                                        <div className={styles.licenseItem}>
                                            <label>Licences utilisées</label>
                                            <div className={styles.licenseValue}>{licencesUtilisees}</div>
                                        </div>
                                        <div className={styles.licenseItem}>
                                            <label>Licences disponibles</label>
                                            <div className={styles.licenseValue}>
                                                {licencesTotales 
                                                    ? (parseInt(licencesTotales) - licencesUtilisees)
                                                    : "N/A"}
                                                </div>
                                            </div>
                                        <div className={styles.licenseItem}>
                                            <label>Expiration</label>
                                            <div className={styles.licenseValue}>{formatDate(expiration) || "N/A"}</div>
                                                </div>
                                        {lastSync && (
                                            <div className={styles.licenseItem}>
                                                <label>Dernière synchronisation</label>
                                                <div className={styles.licenseValue} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <FaSync style={{ fontSize: '0.7rem' }} />
                                                    {formatDateTime(lastSync)}
                                            </div>
                                                </div>
                                            )}
                                    </div>

                                    <h4 className={styles.sectionTitle}>Politiques de sécurité</h4>
                                    {(() => {
                                        const allPolicies = policies?.policies || [];
                                        const enrichedEndpoints = enrichedData?.endpoints || [];
                                        
                                        // Compter les endpoints par politique et identifier les politiques utilisées
                                        const policyUsage = {};
                                        const usedPolicyIds = new Set();
                                        
                                        enrichedEndpoints.forEach(ep => {
                                            if (ep.policy && ep.policy.id) {
                                                const policyId = ep.policy.id;
                                                usedPolicyIds.add(policyId);
                                                if (!policyUsage[policyId]) {
                                                    policyUsage[policyId] = {
                                                        count: 0,
                                                        applied: 0
                                                    };
                                                }
                                                policyUsage[policyId].count++;
                                                if (ep.policy.applied) {
                                                    policyUsage[policyId].applied++;
                                                }
                                            }
                                        });
                                        
                                        // Filtrer pour ne garder que les politiques utilisées
                                        const policiesList = allPolicies.filter(policy => usedPolicyIds.has(policy.id));
                                        
                                        return policiesList.length > 0 ? (
                                            <div className={styles.endpointsTableContainer}>
                                                <table className={styles.endpointsTable}>
                                                    <thead>
                                                        <tr>
                                                            <th>Nom</th>
                                                            <th>Endpoints</th>
                                                            <th>Appliquée</th>
                                                            <th>Créée le</th>
                                                            <th>Modifiée le</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {policiesList.map((policy, polIndex) => {
                                                            const usage = policyUsage[policy.id] || { count: 0, applied: 0 };
                                                            const formatDate = (dateStr) => {
                                                                if (!dateStr) return 'N/A';
                                                                try {
                                                                    const date = new Date(dateStr);
                                                                    return date.toLocaleDateString('fr-FR', { 
                                                                        year: 'numeric', 
                                                                        month: 'short', 
                                                                        day: 'numeric' 
                                                                    });
                                                                } catch {
                                                                    return dateStr;
                                                                }
                                                            };
                                                            
                                                            return (
                                                                <tr key={policy.id || polIndex}>
                                                                    <td>
                                                                        <div style={{ fontWeight: '500' }}>
                                                                            {policy.name || 'Sans nom'}
                                                                        </div>
                                                                        {policy.details?.createdBy && (
                                                                            <div style={{ 
                                                                                fontSize: '0.75rem', 
                                                                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                                                                marginTop: '0.25rem'
                                                                            }}>
                                                                                Créée par: {policy.details.createdBy}
                                        </div>
                                    )}
                                                                    </td>
                                                                    <td>
                                                                        <span style={{ 
                                                                            color: usage.count > 0 ? '#3b82f6' : '#6b7280',
                                                                            fontWeight: '500'
                                                                        }}>
                                                                            {usage.count}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <span style={{ 
                                                                padding: '0.25rem 0.5rem', 
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                            backgroundColor: usage.applied > 0 ? '#d1fae5' : '#f3f4f6',
                                                                            color: usage.applied > 0 ? '#059669' : '#6b7280',
                                                                            fontWeight: '500'
                                                            }}>
                                                                            {usage.applied} / {usage.count}
                                                            </span>
                                                                    </td>
                                                                    <td>{formatDate(policy.details?.createDate)}</td>
                                                                    <td>{formatDate(policy.details?.lastModifyDate)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                            </tbody>
                                        </table>
                                                </div>
                                        ) : (
                                            <div className={styles.noDataMessage}>
                                                <p>N/A (non synchronisé ou aucune politique configurée)</p>
                                            </div>
                                        );
                                    })()}
                                            </div>
                                </div>
                            )}

                            {/* Vue Endpoints */}
                            {viewMode[solIndex] === 'endpoints' && (
                                <div className={styles.endpointsListSection} style={{ position: 'relative', marginTop: '1.5rem' }}>
                                    {isSyncing && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                            fontSize: '0.75rem',
                                            zIndex: 10,
                                            backgroundColor: theme === 'dark' ? 'rgba(30, 30, 63, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            boxShadow: theme === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
                                            border: theme === 'dark' ? '1px solid #4a4a6a' : 'none'
                                        }}>
                                            <FaSync style={{ 
                                                animation: 'spin 1s linear infinite',
                                                fontSize: '0.75rem'
                                            }} />
                                            Synchronisation...
                                                </div>
                                            )}
                                    <div style={{ opacity: isSyncing ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
                                    {(() => {
                                        const ITEMS_PER_PAGE = 10;
                                        const currentPage = endpointsPagination[solIndex] || 1;
                                        const totalPages = Math.ceil(endpoints.length / ITEMS_PER_PAGE);
                                        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                        const endIndex = startIndex + ITEMS_PER_PAGE;
                                        const paginatedEndpoints = endpoints.slice(startIndex, endIndex);

                                        return (
                                            <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 className={styles.sectionTitle} style={{ margin: 0 }}>Liste des endpoints ({endpoints.length})</h4>
                                        {totalPages > 1 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => setEndpointsPagination(prev => ({ ...prev, [solIndex]: Math.max(1, currentPage - 1) }))}
                                                    disabled={currentPage === 1}
                                                    style={{
                                                        padding: '0.5rem 0.75rem',
                                                        border: '1px solid var(--border-secondary)',
                                                        borderRadius: '6px',
                                                        background: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                                        opacity: currentPage === 1 ? 0.5 : 1,
                                                        fontSize: '0.875rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (currentPage !== 1) {
                                                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.borderColor = 'var(--border-secondary)';
                                                    }}
                                                >
                                                    ← Précédent
                                                </button>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                                    Page {currentPage} / {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setEndpointsPagination(prev => ({ ...prev, [solIndex]: Math.min(totalPages, currentPage + 1) }))}
                                                    disabled={currentPage === totalPages}
                                                    style={{
                                                        padding: '0.5rem 0.75rem',
                                                        border: '1px solid var(--border-secondary)',
                                                        borderRadius: '6px',
                                                        background: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                                        opacity: currentPage === totalPages ? 0.5 : 1,
                                                        fontSize: '0.875rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (currentPage !== totalPages) {
                                                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.borderColor = 'var(--border-secondary)';
                                                    }}
                                                >
                                                    Suivant →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {endpoints.length > 0 ? (
                                    <div className={styles.endpointsTableContainer}>
                                        <table className={styles.endpointsTable}>
                                            <thead>
                                                <tr>
                                                    <th>Nom</th>
                                                    <th>Type</th>
                                                    <th>IP</th>
                                                    <th>OS</th>
                                                    <th>Géré</th>
                                                    <th>Dernière connexion</th>
                                                    <th>Modules</th>
                                                    <th>Politique</th>
                                                    <th>Infecté</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                    {paginatedEndpoints.map((endpoint, epIndex) => {
                                                        // Trouver les données enrichies pour cet endpoint
                                                        const enrichedEndpoint = enrichedData?.endpoints?.find(ep => ep.id === endpoint.id);
                                                        const isInfected = enrichedEndpoint?.isInfected || false;
                                                        const endpointState = enrichedEndpoint?.endpointState; // 1 - online, 2 - offline, 3 - suspended, 0 - unknown
                                                        const lastSeen = enrichedEndpoint?.lastSeen;
                                                        const modules = enrichedEndpoint?.modules || [];
                                                        const agent = enrichedEndpoint?.agent || {};
                                                        const endpointPolicy = enrichedEndpoint?.policy;
                                                        
                                                        // Trouver le nom de la politique depuis la liste des politiques
                                                        const policyName = (() => {
                                                            if (!endpointPolicy || !policies?.policies) return null;
                                                            const policy = policies.policies.find(p => p.id === endpointPolicy.id);
                                                            return policy?.name || endpointPolicy.name || null;
                                                        })();
                                                        
                                                        // Déterminer le libellé de l'état
                                                        let stateLabel = 'Inconnu';
                                                        let stateColor = '#6b7280';
                                                        let stateBgColor = '#f3f4f6';
                                                        if (endpointState === 1) {
                                                            stateLabel = 'En ligne';
                                                            stateColor = '#10b981';
                                                            stateBgColor = '#d1fae5';
                                                        } else if (endpointState === 2) {
                                                            stateLabel = 'Hors ligne';
                                                            stateColor = '#ef4444';
                                                            stateBgColor = '#fee2e2';
                                                        } else if (endpointState === 3) {
                                                            stateLabel = 'Suspendu';
                                                            stateColor = '#f59e0b';
                                                            stateBgColor = '#fef3c7';
                                                        }
                                                        
                                                        // Vérifier si déconnecté depuis plus de 24h
                                                        let isDisconnected24h = false;
                                                        let lastSeenLabel = 'N/A';
                                                        if (lastSeen) {
                                                            const lastSeenDate = new Date(lastSeen);
                                                            const now = new Date();
                                                            const diffHours = (now - lastSeenDate) / (1000 * 60 * 60);
                                                            isDisconnected24h = diffHours > 24;
                                                            lastSeenLabel = formatDateTime(lastSeen);
                                                        }
                                                        
                                                        // Vérifier l'état de la base antivirale
                                                        const isSignatureOutdated = agent.signatureOutdated || false;
                                                        const isProductOutdated = agent.productOutdated || false;
                                                        const isAntivirusUpToDate = !isSignatureOutdated && !isProductOutdated;
                                                        
                                                        // Mapper les noms de modules en français
                                                        const getModuleName = (moduleName) => {
                                                            const moduleNames = {
                                                                'advancedThreatControl': 'Contrôle avancé des menaces',
                                                                'antimalware': 'Antimalware',
                                                                'contentControl': 'Contrôle de contenu',
                                                                'deviceControl': 'Contrôle des périphériques',
                                                                'firewall': 'Pare-feu',
                                                                'powerUser': 'Utilisateur avancé'
                                                            };
                                                            return moduleNames[moduleName] || moduleName;
                                                        };
                                                        
                                                        // Fonction pour obtenir l'abréviation d'un module
                                                        const getModuleAbbreviation = (moduleName) => {
                                                            const abbreviations = {
                                                                'advancedThreatControl': 'ATC',
                                                                'antimalware': 'AM',
                                                                'contentControl': 'CC',
                                                                'deviceControl': 'DC',
                                                                'firewall': 'FW',
                                                                'powerUser': 'PU'
                                                            };
                                                            return abbreviations[moduleName] || moduleName.substring(0, 3).toUpperCase();
                                                        };
                                                        
                                                        // Extraire les modules actifs
                                                        let activeModules = [];
                                                        if (Array.isArray(modules)) {
                                                            activeModules = modules;
                                                        } else if (modules && typeof modules === 'object') {
                                                            // Si c'est un objet, extraire les clés où la valeur est true
                                                            activeModules = Object.keys(modules).filter(key => modules[key] === true);
                                                        }
                                                        
                                                        return (
                                                    <tr key={endpoint.id || epIndex}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                {getEndpointIcon(endpoint.type)}
                                                                <span>{endpoint.name || 'Sans nom'}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span style={{ 
                                                                padding: '0.25rem 0.5rem', 
                                                                borderRadius: '4px', 
                                                                fontSize: '0.75rem',
                                                                backgroundColor: endpoint.type === 'physique' ? '#e3f2fd' : '#f3e5f5',
                                                                color: endpoint.type === 'physique' ? '#1976d2' : '#7b1fa2'
                                                            }}>
                                                                {endpoint.type === 'physique' ? 'Physique' : endpoint.type === 'virtuel' ? 'Virtuel' : 'Autre'}
                                                            </span>
                                                        </td>
                                                        <td>{endpoint.ip || 'N/A'}</td>
                                                        <td>{endpoint.operatingSystem || 'N/A'}</td>
                                                        <td>
                                                            <span style={{ 
                                                                color: endpoint.isManaged ? '#10b981' : '#6b7280',
                                                                fontWeight: '500'
                                                            }}>
                                                                {endpoint.isManaged ? 'Oui' : 'Non'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {lastSeen ? (
                                                                <div style={{ fontSize: '0.75rem' }}>
                                                                    <div style={{ 
                                                                        color: isDisconnected24h ? '#ef4444' : '#10b981',
                                                                        fontWeight: '500',
                                                                        marginBottom: '0.25rem'
                                                                    }}>
                                                                        {isDisconnected24h ? '> 24h' : 'Récent'}
                                                                    </div>
                                                                    <div style={{ 
                                                                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                                                        fontSize: '0.7rem'
                                                                    }}>
                                                                        {lastSeenLabel}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: '#6b7280' }}>N/A</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {activeModules.length > 0 ? (
                                                                <div style={{ 
                                                                    display: 'flex', 
                                                                    flexWrap: 'wrap', 
                                                                    gap: '0.25rem',
                                                                    maxWidth: '120px'
                                                                }}>
                                                                    {activeModules.map((module, idx) => (
                                                                        <span 
                                                                            key={idx}
                                                                            style={{ 
                                                                                padding: '0.125rem 0.375rem',
                                                                                borderRadius: '4px',
                                                                                fontSize: '0.65rem',
                                                                                backgroundColor: theme === 'dark' ? '#1e1e3f' : '#e0e7ff',
                                                                                color: theme === 'dark' ? '#a5b4fc' : '#4338ca',
                                                                                display: 'inline-block',
                                                                                whiteSpace: 'nowrap',
                                                                                fontWeight: '600'
                                                                            }}
                                                                            title={getModuleName(module)}
                                                                        >
                                                                            {getModuleAbbreviation(module)}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>N/A</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {policyName ? (
                                                                <span style={{ 
                                                                    fontSize: '0.875rem',
                                                                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                                                                    maxWidth: '200px',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    display: 'inline-block',
                                                                    title: policyName
                                                                }}>
                                                                    {policyName}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>N/A</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span style={{ 
                                                                padding: '0.25rem 0.5rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                backgroundColor: isInfected ? '#fee2e2' : '#d1fae5',
                                                                color: isInfected ? '#dc2626' : '#059669',
                                                                fontWeight: '500'
                                                            }}>
                                                                {isInfected ? 'Oui' : 'Non'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                    ) : (
                                        <div className={styles.noDataMessage}>
                                            <p>Aucun endpoint disponible (non synchronisé)</p>
                                        </div>
                                    )}
                                    </>
                                    );
                                    })()}
                                    </div>
                                </div>
                            )}

                            </div>

                            {/* Zone de commentaire pour les solutions BitDefender */}
                            {/* Zone de commentaire - toujours visible */}
                                <textarea
                                    id={`comment-bitdefender-${solIndex}`}
                                    className={styles.commentTextarea}
                                    value={data?.bitdefenderSolutions?.[solIndex]?.comment || ""}
                                    onChange={(e) => {
                                        const currentData = dataRef.current || {};
                                        const updatedData = {
                                            ...currentData,
                                            bitdefenderSolutions: {
                                                ...(currentData.bitdefenderSolutions || {}),
                                                [solIndex]: {
                                                    ...(currentData.bitdefenderSolutions?.[solIndex] || {}),
                                                    comment: e.target.value
                                                }
                                            }
                                        };
                                        setData(updatedData);
                                        dataRef.current = updatedData;
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="Commentaire..."
                                    rows="2"
                                />
                        </div>
                    );
                })}

                {/* Carte pour l'ancien format (compatibilité) */}
                {!bitDefenderSolutions.length && staticData.logiciel && (
                <div className={styles.antivirusCard}>
                    {/* En-tête de la carte */}
                    <div className={styles.cardHeader}>
                        <div className={styles.headerLeft}>
                            <div className={`${styles.statusDot} ${styles[antivirusStatus.status]}`}>
                                {antivirusStatus.icon}
                            </div>
                            <div className={styles.antivirusInfo}>
                                <h3 className={styles.antivirusName}>
                                    {staticData.logiciel}
                                </h3>
                            </div>
                        </div>
                        <div className={styles.antivirusType}>
                            <span className={styles.typeLabel}>
                                Antivirus
                            </span>
                        </div>
                    </div>

                    {/* Sous-titre avec les informations de l'antivirus */}
                    <div className={styles.antivirusDetailsContainer}>
                        <p className={styles.antivirusDetails}>
                            {antivirusInfo.join(" • ")}
                        </p>
                    </div>

                    {/* Section des endpoints */}
                    <div className={styles.endpointSection}>
                        <h4 className={styles.endpointTitle}>Endpoints protégés</h4>
                        <div className={styles.endpointGrid}>
                            {staticData.stationsWindows > 0 && (
                                <div className={styles.endpointItem}>
                                    {getEndpointIcon('stationsWindows')}
                                    <span>Stations Windows</span>
                                    <span className={styles.endpointCount}>{staticData.stationsWindows}</span>
                                </div>
                            )}
                            {staticData.ServeursWindows > 0 && (
                                <div className={styles.endpointItem}>
                                    {getEndpointIcon('ServeursWindows')}
                                    <span>Serveurs Windows</span>
                                    <span className={styles.endpointCount}>{staticData.ServeursWindows}</span>
                                </div>
                            )}
                            {staticData.macos > 0 && (
                                <div className={styles.endpointItem}>
                                    {getEndpointIcon('macos')}
                                    <span>MacOS</span>
                                    <span className={styles.endpointCount}>{staticData.macos}</span>
                                </div>
                            )}
                            {staticData.machinesPhysiques > 0 && (
                                <div className={styles.endpointItem}>
                                    {getEndpointIcon('machinesPhysiques')}
                                    <span>Machines physiques</span>
                                    <span className={styles.endpointCount}>{staticData.machinesPhysiques}</span>
                                </div>
                            )}
                            {staticData.machinesVirtuelles > 0 && (
                                <div className={styles.endpointItem}>
                                    {getEndpointIcon('machinesVirtuelles')}
                                    <span>Machines virtuelles</span>
                                    <span className={styles.endpointCount}>{staticData.machinesVirtuelles}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section des menaces */}
                    <div className={styles.threatsSection}>
                        <h4 className={styles.threatsTitle}>Types de menaces détectées</h4>
                        
                        <div className={styles.threatsList}>
                            {(antivirus.threats || []).map((threat, i) => (
                                <div key={i} className={styles.threatItem}>
                                    <div className={styles.threatInputGroup}>
                                        <label htmlFor={`threat-type-${i}`}>Type de menace</label>
                                        <input
                                            id={`threat-type-${i}`}
                                            type="text"
                                            placeholder="Ex: Malware, Ransomware, Phishing..."
                                            value={threat.type}
                                            onChange={(e) => handleThreatChange(i, "type", e.target.value)}
                                            className={styles.threatInput}
                                        />
                                    </div>
                                    <div className={styles.threatInputGroup}>
                                        <label htmlFor={`threat-count-${i}`}>Nombre</label>
                                        <input
                                            id={`threat-count-${i}`}
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={threat.count}
                                            onChange={(e) => handleThreatChange(i, "count", e.target.value)}
                                            className={styles.threatCount}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => removeThreat(i)}
                                        className={styles.removeThreatButton}
                                        title="Supprimer cette menace"
                                        aria-label="Supprimer cette menace"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            className={styles.addThreatButton} 
                            onClick={addThreat}
                            aria-label="Ajouter une nouvelle menace"
                        >
                            ➕ Ajouter une menace
                        </button>

                        {/* Total des menaces en lecture seule */}
                        <div className={styles.totalThreatsSection}>
                            <label htmlFor="total-threats">Total menaces détectées</label>
                            <input
                                id="total-threats"
                                type="number"
                                value={totalThreats}
                                className={`${styles.threatsInput} ${styles.readOnly}`}
                                readOnly
                                aria-label="Total des menaces détectées"
                            />
                        </div>
                    </div>

                    {/* Zone de commentaire */}
                    <div className={styles.commentSection}>
                        <div className={styles.commentHeader}>
                            <label htmlFor="comment-antivirus" className={styles.commentLabel}>
                                💬 Commentaire
                            </label>
                            
                        </div>
                        <textarea
                            id="comment-antivirus"
                            value={antivirus.comment || ""}
                            onChange={(e) => handleChange("comment", e.target.value)}
                            placeholder="Commentaire sur l'antivirus..."
                            className={styles.commentInput}
                            rows="3"
                        />
                    </div>
                </div>
                )}
            </div>

            {/* Tooltip global qui suit la souris */}
            {hoveredTooltip && (
                <div style={{
                    position: 'fixed',
                    left: `${hoveredTooltip.mouseX + 10}px`,
                    top: `${hoveredTooltip.mouseY + 10}px`,
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '6px',
                    padding: '1rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                    zIndex: 999999,
                    maxWidth: '700px',
                    pointerEvents: 'none',
                    color: '#111827'
                }}>
                    <div>
                        <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '700',
                            marginBottom: '0.75rem',
                            color: '#111827'
                        }}>
                            Calcul de la note
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.75rem 1rem'
                        }}>
                            {(hoveredTooltip.scoreBreakdown || []).map((item, idx) => (
                                <div
                                    key={`score-breakdown-${idx}`}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: '0.75rem'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: '600',
                                            fontSize: '0.85rem',
                                            marginBottom: '0.25rem'
                                        }}>
                                            {item.label}
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: '#6b7280',
                                            lineHeight: 1.4
                                        }}>
                                            {item.description}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '0.85rem',
                                        color: '#111827',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {item.weight}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Antivirus;

