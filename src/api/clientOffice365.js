import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/client-office365`;

/**
 * Récupère les credentials Office 365 d'un client
 */
export async function getClientOffice365Credentials(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la récupération des credentials");
  }
  return await res.json();
}

/**
 * Enregistre ou met à jour les credentials Office 365 d'un client
 */
export async function saveClientOffice365Credentials(clientId, credentials) {
  const res = await fetch(`${BASE_URL}/${clientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de l'enregistrement des credentials");
  }
  return await res.json();
}

/**
 * Supprime les credentials Office 365 d'un client
 */
export async function deleteClientOffice365Credentials(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la suppression des credentials");
  }
  return await res.json();
}

/**
 * Teste la connexion Office 365 avec les credentials d'un client
 */
export async function testClientOffice365Connection(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}/test`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors du test de connexion");
  }
  return await res.json();
}

/**
 * Teste la connexion Office 365 avec les credentials fournies (sans les sauvegarder)
 */
export async function testOffice365ConnectionWithCredentials(credentials) {
  const res = await fetch(`${BASE_URL}/test-credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors du test de connexion");
  }
  return await res.json();
}

/**
 * Récupère la date d'expiration du Client Secret depuis Microsoft Graph
 */
export async function getClientSecretExpiration(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}/secret-expiration`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la récupération de la date d'expiration");
  }
  return await res.json();
}

/**
 * Récupère les statistiques Azure sauvegardées pour un client
 */
export async function getClientAzureStats(clientId) {
  const res = await fetch(`${API_BASE_URL}/office365/stats/saved/${clientId}`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la récupération des statistiques");
  }
  return await res.json();
}

/**
 * Récupère les détails MFA de tous les utilisateurs du tenant
 */
export async function getClientMfaDetails(clientId) {
  const res = await fetch(`${API_BASE_URL}/office365/mfa-details/${clientId}`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la récupération des détails MFA");
  }
  return await res.json();
}

