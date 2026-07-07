import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/maintenance`;

// ──────────────────────────────
// Statut de maintenance
// ──────────────────────────────
export async function getMaintenanceStatus() {
  // Cette route est publique, pas besoin de token
  const res = await fetch(`${BASE_URL}/status`);
  if (!res.ok) throw new Error("Erreur lors de la récupération du statut de maintenance");
  return await res.json();
}

export async function toggleMaintenance(enabled, message, options = {}) {
  const {
    tickerSpeed,
    tickerDirection,
    tickerColor,
  } = options;

  const res = await fetch(`${BASE_URL}/toggle`, {
    method: 'POST',
    credentials: 'include', // Auth via cookie HttpOnly
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      enabled,
      message,
      tickerSpeed,
      tickerDirection,
      tickerColor,
    })
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
      errorData.detail ||
      errorData.hint ||
      "Erreur lors de la modification du statut de maintenance"
    );
  }
  return await res.json();
}

// ──────────────────────────────
// Sauvegardes
// ──────────────────────────────
export async function getBackups() {
  const res = await fetch(`${BASE_URL}/backups`, {
    credentials: 'include' // Auth via cookie HttpOnly
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    throw new Error("Erreur lors de la récupération des sauvegardes");
  }
  return await res.json();
}

export async function createBackup() {
  const res = await fetch(`${BASE_URL}/backup`, {
    method: 'POST',
    credentials: 'include' // Auth via cookie HttpOnly
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    throw new Error("Erreur lors de la création de la sauvegarde");
  }
  return await res.json();
}

export async function restoreBackup(filename) {
  const res = await fetch(`${BASE_URL}/restore`, {
    method: 'POST',
    credentials: 'include', // Auth via cookie HttpOnly
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filename })
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    throw new Error("Erreur lors de la restauration");
  }
  return await res.json();
}

export async function deleteBackup(filename) {
  const res = await fetch(`${BASE_URL}/backup/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    credentials: 'include' // Auth via cookie HttpOnly
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Erreur lors de la suppression de la sauvegarde");
  }
  return await res.json();
}

export async function uploadBackup(file) {
  const formData = new FormData();
  formData.append('backup', file);
  
  const res = await fetch(`${BASE_URL}/backup/upload`, {
    method: 'POST',
    credentials: 'include', // Auth via cookie HttpOnly
    body: formData
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Erreur lors de l'upload du backup");
  }
  return await res.json();
}

// ──────────────────────────────
// Plan de sauvegarde
// ──────────────────────────────
export async function getBackupPlan() {
  const res = await fetch(`${BASE_URL}/backup/plan`, {
    credentials: 'include' // Auth via cookie HttpOnly
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    throw new Error("Erreur lors de la récupération du plan de sauvegarde");
  }
  return await res.json();
}

export async function saveBackupPlan(schedule, retentionDays) {
  const res = await fetch(`${BASE_URL}/backup/plan`, {
    method: 'POST',
    credentials: 'include', // Auth via cookie HttpOnly
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ schedule, retention_days: retentionDays })
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    throw new Error("Erreur lors de la sauvegarde du plan");
  }
  return await res.json();
}

// ──────────────────────────────
// Déploiement
// ──────────────────────────────
export async function deployApplication() {
  const res = await fetch(`${BASE_URL}/deploy`, {
    method: 'POST',
    credentials: 'include', // Auth via cookie HttpOnly
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Erreur lors du déploiement");
  }
  return await res.json();
}

