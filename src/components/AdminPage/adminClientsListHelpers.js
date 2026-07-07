import { fetchClientsList } from "../../api/clients";

/** Une seule entrée pour Administration > Clients et > Monitoring (même payload liste). */
export const ADMIN_CLIENTS_LIST_CACHE_KEY = "admin_panel_clients_list_v5";
export const ADMIN_CLIENTS_LIST_CACHE_SCHEMA = 2;
export const ADMIN_CLIENTS_LIST_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Liste /clients/list : fusion options (contrat) + snapshot modules (monitoring),
 * proche du merge fetchClients sans N× GET /clients/:id/modules.
 */
export function normalizeAdminClientRow(client) {
  let modulesSnapshot = client.modules;
  if (typeof modulesSnapshot === "string") {
    try {
      modulesSnapshot = JSON.parse(modulesSnapshot);
    } catch {
      modulesSnapshot = {};
    }
  }
  if (!modulesSnapshot || typeof modulesSnapshot !== "object") {
    modulesSnapshot = {};
  }
  let options = client.options || {};
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      options = {};
    }
  }
  if (!options || typeof options !== "object") {
    options = {};
  }
  return {
    ...client,
    modules_monitoring: modulesSnapshot,
    modules: { ...modulesSnapshot, ...options },
    deletion: client.deletion,
    deletable: client.deletable,
    deletion_blockers: client.deletion_blockers,
    equipmentCounts: client.equipmentCounts,
  };
}

function isCacheEntryFresh(parsed) {
  if (!parsed?.savedAt || !Array.isArray(parsed?.data)) return false;
  if (parsed.schema !== ADMIN_CLIENTS_LIST_CACHE_SCHEMA) return false;
  if (Date.now() - parsed.savedAt >= ADMIN_CLIENTS_LIST_CACHE_TTL_MS) return false;
  if (parsed.data.length === 0) return true;
  const first = parsed.data[0];
  return (
    first?.deletion !== undefined ||
    first?.deletable !== undefined ||
    Array.isArray(first?.deletion_blockers)
  );
}

export async function loadAdminClientsListCached({
  force = false,
  signal,
  cacheKey = ADMIN_CLIENTS_LIST_CACHE_KEY,
} = {}) {
  if (!force) {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isCacheEntryFresh(parsed)) {
          return parsed.data.map(normalizeAdminClientRow);
        }
      }
    } catch {
      // ignore
    }
  }
  const data = await fetchClientsList({ signal });
  if (signal?.aborted) return [];
  const normalized = (Array.isArray(data) ? data : []).map(normalizeAdminClientRow);
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        savedAt: Date.now(),
        schema: ADMIN_CLIENTS_LIST_CACHE_SCHEMA,
        data: normalized,
      })
    );
  } catch {
    // ignore
  }
  return normalized;
}
