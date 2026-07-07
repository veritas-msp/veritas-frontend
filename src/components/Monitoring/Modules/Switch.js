import React, { useEffect, useState, useCallback, useRef } from "react";
import { FaNetworkWired, FaInfoCircle, FaLink, FaSync, FaExclamationCircle } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Switch.module.css";
import commonStyles from "./ModuleCommon.module.css";
import { useTheme } from "../../../hooks/useTheme";
import SmartTooltip from "../../SmartTooltip";
import API_BASE_URL from "../../../config";
import { getCheckMKReportPeriodData } from "../../../api/checkmkReportPeriod";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, scoreToLabel, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";

// Options par défaut pour les toasts (bas à droite)
const toastOptions = { position: "bottom-right", autoClose: 3000 };

const defaultServices = ["CPU", "RAM", "TRAFIC", "UPTIME"];

const Switch = ({ config, setConfig, data, setData, onSyncAllCheckMKReady }) => {
    const { theme } = useTheme();
    const switchList = config?.client?.equipements?.Switch || [];
    const [checkmkMappings, setCheckmkMappings] = useState({});
    const [checkmkData, setCheckmkData] = useState({});
    const [loadingCheckMK, setLoadingCheckMK] = useState({});
    
    // Fonction helper pour obtenir le mapping CheckMK d'un switch (par nom ou id)
    const getCheckMKMapping = useCallback((switchNameOrId) => {
        if (switchNameOrId && checkmkMappings[switchNameOrId]) {
            return checkmkMappings[switchNameOrId];
        }
        const sw = switchList.find(s => s.nom === switchNameOrId);
        if (sw?.id && checkmkMappings[sw.id]) {
            return checkmkMappings[sw.id];
        }
        return null;
    }, [checkmkMappings, switchList]);
    const [eventsCount, setEventsCount] = useState({});
    const [eventsData, setEventsData] = useState({});
    const [availabilityData, setAvailabilityData] = useState({});
    const [hoveredTooltip, setHoveredTooltip] = useState(null);
    const [animatedServices, setAnimatedServices] = useState({});
    const [animatedEvents, setAnimatedEvents] = useState({});
    const [animatedAvailability, setAnimatedAvailability] = useState({});
    const [animatedScore, setAnimatedScore] = useState({});
    const [scoreAnimationComplete, setScoreAnimationComplete] = useState({});
    const [editingScore, setEditingScore] = useState({});
    const [editingScoreValue, setEditingScoreValue] = useState({});
    const [openComments, setOpenComments] = useState({});
    const [editingSwitch, setEditingSwitch] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const dataRef = useRef(data);
    const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);

    // 🔁 Restaurer l'état d'ouverture des commentaires depuis les données du rapport
    useEffect(() => {
        if (!data) return;
        setOpenComments((prev) => {
            const next = { ...prev };
            Object.keys(data).forEach((switchName) => {
                const isOpen = data[switchName]?.isCommentOpen;
                if (typeof isOpen === 'boolean') {
                    next[switchName] = isOpen;
                }
            });
            return next;
        });
    }, [data]);
    const syncAllCheckMKRef = useRef(null);

    // Charger les switches depuis la base (v_b_clients_m_switch) au montage
    useEffect(() => {
        if (!config?.client?.id || !setConfig) return;
        const controller = new AbortController();

        const loadSwitchFromDb = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/switch`, {
                    credentials: "include",
                    signal: controller.signal
                });
                if (!res.ok) return;
                const rows = await res.json();
                const switchList = (rows || []).map((row) => {
                    const { id: dataId, ...dataWithoutId } = row.data || {};
                    return {
                        id: row.id,
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
                                Switch: switchList
                            }
                        }
                    };
                });
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error("Erreur chargement switches:", err);
            }
        };

        loadSwitchFromDb();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config?.client?.id]);

    const updateValue = (switchName, service, level, value) => {
        const updated = {
            ...data,
            [switchName]: {
                ...(data[switchName] || {}),
                [service]: {
                    ...(data[switchName]?.[service] || {}),
                    [level]: value
                }
            }
        };
        setData(updated);
    };

    const updateComment = (switchName, comment) => {
        const updated = {
            ...data,
            [switchName]: {
                ...(data[switchName] || {}),
                comment
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    const toggleCommentVisibility = (switchName) => {
        setOpenComments((prev) => {
            const nextIsOpen = !prev[switchName];
            const nextState = {
                ...prev,
                [switchName]: nextIsOpen,
            };

            // Persister aussi dans les données du rapport pour garder l'état en changeant d'onglet
            const currentData = dataRef.current || data || {};
            const updated = {
                ...currentData,
                [switchName]: {
                    ...(currentData[switchName] || {}),
                    isCommentOpen: nextIsOpen,
                },
            };
            setData(updated);
            dataRef.current = updated;

            return nextState;
        });
    };

    // Fonction pour appliquer une note manuelle
    const applyManualScore = (switchName, scoreValue) => {
        const updated = {
            ...data,
            [switchName]: {
                ...(data[switchName] || {}),
                manualHealthScore: scoreValue
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    // Fonction pour gérer la sélection manuelle d'une lettre
    const handleManualLetterSelect = (switchName, letter) => {
        const scoreValue = letterToScore(letter);
        if (scoreValue === null) return;
        applyManualScore(switchName, scoreValue);
    };

    const saveEditScore = (switchName) => {
        const scoreValue = parseInt(editingScoreValue[switchName], 10);
        if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 100) {
            const updated = {
                ...data,
                [switchName]: {
                    ...(data[switchName] || {}),
                    manualHealthScore: scoreValue
                }
            };
            setData(updated);
            dataRef.current = updated;
        }
        setEditingScore(prev => {
            const next = { ...prev };
            delete next[switchName];
            return next;
        });
        setEditingScoreValue(prev => {
            const next = { ...prev };
            delete next[switchName];
            return next;
        });
    };

    const cancelEditScore = (switchName) => {
        setEditingScore(prev => {
            const next = { ...prev };
            delete next[switchName];
            return next;
        });
        setEditingScoreValue(prev => {
            const next = { ...prev };
            delete next[switchName];
            return next;
        });
    };

    // Fonction pour sélectionner tout le contenu du champ au focus
    const handleInputFocus = (e) => {
        e.target.select();
    };

    const getTotal = (switchName, service) => {
        const switchData = data?.[switchName]?.[service] || {};
        const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
        const ok = switchData.ok !== undefined ? parse(switchData.ok, 100) : 100;
        const warn = switchData.warn !== undefined ? parse(switchData.warn, 0) : 0;
        const crit = switchData.crit !== undefined ? parse(switchData.crit, 0) : 0;
        return ok + warn + crit;
    };

    const hasInvalidLines = (switchName) => {
        return defaultServices.some(service => getTotal(switchName, service) !== 100);
    };

    // Fonction pour calculer le statut global du switch
    const getSwitchStatus = (switchName) => {
        const switchData = data?.[switchName];
        if (!switchData) return { status: "unknown", icon: "●", color: "gray" };

        let totalCrit = 0;
        let totalWarn = 0;
        let totalOk = 0;
        let serviceCount = 0;

        defaultServices.forEach(service => {
            const serviceData = switchData[service] || {};
            const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
            
            totalCrit += parse(serviceData.crit, 0);
            totalWarn += parse(serviceData.warn, 0);
            totalOk += parse(serviceData.ok, 100);
            serviceCount++;
        });

        // Calcul de la note globale (0-100)
        const avgCrit = totalCrit / serviceCount;
        const avgWarn = totalWarn / serviceCount;
        const avgOk = totalOk / serviceCount;

        // Détermination du statut basé sur les moyennes
        if (avgCrit > 20) {
            return { status: "critical", icon: "●", color: "red" };
        } else if (avgCrit > 10 || avgWarn > 30) {
            return { status: "warning", icon: "●", color: "orange" };
        } else if (avgOk >= 90) {
            return { status: "excellent", icon: "●", color: "green" };
        } else if (avgOk >= 70) {
            return { status: "good", icon: "●", color: "lightgreen" };
        } else {
            return { status: "poor", icon: "●", color: "yellow" };
        }
    };

    // Fonction pour formater les informations du switch
    const getSwitchInfo = (sw) => {
        const info = [];
        
        if (sw.ip) info.push(sw.ip);
        if (sw.firmware) info.push(`FW: ${sw.firmware}`);
        if (sw.fabricant && sw.modele) info.push(`${sw.fabricant} ${sw.modele}`);
        else if (sw.fabricant) info.push(sw.fabricant);
        else if (sw.modele) info.push(sw.modele);
        if (sw.adresseMac || sw.numeroSerie) info.push((sw.adresseMac || sw.numeroSerie).toLowerCase());
        
        return { info };
    };

    // Fonction pour sauvegarder un switch
    const saveSwitch = async (switchId, switchData) => {
        const clientId = config?.client?.id;
        if (!clientId) {
            throw new Error("ID client manquant");
        }

        const { id, __fromDb, __index, ...dataForDb } = switchData;

        const body = {
            item_key: switchData.nom || `switch-${switchId}`,
            name: switchData.nom || `Switch`,
            data: dataForDb,
            is_active: true
        };

        const method = switchId ? "PUT" : "POST";
        const url = switchId
            ? `${API_BASE_URL}/clients/modules/${clientId}/switch/${switchId}`
            : `${API_BASE_URL}/clients/modules/${clientId}/switch`;

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
    const handleSaveSwitch = async () => {
        if (!editingSwitch || !editForm) return;

        setIsSaving(true);
        try {
            const updatedSwitch = {
                ...editingSwitch,
                nom: editForm.nom,
                ip: editForm.ip || '',
                site: editForm.site || '',
                fabricant: editForm.fabricant || '',
                modele: editForm.modele || '',
                firmware: editForm.firmware || '',
                adresseMac: editForm.adresseMac || '',
                numeroSerie: editForm.numeroSerie || '',
                vlan: editForm.vlan || '',
                expirationGarantie: editForm.expirationGarantie || ''
            };

            const savedRow = await saveSwitch(editingSwitch.id, updatedSwitch);

            setConfig((prev) => {
                if (!prev?.client?.equipements?.Switch) return prev;
                
                const updatedList = prev.client.equipements.Switch.map((sw) => {
                    if (sw.id === editingSwitch.id) {
                        const { id: dataId, ...dataWithoutId } = savedRow.data || {};
                        return {
                            id: savedRow.id,
                            ...dataWithoutId,
                            nom: savedRow.data?.nom || savedRow.name || savedRow.item_key || "",
                            __fromDb: true
                        };
                    }
                    return sw;
                });

                return {
                    ...prev,
                    client: {
                        ...prev.client,
                        equipements: {
                            ...prev.client.equipements,
                            Switch: updatedList
                        }
                    }
                };
            });

            toast.success("Switch mis à jour", toastOptions);
            setEditingSwitch(null);
            setEditForm(null);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde:", error);
            toast.error("Erreur lors de la sauvegarde", toastOptions);
        } finally {
            setIsSaving(false);
        }
    };

    // Fonction pour calculer le statut de la garantie
    const getWarrantyStatus = (sw) => {
        if (!sw.expirationGarantie) return { status: "unknown", color: "gray" };
        
        const expirationDate = new Date(sw.expirationGarantie);
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

    // Fonction pour obtenir la période du rapport
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

    // Charger les mappings CheckMK
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
                        const isSwitchType = ['switch'].includes(type);
                        if (isSwitchType && m.is_active !== false && m.equipment_id) {
                            mappingsMap[m.equipment_id] = m;
                        }
                    });
                    setCheckmkMappings(mappingsMap);
                }
            } catch (error) {
                console.error('Erreur chargement mappings Check MK:', error);
            }
        };

        loadMappings();
    }, [config?.client?.id]);

    // Mettre à jour dataRef quand data change
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Restaurer les données CheckMK depuis data quand elles sont disponibles
    useEffect(() => {
        if (!switchList.length || !data) return;

        switchList.forEach(sw => {
            const switchData = data[sw.nom];
            if (switchData) {
                // Restaurer les données CheckMK
                if (switchData.checkmkData) {
                    setCheckmkData(prev => ({ ...prev, [sw.nom]: switchData.checkmkData }));
                }
                
                // Restaurer les événements
                if (switchData.eventsCount !== undefined) {
                    setEventsCount(prev => ({ ...prev, [sw.nom]: switchData.eventsCount }));
                }
                if (switchData.eventsData) {
                    setEventsData(prev => ({ ...prev, [sw.nom]: switchData.eventsData }));
                }
                
                // Restaurer la disponibilité
                if (switchData.availabilityData) {
                    setAvailabilityData(prev => ({ ...prev, [sw.nom]: switchData.availabilityData }));
                }
            }
        });
    }, [switchList, data]);

    // Récupérer le nombre d'événements
    const loadEventsCount = async (switchName, checkmkHostName) => {
        if (!checkmkHostName) return;

        const period = getReportPeriod();
        if (!period.start_time || !period.end_time) {
            setEventsCount(prev => ({ ...prev, [switchName]: 0 }));
            return;
        }

        try {
            const url = new URL(`${API_BASE_URL}/checkmk/events-period/${encodeURIComponent(checkmkHostName)}`);
            url.searchParams.append('start_time', period.start_time);
            url.searchParams.append('end_time', period.end_time);
            
            const mapping = getCheckMKMapping(switchName);
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

                setEventsCount(prev => ({ ...prev, [switchName]: eventsCountValue }));
                setEventsData(prev => ({ ...prev, [switchName]: eventsDataValue }));

                const currentData = dataRef.current || {};
                const updated = {
                    ...currentData,
                    [switchName]: {
                        ...(currentData[switchName] || {}),
                        eventsCount: eventsCountValue,
                        eventsData: eventsDataValue
                    }
                };
                setData(updated);
                dataRef.current = updated;
            } else {
                setEventsCount(prev => ({ ...prev, [switchName]: 0 }));
            }
        } catch (error) {
            console.error(`Erreur récupération événements pour ${switchName}:`, error);
            setEventsCount(prev => ({ ...prev, [switchName]: 0 }));
        }
    };

    // Récupérer la disponibilité
    const loadAvailabilityData = async (switchName, checkmkHostName) => {
        if (!checkmkHostName) return;

        try {
            const url = new URL(`${API_BASE_URL}/checkmk/availability-table/${encodeURIComponent(checkmkHostName)}`);
            
            const mapping = getCheckMKMapping(switchName);
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
                setAvailabilityData(prev => ({ ...prev, [switchName]: availabilityValue }));

                const currentData = dataRef.current || {};
                const updated = {
                    ...currentData,
                    [switchName]: {
                        ...(currentData[switchName] || {}),
                        availabilityData: availabilityValue
                    }
                };
                setData(updated);
                dataRef.current = updated;
            }
        } catch (error) {
            console.error(`Erreur récupération disponibilité pour ${switchName}:`, error);
        }
    };

    // Récupérer les données CheckMK
    const loadCheckMKData = async (switchName, checkmkHostName, showToasts = true) => {
        if (!checkmkHostName || loadingCheckMK[switchName]) return;

        // Supprimer la note manuelle pour que la note calculée reprenne le dessus
        const currentDataBeforeSync = dataRef.current || {};
        const updatedBeforeSync = {
            ...currentDataBeforeSync,
            [switchName]: {
                ...(currentDataBeforeSync[switchName] || {}),
                manualHealthScore: undefined
            }
        };
        setData(updatedBeforeSync);
        dataRef.current = updatedBeforeSync;

        // Initialiser l'animation à 0 immédiatement
        setAnimatedScore(prev => ({ ...prev, [switchName]: 0 }));
        setScoreAnimationComplete(prev => ({ ...prev, [switchName]: false }));

        setLoadingCheckMK(prev => ({ ...prev, [switchName]: true }));

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
                
                setCheckmkData(prev => ({ ...prev, [switchName]: checkmkDataValue }));

                const currentData = dataRef.current || {};
                const updated = {
                    ...currentData,
                    [switchName]: {
                        ...(currentData[switchName] || {}),
                        checkmkData: checkmkDataValue,
                        lastSyncDate: new Date().toISOString()
                    }
                };
                setData(updated);
                dataRef.current = updated;

                const periodReport = getReportPeriod();
                const mapping = getCheckMKMapping(switchName);
                if (periodReport?.start_time && periodReport?.end_time) {
                    try {
                        const reportData = await getCheckMKReportPeriodData(
                            checkmkHostName,
                            periodReport.start_time,
                            periodReport.end_time,
                            mapping?.checkmk_site || null
                        );
                        const ev = reportData?.events || {};
                        const av = reportData?.availability || {};
                        setEventsCount(prev => ({ ...prev, [switchName]: ev.events_count || 0 }));
                        setEventsData(prev => ({ ...prev, [switchName]: ev.events || [] }));
                        if (av.availability) {
                            setAvailabilityData(prev => ({ ...prev, [switchName]: av.availability }));
                        } else {
                            await loadAvailabilityData(switchName, checkmkHostName);
                        }
                    } catch (e) {
                        await Promise.all([
                            loadEventsCount(switchName, checkmkHostName),
                            loadAvailabilityData(switchName, checkmkHostName)
                        ]);
                    }
                } else {
                    await Promise.all([
                        loadEventsCount(switchName, checkmkHostName),
                        loadAvailabilityData(switchName, checkmkHostName)
                    ]);
                }
                
                // Démarrer les animations après la synchronisation
                setTimeout(() => {
                    // Animation de la note globale
                    const finalScore = getSwitchHealthScore(switchName);
                    if (finalScore !== null) {
                        setAnimatedScore(prev => ({ ...prev, [switchName]: 0 }));
                        setScoreAnimationComplete(prev => ({ ...prev, [switchName]: false }));
                        const duration = 3000;
                        const steps = 120;
                        const increment = finalScore / steps;
                        let currentStep = 0;
                        
                        const scoreTimer = setInterval(() => {
                            currentStep++;
                            const newValue = Math.min(increment * currentStep, finalScore);
                            setAnimatedScore(prev => ({ ...prev, [switchName]: Math.round(newValue) }));
                            
                            if (currentStep >= steps) {
                                clearInterval(scoreTimer);
                                setAnimatedScore(prev => ({ ...prev, [switchName]: finalScore }));
                                setTimeout(() => {
                                    setScoreAnimationComplete(prev => ({ ...prev, [switchName]: true }));
                                }, 100);
                            }
                        }, duration / steps);
                    }

                    const finalServices = services.length;
                    if (finalServices > 0) {
                        setAnimatedServices(prev => ({ ...prev, [switchName]: 0 }));
                        const duration = 2000;
                        const steps = 100;
                        const increment = finalServices / steps;
                        let currentStep = 0;
                        
                        const servicesTimer = setInterval(() => {
                            currentStep++;
                            const newValue = Math.min(increment * currentStep, finalServices);
                            setAnimatedServices(prev => ({ ...prev, [switchName]: Math.round(newValue) }));
                            
                            if (currentStep >= steps) {
                                clearInterval(servicesTimer);
                                setAnimatedServices(prev => ({ ...prev, [switchName]: finalServices }));
                            }
                        }, duration / steps);
                    }

                    // Animation des événements
                    const finalEvents = eventsCount[switchName];
                    if (finalEvents !== undefined) {
                        setAnimatedEvents(prev => ({ ...prev, [switchName]: 0 }));
                        const duration = 2000;
                        const steps = 100;
                        const increment = finalEvents / steps;
                        let currentStep = 0;
                        
                        const eventsTimer = setInterval(() => {
                            currentStep++;
                            const newValue = Math.min(increment * currentStep, finalEvents);
                            setAnimatedEvents(prev => ({ ...prev, [switchName]: Math.round(newValue) }));
                            
                            if (currentStep >= steps) {
                                clearInterval(eventsTimer);
                                setAnimatedEvents(prev => ({ ...prev, [switchName]: finalEvents }));
                            }
                        }, duration / steps);
                    }

                    // Animation de la disponibilité
                    const availability = availabilityData[switchName];
                    if (availability && availability.up !== undefined) {
                        const finalAvailability = parseFloat(availability.up || 0);
                        setAnimatedAvailability(prev => ({ ...prev, [switchName]: 0 }));
                        const duration = 2000;
                        const steps = 100;
                        const increment = finalAvailability / steps;
                        let currentStep = 0;
                        
                        const availabilityTimer = setInterval(() => {
                            currentStep++;
                            const newValue = Math.min(increment * currentStep, finalAvailability);
                            setAnimatedAvailability(prev => ({ ...prev, [switchName]: Math.round(newValue) }));
                            
                            if (currentStep >= steps) {
                                clearInterval(availabilityTimer);
                                setAnimatedAvailability(prev => ({ ...prev, [switchName]: finalAvailability }));
                            }
                        }, duration / steps);
                    }
                }, 100);
            } else {
                // Ne pas afficher de notification individuelle
            }
        } catch (error) {
            console.error('Erreur récupération services Check MK:', error);
            // Ne pas afficher de notification individuelle
        } finally {
            setLoadingCheckMK(prev => ({ ...prev, [switchName]: false }));
        }
    };

    // Synchroniser tous les switches mappés
    const syncAllCheckMK = useCallback(async () => {
        const mappedSwitches = switchList.filter(sw => sw.id && checkmkMappings[sw.id]);
        
        if (mappedSwitches.length === 0) {
            toast.warning('Aucun switch mappé avec Check MK', toastOptions);
            return;
        }
        
        const syncPromises = mappedSwitches.map(sw => 
            loadCheckMKData(sw.nom, checkmkMappings[sw.id].checkmk_host_name, false)
        );
        
        try {
            await Promise.all(syncPromises);
            toast.success(`Synchronisation terminée`, toastOptions);
        } catch (error) {
            toast.error(`Erreur lors de la synchronisation`, toastOptions);
        }
    }, [switchList, checkmkMappings]);

    // Mettre à jour la ref de syncAllCheckMK
    useEffect(() => {
        syncAllCheckMKRef.current = syncAllCheckMK;
    }, [syncAllCheckMK]);

    // Mettre à jour la ref de onSyncAllCheckMKReady
    useEffect(() => {
        onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
    }, [onSyncAllCheckMKReady]);

    // Exposer la fonction syncAllCheckMK au parent
    const lastNotifiedSyncInfoRef = useRef({ hasMappings: null, isLoading: null });
    useEffect(() => {
        if (onSyncAllCheckMKReadyRef.current && syncAllCheckMKRef.current) {
            const hasMappings = switchList.some(sw => sw.id && checkmkMappings[sw.id]);
            const isLoading = Object.values(loadingCheckMK).some(loading => loading);

            // Ne notifier le parent que si l'état change réellement pour éviter les clignotements
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
    }, [checkmkMappings, loadingCheckMK, switchList]);

    // Fonction pour obtenir la couleur progressive de la disponibilité
    const getProgressiveColor = (value) => {
        if (value >= 99) return '#10b981'; // vert
        if (value >= 95) return '#22c55e'; // vert clair
        if (value >= 80) return '#f59e0b'; // orange
        return '#ef4444'; // rouge
    };

    // Fonction pour calculer le score de santé du switch
    const getSwitchHealthScore = (switchName) => {
        const switchData = data?.[switchName];

        // Pour les périphériques non mappés, pas de note de santé
        const mapping = getCheckMKMapping(switchName);
        if (!mapping) {
            return null;
        }

        // Pour les périphériques mappés, calculer le score complet
        let score = 0;
        let weightSum = 0;

        let hasCriticalServices = false;
        let hasEvents = false;
        let hasLowAvailability = false;

        // 1. Vérification des services critiques
        if (switchData) {
            defaultServices.forEach(service => {
                const serviceData = switchData[service] || {};
                const critCount = parseInt(serviceData.crit, 10) || 0;
                if (critCount > 0) {
                    hasCriticalServices = true;
                }
            });
        }

        // 2. Vérification des événements
        const periodEventsCount = eventsCount[switchName];
        if (periodEventsCount !== undefined && periodEventsCount > 0) {
            hasEvents = true;
        }

        // 3. Vérification de la disponibilité
        let availabilityValue = 100;
        if (availabilityData[switchName] && availabilityData[switchName].up !== undefined) {
            availabilityValue = parseFloat(availabilityData[switchName].up || 0);
            if (availabilityValue < 95) {
                hasLowAvailability = true;
            }
        }

        const eventsWeight = 0.5;
        const availabilityWeight = 0.5;

        // 1. Score de disponibilité
        let availabilityScore = availabilityValue;
        if (availabilityValue < 80) {
            availabilityScore = Math.min(availabilityValue, 50);
        } else if (availabilityValue < 95) {
            availabilityScore = Math.min(availabilityValue, 70);
        }
        score += availabilityScore * availabilityWeight;
        weightSum += availabilityWeight;

        // 2. Score événements
        let eventsScore = 100;
        if (periodEventsCount !== undefined) {
            if (periodEventsCount === 0) {
                eventsScore = 100;
            } else if (periodEventsCount === 1) {
                eventsScore = 70;
            } else if (periodEventsCount <= 3) {
                eventsScore = 50;
            } else if (periodEventsCount <= 6) {
                eventsScore = 30;
            } else {
                eventsScore = 15;
            }
        }
        score += eventsScore * eventsWeight;
        weightSum += eventsWeight;

        // Normalisation du score
        let finalScore = weightSum > 0 ? score / weightSum : 0;

        // APPLICATION DE PLAFONDS CRITIQUES
        if (availabilityValue < 80) {
            finalScore = Math.min(finalScore, 50);
        } else if (availabilityValue < 95) {
            finalScore = Math.min(finalScore, 70);
        }
        
        if (hasEvents && finalScore > 70) {
            finalScore = Math.min(finalScore, 70);
        }
        if (periodEventsCount !== undefined && periodEventsCount >= 4 && finalScore > 50) {
            finalScore = Math.min(finalScore, 50);
        }

        if (hasCriticalServices && finalScore > 50) {
            finalScore = Math.min(finalScore, 50);
        }

        return Math.round(finalScore);
    };

    useEffect(() => {
        if (!switchList.length || (data && Object.keys(data).length > 0)) return;

        const initializedData = {};
        switchList.forEach(sw => {
            initializedData[sw.nom] = {
                comment: ""
            };
        });

        setData(initializedData);
    }, [switchList, data, setData]);

    if (!switchList || switchList.length === 0) {
        return (
            <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>Aucun switch configuré pour ce client.</p>
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <strong>🔍 Debug - Équipements en base :</strong>
                        <pre style={{ marginTop: '0.5rem', overflow: 'auto', maxHeight: '300px' }}>
                            {JSON.stringify({
                                clientId: config?.client?.id,
                                clientName: config?.client?.name,
                                equipementsSwitch: config?.client?.equipements?.Switch || [],
                                nombreSwitch: config?.client?.equipements?.Switch?.length || 0,
                                modules_monitoring_Switch: config?.client?.modules_monitoring?.Switch,
                                tousEquipements: config?.client?.equipements
                            }, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        );
    }

    // Grouper les switches par site
    const groupedBySite = switchList.reduce((acc, sw) => {
        const siteName = sw.site || "Sans site";
        if (!acc[siteName]) {
            acc[siteName] = [];
        }
        acc[siteName].push(sw);
        return acc;
    }, {});

    // Trier les sites (Sans site en dernier)
    const sortedSites = Object.keys(groupedBySite).sort((a, b) => {
        if (a === "Sans site") return 1;
        if (b === "Sans site") return -1;
        return a.localeCompare(b);
    });

    return (
        <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
            {sortedSites.map((siteName) => {
                const siteSwitches = groupedBySite[siteName];
                return (
                    <div
                      key={siteName}
                      style={{ marginBottom: '2rem' }}
                      id={`site-${siteName}`}
                      data-site-label={siteName}
                    >
                        <div style={{ marginBottom: '1rem' }}>
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                margin: 0,
                                paddingBottom: '0.5rem',
                                borderBottom: '3px solid var(--border-primary)',
                                display: 'inline-block',
                                minWidth: '120px'
                            }}>
                                {siteName}
                                {siteSwitches.length > 0 && (
                                    <span style={{
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        color: 'var(--text-secondary)',
                                        marginLeft: '1rem'
                                    }}>
                                        {siteSwitches.length} switch{siteSwitches.length > 1 ? 'es' : ''}
                                    </span>
                                )}
                            </h2>
            </div>
            <div className={styles.switchGrid}>
                            {siteSwitches
                                .sort((a, b) => a.nom.localeCompare(b.nom))
                    .map((sw, i) => {
                        const mac = (sw.adresseMac || sw.numeroSerie || "").toLowerCase();
                        const needsSyncAttention = Boolean(
                            sw.id && checkmkMappings[sw.id] &&
                            !data?.[sw.nom]?.lastSyncDate &&
                            !loadingCheckMK[sw.nom]
                        );
                        return (
                            <div key={i} className={`${styles.switchCard} ${styles.withComment}`}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.headerLeft}>
                                        <div className={styles.switchInfo}>
                                            <h3 className={styles.switchName}>
                                                <FaNetworkWired style={{
                                                    marginRight: '0.5rem',
                                                    fontSize: '1.2rem',
                                                    color: 'var(--text-secondary)',
                                                    verticalAlign: 'middle'
                                                }} />
                                                {sw.nom}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className={styles.switchType}>
                                        {/* Boutons d'action */}
                                        <div className={styles.buttonGroup}>
                                            {sw.id && checkmkMappings[sw.id] && (
                                                <button
                                                    type="button"
                                                    className={`${styles.syncButton} ${needsSyncAttention ? styles.syncButtonAttention : ''}`}
                                                    onClick={() => {
                                                        if (!loadingCheckMK[sw.nom]) {
                                                            loadCheckMKData(sw.nom, checkmkMappings[sw.id].checkmk_host_name);
                                                        }
                                                    }}
                                                    title={`Mappé vers Check MK: ${checkmkMappings[sw.id].checkmk_host_name}. Cliquer pour synchroniser.`}
                                                    disabled={loadingCheckMK[sw.nom]}
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
                                                        cursor: loadingCheckMK[sw.nom] ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        opacity: loadingCheckMK[sw.nom] ? 0.5 : 1,
                                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!loadingCheckMK[sw.nom]) {
                                                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!loadingCheckMK[sw.nom]) {
                                                            e.currentTarget.style.borderColor = 'var(--border-secondary)';
                                                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                                        }
                                                    }}
                                                >
                                                    <IconifyIcon
                                                        icon="material-symbols:sync"
                                                        width={14}
                                                        height={14}
                                                        className={loadingCheckMK[sw.nom] ? styles.loadingIcon : ''}
                                                    />
                                                </button>
                                            )}
                                            <div className={styles.flexAuto}>
                                            </div>
                                            <button
                                                type="button"
                                                className={commonStyles.editButton}
                                                onClick={() => {
                                                    setEditingSwitch(sw);
                                                    setEditForm({
                                                        nom: sw.nom || '',
                                                        ip: sw.ip || '',
                                                        site: sw.site || '',
                                                        fabricant: sw.fabricant || '',
                                                        modele: sw.modele || '',
                                                        firmware: sw.firmware || '',
                                                        adresseMac: sw.adresseMac || '',
                                                        numeroSerie: sw.numeroSerie || '',
                                                        vlan: sw.vlan || '',
                                                        expirationGarantie: sw.expirationGarantie || ''
                                                    });
                                                }}
                                                title="Éditer le switch"
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
                                    const { info } = getSwitchInfo(sw);
                                    const warrantyInfo = sw.expirationGarantie ? (() => {
                                        const expirationDate = new Date(sw.expirationGarantie);
                                        const today = new Date();
                                        const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
                                        return {
                                            date: expirationDate.toLocaleDateString('fr-FR'),
                                            expired: daysUntilExpiration < 0,
                                            daysLeft: daysUntilExpiration >= 0 ? daysUntilExpiration : null,
                                        };
                                    })() : null;

                                    return (info.length > 0 || warrantyInfo) && (
                                        <div className={`${commonStyles.moduleMeta} ${styles.switchMetaFlex}`}>
                                            <span className={styles.flexOne}>
                                                {info.join(" • ")}
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

                                {/* Container pour Santé + Stats sur la même ligne */}
                                {sw.id && getCheckMKMapping(sw.id) && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: '0.5rem',
                                    alignItems: 'stretch',
                                    justifyContent: 'center',
                                    marginBottom: '0.5rem'
                                }}>
                                {loadingCheckMK[sw.nom] ? (
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
                                {/* Carte: Santé du switch */}
                                {(() => {
                                    const mapping = sw.id ? getCheckMKMapping(sw.id) : null;
                                    const isMapped = Boolean(mapping);
                                    const hasSyncData = Boolean(data?.[sw.nom]?.lastSyncDate);
                                    const shouldShowNA = isMapped && !hasSyncData;
                                    const calculatedScore = shouldShowNA ? null : getSwitchHealthScore(sw.nom);
                                    const manualScore = data?.[sw.nom]?.manualHealthScore;
                                    const globalScore = shouldShowNA ? null : (manualScore !== undefined ? manualScore : calculatedScore);
                                    const isLoading = loadingCheckMK[sw.nom];
                                    const isAnimating = animatedScore[sw.nom] !== undefined && !scoreAnimationComplete[sw.nom];
                                    const isEditing = editingScore[sw.nom];
                                    const scoreBreakdown = mapping
                                        ? [
                                            { label: "Disponibilité", description: "Taux UP supervisé par CheckMK", weight: "50 pts" },
                                            { label: "Événements", description: "Alertes détectées sur la période", weight: "50 pts" }
                                        ]
                                        : [];
                                    
                                    const placeholderScore = 95;
                                    let displayScore = null;
                                    if (!isLoading) {
                                        if (shouldShowNA) {
                                            displayScore = placeholderScore;
                                        } else {
                                            displayScore = isAnimating ? animatedScore[sw.nom] : globalScore;
                                        }
                                    }
                                    
                                    // Convertir le score en lettre (A, B, C, D, E, F)
                                    const displayLetter = displayScore !== null ? scoreToLetter(displayScore) : null;
                                    const scoreLetter = globalScore !== null ? scoreToLetter(globalScore) : null;
                                    
                                    // Déterminer la couleur selon la lettre
                                    const scoreColor = scoreLetter ? scoreToColor(globalScore) : '#9ca3af';
                                    const displayColor = shouldShowNA
                                        ? '#9ca3af'
                                        : (displayScore !== null ? scoreToColor(displayScore) : scoreColor);
                                    
                                    if (globalScore === null && !isLoading && !shouldShowNA) {
                                        return (
                                            <div className={styles.naCard}>
                                                <div>Disponibilité non synchronisée</div>
                                                <small>Synchronisez ce switch pour calculer la note.</small>
                                            </div>
                                        );
                                    }
                                    
                                    const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;
                                    
                                    return (
                                        <div className={styles.scoreCardLeft} style={{
                                            opacity: isLoading ? 0.6 : 1
                                        }}>
                                            {!isLoading && displayScore !== null && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '100%',
                                                    height: '100%'
                                                }}>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={editingScoreValue[sw.nom] !== undefined ? editingScoreValue[sw.nom] : displayScore}
                                                            onChange={(e) => setEditingScoreValue(prev => ({ ...prev, [sw.nom]: e.target.value }))}
                                                            onBlur={() => saveEditScore(sw.nom)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    saveEditScore(sw.nom);
                                                                } else if (e.key === 'Escape') {
                                                                    cancelEditScore(sw.nom);
                                                                }
                                                            }}
                                                            autoFocus
                                                            style={{
                                                                fontSize: '1.5rem',
                                                                fontWeight: '700',
                                                                color: scoreColor,
                                                                lineHeight: '1',
                                                                width: '60px',
                                                                border: `2px solid ${scoreColor}`,
                                                                borderRadius: '4px',
                                                                padding: '0.25rem',
                                                                background: 'var(--bg-primary)',
                                                                textAlign: 'center'
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            role="button"
                                                            tabIndex={displayScore !== null ? 0 : -1}
                                                            onKeyDown={(e) => {
                                                                if (displayScore !== null && !isLoading && (e.key === 'Enter' || e.key === ' ')) {
                                                                    e.preventDefault();
                                                                    setEditingScore(prev => ({ ...prev, [sw.nom]: true }));
                                                                    setEditingScoreValue(prev => ({ ...prev, [sw.nom]: displayScore }));
                                                                }
                                                            }}
                                                            title={displayScore !== null ? "Cliquer pour sélectionner une note, double-cliquer pour éditer précisément" : ""}
                                                            className={`${displayScore !== null ? styles.scoreLetterWrapper : styles.scoreLetterWrapperDisabled} ${shouldShowNA ? styles.scoreLetterWrapperGrayscale : ''}`}
                                                        >
                                                            <LetterScale 
                                                                activeLetter={displayLetter} 
                                                                theme={theme} 
                                                                letters={["F", "E", "D", "C", "B", "A"]}
                                                                size="compact"
                                                                onSelect={!isLoading ? (letter) => handleManualLetterSelect(sw.nom, letter) : undefined}
                                                                highlightLetter={!shouldShowNA && manualScoreChanged && calculatedScore !== null && !isEditing ? scoreToLetter(calculatedScore) : null}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Cartes de statistiques : Services monit. / Événements / Disponibilité */}
                                <div className={styles.statsGrid}>
                                    {/* Carte: Nombre de services monitorés */}
                                    <div 
                                        className={`${styles.statCard} ${loadingCheckMK[sw.nom] ? styles.statCardDisabled : (checkmkData[sw.nom] ? styles.statCardEnabled : styles.statCardDefault)}`}
                                        onMouseEnter={(e) => {
                                            const mapping = sw.id ? getCheckMKMapping(sw.id) : null;
                                            if (mapping && checkmkData[sw.nom]) {
                                                setHoveredTooltip({
                                                    type: 'services',
                                                    switchName: sw.nom,
                                                    mouseX: e.clientX,
                                                    mouseY: e.clientY
                                                });
                                            }
                                        }}
                                        onMouseMove={(e) => {
                                            const mapping = sw.id ? getCheckMKMapping(sw.id) : null;
                                            if (mapping && checkmkData[sw.nom] && hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.switchName === sw.nom) {
                                                setHoveredTooltip({
                                                    type: 'services',
                                                    switchName: sw.nom,
                                                    mouseX: e.clientX,
                                                    mouseY: e.clientY
                                                });
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.switchName === sw.nom) {
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
                                        {!(sw.id && getCheckMKMapping(sw.id)) ? (
                                            <div className={styles.statCardNotMapped}>
                                                <div className={styles.statValueNotMapped}>
                                                    N/A
                                                </div>
                                                <div className={styles.statLabelNotMapped}>
                                                    Non mappé
                                                </div>
                                            </div>
                                        ) : loadingCheckMK[sw.nom] ? (
                                            <div className={styles.loadingRow}>
                                                <FaSync className={styles.loadingIconSmall} />
                                                Chargement...
                                            </div>
                                        ) : (
                                            <div className={`${styles.statValue} ${checkmkData[sw.nom] ? styles.statValuePrimary : styles.statValueSecondary}`}>
                                                {checkmkData[sw.nom] 
                                                    ? (animatedServices[sw.nom] !== undefined ? animatedServices[sw.nom] : (checkmkData[sw.nom].services?.length || 0))
                                                    : 'N/A'}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Carte: Nombre d'événements */}
                                    <div 
                                        className={`${styles.statCard} ${loadingCheckMK[sw.nom] ? styles.statCardDisabled : (eventsCount[sw.nom] !== undefined ? styles.statCardEnabled : styles.statCardDefault)}`}
                                        onMouseEnter={(e) => {
                                            const mapping = sw.id ? getCheckMKMapping(sw.id) : null;
                                            if (mapping && eventsData[sw.nom] && eventsData[sw.nom].length > 0) {
                                                setHoveredTooltip({
                                                    type: 'events',
                                                    switchName: sw.nom,
                                                    mouseX: e.clientX,
                                                    mouseY: e.clientY
                                                });
                                            }
                                        }}
                                        onMouseMove={(e) => {
                                            const mapping = sw.id ? getCheckMKMapping(sw.id) : null;
                                            if (mapping && eventsData[sw.nom] && eventsData[sw.nom].length > 0 && hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.switchName === sw.nom) {
                                                setHoveredTooltip({
                                                    type: 'events',
                                                    switchName: sw.nom,
                                                    mouseX: e.clientX,
                                                    mouseY: e.clientY
                                                });
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.switchName === sw.nom) {
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
                                        {!(sw.id && getCheckMKMapping(sw.id)) ? (
                                            <div className={styles.statCardNotMapped}>
                                                <div className={styles.statValueNotMapped}>
                                                    N/A
                                                </div>
                                                <div className={styles.statLabelNotMapped}>
                                                    Non mappé
                                                </div>
                                            </div>
                                        ) : loadingCheckMK[sw.nom] ? (
                                            <div className={styles.loadingRow}>
                                                <FaSync className={styles.loadingIconSmall} />
                                                Chargement...
                                            </div>
                                        ) : (
                                            <div className={`${styles.statValue} ${eventsCount[sw.nom] !== undefined ? (eventsCount[sw.nom] > 0 ? styles.statValueEventsWarning : styles.statValueEventsNormal) : styles.statValueSecondary}`}>
                                                {eventsCount[sw.nom] !== undefined 
                                                    ? (animatedEvents[sw.nom] !== undefined ? animatedEvents[sw.nom] : eventsCount[sw.nom])
                                                    : 'N/A'}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Carte: Disponibilité */}
                                    <div 
                                        className={`${styles.statCard} ${loadingCheckMK[sw.nom] ? styles.statCardDisabled : (availabilityData[sw.nom] ? styles.statCardEnabled : styles.statCardDefault)}`}
                                        onMouseEnter={(e) => {
                                            const mapping = sw.id ? getCheckMKMapping(sw.id) : null;
                                            if (mapping && availabilityData[sw.nom]) {
                                                setHoveredTooltip({
                                                    type: 'availability',
                                                    switchName: sw.nom,
                                                    mouseX: e.clientX,
                                                    mouseY: e.clientY
                                                });
                                            }
                                        }}
                                        onMouseMove={(e) => {
                                            const mapping = sw.id ? getCheckMKMapping(sw.id) : null;
                                            if (mapping && availabilityData[sw.nom] && hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.switchName === sw.nom) {
                                                setHoveredTooltip({
                                                    type: 'availability',
                                                    switchName: sw.nom,
                                                    mouseX: e.clientX,
                                                    mouseY: e.clientY
                                                });
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.switchName === sw.nom) {
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
                                        {!(sw.id && getCheckMKMapping(sw.id)) ? (
                                            <div className={styles.statCardNotMapped}>
                                                <div className={styles.statValueNotMapped}>
                                                    N/A
                                                </div>
                                                <div className={styles.statLabelNotMapped}>
                                                    Non mappé
                                                </div>
                                            </div>
                                        ) : loadingCheckMK[sw.nom] ? (
                                            <div className={styles.loadingRow}>
                                                <FaSync className={styles.loadingIconSmall} />
                                                Chargement...
                                            </div>
                                        ) : (
                                            <div 
                                                className={styles.statValueAvailability}
                                                style={{ 
                                                    color: availabilityData[sw.nom] && availabilityData[sw.nom].up !== undefined
                                                        ? (() => {
                                                            const displayValue = animatedAvailability[sw.nom] !== undefined 
                                                                ? animatedAvailability[sw.nom] 
                                                                : parseFloat(availabilityData[sw.nom].up || 0);
                                                            return getProgressiveColor(displayValue);
                                                        })()
                                                        : 'var(--text-secondary)'
                                                }}
                                            >
                                                {availabilityData[sw.nom] && availabilityData[sw.nom].up !== undefined 
                                                    ? `${animatedAvailability[sw.nom] !== undefined 
                                                        ? animatedAvailability[sw.nom] 
                                                        : Math.round(parseFloat(availabilityData[sw.nom].up || 0))}%`
                                                    : 'N/A'
                                                }
                                            </div>
                                        )}
                                    </div>
                                </div>
                                </>
                                )}
                                </div>
                                )}

                                {/* Zone de commentaire - toujours visible */}
                                <textarea
                                    id={`comment-${sw.nom}`}
                                    value={data?.[sw.nom]?.comment || ""}
                                    onChange={(e) => updateComment(sw.nom, e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="Commentaire..."
                                    style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        border: '2px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontFamily: 'inherit',
                                        resize: 'none',
                                        minHeight: '45px',
                                        maxHeight: '100px',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s ease',
                                        marginTop: '0.5rem'
                                    }}
                                    rows="2"
                                />
                            </div>
                        );
                    })}
            </div>
        </div>
                );
            })}

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
                }}>
                    {hoveredTooltip.type === 'score' && (
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
                    )}
                    {hoveredTooltip.type === 'availability' && availabilityData[hoveredTooltip.switchName] && (
                        <div>
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                marginBottom: '0.25rem'
                            }}>
                                Disponibilité
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Temps UP / DOWN sur la période.
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.375rem',
                                fontSize: '0.8rem'
                            }}>
                                {availabilityData[hoveredTooltip.switchName].up !== undefined && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '2rem'
                                    }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>UP:</span>
                                        <span style={{ 
                                            fontWeight: '600',
                                            color: '#10b981'
                                        }}>
                                            {Math.round(parseFloat(availabilityData[hoveredTooltip.switchName].up || 0))} %
                                        </span>
                                    </div>
                                )}
                                {availabilityData[hoveredTooltip.switchName].down !== undefined && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '2rem'
                                    }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>DOWN:</span>
                                        <span style={{ 
                                            fontWeight: '600',
                                            color: '#ef4444'
                                        }}>
                                            {Math.round(parseFloat(availabilityData[hoveredTooltip.switchName].down || 0))} %
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {hoveredTooltip.type === 'services' && checkmkData[hoveredTooltip.switchName] && (
                        <div>
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                marginBottom: '0.25rem'
                            }}>
                                Services monitorés
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Services supervisés par Check MK pour cet équipement.
                            </div>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.375rem',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                width: '100%'
                            }}>
                                {(() => {
                                    const services = checkmkData[hoveredTooltip.switchName].serviceInfo?.services || 
                                                   checkmkData[hoveredTooltip.switchName].services || 
                                                   [];
                                    
                                    if (services.length === 0) {
                                        return <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Aucun service</div>;
                                    }
                                    
                                    return services.map((service, idx) => {
                                        const serviceName = service.title || service.id || service.name || `Service ${idx + 1}`;
                                        return (
                                            <span
                                                key={idx}
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                {serviceName}
                                            </span>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}
                    {hoveredTooltip.type === 'events' && eventsData[hoveredTooltip.switchName] && eventsData[hoveredTooltip.switchName].length > 0 && (
                        <div>
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                marginBottom: '0.25rem'
                            }}>
                                Événements et notifications
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                {eventsCount[hoveredTooltip.switchName] || 0} événement(s) sur la période.
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.375rem',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                fontSize: '0.8rem'
                            }}>
                                {eventsData[hoveredTooltip.switchName].slice(0, 10).map((event, idx) => {
                                    let eventText = '';
                                    if (Array.isArray(event)) {
                                        eventText = event[2] || event[1] || 'Événement';
                                    } else {
                                        eventText = event.message || event.text || event.title || 'Événement';
                                    }
                                    return (
                                        <div key={idx} style={{
                                            padding: '0.375rem',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '4px',
                                            color: 'var(--text-primary)'
                                        }}>
                                            {eventText}
                                        </div>
                                    );
                                })()}
                                {eventsData[hoveredTooltip.switchName].length > 10 && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                        ... et {eventsData[hoveredTooltip.switchName].length - 10} autre(s)
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal d'édition pour un switch */}
            {editingSwitch && editForm && (
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
                            Éditer le switch
                        </h3>
                        <button
                            type="button"
                            className={styles.editModalCloseButton}
                            onClick={() => {
                                setEditingSwitch(null);
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
                                        Nom du switch *
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
                                            placeholder="Ex: SW-01"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Adresse IP
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

                                {/* Ligne 2 : Fabricant + Modèle */}
                                <div className={styles.editModalFormRow}>
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
                                            placeholder="Ex: Cisco, HP, Netgear"
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
                                            placeholder="Ex: Catalyst 2960"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 3 : Site + Firmware */}
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
                                        Firmware
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
                                            placeholder="Ex: 15.2(4)E"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 4 : Adresse MAC + Numéro de série */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Adresse MAC
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.adresseMac}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    adresseMac: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 00:1A:2B:3C:4D:5E"
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
                                            placeholder="Ex: FCW1234A5BC"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 5 : VLAN */}
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
                                        placeholder="Ex: 10, 20, 30"
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    {!isSaving && (
                        <div className={styles.editModalFooter}>
                            <button
                                type="button"
                                className={styles.editModalSaveButton}
                                onClick={handleSaveSwitch}
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
        </div>
    );
};

export default Switch;

