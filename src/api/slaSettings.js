import API_BASE_URL from "../config";

const BASE = `${API_BASE_URL}/sla-settings`;

export async function fetchSlaSettings() {
  const res = await fetch(BASE, { credentials: "include" });
  if (!res.ok) throw new Error("Impossible de charger les paramètres SLA");
  return res.json();
}

export async function updateSlaSettings(payload) {
  const res = await fetch(BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Échec de l'enregistrement");
  return data;
}
