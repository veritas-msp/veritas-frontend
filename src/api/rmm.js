import API_BASE_URL from "../config";
import { readApiErrorPayload, createApiError } from "../utils/apiErrors";

const jsonHeaders = { "Content-Type": "application/json" };

async function handleResponse(response) {
  const data = await readApiErrorPayload(response);
  if (!response.ok) {
    throw createApiError(data.error || `Erreur ${response.status}`, {
      code: data.code,
      status: response.status,
    });
  }
  return data;
}

export async function fetchRmmSettings() {
  const response = await fetch(`${API_BASE_URL}/rmm/settings`, {
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function fetchRmmMetricsStorage() {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/metrics-storage`, {
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function updateRmmSettings(payload) {
  const response = await fetch(`${API_BASE_URL}/rmm/settings`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function fetchRmmClientSettingsList() {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/clients`, {
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function fetchRmmClientSettings(clientId) {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/clients/${clientId}`, {
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function updateRmmClientSettings(clientId, payload) {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/clients/${clientId}`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function deleteRmmClientSettings(clientId) {
  const response = await fetch(`${API_BASE_URL}/rmm/settings/clients/${clientId}`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function fetchRmmEnrollmentTokens(clientId, { status = "active" } = {}) {
  const url = new URL(`${API_BASE_URL}/rmm/enrollment-tokens`);
  if (clientId) url.searchParams.set("clientId", clientId);
  if (status) url.searchParams.set("status", status);
  const response = await fetch(url.toString(), {
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function createRmmEnrollmentToken(payload) {
  const response = await fetch(`${API_BASE_URL}/rmm/enrollment-tokens`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function revokeRmmEnrollmentToken(tokenId) {
  const response = await fetch(`${API_BASE_URL}/rmm/enrollment-tokens/${tokenId}`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function restoreRmmEnrollmentToken(tokenId) {
  const response = await fetch(`${API_BASE_URL}/rmm/enrollment-tokens/${tokenId}/restore`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function deleteRmmEnrollmentTokenPermanently(tokenId) {
  const response = await fetch(`${API_BASE_URL}/rmm/enrollment-tokens/${tokenId}/permanent`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function fetchRmmAgents(clientId) {
  const url = new URL(`${API_BASE_URL}/rmm/agents`);
  if (clientId) url.searchParams.set("clientId", clientId);
  const response = await fetch(url.toString(), {
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function updateRmmAgentStatus(agentId, status) {
  const response = await fetch(`${API_BASE_URL}/rmm/agents/${agentId}`, {
    method: "PATCH",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
}

export async function requestRmmAgentSync(agentId) {
  const response = await fetch(`${API_BASE_URL}/rmm/agents/${agentId}/request-sync`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function cancelRmmAgentSync(agentId) {
  const response = await fetch(`${API_BASE_URL}/rmm/agents/${agentId}/cancel-sync`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

export async function fetchRmmMetricHistory(agentId, { metric = "disk_used_pct", dim, days = 90 } = {}) {
  const url = new URL(`${API_BASE_URL}/rmm/agents/${agentId}/metrics/history`);
  url.searchParams.set("metric", metric);
  if (dim != null && dim !== "") url.searchParams.set("dim", String(dim));
  url.searchParams.set("days", String(days));
  const response = await fetch(url.toString(), {
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

async function downloadRmmFile(path, fallbackFilename) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${response.status}`);
  }
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  const filename = match?.[1] || fallbackFilename;
  const version = response.headers.get("X-Veritas-Installer-Version") || null;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { filename, version };
}

export async function fetchRmmInstallerInfo() {
  const response = await fetch(`${API_BASE_URL}/rmm/agent/installer-info`, {
    credentials: "include",
    headers: jsonHeaders,
  });
  return handleResponse(response);
}

/** Installateur Windows (.zip · .cmd + .ps1, moins détecté par Defender) */
export async function downloadRmmWindowsAgentSetupZip() {
  const cacheBust = Date.now();
  return downloadRmmFile(
    `/rmm/agent/download/windows/zip?v=${cacheBust}`,
    "VeritasAgent-Windows-Setup.zip"
  );
}

/** Installateur Windows (.cmd autonome · script PS1 embarqué, régénéré à chaque téléchargement) */
export async function downloadRmmWindowsAgentSetup() {
  const cacheBust = Date.now();
  return downloadRmmFile(
    `/rmm/agent/download/windows?v=${cacheBust}`,
    "VeritasAgent-Windows-Setup.cmd"
  );
}

/** Installateur Windows (.msi · recommandé pour GPO/Intune) */
export async function downloadRmmWindowsAgentSetupMsi() {
  const cacheBust = Date.now();
  return downloadRmmFile(
    `/rmm/agent/download/windows/msi?v=${cacheBust}`,
    "VeritasAgent-Windows-Setup.msi"
  );
}
