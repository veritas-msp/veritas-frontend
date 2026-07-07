import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { FaCloud, FaUsers, FaChartLine, FaFileAlt, FaDatabase, FaChartBar, FaSync, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import { useTheme } from "../../../hooks/useTheme";
import styles from "./O365.module.css";
import commonStyles from "./ModuleCommon.module.css";
import { 
    fetchOffice365Data, 
    testOffice365Connection
} from "../../../api/office365";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../config";
import { scoreToLetter, scoreToColor, scoreToLabel, letterToScore, letterToColor, letterToBackground } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import MetricLetter from "../common/MetricLetter";
import { FaInfoCircle } from "react-icons/fa";
import { getIconPath } from "../../../utils/assetHelper";
import { getClientMfaDetails } from "../../../api/clientOffice365";
// Import des composants O365Tabs
import DashboardTab from "./O365Tabs/DashboardTab";
import LicencesTab from "./O365Tabs/LicencesTab";
import UtilisateursTab from "./O365Tabs/UtilisateursTab";
import ExchangeTab from "./O365Tabs/ExchangeTab";
import TeamsTab from "./O365Tabs/TeamsTab";
import OneDriveTab from "./O365Tabs/OneDriveTab";
import SharePointTab from "./O365Tabs/SharePointTab";
import SecuriteTab from "../../ServicePage/TenantDetailTabs/SecuriteTab";
import { getSortedUsers, getLicenseDisplayName } from "./O365Tabs/utils";

// Options par défaut pour les toasts (bas à droite)
const toastOptions = { position: "bottom-right", autoClose: 3000 };

// Les fonctions utilitaires sont maintenant dans O365Tabs/utils.js

const DASHBOARD_METRIC_KEYS = [
    'totalUsers',
    'activeUsers30',
    'activeUsers90',
    'adoptionRate',
    'totalLicenses',
    'usedLicenses'
];

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const O365 = ({ config, data, setData }) => {
    const { theme } = useTheme();
    const staticData = config?.client?.equipements?.Office365 || {};
    const o365 = data || {};
    const clientId = config?.client?.id;
    const isBrowser = typeof window !== 'undefined';

    useEffect(() => {
        return () => {
            // Component cleanup
        };
    }, []);
    
    // États pour la gestion des vues et données
    const [viewMode, setViewMode] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [apiData, setApiData] = useState(o365?.apiData ?? null);
    const [connectionStatus, setConnectionStatus] = useState(o365?.connectionStatus ?? null);
    const [usersPagination, setUsersPagination] = useState(1); // Page courante pour la pagination des utilisateurs
    const [sharepointPagination, setSharepointPagination] = useState(1); // Page courante pour la pagination des sites SharePoint
    
    // États pour les données spécifiques par section
    const [exchangeData, setExchangeData] = useState(o365?.exchangeData ?? null);
    const [teamsData, setTeamsData] = useState(o365?.teamsData ?? null);
    const [onedriveData, setOnedriveData] = useState(o365?.onedriveData ?? null);
    const [sharepointData, setSharepointData] = useState(o365?.sharepointData ?? null);
    const [securityData, setSecurityData] = useState(o365?.securityData ?? null);
    const [mfaDetails, setMfaDetails] = useState([]);
    
    // État pour le score de sécurité manuel
    const [manualSecurityScore, setManualSecurityScore] = useState(o365?.manualSecurityScore ?? null);
    const [hoveredSecurityTooltip, setHoveredSecurityTooltip] = useState(null); // { mouseX, mouseY, scoreBreakdown }
    
    // États pour suivre le chargement de chaque onglet
    const [loadingTabs, setLoadingTabs] = useState({
        dashboard: false,
        licences: false,
        utilisateurs: false,
        exchange: false,
        teams: false,
        onedrive: false,
        sharepoint: false,
        securite: false
    });
    
    // États pour les filtres et périodes
    const [selectedPeriod, setSelectedPeriod] = useState('D30');
    
    // Fonction pour calculer la période à partir de la période du rapport de monitoring
    const getReportPeriod = useCallback(() => {
        if (config?.client?.checkmkPeriod) {
            const startDate = new Date(config.client.checkmkPeriod.start_time);
            const endDate = new Date(config.client.checkmkPeriod.end_time);
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Convertir en format Microsoft Graph (D7, D30, D90) ou utiliser les dates directement
            if (diffDays <= 7) return 'D7';
            if (diffDays <= 30) return 'D30';
            if (diffDays <= 90) return 'D90';
            return 'D90'; // Par défaut pour les périodes plus longues
        }
        return 'D30'; // Par défaut
    }, [config]);
    
    // États pour le tri des colonnes
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' ou 'desc'

    // Ref pour garder une référence à jour des données
    const dataRef = useRef(o365);
    // Refs pour suivre les valeurs précédentes et éviter les sauvegardes inutiles
    // Initialiser avec les valeurs de o365 si elles existent
    const prevApiDataRef = useRef(o365?.apiData ?? null);
    const prevConnectionStatusRef = useRef(o365?.connectionStatus ?? null);
    const prevExchangeDataRef = useRef(o365?.exchangeData ?? null);
    const prevTeamsDataRef = useRef(o365?.teamsData ?? null);
    const prevOnedriveDataRef = useRef(o365?.onedriveData ?? null);
    const prevSharepointDataRef = useRef(o365?.sharepointData ?? null);
    const prevSecurityDataRef = useRef(o365?.securityData ?? null);
    const prevManualSecurityScoreRef = useRef(o365?.manualSecurityScore ?? null);
    // Ref pour suivre si c'est le premier montage
    const isFirstMountRef = useRef(true);
    // Ref pour suivre si on a déjà sauvegardé les données initiales
    const hasInitialSaveRef = useRef(false);
    
    // Mettre à jour la ref quand o365 change
    useEffect(() => {
        dataRef.current = o365;
    }, [o365]);

    const update = useCallback((patch) => {
        if (!patch || typeof patch !== 'object') {
            return;
        }
        const previous = dataRef.current ?? {};
        const updated = { ...previous, ...patch };
        dataRef.current = updated;
        setData(updated);
    }, [setData]);

    // Fonction helper pour gérer les commentaires par onglet
    const handleCommentChange = useCallback((tab, value) => {
        const comments = o365.comments || {};
        update({ comments: { ...comments, [tab]: value } });
    }, [o365, update]);
    
    // Fonction pour gérer le tri des colonnes
    const handleSort = useCallback((columnKey) => {
        if (sortColumn === columnKey) {
            // Inverser la direction si on clique sur la même colonne
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Nouvelle colonne, trier par ordre croissant
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
        // Réinitialiser la pagination à la page 1 lors d'un changement de tri
        setUsersPagination(1);
    }, [sortColumn, sortDirection]);
    
    // getSortedUsers est maintenant importé depuis O365Tabs/utils.js
    // Wrapper pour utiliser avec useCallback
    const getSortedUsersWrapper = useCallback((users) => {
        return getSortedUsers(users, sortColumn, sortDirection);
    }, [sortColumn, sortDirection]);
    
    // Fonction pour obtenir l'icône de tri
    const getSortIcon = (columnKey) => {
        if (sortColumn !== columnKey) {
            return <FaSort style={{ fontSize: '0.75rem', opacity: 0.4, marginLeft: '0.25rem' }} />;
        }
        return sortDirection === 'asc' 
            ? <FaSortUp style={{ fontSize: '0.75rem', marginLeft: '0.25rem', color: '#3b82f6' }} />
            : <FaSortDown style={{ fontSize: '0.75rem', marginLeft: '0.25rem', color: '#3b82f6' }} />;
    };
    
    const getCommentForTab = useCallback((tab) => {
        return (o365.comments && o365.comments[tab]) || "";
    }, [o365]);
    
    // Fonction helper pour afficher un overlay de chargement
    const renderLoadingOverlay = useCallback((tabKey, label) => {
        // Overlay de chargement désactivé - seul l'overlay de synchronisation est affiché
        return null;
    }, []);
    
    // Fonction helper pour afficher l'overlay de synchronisation globale (comme Antivirus)
    const renderSyncOverlay = useCallback(() => {
        if (!isSyncing) return null;
        
        return (
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                fontSize: '0.75rem',
                zIndex: 9999,
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
        );
    }, [isSyncing, theme]);
    
    // Fonction pour rendre la zone de commentaire (style Antispam)
    const renderCommentSection = useCallback((tab, tabLabel) => (
        <div className={commonStyles.commentSection}>
            <textarea
                id={`comment-o365-${tab}`}
                value={getCommentForTab(tab)}
                onChange={(e) => handleCommentChange(tab, e.target.value)}
                placeholder={`Commentaire sur ${tabLabel.toLowerCase()}...`}
                className={commonStyles.commentInput}
                rows="3"
            />
        </div>
    ), [getCommentForTab, handleCommentChange]);
    
    const renderSyncPlaceholder = useCallback(() => (
        <div className={styles.noDataMessage}>
            <p></p>
        </div>
    ), []);
    
    // Fonction pour charger les données depuis la base de données (comme TenantDetailPage.js)
    const loadStoredData = useCallback(async () => {
        if (!clientId) return;

        try {
            // 1. Récupérer les credentials Azure du client pour vérifier le tenantId
            let expectedTenantId = null;
            try {
                const credResponse = await fetch(
                    `${API_BASE_URL}/client-office365/${clientId}`,
                    { credentials: 'include' }
                );
                if (credResponse.ok) {
                    const credResult = await credResponse.json();
                    expectedTenantId = credResult?.credentials?.tenantId || null;
                }
            } catch (credErr) {
                // Ignorer les erreurs de récupération des credentials
            }

            // 2. Récupérer les snapshots depuis v_b_clients_m_o365
            const response = await fetch(
                `${API_BASE_URL}/clients/${clientId}/o365`,
                { 
                    credentials: 'include'
                }
            );

            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data?.length > 0) {
                    // Filtrer les snapshots pour ne garder que ceux qui correspondent au tenantId du client
                    let tenantRecord = null;
                    
                    if (expectedTenantId) {
                        // Chercher le snapshot correspondant au tenantId du client
                        tenantRecord = result.data.find(
                            t => t.data?.tenantId === expectedTenantId || t.item_key === expectedTenantId
                        );
                    }
                    
                    // Si pas trouvé par tenantId, prendre le snapshot le plus récent pour ce client
                    if (!tenantRecord && result.data.length > 0) {
                        tenantRecord = result.data[0]; // Déjà trié par updated_at DESC
                    }
                    
                    // Vérifier que le snapshot correspond bien au client
                    if (tenantRecord && expectedTenantId && tenantRecord.data?.tenantId && tenantRecord.data.tenantId !== expectedTenantId) {
                        // Ne pas charger les données si elles ne correspondent pas
                        return;
                    }

                    if (tenantRecord && tenantRecord.data) {
                        const snapshotData = tenantRecord.data;
                        
                        // Extraire les données principales
                        if (snapshotData.users || snapshotData.licences) {
                            setApiData({
                                success: true,
                                users: snapshotData.users || [],
                                licences: snapshotData.licences || [],
                                adoptionScore: snapshotData.adoptionScore || null
                            });
                        }
                        
                        // Extraire les données spécifiques par section
                        if (snapshotData.exchangeData !== null && snapshotData.exchangeData !== undefined) {
                            setExchangeData(snapshotData.exchangeData);
                        } else if (snapshotData.exchange) {
                            setExchangeData(snapshotData.exchange);
                        } else {
                            setExchangeData(null);
                        }
                        
                        if (snapshotData.teamsData !== null && snapshotData.teamsData !== undefined) {
                            setTeamsData(snapshotData.teamsData);
                        } else if (snapshotData.teams) {
                            setTeamsData(snapshotData.teams);
                        } else {
                            setTeamsData(null);
                        }
                        
                        if (snapshotData.onedriveData !== null && snapshotData.onedriveData !== undefined) {
                            setOnedriveData(snapshotData.onedriveData);
                        } else if (snapshotData.onedrive) {
                            setOnedriveData(snapshotData.onedrive);
                        } else {
                            setOnedriveData(null);
                        }
                        
                        if (snapshotData.sharepointData !== null && snapshotData.sharepointData !== undefined) {
                            setSharepointData(snapshotData.sharepointData);
                        } else if (snapshotData.sharepoint) {
                            setSharepointData(snapshotData.sharepoint);
                        } else {
                            setSharepointData(null);
                        }
                        
                        if (snapshotData.securityData !== null && snapshotData.securityData !== undefined) {
                            setSecurityData(snapshotData.securityData);
                        } else if (snapshotData.security) {
                            setSecurityData(snapshotData.security);
                        } else {
                            setSecurityData(null);
                        }
                        
                        setConnectionStatus(snapshotData.connectionStatus || null);
                    }
                }
            }
        } catch (error) {
            // Ignorer les erreurs de chargement
        }
    }, [clientId]);

    // Charger les détails MFA (même source que TenantDetailPage) pour l'onglet Sécurité
    useEffect(() => {
        if (!clientId) return;
        let cancelled = false;
        getClientMfaDetails(clientId)
            .then((result) => {
                if (!cancelled && result?.userMfaDetails) {
                    setMfaDetails(result.userMfaDetails);
                }
            })
            .catch(() => {
                if (!cancelled) setMfaDetails([]);
            });
        return () => { cancelled = true; };
    }, [clientId]);

    // Fonction pour charger les données depuis l'API via /sync-all (comme TenantDetailPage.js)
    const loadDataFromAPI = useCallback(async () => {
        if (!clientId) {
            toast.warning("ID client manquant", toastOptions);
            return;
        }
        
        setIsSyncing(true);
        // Réinitialiser tous les états de chargement
        setLoadingTabs({
            dashboard: true,
            licences: true,
            utilisateurs: true,
            exchange: true,
            teams: true,
            onedrive: true,
            sharepoint: true,
            securite: true
        });
        
        try {
            // Préparer les paramètres de période
            const reportPeriod = getReportPeriod();
            let startDate = null;
            let endDate = null;
            if (config?.client?.checkmkPeriod) {
                startDate = config.client.checkmkPeriod.start_time;
                endDate = config.client.checkmkPeriod.end_time;
                        } else {
                // Par défaut, utiliser la période D30
                const endDateObj = new Date();
                const startDateObj = new Date();
                startDateObj.setDate(startDateObj.getDate() - 30);
                startDate = startDateObj.toISOString();
                endDate = endDateObj.toISOString();
            }

            // Appeler /sync-all qui synchronise TOUT et sauvegarde en base
            const headers = {
                'Content-Type': 'application/json',
            };

            const syncResponse = await fetch(
                `${API_BASE_URL}/office365/sync-all?clientId=${clientId}&period=${reportPeriod}&startDate=${startDate}&endDate=${endDate}`,
                {
                    method: 'GET',
                    headers,
                    credentials: 'include',
                }
            );

            const syncResult = await syncResponse.json().catch(() => ({}));

            if (!syncResponse.ok || !syncResult.success) {
                throw new Error(syncResult.error || `Erreur HTTP ${syncResponse.status}`);
            }

            // VÉRIFICATION CRITIQUE : S'assurer que les données retournées correspondent bien au client
            // Récupérer les credentials Azure du client pour vérifier le tenantId
            let expectedTenantId = null;
            try {
                const credResponse = await fetch(
                    `${API_BASE_URL}/client-office365/${clientId}`,
                    { credentials: 'include' }
                );
                if (credResponse.ok) {
                    const credResult = await credResponse.json();
                    expectedTenantId = credResult?.credentials?.tenantId || null;
                }
            } catch (credErr) {
                // Ignorer les erreurs de vérification des credentials
            }

            // Vérifier que le tenantId dans les données synchronisées correspond bien au client
            if (expectedTenantId && syncResult.data?.tenantId && syncResult.data.tenantId !== expectedTenantId) {
                throw new Error(`Les données synchronisées ne correspondent pas au client ${clientId}. TenantId attendu: ${expectedTenantId}, reçu: ${syncResult.data.tenantId}`);
            }

            // Recharger les données depuis la base après la synchronisation
            await loadStoredData();
            
            // Débloquer tous les onglets
            setLoadingTabs({
                dashboard: false,
                licences: false,
                utilisateurs: false,
                exchange: false,
                teams: false,
                onedrive: false,
                sharepoint: false,
                securite: false
            });
            
                        setIsSyncing(false);
                        toast.success("Synchronisation terminée", toastOptions);
            
        } catch (error) {
            toast.error(error?.message || "Erreur lors de la synchronisation", toastOptions);

            // En cas d'erreur, nettoyer les données locales
            setApiData(null);
            setConnectionStatus(null);
            setExchangeData(null);
            setTeamsData(null);
            setOnedriveData(null);
            setSharepointData(null);
            setSecurityData(null);

            // Propager le reset dans le store parent
            update({
                apiData: null,
                connectionStatus: null,
                exchangeData: null,
                teamsData: null,
                onedriveData: null,
                sharepointData: null,
                securityData: null,
            });

            // Réinitialiser tous les états de chargement en cas d'erreur
            setLoadingTabs({
                dashboard: false,
                licences: false,
                utilisateurs: false,
                exchange: false,
                teams: false,
                onedrive: false,
                sharepoint: false,
                securite: false
            });
            setIsSyncing(false);
        }
    }, [clientId, update, getReportPeriod, config, loadStoredData]);

    // Charger les données depuis la base au démarrage (comme TenantDetailPage.js)
    useEffect(() => {
        if (clientId) {
            loadStoredData();
        }
    }, [clientId, loadStoredData]);

    useEffect(() => {
        if (!isBrowser) return;
        window.__office365SyncTrigger = loadDataFromAPI;
        window.dispatchEvent(new CustomEvent('office365-sync-available', { detail: { available: true } }));
        return () => {
            if (window.__office365SyncTrigger === loadDataFromAPI) {
                delete window.__office365SyncTrigger;
                window.dispatchEvent(new CustomEvent('office365-sync-available', { detail: { available: false } }));
                window.dispatchEvent(new CustomEvent('office365-sync-state', { detail: { isSyncing: false } }));
            }
        };
    }, [loadDataFromAPI, isBrowser]);

    useEffect(() => {
        if (!isBrowser) return;
        window.__office365SyncIsSyncing = isSyncing;
        window.dispatchEvent(new CustomEvent('office365-sync-state', { detail: { isSyncing } }));
    }, [isSyncing, isBrowser]);

    useEffect(() => {
        if (isSyncing) return;
        setLoadingTabs(prev => {
            if (!prev || !Object.values(prev).some(Boolean)) {
                return prev;
            }
            const reset = {};
            Object.keys(prev).forEach(key => {
                reset[key] = false;
            });
            return reset;
        });
    }, [isSyncing]);
    
    // Restaurer les données depuis o365 (quand o365 change ou au montage)
    useEffect(() => {
        const hasData = o365 && Object.keys(o365).length > 0;
        if (!hasData) {
            if (isFirstMountRef.current) {
                isFirstMountRef.current = false;
            }
            return;
        }

        const assignIfNeeded = (incoming, setter) => {
            if (incoming === undefined) return;
            setter((prev) => {
                if (prev === incoming) return prev;
                return incoming;
            });
        };


        assignIfNeeded(o365.apiData, setApiData, 'apiData');
        assignIfNeeded(o365.connectionStatus, setConnectionStatus, 'connectionStatus');
        assignIfNeeded(o365.exchangeData, setExchangeData, 'exchangeData');
        assignIfNeeded(o365.teamsData, setTeamsData, 'teamsData');
        assignIfNeeded(o365.onedriveData, setOnedriveData, 'onedriveData');
        assignIfNeeded(o365.sharepointData, setSharepointData, 'sharepointData');
        assignIfNeeded(o365.securityData, setSecurityData, 'securityData');
        assignIfNeeded(o365.manualSecurityScore, setManualSecurityScore, 'manualSecurityScore');

        if (isFirstMountRef.current) {
            isFirstMountRef.current = false;
        }

        dataRef.current = o365;
    }, [
        o365,
        setApiData,
        setConnectionStatus,
        setExchangeData,
        setTeamsData,
        setOnedriveData,
        setSharepointData,
        setSecurityData,
        setManualSecurityScore
    ]);

    // Persister automatiquement les données critiques dans le store parent
    // Ne sauvegarder que si les données ont vraiment changé
    useEffect(() => {
        if (!update) return;
        
        // Vérifier si les données ont changé en comparant avec les valeurs précédentes
        const hasChanged = 
            (apiData !== prevApiDataRef.current) ||
            (connectionStatus !== prevConnectionStatusRef.current) ||
            (exchangeData !== prevExchangeDataRef.current) ||
            (teamsData !== prevTeamsDataRef.current) ||
            (onedriveData !== prevOnedriveDataRef.current) ||
            (sharepointData !== prevSharepointDataRef.current) ||
            (securityData !== prevSecurityDataRef.current) ||
            (manualSecurityScore !== prevManualSecurityScoreRef.current);
        
        // Vérifier s'il y a des données à sauvegarder
        const hasDataToSave = 
            (apiData !== null && apiData !== undefined) ||
            (connectionStatus !== null && connectionStatus !== undefined) ||
            (exchangeData !== null && exchangeData !== undefined) ||
            (teamsData !== null && teamsData !== undefined) ||
            (onedriveData !== null && onedriveData !== undefined) ||
            (sharepointData !== null && sharepointData !== undefined) ||
            (securityData !== null && securityData !== undefined) ||
            (manualSecurityScore !== null && manualSecurityScore !== undefined);
        
        // Si rien n'a changé et qu'on a déjà fait la sauvegarde initiale, ne pas sauvegarder
        if (!hasChanged && hasInitialSaveRef.current) return;
        
        // Si on a des données à sauvegarder mais qu'elles n'ont pas changé, 
        // forcer la sauvegarde une fois au montage pour s'assurer de la persistance
        if (!hasChanged && hasDataToSave && !hasInitialSaveRef.current) {
            hasInitialSaveRef.current = true;
        }
        
        // Construire l'objet avec toutes les données actuelles
        // Ne sauvegarder que les données qui existent (pas null/undefined)
        const patches = {};
        
        if (apiData !== null && apiData !== undefined) {
            patches.apiData = apiData;
        }
        if (connectionStatus !== null && connectionStatus !== undefined) {
            patches.connectionStatus = connectionStatus;
        }
        if (exchangeData !== null && exchangeData !== undefined) {
            patches.exchangeData = exchangeData;
        }
        if (teamsData !== null && teamsData !== undefined) {
            patches.teamsData = teamsData;
        }
        if (onedriveData !== null && onedriveData !== undefined) {
            patches.onedriveData = onedriveData;
        }
        if (sharepointData !== null && sharepointData !== undefined) {
            patches.sharepointData = sharepointData;
        }
        if (securityData !== null && securityData !== undefined) {
            patches.securityData = securityData;
        }
        if (manualSecurityScore !== null && manualSecurityScore !== undefined) {
            patches.manualSecurityScore = manualSecurityScore;
        }
        
        // Sauvegarder seulement s'il y a des données à sauvegarder
        if (Object.keys(patches).length > 0) {
            update(patches);
            
            // Mettre à jour les refs après la sauvegarde
            prevApiDataRef.current = apiData;
            prevConnectionStatusRef.current = connectionStatus;
            prevExchangeDataRef.current = exchangeData;
            prevTeamsDataRef.current = teamsData;
            prevOnedriveDataRef.current = onedriveData;
            prevSharepointDataRef.current = sharepointData;
            prevSecurityDataRef.current = securityData;
            prevManualSecurityScoreRef.current = manualSecurityScore;
            
            // Marquer que la sauvegarde initiale a été effectuée
            hasInitialSaveRef.current = true;
        }
    }, [
        apiData,
        connectionStatus,
        exchangeData,
        teamsData,
        onedriveData,
        sharepointData,
        securityData,
        manualSecurityScore,
        update
    ]);

    // Réinitialiser la pagination des utilisateurs quand on change d'onglet
    useEffect(() => {
        if (viewMode === 'utilisateurs') {
            setUsersPagination(1);
        }
        if (viewMode === 'sharepoint') {
            setSharepointPagination(1);
        }
    }, [viewMode]);
    
    // Ne plus charger automatiquement les données lors du changement d'onglet
    // Les données sont chargées uniquement via le bouton SYNC
    
    // Les fonctions formatDate, formatDateTime et formatBytes sont maintenant importées depuis O365Tabs/utils.js
    
    // Calcul du score de sécurité basé sur le score d'identité sécurisée (Entra ID) avec fallback MFA
    const calculateSecurityScore = () => {
        // Si pas de données de sécurité, retourner null
        if (!securityData) {
            return null;
        }
        
        let fallbackScore = 100;
        const fallbackFactors = [];
        
        // 1. Taux MFA des utilisateurs (0-50 points)
        const totalUsers = apiData?.users?.length || 0;
        const usersWithMFA = securityData?.mfa?.usersWithMFA || 0;
        const mfaRate = totalUsers > 0 ? (usersWithMFA / totalUsers) * 100 : (securityData ? 0 : null);
        if (mfaRate !== null) {
            const mfaScore = (mfaRate / 100) * 50;
            fallbackScore -= (50 - mfaScore);
            fallbackFactors.push({ name: 'MFA Utilisateurs', value: mfaRate, weight: 50, earnedPoints: Math.round(mfaScore) });
        }
        
        // 2. Taux MFA des administrateurs (0-50 points) - Plus important
        const totalAdmins = securityData?.adminStats?.total || 0;
        const adminsWithMFA = securityData?.adminStats?.withMFA || 0;
        const adminMfaRate = totalAdmins > 0 ? (adminsWithMFA / totalAdmins) * 100 : (securityData ? 100 : null); // Si pas d'admins mais données disponibles, considérer comme parfait
        if (adminMfaRate !== null) {
            const adminMfaScore = (adminMfaRate / 100) * 50;
            fallbackScore -= (50 - adminMfaScore);
            fallbackFactors.push({ name: 'MFA Administrateurs', value: adminMfaRate, weight: 50, earnedPoints: Math.round(adminMfaScore) });
        }
        
        // S'assurer que le score fallback est entre 0 et 100
        fallbackScore = Math.max(0, Math.min(100, fallbackScore));
        const fallbackResult = {
            score: Math.round(fallbackScore),
            factors: fallbackFactors,
            mfaRate: mfaRate || 0,
            adminMfaRate: adminMfaRate || 0,
            source: 'calculated'
        };
        
        // Si le score d'identité sécurisée (Entra ID) est disponible, l'utiliser comme référence principale
        const secureScorePercentage = typeof securityData?.secureScore?.percentage === 'number'
            ? Math.max(0, Math.min(100, securityData.secureScore.percentage))
            : null;
        
        if (secureScorePercentage !== null) {
            return {
                score: Math.round(secureScorePercentage),
                preciseScore: secureScorePercentage,
                factors: [{
                    name: "Score d'identité sécurisée (Entra ID)",
                    value: `${Number(securityData.secureScore.currentScore ?? 0).toFixed(2)}/${securityData.secureScore.maxScore || 0}`,
                    weight: 100,
                    earnedPoints: Math.round(secureScorePercentage)
                }],
                mfaRate: mfaRate || 0,
                adminMfaRate: adminMfaRate || 0,
                source: 'entraIdSecureScore'
            };
        }
        
        // Sinon, fallback sur le calcul maison
        return fallbackResult;
    };
    
    // Calculs pour le Dashboard
    const calculateDashboardMetrics = () => {
        const users = apiData?.users || [];
        const licences = apiData?.licences || [];
        const now = new Date();
        const period30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const period90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        
        // Utilisateurs actifs
        const activeUsers30 = users.filter(u => {
            const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
            return lastLogin && lastLogin >= period30Days;
        }).length;
        
        const activeUsers90 = users.filter(u => {
            const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
            return lastLogin && lastLogin >= period90Days;
        }).length;
        
        // Taux d'adoption (utilisateurs avec activité récente)
        const adoptionRate = users.length > 0 ? Math.round((activeUsers30 / users.length) * 100) : 0;
        
        // Filtrer les licences illimitées pour le calcul du total
        const validLicences = licences.filter(lic => {
          const total = lic.total || 0;
          return total < 10000 && total > 0;
        });
        const totalLicenses = validLicences.reduce((sum, lic) => sum + (lic.total || 0), 0);
        const usedLicenses = validLicences.reduce((sum, lic) => sum + (lic.utilisees || 0), 0);
        
        return {
            totalUsers: users.length,
            activeUsers30,
            activeUsers90,
            adoptionRate,
            totalLicenses,
            usedLicenses
        };
    };
    
    // Calculs pour les licences
    const calculateLicenseMetrics = () => {
        const licences = apiData?.licences || [];
        const users = apiData?.users || [];
        
        // Répartition par type
        const licenseTypes = {};
        licences.forEach(lic => {
            const type = getLicenseDisplayName(lic.nom || lic.displayName);
            if (!licenseTypes[type]) {
                licenseTypes[type] = {
                    total: 0,
                    used: 0,
                    available: 0,
                    skuId: lic.skuId
                };
            }
            licenseTypes[type].total += lic.total || 0;
            licenseTypes[type].used += lic.utilisees || 0;
            licenseTypes[type].available += lic.disponibles || 0;
        });
        
        // Licences inutilisées (utilisateurs sans activité)
        const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const inactiveUsers = users.filter(u => {
            const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
            return !lastLogin || lastLogin < period90Days;
        });
        
        // Expiration des licences (si disponible)
        const expiringLicenses = licences.filter(lic => {
            if (!lic.expirationDate) return false;
            const expDate = new Date(lic.expirationDate);
            const daysUntilExpiry = (expDate - new Date()) / (1000 * 60 * 60 * 24);
            return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
        });
        
        return {
            licenseTypes,
            inactiveUsers: inactiveUsers.length,
            expiringLicenses
        };
    };
    
    const dashboardMetrics = calculateDashboardMetrics();
    const licenseMetrics = calculateLicenseMetrics();
    const securityScore = calculateSecurityScore();
    const [animatedDashboardMetrics, setAnimatedDashboardMetrics] = useState(dashboardMetrics);
    const dashboardMetricsAnimationRef = useRef(null);
    const animatedDashboardMetricsRef = useRef(dashboardMetrics);
    
    // États pour l'édition manuelle du score de sécurité
    const [editingSecurityScore, setEditingSecurityScore] = useState(false);
    const [editingSecurityScoreValue, setEditingSecurityScoreValue] = useState(null);
    const [recommendationSort, setRecommendationSort] = useState({ column: 'points', direction: 'desc' });
    const securityScoreBaseValue = manualSecurityScore !== null ? manualSecurityScore : (securityScore?.score ?? null);
    const [animatedSecurityScore, setAnimatedSecurityScore] = useState(securityScoreBaseValue);
    const securityScoreAnimationRef = useRef(null);
    const animatedSecurityScoreRef = useRef(securityScoreBaseValue);
    const isManualChangeRef = useRef(false);

    useEffect(() => {
        animatedDashboardMetricsRef.current = animatedDashboardMetrics;
    }, [animatedDashboardMetrics]);

    useEffect(() => {
        if (!dashboardMetrics) return;
        if (dashboardMetricsAnimationRef.current) {
            cancelAnimationFrame(dashboardMetricsAnimationRef.current);
        }
        const targetValues = dashboardMetrics;
        const startValues = animatedDashboardMetricsRef.current || dashboardMetrics;
        const startTime = performance.now();
        const duration = 1200;

        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = easeOutCubic(progress);
            const next = {};
            DASHBOARD_METRIC_KEYS.forEach((key) => {
                const start = typeof startValues?.[key] === 'number' ? startValues[key] : 0;
                const end = typeof targetValues?.[key] === 'number' ? targetValues[key] : 0;
                next[key] = Math.round(start + (end - start) * eased);
            });
            setAnimatedDashboardMetrics(next);
            if (progress < 1) {
                dashboardMetricsAnimationRef.current = requestAnimationFrame(tick);
            }
        };

        dashboardMetricsAnimationRef.current = requestAnimationFrame(tick);

        return () => {
            if (dashboardMetricsAnimationRef.current) {
                cancelAnimationFrame(dashboardMetricsAnimationRef.current);
            }
        };
    }, [dashboardMetrics]);

    useEffect(() => {
        animatedSecurityScoreRef.current = animatedSecurityScore;
    }, [animatedSecurityScore]);

    useEffect(() => {
        // Si c'est un changement manuel, ne pas animer
        if (isManualChangeRef.current) {
            isManualChangeRef.current = false;
            return;
        }

        if (securityScoreAnimationRef.current) {
            cancelAnimationFrame(securityScoreAnimationRef.current);
        }

        if (securityScoreBaseValue === null || securityScoreBaseValue === undefined) {
            setAnimatedSecurityScore(null);
            animatedSecurityScoreRef.current = null;
            return;
        }

        const startValue = typeof animatedSecurityScoreRef.current === 'number'
            ? animatedSecurityScoreRef.current
            : securityScoreBaseValue;
        const targetValue = securityScoreBaseValue;
        const startTime = performance.now();
        const duration = 1200;

        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = easeOutCubic(progress);
            const value = startValue + (targetValue - startValue) * eased;
            setAnimatedSecurityScore(Math.round(value));
            if (progress < 1) {
                securityScoreAnimationRef.current = requestAnimationFrame(tick);
            }
        };

        securityScoreAnimationRef.current = requestAnimationFrame(tick);

        return () => {
            if (securityScoreAnimationRef.current) {
                cancelAnimationFrame(securityScoreAnimationRef.current);
            }
        };
    }, [securityScoreBaseValue]);
    
    const identitySecureScoreData = securityData?.secureScore || null;
    const defenderScoreData = securityData?.defenderSecureScore || null;
    const identityScoreCurrent = identitySecureScoreData?.currentScore ?? null;
    const identityScoreMax = identitySecureScoreData?.maxScore ?? null;
    const identityScorePercentageCalculated = identitySecureScoreData?.percentage ?? (
        identityScoreCurrent !== null && identityScoreMax
            ? Math.round((identityScoreCurrent / identityScoreMax) * 1000) / 10
            : null
    );
    // Utiliser le score manuel s'il existe, sinon le score calculé
    const identityScorePercentage = manualSecurityScore !== null ? manualSecurityScore : identityScorePercentageCalculated;
    const identityScoreLetter = identityScorePercentage !== null ? scoreToLetter(identityScorePercentage) : null;
    const identityScoreLetterColor = letterToColor(identityScoreLetter);
    const identityScoreLetterBackground = letterToBackground(identityScoreLetter);
    const identityScoreLabel = identityScorePercentage !== null ? scoreToLabel(identityScorePercentage) : 'En attente';
    
    // Le tri des recommandations est maintenant géré dans SecuriteTab.js
    
    const currentTabIsLoading = !!loadingTabs[viewMode];
    
    return (
        <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.o365Card}>
                    {/* En-tête de la carte */}
                    <div className={styles.cardHeader} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', paddingBottom: '1rem' }}>
                        <div className={styles.headerLeft} style={{ zIndex: 1 }}>
                            <div className={styles.o365Info}>
                                <h3 className={styles.o365Name}>
                                <img 
                                    src={getIconPath('office365.png')} 
                                    alt="Office 365" 
                                    style={{ width: '24px', height: '24px', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} 
                                />
                                    Microsoft 365
                                </h3>
                            {connectionStatus && (
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    {connectionStatus.organization || "Connecté"}
                                </p>
                            )}
                            </div>
                        </div>

                        {/* Navigation par icônes (onglets) - centrée */}
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '-15px',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 2
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                background: theme === 'dark' ? '#2d2d4f' : '#f3f4f6',
                                padding: '0.25rem',
                                borderRadius: '8px',
                                border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                                pointerEvents: 'auto',
                                flexWrap: 'nowrap'
                            }}>
                    {[
                        { key: 'dashboard', icon: 'mdi:view-dashboard', label: 'Dashboard' },
                        { key: 'licences', icon: 'mdi:license', label: 'Licences' },
                        { key: 'utilisateurs', icon: 'mdi:account-multiple', label: 'Utilisateurs' },
                        { key: 'exchange', icon: 'simple-icons:microsoftexchange', label: 'Exchange' },
                        { key: 'teams', icon: 'simple-icons:microsoftteams', label: 'Teams' },
                        { key: 'onedrive', icon: 'entypo-social:onedrive', label: 'OneDrive' },
                        { key: 'sharepoint', icon: 'mdi:microsoft-sharepoint', label: 'SharePoint' },
                        { key: 'securite', icon: 'mdi:shield-check', label: 'Sécurité' }
                    ].map(tab => {
                        const isLoading = !!loadingTabs[tab.key];
                        const isDisabled = isLoading;
                        const isActive = viewMode === tab.key;
                        
                        return (
                        <button
                            key={tab.key}
                                onClick={() => {
                                    if (!isDisabled) {
                                        setViewMode(tab.key);
                                    }
                                }}
                            style={{
                                padding: '0.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                minWidth: '70px',
                                width: '70px',
                                color: isActive
                                    ? (theme === 'dark' ? '#f9fafb' : '#111827')
                                    : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                                background: isActive 
                                    ? (theme === 'dark' ? '#1e1e3f' : '#ffffff') 
                                    : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: isLoading ? 0.5 : 1,
                                boxShadow: isActive
                                    ? '0 2px 4px rgba(0,0,0,0.1)' 
                                    : 'none',
                                pointerEvents: isDisabled ? 'none' : 'auto'
                            }}
                                title={isLoading ? 'Chargement en cours...' : tab.label}
                        >
                                <IconifyIcon
                                    icon={tab.icon}
                                    width={20}
                                    height={20}
                                    style={{
                                        pointerEvents: 'none'
                                    }}
                                />
                                <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none'
                                }}>
                                    {tab.label}
                                </span>
                        </button>
                        );
                    })}
                            </div>
                        </div>

                        {/* Barre d'action droite */}
                        <div className={styles.headerRight} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                            <button
                                type="button"
                                className={`${commonStyles.syncButton} ${!apiData && !isSyncing ? commonStyles.syncButtonAttention : ''}`}
                                onClick={loadDataFromAPI}
                                disabled={isSyncing}
                                title={!apiData ? "Synchroniser les données Office 365 (synchronisation requise)" : "Synchroniser les données Office 365"}
                            >
                                <IconifyIcon
                                    icon="material-symbols:sync"
                                    width={14}
                                    height={14}
                                    style={{ 
                                        animation: isSyncing ? 'spin 1s linear infinite' : 'none'
                                    }}
                                />
                            </button>
                            
                        </div>
                    </div>
                
                {/* Contenu conditionnel selon la vue active */}
                <div
                    style={{
                        position: 'relative',
                        minHeight: '400px',
                        marginTop: '3rem',
                        opacity: currentTabIsLoading ? 0.4 : (isSyncing ? 0.5 : 1),
                        filter: currentTabIsLoading ? 'grayscale(0.25)' : 'none',
                        pointerEvents: currentTabIsLoading ? 'none' : 'auto',
                        transition: 'opacity 0.2s ease, filter 0.2s ease'
                    }}
                >
                    {renderSyncOverlay()}
                    <div>
                        {viewMode === 'dashboard' && (
                                <DashboardTab
                                  detailData={{ clientName: config?.client?.name || config?.client?.nom || '' }}
                                  dashboardMetrics={dashboardMetrics}
                                animatedDashboardMetrics={animatedDashboardMetrics}
                                  adoptionScore={apiData?.adoptionScore || null}
                                  tenantId={config?.client?.equipements?.Office365?.tenantId || null}
                                theme={theme}
                                securityScore={securityScore}
                                securityScoreBaseValue={securityScoreBaseValue}
                                editingSecurityScore={editingSecurityScore}
                                editingSecurityScoreValue={editingSecurityScoreValue}
                                setEditingSecurityScore={setEditingSecurityScore}
                                setEditingSecurityScoreValue={setEditingSecurityScoreValue}
                                setManualSecurityScore={setManualSecurityScore}
                                update={update}
                                animatedSecurityScore={animatedSecurityScore}
                                setAnimatedSecurityScore={setAnimatedSecurityScore}
                                animatedSecurityScoreRef={animatedSecurityScoreRef}
                                isManualChangeRef={isManualChangeRef}
                                hoveredSecurityTooltip={hoveredSecurityTooltip}
                                setHoveredSecurityTooltip={setHoveredSecurityTooltip}
                                renderCommentSection={renderCommentSection}
                            />
                        )}

                        {viewMode === 'licences' && (
                                <LicencesTab
                                  licences={apiData?.licences || []}
                                  dashboardMetrics={dashboardMetrics}
                                  theme={theme}
                                renderCommentSection={renderCommentSection}
                                />
                        )}
                        
                        {/* Vue Utilisateurs */}
                        {viewMode === 'utilisateurs' && (
                            <UtilisateursTab
                                users={apiData?.users || []}
                                dashboardMetrics={dashboardMetrics}
                                theme={theme}
                                sortColumn={sortColumn}
                                sortDirection={sortDirection}
                                handleSort={handleSort}
                                getSortIcon={getSortIcon}
                                renderCommentSection={renderCommentSection}
                                renderSyncPlaceholder={renderSyncPlaceholder}
                            />
                        )}
                        
                        {/* Vue Exchange */}
                        {viewMode === 'exchange' && (
                            <ExchangeTab
                                exchangeData={exchangeData}
                                theme={theme}
                                renderCommentSection={renderCommentSection}
                                renderSyncPlaceholder={renderSyncPlaceholder}
                            />
                        )}
                        
                        {/* Vue Teams */}
                        {viewMode === 'teams' && (
                            <TeamsTab
                                teamsData={teamsData}
                                theme={theme}
                                renderCommentSection={renderCommentSection}
                                renderSyncPlaceholder={renderSyncPlaceholder}
                            />
                        )}
                        
                        {/* Vue OneDrive */}
                        {viewMode === 'onedrive' && (
                            <OneDriveTab
                                onedriveData={onedriveData}
                                theme={theme}
                                renderCommentSection={renderCommentSection}
                                renderSyncPlaceholder={renderSyncPlaceholder}
                            />
                        )}
                        
                        {/* Vue SharePoint */}
                        {viewMode === 'sharepoint' && (
                            <SharePointTab
                                sharepointData={sharepointData}
                                theme={theme}
                                renderCommentSection={renderCommentSection}
                                renderSyncPlaceholder={renderSyncPlaceholder}
                            />
                        )}
                        
                        {/* Vue Sécurité · mêmes données et cartes que TenantDetailTabs/SecuriteTab */}
                        {viewMode === 'securite' && (
                            <>
                                <SecuriteTab
                                    securityData={securityData}
                                    users={apiData?.users || []}
                                    mfaDetails={mfaDetails}
                                    theme={theme}
                                />
                                {renderCommentSection && renderCommentSection('securite', 'Sécurité')}
                            </>
                        )}
                        
                                                </div>
                                                        </div>
            </div>

            {/* Tooltip global qui suit la souris */}
            {hoveredSecurityTooltip && (
                <div style={{
                    position: 'fixed',
                    left: `${hoveredSecurityTooltip.mouseX + 10}px`,
                    top: `${hoveredSecurityTooltip.mouseY + 10}px`,
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
                            {(hoveredSecurityTooltip.scoreBreakdown || []).map((item, idx) => (
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
                                        {item.value && (
                                            <div style={{
                                                fontSize: '0.8rem',
                                                color: '#6b7280',
                                                lineHeight: 1.4,
                                                marginBottom: '0.25rem'
                                            }}>
                                                Valeur: {item.value}
                                            </div>
                                        )}
                                        {item.description && (
                                            <div style={{
                                                fontSize: '0.8rem',
                                                color: '#6b7280',
                                                lineHeight: 1.4
                                            }}>
                                                {item.description}
                                            </div>
                                        )}
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

export default O365;
