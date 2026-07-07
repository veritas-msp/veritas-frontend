import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/client-mailinblack`;
const MAILINBLACK_URL = `${API_BASE_URL}/mailinblack`;

export async function getGlobalMailinblackStatus() {
  const res = await fetch(`${BASE_URL}/global-status`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la vérification de la configuration");
  }
  return res.json();
}

export async function listClientMailinblackTenants(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la récupération des tenants");
  }
  return res.json();
}

export async function createClientMailinblackTenant(clientId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la création du tenant");
  }
  return res.json();
}

export async function updateClientMailinblackTenant(clientId, tenantId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la mise à jour du tenant");
  }
  return res.json();
}

export async function deleteClientMailinblackTenant(clientId, tenantId) {
  const res = await fetch(`${BASE_URL}/${clientId}/${tenantId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la suppression du tenant");
  }
  return res.json();
}

export async function testMailinblackCredentials({ apiUrl, apiKey, authKey, authClientId }) {
  const res = await fetch(`${BASE_URL}/test-credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      apiUrl,
      authKey: authKey || apiKey,
      authClientId,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Échec du test de connexion");
  }
  return res.json();
}

export async function testClientMailinblackTenant(clientId, tenantId) {
  const res = await fetch(`${BASE_URL}/${clientId}/${tenantId}/test`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Échec du test de connexion");
  }
  return res.json();
}

export function buildMailinblackQueryParams(credentialContext = {}) {
  const params = new URLSearchParams();
  if (credentialContext.clientId) params.set("clientId", credentialContext.clientId);
  if (credentialContext.mailinblackTenantId) {
    params.set("mailinblackTenantId", credentialContext.mailinblackTenantId);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchMailinblackCustomers(credentialContext = {}) {
  const res = await fetch(
    `${MAILINBLACK_URL}/customers${buildMailinblackQueryParams(credentialContext)}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Impossible de charger les clients Mailinblack");
  }
  return res.json();
}

export async function syncMailinblackCustomer(customerId, credentialContext = {}) {
  const res = await fetch(
    `${MAILINBLACK_URL}/sync/${encodeURIComponent(customerId)}${buildMailinblackQueryParams(credentialContext)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Synchronisation Mailinblack échouée");
  }
  return res.json();
}

export async function fetchMailinblackDashboard(customerId, credentialContext = {}) {
  const res = await fetch(
    `${MAILINBLACK_URL}/dashboard/${encodeURIComponent(customerId)}${buildMailinblackQueryParams(credentialContext)}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Impossible de charger le dashboard Mailinblack");
  }
  const json = await res.json();
  return json.dashboard;
}
