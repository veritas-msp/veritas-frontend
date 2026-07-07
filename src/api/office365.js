import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/office365`;

/**
 * Récupère les licences Office 365 depuis Microsoft Graph API
 * @param {string} clientId - ID du client (optionnel, pour filtrer par client)
 * @returns {Promise<Array>} Liste des licences avec détails
 */
export async function fetchOffice365Licences(clientId = null) {
  const url = clientId ? `${BASE_URL}/licences?clientId=${clientId}` : `${BASE_URL}/licences`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des licences" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère les utilisateurs Office 365 depuis Microsoft Graph API
 * @param {string} clientId - ID du client (optionnel, pour filtrer par client)
 * @param {Object} options - Options de pagination et filtrage
 * @returns {Promise<Object>} Objet contenant les utilisateurs et les métadonnées
 */
export async function fetchOffice365Users(clientId = null, options = {}) {
  const { page = 1, pageSize = 100, filter = null } = options;
  const params = new URLSearchParams();
  
  if (clientId) params.append("clientId", clientId);
  if (page) params.append("page", page);
  if (pageSize) params.append("pageSize", pageSize);
  if (filter) params.append("filter", filter);
  
  const url = `${BASE_URL}/users?${params.toString()}`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des utilisateurs" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère toutes les données Office 365 (licences + utilisateurs) en une seule requête.
 *
 * IMPORTANT :
 *  - Historiquement, cela appelait l'endpoint /data.
 *  - Désormais, TOUTES les synchronisations passent par /sync-all pour
 *    garantir que les snapshots complets sont générés (licences, users,
 *    exchangeData, teamsData, onedriveData, sharepointData, securityData, etc.).
 *
 * @param {string} clientId - ID du client (optionnel)
 * @returns {Promise<Object>} Objet contenant au minimum { success, licences, users, adoptionScore, lastUpdate }
 */
export async function fetchOffice365Data(clientId = null) {
  const url = clientId
    ? `${BASE_URL}/sync-all?clientId=${clientId}`
    : `${BASE_URL}/sync-all`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const raw = await res.json().catch(() => ({}));

  if (!res.ok || !raw.success) {
    const errorMessage =
      raw.error || raw.message || "Erreur lors de la synchronisation Office 365";
    throw new Error(errorMessage);
  }

  const snapshot = raw.data || {};

  // Adapter la réponse au format attendu historiquement par le frontend
  return {
    success: true,
    licences: snapshot.licences || [],
    users: snapshot.users || [],
    adoptionScore: snapshot.adoptionScore || null,
    lastUpdate: raw.lastUpdate || snapshot.lastUpdate || null,
  };
}

/**
 * Teste la connexion à Microsoft Graph API
 * @param {string} clientId - ID du client (optionnel, pour utiliser les credentials spécifiques au client)
 * @returns {Promise<Object>} Statut de la connexion
 */
export async function testOffice365Connection(clientId = null) {
  const url = clientId ? `${BASE_URL}/test?clientId=${clientId}` : `${BASE_URL}/test`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors du test de connexion" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère les statistiques Office 365 (utilisation globale, coûts, etc.)
 * @param {string} clientId - ID du client (optionnel)
 * @returns {Promise<Object>} Statistiques détaillées
 */
export async function fetchOffice365Stats(clientId = null) {
  const url = clientId ? `${BASE_URL}/stats?clientId=${clientId}` : `${BASE_URL}/stats`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des statistiques" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère les données Exchange Online
 * @param {string} clientId - ID du client (optionnel)
 * @param {string} period - Période (D7, D30, D90) - toujours D90 pour récupérer le maximum
 * @param {string} startDate - Date de début du rapport (ISO string)
 * @param {string} endDate - Date de fin du rapport (ISO string)
 * @returns {Promise<Object>} Données Exchange
 */
export async function fetchOffice365Exchange(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append('clientId', clientId);
  params.append('period', period);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const url = `${BASE_URL}/exchange?${params.toString()}`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des données Exchange" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère les données Microsoft Teams
 * @param {string} clientId - ID du client (optionnel)
 * @param {string} period - Période (D7, D30, D90) - utilisé pour récupérer D90 puis filtrer
 * @param {string} startDate - Date de début pour filtrer (optionnel)
 * @param {string} endDate - Date de fin pour filtrer (optionnel)
 * @returns {Promise<Object>} Données Teams
 */
export async function fetchOffice365Teams(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append("clientId", clientId);
  params.append("period", period);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  
  const url = `${BASE_URL}/teams?${params.toString()}`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des données Teams" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère les données OneDrive for Business
 * @param {string} clientId - ID du client (optionnel)
 * @param {string} period - Période (D7, D30, D90) - utilisé pour récupérer D90 puis filtrer
 * @param {string} startDate - Date de début pour filtrer (optionnel)
 * @param {string} endDate - Date de fin pour filtrer (optionnel)
 * @returns {Promise<Object>} Données OneDrive
 */
export async function fetchOffice365OneDrive(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append("clientId", clientId);
  params.append("period", period);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  
  const url = `${BASE_URL}/onedrive?${params.toString()}`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des données OneDrive" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère les données SharePoint Online
 * @param {string} clientId - ID du client (optionnel)
 * @param {string} period - Période (D7, D30, D90) - utilisé pour récupérer D90 puis filtrer
 * @param {string} startDate - Date de début pour filtrer (optionnel)
 * @param {string} endDate - Date de fin pour filtrer (optionnel)
 * @returns {Promise<Object>} Données SharePoint
 */
export async function fetchOffice365SharePoint(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append("clientId", clientId);
  params.append("period", period);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  
  const url = `${BASE_URL}/sharepoint?${params.toString()}`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des données SharePoint" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère les données de sécurité (MFA, rôles administrateurs)
 * @param {string} clientId - ID du client (optionnel)
 * @returns {Promise<Object>} Données de sécurité
 */
export async function fetchOffice365Security(clientId = null) {
  const url = clientId ? `${BASE_URL}/security?clientId=${clientId}` : `${BASE_URL}/security`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des données de sécurité" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère les données d'utilisation des applications Microsoft 365
 * @param {string} clientId - ID du client (optionnel)
 * @param {string} period - Période (D7, D30, D90) - utilisé pour récupérer D90 puis filtrer
 * @param {string} startDate - Date de début pour filtrer (optionnel)
 * @param {string} endDate - Date de fin pour filtrer (optionnel)
 * @returns {Promise<Object>} Données d'utilisation des applications
 */
export async function fetchOffice365Applications(clientId = null, period = 'D90', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  if (clientId) params.append("clientId", clientId);
  params.append("period", period);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  
  const url = `${BASE_URL}/applications?${params.toString()}`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des données d'applications" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

/**
 * Récupère les alertes et problèmes Office 365
 * @param {string} clientId - ID du client (optionnel)
 * @returns {Promise<Object>} Données d'alertes
 */
export async function fetchOffice365Alerts(clientId = null) {
  const url = clientId ? `${BASE_URL}/alerts?clientId=${clientId}` : `${BASE_URL}/alerts`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur lors de la récupération des alertes" }));
    throw new Error(error.error || `Erreur HTTP: ${res.status}`);
  }
  
  return await res.json();
}

