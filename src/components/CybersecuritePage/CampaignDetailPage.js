// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { useState, useEffect, useRef, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaArrowLeft, FaEdit, FaTrash, FaSave, FaTimes, FaRocket, FaFlagCheckered, FaSpinner, FaQuestionCircle, FaSync, FaUndo } from "react-icons/fa";
import { toast } from 'react-toastify';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllCampaigns, updateClientCampaign, deleteCampaign, launchCampaign, finishCampaign, resetCampaign, getCampaignStats } from "../../api/campaigns";
import { fetchClientsList } from "../../api/clients";
import { getClientOffice365Credentials } from "../../api/clientOffice365";
import CampaignSteps from "./CampaignSteps";
import MicrosoftSecurityStats from "./MicrosoftSecurityStats";
import CampaignTools from "./CampaignTools";
import CampaignAdoptionStats from "./CampaignAdoptionStats";
import API_BASE_URL from "../../config.js";
import styles from "./CampaignDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCyberModalsCopy } from "./cyberModalsI18n";

// ──────────────────────────────
// 🧩 Composant : CampaignDetailPage
// ──────────────────────────────

// Types de campagnes
const CAMPAIGN_TYPES = [
  { value: 'microsoft_security', label: 'Sécurité Microsoft' },
  { value: 'cybersecurity_training', label: 'Formation cybersécurité' },
  { value: 'rgpd_audit', label: 'Audit conformité RGPD' },
  { value: 'penetration_test', label: 'Test de pénétration' },
  { value: 'phishing_simulation', label: 'Simulation de phishing' },
  { value: 'vulnerability_scan', label: 'Scan de vulnérabilités' },
  { value: 'incident_response', label: 'Réponse aux incidents' },
  { value: 'compliance_audit', label: 'Audit de conformité' }
];

/** Âge max de la dernière synchro pour autoriser le lancement (24 h) */
const RECENT_SYNC_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// États des campagnes
const CAMPAIGN_STATUSES = [
  { value: 'en_preparation', label: 'En préparation', color: '#fbbf24' },
  { value: 'active', label: 'Active', color: '#10b981' },
  { value: 'suspendue', label: 'Suspendue', color: '#ef4444' },
  { value: 'inactive', label: 'Terminée', color: '#6b7280' }
];

export default function CampaignDetailPage({ onNavigate, campaignData }) {
  const locale = useAppLocale();
  const cyberCopy = useMemo(() => getCyberModalsCopy(locale), [locale]);
  const CAMPAIGN_DETAIL_CLIENTS_CACHE_KEY = "campaign_detail_clients_list_cache_v1";
  const CAMPAIGN_DETAIL_CLIENTS_CACHE_TTL_MS = 5 * 60 * 1000;
  const CAMPAIGN_DETAIL_STATS_CACHE_TTL_MS = 2 * 60 * 1000;
  const CAMPAIGN_DETAIL_O365_CACHE_TTL_MS = 2 * 60 * 1000;
  const CAMPAIGN_DETAIL_CAMPAIGN_CACHE_TTL_MS = 30 * 1000;
  // Initialiser directement avec les données passées pour éviter le chargement
  // Si campaignData contient une propriété 'campaign', l'extraire
  const initialCampaign = campaignData?.campaign || campaignData || null;
  const [campaign, setCampaign] = useState(
    initialCampaign
      ? { ...initialCampaign, objectif_adoption: initialCampaign.objectif_adoption !== undefined && initialCampaign.objectif_adoption !== null && initialCampaign.objectif_adoption !== '' ? Number(initialCampaign.objectif_adoption) : '' }
      : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [campaignStats, setCampaignStats] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const syncAbortControllerRef = useRef(null);
  const clientsControllerRef = useRef(null);
  const campaignControllerRef = useRef(null);
  const statsControllerRef = useRef(null);
  const o365ControllerRef = useRef(null);
  const currentSyncClientIdRef = useRef(initialCampaign?.client_id || null);
  /** Date de dernière synchro O365 · même source que TenantDetailPage (GET /clients/:id/o365) */
  const [lastSyncO365, setLastSyncO365] = useState(null);
  const [office365Credentials, setOffice365Credentials] = useState(null);
  const [checkingCredentials, setCheckingCredentials] = useState(false);
  const [campaignStepsCount, setCampaignStepsCount] = useState(0);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Formulaire d'édition - initialisé directement avec les données
  const initialData = campaignData?.campaign || campaignData || {};
  const [editForm, setEditForm] = useState({
    name: initialData?.name || '',
    type: initialData?.type || '',
    status: initialData?.status || '',
    start_date: initialData?.start_date ? initialData.start_date.split('T')[0] : '',
    end_date: initialData?.end_date ? initialData.end_date.split('T')[0] : '',
    global_progress: initialData?.global_progress || 0,
    description: initialData?.description || '',
    objectif_adoption: initialData?.objectif_adoption !== undefined && initialData?.objectif_adoption !== null && initialData?.objectif_adoption !== '' ? Number(initialData?.objectif_adoption) : ''
  });

  // Charger les données supplémentaires en arrière-plan
  useEffect(() => {
    const dataToUse = campaignData?.campaign || campaignData;
    if (dataToUse) {
      // Initialiser immédiatement avec les données disponibles
      setCampaign(
        dataToUse
          ? { ...dataToUse, objectif_adoption: dataToUse.objectif_adoption !== undefined && dataToUse.objectif_adoption !== null && dataToUse.objectif_adoption !== '' ? Number(dataToUse.objectif_adoption) : '' }
          : null
      );
      setEditForm({
        name: dataToUse.name || '',
        type: dataToUse.type || '',
        status: dataToUse.status || '',
        start_date: dataToUse.start_date ? dataToUse.start_date.split('T')[0] : '',
        end_date: dataToUse.end_date ? dataToUse.end_date.split('T')[0] : '',
        global_progress: dataToUse.global_progress || 0,
        description: dataToUse.description || '',
        objectif_adoption: dataToUse.objectif_adoption !== undefined && dataToUse.objectif_adoption !== null && dataToUse.objectif_adoption !== '' ? Number(dataToUse.objectif_adoption) : ''
      });

      // Charger les données supplémentaires en arrière-plan (non bloquant)
      loadClients();
      if (dataToUse.type === 'microsoft_security' && dataToUse.client_id) {
        checkOffice365Credentials();
        loadCampaignStats();
        loadO365LastSync(dataToUse.client_id);
      }
    } else {
      setError('Aucune donnée de campagne fournie');
    }
  }, [campaignData]);

  useEffect(() => {
    return () => {
      syncAbortControllerRef.current?.abort();
      clientsControllerRef.current?.abort();
      campaignControllerRef.current?.abort();
      statsControllerRef.current?.abort();
      o365ControllerRef.current?.abort();
    };
  }, []);

  const readCache = (key, ttlMs) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const isFresh = parsed?.savedAt && Date.now() - parsed.savedAt < ttlMs;
      return isFresh ? parsed.data : null;
    } catch {
      return null;
    }
  };

  const writeCache = (key, data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
      // cache best effort
    }
  };

  useEffect(() => {
    currentSyncClientIdRef.current = campaign?.client_id || null;
  }, [campaign?.client_id]);

  const loadCampaignDetails = async (options = {}) => {
    const refreshStats = options?.refreshStats !== false;
    const skipCache = options?.skipCache === true;
    try {
      // Recharger la campagne depuis l'API pour obtenir les données à jour
      if (!campaign?.id || !campaign?.client_id) return;

      const campaignCacheKey = `campaign_detail_item_cache_v1:${campaign.client_id}`;
      let allCampaigns = null;
      if (!skipCache) {
        allCampaigns = readCache(campaignCacheKey, CAMPAIGN_DETAIL_CAMPAIGN_CACHE_TTL_MS);
      }

      if (!Array.isArray(allCampaigns)) {
        campaignControllerRef.current?.abort();
        const controller = new AbortController();
        campaignControllerRef.current = controller;
        allCampaigns = await getAllCampaigns({ client_id: campaign.client_id }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        writeCache(campaignCacheKey, Array.isArray(allCampaigns) ? allCampaigns : []);
      }

      const updatedCampaign = allCampaigns.find(c => c.id === campaign.id);
      
      if (updatedCampaign) {
        setCampaign(
          updatedCampaign
            ? { ...updatedCampaign, objectif_adoption: updatedCampaign.objectif_adoption !== undefined && updatedCampaign.objectif_adoption !== null && updatedCampaign.objectif_adoption !== '' ? Number(updatedCampaign.objectif_adoption) : '' }
            : null
        );
        setEditForm({
          name: updatedCampaign.name || '',
          type: updatedCampaign.type || '',
          status: updatedCampaign.status || '',
          start_date: updatedCampaign.start_date ? updatedCampaign.start_date.split('T')[0] : '',
          end_date: updatedCampaign.end_date ? updatedCampaign.end_date.split('T')[0] : '',
          global_progress: updatedCampaign.global_progress || 0,
          description: updatedCampaign.description || '',
          objectif_adoption: updatedCampaign.objectif_adoption !== undefined && updatedCampaign.objectif_adoption !== null && updatedCampaign.objectif_adoption !== '' ? Number(updatedCampaign.objectif_adoption) : ''
        });
      }
      
      if (refreshStats && campaign.type === 'microsoft_security' && campaign.client_id) {
        await loadCampaignStats();
        await loadO365LastSync(campaign.client_id);
      }
    } catch (error) {
      console.error('❌ CampaignDetailPage - Erreur lors du chargement:', error);
      setError('Erreur lors du chargement de la campagne');
    }
  };

  const loadClients = async () => {
    try {
      try {
        const raw = sessionStorage.getItem(CAMPAIGN_DETAIL_CLIENTS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const isFresh =
            parsed?.savedAt &&
            Array.isArray(parsed?.data) &&
            Date.now() - parsed.savedAt < CAMPAIGN_DETAIL_CLIENTS_CACHE_TTL_MS;
          if (isFresh) {
            setClients(parsed.data);
            return;
          }
        }
      } catch {
        // ignore cache parse errors
      }

      clientsControllerRef.current?.abort();
      const controller = new AbortController();
      clientsControllerRef.current = controller;
      const clientsData = await fetchClientsList({ signal: controller.signal });
      if (controller.signal.aborted) return;
      const normalized = Array.isArray(clientsData) ? clientsData : [];
      setClients(normalized);
      try {
        sessionStorage.setItem(
          CAMPAIGN_DETAIL_CLIENTS_CACHE_KEY,
          JSON.stringify({ savedAt: Date.now(), data: normalized })
        );
      } catch {
        // ignore cache write errors
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Erreur lors du chargement des clients:', error);
    }
  };

  const checkOffice365Credentials = async () => {
    const dataToUse = campaignData?.campaign || campaignData || campaign;
    if (!dataToUse?.client_id) return;

    try {
      setCheckingCredentials(true);
      const result = await getClientOffice365Credentials(dataToUse.client_id);
      setOffice365Credentials(result.success && result.credentials ? result.credentials : null);
    } catch (error) {
      console.error('Erreur lors de la vérification des credentials Office365:', error);
      setOffice365Credentials(null);
    } finally {
      setCheckingCredentials(false);
    }
  };

  const handleStepsCountUpdate = (count) => {
    setCampaignStepsCount(count);
  };

  const loadCampaignStats = async (options = {}) => {
    const skipCache = options?.skipCache === true;
    try {
      const campaignToUse = campaign || campaignData;
      if (campaignToUse && campaignToUse.client_id && campaignToUse.type === 'microsoft_security') {
        const statsCacheKey = `campaign_detail_stats_cache_v1:${campaignToUse.client_id}:${campaignToUse.id}`;
        if (!skipCache) {
          const cached = readCache(statsCacheKey, CAMPAIGN_DETAIL_STATS_CACHE_TTL_MS);
          if (cached) {
            setCampaignStats(cached);
            return;
          }
        }
        statsControllerRef.current?.abort();
        const controller = new AbortController();
        statsControllerRef.current = controller;
        const statsData = await getCampaignStats(campaignToUse.client_id, campaignToUse.id, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setCampaignStats(statsData);
        writeCache(statsCacheKey, statsData);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Erreur lors du chargement des statistiques:', error);
      setCampaignStats(null);
    }
  };

  /** Charge la date de dernière synchro depuis la même source que TenantDetailPage (v_b_clients_m_o365) */
  const loadO365LastSync = async (clientId, options = {}) => {
    const skipCache = options?.skipCache === true;
    if (!clientId) return;
    try {
      const o365CacheKey = `campaign_detail_o365_sync_cache_v1:${clientId}`;
      if (!skipCache) {
        const cached = readCache(o365CacheKey, CAMPAIGN_DETAIL_O365_CACHE_TTL_MS);
        if (cached !== null) {
          setLastSyncO365(cached);
          return;
        }
      }
      o365ControllerRef.current?.abort();
      const controller = new AbortController();
      o365ControllerRef.current = controller;
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/o365`, {
        credentials: 'include',
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      if (!response.ok) return;
      const result = await response.json();
      if (result.success && result.data?.length > 0) {
        const record = result.data[0];
        const lastUpdate = record.data?.lastUpdate || record.updated_at || null;
        setLastSyncO365(lastUpdate);
        writeCache(o365CacheKey, lastUpdate);
      } else {
        setLastSyncO365(null);
        writeCache(o365CacheKey, null);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Erreur lors du chargement de la date de synchro O365:', error);
      setLastSyncO365(null);
    }
  };

  // Synchronisation Microsoft : alignée sur TenantDetailPage (sync-all + vérification tenant + protection anti-changement de client)
  const handleMicrosoftSync = async () => {
    if (!campaign || !campaign.client_id || campaign.type !== 'microsoft_security') return;

    const targetClientId = campaign.client_id;

    // Annuler une synchro précédente encore en cours pour éviter des mises à jour concurrentes.
    if (syncAbortControllerRef.current) {
      syncAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    syncAbortControllerRef.current = abortController;

    try {
      setSyncLoading(true);

      // Déclencher la même synchronisation que dans le module de monitoring O365 (si présent)
      if (typeof window !== 'undefined' && typeof window.__office365SyncTrigger === 'function') {
        try {
          window.__office365SyncTrigger();
        } catch (e) {
          console.error('Erreur lors de la synchronisation via le module O365:', e);
        }
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      // Même période et calcul de dates que TenantDetailPage (D30)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const period = 'D30';

      const response = await fetch(
        `${API_BASE_URL}/office365/sync-all?clientId=${targetClientId}&period=${period}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          method: 'GET',
          headers,
          credentials: 'include',
          signal: abortController.signal
        }
      );

      // Si on a navigué entre temps, ignorer la suite.
      if (currentSyncClientIdRef.current !== targetClientId) {
        return;
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erreur HTTP ${response.status}`);
      }

      // Vérification tenant (même logique défensive que TenantDetailPage)
      let expectedTenantId = null;
      try {
        const credResponse = await fetch(
          `${API_BASE_URL}/client-office365/${targetClientId}`,
          {
            headers,
            credentials: 'include',
            signal: abortController.signal
          }
        );

        if (currentSyncClientIdRef.current !== targetClientId) {
          return;
        }

        if (credResponse.ok) {
          const credResult = await credResponse.json();
          expectedTenantId = credResult?.credentials?.tenantId || null;
        }
      } catch (credErr) {
        if (credErr.name === 'AbortError') {
          return;
        }
      }

      if (expectedTenantId && result.data?.tenantId && result.data.tenantId !== expectedTenantId) {
        throw new Error(`Les données synchronisées ne correspondent pas au client ${targetClientId}. TenantId attendu: ${expectedTenantId}, reçu: ${result.data.tenantId}`);
      }

      if (currentSyncClientIdRef.current !== targetClientId) {
        return;
      }

      // Mettre à jour la date de dernière synchro (même provenance que TenantDetailPage)
      if (result.lastUpdate) {
        setLastSyncO365(result.lastUpdate);
      }
      await loadO365LastSync(targetClientId);

      // Recharger les données de campagne + stats + table MFA (via trigger)
      await loadCampaignDetails();
      await loadCampaignStats();
      setSyncTrigger((t) => t + 1);

      toast.success('Données tenant Microsoft synchronisées avec succès');
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Erreur lors de la synchronisation:', error);
      if (currentSyncClientIdRef.current === targetClientId) {
        toast.error(error.message || 'Erreur lors de la synchronisation');
      }
    } finally {
      if (syncAbortControllerRef.current === abortController) {
        syncAbortControllerRef.current = null;
      }
      if (currentSyncClientIdRef.current === targetClientId) {
        setSyncLoading(false);
      }
    }
  };

  const handleLaunchCampaign = async () => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      
      // Pour les campagnes Microsoft Security, utiliser la route spécifique
      if (campaign.type === 'microsoft_security') {
        await launchCampaign(campaign.client_id, campaign.id);
        toast.success('Campagne lancée avec succès');
      } else {
        // Pour les autres types, changer simplement le statut vers "active"
        await updateClientCampaign(campaign.client_id, campaign.id, {
          status: 'active'
        });
        toast.success('Campagne lancée avec succès');
      }
      
      await loadCampaignDetails();
      if (campaign.type === 'microsoft_security') {
        await loadCampaignStats({ skipCache: true });
      }
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      toast.error(error.message || 'Erreur lors du lancement de la campagne');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishCampaign = async () => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      
      // Pour les campagnes Microsoft Security, utiliser la route spécifique
      if (campaign.type === 'microsoft_security') {
        await finishCampaign(campaign.client_id, campaign.id);
        toast.success('Campagne terminée avec succès');
      } else {
        // Pour les autres types, changer simplement le statut
        await updateClientCampaign(campaign.client_id, campaign.id, {
          status: 'inactive'
        });
        toast.success('Campagne terminée avec succès');
      }
      
      await loadCampaignDetails();
      if (campaign.type === 'microsoft_security') {
        await loadCampaignStats({ skipCache: true });
      }
    } catch (error) {
      console.error('Erreur lors de la fin:', error);
      toast.error(error.message || 'Erreur lors de la fin de la campagne');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetCampaign = async () => {
    if (!campaign) return;
    if (!window.confirm(cyberCopy.resetCampaign)) return;
    try {
      setActionLoading(true);
      await resetCampaign(campaign.client_id, campaign.id);
      toast.success('Campagne remise à zéro. Vous pouvez la lancer à nouveau.');
      await loadCampaignDetails();
      if (campaign.type === 'microsoft_security') {
        await loadCampaignStats({ skipCache: true });
      }
    } catch (error) {
      console.error('Erreur lors de la remise à zéro:', error);
      toast.error(error.message || 'Erreur lors de la remise à zéro de la campagne');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    return CAMPAIGN_STATUSES.find(s => s.value === status) || CAMPAIGN_STATUSES[0];
  };

  const getTypeInfo = (type) => {
    return CAMPAIGN_TYPES.find(t => t.value === type);
  };

  const handleSave = async () => {
    if (!campaign) return;

    try {
      setSaving(true);
      await updateClientCampaign(campaign.client_id, campaign.id, editForm);
      toast.success('Campagne mise à jour avec succès');

      // Mettre à jour les données locales
      setCampaign({ ...campaign, ...editForm });
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de la campagne');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign || confirmText !== 'JE CONFIRME') return;

    try {
      await deleteCampaign(campaign.id);
      toast.success('Campagne supprimée avec succès');
      onNavigate('Cybersecurite', { activeTab: 'campaigns', refresh: Date.now() }, { closeCurrent: true });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la campagne');
    } finally {
      setConfirmDeleteId(null);
      setConfirmText('');
    }
  };

  if (loading) {
    return (
      <div className={styles.campaignDetailPage}>
        <div className={styles.loading}>Chargement des données...</div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className={styles.campaignDetailPage}>
        <div className={styles.error}>
          {error || "Campagne introuvable"}
          <button className={styles.backButton} onClick={() => onNavigate('Cybersecurite', { activeTab: 'campaigns' })}>
            <FaArrowLeft />
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(campaign.status);
  const typeInfo = getTypeInfo(campaign.type);
  const client = clients.find(c => c.id === campaign.client_id);
  
  // Déterminer quel bouton afficher basé sur le statut
  // Le bouton est toujours visible et bascule entre "active" et "inactive"
  const isActive = campaign.status === 'active';
  const isFinished = campaign.status === 'inactive';
  const showLaunchButton = !isActive && !isFinished;
  const showFinishButton = isActive;

  // Synchro récente requise pour lancer (campagnes Microsoft Security)
  const lastSync = campaignStats?.lastSync ? new Date(campaignStats.lastSync) : null;
  const canLaunchBecauseOfSync = campaign.type !== 'microsoft_security' ||
    (lastSync && (Date.now() - lastSync.getTime()) <= RECENT_SYNC_MAX_AGE_MS);

  // Conditions pour désactiver le lancement
  const canLaunchCampaign = campaignStepsCount > 0 &&
    (campaign.type !== 'microsoft_security' || office365Credentials !== null) &&
    canLaunchBecauseOfSync;

  const launchTooltipMessage = !canLaunchBecauseOfSync && campaign.type === 'microsoft_security'
    ? (lastSync
        ? "La dernière synchronisation est trop ancienne (max. 24 h). Utilisez le bouton « Synchroniser » puis relancez."
        : "Aucune donnée de synchronisation. Utilisez le bouton « Synchroniser » avant de lancer la campagne.")
    : !canLaunchCampaign
      ? (campaignStepsCount === 0
          ? "Ajoutez au moins une étape pour lancer la campagne"
          : "Configurez Microsoft Entra pour lancer cette campagne")
      : "Lancer la campagne";

  return (
    <div className={styles.campaignDetailPage}>
      <div className={styles.twoColumnLayout}>
        <div className={styles.leftColumn}>
          <header className={`${styles.header} ${styles.headerInColumn}`}>
            <div className={styles.headerLeft}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => onNavigate('Cybersecurite', { activeTab: 'campaigns' })}
                aria-label="Retour aux campagnes"
              >
                <FaArrowLeft />
              </button>
              {onNavigate && campaign?.client_id && (
                <SmartTooltip as="span" content="Aller au détail du client">
                  <button 
                    type="button"
                    className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                    onClick={() => onNavigate("ContratDetail", { clientId: campaign.client_id, name: campaign.client_name || clients.find(c => c.id === campaign.client_id)?.name || campaign.client_name || `Client ${campaign.client_id}` })}
                    aria-label="Aller au détail du client"
                  >
                    <Icon icon="mdi:building" className={styles.headerActionIcon} />
                  </button>
                </SmartTooltip>
              )}
            </div>
            <div className={styles.headerTitleWrap}>
              <div className={styles.headerTitle}>
                <Icon icon="mdi:shield-lock" className={styles.headerIcon} />
                <div className={styles.titleContent}>
                  <h1>
                    Tableau de bord de campagne
                    {" - "}
                    {typeInfo?.label || campaign.type || 'Campagne'}
                    {" - "}
                    {client?.name || campaign.client_name || (campaign.client_id ? `Client ${campaign.client_id}` : '')}
                  </h1>
                  {campaign.created_at && (
                    <span className={styles.createdDate}>
                      Créé le {new Date(campaign.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              </div>
              {/* Le bouton éditer est déplacé à droite de la corbeille dans headerActions */}
              {/* Bloc vide pour garder l'alignement du titre */}
            </div>
            <div className={styles.headerActions}>
              <div className={styles.headerSeparator} />
              <SmartTooltip as="span" content="Aide campagne (guide générique)">
                <button
                  type="button"
                  className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                  onClick={() => setShowHelpModal(true)}
                  aria-label="Afficher l'aide de la campagne"
                >
                  <FaQuestionCircle className={styles.headerActionIcon} />
                </button>
              </SmartTooltip>
              {campaign.type === 'microsoft_security' && (
                <SmartTooltip
                  as="span"
                  content={syncLoading ? "Synchronisation en cours..." : "Synchroniser les données Microsoft"}
                >
                  <button
                    type="button"
                    className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                    onClick={handleMicrosoftSync}
                    disabled={syncLoading}
                    aria-label="Synchroniser les données Microsoft"
                  >
                    {syncLoading ? (
                      <FaSpinner className={`${styles.headerActionIcon} ${styles.spinner}`} />
                    ) : (
                      <FaSync className={styles.headerActionIcon} />
                    )}
                  </button>
                </SmartTooltip>
              )}
              <div className={styles.headerSeparator} />
              {showLaunchButton && (
                <SmartTooltip
                  as="span"
                  content={launchTooltipMessage}
                >
                  <button
                    type="button"
                    className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                    onClick={handleLaunchCampaign}
                    disabled={actionLoading || !canLaunchCampaign}
                    aria-label="Lancer la campagne"
                  >
                    {actionLoading ? (
                      <FaSpinner className={`${styles.headerActionIcon} ${styles.spinner}`} />
                    ) : (
                      <FaRocket className={styles.headerActionIcon} />
                    )}
                  </button>
                </SmartTooltip>
              )}
              {showFinishButton && (
                <SmartTooltip as="span" content="Terminer la campagne">
                  <button 
                    type="button"
                    className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                    onClick={handleFinishCampaign}
                    disabled={actionLoading}
                    aria-label="Terminer la campagne"
                  >
                    {actionLoading ? (
                      <FaSpinner className={`${styles.headerActionIcon} ${styles.spinner}`} />
                    ) : (
                      <FaFlagCheckered className={styles.headerActionIcon} />
                    )}
                  </button>
                </SmartTooltip>
              )}
              {campaign.type === 'microsoft_security' && (campaign.status === 'active' || campaign.status === 'inactive' || campaignStats?.hasSnapshots) && (
                <SmartTooltip as="span" content="Remettre la campagne à zéro (supprimer les snapshots et pouvoir la relancer)">
                  <button
                    type="button"
                    className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                    onClick={handleResetCampaign}
                    disabled={actionLoading}
                    aria-label="Remettre la campagne à zéro"
                  >
                    {actionLoading ? (
                      <FaSpinner className={`${styles.headerActionIcon} ${styles.spinner}`} />
                    ) : (
                      <FaUndo className={styles.headerActionIcon} />
                    )}
                  </button>
                </SmartTooltip>
              )}
              <SmartTooltip as="span" content="Supprimer la campagne">
                <button
                  type="button"
                  className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                  onClick={() => setConfirmDeleteId(campaign.id)}
                  aria-label="Supprimer la campagne"
                >
                  <FaTrash className={styles.headerActionIcon} />
                </button>
              </SmartTooltip>
              {/* Bouton éditer déplacé ici à droite de la corbeille */}
              {!isEditing ? (
                <SmartTooltip as="span" content="Éditer les informations générales">
                  <button
                    type="button"
                    className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                    onClick={() => setIsEditing(true)}
                    aria-label="Éditer les informations générales"
                  >
                    <FaEdit className={styles.headerActionIcon} />
                  </button>
                </SmartTooltip>
              ) : (
                <>
                  <SmartTooltip as="span" content="Sauvegarder">
                    <button
                      type="button"
                      className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                      onClick={handleSave}
                      disabled={saving}
                      aria-label="Sauvegarder"
                    >
                      {saving ? (
                        <FaSpinner className={`${styles.headerActionIcon} ${styles.spinner}`} />
                      ) : (
                        <FaSave className={styles.headerActionIcon} />
                      )}
                    </button>
                  </SmartTooltip>
                  <SmartTooltip as="span" content="Annuler">
                    <button
                      type="button"
                      className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          name: campaign.name || '',
                          type: campaign.type || '',
                          status: campaign.status || '',
                          start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
                          end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
                          global_progress: campaign.global_progress || 0,
                          description: campaign.description || ''
                        });
                      }}
                      disabled={saving}
                      aria-label="Annuler"
                    >
                      <FaTimes className={styles.headerActionIcon} />
                    </button>
                  </SmartTooltip>
                </>
              )}
            </div>
          </header>

          <div className={`${styles.content} ${styles.contentInColumn}`}>
            <div className={styles.contentColumns}>
              <div className={styles.mainColumn}>
            {campaign.type === 'microsoft_security' && (
              <div className={styles.statsGroupTitleRow}>
                <h3 className={styles.statsGroupTitle}>Microsoft Security</h3>
                <span className={styles.statsGroupLastSync}>
                  {lastSyncO365 ? (
                    <>Mis à jour: {new Date(lastSyncO365).toLocaleDateString('fr-FR')} à {new Date(lastSyncO365).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
                  ) : (
                    'Mis à jour: -'
                  )}
                </span>
              </div>
            )}

            {campaign.type === 'microsoft_security' && (
              <MicrosoftSecurityStats
                campaign={campaign}
                clientId={campaign.client_id}
                stats={campaignStats}
                onCampaignUpdate={() => loadCampaignDetails({ refreshStats: false, skipCache: true })}
                onStatsUpdate={() => loadCampaignStats({ skipCache: true })}
                refreshTrigger={syncTrigger}
                isSyncing={syncLoading}
              />
            )}

              </div>

              <div className={styles.secondColumn}>
            {campaign.type === 'microsoft_security' && (
              <div className={styles.columnItem}>
                <CampaignAdoptionStats
                  campaign={campaign}
                  clientId={campaign.client_id}
                  stats={campaignStats}
                  onCampaignUpdate={() => loadCampaignDetails({ refreshStats: false, skipCache: true })}
                  onStatsUpdate={() => loadCampaignStats({ skipCache: true })}
                />
              </div>
            )}
            <div className={styles.columnItem}>
              <CampaignSteps
                campaign={campaign}
                clientId={campaign.client_id}
                onCampaignUpdate={() => loadCampaignDetails({ refreshStats: false, skipCache: true })}
                onStepsCountUpdate={handleStepsCountUpdate}
                embedded={false}
              />
            </div>
              </div>
            </div>
          </div>
        </div>

        <aside className={`${styles.rightSidebar} ${styles.rightSidebarColumn}`}>
          <div className={styles.rightSidebarMenu}>
            <button
              type="button"
              className={`${styles.rightSidebarTab} ${styles.rightSidebarTabActive}`}
              aria-label="Informations générales"
            >
              <Icon icon="mdi:account-details" />
            </button>
          </div>

          <div className={styles.rightSidebarContent}>
            {/* 1. Informations générales */}
            <section className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Informations générales</h3>
              <div className={styles.sidebarSummaryList}>
                <div className={styles.sidebarSummaryItem}>
                  <span className={styles.sidebarSummaryLabel}>Type</span>
                  {isEditing ? (
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                      className={styles.fieldInput}
                    >
                      <option value="">Sélectionner un type</option>
                      {CAMPAIGN_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={styles.sidebarSummaryValue}>
                      {typeInfo?.label || campaign.type || '-'}
                    </span>
                  )}
                </div>
                <div className={styles.sidebarSummaryItem}>
                  <span className={styles.sidebarSummaryLabel}>Statut</span>
                  {isEditing ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                      className={styles.fieldInput}
                    >
                      {CAMPAIGN_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={styles.sidebarSummaryValue}>
                      {statusInfo.label}
                    </span>
                  )}
                </div>
                <div className={styles.sidebarSummaryItem}>
                  <span className={styles.sidebarSummaryLabel}>Date de début</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm({...editForm, start_date: e.target.value})}
                      className={styles.fieldInput}
                    />
                  ) : (
                    <span className={styles.sidebarSummaryValueSecondary}>
                      {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  )}
                </div>
                <div className={styles.sidebarSummaryItem}>
                  <span className={styles.sidebarSummaryLabel}>Date de fin</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm({...editForm, end_date: e.target.value})}
                      className={styles.fieldInput}
                    />
                  ) : (
                    <span className={styles.sidebarSummaryValueSecondary}>
                      {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  )}
                </div>
                <div className={styles.sidebarSummaryItem}>
                  <span className={styles.sidebarSummaryLabel}>Objectif d'adoption (%)</span>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={editForm.objectif_adoption}
                      onChange={e => {
                        let val = e.target.value;
                        if (val === '') {
                          setEditForm({ ...editForm, objectif_adoption: '' });
                        } else {
                          val = Math.max(0, Math.min(100, Number(val)));
                          setEditForm({ ...editForm, objectif_adoption: val });
                        }
                      }}
                      className={styles.fieldInput}
                      placeholder="Ex: 90"
                    />
                  ) : (
                    <span className={styles.sidebarSummaryValueSecondary}>
                      {typeof campaign.objectif_adoption === 'number' && !isNaN(campaign.objectif_adoption) ? `${campaign.objectif_adoption} %` : (Number(campaign.objectif_adoption) === 0 ? '0 %' : '-')}
                    </span>
                  )}
                </div>
                <div className={styles.sidebarSummaryItem}>
                  <span className={styles.sidebarSummaryLabel}>Description</span>
                  {isEditing ? (
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      className={styles.fieldInput}
                      placeholder="Description détaillée de la campagne..."
                      rows={3}
                    />
                  ) : (
                    <span className={styles.sidebarSummaryValueSecondary}>
                      {campaign.description || 'Aucune description disponible.'}
                    </span>
                  )}
                </div>
              </div>

              {campaign.type === 'microsoft_security' && (
                <div className={styles.embeddedToolsSection}>
                  <CampaignTools
                    campaign={campaign}
                    clientId={campaign.client_id}
                    embedded={true}
                  />
                </div>
              )}
            </section>

            {/* 2. Progression · Étape X / Y */}
            <section className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Progression</h3>
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${Math.min(100, Math.max(0, campaign.global_progress ?? 0))}%` }}
                  />
                </div>
                <span className={styles.progressText}>
                  Étape {campaignStepsCount > 0 ? Math.min(campaignStepsCount, Math.round(((campaign.global_progress ?? 0) / 100) * campaignStepsCount) || 0) : 0} / {campaignStepsCount}
                </span>
              </div>
            </section>

            {/* 3. Raccourcis */}
            <section className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Raccourcis</h3>
              <div className={styles.portalLinks}>
                <a
                  href="https://entra.microsoft.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.portalLink}
                >
                  <Icon icon="mdi:shield-account" className={styles.portalLinkIcon} />
                  <div className={styles.portalLinkContent}>
                    <span className={styles.portalLinkTitle}>Microsoft Entra ID</span>
                    <span className={styles.portalLinkSubtitle}>Identités, groupes, rôles admin</span>
                  </div>
                </a>
                <a
                  href="https://security.microsoft.com/"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.portalLink}
                >
                  <Icon icon="mdi:shield-lock" className={styles.portalLinkIcon} />
                  <div className={styles.portalLinkContent}>
                    <span className={styles.portalLinkTitle}>Microsoft Defender</span>
                    <span className={styles.portalLinkSubtitle}>Centre de sécurité & Secure Score</span>
                  </div>
                </a>
                <a
                  href="https://admin.microsoft.com/"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.portalLink}
                >
                  <Icon icon="mdi:microsoft" className={styles.portalLinkIcon} />
                  <div className={styles.portalLinkContent}>
                    <span className={styles.portalLinkTitle}>Centre d'administration M365</span>
                    <span className={styles.portalLinkSubtitle}>Licences, utilisateurs, paramètres généraux</span>
                  </div>
                </a>
                <a
                  href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.portalLink}
                >
                  <Icon icon="mdi:microsoft-azure" className={styles.portalLinkIcon} />
                  <div className={styles.portalLinkContent}>
                    <span className={styles.portalLinkTitle}>Portail Azure</span>
                    <span className={styles.portalLinkSubtitle}>Vue globale du tenant</span>
                  </div>
                </a>
              </div>
            </section>
          </div>
        </aside>
      </div>

      {/* Modal de confirmation de suppression */}
      {confirmDeleteId && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Supprimer la campagne</h3>
              <button
                className={styles.closeButton}
                onClick={() => setConfirmDeleteId(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible.</p>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Tapez "JE CONFIRME" pour valider :
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="JE CONFIRME"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setConfirmDeleteId(null)}
              >
                Annuler
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleDelete}
                disabled={confirmText !== 'JE CONFIRME'}
                style={{
                  backgroundColor: confirmText === 'JE CONFIRME' ? '#dc2626' : '#9ca3af',
                  cursor: confirmText === 'JE CONFIRME' ? 'pointer' : 'not-allowed'
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'aide : Comment ça fonctionne ? */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {showHelpModal && (
            <motion.div
              className={styles.fullScreenModalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setShowHelpModal(false)}
            >
              <motion.div
                className={styles.helpModalContent}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.helpModalHeader}>
                  <div className={styles.helpModalTitle}>
                    <Icon icon="mdi:school" className={styles.helpIcon} />
                    Comment fonctionnent les campagnes de sécurité Microsoft ?
                  </div>
                  <button
                    className={styles.helpModalClose}
                    onClick={() => setShowHelpModal(false)}
                    title="Fermer"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className={styles.helpModalBody}>
          <div className={styles.helpContent}>
            {/* Section 1: Qu'est-ce qu'une campagne MFA ? */}
            <div className={styles.mainSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Icon icon="mdi:shield-lock" />
                </div>
                <h2>Qu'est-ce qu'une campagne MFA ?</h2>
              </div>
              <div className={styles.sectionContent}>
                <p className={styles.mainText}>
                  Campagne qui aide les utilisateurs à activer MFA sur Microsoft 365 de façon progressive et guidée.
                </p>
                <div className={styles.benefits}>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:security" />
                    <span>Protection renforcée</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:account-group" />
                    <span>Adoption progressive</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:chart-line" />
                    <span>Suivi des progrès</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sections horizontales : Comment ça marche + Avantages */}
            <div className={styles.horizontalSections}>
              {/* Section 2: Comment ça marche */}
              <div className={styles.mainSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <Icon icon="mdi:cog" />
                  </div>
                  <h2>Comment ça marche ?</h2>
                </div>
                <div className={styles.stepsGrid}>
                  <div className={styles.step}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepContent}>
                      <h4>Connexion</h4>
                      <p>Synchronisation avec Azure AD pour analyser l'état actuel</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepContent}>
                      <h4>Configuration</h4>
                      <p>Définition des étapes et échéances</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepContent}>
                      <h4>Lancement</h4>
                      <p>Campagne automatisée</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>4</div>
                    <div className={styles.stepContent}>
                      <h4>Résultats</h4>
                      <p>Tableaux de bord</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Avantages */}
              <div className={styles.mainSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <Icon icon="mdi:star" />
                  </div>
                  <h2>Pourquoi utiliser ?</h2>
                </div>
                <div className={styles.advantages}>
                  <div className={styles.advantage}>
                    <div className={styles.advIcon}>
                      <Icon icon="mdi:account-supervisor" />
                    </div>
                    <div className={styles.advContent}>
                      <h4>Approche ciblée</h4>
                      <p>Priorisation des comptes sensibles</p>
                    </div>
                  </div>

                  <div className={styles.advantage}>
                    <div className={styles.advIcon}>
                      <Icon icon="mdi:email" />
                    </div>
                    <div className={styles.advContent}>
                      <h4>Communication intelligente</h4>
                      <p>Rappels personnalisés</p>
                    </div>
                  </div>

                  <div className={styles.advantage}>
                    <div className={styles.advIcon}>
                      <Icon icon="mdi:chart-bar" />
                    </div>
                    <div className={styles.advContent}>
                      <h4>Transparence totale</h4>
                      <p>Visibilité temps réel</p>
                    </div>
                  </div>

                  <div className={styles.advantage}>
                    <div className={styles.advIcon}>
                      <Icon icon="mdi:shield-check" />
                    </div>
                    <div className={styles.advContent}>
                      <h4>Sécurité garantie</h4>
                      <p>Protection renforcée</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Statistiques compactes */}
            <div className={styles.statsSection}>
              <h3>Résultats typiques</h3>
              <div className={styles.statsContainer}>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>95%</div>
                  <div className={styles.statLabel}>Adoption MFA</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>30j</div>
                  <div className={styles.statLabel}>Durée moyenne</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>0</div>
                  <div className={styles.statLabel}>Interruptions</div>
                </div>
              </div>
            </div>
          </div> {/* helpContent */}
        </div>   {/* helpModalBody */}

        <div className={styles.helpModalFooter}>
                  <button
                    className={styles.helpModalCloseBtn}
                    onClick={() => setShowHelpModal(false)}
                  >
                    Fermer
                  </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>,
document.getElementById('modal-root') || document.body
)}
    </div>
  );
}
