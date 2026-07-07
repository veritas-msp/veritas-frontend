import React, { useEffect, useState, useCallback, useRef } from "react";
import { FaSync, FaExclamationCircle, FaLink } from "react-icons/fa";
import Icon from "@mdi/react";
import { mdiNas, mdiServerNetworkOutline, mdiHarddisk, mdiVhs } from "@mdi/js";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Stockage.module.css";
import commonStyles from "./ModuleCommon.module.css";
import SmartTooltip from "../../SmartTooltip";
import API_BASE_URL from "../../../config";
import { getCheckMKReportPeriodData } from "../../../api/checkmkReportPeriod";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import CheckMKMappingModal from "../../AdminPage/MonitoringClientSkeleton/ClientSteps/CheckMKMappingModal";

// Options par défaut pour les toasts (bas à droite)
const toastOptions = { position: "bottom-right", autoClose: 3000 };

const defaultServices = ["CPU", "RAM", "STOCKAGE", "UPTIME"];

// Composant pour afficher les disques visuellement
const DiskVisual = ({ current, max, size = "small", diskStates = {}, onDiskClick, storageName }) => {
    const circles = [];
    const isSmall = size === "small";
    
    for (let i = 0; i < max; i++) {
        const isFilled = i < current;
        const diskState = diskStates[i] || 'ok';
        const stateClass = diskState === 'warn' ? styles.warn : diskState === 'crit' ? styles.crit : styles.filled;
        
        circles.push(
            <div
                key={i}
                className={`${styles.diskCircle} ${isFilled ? stateClass : styles.empty} ${isSmall ? styles.small : ''}`}
                title={`Disque ${i + 1} ${isFilled ? '(installé)' : '(vide)'}`}
                onClick={() => {
                    if (isFilled && onDiskClick) {
                        const nextState = diskState === 'ok' ? 'warn' : diskState === 'warn' ? 'crit' : 'ok';
                        onDiskClick(storageName, i, nextState);
                    }
                }}
                style={{
                    cursor: isFilled ? 'pointer' : 'default'
                }}
            />
        );
    }
    
    return (
        <div className={styles.diskVisual}>
            {circles}
        </div>
    );
};

// Composant pour la barre de progression du stockage
const StorageProgress = ({ used, total, unit = "Go" }) => {
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
    const remaining = total - used;
    
    let progressColor = "green";
    if (percentage >= 90) {
        progressColor = "red";
    } else if (percentage >= 75) {
        progressColor = "orange";
    } else if (percentage >= 50) {
        progressColor = "yellow";
    }
    
    return (
        <div className={styles.storageProgress}>
            <div className={styles.progressBar}>
                <div 
                    className={`${styles.progressFill} ${styles[progressColor]}`}
                    style={{ width: `${percentage}%` }}
                />
                <div className={styles.progressText}>
                    <span className={styles.remainingText}>
                        {remaining} {unit} disponible
                    </span>
                    <span className={styles.progressPercentage}>
                        {percentage}%
                    </span>
                </div>
            </div>
        </div>
    );
};

// Fonction pour convertir la capacité en Go
const convertCapacityToGo = (capacity) => {
    if (!capacity) return 0;
    
    const capacityStr = capacity.toString().toUpperCase();
    
    if (capacityStr.includes('TB')) {
        const value = parseFloat(capacityStr.replace('TB', ''));
        return Math.round(value * 1024);
    } else if (capacityStr.includes('GB') || capacityStr.includes('GO')) {
        const value = parseFloat(capacityStr.replace(/GB|GO/, ''));
        return Math.round(value);
    } else if (capacityStr.includes('MB')) {
        const value = parseFloat(capacityStr.replace('MB', ''));
        return Math.round(value / 1024);
    } else {
        return Math.round(parseFloat(capacityStr));
    }
};

const Stockage = ({ config, setConfig, data, setData, onSyncAllCheckMKReady }) => {
    const [checkmkMappings, setCheckmkMappings] = useState({});
    const [checkmkData, setCheckmkData] = useState({});
    const [loadingCheckMK, setLoadingCheckMK] = useState({});
    
    // Fonction helper pour obtenir le mapping CheckMK d'un stockage (par nom ou id)
    const getCheckMKMapping = useCallback((storageNameOrId) => {
        // Essayer d'abord par id (si c'est un UUID)
        if (storageNameOrId && checkmkMappings[storageNameOrId]) {
            return checkmkMappings[storageNameOrId];
        }
        // Sinon, chercher par nom dans la liste des stockages
        const allStorageList = config?.client?.equipements?.NAS || [];
        const storage = allStorageList.find(s => s.nom === storageNameOrId);
        if (storage?.id && checkmkMappings[storage.id]) {
            return checkmkMappings[storage.id];
        }
        return null;
    }, [checkmkMappings, config?.client?.equipements?.NAS]);
    const [eventsCount, setEventsCount] = useState({});
    const [eventsData, setEventsData] = useState({});
    const [availabilityData, setAvailabilityData] = useState({});
    const [hoveredTooltip, setHoveredTooltip] = useState(null);
    const [animatedScore, setAnimatedScore] = useState({});
    const [animatedAvailability, setAnimatedAvailability] = useState({});
    const [animatedServices, setAnimatedServices] = useState({});
    const [animatedEvents, setAnimatedEvents] = useState({});
    const [scoreAnimationComplete, setScoreAnimationComplete] = useState({});
    const [editingScore, setEditingScore] = useState({});
    const [editingScoreValue, setEditingScoreValue] = useState({});
    const [openComments, setOpenComments] = useState({});
    const [syncMode, setSyncMode] = useState({}); // 'stats' ou 'services' pour chaque stockage
    const [focusedInput, setFocusedInput] = useState(null);
    const [editingStorage, setEditingStorage] = useState(null); // Stockage en cours d'édition
    const [editForm, setEditForm] = useState(null); // Formulaire d'édition
    const [isSaving, setIsSaving] = useState(false); // État de sauvegarde
    const [checkmkMappingModal, setCheckmkMappingModal] = useState({ isOpen: false, storageId: null }); // Modal de mapping CheckMK
    const dataRef = useRef(data);
    const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);
    const syncAllCheckMKRef = useRef(null);
    const lastNotifiedSyncInfoRef = useRef({ hasMappings: null, isLoading: null });

    // Charger les stockages depuis la base (v_b_clients_m_stockage) au montage
    useEffect(() => {
        if (!config?.client?.id || !setConfig) return;
        const controller = new AbortController();

        const loadStockageFromDb = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/stockage`, {
                    credentials: "include",
                    signal: controller.signal
                });
                if (!res.ok) return;
                const rows = await res.json();
                const stockageList = (rows || []).map((row) => {
                    const { id: dataId, ...dataWithoutId } = row.data || {};
                    return {
                        id: row.id,
                        ...dataWithoutId,
                        nom: row.data?.nom || row.name || row.item_key || "",
                        __fromDb: true
                    };
                });

                // Séparer NAS et SAN selon le type
                const nasList = stockageList.filter(item => item.type !== 'SAN');
                const sanList = stockageList.filter(item => item.type === 'SAN');

                setConfig((prev) => {
                    if (!prev?.client) return prev;
                    return {
                        ...prev,
                        client: {
                            ...prev.client,
                            equipements: {
                                ...(prev.client.equipements || {}),
                                NAS: nasList,
                                SAN: sanList
                            }
                        }
                    };
                });
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error("Erreur chargement stockage:", err);
            }
        };

        loadStockageFromDb();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config?.client?.id]);

    // Récupérer tous les types de stockage
    const nasList = config?.client?.equipements?.NAS || [];
    const sanList = config?.client?.equipements?.SAN || [];
    
    // Combiner tous les équipements de stockage
    const allStorageList = [
        ...nasList.map(item => ({ ...item, storageType: item.type === 'Disque dur externe' ? 'DISQUE' : item.type === 'Robot de sauvegarde' ? 'RDX' : item.type || 'NAS' })),
        ...sanList.map(item => ({ ...item, storageType: 'SAN' }))
    ];

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
    }, [onSyncAllCheckMKReady]);

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
                        if ((m.equipment_type === 'NAS' || m.equipment_type === 'SAN' || m.equipment_type === 'Stockage') && m.is_active !== false && m.equipment_id) {
                            // Utiliser equipment_id comme clé principale
                            mappingsMap[m.equipment_id] = m;
                        }
                    });
                    setCheckmkMappings(mappingsMap);
                }
            } catch (error) {
                console.error('❌ [Stockage] Erreur chargement mappings Check MK:', error);
            }
        };

        loadMappings();
    }, [config?.client?.id]);

    // Récupérer le nombre d'événements pour un stockage
    const loadEventsCount = async (storageName, checkmkHostName) => {
        if (!checkmkHostName) return;

        const period = getReportPeriod();
        if (!period.start_time || !period.end_time) {
            setEventsCount(prev => ({ ...prev, [storageName]: 0 }));
            return;
        }

        try {
            const url = new URL(`${API_BASE_URL}/checkmk/events-period/${encodeURIComponent(checkmkHostName)}`);
            url.searchParams.append('start_time', period.start_time);
            url.searchParams.append('end_time', period.end_time);
            
            const mapping = getCheckMKMapping(storageName);
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

                setEventsCount(prev => ({
                    ...prev,
                    [storageName]: eventsCountValue
                }));
                
                setEventsData(prev => ({
                    ...prev,
                    [storageName]: eventsDataValue
                }));

                const currentData = dataRef.current || {};
                const updated = {
                    ...currentData,
                    [storageName]: {
                        ...(currentData[storageName] || {}),
                        eventsCount: eventsCountValue,
                        eventsData: eventsDataValue
                    }
                };
                setData(updated);
                dataRef.current = updated;
            }
        } catch (error) {
            console.error(`❌ [Événements] Erreur pour ${storageName}:`, error);
        }
    };

    // Récupérer le tableau de disponibilité d'un stockage
    const loadAvailabilityData = async (storageName, checkmkHostName) => {
        if (!checkmkHostName) return;

        try {
            const url = new URL(`${API_BASE_URL}/checkmk/availability-table/${encodeURIComponent(checkmkHostName)}`);
            
            const mapping = getCheckMKMapping(storageName);
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
                const availabilityValue = result.availability;
                setAvailabilityData(prev => ({
                    ...prev,
                    [storageName]: availabilityValue
                }));

                const currentData = dataRef.current || {};
                const updated = {
                    ...currentData,
                    [storageName]: {
                        ...(currentData[storageName] || {}),
                        availabilityData: availabilityValue
                    }
                };
                setData(updated);
                dataRef.current = updated;
            }
        } catch (error) {
            console.error(`❌ [Disponibilité] Erreur pour ${storageName}:`, error);
        }
    };

    // Récupérer les données Check MK pour un stockage
    const loadCheckMKData = async (storageName, checkmkHostName, showToast = true) => {
        if (loadingCheckMK[storageName]) return;
        
        setSyncMode(prev => ({ ...prev, [storageName]: 'stats' }));
        
        const currentDataBeforeSync = dataRef.current || {};
        const updatedBeforeSync = {
            ...currentDataBeforeSync,
            [storageName]: {
                ...(currentDataBeforeSync[storageName] || {}),
                syncMode: 'stats',
                manualHealthScore: undefined
            }
        };
        setData(updatedBeforeSync);
        dataRef.current = updatedBeforeSync;
        
        setAnimatedScore(prev => ({ ...prev, [storageName]: 0 }));
        setScoreAnimationComplete(prev => ({ ...prev, [storageName]: false }));
        
        setLoadingCheckMK(prev => ({ ...prev, [storageName]: true }));
        
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
                    [storageName]: checkmkDataValue
                }));

                const currentData = dataRef.current || {};
                const updated = {
                    ...currentData,
                    [storageName]: {
                        ...(currentData[storageName] || {}),
                        checkmkData: checkmkDataValue,
                        lastSyncDate: new Date().toISOString()
                    }
                };
                setData(updated);
                dataRef.current = updated;
                
                const period = getReportPeriod();
                const mapping = getCheckMKMapping(storageName);
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
                        setEventsCount(prev => ({ ...prev, [storageName]: ev.events_count || 0 }));
                        setEventsData(prev => ({ ...prev, [storageName]: ev.events || [] }));
                        if (av.availability) {
                            setAvailabilityData(prev => ({ ...prev, [storageName]: av.availability }));
                        } else {
                            await loadAvailabilityData(storageName, checkmkHostName);
                        }
                    } catch (e) {
                        await Promise.all([
                            loadEventsCount(storageName, checkmkHostName),
                            loadAvailabilityData(storageName, checkmkHostName)
                        ]);
                    }
                } else {
                    await Promise.all([
                        loadEventsCount(storageName, checkmkHostName),
                        loadAvailabilityData(storageName, checkmkHostName)
                    ]);
                }
            } else {
                // Ne pas afficher de notification individuelle
            }
        } catch (error) {
            console.error('Erreur synchronisation CheckMK:', error);
            // Ne pas afficher de notification individuelle
        } finally {
            setLoadingCheckMK(prev => ({ ...prev, [storageName]: false }));
            
            setTimeout(() => {
                setTimeout(() => {
                    const finalScore = getStorageHealthScore(storageName);
                    if (finalScore !== null) {
                        setAnimatedScore(prev => ({ ...prev, [storageName]: 0 }));
                        setScoreAnimationComplete(prev => ({ ...prev, [storageName]: false }));
                        const duration = 3000;
                        const steps = 120;
                        const increment = finalScore / steps;
                        let currentStep = 0;
                        
                        const scoreTimer = setInterval(() => {
                            currentStep++;
                            const newValue = Math.min(increment * currentStep, finalScore);
                            setAnimatedScore(prev => ({ ...prev, [storageName]: Math.round(newValue) }));
                            
                            if (currentStep >= steps) {
                                clearInterval(scoreTimer);
                                setAnimatedScore(prev => ({ ...prev, [storageName]: finalScore }));
                                setTimeout(() => {
                                    setScoreAnimationComplete(prev => ({ ...prev, [storageName]: true }));
                                }, 100);
                            }
                        }, duration / steps);
                    }

                    setAvailabilityData(prev => {
                        const availability = prev[storageName];
                        if (availability && availability.up !== undefined) {
                            const finalAvailability = parseFloat(availability.up || 0);
                            setAnimatedAvailability(prev => ({ ...prev, [storageName]: 0 }));
                            const duration = 2000;
                            const steps = 100;
                            const increment = finalAvailability / steps;
                            let currentStep = 0;
                            
                            const availabilityTimer = setInterval(() => {
                                currentStep++;
                                const newValue = Math.min(increment * currentStep, finalAvailability);
                                setAnimatedAvailability(prev => ({ ...prev, [storageName]: Math.round(newValue) }));
                                
                                if (currentStep >= steps) {
                                    clearInterval(availabilityTimer);
                                    setAnimatedAvailability(prev => ({ ...prev, [storageName]: finalAvailability }));
                                }
                            }, duration / steps);
                        }
                        return prev;
                    });

                    setCheckmkData(prev => {
                        const finalServices = prev[storageName]?.services?.length || 0;
                        if (finalServices > 0) {
                            setAnimatedServices(prev => ({ ...prev, [storageName]: 0 }));
                            const duration = 2000;
                            const steps = 100;
                            const increment = finalServices / steps;
                            let currentStep = 0;
                            
                            const servicesTimer = setInterval(() => {
                                currentStep++;
                                const newValue = Math.min(increment * currentStep, finalServices);
                                setAnimatedServices(prev => ({ ...prev, [storageName]: Math.round(newValue) }));
                                
                                if (currentStep >= steps) {
                                    clearInterval(servicesTimer);
                                    setAnimatedServices(prev => ({ ...prev, [storageName]: finalServices }));
                                }
                            }, duration / steps);
                        }
                        return prev;
                    });

                    setEventsCount(prev => {
                        const finalEvents = prev[storageName];
                        if (finalEvents !== undefined) {
                            setAnimatedEvents(prev => ({ ...prev, [storageName]: 0 }));
                            const duration = 2000;
                            const steps = 100;
                            const increment = finalEvents / steps;
                            let currentStep = 0;
                            
                            const eventsTimer = setInterval(() => {
                                currentStep++;
                                const newValue = Math.min(increment * currentStep, finalEvents);
                                setAnimatedEvents(prev => ({ ...prev, [storageName]: Math.round(newValue) }));
                                
                                if (currentStep >= steps) {
                                    clearInterval(eventsTimer);
                                    setAnimatedEvents(prev => ({ ...prev, [storageName]: finalEvents }));
                                }
                            }, duration / steps);
                        }
                        return prev;
                    });
                }, 100);
            }, 100);
        }
    };

    // Synchroniser tous les stockages mappés avec Check MK
    const syncAllCheckMK = useCallback(async () => {
        const allStorageList = config?.client?.equipements?.NAS || [];
        const mappedStorages = allStorageList.filter(s => s.id && checkmkMappings[s.id]);
        
        if (mappedStorages.length === 0) {
            toast.warning('Aucun stockage mappé avec Check MK', toastOptions);
            return;
        }
        
        const syncPromises = mappedStorages.map(s => 
            loadCheckMKData(s.nom, checkmkMappings[s.id].checkmk_host_name, false)
        );
        
        try {
            await Promise.all(syncPromises);
            toast.success(`Synchronisation terminée`, toastOptions);
        } catch (error) {
            toast.error(`Erreur lors de la synchronisation`, toastOptions);
        }
    }, [config?.client?.equipements?.NAS, checkmkMappings]);

    useEffect(() => {
        syncAllCheckMKRef.current = syncAllCheckMK;
    }, [syncAllCheckMK]);

    useEffect(() => {
        if (onSyncAllCheckMKReadyRef.current && syncAllCheckMKRef.current) {
            const allStorageList = config?.client?.equipements?.NAS || [];
            const hasMappings = allStorageList.some(s => s.id && checkmkMappings[s.id]);
            const isLoading = Object.values(loadingCheckMK).some(loading => loading);

            // Éviter de renvoyer la même info en boucle pour stabiliser le bouton de synchro
            if (
                lastNotifiedSyncInfoRef.current.hasMappings === hasMappings &&
                lastNotifiedSyncInfoRef.current.isLoading === isLoading
            ) {
                return;
            }

            onSyncAllCheckMKReadyRef.current({
                syncAllCheckMK: syncAllCheckMKRef.current,
                hasCheckMKMappings: hasMappings,
                isLoading
            });

            lastNotifiedSyncInfoRef.current = { hasMappings, isLoading };
        }
    }, [checkmkMappings, loadingCheckMK, config?.client?.equipements?.NAS]);

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

    // Fonction pour calculer le score de santé du stockage
    const getStorageHealthScore = (storageName) => {
        const sourceData = dataRef.current || data || {};
        const rawStorageData = sourceData?.[storageName];
        // Trouver le stockage correspondant pour obtenir son id
        const allStorageList = config?.client?.equipements?.NAS || [];
        const storage = allStorageList.find(s => s.nom === storageName);
        const isMapped = Boolean(storage?.id && checkmkMappings[storage.id]);
        const hasSyncData = Boolean(rawStorageData?.lastSyncDate);

        if (isMapped && !hasSyncData) {
            return null;
        }

        const storageData = rawStorageData || {};
        // Poids ajustés : les disques ont maintenant beaucoup plus d'impact
        const serviceAvailabilityWeight = isMapped ? 0.2 : 0.3;
        const diskWeight = isMapped ? 0.4 : 0.6; // Impact très augmenté des disques
        let totalScore = 0;
        let weightSum = 0;

        // 1. Score basé sur la table de services
        let serviceScore = 0;
        let serviceCount = 0;
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
                serviceScore += (okRatio * 100) + (warnRatio * 50) + critScore;
                serviceCount++;
            }
        });

        if (serviceCount > 0) {
            serviceScore = serviceScore / serviceCount;
            totalScore += serviceScore * serviceAvailabilityWeight;
            weightSum += serviceAvailabilityWeight;
        }

        // 2. Score basé sur les événements (uniquement pour les périphériques mappés)
        if (isMapped) {
            const eventCount = eventsCount[storageName] || 0;
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
            
            totalScore += eventScore * 0.15;
            weightSum += 0.15;
        }

        // 3. Score basé sur la disponibilité (uniquement pour les périphériques mappés)
        if (isMapped && availabilityData[storageName]) {
            const availabilityValue = parseFloat(availabilityData[storageName].up || 0);
            let availabilityScore = availabilityValue;
            if (availabilityValue < 80) {
                availabilityScore = Math.min(availabilityValue, 50);
            } else if (availabilityValue < 95) {
                availabilityScore = Math.min(availabilityValue, 70);
            }
            
            totalScore += availabilityScore * 0.2;
            weightSum += 0.2;
        }

        // 4. Score basé sur l'état des disques (IMPACT TRÈS AUGMENTÉ)
        const diskStates = storageData?.diskStates || {};
        let diskScore = 100;
        let diskCount = 0;
        Object.keys(diskStates).forEach(diskIndex => {
            const state = diskStates[diskIndex];
            diskCount++;
            if (state === 'crit') {
                diskScore -= 25; // Augmenté de 20 à 25
            } else if (state === 'warn') {
                diskScore -= 15; // Augmenté de 10 à 15
            }
        });
        if (diskCount > 0) {
            diskScore = Math.max(0, diskScore);
            totalScore += diskScore * diskWeight; // Poids augmenté de 0.25 à 0.4 (mappé) ou 0.6 (non mappé)
            weightSum += diskWeight;
        }

        // 5. Score basé sur l'espace disque disponible
        const usedSpace = parseInt(storageData?.espaceUtiliseGo) || 0;
        const totalSpace = convertCapacityToGo(allStorageList.find(s => s.nom === storageName)?.capacite);
        if (totalSpace > 0) {
            const spacePercentage = (usedSpace / totalSpace) * 100;
            let spaceScore = 100;
            if (spacePercentage >= 90) {
                spaceScore = 30;
            } else if (spacePercentage >= 75) {
                spaceScore = 60;
            } else if (spacePercentage >= 50) {
                spaceScore = 80;
            }
            const spaceWeight = isMapped ? 0.05 : 0.1;
            totalScore += spaceScore * spaceWeight;
            weightSum += spaceWeight;
        }

        if (weightSum === 0) {
            return null;
        }

        return Math.round(totalScore / weightSum);
    };

    const updateValue = (storageName, service, level, value) => {
        const updated = {
            ...data,
            [storageName]: {
                ...(data[storageName] || {}),
                [service]: {
                    ...(data[storageName]?.[service] || {}),
                    [level]: value
                }
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    // Fonction pour mettre à jour l'espace utilisé
    const updateUsedSpace = (storageName, usedSpaceValue) => {
        const updated = {
            ...data,
            [storageName]: {
                ...(data[storageName] || {}),
                espaceUtiliseGo: usedSpaceValue
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    const updateComment = (storageName, comment) => {
        const updated = {
            ...data,
            [storageName]: {
                ...(data[storageName] || {}),
                comment
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    const toggleCommentVisibility = (storageName) => {
        setOpenComments((prev) => {
            const nextIsOpen = !prev[storageName];
            const nextState = {
                ...prev,
                [storageName]: nextIsOpen,
            };

            // Persister aussi dans les données du rapport pour garder l'état en changeant d'onglet
            const currentData = dataRef.current || data || {};
            const updated = {
                ...currentData,
                [storageName]: {
                    ...(currentData[storageName] || {}),
                    isCommentOpen: nextIsOpen,
                },
            };
            setData(updated);
            dataRef.current = updated;

            return nextState;
        });
    };

    const updateDiskState = (storageName, diskIndex, state) => {
        const updated = {
            ...data,
            [storageName]: {
                ...(data[storageName] || {}),
                diskStates: {
                    ...(data[storageName]?.diskStates || {}),
                    [diskIndex]: state
                }
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    const getTotal = (storageName, service) => {
        const storageData = data?.[storageName]?.[service] || {};
        const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
        const ok = storageData.ok !== undefined ? parse(storageData.ok, 100) : 100;
        const warn = storageData.warn !== undefined ? parse(storageData.warn, 0) : 0;
        const crit = storageData.crit !== undefined ? parse(storageData.crit, 0) : 0;
        return ok + warn + crit;
    };

    const hasInvalidLines = (storageName) => {
        return defaultServices.some(service => getTotal(storageName, service) !== 100);
    };

    const hasWarningOrCritical = (storageName) => {
        const storageData = data?.[storageName];
        if (!storageData) return false;

        return defaultServices.some(service => {
            const serviceData = storageData[service] || {};
            const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
            const warn = serviceData.warn !== undefined ? parse(serviceData.warn, 0) : 0;
            const crit = serviceData.crit !== undefined ? parse(serviceData.crit, 0) : 0;
            return warn > 0 || crit > 0;
        });
    };

    // Fonctions pour gérer l'édition manuelle de la note
    const startEditScore = (storageName, currentScore) => {
        setEditingScore(prev => ({ ...prev, [storageName]: true }));
        setEditingScoreValue(prev => ({ ...prev, [storageName]: currentScore || '' }));
    };

    const applyManualScore = useCallback((storageName, scoreValue) => {
        const currentData = dataRef.current || data || {};
        const updated = {
            ...currentData,
            [storageName]: {
                ...(currentData[storageName] || {}),
                manualHealthScore: scoreValue
            }
        };
        setData(updated);
        dataRef.current = updated;
        setEditingScore(prev => ({
            ...prev,
            [storageName]: false
        }));
        setEditingScoreValue(prev => {
            if (prev?.[storageName] === undefined) return prev;
            const newValue = { ...prev };
            delete newValue[storageName];
            return newValue;
        });
    }, [data, setData]);

    const saveEditScore = (storageName) => {
        const manualScore = editingScoreValue[storageName];
        if (manualScore !== undefined && manualScore !== null && manualScore !== '') {
            const scoreValue = Math.max(0, Math.min(100, parseInt(manualScore, 10) || 0));
            applyManualScore(storageName, scoreValue);
        } else {
            setEditingScore(prev => ({ ...prev, [storageName]: false }));
            setEditingScoreValue(prev => {
                const newValue = { ...prev };
                delete newValue[storageName];
                return newValue;
            });
        }
    };

    const cancelEditScore = (storageName) => {
        setEditingScore(prev => ({ ...prev, [storageName]: false }));
        setEditingScoreValue(prev => {
            const newValue = { ...prev };
            delete newValue[storageName];
            return newValue;
        });
    };

    const handleManualLetterSelect = (storageName, letter) => {
        const scoreValue = letterToScore(letter);
        if (scoreValue === null) return;
        applyManualScore(storageName, scoreValue);
    };

    const handleInputFocus = (e, service, type) => {
        e.target.select();
        setFocusedInput({ service, type });
    };
    
    const handleInputBlur = () => {
        setFocusedInput(null);
    };

    // Fonction pour sauvegarder un stockage
    const saveStorage = async (storageId, storageData) => {
        const clientId = config?.client?.id;
        if (!clientId) {
            throw new Error("ID client manquant");
        }

        const { id, __fromDb, __index, ...dataForDb } = storageData;

        const body = {
            item_key: storageData.nom || `storage-${storageId}`,
            name: storageData.nom || `Stockage`,
            data: dataForDb,
            is_active: true
        };

        const method = storageId ? "PUT" : "POST";
        const url = storageId
            ? `${API_BASE_URL}/clients/modules/${clientId}/nas/${storageId}`
            : `${API_BASE_URL}/clients/modules/${clientId}/nas`;

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

    // Gestion des LUNs
    const addLUN = () => {
        setEditForm(prev => ({
            ...prev,
            luns: [...(prev.luns || []), { nom: '', iqn: '', capacite: '', role: 'stockage' }]
        }));
    };

    const updateLUN = (lunIndex, field, value) => {
        setEditForm(prev => ({
            ...prev,
            luns: (prev.luns || []).map((lun, idx) => 
                idx === lunIndex ? { ...lun, [field]: value } : lun
            )
        }));
    };

    const removeLUN = (lunIndex) => {
        setEditForm(prev => ({
            ...prev,
            luns: (prev.luns || []).filter((_, idx) => idx !== lunIndex)
        }));
    };

    // Gestion des cassettes RDX pour robots de sauvegarde
    const addCassetteRDX = () => {
        setEditForm(prev => ({
            ...prev,
            cassettesRDX: [...(prev.cassettesRDX || []), { numero: '', capacite: '' }]
        }));
    };

    const updateCassetteRDX = (cassetteIndex, field, value) => {
        setEditForm(prev => ({
            ...prev,
            cassettesRDX: (prev.cassettesRDX || []).map((cassette, idx) => 
                idx === cassetteIndex ? { ...cassette, [field]: value } : cassette
            )
        }));
    };

    const removeCassetteRDX = (cassetteIndex) => {
        setEditForm(prev => ({
            ...prev,
            cassettesRDX: (prev.cassettesRDX || []).filter((_, idx) => idx !== cassetteIndex)
        }));
    };

    // Fonction pour gérer la sauvegarde après édition
    const handleSaveStorage = async () => {
        if (!editingStorage || !editForm) return;

        setIsSaving(true);
        try {
            const updatedStorage = {
                ...editingStorage,
                nom: editForm.nom,
                ip: editForm.ip || '',
                type: editForm.type || 'NAS',
                site: editForm.site || '',
                role: editForm.role || '',
                capacite: editForm.capacite || '',
                nbDisquesActuels: editForm.nbDisquesActuels || 0,
                nbDisquesMax: editForm.nbDisquesMax || 0,
                marque: editForm.marque || '',
                modele: editForm.modele || '',
                numeroSerie: editForm.numeroSerie || '',
                numeroDisque: editForm.numeroDisque || '',
                expirationGarantie: editForm.expirationGarantie || '',
                raid: editForm.raid || '',
                luns: editForm.luns || [],
                cassettesRDX: editForm.cassettesRDX || [],
                vlan: editForm.vlan || '',
                checkmk_site: editForm.checkmk_site || null,
                checkmk_host_name: editForm.checkmk_host_name || null
            };

            const oldName = editingStorage.nom;
            const newName = editForm.nom;

            const savedRow = await saveStorage(editingStorage.id, updatedStorage);

            setConfig((prev) => {
                if (!prev?.client?.equipements) return prev;

                const updatedNAS = (prev.client.equipements.NAS || []).map((s) => {
                    if (s.id === editingStorage.id) {
                        const { id: dataId, ...dataWithoutId } = savedRow.data || {};
                        return {
                            id: savedRow.id,
                            ...dataWithoutId,
                            nom: savedRow.data?.nom || savedRow.name || savedRow.item_key || "",
                            __fromDb: true
                        };
                    }
                    return s;
                });

                const updatedSAN = (prev.client.equipements.SAN || []).map((s) => {
                    if (s.id === editingStorage.id) {
                        const { id: dataId, ...dataWithoutId } = savedRow.data || {};
                        return {
                            id: savedRow.id,
                            ...dataWithoutId,
                            nom: savedRow.data?.nom || savedRow.name || savedRow.item_key || "",
                            __fromDb: true
                        };
                    }
                    return s;
                });

                return {
                    ...prev,
                    client: {
                        ...prev.client,
                        equipements: {
                            ...prev.client.equipements,
                            NAS: updatedNAS,
                            SAN: updatedSAN
                        }
                    }
                };
            });

            if (oldName !== newName && checkmkMappings[oldName]) {
                setCheckmkMappings((prev) => {
                    const updated = { ...prev };
                    updated[newName] = {
                        ...updated[oldName],
                        equipment_name: newName
                    };
                    delete updated[oldName];
                    return updated;
                });
            }

            if (config?.client?.id) {
                try {
                    const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${config.client.id}`, {
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        const mappings = await response.json();
                        const mappingsMap = {};
                        mappings.forEach(m => {
                            if ((m.equipment_type === 'NAS' || m.equipment_type === 'SAN') && m.is_active !== false) {
                                mappingsMap[m.equipment_name] = m;
                            }
                        });
                        setCheckmkMappings(mappingsMap);
                    }
                } catch (error) {
                    console.error('❌ [Stockage] Erreur rechargement mappings Check MK:', error);
                }
            }

            toast.success("Stockage mis à jour", toastOptions);
            setEditingStorage(null);
            setEditForm(null);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde:", error);
            toast.error("Erreur lors de la sauvegarde", toastOptions);
        } finally {
            setIsSaving(false);
        }
    };

    // Fonction pour obtenir les informations du stockage à afficher en sous-titre
    const getStorageInfo = (storage) => {
        const info = [];
        let warrantyInfo = null;

        // Pour les disques durs externes (HDD), afficher uniquement : Rôle • Capacité • Rotation
        if (storage.type === 'Disque dur externe' || storage.storageType === 'DISQUE') {
            if (storage.role) {
                info.push(storage.role);
            }
            if (storage.capacite) {
                info.push(storage.capacite);
            }
            if (storage.numeroDisque) {
                info.push(`Rotation: ${storage.numeroDisque}`);
            }
            return { info, warrantyInfo };
        }

        // Pour les robots de sauvegarde (RDX), afficher : Rôle • Marque Modèle • Capacité • Cassettes • IP • VLAN
        if (storage.type === 'Robot de sauvegarde' || storage.storageType === 'RDX') {
            if (storage.role) {
                info.push(storage.role);
            }
            
            const leftParts = [];
            if (storage.marque && storage.modele) {
                leftParts.push(`${storage.marque} ${storage.modele}`);
            } else if (storage.marque) {
                leftParts.push(`${storage.marque} N/A`);
            } else if (storage.modele) {
                leftParts.push(`N/A ${storage.modele}`);
            }
            if (leftParts.length > 0) {
                info.push(leftParts.join(" • "));
            }
            
            if (storage.capacite) {
                info.push(storage.capacite);
            }
            
            // Cassettes RDX
            if (Array.isArray(storage.cassettesRDX) && storage.cassettesRDX.length > 0) {
                info.push(`${storage.cassettesRDX.length} cassette${storage.cassettesRDX.length > 1 ? 's' : ''}`);
            }
            
            if (storage.ip) {
                info.push(storage.ip);
            }
            
            if (storage.vlan) {
                info.push(`VLAN ${storage.vlan}`);
            }

            // Garantie pour robots
            if (storage.expirationGarantie) {
                const expirationDate = new Date(storage.expirationGarantie);
                const today = new Date();
                const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

                warrantyInfo = {
                    date: expirationDate.toLocaleDateString('fr-FR'),
                    expired: daysUntilExpiration < 0,
                    daysLeft: daysUntilExpiration >= 0 ? daysUntilExpiration : null,
                };
            }
            
            return { info, warrantyInfo };
        }

        // Pour les autres types (NAS, SAN) : MARQUE MODELE SN - IP - VLAN - etc.
        // Partie gauche : MARQUE MODELE SN
        const leftParts = [];
        if (storage.marque && storage.modele) {
            leftParts.push(`${storage.marque} ${storage.modele}`);
        } else if (storage.marque) {
            leftParts.push(`${storage.marque} N/A`);
        } else if (storage.modele) {
            leftParts.push(`N/A ${storage.modele}`);
        }
        if (storage.numeroSerie) {
            leftParts.push(`S/N: ${storage.numeroSerie}`);
        }
        if (leftParts.length > 0) {
            info.push(leftParts.join(" • "));
        }

        // IP
        if (storage.ip) {
            info.push(storage.ip);
        }

        // RAID
        if (storage.raid) {
            info.push(storage.raid);
        }

        // LUNs
        if (Array.isArray(storage.luns) && storage.luns.length > 0) {
            info.push(`${storage.luns.length} LUN${storage.luns.length > 1 ? 's' : ''}`);
        }

        // VLAN
        if (storage.vlan) {
            info.push(`VLAN ${storage.vlan}`);
        }

        // Informations de garantie
        if (storage.expirationGarantie) {
            const expirationDate = new Date(storage.expirationGarantie);
            const today = new Date();
            const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

            warrantyInfo = {
                date: expirationDate.toLocaleDateString('fr-FR'),
                expired: daysUntilExpiration < 0,
                daysLeft: daysUntilExpiration >= 0 ? daysUntilExpiration : null,
            };
        }

        return { info, warrantyInfo };
    };

    const getStorageTypeIcon = (storageType) => {
        const iconSize = 1.2;
        const iconStyle = { color: '#000000' };
        
        switch (storageType) {
            case 'SAN':
                return <Icon path={mdiServerNetworkOutline} size={iconSize} style={iconStyle} />;
            case 'DISQUE':
                return <Icon path={mdiHarddisk} size={iconSize} style={iconStyle} />;
            case 'RDX':
                return <Icon path={mdiVhs} size={iconSize} style={iconStyle} />;
            default:
                return <Icon path={mdiNas} size={iconSize} style={iconStyle} />;
        }
    };

    if (!allStorageList || allStorageList.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <p>Aucun stockage configuré pour ce client.</p>
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <strong>🔍 Debug - Équipements en base :</strong>
                        <pre style={{ marginTop: '0.5rem', overflow: 'auto', maxHeight: '300px' }}>
                            {JSON.stringify({
                                clientId: config?.client?.id,
                                clientName: config?.client?.name,
                                equipementsNAS: config?.client?.equipements?.NAS || [],
                                equipementsSAN: config?.client?.equipements?.SAN || [],
                                nombreNAS: config?.client?.equipements?.NAS?.length || 0,
                                nombreSAN: config?.client?.equipements?.SAN?.length || 0,
                                modules_monitoring_Stockage: config?.client?.modules_monitoring?.Stockage,
                                tousEquipements: config?.client?.equipements
                            }, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        );
    }

    // Grouper tous les équipements de stockage par site
    const groupedBySite = allStorageList.reduce((acc, storage) => {
        const siteName = storage.site || "Sans site";
        if (!acc[siteName]) {
            acc[siteName] = [];
        }
        acc[siteName].push(storage);
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
                const siteStorages = groupedBySite[siteName];
                const nasCount = siteStorages.filter(s => s.storageType === "NAS").length;
                const sanCount = siteStorages.filter(s => s.storageType === "SAN").length;
                const disqueCount = siteStorages.filter(s => s.storageType === "DISQUE").length;
                const rdxCount = siteStorages.filter(s => s.storageType === "RDX").length;
                
                const countParts = [];
                if (nasCount > 0) countParts.push(`${nasCount} NAS`);
                if (sanCount > 0) countParts.push(`${sanCount} SAN`);
                if (disqueCount > 0) countParts.push(`${disqueCount} Disque${disqueCount > 1 ? 's' : ''}`);
                if (rdxCount > 0) countParts.push(`${rdxCount} RDX`);

                const sortedStorages = siteStorages.sort((a, b) => {
                    const typeOrder = { 'SAN': 1, 'NAS': 2, 'DISQUE': 3, 'RDX': 4 };
                    const orderA = typeOrder[a.storageType] || 99;
                    const orderB = typeOrder[b.storageType] || 99;
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.nom || '').localeCompare(b.nom || '');
                });

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
                                {countParts.length > 0 && (
                                    <span className={styles.siteCount}>
                                        {countParts.map((part, idx) => (
                                            <React.Fragment key={idx}>
                                                <span>{part}</span>
                                                {idx < countParts.length - 1 && <span className={styles.separator}> • </span>}
                                            </React.Fragment>
                                        ))}
                                    </span>
                                )}
                            </h2>
                        </div>
                        <div className={styles.storageGrid}>
                            {sortedStorages.map((storage, i) => {
                                const storageType = storage.storageType || 'NAS';
                                const currentDisks = parseInt(storage.nbDisquesActuels) || 0;
                                const maxDisks = parseInt(storage.nbDisquesMax) || 0;
                                const usedSpace = parseInt(data?.[storage.nom]?.espaceUtiliseGo) || 0;
                                const totalSpace = convertCapacityToGo(storage.capacite);
                                const isRDX = storageType === 'RDX';
                                const isDisque = storageType === 'DISQUE';
                                const needsSyncAttention = Boolean(
                                    storage.id && checkmkMappings[storage.id] &&
                                    !data?.[storage.nom]?.lastSyncDate &&
                                    !loadingCheckMK[storage.nom]
                                );

                                return (
                                    <React.Fragment key={i}>
                                    <div className={`${styles.storageCard} ${styles.withComment} ${styles.storageCardFlex} ${isDisque ? styles.storageCardCompact : ''}`}>
                                        <div className={styles.cardHeader}>
                                            <div className={styles.headerLeft}>
                                                <div className={styles.storageInfo}>
                                                    <h3 className={styles.storageName}>
                                                        <span className={styles.storageNameSection}>
                                                            <span className={styles.iconWrapper}>
                                                                {getStorageTypeIcon(storageType)}
                                                            </span>
                                                            <span className={styles.storageNameText}>
                                                                {storage.nom || 'Sans nom'}
                                                            </span>
                                                        </span>
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className={styles.storageType}>
                                                <div className={styles.buttonGroup}>
                                                    {storage.id && checkmkMappings[storage.id] && (
                                                        <button
                                                            type="button"
                                                            className={`${styles.syncButton} ${needsSyncAttention ? styles.syncButtonAttention : ''}`}
                                                            onClick={() => {
                                                                if (!loadingCheckMK[storage.nom]) {
                                                                    loadCheckMKData(storage.nom, checkmkMappings[storage.id].checkmk_host_name);
                                                                }
                                                            }}
                                                            title={`Mappé vers Check MK: ${checkmkMappings[storage.id].checkmk_host_name}. Cliquer pour synchroniser.`}
                                                            disabled={loadingCheckMK[storage.nom]}
                                                        >
                                                            <IconifyIcon
                                                                icon="material-symbols:sync"
                                                                width={14}
                                                                height={14}
                                                                className={loadingCheckMK[storage.nom] ? styles.loadingIcon : ''}
                                                            />
                                                        </button>
                                                    )}
                                                    <div className={styles.flexAuto}>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className={commonStyles.editButton}
                                                        onClick={() => {
                                                            setEditingStorage(storage);
                                                            setEditForm({
                                                                nom: storage.nom || '',
                                                                ip: storage.ip || '',
                                                                type: storage.type || 'NAS',
                                                                site: storage.site || '',
                                                                role: storage.role || '',
                                                                capacite: storage.capacite || '',
                                                                nbDisquesActuels: storage.nbDisquesActuels || 0,
                                                                nbDisquesMax: storage.nbDisquesMax || 0,
                                                                marque: storage.marque || '',
                                                                modele: storage.modele || '',
                                                                numeroSerie: storage.numeroSerie || '',
                                                                numeroDisque: storage.numeroDisque || '',
                                                                expirationGarantie: storage.expirationGarantie || '',
                                                                raid: storage.raid || '',
                                                                luns: Array.isArray(storage.luns) ? storage.luns : [],
                                                                cassettesRDX: Array.isArray(storage.cassettesRDX) ? storage.cassettesRDX : [],
                                                                vlan: storage.vlan || '',
                                                                checkmk_site: storage.checkmk_site || null,
                                                                checkmk_host_name: storage.checkmk_host_name || ''
                                                            });
                                                        }}
                                                        title="Éditer le stockage"
                                                    >
                                                        <IconifyIcon
                                                            icon="material-symbols:edit"
                                                            width={14}
                                                            height={14}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        {(() => {
                                            const { info: storageInfo, warrantyInfo } = getStorageInfo(storage);
                                            return (storageInfo.length > 0 || warrantyInfo) && (
                                                <div className={`${commonStyles.moduleMeta} ${styles.storageMetaFlex}`}>
                                                    <span className={styles.flexOne}>
                                                        {storageInfo.join(" • ")}
                                                    </span>
                                                    {warrantyInfo && (
                                                        <div className={styles.licenseInfoRow}>
                                                            <span className={styles.iconTextRow}>
                                                                <IconifyIcon
                                                                    icon="streamline-flex:warranty-badge-highlight-solid"
                                                                    width={12}
                                                                    height={12}
                                                                    className={styles.iconGray}
                                                                />
                                                                {warrantyInfo.date}
                                                            </span>
                                                    </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Contenu de la carte - Masqué pour les HDD */}
                                        {!isDisque && (
                                        <div className={styles.storageScrollable}>
                                            <div className={styles.storageCardContent}>
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
                                                {loadingCheckMK[storage.nom] ? (
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
                                                <div className={styles.statsWrapper}>
                                                    {/* Cartes statistiques - Vue Stats (Dashboard) */}
                                                    {(syncMode[storage.nom] === 'stats' || !syncMode[storage.nom]) && (
                                                        <>
                                                            {/* Carte: Santé de l'espace de stockage */}
                                                            {!isDisque && !isRDX && (() => {
                                                                const mapping = storage.id ? getCheckMKMapping(storage.id) : null;
                                                                const isMapped = Boolean(mapping);
                                                                const hasSyncData = Boolean(data?.[storage.nom]?.lastSyncDate);
                                                                const shouldShowNA = isMapped && !hasSyncData;
                                                                const calculatedScore = shouldShowNA ? null : getStorageHealthScore(storage.nom);
                                                                const manualScore = data?.[storage.nom]?.manualHealthScore;
                                                                const healthScore = shouldShowNA ? null : (manualScore !== undefined ? manualScore : calculatedScore);
                                                                const isLoading = false;
                                                                const isAnimating = animatedScore[storage.nom] !== undefined && !scoreAnimationComplete[storage.nom];
                                                                const isEditing = editingScore[storage.nom];

                                                                const scoreBreakdown = isMapped
                                                                    ? [
                                                                        { label: "État des disques", description: "Santé des disques physiques (OK/WARN/CRIT)", weight: "40 pts" },
                                                                        { label: "Disponibilité", description: "Temps UP du stockage", weight: "20 pts" },
                                                                        { label: "Disponibilité des services", description: "OK/WARN/CRIT pour chaque service monitoré", weight: "20 pts" },
                                                                        { label: "Événements", description: "Alertes remontées par CheckMK", weight: "15 pts" },
                                                                        { label: "Espace disque disponible", description: "Taux d'utilisation de la capacité déclarée", weight: "5 pts" }
                                                                    ]
                                                                    : [
                                                                        { label: "État des disques", description: "État renseigné (OK/WARN/CRIT) pour chaque disque", weight: "60 pts" },
                                                                        { label: "Disponibilité des services", description: "Répartition manuelle OK/WARN/CRIT", weight: "30 pts" },
                                                                        { label: "Espace disque disponible", description: "Taux d'utilisation de la capacité déclarée", weight: "10 pts" }
                                                                    ];

                                                                const placeholderScore = 95;
                                                                let displayScore = null;
                                                                if (!isLoading) {
                                                                    if (shouldShowNA) {
                                                                        displayScore = placeholderScore;
                                                                    } else {
                                                                        displayScore = isAnimating ? animatedScore[storage.nom] : healthScore;
                                                                    }
                                                                }

                                                                const displayLetter = displayScore !== null ? scoreToLetter(displayScore) : null;
                                                                const scoreLetter = healthScore !== null ? scoreToLetter(healthScore) : null;
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
                                                                                if (hoveredTooltip?.type === 'score' && hoveredTooltip.storageName === storage.nom) {
                                                                                    setHoveredTooltip(null);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <div className={`${styles.scoreCardLeft} ${isLoading ? styles.statCardDisabled : ''}`}>
                                                                                {!isLoading && (
                                                                                    <div className={styles.scoreDisplayWrapper}>
                                                                                        <div className={styles.scoreInputWrapper}>
                                                                                            {isEditing ? (
                                                                                                <input
                                                                                                    type="number"
                                                                                                    min="0"
                                                                                                    max="100"
                                                                                                    value={editingScoreValue[storage.nom] !== undefined ? editingScoreValue[storage.nom] : displayScore}
                                                                                                    onChange={(e) => setEditingScoreValue(prev => ({ ...prev, [storage.nom]: e.target.value }))}
                                                                                                    onBlur={() => saveEditScore(storage.nom)}
                                                                                                    onKeyDown={(e) => {
                                                                                                        if (e.key === 'Enter') {
                                                                                                            saveEditScore(storage.nom);
                                                                                                        } else if (e.key === 'Escape') {
                                                                                                            cancelEditScore(storage.nom);
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
                                                                                                            startEditScore(storage.nom, displayScore);
                                                                                                        }
                                                                                                    }}
                                                                                                    title={displayScore !== null ? "Cliquer pour sélectionner une note, double-cliquer pour éditer précisément" : ""}
                                                                                                    className={`${displayScore !== null ? styles.scoreLetterWrapper : styles.scoreLetterWrapperDisabled} ${shouldShowNA ? styles.scoreLetterWrapperGrayscale : ''}`}
                                                                                                >
                                                                                                    <LetterScale 
                                                                                                        activeLetter={displayLetter} 
                                                                                                        letters={["F", "E", "D", "C", "B", "A"]}
                                                                                                        size="normal"
                                                                                                        onSelect={!isLoading ? (letter) => handleManualLetterSelect(storage.nom, letter) : undefined}
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

                                                                            {/* Ligne : Services, Événements et Disponibilité */}
                                                                            <div className={styles.statsGrid}>
                                                                                {/* Carte: Nombre de services monitorés */}
                                                                                <div 
                                                                                    className={`${styles.statCard} ${loadingCheckMK[storage.nom] ? styles.statCardDisabled : (checkmkData[storage.nom] ? styles.statCardEnabled : styles.statCardDefault)}`}
                                                                                    onMouseEnter={(e) => {
                                                                                        const mapping = storage.id ? getCheckMKMapping(storage.id) : null;
                                                                                        if (mapping && checkmkData[storage.nom]) {
                                                                                            setHoveredTooltip({
                                                                                                type: 'services',
                                                                                                storageName: storage.nom,
                                                                                                mouseX: e.clientX,
                                                                                                mouseY: e.clientY
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    onMouseMove={(e) => {
                                                                                        const mapping = storage.id ? getCheckMKMapping(storage.id) : null;
                                                                                        if (mapping && checkmkData[storage.nom] && hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.storageName === storage.nom) {
                                                                                            setHoveredTooltip({
                                                                                                type: 'services',
                                                                                                storageName: storage.nom,
                                                                                                mouseX: e.clientX,
                                                                                                mouseY: e.clientY
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    onMouseLeave={() => {
                                                                                        if (hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.storageName === storage.nom) {
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
                                                                                    {!(storage.id && getCheckMKMapping(storage.id)) ? (
                                                                                        <div className={styles.statCardNotMapped}>
                                                                                            <div className={styles.statValueNotMapped}>N/A</div>
                                                                                            <div className={styles.statLabelNotMapped}>Non mappé</div>
                                                                                        </div>
                                                                                    ) : loadingCheckMK[storage.nom] ? (
                                                                                        <div className={styles.loadingRow}>
                                                                                            <FaSync className={styles.loadingIconSmall} />
                                                                                            Chargement...
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className={`${styles.statValue} ${checkmkData[storage.nom] ? styles.statValuePrimary : styles.statValueSecondary}`}>
                                                                                            {checkmkData[storage.nom] 
                                                                                                ? (animatedServices[storage.nom] !== undefined ? animatedServices[storage.nom] : (checkmkData[storage.nom]?.services?.length || 0))
                                                                                                : 'N/A'}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                
                                                                                {/* Carte: Nombre d'événements */}
                                                                                <div 
                                                                                    className={`${styles.statCard} ${loadingCheckMK[storage.nom] ? styles.statCardDisabled : (eventsCount[storage.nom] !== undefined ? styles.statCardEnabled : styles.statCardDefault)}`}
                                                                                    onMouseEnter={(e) => {
                                                                                        const mapping = storage.id ? getCheckMKMapping(storage.id) : null;
                                                                                        if (mapping && eventsData[storage.nom] && eventsData[storage.nom].length > 0) {
                                                                                            setHoveredTooltip({
                                                                                                type: 'events',
                                                                                                storageName: storage.nom,
                                                                                                mouseX: e.clientX,
                                                                                                mouseY: e.clientY
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    onMouseMove={(e) => {
                                                                                        const mapping = storage.id ? getCheckMKMapping(storage.id) : null;
                                                                                        if (mapping && eventsData[storage.nom] && eventsData[storage.nom].length > 0 && hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.storageName === storage.nom) {
                                                                                            setHoveredTooltip({
                                                                                                type: 'events',
                                                                                                storageName: storage.nom,
                                                                                                mouseX: e.clientX,
                                                                                                mouseY: e.clientY
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    onMouseLeave={() => {
                                                                                        if (hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.storageName === storage.nom) {
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
                                                                                    {!(storage.id && getCheckMKMapping(storage.id)) ? (
                                                                                        <div className={styles.statCardNotMapped}>
                                                                                            <div className={styles.statValueNotMapped}>N/A</div>
                                                                                            <div className={styles.statLabelNotMapped}>Non mappé</div>
                                                                                        </div>
                                                                                    ) : loadingCheckMK[storage.nom] ? (
                                                                                        <div className={styles.loadingRow}>
                                                                                            <FaSync className={styles.loadingIconSmall} />
                                                                                            Chargement...
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className={`${styles.statValue} ${eventsCount[storage.nom] !== undefined ? (eventsCount[storage.nom] > 0 ? styles.statValueEventsWarning : styles.statValueEventsNormal) : styles.statValueSecondary}`}>
                                                                                            {eventsCount[storage.nom] !== undefined 
                                                                                                ? (animatedEvents[storage.nom] !== undefined ? animatedEvents[storage.nom] : eventsCount[storage.nom])
                                                                                                : 'N/A'}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                
                                                                                {/* Carte: Disponibilité */}
                                                                                <div 
                                                                                    className={`${styles.statCard} ${loadingCheckMK[storage.nom] ? styles.statCardDisabled : (availabilityData[storage.nom] ? styles.statCardEnabled : styles.statCardDefault)}`}
                                                                                    onMouseEnter={(e) => {
                                                                                        const mapping = storage.id ? getCheckMKMapping(storage.id) : null;
                                                                                        if (mapping && availabilityData[storage.nom]) {
                                                                                            setHoveredTooltip({
                                                                                                type: 'availability',
                                                                                                storageName: storage.nom,
                                                                                                mouseX: e.clientX,
                                                                                                mouseY: e.clientY
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    onMouseMove={(e) => {
                                                                                        const mapping = storage.id ? getCheckMKMapping(storage.id) : null;
                                                                                        if (mapping && availabilityData[storage.nom] && hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.storageName === storage.nom) {
                                                                                            setHoveredTooltip({
                                                                                                type: 'availability',
                                                                                                storageName: storage.nom,
                                                                                                mouseX: e.clientX,
                                                                                                mouseY: e.clientY
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    onMouseLeave={() => {
                                                                                        if (hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.storageName === storage.nom) {
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
                                                                                    {!(storage.id && getCheckMKMapping(storage.id)) ? (
                                                                                        <div className={styles.statCardNotMapped}>
                                                                                            <div className={styles.statValueNotMapped}>N/A</div>
                                                                                            <div className={styles.statLabelNotMapped}>Non mappé</div>
                                                                                        </div>
                                                                                    ) : loadingCheckMK[storage.nom] ? (
                                                                                        <div className={styles.loadingRow}>
                                                                                            <FaSync className={styles.loadingIconSmall} />
                                                                                            Chargement...
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div 
                                                                                            className={styles.statValueAvailability}
                                                                                            style={{ 
                                                                                                color: availabilityData[storage.nom] && availabilityData[storage.nom].up !== undefined
                                                                                                    ? (() => {
                                                                                                        const displayValue = animatedAvailability[storage.nom] !== undefined 
                                                                                                            ? animatedAvailability[storage.nom] 
                                                                                                            : parseFloat(availabilityData[storage.nom].up || 0);
                                                                                                        return getProgressiveColor(displayValue);
                                                                                                    })()
                                                                                                    : 'var(--text-secondary)'
                                                                                            }}
                                                                                        >
                                                                                            {availabilityData[storage.nom] && availabilityData[storage.nom].up !== undefined 
                                                                                                ? `${animatedAvailability[storage.nom] !== undefined 
                                                                                                    ? animatedAvailability[storage.nom] 
                                                                                                    : Math.round(parseFloat(availabilityData[storage.nom].up || 0))}%`
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

                                                            {/* Liseret d'espace de stockage sur le dashboard */}
                                                            {!isDisque && !isRDX && totalSpace > 0 && (
                                                                <div style={{
                                                                    width: '100%',
                                                                    maxWidth: '700px',
                                                                    marginTop: '0rem'
                                                                }}>
                                                                    <div style={{
                                                                        width: '100%',
                                                                                height: '6px',
                                                                                backgroundColor: '#e5e7eb',
                                                                                borderRadius: '3px',
                                                                                overflow: 'hidden',
                                                                                position: 'relative'
                                                                            }}>
                                                                                <div
                                                                                    style={{
                                                                                        height: '100%',
                                                                                        width: `${totalSpace > 0 ? Math.round((usedSpace / totalSpace) * 100) : 0}%`,
                                                                                        backgroundColor: (() => {
                                                                                            const percentage = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
                                                                                            if (percentage >= 90) return '#ef4444';
                                                                                            if (percentage >= 75) return '#f59e0b';
                                                                                            if (percentage >= 50) return '#eab308';
                                                                                            return '#10b981';
                                                                                        })(),
                                                                                        transition: 'width 0.3s ease',
                                                                                        borderRadius: '3px'
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                </div>
                                                            )}

                                                        </>
                                                    )}

                                                    {/* Cassettes RDX pour robots de sauvegarde - Affichage permanent */}
                                                    {isRDX && (
                                                        <div style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '0.5rem',
                                                            padding: '0.75rem',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%'
                                                        }}>
                                                            <label style={{
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                color: '#374151',
                                                                marginBottom: '0.25rem',
                                                                display: 'block',
                                                                textAlign: 'center'
                                                            }}>
                                                                Cassettes RDX ({(storage.cassettesRDX || []).length})
                                                            </label>
                                                            {(!storage.cassettesRDX || storage.cassettesRDX.length === 0) ? (
                                                                <p style={{
                                                                    margin: '0.25rem 0',
                                                                                fontSize: '0.7rem',
                                                                    color: '#6b7280',
                                                                    fontStyle: 'italic',
                                                                    textAlign: 'center'
                                                                }}>
                                                                    Aucune cassette configurée
                                                                </p>
                                                            ) : (
                                                                <div style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(7, 1fr)',
                                                                    gap: '0.35rem',
                                                                    width: '100%',
                                                                    maxWidth: '800px'
                                                                }}>
                                                                    {storage.cassettesRDX.map((cassette, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            style={{
                                                                                padding: '0.35rem 0.25rem',
                                                                                background: '#ffffff',
                                                                                border: '1px solid #d1d5db',
                                                                                borderRadius: '4px',
                                                                                textAlign: 'center'
                                                                            }}
                                                                        >
                                                                            <div style={{
                                                                                fontSize: '0.65rem',
                                                                                fontWeight: 600,
                                                                                color: '#374151',
                                                                                marginBottom: '0.15rem'
                                                                            }}>
                                                                                #{cassette.numero || idx + 1}
                                                                        </div>
                                                                            {cassette.capacite && (
                                                                                <div style={{
                                                                                    fontSize: '0.6rem',
                                                                                    color: '#6b7280'
                                                                                }}>
                                                                                    {cassette.capacite} GB
                                                                    </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Onglet Stockage - Disques et espace de stockage */}
                                                    {!isRDX && !isDisque && syncMode[storage.nom] === 'storage' && (
                                                        <div style={{
                                                            display: 'flex',
                                                            flexDirection: 'row',
                                                            gap: '1.5rem',
                                                            padding: '0.75rem',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            minHeight: '140px',
                                                            height: '140px',
                                                            width: '100%'
                                                        }}>
                                                            {/* Section Disques - Gauche */}
                                                            {maxDisks > 0 && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '0.75rem',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '230px',
                                                                    minWidth: '230px',
                                                                    maxWidth: '230px',
                                                                    background: 'rgba(107, 114, 128, 0.04)',
                                                                    padding: '1rem',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid rgba(107, 114, 128, 0.08)',
                                                                    height: '100px',
                                                                    boxSizing: 'border-box'
                                                                }}>
                                                                    <label style={{
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 600,
                                                                        color: '#374151',
                                                                        marginBottom: '0'
                                                                    }}>
                                                                        Disques ({currentDisks}/{maxDisks})
                                                                    </label>
                                                                    <div style={{
                                                                        width: '100%',
                                                                        display: 'flex',
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center'
                                                                    }}>
                                                                    <DiskVisual 
                                                                        current={currentDisks} 
                                                                        max={maxDisks} 
                                                                        size="small"
                                                                        diskStates={data?.[storage.nom]?.diskStates || {}}
                                                                        onDiskClick={updateDiskState}
                                                                        storageName={storage.nom}
                                                                    />
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Section Espace de stockage - Droite */}
                                                            {totalSpace > 0 && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '0.5rem',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '230px',
                                                                    minWidth: '230px',
                                                                    maxWidth: '230px',
                                                                    background: 'rgba(107, 114, 128, 0.04)',
                                                                    padding: '1rem',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid rgba(107, 114, 128, 0.08)',
                                                                    height: '100px',
                                                                    boxSizing: 'border-box'
                                                                }}>
                                                                    <label style={{
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 600,
                                                                        color: '#374151',
                                                                        marginBottom: '0',
                                                                        whiteSpace: 'nowrap'
                                                                    }}>
                                                                        Espace de stockage
                                                                    </label>
                                                                    <div style={{
                                                                        fontSize: '1.1rem',
                                                                        fontWeight: 700,
                                                                        color: '#374151',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.35rem',
                                                                        whiteSpace: 'nowrap',
                                                                        flexWrap: 'nowrap'
                                                                        }}>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                max={totalSpace}
                                                                                value={usedSpace || ''}
                                                                            className={styles.noSpinner}
                                                                                onChange={(e) => {
                                                                                    const value = parseInt(e.target.value) || 0;
                                                                                    if (value >= 0 && value <= totalSpace) {
                                                                                        updateUsedSpace(storage.nom, value);
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    const value = parseInt(e.target.value) || 0;
                                                                                    if (value < 0) {
                                                                                        updateUsedSpace(storage.nom, 0);
                                                                                    } else if (value > totalSpace) {
                                                                                        updateUsedSpace(storage.nom, totalSpace);
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    width: '80px',
                                                                                padding: '4px 6px',
                                                                                border: '2px solid #d1d5db',
                                                                                    borderRadius: '6px',
                                                                                fontSize: '1.1rem',
                                                                                    textAlign: 'center',
                                                                                fontWeight: 700,
                                                                                color: '#374151',
                                                                                background: '#ffffff',
                                                                                transition: 'all 0.2s ease',
                                                                                flexShrink: 0
                                                                            }}
                                                                            onFocus={(e) => {
                                                                                e.target.style.border = '2px solid #3b82f6';
                                                                                e.target.style.background = '#eff6ff';
                                                                            }}
                                                                            onBlurCapture={(e) => {
                                                                                e.target.style.border = '2px solid #d1d5db';
                                                                                e.target.style.background = '#ffffff';
                                                                                }}
                                                                                placeholder="0"
                                                                            />
                                                                        <span style={{ color: '#9ca3af', fontSize: '1rem', flexShrink: 0 }}>/</span>
                                                                        <span style={{ flexShrink: 0 }}>{totalSpace} Go</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Tableau des métriques - Uniquement en mode Stats avancée */}
                                                    {!isRDX && !isDisque && syncMode[storage.nom] === 'services' && (
                                                        <div className={styles.metricsTable}>
                                                            {hasInvalidLines(storage.nom) && (
                                                                <div className={styles.metricsTableWarningIcon}>
                                                                    <IconifyIcon
                                                                        icon="material-symbols:warning"
                                                                        width={20}
                                                                        height={20}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className={styles.metricsGrid}>
                                                                {defaultServices.map((service) => {
                                                                    const storageData = data?.[storage.nom]?.[service] || {};
                                                                    const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
                                                                    const ok = storageData.ok !== undefined ? parse(storageData.ok, 100) : 100;
                                                                    const warn = storageData.warn !== undefined ? parse(storageData.warn, 0) : 0;
                                                                    const crit = storageData.crit !== undefined ? parse(storageData.crit, 0) : 0;
                                                                    
                                                                    const getServiceIcon = (serviceName) => {
                                                                        switch(serviceName) {
                                                                            case 'CPU':
                                                                                return 'lucide:cpu';
                                                                            case 'STOCKAGE':
                                                                                return 'ph:hard-drive';
                                                                            case 'RAM':
                                                                                return 'fa-solid:memory';
                                                                            case 'UPTIME':
                                                                                return 'mdi:tool-time';
                                                                            default:
                                                                                return null;
                                                                        }
                                                                    };
                                                                    
                                                                    const serviceIcon = getServiceIcon(service);
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
                                                                                    onChange={(e) => updateValue(storage.nom, service, "ok", e.target.value)}
                                                                                    className={`${commonStyles.metricInput} ${ok !== 0 ? commonStyles.okInput : ''} ${isOkFocused ? styles.metricInputFocusedOk : ''}`}
                                                                                    aria-label={`OK pour ${service}`}
                                                                                    onFocus={(e) => handleInputFocus(e, service, 'ok')}
                                                                                    onBlur={handleInputBlur}
                                                                                />
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    value={warn}
                                                                                    onChange={(e) => updateValue(storage.nom, service, "warn", e.target.value)}
                                                                                    className={`${commonStyles.metricInput} ${warn !== 0 ? commonStyles.warnInput : ''} ${isWarnFocused ? styles.metricInputFocusedWarn : ''}`}
                                                                                    aria-label={`WARN pour ${service}`}
                                                                                    onFocus={(e) => handleInputFocus(e, service, 'warn')}
                                                                                    onBlur={handleInputBlur}
                                                                                />
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    value={crit}
                                                                                    onChange={(e) => updateValue(storage.nom, service, "crit", e.target.value)}
                                                                                    className={`${commonStyles.metricInput} ${crit !== 0 ? commonStyles.critInput : ''} ${isCritFocused ? styles.metricInputFocusedCrit : ''}`}
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
                                                )}
                                                </div>
                                            </div>
                                        </div>
                                        )}

                                        {/* Footer avec onglets - Masqué pour les HDD et RDX */}
                                        {!isDisque && !isRDX && (
                                        <div className={styles.storageCardFooter}>
                                            <div className={styles.footerButtonsContainer}>
                                                {/* Onglets pour basculer entre les vues : Dashboard, Stats avancée, Stockage */}
                                                <div className={styles.viewTabsContainer}>
                                                    {hasWarningOrCritical(storage.nom) && (
                                                        <FaExclamationCircle className={styles.problemIcon} />
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (!loadingCheckMK[storage.nom]) {
                                                                const newMode = 'stats';
                                                                setSyncMode(prev => ({ ...prev, [storage.nom]: newMode }));
                                                                const currentData = dataRef.current || {};
                                                                const updated = {
                                                                    ...currentData,
                                                                    [storage.nom]: {
                                                                        ...(currentData[storage.nom] || {}),
                                                                        syncMode: newMode
                                                                    }
                                                                };
                                                                setData(updated);
                                                                dataRef.current = updated;
                                                            }
                                                        }}
                                                        disabled={loadingCheckMK[storage.nom]}
                                                        className={`${styles.viewTabButton} ${(syncMode[storage.nom] === 'stats' || !syncMode[storage.nom]) ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}
                                                        title="Dashboard"
                                                    >
                                                        <IconifyIcon
                                                            icon="material-symbols:dashboard-rounded"
                                                            width={16}
                                                            height={16}
                                                        />
                                                    </button>
                                                    {!isDisque && (
                                                        <button
                                                            onClick={() => {
                                                                if (!loadingCheckMK[storage.nom]) {
                                                                    const newMode = 'storage';
                                                                    setSyncMode(prev => ({ ...prev, [storage.nom]: newMode }));
                                                                    const currentData = dataRef.current || {};
                                                                    const updated = {
                                                                        ...currentData,
                                                                        [storage.nom]: {
                                                                            ...(currentData[storage.nom] || {}),
                                                                            syncMode: newMode
                                                                        }
                                                                    };
                                                                    setData(updated);
                                                                    dataRef.current = updated;
                                                                }
                                                            }}
                                                            disabled={loadingCheckMK[storage.nom]}
                                                            className={`${styles.viewTabButton} ${syncMode[storage.nom] === 'storage' ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}
                                                            title={isRDX ? "Cassettes" : "Stockage"}
                                                        >
                                                            <IconifyIcon
                                                                icon={isRDX ? "mdi:vhs" : "ph:hard-drive"}
                                                                width={16}
                                                                height={16}
                                                            />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (!loadingCheckMK[storage.nom]) {
                                                                const newMode = 'services';
                                                                setSyncMode(prev => ({ ...prev, [storage.nom]: newMode }));
                                                                const currentData = dataRef.current || {};
                                                                const updated = {
                                                                    ...currentData,
                                                                    [storage.nom]: {
                                                                        ...(currentData[storage.nom] || {}),
                                                                        syncMode: newMode
                                                                    }
                                                                };
                                                                setData(updated);
                                                                dataRef.current = updated;
                                                            }
                                                        }}
                                                        disabled={loadingCheckMK[storage.nom]}
                                                        className={`${styles.viewTabButton} ${syncMode[storage.nom] === 'services' ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}
                                                        title="Stats avancées"
                                                    >
                                                        <IconifyIcon
                                                            icon="material-symbols:query-stats-rounded"
                                                            width={16}
                                                            height={16}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        )}

                                        {/* Zone de commentaire - toujours visible */}
                                            <div className={styles.storageCardFooter} style={{ paddingTop: '0.5rem' }}>
                                                <textarea
                                                    id={`comment-${storage.nom}`}
                                                    className={styles.commentTextarea}
                                                    value={data?.[storage.nom]?.comment || ""}
                                                    onChange={(e) => updateComment(storage.nom, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    placeholder="Commentaire..."
                                                    rows="2"
                                                />
                                            </div>
                                    </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Modal d'édition pour un stockage */}
            {editingStorage && editForm && (
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
                            Éditer le stockage
                        </h3>
                        <button
                            type="button"
                            className={styles.editModalCloseButton}
                            onClick={() => {
                                setEditingStorage(null);
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
                                {/* Ligne 1 : Nom + Rôle */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Nom du stockage *
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
                                            placeholder="Ex: NAS-01"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Rôle *
                                        <select
                                            className={styles.editModalSelect}
                                            value={editForm.role || ""}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    role: e.target.value
                                                }))
                                            }
                                        >
                                            <option value="">Sélectionner un rôle</option>
                                            <option value="Stockage de sauvegarde">Stockage de sauvegarde</option>
                                            <option value="Stockage de fichiers communs">Stockage de fichiers communs</option>
                                            <option value="Stockage principal">Stockage principal</option>
                                            <option value="Stockage d'archivage">Stockage d'archivage</option>
                                            <option value="Stockage de réplication">Stockage de réplication</option>
                                            <option value="Autre">Autre</option>
                                        </select>
                                    </label>
                                </div>

                                {/* Ligne 2 : Type + Site */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Type
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.type}
                                            disabled
                                            style={{ 
                                                backgroundColor: '#f3f4f6',
                                                cursor: 'not-allowed',
                                                color: '#6b7280'
                                            }}
                                        />
                                    </label>
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
                                </div>

                                {/* Ligne 2.5 : IP + VLAN (pour NAS, SAN, Robot) */}
                                {(editForm.type === 'NAS' || editForm.type === 'SAN' || editForm.type === 'Robot de sauvegarde') && (
                                    <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                            Adresse IP
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                                value={editForm.ip || ''}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                        ip: e.target.value
                                                }))
                                            }
                                                placeholder="Ex: 192.168.1.100"
                                            />
                                        </label>
                                        <label className={styles.editModalLabel}>
                                            VLAN
                                            <input
                                                type="text"
                                                className={styles.editModalInput}
                                                value={editForm.vlan || ''}
                                                onChange={(e) =>
                                                    setEditForm((prev) => ({
                                                        ...prev,
                                                        vlan: e.target.value
                                                    }))
                                                }
                                                placeholder="Ex: 10"
                                        />
                                    </label>
                                </div>
                                )}

                                {/* Ligne 3 : Capacité + Disques (pour NAS et SAN uniquement) */}
                                {(editForm.type === 'NAS' || editForm.type === 'SAN') && (
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Capacité
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.capacite}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    capacite: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 4 TB"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Disques actuels
                                        <input
                                            type="number"
                                            className={styles.editModalInput}
                                            value={editForm.nbDisquesActuels}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    nbDisquesActuels: parseInt(e.target.value) || 0
                                                }))
                                            }
                                            placeholder="Ex: 4"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Disques max
                                        <input
                                            type="number"
                                            className={styles.editModalInput}
                                            value={editForm.nbDisquesMax}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    nbDisquesMax: parseInt(e.target.value) || 0
                                                }))
                                            }
                                            placeholder="Ex: 8"
                                        />
                                    </label>
                                </div>
                                )}

                                {/* Ligne 3b : Capacité simple (pour Robot de sauvegarde) */}
                                {editForm.type === 'Robot de sauvegarde' && (
                                    <div className={styles.editModalFormRow}>
                                        <label className={styles.editModalLabel}>
                                            Capacité totale
                                            <input
                                                type="text"
                                                className={styles.editModalInput}
                                                value={editForm.capacite}
                                                onChange={(e) =>
                                                    setEditForm((prev) => ({
                                                        ...prev,
                                                        capacite: e.target.value
                                                    }))
                                                }
                                                placeholder="Ex: 2 TB"
                                            />
                                        </label>
                                    </div>
                                )}

                                {/* Ligne 4 : Configuration RAID */}
                                {(editForm.type === 'NAS' || editForm.type === 'SAN') && (
                                    <div className={styles.editModalFormRow}>
                                        <label className={styles.editModalLabel}>
                                            Configuration RAID
                                            <input
                                                type="text"
                                                className={styles.editModalInput}
                                                value={editForm.raid || ''}
                                                onChange={(e) =>
                                                    setEditForm((prev) => ({
                                                        ...prev,
                                                        raid: e.target.value
                                                    }))
                                                }
                                                placeholder="Ex: RAID 5, RAID 6"
                                            />
                                        </label>
                                    </div>
                                )}

                                {/* Ligne 5 : Marque + Modèle + Numéro de série */}
                                {(editForm.type === 'NAS' || editForm.type === 'SAN' || editForm.type === 'Robot de sauvegarde') && (
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Marque
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.marque}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    marque: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: Synology, QNAP"
                                        />
                                    </label>
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
                                            placeholder="Ex: DS920+"
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
                                            placeholder="Ex: ABC123DEF456"
                                        />
                                    </label>
                                </div>
                                )}

                                {/* Gestion des LUNs pour NAS / SAN */}
                                {(editForm.type === 'NAS' || editForm.type === 'SAN') && (
                                    <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: '#374151'
                                        }}>
                                            LUNs
                                        </label>
                                        {(!editForm.luns || editForm.luns.length === 0) && (
                                            <p style={{
                                                margin: '0.5rem 0',
                                                fontSize: '0.8rem',
                                                color: '#6b7280',
                                                fontStyle: 'italic'
                                            }}>
                                                Aucun LUN configuré
                                            </p>
                                        )}
                                        {(editForm.luns || []).map((lun, lunIndex) => (
                                            <div
                                                key={lunIndex}
                                                style={{
                                                    display: 'flex',
                                                    gap: '10px',
                                                    alignItems: 'stretch',
                                                    padding: '8px 12px',
                                                    background: '#f9fafb',
                                                    borderRadius: '6px',
                                                    marginBottom: '8px',
                                                    border: '1px solid #e5e7eb'
                                                }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', flex: '1.6', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Nom</label>
                                                    <input
                                                        type="text"
                                                        className={styles.editModalInput}
                                                        value={lun.iqn || ''}
                                                        onChange={(e) => updateLUN(lunIndex, 'iqn', e.target.value)}
                                                        placeholder="Ex: LUN0"
                                                        style={{ margin: 0 }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', flex: '1', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Capacité (GB)</label>
                                                    <input
                                                        type="number"
                                                        className={styles.editModalInput}
                                                        value={lun.capacite || ''}
                                                        onChange={(e) => updateLUN(lunIndex, 'capacite', e.target.value)}
                                                        placeholder="Ex: 500"
                                                        style={{ margin: 0 }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '160px', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Rôle</label>
                                                    <select
                                                        className={styles.editModalSelect}
                                                        value={lun.role || 'stockage'}
                                                        onChange={(e) => updateLUN(lunIndex, 'role', e.target.value)}
                                                        style={{ margin: 0 }}
                                                    >
                                                        <option value="stockage">Stockage</option>
                                                        <option value="exploitation">Exploitation</option>
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeLUN(lunIndex)}
                                                    title="Supprimer ce LUN"
                                                    style={{
                                                        minWidth: '32px',
                                                        alignSelf: 'center',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        padding: '0.5rem',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'background 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <IconifyIcon icon="mdi:delete" width={20} height={20} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addLUN}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0.5rem',
                                                background: 'transparent',
                                                border: '1px dashed #e5e7eb',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                color: '#6b7280',
                                                transition: 'all 0.2s ease',
                                                fontSize: '1.25rem',
                                                fontWeight: '600',
                                                width: '100%'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#13BA8E';
                                                e.currentTarget.style.color = '#13BA8E';
                                                e.currentTarget.style.background = '#f0fdfa';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                e.currentTarget.style.color = '#6b7280';
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                            title="Ajouter un LUN"
                                        >
                                            <IconifyIcon icon="mdi:plus" width={20} height={20} />
                                        </button>
                                    </div>
                                )}

                                {/* Gestion des cassettes RDX pour robots de sauvegarde */}
                                {editForm.type === 'Robot de sauvegarde' && (
                                    <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: '#374151'
                                        }}>
                                            Jeu de cassettes RDX
                                        </label>
                                        {(!editForm.cassettesRDX || editForm.cassettesRDX.length === 0) && (
                                            <p style={{
                                                margin: '0.5rem 0',
                                                fontSize: '0.8rem',
                                                color: '#6b7280',
                                                fontStyle: 'italic'
                                            }}>
                                                Aucune cassette configurée
                                            </p>
                                        )}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                            gap: '10px'
                                        }}>
                                            {(editForm.cassettesRDX || []).map((cassette, cassetteIndex) => (
                                                <div
                                                    key={cassetteIndex}
                                                    style={{
                                                        display: 'flex',
                                                        gap: '10px',
                                                        alignItems: 'stretch',
                                                        padding: '8px 12px',
                                                        background: '#f9fafb',
                                                        borderRadius: '6px',
                                                        border: '1px solid #e5e7eb'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', flex: '1', gap: '4px' }}>
                                                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>N° cassette</label>
                                                        <input
                                                            type="text"
                                                            className={styles.editModalInput}
                                                            value={cassette.numero || ''}
                                                            onChange={(e) => updateCassetteRDX(cassetteIndex, 'numero', e.target.value)}
                                                            placeholder="Ex: 1"
                                                            style={{ margin: 0 }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', flex: '1', gap: '4px' }}>
                                                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Capacité (GB)</label>
                                                        <input
                                                            type="number"
                                                            className={styles.editModalInput}
                                                            value={cassette.capacite || ''}
                                                            onChange={(e) => updateCassetteRDX(cassetteIndex, 'capacite', e.target.value)}
                                                            placeholder="Ex: 500"
                                                            style={{ margin: 0 }}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCassetteRDX(cassetteIndex)}
                                                        title="Supprimer cette cassette"
                                                        style={{
                                                            minWidth: '32px',
                                                            alignSelf: 'center',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#ef4444',
                                                            cursor: 'pointer',
                                                            padding: '0.5rem',
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'background 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <IconifyIcon icon="mdi:delete" width={20} height={20} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addCassetteRDX}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0.5rem',
                                                background: 'transparent',
                                                border: '1px dashed #e5e7eb',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                color: '#6b7280',
                                                transition: 'all 0.2s ease',
                                                fontSize: '1.25rem',
                                                fontWeight: '600',
                                                width: '100%',
                                                marginTop: '10px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#13BA8E';
                                                e.currentTarget.style.color = '#13BA8E';
                                                e.currentTarget.style.background = '#f0fdfa';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                e.currentTarget.style.color = '#6b7280';
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                            title="Ajouter une cassette RDX"
                                        >
                                            <IconifyIcon icon="mdi:plus" width={20} height={20} />
                                        </button>
                                    </div>
                                )}

                                {/* Disque dur externe : N° de disque + Capacité */}
                                {editForm.type === 'Disque dur externe' && (
                                    <div className={styles.editModalFormRow}>
                                        <label className={styles.editModalLabel}>
                                            Capacité totale
                                            <input
                                                type="text"
                                                className={styles.editModalInput}
                                                value={editForm.capacite}
                                                onChange={(e) =>
                                                    setEditForm((prev) => ({
                                                        ...prev,
                                                        capacite: e.target.value
                                                    }))
                                                }
                                                placeholder="Ex: 1 TB"
                                            />
                                        </label>
                                        <label className={styles.editModalLabel}>
                                            N° de disque (rotation)
                                            <input
                                                type="text"
                                                className={styles.editModalInput}
                                                value={editForm.numeroDisque || ''}
                                                onChange={(e) =>
                                                    setEditForm((prev) => ({
                                                        ...prev,
                                                        numeroDisque: e.target.value
                                                    }))
                                                }
                                                placeholder="Ex: 1"
                                            />
                                        </label>
                                    </div>
                                )}

                                {/* Ligne 6 : Expiration garantie */}
                                {(editForm.type === 'NAS' || editForm.type === 'SAN' || editForm.type === 'Robot de sauvegarde') && (
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
                                )}

                                {/* CheckMK Mapping (pour NAS, SAN, Robot) */}
                                {(editForm.type === 'NAS' || editForm.type === 'SAN' || editForm.type === 'Robot de sauvegarde') && (
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel} style={{ flex: '1 1 100%' }}>
                                        Mapping CheckMK
                                        <button
                                            type="button"
                                            className={`${styles.editModalCheckMKButton} ${(editingStorage.id && getCheckMKMapping(editingStorage.id)) ? styles.mapped : ''}`}
                                            onClick={() => {
                                                setCheckmkMappingModal({ isOpen: true, storageId: editingStorage.id });
                                            }}
                                            title={(() => {
                                                const mapping = editingStorage.id ? getCheckMKMapping(editingStorage.id) : null;
                                                return mapping ? `Mappé: ${mapping.checkmk_host_name}` : "Mapper avec CheckMK";
                                            })()}
                                        >
                                            <FaLink width={16} height={16} />
                                            {(() => {
                                                const mapping = editingStorage.id ? getCheckMKMapping(editingStorage.id) : null;
                                                return mapping ? `Mappé: ${mapping.checkmk_host_name}` : "Mapper avec CheckMK";
                                            })()}
                                        </button>
                                    </label>
                                </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!isSaving && (
                        <div className={styles.editModalFooter}>
                            <button
                                type="button"
                                className={styles.editModalSaveButton}
                                onClick={handleSaveStorage}
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
            {checkmkMappingModal.isOpen && checkmkMappingModal.storageId !== null && editingStorage && (
                <CheckMKMappingModal
                    isOpen={checkmkMappingModal.isOpen}
                    onClose={() => setCheckmkMappingModal({ isOpen: false, storageId: null })}
                    equipmentName={editingStorage.nom}
                    equipmentType={editingStorage.storageType === 'SAN' ? 'SAN' : 'NAS'}
                    equipmentId={editingStorage.id}
                    equipmentIndex={editingStorage.id}
                    clientId={config?.client?.id}
                    requireService={false}
                    onMappingSaved={(mapping) => {
                        if (mapping) {
                            setCheckmkMappings(prev => ({
                                ...prev,
                                [editingStorage.nom]: mapping
                            }));
                            setEditForm((prev) => ({
                                ...prev,
                                checkmk_site: mapping.checkmk_site || null,
                                checkmk_host_name: mapping.checkmk_host_name || ''
                            }));
                            toast.success("Mapping mis à jour", toastOptions);
                        } else {
                            setCheckmkMappings(prev => {
                                const newMappings = { ...prev };
                                delete newMappings[editingStorage.nom];
                                return newMappings;
                            });
                            setEditForm((prev) => ({
                                ...prev,
                                checkmk_site: null,
                                checkmk_host_name: ''
                            }));
                            toast.success("Mapping supprimé", toastOptions);
                        }
                    }}
                />
            )}

            {/* Tooltip global qui suit la souris */}
            {hoveredTooltip && (
                <div style={{
                    position: 'fixed',
                    left: `${hoveredTooltip.mouseX + 10}px`,
                    top: `${hoveredTooltip.mouseY + 10}px`,
                    background: hoveredTooltip.type === 'score' ? '#ffffff' : 'var(--bg-primary)',
                    border: hoveredTooltip.type === 'score' ? '1px solid rgba(0,0,0,0.08)' : '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: hoveredTooltip.type === 'score' ? '1rem' : '0.75rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                    zIndex: 10000,
                    pointerEvents: 'none',
                    maxWidth: '300px'
                }}>
                    {hoveredTooltip.type === 'score' && hoveredTooltip.scoreBreakdown && (
                        <div>
                            <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                Détail du score
                            </div>
                            {hoveredTooltip.scoreBreakdown.map((item, idx) => (
                                <div key={idx} style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                                    <div style={{ fontWeight: '600' }}>{item.label} ({item.weight})</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                                        {item.description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {hoveredTooltip.type === 'services' && checkmkData[hoveredTooltip.storageName] && (
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
                                    const services = checkmkData[hoveredTooltip.storageName].serviceInfo?.services || 
                                                   checkmkData[hoveredTooltip.storageName].services || 
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
                                    
                                    const checkmkHostName = checkmkData[hoveredTooltip.storageName]?.checkmk_host_name;
                                    
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
                    {hoveredTooltip.type === 'events' && eventsData[hoveredTooltip.storageName] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                Événements et notifications
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                {eventsCount[hoveredTooltip.storageName] || 0} événement(s) sur la période.
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                                maxHeight: '220px',
                                overflowY: 'auto',
                                width: '100%'
                            }}>
                            {eventsData[hoveredTooltip.storageName].slice(0, 5).map((event, idx) => (
                                    <div 
                                        key={idx} 
                                        style={{ 
                                            fontSize: '0.72rem', 
                                            color: 'var(--text-primary)',
                                            padding: '0.2rem 0.4rem',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                    {event.text || event}
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                    {hoveredTooltip.type === 'availability' && availabilityData[hoveredTooltip.storageName] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                Disponibilité
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                Temps UP / DOWN / UNREACH sur la période.
                            </div>
                            {['up','down','unreach'].map((key) => {
                                const value = availabilityData[hoveredTooltip.storageName][key];
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
                </div>
            )}
        </div>
    );
};

export default Stockage;
