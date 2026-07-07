import API_BASE_URL from "../config";
import { safeJsonStringify } from "../utils/safeJson";

const MONITORING_DOCS_BASE = `${API_BASE_URL}/monitoring-documents`;

/**
 * Sauvegarder un document de monitoring
 * @param {Object} params - Paramètres de sauvegarde
 * @param {string} params.name - Nom du document
 * @param {string} params.client_name - Nom du client
 * @param {string} params.report_period - Période du rapport
 * @param {Object} params.config - Configuration du monitoring
 * @param {Object} params.data - Données du monitoring
 * @param {boolean} params.overwrite - Écraser si le document existe déjà
 * @returns {Promise<Object>} Résultat de la sauvegarde
 */
export async function saveMonitoringDocument({ name, client_name, report_period, config, data, overwrite = false }) {
  try {
    const payload = {
      name,
      client_name,
      report_period: report_period || null,
      config,
      data,
      overwrite
    };

    const res = await fetch(`${MONITORING_DOCS_BASE}`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: safeJsonStringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur HTTP: ${res.status}`);
    }

    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ saveMonitoringDocument:", err);
    return { 
      success: false, 
      error: err.message || "Erreur lors de la sauvegarde",
      details: err.toString()
    };
  }
}

/**
 * Récupérer tous les documents de monitoring de l'utilisateur
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] - Annuler la requête (changement d’onglet, démontage)
 * @returns {Promise<Array>} Liste des documents
 */
export async function fetchMonitoringDocuments(options = {}) {
  const { signal } = options;
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}`, {
      method: "GET",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!res.ok) {
      throw new Error(`Erreur HTTP: ${res.status}`);
    }

    const documents = await res.json();
    return documents;
  } catch (err) {
    console.error("❌ fetchMonitoringDocuments:", err);
    throw err;
  }
}

/**
 * Récupérer un document de monitoring spécifique
 * @param {number} documentId - ID du document
 * @returns {Promise<Object>} Document avec config et data
 */
export async function fetchMonitoringDocument(documentId) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}`, {
      method: "GET",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Document introuvable");
      }
      throw new Error(`Erreur HTTP: ${res.status}`);
    }

    const document = await res.json();
    return document;
  } catch (err) {
    console.error("❌ fetchMonitoringDocument:", err);
    throw err;
  }
}

/**
 * Mettre à jour un document de monitoring
 * @param {number} documentId - ID du document
 * @param {Object} params - Paramètres de mise à jour
 * @returns {Promise<Object>} Résultat de la mise à jour
 */
export async function updateMonitoringDocument(documentId, { name, client_name, report_period, config, data }) {
  try {
    const payload = {
      name,
      client_name,
      report_period: report_period || null,
      config,
      data
    };

    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}`, {
      method: "PUT",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: safeJsonStringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur HTTP: ${res.status}`);
    }

    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ updateMonitoringDocument:", err);
    return { 
      success: false, 
      error: err.message || "Erreur lors de la mise à jour",
      details: err.toString()
    };
  }
}

/**
 * Supprimer (mettre à la corbeille) un document de monitoring
 * @param {number} documentId - ID du document
 * @returns {Promise<Object>} Résultat de la suppression
 */
export async function deleteMonitoringDocument(documentId) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}`, {
      method: "DELETE",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur HTTP: ${res.status}`);
    }

    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ deleteMonitoringDocument:", err);
    return { 
      success: false, 
      error: err.message || "Erreur lors de la suppression",
      details: err.toString()
    };
  }
}

/**
 * Mettre à jour uniquement le nom d'un document de monitoring
 * @param {number} documentId - ID du document
 * @param {string} name - Nouveau nom
 * @returns {Promise<Object>} Résultat de la mise à jour
 */
export async function updateMonitoringDocumentName(documentId, name) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}`, {
      method: "PATCH",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur HTTP: ${res.status}`);
    }

    const result = await res.json();
    return result.success === true;
  } catch (err) {
    console.error("❌ updateMonitoringDocumentName:", err);
    return false;
  }
}

/**
 * Restaurer un document de monitoring depuis la corbeille
 * @param {number} documentId - ID du document
 * @returns {Promise<boolean>} Succès de la restauration
 */
export async function restoreMonitoringDocument(documentId) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}/restore`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur HTTP: ${res.status}`);
    }

    const result = await res.json();
    return result.success === true;
  } catch (err) {
    console.error("❌ restoreMonitoringDocument:", err);
    return false;
  }
}

/**
 * Supprimer définitivement un document de monitoring (purge)
 * @param {number} documentId - ID du document
 * @returns {Promise<boolean>} Succès de la purge
 */
export async function purgeMonitoringDocument(documentId) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}/purge`, {
      method: "DELETE",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur HTTP: ${res.status}`);
    }

    const result = await res.json();
    return result.success === true;
  } catch (err) {
    console.error("❌ purgeMonitoringDocument:", err);
    return false;
  }
}

/**
 * Récupérer les derniers documents de monitoring (pour affichage récent)
 * @param {number} limit - Nombre de documents à récupérer
 * @returns {Promise<Array>} Liste des documents récents
 */
/**
 * Vérifie si un nom de document est déjà utilisé (bibliothèque monitoring).
 * @param {string} name
 * @param {{ excludeId?: number|string, documents?: Array }} [options]
 */
export function isMonitoringDocumentNameTaken(name, { excludeId, documents } = {}) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized || !Array.isArray(documents)) return false;
  return documents.some((doc) => {
    if (excludeId != null && String(doc.id) === String(excludeId)) return false;
    return String(doc.name || "").trim().toLowerCase() === normalized;
  });
}

export async function fetchRecentMonitoringDocuments(limit = 10) {
  try {
    const documents = await fetchMonitoringDocuments();
    return documents.slice(0, limit);
  } catch (err) {
    console.error("❌ fetchRecentMonitoringDocuments:", err);
    return [];
  }
}

