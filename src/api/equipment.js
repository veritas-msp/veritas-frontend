// ──────────────────────────────
// 🔧 API Equipment - Récupération des équipements matériel
// ──────────────────────────────

import API_BASE_URL from "../config";
import { fetchClientModules } from "./clients";
import { getEquipmentDbId, isDbEquipmentId } from "../utils/equipmentIdentity";
import {
  resolveAlimentationDeploymentType,
  resolveToipDeploymentType,
} from "../components/EquipementPage/equipmentFormConfig";
import {
  resolveAssignedSsidIds,
  serializeAssignedSsidsForPersistence,
} from "../components/EquipementPage/wifiApSsidUtils";

/**
 * Récupère la liste des équipements matériel d'un client
 * @param {string} clientId - ID du client
 * @returns {Promise<Array>} Liste des équipements
 */
export const getClientEquipment = async (clientId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${clientId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des équipements:', error);
    throw error;
  }
};

/**
 * Récupère le nombre total d'équipements matériel d'un client depuis les vues de base
 * @param {string} clientId - ID du client
 * @returns {Promise<Object>} Objet avec le total des équipements par type et le total général
 */
export const getClientEquipmentTotal = async (clientId, options = {}) => {
  try {
    // Réutiliser les données client déjà chargées quand disponibles
    let client = options.clientData || null;
    if (!client) {
      const response = await fetch(`${API_BASE_URL}/clients/general/${clientId}`, {
        method: 'GET',
        credentials: 'include',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      client = await response.json();
    }
    if (!client) {
      console.warn(`Client ${clientId} non trouvé`);
      return { byType: {}, total: 0 };
    }

    const modulesEquipements = options.modulesData?.equipements;
    const equipements =
      (client && client.equipements && typeof client.equipements === "object" ? client.equipements : null) ||
      (modulesEquipements && typeof modulesEquipements === "object" ? modulesEquipements : {}) ||
      {};
    const pickList = (...keys) => {
      for (const key of keys) {
        const list = equipements?.[key];
        if (Array.isArray(list)) return list;
      }
      return [];
    };
    const pickCount = (...keys) => {
      for (const key of keys) {
        const value = equipements?.[key];
        if (Array.isArray(value)) return value.length;
        if (value && typeof value === "object") {
          if (Array.isArray(value.items)) return value.items.length;
          if (Array.isArray(value.connections)) return value.connections.length;
          if (Array.isArray(value.instances)) return value.instances.length;
          if (Array.isArray(value.solutions)) return value.solutions.length;
        }
      }
      return 0;
    };

    // Normaliser les clés backend -> clés UI attendues par EnterpriseDetailPage
    const equipmentTotals = {
      Serveurs: pickCount('Serveurs', 'Server', 'Servers'),
      NAS: pickCount('NAS', 'Stockage', 'Storage'),
      Firewalls: pickCount('Firewalls', 'Firewall'),
      Switch: pickCount('Switch', 'Switches'),
      BorneWifi: pickCount('BorneWifi', 'BorneWiFi', 'Wifi', 'WiFi'),
      Alimentation: pickCount('Alimentation'),
      Routeur: pickCount('Routeur'),
      TOIP: pickCount('TOIP', 'Toip'),
      Ordinateurs: pickCount('Ordinateurs', 'Ordinateur', 'Workstations'),
      Cameras: pickCount('Cameras', 'Camera', 'Videosurveillance', 'VideoSurveillance'),
    };

    // Compter les connexions internet depuis les équipements du client
    // Certains enregistrements n'ont pas client_id côté modules, donc on aligne avec la source UI
    const internetConnections = pickList('Internet');
    let filteredInternetConnections = Array.isArray(internetConnections)
      ? internetConnections
      : [];
    if (Array.isArray(internetConnections) && internetConnections.some(conn => conn.client_id)) {
      filteredInternetConnections = internetConnections.filter(
        (conn) => String(conn.client_id) === String(clientId)
      );
    }
    equipmentTotals['Internet'] = filteredInternetConnections.length;

    // Calculer le total général
    const totalGeneral = Object.values(equipmentTotals).reduce((sum, count) => sum + count, 0);

    return {
      byType: equipmentTotals,
      total: totalGeneral
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des totaux d\'équipements:', error);
    throw error;
  }
};

/**
 * Récupère les modules matériel de monitoring disponibles
 * @returns {Promise<Array>} Liste des modules matériel
 */
export const getHardwareModules = async () => {
  // Modules matériel disponibles dans le système de monitoring
  const hardwareModules = [
    {
      id: 'Internet',
      name: 'Internet',
      description: 'Monitoring de la connexion internet et bande passante',
      icon: '🌐',
      category: 'Connectivité',
      color: '#3b82f6'
    },
    {
      id: 'Serveurs',
      name: 'Serveurs',
      description: 'Monitoring des serveurs physiques et virtuels',
      icon: '🖥️',
      category: 'Infrastructure',
      color: '#10b981'
    },
    {
      id: 'Stockage',
      name: 'Stockage',
      description: 'Monitoring des systèmes de stockage et NAS',
      icon: '💾',
      category: 'Infrastructure',
      color: '#f59e0b'
    },
    {
      id: 'Firewall',
      name: 'Firewall',
      description: 'Monitoring des pare-feu et sécurité réseau',
      icon: '🛡️',
      category: 'Sécurité',
      color: '#ef4444'
    },
    {
      id: 'Switch',
      name: 'Switch',
      description: 'Monitoring des commutateurs réseau',
      icon: '🔌',
      category: 'Réseau',
      color: '#8b5cf6'
    },
    {
      id: 'BorneWifi',
      name: 'Borne WiFi',
      description: 'Monitoring des points d\'accès WiFi et contrôleurs',
      icon: '📶',
      category: 'Réseau',
      color: '#06b6d4'
    },
    {
      id: 'Alimentation',
      name: 'Alimentation',
      description: 'Monitoring des onduleurs et PDU',
      icon: '🔋',
      category: 'Infrastructure',
      color: '#eab308'
    },
    {
      id: 'Routeur',
      name: 'Routeur / SD-WAN',
      description: 'Monitoring des routeurs et appliances SD-WAN',
      icon: '📡',
      category: 'Réseau',
      color: '#6366f1'
    },
    {
      id: 'TOIP',
      name: 'TOIP / VOIP',
      description: 'Monitoring de la téléphonie IP',
      icon: '☎️',
      category: 'Télécom',
      color: '#14b8a6'
    }
  ];

  return Promise.resolve(hardwareModules);
};

/**
 * Récupère les modules logiciel de monitoring disponibles
 * @returns {Promise<Array>} Liste des modules logiciel
 */
export const getSoftwareModules = async () => {
  // Modules logiciel disponibles dans le système de monitoring
  const softwareModules = [
    {
      id: 'Sauvegarde',
      name: 'Sauvegarde',
      description: 'Monitoring des sauvegardes et réplications',
      icon: '💿',
      category: 'Protection',
      color: '#84cc16'
    },
    {
      id: 'Antivirus',
      name: 'Antivirus',
      description: 'Monitoring des solutions antivirus',
      icon: '🦠',
      category: 'Sécurité',
      color: '#dc2626'
    },
    {
      id: 'Antispam',
      name: 'Antispam',
      description: 'Monitoring des filtres antispam',
      icon: '📧',
      category: 'Sécurité',
      color: '#ea580c'
    },
    {
      id: 'NDD',
      name: 'NDD',
      description: 'Monitoring des noms de domaine',
      icon: '🌍',
      category: 'Services',
      color: '#0891b2'
    },
    {
      id: 'Office365',
      name: 'Office 365',
      description: 'Monitoring des services Microsoft 365',
      icon: '📊',
      category: 'Productivité',
      color: '#7c3aed'
    },
    {
      id: 'TOIP',
      name: 'TOIP / VOIP',
      description: 'Monitoring de la téléphonie IP',
      icon: '📞',
      category: 'Communication',
      color: '#059669'
    }
  ];

  return Promise.resolve(softwareModules);
};

/**
 * Récupère tous les modules de monitoring (matériel + logiciel)
 * @returns {Promise<Object>} Objet avec modules matériel et logiciel
 */
export const getAllMonitoringModules = async () => {
  try {
    const [hardwareModules, softwareModules] = await Promise.all([
      getHardwareModules(),
      getSoftwareModules()
    ]);

    return {
      hardware: hardwareModules,
      software: softwareModules,
      all: [...hardwareModules, ...softwareModules]
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des modules:', error);
    throw error;
  }
};

const NETWORK_PERIPHERAL_TYPES = new Set([
  "Switch",
  "BorneWifi",
  "Alimentation",
  "Routeur",
  "TOIP",
]);

const FIRMWARE_EQUIPMENT_TYPES = new Set([
  "Firewalls",
  "Switch",
  "BorneWifi",
  "Alimentation",
  "Routeur",
  "TOIP",
]);

const HARDWARE_EQUIPMENT_TYPES = [
  "Ordinateurs",
  "Serveurs",
  "NAS",
  "Firewalls",
  "Switch",
  "BorneWifi",
  "Alimentation",
  "Routeur",
  "TOIP",
  "Internet",
];

export function mapClientHardwareEquipment(client) {
  if (!client?.equipements) return [];

  const equipmentListOut = [];
  const equipmentMap = new Map();

  HARDWARE_EQUIPMENT_TYPES.forEach((type) => {
    const equipmentList = client.equipements[type];
    if (!equipmentList || !Array.isArray(equipmentList)) return;

    equipmentList.forEach((equipment, index) => {
      if (!equipment || typeof equipment !== "object") return;

      if (type === "Ordinateurs" && equipment.is_active === false) return;

      const equipmentMac = equipment.adresseMac || equipment.mac || equipment.macAddress || "";
      const equipmentIp = equipment.ip || equipment.ipAddress || "";
      const equipmentSerial = equipment.numeroSerie || equipment.serial || equipment.serialNumber || "";

      let equipmentName = equipment.nom || equipment.name || "";
      if (type === "Internet") {
        if (!equipmentName || equipmentName.toLowerCase() === "unnamed" || equipmentName.trim() === "") {
          const internetType = equipment.type || "";
          const fournisseur = equipment.fournisseur || "";
          if (internetType && fournisseur) {
            equipmentName = `${internetType.toUpperCase()} ${fournisseur.toUpperCase()}`;
          } else if (internetType) {
            equipmentName = internetType.toUpperCase();
          } else if (fournisseur) {
            equipmentName = fournisseur.toUpperCase();
          } else {
            equipmentName = equipmentIp || `Internet-${index}`;
          }
        }
      } else if (!equipmentName) {
        equipmentName = `equipment-${index}`;
      }

      const realEquipmentId = equipment.id;
      const dbId = isDbEquipmentId(realEquipmentId) ? String(realEquipmentId) : null;
      let stableId = dbId || `${client.id}-${type}-${equipmentName}`;
      if (!realEquipmentId && equipmentMac) {
        stableId += `-${equipmentMac}`;
      } else if (!realEquipmentId && equipmentSerial) {
        stableId += `-${equipmentSerial}`;
      } else if (!realEquipmentId && equipmentIp) {
        stableId += `-${equipmentIp}`;
      } else if (!realEquipmentId) {
        stableId += `-${index}`;
      }

      const dedupeKey = `${client.id}-${type}-${equipmentName}-${equipmentMac || equipmentSerial || equipmentIp || index}`;
      if (equipmentMap.has(dedupeKey)) return;

      let checkmkMapping = null;
      if (equipment.checkmk_host_name && String(equipment.checkmk_host_name).trim()) {
        checkmkMapping = {
          checkmk_host_name: equipment.checkmk_host_name,
          checkmk_site: equipment.checkmk_site || null,
          checkmk_service_name: equipment.checkmk_service_name || null,
          is_active: true,
        };
      }

      const processeur = equipment.processeur || equipment.data?.processeur || equipment.cpu || equipment.vcpu || "";
      const memoire = equipment.memoire || equipment.data?.memoire || equipment.ram || equipment.memory || "";
      const stockage = equipment.stockage || equipment.data?.stockage || equipment.storage || "";
      const role = equipment.role || equipment.data?.role || [];
      const systeme = equipment.systeme || equipment.data?.systeme || equipment.os || "";
      const vlan = equipment.vlan || equipment.data?.vlan || "";
      const expirationGarantie = equipment.expirationGarantie || equipment.data?.expirationGarantie || equipment.garantie || null;
      const typeServer = equipment.type || equipment.data?.type || "";
      const anydeskId = equipment.anydeskId || equipment.data?.anydeskId || "";
      const remoteAccessSolution =
        equipment.remoteAccessSolution || equipment.data?.remoteAccessSolution || "";
      const remoteAccessId =
        equipment.remoteAccessId || equipment.data?.remoteAccessId || anydeskId || "";
      const quickConnect = equipment.quickConnect || equipment.data?.quickConnect || "";
      const unifiApiHost = equipment.unifiApiHost || equipment.data?.unifiApiHost || "";
      const unifiApiKey = equipment.unifiApiKey || equipment.data?.unifiApiKey || "";
      const unifiApiRejectUnauthorized = equipment.unifiApiRejectUnauthorized ?? equipment.data?.unifiApiRejectUnauthorized;
      const unifiApiConfiguredAt = equipment.unifiApiConfiguredAt || equipment.data?.unifiApiConfiguredAt || null;
      const stormshieldWanUrl = equipment.stormshieldWanUrl || equipment.data?.stormshieldWanUrl || "";
      const osData = equipment.os || equipment.data?.os || null;
      const domainData = equipment.domain || equipment.data?.domain || null;
      const ordinateurSysteme =
        equipment.systeme ||
        equipment.data?.systeme ||
        osData?.name ||
        equipment.osName ||
        "";
      const ordinateurDomaine =
        equipment.domaine ||
        equipment.data?.domaine ||
        (domainData?.joined ? domainData.name : domainData?.workgroup || domainData?.name) ||
        "";
      const agentOnlineRaw =
        equipment.agentOnline ??
        equipment.data?.agentOnline ??
        (equipment.source === "rmm" ? null : undefined);
      const lastInventoryAt = equipment.lastInventoryAt || equipment.data?.lastInventoryAt || null;
      let agentOnline = agentOnlineRaw;
      if (type === "Ordinateurs" && lastInventoryAt) {
        const ageMs = Date.now() - new Date(lastInventoryAt).getTime();
        agentOnline = Number.isFinite(ageMs) ? ageMs <= 15 * 60 * 1000 : agentOnlineRaw;
      }
      if (type === "Serveurs" && lastInventoryAt) {
        const ageMs = Date.now() - new Date(lastInventoryAt).getTime();
        agentOnline = Number.isFinite(ageMs) ? ageMs <= 15 * 60 * 1000 : agentOnlineRaw;
      }

      const nbDisquesActuels = equipment.nbDisquesActuels || equipment.nb_disques_actuels || "";
      const nbDisquesMax = equipment.nbDisquesMax || equipment.nbDisquesMax || equipment.nb_disques_max || "";
      const capacite = equipment.capacite || equipment.capacity || "";
      const isActive =
        equipment.is_active !== false && equipment.is_active !== undefined && equipment.is_active !== null
          ? !!equipment.is_active
          : true;

      const equipmentData = {
        id: stableId,
        dbId,
        clientId: client.id,
        clientName: client.name || client.nom || "Client inconnu",
        type,
        name: equipmentName,
        model: equipment.modele || equipment.model || equipment.modelName || "",
        mac: equipmentMac,
        ip: equipmentIp,
        version: equipment.firmware || equipment.version || equipment.softwareVersion || "",
        serial: equipmentSerial,
        manufacturer: equipment.fabricant || equipment.manufacturer || equipment.marque || "",
        location: equipment.site || equipment.location || equipment.emplacement || "",
        status: equipment.status || "unknown",
        is_active: isActive,
        uptime: equipment.uptime || "",
        installDate: equipment.dateInstallation || equipment.installDate || null,
        processeur,
        memoire,
        stockage,
        role: Array.isArray(role) ? role : role ? [role] : [],
        systeme,
        vlan,
        expirationGarantie,
        anydeskId: type === "Serveurs" ? anydeskId : undefined,
        remoteAccessSolution: type === "Serveurs" ? remoteAccessSolution : undefined,
        remoteAccessId: type === "Serveurs" ? remoteAccessId : undefined,
        quickConnect: type === "NAS" ? quickConnect : undefined,
        typeServer,
        nbDisquesActuels,
        nbDisquesMax,
        disques: equipment.disques || equipment.data?.disques || [],
        capacite,
        firmware: FIRMWARE_EQUIPMENT_TYPES.has(type)
            ? equipment.firmware || equipment.version || ""
            : undefined,
        licences: type === "Firewalls" ? equipment.licences || [] : undefined,
        stormshieldWanUrl: type === "Firewalls" ? stormshieldWanUrl : undefined,
        domaine: type === "Ordinateurs" ? ordinateurDomaine : undefined,
        netbios:
          type === "Ordinateurs"
            ? equipment.netbios ||
              equipment.hostname ||
              equipment.data?.netbios ||
              equipment.data?.hostname ||
              ""
            : undefined,
        agentOnline: type === "Ordinateurs" || type === "Serveurs" ? agentOnline : undefined,
        agentManaged:
          type === "Ordinateurs" || type === "Serveurs"
            ? equipment.source === "rmm" || equipment.data?.source === "rmm" || Boolean(equipment.agentId || equipment.agent_id)
            : undefined,
        rmmAgentId:
          type === "Ordinateurs" || type === "Serveurs"
            ? equipment.agentId || equipment.agent_id || equipment.data?.agentId || null
            : undefined,
        agentVersion:
          type === "Ordinateurs"
            ? equipment.agentVersion ||
              equipment.agent_version ||
              equipment.data?.agentVersion ||
              equipment.data?.agent_version ||
              null
            : undefined,
        systeme: type === "Ordinateurs" ? ordinateurSysteme : systeme,
        adresseMac: NETWORK_PERIPHERAL_TYPES.has(type)
          ? equipment.adresseMac || equipment.mac || ""
          : undefined,
        alimentationType:
          type === "Alimentation"
            ? resolveAlimentationDeploymentType(
                equipment.alimentationType,
                equipment.data?.alimentationType,
                equipment.type,
                equipment.data?.type
              ) || "Onduleur"
            : undefined,
        routeurType: type === "Routeur" ? equipment.routeurType || equipment.type || "" : undefined,
        adminUrl:
          type === "Routeur" || type === "Switch" || type === "Alimentation" || type === "TOIP"
            ? equipment.adminUrl || equipment.urlAdministration || ""
            : undefined,
        manageable:
          type === "Switch" || type === "Alimentation" || type === "TOIP"
            ? !!equipment.manageable
            : undefined,
        poeSupport: type === "Switch" ? !!equipment.poeSupport : undefined,
        empilage: type === "Switch" ? !!equipment.empilage : undefined,
        toipType: type === "TOIP"
          ? resolveToipDeploymentType(
              equipment.toipType,
              equipment.data?.toipType,
              equipment.type,
              equipment.data?.type
            ) || "IP-PBX"
          : undefined,
        nombreExtensions:
          type === "TOIP"
            ? equipment.nombreExtensions || equipment.nbExtensions || equipment.extensions || ""
            : undefined,
        domaineSip: type === "TOIP" ? equipment.domaineSip || equipment.domaine || "" : undefined,
        capaciteVA: type === "Alimentation" ? equipment.capaciteVA || equipment.capacite || "" : undefined,
        capaciteW: type === "Alimentation" ? equipment.capaciteW || equipment.puissanceW || "" : undefined,
        nbPrises: type === "Alimentation" ? equipment.nbPrises || equipment.nombrePrises || "" : undefined,
        dateBatterie: type === "Alimentation" ? equipment.dateBatterie || null : undefined,
        unifiApiHost: type === "Switch" ? unifiApiHost : undefined,
        unifiApiKey: type === "Switch" ? unifiApiKey : undefined,
        unifiApiRejectUnauthorized: type === "Switch" ? unifiApiRejectUnauthorized : undefined,
        unifiApiConfiguredAt: type === "Switch" ? unifiApiConfiguredAt : undefined,
        ssids: type === "BorneWifi" ? equipment.ssids || equipment.data?.ssids || [] : undefined,
        fournisseur: type === "Internet" ? equipment.fournisseur || "" : undefined,
        internetType: type === "Internet" ? equipment.type || "" : undefined,
        debit: type === "Internet" ? equipment.debit || "" : undefined,
        debitDownload: type === "Internet" ? equipment.debitDownload || "" : undefined,
        debitUpload: type === "Internet" ? equipment.debitUpload || "" : undefined,
        categorie: type === "Internet" ? equipment.categorie || "Principale" : undefined,
        ipNonFixe: type === "Internet" ? equipment.ipNonFixe || false : undefined,
        numeroLigne: type === "Internet" ? equipment.numeroLigne || "" : undefined,
        referenceContrat: type === "Internet" ? equipment.referenceContrat || "" : undefined,
        supportTelephone: type === "Internet" ? equipment.supportTelephone || "" : undefined,
        dateMiseEnService: type === "Internet" ? equipment.dateMiseEnService || "" : undefined,
        boxModele: type === "Internet" ? equipment.boxModele || "" : undefined,
        gateway: type === "Internet" ? equipment.gateway || "" : undefined,
        commentaire:
          type === "Internet" || type === "Firewalls" || type === "Routeur" || type === "Switch" || type === "BorneWifi" || type === "Alimentation" || type === "TOIP"
            ? equipment.commentaire || ""
            : undefined,
        alimentationPoE: type === "BorneWifi" ? !!equipment.alimentationPoE : undefined,
        checkmkMapping: checkmkMapping || null,
        rawData: equipment,
      };

      equipmentMap.set(dedupeKey, equipmentData);
      equipmentListOut.push(equipmentData);
    });
  });

  return equipmentListOut;
}

function clientHasHardwareEquipements(client) {
  if (!client?.equipements || typeof client.equipements !== "object") return false;
  return HARDWARE_EQUIPMENT_TYPES.some(
    (type) => Array.isArray(client.equipements[type]) && client.equipements[type].length > 0
  );
}

/**
 * Équipements matériel d'un seul client (endpoint léger).
 */
export const getClientHardwareEquipment = async (clientId, options = {}) => {
  if (options.client && clientHasHardwareEquipements(options.client)) {
    return mapClientHardwareEquipment(options.client);
  }

  const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
    method: "GET",
    credentials: "include",
    signal: options.signal,
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  const client = await response.json();

  if (!clientHasHardwareEquipements(client)) {
    try {
      const modulesData = await fetchClientModules(clientId, { signal: options.signal });
      if (modulesData?.equipements && typeof modulesData.equipements === "object") {
        client.equipements = modulesData.equipements;
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.warn("Chargement équipements client (fallback modules):", err);
      }
    }
  }

  return mapClientHardwareEquipment(client);
};

/**
 * Récupère tous les équipements matériel de tous les clients
 * @returns {Promise<Array>} Liste de tous les équipements avec informations client
 */
export const getAllHardwareEquipment = async (options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/general`, {
      method: "GET",
      credentials: "include",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }
    const clients = await response.json();
    const clientList = Array.isArray(clients) ? clients : [];

    const perClient = await Promise.all(
      clientList.map(async (client) => {
        if (clientHasHardwareEquipements(client)) {
          return mapClientHardwareEquipment(client);
        }
        if (!client?.id) {
          return mapClientHardwareEquipment(client);
        }
        try {
          const modulesData = await fetchClientModules(client.id, { signal: options.signal });
          if (modulesData?.equipements && typeof modulesData.equipements === "object") {
            return mapClientHardwareEquipment({
              ...client,
              equipements: modulesData.equipements,
            });
          }
        } catch (err) {
          if (err?.name === "AbortError") throw err;
          console.warn(`Chargement équipements client ${client.id}:`, err);
        }
        return mapClientHardwareEquipment(client);
      })
    );

    return perClient.flat();
  } catch (error) {
    console.error("Erreur lors de la récupération de tous les équipements:", error);
    throw error;
  }
};

/**
 * Supprime un équipement
 * @param {Object} equipment - Objet équipement complet (avec au moins clientId, type et name/rawData)
 * @returns {Promise<void>}
 */
export const deleteEquipment = async (equipment) => {
  if (!equipment) {
    throw new Error("Aucun équipement fourni pour la suppression");
  }

  const clientId = equipment.clientId || equipment.rawData?.client_id;
  let type = equipment.type || equipment.rawData?.type;
  let equipmentName = equipment.name || equipment.rawData?.nom || equipment.rawData?.name || '';

  if (!clientId || !type) {
    throw new Error("Informations incomplètes pour la suppression de l'équipement");
  }

  // Même mapping que pour updateEquipment
  const typeToFamily = {
    'Serveurs': 'servers',
    'NAS': 'nas',
    'Stockage': 'nas',
    'Firewalls': 'firewall',
    'Switch': 'switch',
    'BorneWifi': 'wifi',
    'Alimentation': 'alimentation',
    'Routeur': 'routeur',
    'TOIP': 'toip',
    'Internet': 'internet',
    'Ordinateurs': 'ordinateurs',
  };

  let family = typeToFamily[type];
  if (!family) {
    // Fallback si le type n'est pas directement mappé
    type = equipment.rawData?.type || type;
    family = typeToFamily[type];
  }
  if (!family) {
    throw new Error(`Type d'équipement non supporté pour la suppression: ${type}`);
  }

  // Pour Internet, reconstruire le nom comme dans updateEquipment
  if (type === 'Internet' && !equipmentName) {
    const internetType = equipment.rawData?.type || '';
    const fournisseur = equipment.rawData?.fournisseur || '';
    if (internetType && fournisseur) {
      equipmentName = `${internetType.toUpperCase()} ${fournisseur.toUpperCase()}`;
    } else if (internetType) {
      equipmentName = internetType.toUpperCase();
    } else if (fournisseur) {
      equipmentName = fournisseur.toUpperCase();
    }
  }

  // Si le nom est toujours vide, on ne peut pas cibler l'équipement de façon fiable
  if (!equipmentName) {
    throw new Error("Nom d'équipement manquant pour la suppression");
  }

  // Comme pour updateEquipment, récupérer la liste complète pour trouver l'ID réel
  const searchFamily = type === 'Serveurs' ? 'servers' : family;
  const findEquipmentResponse = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${searchFamily}`, {
    credentials: 'include'
  });

  if (!findEquipmentResponse.ok) {
    throw new Error(`Erreur lors de la recherche de l'équipement à supprimer: ${findEquipmentResponse.status}`);
  }

  const allEquipment = await findEquipmentResponse.json();

  const foundEquipment = allEquipment.find(eq => {
    // 1. Si on a un UUID dans rawData.id, essayer d'abord par là
    if (equipment.rawData?.id && eq.id === equipment.rawData.id) {
      return true;
    }

    const eqName = eq.name || eq.data?.nom || eq.data?.name || eq.item_key;

    if (type === 'Internet') {
      // Même logique de correspondance que dans updateEquipment
      if (eqName === equipmentName || eqName === (equipment.name || equipment.rawData?.nom)) {
        return true;
      }
      const originalName = equipment.rawData?.nom || equipment.name || '';
      if (originalName && eqName === originalName) {
        return true;
      }
      const eqFournisseur = eq.data?.fournisseur || '';
      const eqType = eq.data?.type || '';
      const equipmentFournisseur = equipment.rawData?.fournisseur || equipment.fournisseur || '';
      const equipmentType = equipment.rawData?.type || equipment.internetType || '';
      if (equipmentFournisseur && equipmentType) {
        if (eqFournisseur && eqType &&
          eqFournisseur.toUpperCase() === equipmentFournisseur.toUpperCase() &&
          eqType.toUpperCase() === equipmentType.toUpperCase()) {
          return true;
        }
      }
      if (equipmentFournisseur && eqFournisseur && eqFournisseur.toUpperCase() === equipmentFournisseur.toUpperCase()) {
        return true;
      }
      return false;
    }

    // Pour les autres types, comparer par nom
    if (eqName === equipmentName || eqName === (equipment.name || equipment.rawData?.nom)) {
      return true;
    }

    // Fallbacks supplémentaires possibles (MAC, serial) si nécessaire plus tard
    return false;
  });

  if (!foundEquipment) {
    throw new Error(`Équipement à supprimer non trouvé: ${equipmentName}`);
  }

  const realEquipmentId = foundEquipment.id;
  const urlFamily = type === 'Serveurs' ? 'servers' : family;
  const url = `${API_BASE_URL}/clients/modules/${clientId}/${urlFamily}/${realEquipmentId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
  }
};

const TYPE_TO_FAMILY = {
  Serveurs: 'servers',
  NAS: 'nas',
  Stockage: 'nas',
  Firewalls: 'firewall',
  Switch: 'switch',
  BorneWifi: 'wifi',
  Alimentation: 'alimentation',
  Routeur: 'routeur',
  TOIP: 'toip',
  Internet: 'internet',
  Ordinateurs: 'ordinateurs',
};

const MODULE_KEY_TO_TYPE = {
  Internet: 'Internet',
  Firewalls: 'Firewalls',
  Firewall: 'Firewalls',
  Serveurs: 'Serveurs',
  Stockage: 'NAS',
  Switch: 'Switch',
  BorneWifi: 'BorneWifi',
  Alimentation: 'Alimentation',
  Routeur: 'Routeur',
  TOIP: 'TOIP',
  Ordinateurs: 'Ordinateurs',
};

function resolveFormSiteValue(formData, existingData = {}) {
  if (formData && formData.location !== undefined) {
    return String(formData.location || "").trim();
  }
  const fallback =
    existingData.site ??
    existingData.location ??
    existingData.emplacement ??
    "";
  return String(fallback || "").trim();
}

function applySiteFieldsToPayload(payload, siteValue) {
  payload.site = siteValue;
  payload.location = siteValue;
  payload.emplacement = siteValue;
}

function buildEquipmentDataPayload(type, formData, existingData = {}, equipment = null) {
  const { id: _id, __fromDb, __index, ...dataForDb } = existingData;
  const siteValue = resolveFormSiteValue(formData, existingData);

  const updatedData = type === 'Internet'
    ? (() => {
        const ipNonFixe = formData.ipNonFixe !== undefined
          ? !!formData.ipNonFixe
          : !!existingData.ipNonFixe;
        const ip = ipNonFixe ? "IP non fixe" : (formData.ip !== undefined ? formData.ip : existingData.ip);
        const payload = {
          nom: formData.name || existingData.nom || existingData.name,
          ip,
          fournisseur: formData.fournisseur || existingData.fournisseur,
          type: formData.internetType || existingData.internetType || existingData.type,
          debit: formData.debit || existingData.debit,
          debitDownload: formData.debitDownload || existingData.debitDownload,
          debitUpload: formData.debitUpload || existingData.debitUpload,
          categorie: formData.categorie || existingData.categorie,
          ipNonFixe,
          numeroLigne: formData.numeroLigne || existingData.numeroLigne,
          referenceContrat: formData.referenceContrat || existingData.referenceContrat,
          supportTelephone: formData.supportTelephone || existingData.supportTelephone,
          dateMiseEnService: formData.dateMiseEnService || existingData.dateMiseEnService,
          boxModele: formData.boxModele || existingData.boxModele,
          gateway: formData.gateway || existingData.gateway,
          commentaire: formData.commentaire || existingData.commentaire,
        };
        applySiteFieldsToPayload(payload, siteValue);
        return payload;
      })()
    : {
        ...dataForDb,
        nom: formData.name || existingData.nom || existingData.name,
        ip: formData.ip || existingData.ip,
        adresseMac: NETWORK_PERIPHERAL_TYPES.has(type)
          ? (formData.adresseMac || formData.mac || existingData.adresseMac || existingData.mac || '')
          : (formData.mac || existingData.adresseMac || existingData.mac),
        numeroSerie: formData.serial || existingData.numeroSerie || existingData.serial,
        modele: formData.model || existingData.modele || existingData.model,
        marque: formData.manufacturer || existingData.marque || existingData.fabricant || existingData.manufacturer,
        version: type === 'Firewalls'
          ? (formData.firmware || existingData.firmware || existingData.version || '')
          : type === 'Switch'
            ? (formData.firmware || formData.version || existingData.firmware || existingData.version || '')
            : type === 'BorneWifi'
              ? (formData.firmware || formData.version || existingData.firmware || existingData.version || '')
              : (formData.version || existingData.version || existingData.firmware),
        processeur: formData.processeur || existingData.processeur || existingData.cpu || existingData.vcpu,
        memoire: formData.memoire || existingData.memoire || existingData.ram || existingData.memory,
        stockage: formData.stockage || existingData.stockage || existingData.storage,
        systeme: formData.systeme || existingData.systeme || existingData.os,
        vlan: formData.vlan || existingData.vlan,
        type: type === 'NAS'
          ? (formData.type || existingData.type || 'NAS')
          : type === 'Routeur'
            ? (formData.routeurType || existingData.routeurType || existingData.type || 'Routeur')
            : type === 'Alimentation'
              ? (resolveAlimentationDeploymentType(
                  formData.alimentationType,
                  existingData.alimentationType,
                  existingData.type
                ) || 'Onduleur')
              : type === 'TOIP'
                ? (resolveToipDeploymentType(
                    formData.toipType,
                    existingData.toipType,
                    existingData.type
                  ) || 'IP-PBX')
                : type === 'Firewalls'
                  ? (formData.firewallType || existingData.firewallType || existingData.type || 'materiel')
                  : (formData.typeServer || existingData.type),
        role: type === 'NAS'
          ? (formData.role || existingData.role || '')
          : (Array.isArray(formData.role) ? formData.role : (formData.role ? [formData.role] : (existingData.role || []))),
        expirationGarantie: formData.expirationGarantie || existingData.expirationGarantie || existingData.garantie,
        nbDisquesActuels: formData.nbDisquesActuels !== undefined ? formData.nbDisquesActuels : (existingData.nbDisquesActuels || ''),
        nbDisquesMax: formData.nbDisquesMax !== undefined ? formData.nbDisquesMax : (existingData.nbDisquesMax || ''),
        disques: formData.disques || existingData.disques || [],
        capacite: formData.capacite || existingData.capacite || '',
        raid: formData.raid || existingData.raid || '',
        luns: formData.luns || existingData.luns || [],
        cassettesRDX: formData.cassettesRDX || existingData.cassettesRDX || [],
        numeroDisque: formData.numeroDisque !== undefined ? formData.numeroDisque : (existingData.numeroDisque || ''),
        firmware: FIRMWARE_EQUIPMENT_TYPES.has(type)
          ? (formData.firmware || formData.version || existingData.firmware || existingData.version || '')
          : undefined,
        routeurType: type === 'Routeur'
          ? (formData.routeurType || existingData.routeurType || existingData.type || 'Routeur')
          : existingData.routeurType,
        alimentationType: type === 'Alimentation'
          ? (resolveAlimentationDeploymentType(
              formData.alimentationType,
              existingData.alimentationType,
              existingData.type
            ) || 'Onduleur')
          : existingData.alimentationType,
        toipType: type === 'TOIP'
          ? (resolveToipDeploymentType(
              formData.toipType,
              existingData.toipType,
              existingData.type
            ) || 'IP-PBX')
          : existingData.toipType,
        nombreExtensions: type === 'TOIP'
          ? (formData.nombreExtensions !== undefined
            ? String(formData.nombreExtensions || '')
            : (existingData.nombreExtensions || existingData.nbExtensions || existingData.extensions || ''))
          : existingData.nombreExtensions,
        domaineSip: type === 'TOIP'
          ? (formData.domaineSip !== undefined
            ? String(formData.domaineSip || '')
            : (existingData.domaineSip || existingData.domaine || ''))
          : existingData.domaineSip,
        capaciteVA: type === 'Alimentation'
          ? (formData.capaciteVA !== undefined
            ? String(formData.capaciteVA || '')
            : (existingData.capaciteVA || existingData.capacite || ''))
          : existingData.capaciteVA,
        capaciteW: type === 'Alimentation'
          ? (formData.capaciteW !== undefined
            ? String(formData.capaciteW || '')
            : (existingData.capaciteW || existingData.puissanceW || ''))
          : existingData.capaciteW,
        nbPrises: type === 'Alimentation'
          ? (formData.nbPrises !== undefined
            ? String(formData.nbPrises || '')
            : (existingData.nbPrises || existingData.nombrePrises || ''))
          : existingData.nbPrises,
        dateBatterie: type === 'Alimentation'
          ? (formData.dateBatterie || existingData.dateBatterie || '')
          : existingData.dateBatterie,
        licences: type === 'Firewalls' ? (formData.licences || existingData.licences || []) : undefined,
        firewallType: type === 'Firewalls'
          ? (formData.firewallType || existingData.firewallType || existingData.type || 'materiel')
          : existingData.firewallType,
        modeHA: type === 'Firewalls' ? (formData.modeHA !== undefined ? formData.modeHA : existingData.modeHA) : undefined,
        roleHA: type === 'Firewalls' ? (formData.roleHA || existingData.roleHA || '') : undefined,
        firewallHA: type === 'Firewalls' ? (formData.firewallHA !== undefined && formData.firewallHA !== null ? formData.firewallHA : existingData.firewallHA) : undefined,
        firewallHAName: type === 'Firewalls' ? (formData.firewallHAName || existingData.firewallHAName || '') : undefined,
        stormshieldWanUrl: type === 'Firewalls'
          ? (formData.stormshieldWanUrl !== undefined
            ? String(formData.stormshieldWanUrl || '').trim()
            : (existingData.stormshieldWanUrl || ''))
          : undefined,
        commentaire: type === 'Firewalls' || type === 'Routeur' || type === 'Serveurs' || type === 'NAS' || type === 'Switch' || type === 'BorneWifi' || type === 'Alimentation' || type === 'TOIP' || type === 'Ordinateurs'
          ? (formData.commentaire !== undefined
            ? String(formData.commentaire || '')
            : (existingData.commentaire || ''))
          : existingData.commentaire,
        domaine: type === 'Ordinateurs'
          ? (formData.domaine !== undefined ? String(formData.domaine || '') : (existingData.domaine || ''))
          : existingData.domaine,
        netbios: type === 'Ordinateurs'
          ? (formData.netbios !== undefined ? String(formData.netbios || '') : (existingData.netbios || ''))
          : existingData.netbios,
        source: type === 'Ordinateurs'
          ? (existingData.source === 'rmm' ? 'rmm' : (formData.source || existingData.source || 'manual'))
          : existingData.source,
        hypervisor: type === 'Serveurs'
          ? (formData.hypervisor !== undefined
            ? String(formData.hypervisor || '')
            : (existingData.hypervisor || existingData.hyperviseur || ''))
          : existingData.hypervisor,
        adminUrl: type === 'Routeur' || type === 'Switch' || type === 'Alimentation' || type === 'TOIP'
          ? (formData.adminUrl !== undefined
            ? String(formData.adminUrl || '').trim()
            : (existingData.adminUrl || existingData.urlAdministration || ''))
          : existingData.adminUrl,
        manageable: type === 'Switch' || type === 'Alimentation' || type === 'TOIP'
          ? (formData.manageable !== undefined ? !!formData.manageable : !!existingData.manageable)
          : existingData.manageable,
        poeSupport: type === 'Switch'
          ? (formData.poeSupport !== undefined ? !!formData.poeSupport : !!existingData.poeSupport)
          : existingData.poeSupport,
        empilage: type === 'Switch'
          ? (formData.empilage !== undefined ? !!formData.empilage : !!existingData.empilage)
          : existingData.empilage,
        adresseMac: NETWORK_PERIPHERAL_TYPES.has(type) || type === 'Ordinateurs'
          ? (formData.adresseMac || formData.mac || existingData.adresseMac || existingData.mac || '')
          : undefined,
        ssids: type === 'BorneWifi'
          ? (() => {
              const catalog = formData.clientSsids || [];
              if (formData.assignedSsidIds !== undefined) {
                return serializeAssignedSsidsForPersistence(formData.assignedSsidIds, catalog);
              }
              if (formData.ssids !== undefined) {
                const ids = resolveAssignedSsidIds(formData.ssids, catalog);
                return serializeAssignedSsidsForPersistence(ids, catalog);
              }
              return existingData.ssids || [];
            })()
          : undefined,
        alimentationPoE: type === 'BorneWifi'
          ? (formData.alimentationPoE !== undefined
            ? !!formData.alimentationPoE
            : !!existingData.alimentationPoE)
          : existingData.alimentationPoE,
        anydeskId: type === 'Serveurs'
          ? (() => {
              const solution = String(
                formData.remoteAccessSolution ?? existingData.remoteAccessSolution ?? ""
              ).trim();
              const id = String(
                formData.remoteAccessId ?? formData.anydeskId ?? existingData.remoteAccessId ?? existingData.anydeskId ?? ""
              ).trim();
              const effectiveSolution = solution || (id ? "anydesk" : "");
              return effectiveSolution === "anydesk" ? id : "";
            })()
          : existingData.anydeskId,
        remoteAccessSolution: type === 'Serveurs'
          ? (() => {
              const solution = formData.remoteAccessSolution ?? existingData.remoteAccessSolution ?? "";
              const id = formData.remoteAccessId ?? formData.anydeskId ?? existingData.remoteAccessId ?? existingData.anydeskId ?? "";
              return String(solution || (id ? "anydesk" : ""));
            })()
          : existingData.remoteAccessSolution,
        remoteAccessId: type === 'Serveurs'
          ? String(
              formData.remoteAccessId
                ?? formData.anydeskId
                ?? existingData.remoteAccessId
                ?? existingData.anydeskId
                ?? ""
            )
          : existingData.remoteAccessId,
        quickConnect: type === 'NAS'
          ? (formData.quickConnect || existingData.quickConnect || '')
          : existingData.quickConnect,
        unifiApiHost: type === 'Switch'
          ? (formData.unifiApiHost !== undefined ? formData.unifiApiHost : (existingData.unifiApiHost || ''))
          : existingData.unifiApiHost,
        unifiApiKey: type === 'Switch'
          ? (formData.unifiApiKey !== undefined ? formData.unifiApiKey : (existingData.unifiApiKey || ''))
          : existingData.unifiApiKey,
        unifiApiRejectUnauthorized: type === 'Switch'
          ? (formData.unifiApiRejectUnauthorized !== undefined
            ? formData.unifiApiRejectUnauthorized
            : (existingData.unifiApiRejectUnauthorized === true))
          : existingData.unifiApiRejectUnauthorized,
        unifiApiConfiguredAt: type === 'Switch'
          ? (formData.unifiApiConfiguredAt || existingData.unifiApiConfiguredAt || '')
          : existingData.unifiApiConfiguredAt,
        checkmk_host_name: type === 'Serveurs'
          ? (existingData.checkmk_host_name || dataForDb.checkmk_host_name || equipment?.rawData?.data?.checkmk_host_name || '')
          : (existingData.checkmk_host_name || dataForDb.checkmk_host_name || equipment?.rawData?.data?.checkmk_host_name),
        checkmk_site: type === 'Serveurs'
          ? (existingData.checkmk_site || dataForDb.checkmk_site || equipment?.rawData?.data?.checkmk_site || null)
          : (existingData.checkmk_site || dataForDb.checkmk_site || equipment?.rawData?.data?.checkmk_site),
      };

  if (type !== 'Internet') {
    applySiteFieldsToPayload(updatedData, siteValue);
  }

  const fieldsToPreserve = [
    'site',
    'location',
    'emplacement',
    'checkmk_host_name',
    'checkmk_site',
    'ipNonFixe',
    'unifiApiHost',
    'unifiApiKey',
    'unifiApiRejectUnauthorized',
    'unifiApiConfiguredAt',
    'stormshieldWanUrl',
  ];
  if (type === 'Serveurs') fieldsToPreserve.push('role');
  Object.keys(updatedData).forEach((key) => {
    const value = updatedData[key];
    if (fieldsToPreserve.includes(key)) return;
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    const isEmptyString = typeof value === 'string' && value.trim() === '';
    if (value === undefined || value === null || isEmptyString || isEmptyArray) {
      delete updatedData[key];
    }
  });

  return updatedData;
}

/**
 * Crée un équipement
 */
export const createEquipment = async (clientId, moduleKey, formData) => {
  const type = MODULE_KEY_TO_TYPE[moduleKey] || moduleKey;
  const family = TYPE_TO_FAMILY[type];
  if (!family) throw new Error(`Type d'équipement non supporté: ${type}`);

  const name = (formData.name || '').trim();
  if (!name) throw new Error('Le nom est requis');

  const data = buildEquipmentDataPayload(type, formData, {});
  const urlFamily = type === 'Serveurs' ? 'servers' : family;
  const response = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${urlFamily}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item_key: name,
      name,
      data,
      is_active: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
};

/**
 * Met à jour un équipement
 * @param {string} equipmentId - ID composite de l'équipement (format: clientId-type-name-...)
 * @param {Object} formData - Données du formulaire à mettre à jour
 * @param {Object} equipment - Objet équipement complet avec rawData
 * @returns {Promise<Object>} Équipement mis à jour
 */
export const updateEquipment = async (equipmentId, formData, equipment = null) => {
  try {
    // Parser l'ID composite pour extraire clientId et type
    // Format: clientId-type-name-mac/serial
    // Exemple: 23-Serveurs-HYPERV-01-654FGGG3ZGRZ311
    // Pour Internet: 23-Internet-FIBRE ORANGE (le nom peut contenir des espaces)
    const parts = (equipmentId || '').split('-');
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(equipmentId);
    let clientId;
    let type;
    let equipmentName;
    
    const looksLikeCompositeId = !isUUID && parts.length >= 3 && /^\d+$/.test(parts[0]);

    if (isUUID || !looksLikeCompositeId) {
      if (!equipment) {
        throw new Error('Format d\'ID invalide');
      }
      clientId = equipment.clientId || equipment.rawData?.client_id;
      type = equipment.type || equipment.rawData?.type;
      equipmentName = equipment.name || equipment.rawData?.nom || equipment.rawData?.name || '';
    } else {
      clientId = parts[0];
      type = parts[1];
    }
    
    // Pour Internet, le nom peut contenir des espaces (ex: "FIBRE ORANGE")
    // On doit reconstruire le nom en joignant les parties restantes
    // Le dernier segment peut être MAC/serial/IP, mais pour Internet on peut l'ignorer
    if (!equipmentName && type === 'Internet') {
      // Pour Internet, tout après le type est le nom (peut contenir des espaces)
      // On ignore le dernier segment s'il ressemble à une IP ou MAC
      const remainingParts = parts.slice(2);
      const lastPart = remainingParts[remainingParts.length - 1];
      // Si le dernier segment ressemble à une IP ou MAC, on l'ignore
      const isIpOrMac = /^(\d{1,3}\.){3}\d{1,3}$/.test(lastPart) || /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(lastPart);
      if (isIpOrMac && remainingParts.length > 1) {
        equipmentName = remainingParts.slice(0, -1).join('-');
      } else {
        equipmentName = remainingParts.join('-');
      }
      // Remplacer les tirets par des espaces pour les noms Internet (ex: "FIBRE-ORANGE" -> "FIBRE ORANGE")
      // Mais seulement si ça ressemble à un nom construit (TYPE FOURNISSEUR)
      if (equipmentName.includes('-') && equipmentName.split('-').length === 2) {
        equipmentName = equipmentName.replace('-', ' ');
      }
    } else if (!equipmentName) {
      // Pour les autres types, le nom est tout ce qui est entre le type et le dernier segment (qui est MAC/serial)
      equipmentName = parts.length > 3 
        ? parts.slice(2, -1).join('-') 
        : parts.slice(2).join('-');
    }
    
    // Mapper le type vers la famille (family) pour l'API
    // Pour les stockages, utiliser "nas" comme endpoint (comme dans Stockage.js ligne 843)
  const typeToFamily = {
    'Serveurs': 'servers',
    'NAS': 'nas',
    'Stockage': 'nas',
    'Firewalls': 'firewall',
    'Switch': 'switch',
    'BorneWifi': 'wifi',
    'Alimentation': 'alimentation',
    'Routeur': 'routeur',
    'TOIP': 'toip',
    'Internet': 'internet',
    'Ordinateurs': 'ordinateurs',
  };
    
    let family = typeToFamily[type];
    if (!family) {
      // Fallback si l'ID n'est pas composite mais que l'équipement est fourni
      if (equipment) {
        type = equipment.type || equipment.rawData?.type;
        equipmentName = equipmentName || equipment.name || equipment.rawData?.nom || equipment.rawData?.name || '';
        family = typeToFamily[type];
      }
    }
    if (!family) {
      throw new Error(`Type d'équipement non supporté: ${type}`);
    }

    const resolveRealEquipmentId = () => {
      const dbId = getEquipmentDbId(equipment);
      if (dbId) return dbId;

      const isDbId = (value) => {
        if (value == null || value === "") return false;
        const str = String(value);
        return /^\d+$/.test(str) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      };

      // Ligne API complète { id, data, ... }
      if (equipment?.rawData?.data && isDbId(equipment.rawData.id)) {
        return String(equipment.rawData.id);
      }

      if (isUUID && isDbId(equipmentId)) return String(equipmentId);

      const candidateIds = [
        equipment?.dbId,
        equipment?.rawData?.id,
        equipment?.id,
      ];
      for (const candidate of candidateIds) {
        if (isDbId(candidate)) {
          return String(candidate);
        }
      }
      return null;
    };

    const putEquipmentUpdate = async (realEquipmentId, existingData) => {
      const updatedData = buildEquipmentDataPayload(type, formData, existingData, equipment);
      const urlFamily = type === 'Serveurs' ? 'servers' : family;
      const url = `${API_BASE_URL}/clients/modules/${clientId}/${urlFamily}/${realEquipmentId}`;
      const response = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_key: formData.name || equipmentName || existingData.nom || existingData.name,
          name: formData.name || equipmentName || existingData.nom || existingData.name,
          data: updatedData,
          is_active: true
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
      }

      return response.json();
    };

    const directEquipmentId = resolveRealEquipmentId();
    if (directEquipmentId && clientId) {
      const existingData =
        equipment?.rawData?.data ||
        equipment?.rawData ||
        equipment?.data ||
        equipment ||
        {};
      try {
        return await putEquipmentUpdate(directEquipmentId, existingData);
      } catch (err) {
        const message = err?.message || "";
        const isNotFound = message.includes("404") || message.includes("Introuvable");
        if (!isNotFound) throw err;
      }
    }
    
    // Récupérer l'ID réel de l'équipement depuis la base de données
    // Utiliser le même format que Serveurs.js et Stockage.js
    // Note: Pour les serveurs, l'URL utilise "server" au singulier, mais pour la recherche on utilise "servers" au pluriel
    // Pour les stockages, utiliser "nas" pour la recherche et l'URL
    const searchFamily = type === 'Serveurs' ? 'servers' : family;
    const findEquipmentResponse = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${searchFamily}`, {
      credentials: 'include'
    });
    
    if (!findEquipmentResponse.ok) {
      throw new Error(`Erreur lors de la recherche de l'équipement: ${findEquipmentResponse.status}`);
    }
    
    const allEquipment = await findEquipmentResponse.json();
    const foundEquipment = allEquipment.find(eq => {
      if (equipmentId && eq.id === equipmentId) {
        return true;
      }
      if (equipment?.rawData?.id && eq.id === equipment.rawData.id) {
        return true;
      }
      const eqName = eq.name || eq.data?.nom || eq.data?.name || eq.item_key;
      const eqFournisseur = eq.data?.fournisseur || '';
      const eqType = eq.data?.type || '';
      
      // Pour Internet, comparer aussi avec le fournisseur et le type
      if (type === 'Internet') {
        // Comparer le nom exact
        if (eqName === equipmentName || eqName === (equipment?.name || equipment?.rawData?.nom)) {
          return true;
        }
        // Comparer avec le nom original de l'équipement
        const originalName = equipment?.rawData?.nom || equipment?.name || '';
        if (originalName && eqName === originalName) {
          return true;
        }
        // Si le nom est construit (TYPE FOURNISSEUR), comparer avec fournisseur et type
        if (equipmentName.includes(' ')) {
          const nameParts = equipmentName.split(' ');
          const typePart = nameParts[0];
          const fournisseurPart = nameParts.slice(1).join(' ');
          if (eqType && eqFournisseur) {
            if (eqType.toUpperCase() === typePart && eqFournisseur.toUpperCase() === fournisseurPart) {
              return true;
            }
          }
        }
        // Comparer avec le fournisseur et le type depuis l'équipement
        const equipmentFournisseur = equipment?.rawData?.fournisseur || equipment?.fournisseur || formData?.fournisseur || '';
        const equipmentType = equipment?.rawData?.type || equipment?.internetType || formData?.internetType || '';
        if (equipmentFournisseur && equipmentType) {
          if (eqFournisseur && eqType && 
              eqFournisseur.toUpperCase() === equipmentFournisseur.toUpperCase() &&
              eqType.toUpperCase() === equipmentType.toUpperCase()) {
            return true;
          }
        }
        // Comparer avec le fournisseur seul si disponible
        if (equipmentFournisseur && eqFournisseur && eqFournisseur.toUpperCase() === equipmentFournisseur.toUpperCase()) {
          return true;
        }
      } else {
        // Pour les autres types, comparaison simple
        return eqName === equipmentName || eqName === (equipment?.name || equipment?.rawData?.nom);
      }
      return false;
    });
    
    if (!foundEquipment) {
      throw new Error(`Équipement non trouvé: ${equipmentName}`);
    }
    
    const realEquipmentId = foundEquipment.id;
    
    // Construire l'objet data pour la mise à jour
    const existingData = foundEquipment.data || equipment?.rawData || {};
    return putEquipmentUpdate(realEquipmentId, existingData);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'équipement:', error);
    throw error;
  }
};

/**
 * Récupère les logs de modification d'un équipement
 * @param {string} equipmentId - ID composite de l'équipement (format: clientId-type-name-...)
 * @param {number} page - Numéro de page (commence à 1)
 * @param {number} limit - Nombre d'éléments par page (défaut: 10)
 * @returns {Promise<Object>} Objet avec logs et pagination { logs: [], total: 0, page: 1, limit: 10 }
 */
export const getEquipmentLogs = async (equipmentId, page = 1, limit = 10, options = {}) => {
  try {
    // L'equipmentId peut être:
    // 1. Un UUID réel (ex: 6969b57c-736f-402c-be6d-b5eb3903f428)
    // 2. Un ID composite (ex: 34-Serveurs-SRV-TEEXMA-192.168.1.6) - legacy
    
    let clientId, type, equipmentName;
    
    // Déterminer le format de l'ID
    const isUUID = equipmentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    if (isUUID) {
      // Nouvel format: UUID réel
      clientId = options.clientId;
      type = options.type;
      equipmentName = options.name;
      
      if (!clientId || !type || !equipmentName) {
        throw new Error('Les paramètres clientId, type et name sont requis pour un UUID');
      }
    } else {
      // Ancien format: ID composite
      const parts = equipmentId.split('-');
      if (parts.length < 3) {
        throw new Error('Format d\'ID invalide');
      }
      
      clientId = parts[0];
      type = parts[1];
      equipmentName = parts.length > 3 
        ? parts.slice(2, -1).join('-') 
        : parts.slice(2).join('-');
    }
    
    // Mapper le type vers la famille
    const family = EQUIPMENT_TYPE_TO_LOG_FAMILY[type] || "servers";

    const logsUrl = new URL(
      `${API_BASE_URL}/clients/modules/${clientId}/${family}/${encodeURIComponent(equipmentName)}/logs`
    );
    logsUrl.searchParams.set("page", String(page));
    logsUrl.searchParams.set("limit", String(limit));
    if (options.dbId) {
      logsUrl.searchParams.set("equipment_id", String(options.dbId));
    }
    if (options.search && String(options.search).trim()) {
      logsUrl.searchParams.set("search", String(options.search).trim());
    }
    if (options.category && String(options.category).trim() && options.category !== "all") {
      logsUrl.searchParams.set("category", String(options.category).trim());
    }

    const response = await fetch(logsUrl.toString(), {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Si l'endpoint n'existe pas encore, retourner des données vides
      if (response.status === 404) {
        return { logs: [], total: 0, page, limit, totalPages: 0 };
      }
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Erreur lors de la récupération des logs:', error);
    // Retourner des données vides en cas d'erreur
    return { logs: [], total: 0, page, limit, totalPages: 0 };
  }
};

/**
 * Purge les logs d'un équipement (optionnellement filtrés).
 */
export const purgeEquipmentLogs = async (equipmentId, options = {}) => {
  let clientId;
  let type;
  let equipmentName;

  const isUUID = equipmentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  if (isUUID) {
    clientId = options.clientId;
    type = options.type;
    equipmentName = options.name;
    if (!clientId || !type || !equipmentName) {
      throw new Error("Les paramètres clientId, type et name sont requis pour un UUID");
    }
  } else {
    const parts = equipmentId.split("-");
    if (parts.length < 3) {
      throw new Error("Format d'ID invalide");
    }
    clientId = parts[0];
    type = parts[1];
    equipmentName = parts.length > 3 ? parts.slice(2, -1).join("-") : parts.slice(2).join("-");
  }

  const family = EQUIPMENT_TYPE_TO_LOG_FAMILY[type] || "servers";
  const logsUrl = new URL(
    `${API_BASE_URL}/clients/modules/${clientId}/${family}/${encodeURIComponent(equipmentName)}/logs`
  );
  if (options.dbId) {
    logsUrl.searchParams.set("equipment_id", String(options.dbId));
  }
  if (options.search && String(options.search).trim()) {
    logsUrl.searchParams.set("search", String(options.search).trim());
  }
  if (options.category && String(options.category).trim() && options.category !== "all") {
    logsUrl.searchParams.set("category", String(options.category).trim());
  }

  const response = await fetch(logsUrl.toString(), {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

const EQUIPMENT_TYPE_TO_LOG_FAMILY = {
  Serveurs: "servers",
  NAS: "nas",
  Stockage: "nas",
  Firewalls: "firewall",
  Switch: "switch",
  BorneWifi: "wifi",
  Alimentation: "alimentation",
  Routeur: "routeur",
  TOIP: "toip",
  Internet: "internet",
  Ordinateurs: "ordinateurs",
};

function resolveEquipmentLogFamily(type) {
  return EQUIPMENT_TYPE_TO_LOG_FAMILY[type] || "servers";
}

/**
 * Journalise une action utilisateur sur un équipement (connexion distante, etc.)
 */
export const logEquipmentActivity = async ({
  clientId,
  type,
  name,
  equipmentId,
  action,
  details,
}) => {
  if (!clientId || !type || !name || !action) return null;

  const family = resolveEquipmentLogFamily(type);
  const response = await fetch(
    `${API_BASE_URL}/clients/modules/${clientId}/${family}/${encodeURIComponent(name)}/logs`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        details: details || null,
        equipment_id: equipmentId || null,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${response.status}`);
  }

  return response.json();
};

/**
 * Récupère les notes d'un équipement
 * @param {string} equipmentId - ID de l'équipement
 * @returns {Promise<Array>} Liste des notes
 */
export const getEquipmentNotes = async (equipmentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/notes`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error);
    throw error;
  }
};

/**
 * Ajoute une note à un équipement
 * @param {string} equipmentId - ID de l'équipement
 * @param {string} content - Contenu de la note
 * @returns {Promise<Object>} Note créée
 */
export const addEquipmentNote = async (equipmentId, content) => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/notes`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note:', error);
    throw error;
  }
};

/**
 * Récupère les photos d'un équipement
 * @param {string} equipmentId - ID de l'équipement
 * @returns {Promise<Array>} Liste des photos
 */
export const getEquipmentPhotos = async (equipmentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/photos`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des photos:', error);
    throw error;
  }
};

/**
 * Upload une photo pour un équipement
 * @param {string} equipmentId - ID de l'équipement
 * @param {File} file - Fichier image
 * @returns {Promise<Object>} Photo uploadée
 */
export const uploadEquipmentPhoto = async (equipmentId, file) => {
  try {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'upload de la photo:', error);
    throw error;
  }
};

/**
 * Récupère les événements CheckMK pour un host
 * @param {string} hostName - Nom du host CheckMK
 * @returns {Promise<Object>} Données des événements
 */
export const getCheckMKEvents = async (hostName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/checkmk/events/${encodeURIComponent(hostName)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des événements CheckMK:', error);
    throw error;
  }
};

/**
 * Récupère les services CheckMK pour un host
 * @param {string} hostName - Nom du host CheckMK
 * @param {string} startTime - Date de début (ISO string)
 * @param {string} endTime - Date de fin (ISO string)
 * @returns {Promise<Object>} Données des services
 */
export const getCheckMKServices = async (hostName, startTime = null, endTime = null, site = null, options = {}) => {
  try {
    const url = new URL(`${API_BASE_URL}/checkmk/services/${encodeURIComponent(hostName)}`);
    if (startTime) url.searchParams.append('start_time', startTime);
    if (endTime) url.searchParams.append('end_time', endTime);
    if (site) url.searchParams.append('site', site);

    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Erreur lors de la récupération des services CheckMK:', error);
    throw error;
  }
};

/**
 * Récupère l'uptime CheckMK pour un host (via les services)
 * @param {string} hostName - Nom du host CheckMK
 * @returns {Promise<Object>} Données d'uptime
 */
export const getCheckMKUptime = async (hostName) => {
  try {
    // Récupérer les services et chercher le service Uptime
    const servicesResponse = await fetch(`${API_BASE_URL}/checkmk/services/${encodeURIComponent(hostName)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!servicesResponse.ok) {
      throw new Error(`Erreur ${servicesResponse.status}: ${servicesResponse.statusText}`);
    }

    const servicesData = await servicesResponse.json();
    const services = servicesData.services || [];
    
    // Chercher le service Uptime
    const uptimeService = services.find(s => {
      const title = (s.title || s.id || '').toLowerCase();
      return title.includes('uptime') || title.includes('up time');
    });
    
    if (uptimeService) {
      return {
        uptime: uptimeService.plugin_output || uptimeService.output || '-',
        lastCheck: uptimeService.last_check || null
      };
    }
    
    return { uptime: '-' };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'uptime CheckMK:', error);
    return { uptime: '-' };
  }
};

/**
 * Récupère les événements CheckMK pour un host sur une période donnée
 * @param {string} hostName - Nom du host CheckMK
 * @param {string} startTime - Date de début (ISO string)
 * @param {string} endTime - Date de fin (ISO string)
 * @param {string} site - Site CheckMK (optionnel)
 * @param {boolean} criticalOnly - Ne retourner que les notifications critiques (optionnel)
 * @returns {Promise<Object>} Données des événements { events, events_count }, chaque event a time et timestamp
 */
export const getCheckMKEventsPeriod = async (hostName, startTime, endTime, site = null, criticalOnly = false, options = {}) => {
  try {
    const url = new URL(`${API_BASE_URL}/checkmk/events-period/${encodeURIComponent(hostName)}`);
    url.searchParams.append('start_time', startTime);
    url.searchParams.append('end_time', endTime);
    if (site) {
      url.searchParams.append('site', site);
    }
    if (criticalOnly) {
      url.searchParams.append('critical_only', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Erreur lors de la récupération des événements CheckMK:', error);
    throw error;
  }
};

/**
 * Récupère les événements détaillés CheckMK pour un host
 * @param {string} hostName - Nom du host CheckMK
 * @param {string|null} startTime - Date de début (ISO string)
 * @param {string|null} endTime - Date de fin (ISO string)
 * @param {string|null} site - Site CheckMK (optionnel)
 * @returns {Promise<Object>} Données des événements détaillés
 */
export const getCheckMKHostEvents = async (hostName, startTime = null, endTime = null, site = null, options = {}) => {
  try {
    const url = new URL(`${API_BASE_URL}/checkmk/host-events/${encodeURIComponent(hostName)}`);
    if (startTime) url.searchParams.append('start_time', startTime);
    if (endTime) url.searchParams.append('end_time', endTime);
    if (site) url.searchParams.append('site', site);

    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Erreur lors de la récupération des événements détaillés CheckMK:', error);
    throw error;
  }
};

/**
 * Récupère la disponibilité CheckMK pour un host
 * @param {string} hostName - Nom du host CheckMK
 * @param {string} site - Site CheckMK (optionnel)
 * @param {string} [startTime] - Début de période ISO (optionnel)
 * @param {string} [endTime] - Fin de période ISO (optionnel)
 * @returns {Promise<Object>} Données de disponibilité
 */
export const getCheckMKAvailability = async (hostName, site = null, startTime = null, endTime = null, options = {}) => {
  try {
    const url = new URL(`${API_BASE_URL}/checkmk/availability-table/${encodeURIComponent(hostName)}`);
    if (site) {
      url.searchParams.append('site', site);
    }
    if (startTime) {
      url.searchParams.append('start_time', startTime);
    }
    if (endTime) {
      url.searchParams.append('end_time', endTime);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Erreur lors de la récupération de la disponibilité CheckMK:', error);
    throw error;
  }
};
/**
 * Récupère les détails d'un host CheckMK (labels, OS, etc.)
 * @param {string} hostName - Nom du host CheckMK
 * @param {string|null} site - Site CheckMK (optionnel)
 * @returns {Promise<Object>} Détails du host
 */
export const getCheckMKHostDetails = async (hostName, site = null, options = {}) => {
  try {
    const url = new URL(`${API_BASE_URL}/checkmk/host/${encodeURIComponent(hostName)}`);
    if (site) {
      url.searchParams.append('site', site);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Erreur lors de la récupération des détails du host CheckMK:', error);
    throw error;
  }
};

/**
 * Mappe le type d'équipement (UI) vers la famille de module (API)
 */
const EQUIPMENT_TYPE_TO_FAMILY = {
  'Serveurs': 'servers',
  'Stockage': 'stockage',
  'NAS': 'stockage',
  'Firewalls': 'firewall',
  'Switch': 'switch',
  'BorneWifi': 'wifi',
  'Alimentation': 'alimentation',
  'Routeur': 'routeur',
  'TOIP': 'toip',
  'Sauvegarde': 'save',
  'Internet': 'internet'
};

/**
 * Met à jour le mapping CheckMK d'un équipement (stocké directement sur le périphérique)
 * La ligne est identifiée par clientId + equipmentName (plus fiable que l'id)
 * @param {string} clientId - ID du client
 * @param {string} equipmentType - Type d'équipement (Serveurs, Stockage, Firewalls, etc.)
 * @param {string} equipmentName - Nom du périphérique
 * @param {Object} mapping - { checkmk_host_name, checkmk_site?, checkmk_service_name? }
 * @returns {Promise<Object>} Mapping mis à jour
 */
export const updateEquipmentCheckMKMapping = async (clientId, equipmentType, equipmentName, mapping) => {
  const family = EQUIPMENT_TYPE_TO_FAMILY[equipmentType] || EQUIPMENT_TYPE_TO_FAMILY[equipmentType === 'NAS' ? 'Stockage' : equipmentType];
  if (!family) {
    throw new Error(`Type d'équipement non supporté pour le mapping: ${equipmentType}`);
  }

  const response = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${family}/checkmk-mapping`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipmentName, ...mapping })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${response.status}`);
  }

  return response.json();
};

/**
 * Catégorise un host selon son nom, alias et labels
 */
export const categorizeHost = (host) => {
  const name = (host.id || host.name || '').toLowerCase();
  const alias = (host.alias || '').toLowerCase();
  const combined = `${name} ${alias}`;
  const labels = host.labels || {};
  const labelValues = Object.values(labels).join(' ').toLowerCase();

  const patterns = {
    Serveurs: /\b(srv|server|serveur|vm|vms|esxi|hyperv|dc|ad)\b|^srv-|^vm-|^dc-|^ad-/,
    Firewalls: /\b(fw|firewall|pfsense|fortigate|sophos|palo|utm)\b|^fw-|^firewall-/,
    Switch: /\b(sw|switch|cisco|hp-procurve)\b|^sw-|^switch-/,
    BorneWifi: /\b(wifi|wlan|ap|unifi|ubiquiti|ubnt|wap|access.?point)\b|^ap-|^wifi-/,
    Alimentation: /\b(ups|onduleur|pdu|apc|eaton|cyberpower)\b|^ups-|^pdu-/,
    Routeur: /\b(router|routeur|sd-?wan|mpls|fortigate-?sd)\b|^rt-|^router-/,
    TOIP: /\b(voip|toip|pbx|3cx|yeastar|sbc|sip)\b|^voip-|^pbx-/,
    Stockage: /\b(nas|san|storage|synology|qnap|netapp|emc)\b|^nas-|^storage-/
  };

  for (const [cat, regex] of Object.entries(patterns)) {
    if (regex.test(combined) || regex.test(labelValues)) return cat;
  }
  return 'Autres';
};

/**
 * Récupère la liste des hôtes CheckMK avec détails (alias, IP, labels)
 * @returns {Promise<Array<{id:string, title?:string, alias?:string, ip?:string, labels?:object, category:string}>>}
 */
export const getCheckMKHostsWithDetails = async () => {
  const response = await fetch(`${API_BASE_URL}/checkmk/hosts`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Impossible de charger les hôtes CheckMK');
  }

  const data = await response.json();
  const rawHosts = data.value || data.items || data || [];

  return rawHosts.map(host => {
    if (typeof host === 'string') {
      return {
        id: host,
        title: host,
        alias: null,
        ip: null,
        labels: {},
        category: categorizeHost({ id: host })
      };
    }
    const attrs = host.extensions?.attributes || host.attributes || host.extensions || {};
    const id = host.id || host.name || host.hostname || host.title || '';
    const alias = attrs.alias || host.alias || null;
    const ip = attrs.ipaddress || attrs.address || host.ip || host.address || null;
    const labels = attrs.labels || host.labels || {};
    const title = host.title || alias || id;

    return {
      id,
      title,
      alias,
      ip,
      labels,
      category: categorizeHost({ id, alias, labels })
    };
  }).filter(h => h.id);
};

/**
 * Récupère la liste des noms d'hôtes CheckMK (legacy)
 * @returns {Promise<string[]>}
 */
export const getCheckMKHosts = async () => {
  const hosts = await getCheckMKHostsWithDetails();
  return hosts.map(h => h.id);
};

/** Mappe le type d'équipement UI vers la famille API backend */
export const equipmentTypeToFamily = (type) => {
  const map = {
    Ordinateurs: 'ordinateurs',
    Serveurs: 'servers',
    NAS: 'stockage',
    Firewalls: 'firewall',
    Switch: 'switch',
    BorneWifi: 'wifi',
    Alimentation: 'alimentation',
    Routeur: 'routeur',
    TOIP: 'toip',
  };
  return map[type] || null;
};

/**
 * Récupère les données CheckMK persistées en base pour un équipement mappé.
 */
export const getEquipmentCheckMKMonitoring = async (equipmentId, availabilityPeriod = '1m', options = {}) => {
  const url = new URL(`${API_BASE_URL}/checkmk/equipment-monitoring/${encodeURIComponent(equipmentId)}`);
  url.searchParams.set('availability_period', availabilityPeriod);
  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    signal: options.signal,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Synchronise les données CheckMK d'un équipement mappé (API → base).
 * @param {boolean} force - Si true, ignore le seuil de 30 minutes.
 */
/**
 * Résumés monitoring (statut visuel) pour une liste d'équipements ou un client.
 * @returns {Promise<{ summaries: Record<string, object> }>}
 */
export const getEquipmentMonitoringSummaries = async ({ clientId, equipmentIds } = {}, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/checkmk/equipment-monitoring/summaries`, {
    method: 'POST',
    credentials: 'include',
    signal: options.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, equipmentIds }),
  });
  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const syncEquipmentCheckMKMonitoring = async (payload, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/checkmk/equipment-monitoring/sync`, {
    method: 'POST',
    credentials: 'include',
    signal: options.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

// ──────────────────────────────
// Étiquettes périphérique
// ──────────────────────────────

async function parseEquipmentTagError(res, fallback) {
  const errorData = await res.json().catch(() => ({}));
  throw new Error(errorData.error || errorData.details || fallback);
}

export async function fetchEquipmentTagsBatch(clientIds, options = {}) {
  const unique = [...new Set((clientIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!unique.length) return [];

  const params = new URLSearchParams({ clientIds: unique.join(",") });
  const res = await fetch(`${API_BASE_URL}/equipment/tags/batch?${params}`, {
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
  });
  if (!res.ok) await parseEquipmentTagError(res, "Erreur lors du chargement des étiquettes");
  return res.json();
}

export async function fetchEquipmentTags(equipmentId, clientId, options = {}) {
  const params = new URLSearchParams({ clientId: String(clientId) });
  const res = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/tags?${params}`, {
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
  });
  if (!res.ok) await parseEquipmentTagError(res, "Erreur lors du chargement des étiquettes");
  return res.json();
}

export async function addEquipmentTag(equipmentId, clientId, { label, color }, options = {}) {
  const res = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/tags`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, label, color }),
    signal: options.signal,
  });
  if (!res.ok) await parseEquipmentTagError(res, "Erreur lors de l'ajout de l'étiquette");
  return res.json();
}

export async function removeEquipmentTag(equipmentId, clientId, tagId, options = {}) {
  const params = new URLSearchParams({ clientId: String(clientId) });
  const res = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/tags/${tagId}?${params}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseEquipmentTagError(res, "Erreur lors de la suppression de l'étiquette");
  return res.json();
}