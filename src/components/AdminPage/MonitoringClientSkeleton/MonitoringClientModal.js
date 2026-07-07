// 📦 Dépendances & Composants internes
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import styles from "./MonitoringClientModal.module.css";
import adminStyles from "../AdminPanel.module.css";
import { addClient, updateClient, fetchClientModules, saveClientModules } from "../../../api/clients";
import { deleteClientOffice365Credentials, saveClientOffice365Credentials } from "../../../api/clientOffice365";
import { showError, showSuccess } from "../../../utils/toast";
import { getIconPath } from "../../../utils/assetHelper";

import StepModules from "./ClientSteps/StepModules";
import StepServeurs from "./ClientSteps/StepServeurs";
import StepStockage from "./ClientSteps/StepStockage";
import StepFirewalls from "./ClientSteps/StepFirewalls";
import StepSauvegarde from "./ClientSteps/StepSauvegarde";
import StepAntivirus from "./ClientSteps/StepAntivirus";
import StepAntispam from "./ClientSteps/StepAntispam";
import StepNDD from "./ClientSteps/StepNDD";
import StepOffice365 from "./ClientSteps/StepOffice365";
import StepInternet from "./ClientSteps/StepInternet";
import StepTOIP from "./ClientSteps/StepTOIP"; // Added import for StepTOIP
import StepSwitch from "./ClientSteps/StepSwitch";
import StepBorneWifi from "./ClientSteps/StepBorneWifi";
import ConfirmationModal from "../../Misc/ConfirmationModal/ConfirmationModal";

// Mapping pour ouvrir directement sur une étape (depuis AddEquipmentModal)
const MODULE_TO_MONITORING_KEY = {
  Internet: "Internet",
  Firewalls: "Firewall",
  Serveurs: "Serveurs",
  Stockage: "Stockage",
  Switch: "Switch",
  BorneWifi: "BorneWifi",
};

export default function MonitoringClientModal({ initialClient, onClose, onBack, initialStepKey, forceModule }) {
  // Dans l'onglet Monitoring, on ne fait qu'éditer des clients existants
  const isEditing = true;
  const monitoringKey = forceModule ? MODULE_TO_MONITORING_KEY[forceModule] : null;
  
  const [form, setForm] = useState(() => {
    const baseModules = {
      ...initialClient.modules_monitoring,
      Serveurs: initialClient.modules_monitoring?.Serveurs ?? false,
      Stockage: initialClient.modules_monitoring?.Stockage ?? false,
      Firewall: initialClient.modules_monitoring?.Firewall ?? false,
      Sauvegarde: initialClient.modules_monitoring?.Sauvegarde ?? false,
      Antivirus: initialClient.modules_monitoring?.Antivirus ?? false,
      Antispam: initialClient.modules_monitoring?.Antispam ?? false,
      Office365: initialClient.modules_monitoring?.Office365 ?? false,
      NDD: initialClient.modules_monitoring?.NDD ?? false,
      CertificatsSSL: initialClient.modules_monitoring?.CertificatsSSL ?? false,
      Internet: initialClient.modules_monitoring?.Internet ?? false,
      TOIP: initialClient.modules_monitoring?.TOIP ?? false,
      Switch: initialClient.modules_monitoring?.Switch ?? false,
      BorneWifi: initialClient.modules_monitoring?.BorneWifi ?? false,
    };
    if (monitoringKey) {
      baseModules[monitoringKey] = true;
    }
    return {
      id: initialClient.id,
      name: initialClient.name,
      modules: initialClient.modules || { Monitoring: true, Preventif: false },
      modules_monitoring: baseModules,
    equipements: {
      ...initialClient.equipements,
      Serveurs: initialClient.equipements?.Serveurs || [],
      NAS: initialClient.equipements?.NAS || [],
      Firewalls: initialClient.equipements?.Firewalls || [],
      Sauvegarde: initialClient.equipements?.Sauvegarde || { 
        instances: []
      },
      Antivirus: initialClient.equipements?.Antivirus || {
        solutions: []
      },
      Antispam: initialClient.equipements?.Antispam || {
        logiciel: "MailInBlack", 
        expiration: "", 
        utilisateursProteges: 0, 
        domainesSurveilles: 0
      },
      NDD: initialClient.equipements?.NDD || [],
      CertificatsSSL: initialClient.equipements?.CertificatsSSL || [],
      Office365: initialClient.equipements?.Office365 || { licences: [] },
      Internet: initialClient.equipements?.Internet || [],
      TOIP: initialClient.equipements?.TOIP || [],
      Switch: initialClient.equipements?.Switch || [],
      BorneWifi: initialClient.equipements?.BorneWifi || [],
    },
    office365_data: initialClient.office365_data || null,
    report_frequency: initialClient.report_frequency || "Mensuel",
    contrat: initialClient.contrat || {},
    sites: initialClient.sites || [], // Sites physiques du client
    ssids: initialClient.ssids || [] // SSID globaux pour les bornes WiFi
  };
  }
  );
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showTypeModals, setShowTypeModals] = useState({});
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [saving, setSaving] = useState(false);
  const stepOffice365Ref = useRef();
  const stepAddRef = useRef({});
  const stepImportRef = useRef({});
  const stepRemoveAllRef = useRef({});
  const initialStepAppliedRef = useRef(false);
  
  // Charger les modules/équipements depuis les nouvelles tables
  useEffect(() => {
    const loadModules = async () => {
      try {
        setIsLoadingModules(true);
        const modulesData = await fetchClientModules(initialClient.id);
        if (modulesData) {
          setForm(prev => {
            const merged = {
              ...prev.modules_monitoring,
              ...modulesData.modules_monitoring
            };
            if (monitoringKey) merged[monitoringKey] = true;
            return {
              ...prev,
              modules: modulesData.modules || prev.modules || { Monitoring: true, Preventif: false },
              modules_monitoring: merged,
              equipements: {
                ...prev.equipements,
                ...modulesData.equipements
              }
            };
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement des modules:", error);
        // En cas d'erreur, on garde les données initiales
      } finally {
        setIsLoadingModules(false);
      }
    };
    
    if (initialClient?.id) {
      loadModules();
    } else {
      setIsLoadingModules(false);
    }
  }, [initialClient?.id]);

  // Ouvrir directement sur une étape (depuis AddEquipmentModal)
  // En mode single-step : toujours currentStep = 0 (un seul step affiché)
  useEffect(() => {
    if (!initialStepKey || isLoadingModules || initialStepAppliedRef.current) return;
    initialStepAppliedRef.current = true;
    setCurrentStep(0); // En mode single-step, un seul step donc index 0
  }, [initialStepKey, isLoadingModules]);
  
  const setShowTypeModal = (stepKey, value) => {
    setShowTypeModals(prev => ({ ...prev, [stepKey]: value }));
  };
  
  const getShowTypeModal = (stepKey) => {
    return showTypeModals[stepKey] || false;
  };
  
  const handleAdd = (stepKey) => {
    if (stepAddRef.current[stepKey] && typeof stepAddRef.current[stepKey] === 'function') {
      stepAddRef.current[stepKey]();
    } else {
      // Si pas de fonction add, ouvrir le modal
      setShowTypeModal(stepKey, true);
    }
  };
  
  const handleImport = (stepKey) => {
    if (stepImportRef.current[stepKey] && typeof stepImportRef.current[stepKey] === 'function') {
      stepImportRef.current[stepKey](true);
    }
  };
  
  const handleRemoveAll = (stepKey) => {
    if (stepRemoveAllRef.current[stepKey] && typeof stepRemoveAllRef.current[stepKey] === 'function') {
      stepRemoveAllRef.current[stepKey]();
    }
  };
  
  // Si pas de form, on ferme le modal
  if (!form) {
    onClose();
    return null;
  }
  
  // Debug: Afficher les modules activés
  

  // Mode single-step : depuis AddEquipmentModal, afficher uniquement le modal de la catégorie
  const isSingleStepMode = Boolean(initialStepKey);
  const STEP_CONFIGS = [
    { label: "Internet", component: StepInternet, key: "internet", icon: getIconPath('internet.png') },
    { label: "Serveurs", component: StepServeurs, key: "serveurs", icon: getIconPath('serveurs.png') },
    { label: "Stockage", component: StepStockage, key: "stockage", icon: getIconPath('stockage.png') },
    { label: "Firewalls", component: StepFirewalls, key: "firewall", icon: getIconPath('firewall.png') },
    { label: "Switch", component: StepSwitch, key: "switch", icon: getIconPath('switch.png') },
    { label: "Borne WiFi", component: StepBorneWifi, key: "bornewifi", icon: getIconPath('wifi.png') },
    { label: "Sauvegarde", component: StepSauvegarde, key: "sauvegarde", icon: getIconPath('sauvegarde.png') },
    { label: "Antivirus", component: StepAntivirus, key: "antivirus", icon: getIconPath('antivirus.png') },
    { label: "Antispam", component: StepAntispam, key: "antispam", icon: getIconPath('antispam.png') },
    { label: "Noms de domaine", component: StepNDD, key: "ndd", icon: getIconPath('ndd.png') },
    { label: "TOIP", component: StepTOIP, key: "toip", icon: getIconPath('toip.png') },
    { label: "Microsoft Entra", component: StepOffice365, key: "office365" },
  ];

  const steps = isSingleStepMode
    ? STEP_CONFIGS.filter((s) => s.key === initialStepKey)
    : [
        { label: "Assistant de configuration", component: StepModules, key: "modules" },
        ...(form.modules_monitoring.Internet ? [STEP_CONFIGS.find((s) => s.key === "internet")] : []).filter(Boolean),
        ...(form.modules_monitoring.Serveurs ? [STEP_CONFIGS.find((s) => s.key === "serveurs")] : []).filter(Boolean),
        ...(form.modules_monitoring.Stockage ? [STEP_CONFIGS.find((s) => s.key === "stockage")] : []).filter(Boolean),
        ...(form.modules_monitoring.Firewall ? [STEP_CONFIGS.find((s) => s.key === "firewall")] : []).filter(Boolean),
        ...(form.modules_monitoring.Switch ? [STEP_CONFIGS.find((s) => s.key === "switch")] : []).filter(Boolean),
        ...(form.modules_monitoring.BorneWifi ? [STEP_CONFIGS.find((s) => s.key === "bornewifi")] : []).filter(Boolean),
        ...(form.modules_monitoring.Sauvegarde ? [STEP_CONFIGS.find((s) => s.key === "sauvegarde")] : []).filter(Boolean),
        ...(form.modules_monitoring.Antivirus ? [STEP_CONFIGS.find((s) => s.key === "antivirus")] : []).filter(Boolean),
        ...(form.modules_monitoring.Antispam ? [STEP_CONFIGS.find((s) => s.key === "antispam")] : []).filter(Boolean),
        ...(form.modules_monitoring.NDD ? [STEP_CONFIGS.find((s) => s.key === "ndd")] : []).filter(Boolean),
        ...(form.modules_monitoring.TOIP ? [STEP_CONFIGS.find((s) => s.key === "toip")] : []).filter(Boolean),
        ...(form.modules_monitoring.Office365 ? [STEP_CONFIGS.find((s) => s.key === "office365")] : []).filter(Boolean),
      ];

  // Vérifier que l'étape actuelle existe
  const currentStepData = steps[currentStep];
  const CurrentStepComponent = currentStepData?.component;
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  const validateStep = () => {
    const step = steps[currentStep];
    if (!step) return true;
    
    // Validation spécifique par module
    switch (step.key) {
      case "modules":
        // Dans l'onglet Monitoring, on ne fait que de l'édition, pas besoin de vérifier le nom
        const atLeastOne = Object.values(form.modules_monitoring).some(Boolean);
        if (!atLeastOne) {
          showError("Veuillez activer au moins un module de monitoring.");
          return false;
        }
        // Vérifier que la fréquence de rapport est définie
        if (!form.report_frequency || !form.report_frequency.trim()) {
          showError("Veuillez sélectionner une fréquence de rapport.");
          return false;
        }
        break;
      case "internet":
        if (!form.equipements.Internet || form.equipements.Internet.length === 0) {
          showError("Veuillez ajouter au moins une connexion Internet.");
          return false;
        }
        // Vérifier que chaque connexion a les champs obligatoires
        for (let i = 0; i < form.equipements.Internet.length; i++) {
          const connection = form.equipements.Internet[i];
          if (!connection.fournisseur || !connection.fournisseur.trim()) {
            showError(`La connexion ${i + 1} doit avoir un fournisseur.`);
            return false;
          }
        }
        break;
      case "serveurs":
        if (!form.equipements.Serveurs || form.equipements.Serveurs.length === 0) {
          showError("Veuillez ajouter au moins un serveur.");
          return false;
        }
        // Vérifier que chaque serveur a les champs obligatoires
        for (let i = 0; i < form.equipements.Serveurs.length; i++) {
          const serveur = form.equipements.Serveurs[i];
          if (!serveur.nom || !serveur.nom.trim()) {
            showError(`Le serveur ${i + 1} doit avoir un nom.`);
            return false;
          }
          if (!serveur.role || !Array.isArray(serveur.role) || serveur.role.length === 0) {
            showError(`Le serveur ${serveur.nom} doit avoir au moins un rôle/fonction.`);
            return false;
          }
          if (!serveur.systeme || !serveur.systeme.trim()) {
            showError(`Le serveur ${serveur.nom} doit avoir un système d'exploitation.`);
            return false;
          }
          if (!serveur.ip || !serveur.ip.trim()) {
            showError(`Le serveur ${serveur.nom} doit avoir une adresse IP.`);
            return false;
          }
        }
        break;
      case "stockage":
        if (!form.equipements.NAS || form.equipements.NAS.length === 0) {
          showError("Veuillez ajouter au moins un équipement de stockage.");
          return false;
        }
        // Vérifier que chaque équipement de stockage a les champs obligatoires
        for (let i = 0; i < form.equipements.NAS.length; i++) {
          const nas = form.equipements.NAS[i];
          if (!nas.nom || !nas.nom.trim()) {
            showError(`L'équipement de stockage ${i + 1} doit avoir un nom.`);
            return false;
          }
          // Vérifier que role est une chaîne non vide (pas un tableau comme pour les serveurs)
          const roleValue = typeof nas.role === 'string' ? nas.role.trim() : (Array.isArray(nas.role) ? nas.role.join('') : '');
          if (!roleValue) {
            showError(`L'équipement de stockage ${nas.nom || i + 1} doit avoir un rôle.`);
            return false;
          }
        }
        break;
      case "firewall":
        if (!form.equipements.Firewalls || form.equipements.Firewalls.length === 0) {
          showError("Veuillez ajouter au moins un firewall.");
          return false;
        }
        // Vérifier que chaque firewall a les champs obligatoires
        for (let i = 0; i < form.equipements.Firewalls.length; i++) {
          const firewall = form.equipements.Firewalls[i];
          if (!firewall.nom || !firewall.nom.trim()) {
            showError(`Le firewall ${i + 1} doit avoir un nom.`);
            return false;
          }
        }
        break;
      case "switch":
        if (!form.equipements.Switch || form.equipements.Switch.length === 0) {
          showError("Veuillez ajouter au moins un switch.");
          return false;
        }
        for (let i = 0; i < form.equipements.Switch.length; i++) {
          const sw = form.equipements.Switch[i];
          if (!sw.nom || !sw.nom.trim()) {
            showError(`Le switch ${i + 1} doit avoir un nom.`);
            return false;
          }
        }
        break;
      case "bornewifi":
        if (!form.equipements.BorneWifi || form.equipements.BorneWifi.length === 0) {
          showError("Veuillez ajouter au moins une borne WiFi.");
          return false;
        }
        for (let i = 0; i < form.equipements.BorneWifi.length; i++) {
          const ap = form.equipements.BorneWifi[i];
          if (!ap.nom || !ap.nom.trim()) {
            showError(`La borne WiFi ${i + 1} doit avoir un nom.`);
            return false;
          }
        }
        break;
      case "sauvegarde":
        // Vérifier qu'il y a au moins une instance de sauvegarde
        if (!form.equipements.Sauvegarde || !form.equipements.Sauvegarde.instances || !Array.isArray(form.equipements.Sauvegarde.instances) || form.equipements.Sauvegarde.instances.length === 0) {
          showError("Veuillez ajouter au moins une instance de sauvegarde.");
          return false;
        }
        
        // Vérifier que chaque instance a un logiciel et que les jobs ont un nom
        for (let i = 0; i < form.equipements.Sauvegarde.instances.length; i++) {
          const instance = form.equipements.Sauvegarde.instances[i];
          
          // Vérifier que l'instance a un logiciel
          if (!instance.logiciel || !instance.logiciel.trim()) {
            showError(`L'instance de sauvegarde ${i + 1} doit avoir un logiciel spécifié.`);
            return false;
          }
          
          // Pour Veeam et HYCU Backup, vérifier que chaque job a un nom
          if ((instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup") && instance.jobs && Array.isArray(instance.jobs) && instance.jobs.length > 0) {
            for (let j = 0; j < instance.jobs.length; j++) {
              const job = instance.jobs[j];
              if (!job.nom || !job.nom.trim()) {
                showError(`Le job de sauvegarde ${j + 1} de l'instance ${instance.logiciel} ${i + 1} doit avoir un nom.`);
                return false;
              }
            }
          }
          
          // Pour HyperBackup, vérifier que source et destination sont définies
          if (instance.logiciel === "HyperBackup") {
            if (!instance.hyperbackupSource || !instance.hyperbackupSource.trim()) {
              showError(`L'instance HyperBackup ${i + 1} doit avoir un NAS source défini.`);
              return false;
            }
            if (!instance.hyperbackupDestination || !instance.hyperbackupDestination.trim()) {
              showError(`L'instance HyperBackup ${i + 1} doit avoir une destination définie.`);
              return false;
            }
          }
        }
        break;
      case "antivirus":
        const antivirus = form.equipements.Antivirus;
        if (!antivirus.solutions || !Array.isArray(antivirus.solutions) || antivirus.solutions.length === 0) {
          showError("Veuillez ajouter au moins une solution antivirus.");
          return false;
        }
        // Validation du nombre de licences supprimée - permet de passer sans renseigner les licences
        break;
      case "antispam":
        const antispam = form.equipements.Antispam;
        if (!antispam.solutions || !Array.isArray(antispam.solutions) || antispam.solutions.length === 0) {
          showError("Veuillez ajouter au moins une solution antispam.");
          return false;
        }
        // Validation des champs d'utilisation supprimée - permet de passer sans renseigner l'utilisation
        break;
      case "ndd":
        if (!form.equipements.NDD || form.equipements.NDD.length === 0) {
          showError("Veuillez ajouter au moins un nom de domaine.");
          return false;
        }
        // Vérifier que chaque nom de domaine a les champs obligatoires
        for (let i = 0; i < form.equipements.NDD.length; i++) {
          const ndd = form.equipements.NDD[i];
          if (!ndd.nom || !ndd.nom.trim()) {
            showError(`Le nom de domaine ${i + 1} doit avoir un nom.`);
            return false;
          }
        }
        break;
      case "office365":
        // Pour Office365, pas de validation spécifique - la configuration se fait dans StepOffice365
        // et la sauvegarde est toujours autorisée même si le test a échoué
        break;
      case "toip":
        if (!form.equipements.TOIP || form.equipements.TOIP.length === 0) {
          showError("Veuillez configurer la solution TOIP.");
          return false;
        }
        const toip = form.equipements.TOIP[0];
        if (!toip.logiciel || !toip.logiciel.trim()) {
          showError("La solution TOIP doit avoir un nom de logiciel.");
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        submitClient();
      }
    }
  };

  const prevStep = () => {
    const currentStepKey = steps[currentStep]?.key;
    if (onBack && currentStepKey === initialStepKey) {
      onBack();
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitClient = async () => {
    try {
      setSaving(true);
      // Activer Stockage si des équipements sont présents (sauf désactivation explicite)
      const modulesMonitoring = { ...form.modules_monitoring };
      const hasNAS = Array.isArray(form.equipements?.NAS) && form.equipements.NAS.length > 0;
      if (modulesMonitoring.Stockage !== false && hasNAS) {
        modulesMonitoring.Stockage = true;
      }

      // Activer Sauvegarde si des données réelles sont saisies (instances ou anciens champs)
      const hasBackupData = () => {
        const b = form.equipements?.Sauvegarde || {};
        if (Array.isArray(b.instances)) {
          return b.instances.some(inst => {
            if (!inst) return false;
            const versionOk = typeof inst.version === 'string' && inst.version.trim() !== '';
            const expirationOk = typeof inst.expiration === 'string' && inst.expiration.trim() !== '';
            const jobsOk = Array.isArray(inst.jobs) && inst.jobs.length > 0;
            const nameOk = typeof inst.server === 'string' && inst.server.trim() !== '';
            return versionOk || expirationOk || jobsOk || nameOk;
          });
        }
        const versionOk = typeof b.version === 'string' && b.version.trim() !== '';
        const expirationOk = typeof b.expiration === 'string' && b.expiration.trim() !== '';
        const jobsOk = Array.isArray(b.jobs) && b.jobs.length > 0;
        return versionOk || expirationOk || jobsOk;
      };
      if (modulesMonitoring.Sauvegarde !== false && hasBackupData()) {
        modulesMonitoring.Sauvegarde = true;
      }

      // Nettoyer les données des modules désactivés
      const safeEquipements = { ...form.equipements };

      // Nettoyer Office365 si désactivé
      if (!modulesMonitoring.Office365) {
        // Supprimer les credentials Office365
        try {
          await deleteClientOffice365Credentials(form.id);
          console.log('Credentials Office365 supprimés');
        } catch (error) {
          console.warn('Erreur lors de la suppression des credentials Office365:', error);
        }
        // Supprimer les équipements Office365
        delete safeEquipements.O365;
        delete safeEquipements.Office365;
      }

      // Nettoyer les autres modules désactivés
      const moduleToEquipmentMap = {
        Internet: 'Internet',
        Serveurs: 'Serveurs',
        Stockage: 'NAS',
        Firewall: 'Firewall',
        Switch: 'Switch',
        BorneWifi: 'BorneWifi',
        Sauvegarde: 'Sauvegarde',
        Antivirus: 'Antivirus',
        Antispam: 'Antispam',
        NDD: 'NDD',
        CertificatsSSL: 'CertificatsSSL',
        TOIP: 'TOIP'
      };

      Object.entries(moduleToEquipmentMap).forEach(([moduleKey, equipmentKey]) => {
        if (!modulesMonitoring[moduleKey]) {
          delete safeEquipements[equipmentKey];
        }
      });

      // Nettoyer les équipements pour éviter l'envoi de valeurs par défaut
      if (!hasBackupData()) delete safeEquipements.Sauvegarde;
      if (!hasBackupData()) delete safeEquipements.Sauvegarde;
      // Mettre à jour les données de base du client (report_frequency, etc.)
      const updateData = {
        name: initialClient.name, // Garder le nom original
        report_frequency: form.report_frequency,
        contrat: form.contrat || {},
        ssid: form.ssids || [] // Sauvegarder les SSID globaux (utiliser ssid pour correspondre à la colonne de la base)
      };
      
      await updateClient(form.id, updateData);

      // Sauvegarder les credentials Office365 si le module est activé et qu'il y a des données
      if (form.modules_monitoring.Office365 && form.office365_data) {
        try {
          // Sauvegarder même si certains champs sont vides (pour permettre la sauvegarde partielle)
          const credentialsToSave = {
            tenantId: form.office365_data.tenantId || '',
            clientIdAzure: form.office365_data.clientIdAzure || '',
            clientSecret: form.office365_data.clientSecret || '',
            secretKeyId: form.office365_data.secretKeyId || null,
          };

          // Ne sauvegarder que si au moins un champ est rempli
          if (credentialsToSave.tenantId || credentialsToSave.clientIdAzure || credentialsToSave.clientSecret) {
            await saveClientOffice365Credentials(form.id, credentialsToSave);
          }
        } catch (error) {
          console.warn('Erreur lors de la sauvegarde des credentials Office365:', error);
          // Ne pas bloquer la sauvegarde globale pour autant
        }
      }

      // Sauvegarder les modules/équipements dans les nouvelles tables
      await saveClientModules(form.id, {
        modules: form.modules,
        modules_monitoring: modulesMonitoring,
        equipements: safeEquipements
      });

      // Recharger les données sauvegardées pour s'assurer qu'elles sont à jour
      // (notamment pour Sauvegarde où les jobs doivent être reconstruits à partir des lignes séparées)
      try {
        const freshModulesData = await fetchClientModules(form.id);
        if (freshModulesData) {
          // Données rechargées
        }
      } catch (error) {
        console.warn('Avertissement: Impossible de recharger les données après sauvegarde:', error);
        // Ne pas bloquer la fermeture sur cette erreur
      }

      showSuccess("Client mis à jour avec succès !");
      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      showError("Erreur lors de la sauvegarde du client.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmExit = () => {
    setShowConfirmExit(false);
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className={styles.modalStepsWrapper} onClick={() => setShowConfirmExit(true)}>
        <div
          className={adminStyles.modalContent}
          style={{
            maxWidth: '800px',
            width: '90%',
            height: '90vh',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // un seul conteneur scroll: le corps
            overscrollBehavior: 'contain'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={adminStyles.modalHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {currentStepData?.key === 'internet' ? (
                <Icon icon="mdi:web" className={adminStyles.modalIcon} style={{ color: '#3b82f6', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.key === 'serveurs' ? (
                <Icon icon="mingcute:server-fill" className={adminStyles.modalIcon} style={{ width: '32px', height: '32px', color: '#3b82f6' }} />
              ) : currentStepData?.key === 'stockage' ? (
                <Icon icon="mdi:harddisk" className={adminStyles.modalIcon} style={{ color: '#3b82f6', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.key === 'firewall' ? (
                <Icon icon="mdi:firewall" className={adminStyles.modalIcon} style={{ color: '#3b82f6', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.key === 'switch' ? (
                <Icon icon="mdi:ethernet" className={adminStyles.modalIcon} style={{ color: '#2563eb', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.key === 'bornewifi' ? (
                <Icon icon="mdi:wifi" className={adminStyles.modalIcon} style={{ color: '#2563eb', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.key === 'sauvegarde' ? (
                <Icon icon="material-symbols:backup" className={adminStyles.modalIcon} style={{ width: '32px', height: '32px', color: '#ef4444' }} />
              ) : currentStepData?.key === 'antivirus' ? (
                <Icon icon="mdi:shield-check" className={adminStyles.modalIcon} style={{ color: '#ef4444', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.key === 'antispam' ? (
                <Icon icon="mdi:email-secure" className={adminStyles.modalIcon} style={{ color: '#ef4444', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.key === 'ndd' ? (
                <Icon icon="mdi:domain" className={adminStyles.modalIcon} style={{ color: '#8b5cf6', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.key === 'office365' ? (
                <Icon icon="hugeicons:office-365" className={adminStyles.modalIcon} style={{ color: '#8b5cf6', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.key === 'toip' ? (
                <Icon icon="mdi:phone" className={adminStyles.modalIcon} style={{ color: '#3b82f6', fontSize: '32px', width: '32px', height: '32px' }} />
              ) : currentStepData?.icon ? (
                <img src={currentStepData.icon} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              ) : (
                <Icon icon="mdi:monitor-dashboard" className={adminStyles.modalIcon} style={{ color: '#2563eb', fontSize: '32px', width: '32px', height: '32px' }} />
              )}
              <h3>{currentStepData?.label || "Modules Monitoring Activés"}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {(currentStepData?.key === 'internet' || 
                currentStepData?.key === 'serveurs' || 
                currentStepData?.key === 'stockage' || 
                currentStepData?.key === 'firewall' || 
                currentStepData?.key === 'switch' || 
                currentStepData?.key === 'bornewifi' ||
                currentStepData?.key === 'ndd' ||
                currentStepData?.key === 'toip' ||
                currentStepData?.key === 'sauvegarde' ||
                currentStepData?.key === 'antivirus' ||
                currentStepData?.key === 'antispam') && (
                <button
                  className={adminStyles.actionButton}
                  onClick={() => handleAdd(currentStepData.key)}
                  title="Ajouter"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    padding: 0
                  }}
                >
                  <Icon icon="mdi:plus" style={{ fontSize: '16px', color: '#15d1a0' }} />
                </button>
              )}
              {(currentStepData?.key === 'switch' || currentStepData?.key === 'bornewifi') && (
                <>
                  <button
                    className={adminStyles.actionButton}
                    onClick={() => handleImport(currentStepData.key)}
                    title="Importer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      padding: 0
                    }}
                  >
                    <Icon icon="mdi:download" style={{ fontSize: '16px', color: '#15d1a0' }} />
                  </button>
                  <button
                    className={`${adminStyles.actionButton} ${adminStyles.danger}`}
                    onClick={() => handleRemoveAll(currentStepData.key)}
                    title="Supprimer tout"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      padding: 0,
                      backgroundColor: '#ef4444',
                      border: 'none',
                      color: 'white'
                    }}
                  >
                    <Icon icon="mdi:delete" style={{ fontSize: '16px', color: '#ffffff' }} />
                  </button>
                </>
              )}
              {currentStepData?.key === 'ndd' && (
                <button
                  className={adminStyles.actionButton}
                  onClick={() => handleImport(currentStepData.key)}
                  title="Importer des domaines OVH"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    padding: 0
                  }}
                >
                  <Icon icon="mdi:cloud-download" style={{ fontSize: '16px', color: '#15d1a0' }} />
                </button>
              )}
            </div>
          </div>

          {/* Wrapper - Scrollable */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
              scrollbarGutter: 'stable',
              overscrollBehavior: 'contain',
              padding: '1.5rem'
            }}
          >
            {CurrentStepComponent && (
              <CurrentStepComponent
                form={form}
                setForm={setForm}
                isEditing={isEditing}
                initialClient={initialClient}
                showTypeModal={currentStepData?.key ? getShowTypeModal(currentStepData.key) : undefined}
                setShowTypeModal={currentStepData?.key ? (value) => setShowTypeModal(currentStepData.key, value) : undefined}
                onAdd={currentStepData?.key && ['firewall', 'switch', 'bornewifi', 'ndd', 'toip', 'sauvegarde', 'antivirus', 'antispam'].includes(currentStepData.key) ? stepAddRef.current : undefined}
                onImport={currentStepData?.key && ['switch', 'bornewifi', 'ndd'].includes(currentStepData.key) ? stepImportRef.current : undefined}
                onRemoveAll={currentStepData?.key && ['switch', 'bornewifi'].includes(currentStepData.key) ? stepRemoveAllRef.current : undefined}
                currentStepData={currentStepData}
              />
            )}
          </div>

          {/* Footer */}
          <div className={adminStyles.modalActions} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Progress Bar - masquée en mode single-step */}
            {!isSingleStepMode && (
            <div style={{ width: '100%' }}>
              <div style={{ 
                width: '100%', 
                height: '4px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '0',
                overflow: 'hidden'
              }}>
                <div 
                  style={{ 
                    width: `${progress}%`, 
                    height: '100%',
                    background: 'linear-gradient(135deg, #15d1a0 0%, #13ba8e 100%)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
            )}
            
            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {(currentStep > 0 || (isSingleStepMode && onBack)) && (
                <button
                  className={adminStyles.actionButton}
                  onClick={prevStep}
                  title={onBack && steps[currentStep]?.key === initialStepKey ? "Retour à l'ajout d'équipement" : "Précédent"}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    padding: 0
                  }}
                >
                  <Icon icon="mdi:chevron-left" style={{ fontSize: '16px', color: '#15d1a0' }} />
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button 
                className={adminStyles.primaryButton}
                onClick={nextStep}
                disabled={saving}
                title={currentStep === steps.length - 1 ? "Terminer" : "Suivant"}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  padding: 0
                }}
              >
                {currentStep === steps.length - 1 ? (
                  saving ? <Icon icon="mdi:loading" className={adminStyles.loading} style={{ fontSize: '16px' }} /> : <Icon icon="mdi:check" style={{ fontSize: '16px' }} />
                ) : (
                  <Icon icon="mdi:chevron-right" style={{ fontSize: '16px' }} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation de sortie */}
      <ConfirmationModal
        isOpen={showConfirmExit}
        onConfirm={handleConfirmExit}
        onCancel={() => setShowConfirmExit(false)}
        title="Quitter sans sauvegarder"
        message="Êtes-vous sûr de vouloir quitter ? Toutes les modifications seront perdues."
        confirmLabel="Quitter"
        cancelLabel="Continuer"
        confirmColor="warning"
      />
    </>
  );
}
