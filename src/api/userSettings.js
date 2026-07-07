// ───────────────────────────────────────────────
// 📦 API PARAMÈTRES UTILISATEUR
// ───────────────────────────────────────────────
import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/user-settings`;

// Auth via cookie httpOnly (credentials: "include")
const jsonHeaders = {
  "Content-Type": "application/json",
};

// ───────────────────────────────────────────────
// 📥 GET /api/user-settings/:key · Récupérer un paramètre utilisateur
// ───────────────────────────────────────────────
export const getUserSetting = async (key) => {
  const res = await fetch(`${BASE_URL}/${key}`, {
    headers: jsonHeaders,
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 404) {
      return { value: null };
    }
    throw new Error("Erreur lors de la récupération du paramètre");
  }
  return await res.json();
};

// ───────────────────────────────────────────────
// 💾 POST /api/user-settings/:key · Sauvegarder un paramètre utilisateur
// ───────────────────────────────────────────────
export const saveUserSetting = async (key, value) => {
  const res = await fetch(`${BASE_URL}/${key}`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    throw new Error("Erreur lors de la sauvegarde du paramètre");
  }
  return await res.json();
};

// ───────────────────────────────────────────────
// 📋 GET /api/user-settings · Récupérer tous les paramètres utilisateur
// ───────────────────────────────────────────────
export const getAllUserSettings = async () => {
  const res = await fetch(`${BASE_URL}`, {
    headers: jsonHeaders,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Erreur lors de la récupération des paramètres");
  }
  return await res.json();
};

