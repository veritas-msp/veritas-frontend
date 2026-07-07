import API_BASE_URL from "../config";
import { normalizeClientSites } from "../utils/clientSites";
import { aggregateAntivirusEquipementFromRows } from "../utils/antivirusModuleRows";

const BASE_URL = `${API_BASE_URL}/clients`;
const MODULES_BASE_URL = `${API_BASE_URL}/clients/modules`;
const CYBER_PAGE_DATA_CACHE_KEY = "cyber_page_data_cache_v1";
const SERVICE_DOMAINS_CACHE_KEY = "service_domains_all_cache_v1";

function invalidateCyberPageDataCache() {
  try {
    sessionStorage.removeItem(CYBER_PAGE_DATA_CACHE_KEY);
  } catch {
    // ignore
  }
}

function invalidateServiceDomainsCache() {
  try {
    sessionStorage.removeItem(SERVICE_DOMAINS_CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Familles matériel accessibles via /clients/modules/:id/:family (Community). */
const COMMUNITY_HARDWARE_FAMILIES = {
  internet: "Internet",
  servers: "Serveurs",
  nas: "NAS",
  firewall: "Firewalls",
  switch: "Switch",
  wifi: "BorneWifi",
  alimentation: "Alimentation",
  routeur: "Routeur",
  toip: "TOIP",
  ordinateurs: "Ordinateurs",
};

function mapModuleRowToEquipmentItem(item) {
  let parsedData = item.data;
  if (typeof parsedData === "string") {
    try {
      parsedData = JSON.parse(parsedData);
    } catch {
      parsedData = {};
    }
  } else if (!parsedData || typeof parsedData !== "object") {
    parsedData = {};
  }

  return {
    id: item.id,
    client_id: item.client_id,
    ...parsedData,
    nom: parsedData.nom || item.name || item.item_key || "Sans nom",
  };
}

async function fetchCommunityModuleFamilyRows(clientId, family, options = {}) {
  const res = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) return [];
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

async function fetchClientHardwareModulesCommunity(clientId, options = {}) {
  const equipements = {};

  const hardwareTasks = Object.entries(COMMUNITY_HARDWARE_FAMILIES).map(
    async ([family, label]) => {
      try {
        const items = await fetchCommunityModuleFamilyRows(clientId, family, options);
        equipements[label] = items
          .filter((item) => item.is_active !== false)
          .map(mapModuleRowToEquipmentItem);
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        equipements[label] = [];
      }
    }
  );

  const cyberTasks = [
    (async () => {
      try {
        const rows = await fetchCommunityModuleFamilyRows(clientId, "antivirus", options);
        equipements.Antivirus = aggregateAntivirusEquipementFromRows(rows);
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        equipements.Antivirus = { solutions: [] };
      }
    })(),
  ];

  await Promise.all([...hardwareTasks, ...cyberTasks]);

  const hasAntivirus = (equipements.Antivirus?.solutions || []).length > 0;

  return {
    modules: {},
    modules_monitoring: hasAntivirus ? { Antivirus: true } : {},
    equipements,
  };
}

function parseClientSites(sites) {
  return normalizeClientSites(sites);
}

// ──────────────────────────────
// Fonctions API pour les clients (données de base)
// ──────────────────────────────

/**
 * Données agrégées page Cybersécurité : clients + équipements (antivirus, antispam, sauvegarde)
 * depuis v_b_clients_m_* + campagnes v_b_clients_c_campaign · un seul aller-retour, sans N× /modules.
 */
export async function fetchCyberPageData(options = {}) {
  const res = await fetch(`${BASE_URL}/cyber-page-data`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Erreur ${res.status} cyber-page-data`);
  }
  return res.json();
}

export async function fetchClients(options = {}) {
  const res = await fetch(BASE_URL, {
    credentials: 'include', // Auth via cookie HttpOnly
    signal: options.signal,
  });
  if (!res.ok) throw new Error("Erreur lors du fetch des clients");
  const clients = await res.json(); // Contient déjà options (modules généraux) depuis /clients-general

  // Parser les champs JSON qui pourraient être stringifiés
  const parsedClients = clients.map(client => ({
    ...client,
    sites: parseClientSites(client.sites),
    ssids: (() => {
      if (Array.isArray(client.ssids)) return client.ssids;
      if (typeof client.ssids === 'string') {
        try {
          return JSON.parse(client.ssids);
        } catch (e) {
          console.warn(`Erreur parsing ssids pour client ${client.id}:`, e);
          return [];
        }
      }
      return client.ssids || [];
    })()
  }));

  // Pour chaque client, charger les modules/équipements depuis les nouvelles tables
  const clientsWithModules = await Promise.all(
    parsedClients.map(async (client) => {
      try {
        // Utilise le même parsing que fetchClientModules pour les équipements
        const modulesData = await fetchClientModules(client.id, { signal: options.signal });

        // Les données internet sont déjà incluses dans modulesData.equipements.Internet
        let internetData = [];

        // Les données cybersécurité seront chargées à la demande depuis ClientDetailPage
        // quand l'utilisateur ouvrira l'onglet cybersécurité

        if (modulesData) {
          // 🔁 Source de vérité pour les modules généraux : v_b_clients.options
          const baseOptions = client.options || {};
          
          // Modules contractuels utilisés côté frontend
          const mergedModules = {
            ...(modulesData.modules || {}),
            ...(baseOptions || {})
          };

          // Snapshot des modules de monitoring stockés directement dans v_b_clients.modules (JSONB)
          const rawMonitoringSnapshot = (client.modules && typeof client.modules === 'object')
            ? client.modules
            : {};

          return {
            ...client,
            modules: mergedModules,
            options: baseOptions,
            // 👉 Désormais, source de vérité principale pour les modules de monitoring : v_b_clients.modules
            modules_monitoring: rawMonitoringSnapshot,
            equipements: modulesData.equipements || client.equipements || {},
            internet: modulesData.equipements?.Internet || []
          };
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          throw error;
        }
        console.error(`Erreur lors du chargement des modules pour le client ${client.id}:`, error);
      }
      return client;
    })
  );
  
  return clientsWithModules;
}

// Liste clients légère (sans modules/équipements), optimisée pour les pages de liste.
export async function fetchClientsList(options = {}) {
  const url = `${BASE_URL}/list?_=${Date.now()}`;
  const res = await fetch(url, {
    credentials: "include",
    signal: options.signal,
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  if (!res.ok) throw new Error("Erreur lors du fetch de la liste clients");
  return await res.json();
}

/** Fiche client (sites, infos générales) · utilisé notamment par le builder de rapport. */
export async function fetchClientGeneral(clientId, options = {}) {
  const res = await fetch(`${API_BASE_URL}/clients/general/${clientId}`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) throw new Error("Client introuvable");
  const client = await res.json();
  const ssids = Array.isArray(client.ssids)
    ? client.ssids
    : Array.isArray(client.ssid)
      ? client.ssid
      : [];
  return {
    ...client,
    sites: parseClientSites(client.sites),
    ssids,
  };
}

// ──────────────────────────────
// Fonctions API pour les données cybersécurité détaillées (antivirus/antispam)
// ──────────────────────────────

export async function fetchClientAntivirus(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/antivirus`, {
    credentials: 'include',
    signal: options.signal,
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}

export async function fetchClientAntispam(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/antispam`, {
    credentials: 'include',
    signal: options.signal,
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}

export async function fetchClientDomains(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/domains`, {
    credentials: 'include',
    signal: options.signal,
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}

export async function fetchClientSslCertificates(clientId, options = {}) {
  const params = new URLSearchParams();
  if (options.autoCheck) params.set("autoCheck", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates${query}`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}

export async function checkClientSslCertificates(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates/check`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Erreur lors de la vérification SSL");
  }
  return await res.json();
}

export async function addClientSslCertificate(clientId, { hostname, port = 443, checkIntervalHours = 24 }) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostname, port, checkIntervalHours }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Erreur lors de l'ajout du certificat");
  }
  return await res.json();
}

export async function updateClientSslCertificate(clientId, certId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates/${certId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Erreur lors de la mise à jour du certificat");
  }
  return await res.json();
}

export async function deleteClientSslCertificate(clientId, certId) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates/${certId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Erreur lors de la suppression du certificat");
  }
  return await res.json();
}

export async function checkClientSslCertificate(clientId, certId) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates/${certId}/check`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Erreur lors de la vérification SSL");
  }
  return await res.json();
}

export async function fetchClientLicences(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/licences`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}

export async function addClientLicence(clientId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/licences`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Erreur lors de l'ajout de la licence");
  }
  return await res.json();
}

export async function updateClientLicence(clientId, licenceId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/licences/${licenceId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Erreur lors de la mise à jour de la licence");
  }
  return await res.json();
}

export async function deleteClientLicence(clientId, licenceId) {
  const res = await fetch(`${BASE_URL}/${clientId}/licences/${licenceId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Erreur lors de la suppression de la licence");
  }
}

export async function fetchClientCustomEquipmentMap(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/custom-equipment-map`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) {
    return { families: [] };
  }
  return res.json();
}

export async function fetchClientCustomEquipment(clientId, familyKey, options = {}) {
  const query = familyKey ? `?familyKey=${encodeURIComponent(familyKey)}` : "";
  const res = await fetch(`${BASE_URL}/${clientId}/custom-equipment${query}`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function addClientCustomEquipment(clientId, familyKey, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/custom-equipment/${encodeURIComponent(familyKey)}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Erreur lors de l'ajout du matériel");
  }
  return res.json();
}

export async function updateClientCustomEquipment(clientId, familyKey, itemId, payload) {
  const res = await fetch(
    `${BASE_URL}/${clientId}/custom-equipment/${encodeURIComponent(familyKey)}/${itemId}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Erreur lors de la mise à jour du matériel");
  }
  return res.json();
}

export async function deleteClientCustomEquipment(clientId, familyKey, itemId) {
  const res = await fetch(
    `${BASE_URL}/${clientId}/custom-equipment/${encodeURIComponent(familyKey)}/${itemId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Erreur lors de la suppression du matériel");
  }
}

export async function addClient(client) {
  // Utiliser /general pour la création des clients généraux
  const res = await fetch(`${BASE_URL}/general`, {
    method: "POST",
    credentials: 'include', // Auth via cookie HttpOnly
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(client)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Erreur lors de l'ajout d'un client";
    throw new Error(errorMessage);
  }
  const newClient = await res.json();
  
  // Si le client a des modules/équipements, les sauvegarder dans les nouvelles tables
  if (newClient.id && (client.modules || client.equipements)) {
    await saveClientModules(newClient.id, {
      modules: client.modules,
      modules_monitoring: client.modules_monitoring,
      equipements: client.equipements
    });
  }
  
  return newClient;
}

export async function updateClient(id, client) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    credentials: 'include', // Auth via cookie HttpOnly
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(client)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Erreur lors de la mise à jour du client";
    throw new Error(errorMessage);
  }
  const updatedClient = await res.json();
  
  // NOTE: Ne pas appeler saveClientModules ici car c'est géré explicitement dans submitClient
  // Cela évite les doubles appels et les doublons
  
  return updatedClient;
}

export async function deleteClient(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    credentials: 'include' // Auth via cookie HttpOnly
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.details || "Erreur lors de la suppression du client";
    const error = new Error(errorMessage);
    error.code = errorData.code;
    error.blockers = errorData.blockers;
    throw error;
  }
  return await res.json();
}

export async function fetchClientDeletionCheck(id, options = {}) {
  const res = await fetch(`${BASE_URL}/${id}/deletion-check`, {
    credentials: "include",
    signal: options.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erreur lors de la vérification de suppression");
  }
  return data;
}

/**
 * Récupère les logs d'un client
 * @param {number|string} clientId - ID du client
 * @param {number} page - Numéro de page (défaut: 1)
 * @param {number} limit - Nombre d'éléments par page (défaut: 10)
 * @returns {Promise<Object>} Objet avec logs et pagination { logs: [], total: 0, page: 1, limit: 10 }
 */
export async function getClientLogs(clientId, page = 1, limit = 10, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/logs?page=${page}&limit=${limit}`, {
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
    if (error?.name === 'AbortError') throw error;
    console.error('Erreur lors de la récupération des logs du client:', error);
    // Retourner des données vides en cas d'erreur
    return { logs: [], total: 0, page, limit, totalPages: 0 };
  }
}

export async function getClientCheckMKMappings(clientId) {
  try {
    const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${clientId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const mappings = await response.json();

    // Filtrer uniquement les mappings actifs pour les types de matériel hardware
    const hardwareTypes = ['Serveurs', 'NAS', 'Firewalls', 'Switch', 'BorneWifi'];
    const activeHardwareMappings = mappings.filter(m =>
      hardwareTypes.includes(m.equipment_type) &&
      (m.is_active === true || m.is_active === undefined || m.is_active === null)
    );

    return activeHardwareMappings;
  } catch (error) {
    console.error('Erreur lors de la récupération des mappings CheckMK du client:', error);
    return [];
  }
}

// Fonction optimisée pour récupérer seulement les statistiques CheckMK
export async function getClientCheckMKStats(clientId, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${clientId}/stats`, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { stats: [], total: 0 };
      }
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('Erreur lors de la récupération des statistiques CheckMK:', error);
    return { stats: [], total: 0 };
  }
}



// ──────────────────────────────
// Fonctions API pour les modules/équipements (nouvelles tables)
// ──────────────────────────────

// Mapping des familles frontend vers les noms de tables backend
const FAMILY_MAPPING = {
  'module': 'module',
  'internet': 'internet',
  'serveurs': 'servers',
  'stockage': 'stockage',
  'firewall': 'firewall',
  'switch': 'switch',
  'bornewifi': 'wifi',
  'alimentation': 'alimentation',
  'routeur': 'routeur',
  'toip': 'toip',
  'sauvegarde': 'save',
  'antivirus': 'antivirus',
  'antispam': 'antispam',
  'ndd': 'ndd',
  'certificatessl': 'ssl',
  'o365': 'o365'
};

// Récupérer tous les modules/équipements d'un client
export async function fetchClientModules(clientId, options = {}) {
  const res = await fetch(`${API_BASE_URL}/clients/${clientId}/modules`, {
    credentials: 'include', // Auth via cookie HttpOnly
    signal: options.signal,
  });
  if (res.status === 403) {
    return fetchClientHardwareModulesCommunity(clientId, options);
  }
  if (!res.ok) throw new Error("Erreur lors du fetch des modules du client");
  const data = await res.json();
  
  // Le backend transforme déjà les données, on les retourne directement
  if (data.equipements && data.modules && data.modules_monitoring) {
    return {
      modules: data.modules || {},
      modules_monitoring: data.modules_monitoring || {},
      equipements: data.equipements || {}
    };
  }
  
  // Fallback : ancienne transformation si le backend n'a pas transformé
  const rawData = data;
  const modules = {};
  const modules_monitoring = {};
  const equipements = {};
  const azureHasCredentials = Boolean(rawData.azureHasCredentials);
  
  // Traiter les modules génériques (table module)
  if (rawData.module) {
    rawData.module.forEach(item => {
      if (item.item_key && item.data?.enabled !== undefined) {
        modules[item.item_key] = item.data.enabled;
      }
    });
  }
  
  // Traiter les modules de monitoring et équipements
  const familyMapping = {
    'internet': { monitoring: 'Internet', equipement: 'Internet' },
    'servers': { monitoring: 'Serveurs', equipement: 'Serveurs' },
    'stockage': { monitoring: 'Stockage', equipement: 'NAS' },
    'firewall': { monitoring: 'Firewall', equipement: 'Firewalls' },
    'switch': { monitoring: 'Switch', equipement: 'Switch' },
    'wifi': { monitoring: 'BorneWifi', equipement: 'BorneWifi' },
    'alimentation': { monitoring: 'Alimentation', equipement: 'Alimentation' },
    'routeur': { monitoring: 'Routeur', equipement: 'Routeur' },
    'toip': { monitoring: 'TOIP', equipement: 'TOIP' },
    'save': { monitoring: 'Sauvegarde', equipement: 'Sauvegarde' },
    'antivirus': { monitoring: 'Antivirus', equipement: 'Antivirus' },
    'antispam': { monitoring: 'Antispam', equipement: 'Antispam' },
    'ndd': { monitoring: 'NDD', equipement: 'NDD' },
    'o365': { monitoring: 'Office365', equipement: 'Office365' }
  };
  
  for (const [family, labels] of Object.entries(familyMapping)) {
    if (rawData[family]) {
      const items = rawData[family];
      if (items.length > 0) {
        // Le premier élément avec enabled=true indique que le module est activé
        const enabledItem = items.find(item => item.data?.enabled === true || item.is_active === true);
        if (enabledItem) {
          modules_monitoring[labels.monitoring] = true;
        }
        
        // Extraire les équipements
        if (labels.equipement === 'Sauvegarde') {
          console.log('🔵 Début traitement Sauvegarde, items bruts:', items.length, 'items');
          
          // Nouvelle structure : lignes séparées pour instances et jobs
          const realItems = items.filter(item => {
            if (!item.data || typeof item.data !== 'object') {
              console.log('⚠️ Item sans data ou data non-objet:', item);
              return false;
            }
            const dataKeys = Object.keys(item.data);
            if (dataKeys.length === 1 && item.data.enabled === true) return false;
            return true;
          });
          
          console.log('📦 Items Sauvegarde après filtrage:', realItems.length, realItems.map(i => ({
            id: i.id,
            name: i.name,
            dataType: typeof i.data,
            type: i.data?.type,
            data: i.data
          })));
          
          if (realItems.length > 0) {
            // Séparer les instances et les jobs
            const instanceItems = realItems.filter(item => item.data.type === 'instance');
            const jobItems = realItems.filter(item => item.data.type === 'job');
            
            console.log('🔍 Chargement Sauvegarde:', {
              totalItems: realItems.length,
              instanceItems: instanceItems.length,
              jobItems: jobItems.length,
              instances: instanceItems.map(i => ({ id: i.id, itemKey: i.item_key, logiciel: i.data.logiciel })),
              jobs: jobItems.map(j => ({ id: j.id, itemKey: j.item_key, nom: j.data.nom }))
            });
            
            // Reconstruire les instances avec leurs jobs
            const instances = instanceItems.map(instanceItem => {
              const instanceData = { ...instanceItem.data };
              delete instanceData.type; // Retirer le marqueur type
              
              // Extraire l'instanceId depuis la data (où on l'a sauvegardé)
              const instanceFrontendId = instanceData.instanceId;
              
              console.log(`🔹 Processing instance:`, {
                dbId: instanceItem.id,
                itemKey: instanceItem.item_key,
                instanceFrontendId: instanceFrontendId,
                logiciel: instanceData.logiciel
              });
              
              // Trouver tous les jobs de cette instance via l'item_key (job-{instance_frontend_id})
              const instanceJobs = jobItems
                .filter(jobItem => {
                  const jobItemKey = jobItem.item_key || '';
                  const expectedJobKey = `job-${instanceFrontendId}`;
                  const isJobOfThisInstance = jobItemKey === expectedJobKey;
                  
                  console.log(`  🔹 Checking job ${jobItem.id}: key="${jobItemKey}", expected="${expectedJobKey}", match=${isJobOfThisInstance}`);
                  
                  return isJobOfThisInstance;
                })
                .map(jobItem => {
                  const jobData = { ...jobItem.data };
                  delete jobData.type;
                  return {
                    id: jobItem.id,
                    ...jobData
                  };
                });
              
              console.log(`✅ Instance ${instanceFrontendId} (${instanceData.logiciel}):`, {
                jobsFound: instanceJobs.length,
                jobs: instanceJobs
              });
              
              return {
                id: instanceFrontendId,
                ...instanceData,
                jobs: instanceJobs
              };
            });
            
            equipements[labels.equipement] = {
              instances: instances
            };
          }
        } else if (labels.equipement === 'Antispam') {
          // Pour Antispam : agréger les solutions individuelles (nouvelle structure) ou prendre l'ancienne structure
          const realItems = items.filter(item => {
            if (!item.data || typeof item.data !== 'object') return false;
            const dataKeys = Object.keys(item.data);
            if (dataKeys.length === 1 && item.data.enabled === true) return false;
            // Garder les items qui ont un logiciel (nouvelle structure) ou solutions: [] (ancienne structure)
            return item.data.logiciel || (item.data.solutions && Array.isArray(item.data.solutions));
          });
          
          if (realItems.length > 0) {
            const firstItem = realItems[0];
            if (firstItem.data.solutions && Array.isArray(firstItem.data.solutions) && realItems.length === 1) {
              // Ancienne structure : une seule ligne avec { solutions: [...] }
              equipements[labels.equipement] = firstItem.data;
            } else {
              // Nouvelle structure : une ligne par solution, on les agrège
              const sortedItems = [...realItems].sort((a, b) => {
                const nameA = a.name || a.item_key || '';
                const nameB = b.name || b.item_key || '';
                return nameA.localeCompare(nameB);
              });
              equipements[labels.equipement] = {
                solutions: sortedItems.map(item => ({
                  id: item.id, // Garder l'ID pour les mises à jour
                  ...item.data
                }))
              };
            }
          }
        } else if (labels.equipement === 'Antivirus') {
          // Pour Antivirus : agréger les solutions individuelles (nouvelle structure) ou prendre l'ancienne structure
          // On garde TOUS les items qui ont des données réelles (pas juste un flag enabled)
          const realItems = items.filter(item => {
            if (!item.data || typeof item.data !== 'object') return false;
            const dataKeys = Object.keys(item.data);
            
            // Exclure uniquement les flags d'activation simples (uniquement {enabled: true})
            if (dataKeys.length === 1 && item.data.enabled === true) return false;
            
            // Si l'item_key commence par "solution-", c'est une vraie solution antivirus
            if (item.item_key && item.item_key.startsWith('solution-')) {
              return true;
            }
            
            // Si l'item a des solutions ou une solution, c'est une vraie donnée antivirus
            const hasSolutions = item.data.solutions && Array.isArray(item.data.solutions) && item.data.solutions.length > 0;
            const hasSolution = item.data.solution && typeof item.data.solution === 'string' && item.data.solution.trim() !== '';
            
            // Garder si c'est une vraie solution (a un solution ou solutions: [])
            if (hasSolutions || hasSolution) {
              return true;
            }
            
            // Si le name contient le nom d'une solution connue, c'est probablement une vraie solution
            if (item.name && (item.name.includes('BitDefender') || item.name.includes('Kaspersky') || 
                item.name.includes('Symantec') || item.name.includes('Trend') || 
                item.name.includes('McAfee') || item.name.includes('Norton') || 
                item.name.includes('Avast') || item.name.includes('AVG'))) {
              return true;
            }
            
            // Exclure uniquement les items où item_key ou name correspond exactement au nom du module
            // ET qui n'ont pas de vraies données (pas de solution/solutions)
            if ((item.item_key === labels.monitoring || item.item_key === labels.equipement ||
                 item.name === labels.monitoring || item.name === labels.equipement) &&
                !hasSolutions && !hasSolution) {
              return false;
            }
            
            // Si l'item a d'autres données (pas juste enabled), on le garde aussi
            if (dataKeys.length > 0 && !(dataKeys.length === 1 && dataKeys[0] === 'enabled')) {
              return true;
            }
            
            return false;
          });
          
          if (realItems.length > 0) {
            const firstItem = realItems[0];
            if (firstItem.data.solutions && Array.isArray(firstItem.data.solutions) && realItems.length === 1) {
              // Ancienne structure : une seule ligne avec { solutions: [...] }
              equipements[labels.equipement] = firstItem.data;
            } else {
              // Nouvelle structure : une ligne par solution, on les agrège
              const sortedItems = [...realItems].sort((a, b) => {
                const nameA = a.name || a.item_key || '';
                const nameB = b.name || b.item_key || '';
                return nameA.localeCompare(nameB);
              });
              equipements[labels.equipement] = {
                solutions: sortedItems.map(item => ({
                  id: item.id, // Garder l'ID pour les mises à jour
                  ...item.data
                }))
              };
            }
          } else {
            // Si aucun item réel trouvé, initialiser avec un tableau vide pour éviter les erreurs
            equipements[labels.equipement] = { solutions: [] };
          }
        } else if (labels.equipement === 'Office365') {
          // Pour Office365 : objet simple
          const item = items[0];
          if (item && item.data) {
            equipements[labels.equipement] = item.data;
          }
        } else {
          // Pour les tableaux (Serveurs, Internet, NAS, Firewalls, Switch, BorneWifi, NDD)
          // Filtrer les entrées qui ne sont pas juste des indicateurs d'activation de module
          const filteredItems = items.filter(item => {
            // Exclure les entrées sans données
            if (!item.data) {
              // Si data est null/undefined, vérifier si on peut utiliser name ou item_key
              if (item.name || item.item_key) {
                // Garder l'item même sans data, on utilisera name ou item_key comme nom
                return true;
              }
              return false;
            }
            
            // Si data est une string, essayer de la parser
            let parsedData = item.data;
            if (typeof item.data === 'string') {
              try {
                parsedData = JSON.parse(item.data);
              } catch (e) {
                parsedData = {};
              }
            }
            
            if (typeof parsedData !== 'object' || parsedData === null) {
              // Si data n'est pas un objet, mais qu'on a un name ou item_key, garder l'item
              if (item.name || item.item_key) {
                return true;
              }
              return false;
            }
            
            const dataKeys = Object.keys(parsedData);
            
            // Exclure uniquement les entrées qui sont clairement des flags "enabled"
            // MAIS garder les items qui ont un nom différent du module (ce sont probablement des équipements réels)
            const isModuleKey = item.item_key === labels.monitoring || item.item_key === labels.equipement ||
                           item.name === labels.monitoring || item.name === labels.equipement;
            const isEnabledFlag = dataKeys.length === 1 && parsedData.enabled === true;
            
            // Si c'est un flag d'activation du module (même nom que le module ET seulement enabled: true), l'exclure
            if (isModuleKey && isEnabledFlag) return false;
            
            // Garder tous les autres items:
            // - Items avec un nom différent du module (ce sont des équipements réels)
            // - Items avec de vraies données (pas juste enabled: true)
            // - Items avec seulement enabled: true MAIS nom != module name (c'est un équipement)
            return true;
          });
          
          // Debug temporaire pour les équipements vides
          if (items.length > 0 && (labels.equipement === 'Serveurs' || labels.equipement === 'NAS' || labels.equipement === 'Switch' || labels.equipement === 'BorneWifi' || labels.equipement === 'NDD' || labels.equipement === 'Internet')) {
            console.log(`🔍 Frontend Debug ${labels.equipement} - items.length:`, items.length);
            console.log(`🔍 Frontend Debug ${labels.equipement} - filteredItems.length:`, filteredItems.length);
            console.log(`🔍 Frontend Debug ${labels.equipement} - monitoringKey:`, labels.monitoring);
            console.log(`🔍 Frontend Debug ${labels.equipement} - equipementKey:`, labels.equipement);
            console.log(`🔍 Frontend Debug ${labels.equipement} - items:`, items.map(item => ({
              id: item.id,
              item_key: item.item_key,
              name: item.name,
              dataType: typeof item.data,
              dataIsObject: item.data && typeof item.data === 'object',
              dataKeys: item.data && typeof item.data === 'object' ? Object.keys(item.data) : (typeof item.data === 'string' ? 'STRING' : 'N/A'),
              data: item.data
            })));
          }
          
          equipements[labels.equipement] = filteredItems.map(item => {
            // Parser data si c'est une string
            let parsedData = item.data;
            if (typeof item.data === 'string') {
              try {
                parsedData = JSON.parse(item.data);
              } catch (e) {
                parsedData = {};
              }
            } else if (!item.data || typeof item.data !== 'object') {
              parsedData = {};
            }
            
            return {
              id: item.id, // Garder l'ID pour les mises à jour
              ...parsedData,
              nom: parsedData.nom || item.name || item.item_key || 'Sans nom'
            };
          });
        }
      }
    }
  }

  // Activer Microsoft Entra automatiquement si des credentials Azure existent
  if (azureHasCredentials) {
    modules_monitoring.Office365 = true;
  }
  
  return {
    modules,
    modules_monitoring,
    equipements
  };
}

// Fonction helper pour générer un hash simple d'un objet (pour identifier les connexions)
function hashObject(obj) {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Sauvegarder les modules/équipements d'un client avec synchronisation complète
export async function saveClientModules(clientId, data) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Sauvegarder les modules de monitoring et équipements
  const categoryToFamily = {
    'Internet': 'internet',
    'Serveurs': 'servers',
    'Stockage': 'stockage',
    'NAS': 'stockage',       // alias pour Stockage
    'Firewall': 'firewall',
    'Firewalls': 'firewall', // alias pluriel
    'Switch': 'switch',
    'BorneWifi': 'wifi',
    'Alimentation': 'alimentation',
    'Routeur': 'routeur',
    'TOIP': 'toip',
    'Sauvegarde': 'save',
    'Antivirus': 'antivirus',
    'Antispam': 'antispam',
    'NDD': 'ndd',
    'CertificatsSSL': 'ssl',
    'Office365': 'o365'
  };
  
  // Sauvegarder les modules de monitoring (activation/désactivation)
  const disabledFamilies = new Set();
  if (data.modules_monitoring) {
    // Si un module est désactivé, nettoyer les équipements associés pour éviter une réactivation à la prochaine édition
    const clearFamily = async (family) => {
      if (!family || family === 'module') return;
      try {
        await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ items: [] })
        });
      } catch (error) {
        console.warn(`Impossible de nettoyer la famille ${family}:`, error);
      }
    };

    for (const [moduleKey, moduleValue] of Object.entries(data.modules_monitoring)) {
      if (moduleValue === false) {
        const family = categoryToFamily[moduleKey] || FAMILY_MAPPING[moduleKey.toLowerCase()];
        if (family) disabledFamilies.add(family);
        await clearFamily(family);
      }
    }
  }
  
  // Sauvegarder les équipements avec synchronisation complète (utilise /sync)
  if (data.equipements) {
    const isMeaningfulValue = (val) => {
      if (val === undefined || val === null) return false;
      if (typeof val === 'string') return val.trim() !== '';
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object') return Object.keys(val).length > 0;
      if (typeof val === 'number') return val !== 0;
      return true;
    };

    // Vérifie si un objet équipement contient de vraies données (et pas uniquement les valeurs par défaut)
    const hasRealEquipmentData = (family, obj = {}) => {
      const lowerFamily = (family || '').toLowerCase();
      switch (lowerFamily) {
        case 'save': { // Sauvegarde
          // Nouveau format: obj.instances (array). Ancien format: version/expiration/jobs.
          if (Array.isArray(obj.instances)) {
            return obj.instances.some(inst => {
              if (!inst) return false;
              const versionOk = typeof inst.version === 'string' && inst.version.trim() !== '';
              const expirationOk = typeof inst.expiration === 'string' && inst.expiration.trim() !== '';
              const jobsOk = Array.isArray(inst.jobs) && inst.jobs.length > 0;
              const nameOk = typeof inst.server === 'string' && inst.server.trim() !== '';
              return versionOk || expirationOk || jobsOk || nameOk;
            });
          }
          const { version, expiration, jobs } = obj || {};
          const versionOk = typeof version === 'string' && version.trim() !== '';
          const expirationOk = typeof expiration === 'string' && expiration.trim() !== '';
          const jobsOk = Array.isArray(jobs) && jobs.length > 0;
          return versionOk || expirationOk || jobsOk;
        }
        case 'antivirus': {
          // Attendre au moins une solution ou une licence utile
          const { solutions } = obj || {};
          return Array.isArray(solutions) && solutions.length > 0;
        }
        case 'antispam': {
          const { expiration, utilisateursProteges, domainesSurveilles, logiciel, solutions } = obj || {};
          const expirationOk = typeof expiration === 'string' && expiration.trim() !== '';
          const usersOk = typeof utilisateursProteges === 'number' && utilisateursProteges > 0;
          const domainsOk = typeof domainesSurveilles === 'number' && domainesSurveilles > 0;
          const solutionsOk = Array.isArray(solutions) && solutions.length > 0;
          // Ne pas déclencher sur le logiciel par défaut seul
          return expirationOk || usersOk || domainsOk || solutionsOk;
        }
        case 'o365': {
          const { licences } = obj || {};
          return Array.isArray(licences) && licences.length > 0;
        }
        default:
          return Object.entries(obj).some(([, val]) => isMeaningfulValue(val));
      }
    };

    for (const [category, items] of Object.entries(data.equipements)) {
      const family = categoryToFamily[category] || FAMILY_MAPPING[category.toLowerCase()];
      if (!family || family === 'module') continue;
      // Ne pas réécrire les équipements si le module est désactivé
      if (disabledFamilies.has(family)) continue;
      
      try {
        if (Array.isArray(items) && items.length > 0) {
          // Pour les tableaux (Serveurs, NAS, Firewalls, Internet, Switch, BorneWifi, NDD)
          // Utiliser l'endpoint /sync pour synchronisation complète
          const itemsToSync = items.map(item => {
            // Nettoyer les champs vides pour les bornes WiFi
            let cleanedItem = item;
            if (category === 'BorneWifi') {
              cleanedItem = { ...item };
              // Supprimer les champs vides ou avec valeurs par défaut
              if (!cleanedItem.controleur || cleanedItem.controleur.trim() === '') delete cleanedItem.controleur;
              if (!cleanedItem.emplacement || cleanedItem.emplacement.trim() === '') delete cleanedItem.emplacement;
              if (!cleanedItem.expirationGarantie || cleanedItem.expirationGarantie.trim() === '') delete cleanedItem.expirationGarantie;
              if (cleanedItem.supportsWifi6 === false || cleanedItem.supportsWifi6 === null || cleanedItem.supportsWifi6 === undefined) delete cleanedItem.supportsWifi6;
              // Supprimer bandes si toutes les valeurs sont false ou null
              if (cleanedItem.bandes) {
                const hasActiveBande = Object.values(cleanedItem.bandes).some(v => v === true);
                if (!hasActiveBande) delete cleanedItem.bandes;
              }
              // Nettoyer et convertir les SSID en IDs (les SSID sont maintenant gérés globalement)
              if (Array.isArray(cleanedItem.ssids)) {
                cleanedItem.ssids = cleanedItem.ssids
                  .map(ssid => {
                    // Si c'est un objet avec un id, retourner l'id
                    if (typeof ssid === 'object' && ssid.id) return ssid.id;
                    // Si c'est une string (ancien format), la garder
                    if (typeof ssid === 'string' && ssid.trim() !== '') return ssid;
                    return null;
                  })
                  .filter(id => id !== null);
                if (cleanedItem.ssids.length === 0) delete cleanedItem.ssids;
              }
            }
            return {
              name: cleanedItem.nom || cleanedItem.name || 'Unnamed',
              data: cleanedItem,
              is_active: true
            };
          });
          
          await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ items: itemsToSync })
          });
        } else if (items && typeof items === 'object' && !Array.isArray(items)) {
          // Pour Sauvegarde : créer une ligne par instance ET une ligne par job
          if (category === 'Sauvegarde' && Array.isArray(items.instances)) {
            const instances = items.instances || [];
            if (instances.length > 0) {
              const itemsToSync = [];
              
              instances.forEach((instance, instIdx) => {
                const instanceId = instance.id;
                
                // 1. Créer une ligne pour l'instance elle-même
                const instanceData = {
                  logiciel: instance.logiciel,
                  server: instance.server,
                  expiration: instance.expiration,
                  version: instance.version,
                  activeBackupModules: instance.activeBackupModules,
                  activeBackupStorage: instance.activeBackupStorage,
                  hyperbackupSource: instance.hyperbackupSource, // Pour HyperBackup
                  hyperbackupDestination: instance.hyperbackupDestination, // Pour HyperBackup
                  instanceId: instanceId // Sauvegarder l'instanceId pour retrouver les jobs
                };
                
                const instanceName = instance.logiciel 
                  ? `${instance.logiciel} Instance`
                  : `Instance ${instIdx + 1}`;
                
                // L'item_key d'une instance est simplement "instance"
                const instanceKey = "instance";
                
                itemsToSync.push({
                  id: instanceId,
                  name: instanceName,
                  item_key: instanceKey,
                  data: {
                    ...instanceData,
                    type: 'instance' // Marquer comme instance
                  },
                  is_active: true
                });
                
                // 2. Créer une ligne pour chaque job de cette instance
                const jobs = instance.jobs || [];
                jobs.forEach((job, jobIdx) => {
                  const jobId = job.id;
                  const jobData = { ...job };
                  delete jobData.id;
                  
                  const jobName = job.nom 
                    ? `${instance.logiciel || 'Sauvegarde'} - ${job.nom}`
                    : `${instance.logiciel || 'Sauvegarde'} - Job ${jobIdx + 1}`;
                  
                  // L'item_key du job doit être 'job-{instance_id}' pour retrouver l'instance parent
                  const jobKey = `job-${instanceId}`;
                  
                  itemsToSync.push({
                    id: jobId,
                    name: jobName,
                    item_key: jobKey,
                    data: {
                      ...jobData,
                      // Le type de sauvegarde (Complète, Incrémentale, etc.) est préservé dans jobData.type
                      // Le backend identifie les jobs par item_key qui commence par 'job-', donc pas besoin de marqueur type: 'job'
                    },
                    is_active: true
                  });
                });
              });
              
              if (itemsToSync.length > 0) {
                await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
                  method: 'POST',
                  credentials: 'include',
                  headers,
                  body: JSON.stringify({ items: itemsToSync })
                });
              }
            } else {
              // Si aucune instance, supprimer tous les jobs et instances existants
              const existingItemsRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
                credentials: 'include'
              });
              const existingItems = existingItemsRes.ok ? await existingItemsRes.json() : [];
              for (const item of existingItems) {
                try {
                  await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${item.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                  });
                } catch (error) {
                  console.warn(`Impossible de supprimer l'instance ${item.id}:`, error);
                }
              }
            }
            continue; // Passer au suivant
          }
          
          // Pour Antivirus : traiter comme un tableau de solutions (une ligne par solution)
          if (category === 'Antivirus' && Array.isArray(items.solutions)) {
            const solutions = items.solutions || [];
            if (solutions.length > 0) {
              const itemsToSync = solutions.map(solution => {
                // Extraire l'ID de la solution si présent (pour les mises à jour)
                const solutionId = solution.id;
                const solutionData = { ...solution };
                delete solutionData.id; // Retirer l'ID du data car il est dans la table
                
                const solutionName = solution.solution 
                  ? `${solution.solution} #${solutions.indexOf(solution) + 1}`
                  : `Solution #${solutions.indexOf(solution) + 1}`;
                
                // item_key doit utiliser le companyId BitDefender pour que la synchro depuis AntivirusDetailPage
                // retrouve la même ligne (UPDATE au lieu de créer une nouvelle)
                const baseName = solution.solution || 'unknown';
                const companyId = solution.companyId || solution.data?.companyId;
                const solutionKey = companyId
                  ? `solution-${baseName}-${companyId}`
                  : (solutionId
                    ? `solution-${baseName}-${solutionId}`
                    : `solution-${baseName}-${Date.now()}-${solutions.indexOf(solution)}`);
                
                return {
                  id: solutionId, // ID pour la synchronisation
                  name: solutionName,
                  item_key: solutionKey,
                  data: solutionData,
                  is_active: true
                };
              });
              
              await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ items: itemsToSync })
              });
            } else {
              // Si aucune solution, supprimer toutes les solutions existantes
              const existingItemsRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
                credentials: 'include'
              });
              const existingItems = existingItemsRes.ok ? await existingItemsRes.json() : [];
              for (const item of existingItems) {
                try {
                  await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${item.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                  });
                } catch (error) {
                  console.warn(`Impossible de supprimer la solution ${item.id}:`, error);
                }
              }
            }
            continue; // Passer au suivant
          }
          
          // Pour Antispam : traiter comme un tableau de solutions (une ligne par solution)
          if (category === 'Antispam' && Array.isArray(items.solutions)) {
            const solutions = items.solutions || [];
            if (solutions.length > 0) {
              const itemsToSync = solutions.map(solution => {
                // Extraire l'ID de la solution si présent (pour les mises à jour)
                const solutionId = solution.id;
                const solutionData = { ...solution };
                delete solutionData.id; // Retirer l'ID du data car il est dans la table
                
                const displayName = solution.logiciel
                  ? `${solution.logiciel} #${solutions.indexOf(solution) + 1}`
                  : `Solution #${solutions.indexOf(solution) + 1}`;

                const logicielKey = solution.logiciel || solution.solution || "mailinblack";
                const customerId = solution.customerId || solution.data?.customerId;
                const solutionKey = customerId
                  ? `solution-${logicielKey}-${customerId}`
                  : solutionId
                    ? `solution-${logicielKey}-${solutionId}`
                    : `solution-${logicielKey}-${Date.now()}-${solutions.indexOf(solution)}`;

                return {
                  id: solutionId, // ID pour la synchronisation
                  name: displayName,
                  item_key: solutionKey,
                  data: solutionData,
                  is_active: true
                };
              });
              
              await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ items: itemsToSync })
              });
            } else {
              // Si aucune solution, supprimer toutes les solutions existantes
              const existingItemsRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
                credentials: 'include'
              });
              const existingItems = existingItemsRes.ok ? await existingItemsRes.json() : [];
              for (const item of existingItems) {
                try {
                  await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${item.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                  });
                } catch (error) {
                  console.warn(`Impossible de supprimer la solution ${item.id}:`, error);
                }
              }
            }
            continue; // Passer au suivant
          }
          
          // Pour les autres objets (Antivirus, Office365)
          // Vérifier si l'objet contient des données réelles (pas seulement enabled ou valeurs par défaut)
          const hasRealData = hasRealEquipmentData(family, items);
          
          if (!hasRealData) {
            // Si l'objet ne contient que "enabled", ne rien sauvegarder dans la table équipements
            // (c'est déjà géré dans modules_monitoring)
            continue;
          }
          
          // Récupérer l'élément existant
          const existingItemsRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
            credentials: 'include'
          });
          const existingItems = existingItemsRes.ok ? await existingItemsRes.json() : [];
          
          // Filtrer les entrées qui ne sont que des flags "enabled"
          const realExistingItems = existingItems.filter(item => {
            const data = item.data || {};
            const dataKeys = Object.keys(data);
            return !(dataKeys.length === 1 && dataKeys[0] === 'enabled' && data.enabled === true);
          });
          
          // Chercher l'élément avec le nom de la catégorie (parmi les vraies données)
          const existingItem = realExistingItems.find(item => 
            item.name === category || item.item_key === category
          );
          
          // Supprimer les entrées "enabled" qui ne sont pas des vraies données
          for (const enabledItem of existingItems.filter(item => {
            const data = item.data || {};
            const dataKeys = Object.keys(data);
            return dataKeys.length === 1 && dataKeys[0] === 'enabled' && data.enabled === true;
          })) {
            try {
              await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${enabledItem.id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers
              });
            } catch (error) {
              console.warn(`Impossible de supprimer l'entrée "enabled" pour ${category}:`, error);
            }
          }
          
          if (existingItem) {
            // Mettre à jour
            await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${existingItem.id}`, {
              method: 'PUT',
              credentials: 'include',
              headers,
              body: JSON.stringify({
                item_key: category,
                name: category,
                data: items,
                is_active: true
              })
            });
          } else {
            // Créer
            await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
              method: 'POST',
              credentials: 'include',
              headers,
              body: JSON.stringify({
                item_key: category,
                name: category,
                data: items,
                is_active: true
              })
            });
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la sauvegarde des équipements ${category}:`, error);
      }
    }

    if (
      data.equipements?.Antivirus != null ||
      data.equipements?.Antispam != null ||
      data.equipements?.Sauvegarde != null
    ) {
      invalidateCyberPageDataCache();
    }

    if (data.equipements?.NDD != null) {
      invalidateServiceDomainsCache();
    }
  }
}

// CRUD pour un élément spécifique d'une famille
export async function createClientModuleItem(clientId, family, item) {
  const backendFamily = FAMILY_MAPPING[family.toLowerCase()] || family.toLowerCase();
  const res = await fetch(`${MODULES_BASE_URL}/${clientId}/${backendFamily}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error(`Erreur lors de la création de l'élément ${family}`);
  return await res.json();
}

export async function updateClientModuleItem(clientId, family, itemId, item) {
  const backendFamily = FAMILY_MAPPING[family.toLowerCase()] || family.toLowerCase();
  const res = await fetch(`${MODULES_BASE_URL}/${clientId}/${backendFamily}/${itemId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error(`Erreur lors de la mise à jour de l'élément ${family}`);
  return await res.json();
}

export async function deleteClientModuleItem(clientId, family, itemId) {
  const backendFamily = FAMILY_MAPPING[family.toLowerCase()] || family.toLowerCase();
  const res = await fetch(`${MODULES_BASE_URL}/${clientId}/${backendFamily}/${itemId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`Erreur lors de la suppression de l'élément ${family}`);
  return await res.json();
}

export async function purgeClientLogs(clientId) {
  // TODO: Implémenter l'endpoint DELETE /api/clients/{id}/logs côté backend
  // La table v_b_clients_logs contient les logs à purger pour ce client
  const res = await fetch(`${BASE_URL}/${clientId}/logs`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Erreur lors de la purge des logs');
  }
  return await res.json();
}

export async function purgeContactLogs(contactId) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/logs`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Erreur lors de la purge des logs');
  }
  return await res.json();
}

export async function fetchContactLogs(contactId, options = {}) {
  const params = new URLSearchParams();
  const limit = options.limit ?? 10;
  const page = options.page ?? 1;
  params.set("limit", String(limit));
  params.set("page", String(page));
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/logs?${params}`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) throw new Error("Erreur lors du chargement de l'historique contact");
  return res.json();
}

// ──────────────────────────────
// Fonctions API pour les contacts
// ──────────────────────────────

export async function fetchContacts(clientId = null, options = {}) {
  const url = clientId 
    ? `${API_BASE_URL}/contacts?client_id=${clientId}`
    : `${API_BASE_URL}/contacts`;
  const res = await fetch(url, {
    credentials: 'include',
    signal: options.signal,
  });
  if (!res.ok) throw new Error("Erreur lors du fetch des contacts");
  return await res.json();
} 

export async function fetchContactsList(clientId = null, options = {}) {
  const params = new URLSearchParams();
  if (clientId != null && clientId !== "") {
    params.set("client_id", String(clientId));
  }
  params.set("_", String(Date.now()));
  const query = params.toString();
  const url = `${API_BASE_URL}/contacts/list${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    credentials: "include",
    signal: options.signal,
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      errorData.details ||
      errorData.error ||
      "Erreur lors du fetch de la liste contacts";
    throw new Error(message);
  }
  return await res.json();
}
export async function addContact(contact) {
  const res = await fetch(`${API_BASE_URL}/contacts`, {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Erreur lors de l'ajout du contact";
    throw new Error(errorMessage);
  }
  return await res.json();
}

export async function updateContact(contactId, contact) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
    method: "PUT",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Erreur lors de la modification du contact";
    throw new Error(errorMessage);
  }
  return await res.json();
}

export async function deleteContact(contactId) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
    method: "DELETE",
    credentials: 'include'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Erreur lors de la suppression du contact";
    throw new Error(errorMessage);
  }
  return await res.json();
}

// ──────────────────────────────
// Étiquettes & notes client
// ──────────────────────────────

async function parseClientMetaError(res, fallback) {
  const errorData = await res.json().catch(() => ({}));
  throw new Error(errorData.error || errorData.details || fallback);
}

export async function fetchTagCatalog(options = {}) {
  const res = await fetch(`${BASE_URL}/tags/catalog`, {
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors du chargement des étiquettes");
  return res.json();
}

export async function fetchClientTags(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/tags`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors du chargement des étiquettes du client");
  return res.json();
}

export async function addClientTag(clientId, { label, color }, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/tags`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, color }),
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors de l'ajout de l'étiquette");
  return res.json();
}

export async function removeClientTag(clientId, tagId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/tags/${tagId}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors de la suppression de l'étiquette");
  return res.json();
}

export async function fetchContactTags(contactId, options = {}) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/tags`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors du chargement des étiquettes du contact");
  return res.json();
}

export async function addContactTag(contactId, { label, color }, options = {}) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/tags`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, color }),
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors de l'ajout de l'étiquette");
  return res.json();
}

export async function removeContactTag(contactId, tagId, options = {}) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/tags/${tagId}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors de la suppression de l'étiquette");
  return res.json();
}

export async function fetchClientNotes(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/notes`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors du chargement des notes");
  return res.json();
}

export async function createClientNote(clientId, content, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/notes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors de l'ajout de la note");
  return res.json();
}

export async function updateClientNote(clientId, noteId, content, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/notes/${noteId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors de la modification de la note");
  return res.json();
}

export async function deleteClientNote(clientId, noteId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/notes/${noteId}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors de la suppression de la note");
  return res.json();
}

export async function fetchClientSupportCredits(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/support-credits`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors du chargement des crédits support");
  return res.json();
}

export async function creditClientSupportTickets(clientId, { amount, note, label, validFrom, validUntil }, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/support-credits`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, note, label, validFrom, validUntil }),
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors du crédit des tickets support");
  return res.json();
}

export async function fetchAllSupportCreditPacks(options = {}) {
  const res = await fetch(`${BASE_URL}/support-credits/packs`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors du chargement des carnets support");
  return res.json();
}

export async function updateSupportCreditPack(clientId, packId, payload, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/support-credits/packs/${packId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors de la modification du carnet");
  return res.json();
}

export async function deleteSupportCreditPack(clientId, packId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/support-credits/packs/${packId}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) await parseClientMetaError(res, "Erreur lors de la suppression du carnet");
  return res.json();
}