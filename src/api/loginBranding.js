import API_BASE_URL from "../config";

const BASE = `${API_BASE_URL}/login-branding`;

export async function fetchLoginBranding() {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Impossible de charger la personnalisation login");
  return res.json();
}

export async function fetchLoginBrandingAdmin() {
  const res = await fetch(`${BASE}/admin`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Impossible de charger la personnalisation login");
  return data;
}

export async function updateLoginBranding(payload) {
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

export async function uploadLoginBrandingAsset(side, kind, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/${side}/${kind}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Échec de l'upload");
  return data;
}

export async function deleteLoginBrandingAsset(side, kind) {
  const res = await fetch(`${BASE}/${side}/${kind}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Suppression impossible");
  return data;
}
