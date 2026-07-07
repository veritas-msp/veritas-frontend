import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/client-bitdefender`;
const BITDEFENDER_URL = `${API_BASE_URL}/bitdefender`;

export async function getGlobalBitdefenderStatus() {
  const res = await fetch(`${BASE_URL}/global-status`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la vérification de la configuration");
  }
  return res.json();
}

export async function listClientBitdefenderTenants(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la récupération des tenants");
  }
  return res.json();
}

export async function createClientBitdefenderTenant(clientId, payload) {
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

export async function updateClientBitdefenderTenant(clientId, tenantId, payload) {
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

export async function deleteClientBitdefenderTenant(clientId, tenantId) {
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

export async function testBitdefenderCredentials({ apiUrl, apiKey }) {
  const res = await fetch(`${BASE_URL}/test-credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ apiUrl, apiKey }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Échec du test de connexion");
  }
  return res.json();
}

export async function testClientBitdefenderTenant(clientId, tenantId) {
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

export function buildBitdefenderQueryParams({ clientId, bitdefenderTenantId, mappingMode } = {}) {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", String(clientId));
  if (mappingMode === "dedicated" && bitdefenderTenantId) {
    params.set("bitdefenderTenantId", String(bitdefenderTenantId));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchBitdefenderCompanies({ clientId, bitdefenderTenantId, mappingMode } = {}) {
  const qs = buildBitdefenderQueryParams({ clientId, bitdefenderTenantId, mappingMode });
  const res = await fetch(`${BITDEFENDER_URL}/companies${qs}`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors du chargement des entreprises");
  }
  return res.json();
}

export async function syncBitdefenderCompany(companyId, { clientId, bitdefenderTenantId, mappingMode } = {}) {
  const qs = buildBitdefenderQueryParams({ clientId, bitdefenderTenantId, mappingMode });
  const res = await fetch(`${BITDEFENDER_URL}/sync/${companyId}${qs}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors de la synchronisation");
  }
  return res.json();
}

export async function fetchGravityZoneDashboard(companyId, { clientId, bitdefenderTenantId, mappingMode } = {}) {
  const qs = buildBitdefenderQueryParams({ clientId, bitdefenderTenantId, mappingMode });
  const res = await fetch(`${BITDEFENDER_URL}/gravityzone/${companyId}/dashboard${qs}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors du chargement du tableau de bord GravityZone");
  }
  return res.json();
}

export async function fetchBitdefenderStatistics(companyId, { clientId, bitdefenderTenantId, mappingMode } = {}) {
  const qs = buildBitdefenderQueryParams({ clientId, bitdefenderTenantId, mappingMode });
  const res = await fetch(`${BITDEFENDER_URL}/statistics/${companyId}${qs}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors du chargement des statistiques Bitdefender");
  }
  return res.json();
}

export async function fetchBitdefenderEnrichedEndpoints(companyId, { clientId, bitdefenderTenantId, mappingMode } = {}) {
  const qs = buildBitdefenderQueryParams({ clientId, bitdefenderTenantId, mappingMode });
  const res = await fetch(`${BITDEFENDER_URL}/endpoints/${companyId}/enriched${qs}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
    throw new Error(errorData.error || "Erreur lors du chargement des endpoints enrichis");
  }
  return res.json();
}
