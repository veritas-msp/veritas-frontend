// ──────────────────────────────
// 📦 API Campagnes Cybersécurité
// ──────────────────────────────
import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/clients`;

// Récupérer les campagnes d'un client
export async function getClientCampaigns(clientId, filters = {}, options = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);

    const response = await fetch(`${BASE_URL}/${clientId}/campaigns?${params}`, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('Erreur lors de la récupération des campagnes:', error);
    return [];
  }
}

// Récupérer toutes les campagnes (pour la page cybersécurité)
export async function getAllCampaigns(filters = {}, options = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.client_id) params.append('client_id', filters.client_id);

    const response = await fetch(`${BASE_URL}/all-campaigns?${params}`, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('Erreur lors de la récupération des campagnes:', error);
    return [];
  }
}

// Créer une campagne
export async function createClientCampaign(clientId, campaignData) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la création de la campagne:', error);
    throw error;
  }
}

// Modifier une campagne
export async function updateClientCampaign(clientId, campaignId, campaignData) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la modification de la campagne:', error);
    throw error;
  }
}

// Supprimer une campagne par ID seul (nouveau)
export async function deleteCampaign(campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/campaigns/${campaignId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la suppression de la campagne:', error);
    throw error;
  }
}

// Supprimer une campagne (legacy - nécessite clientId)
export async function deleteClientCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la suppression de la campagne:', error);
    throw error;
  }
}

// Lancer une campagne Microsoft Security
export async function launchCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/launch`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors du lancement de la campagne:', error);
    throw error;
  }
}

// Terminer une campagne Microsoft Security
export async function finishCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/finish`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la fin de la campagne:', error);
    throw error;
  }
}

// Remettre la campagne à zéro (supprimer snapshots + statut en préparation)
export async function resetCampaign(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/reset`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la remise à zéro de la campagne:', error);
    throw error;
  }
}

// Récupérer les statistiques d'une campagne
export async function getCampaignStats(clientId, campaignId, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/stats?includeCurrent=true`, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('Erreur lors de la récupération des statistiques:', error);
    throw error;
  }
}

// Télécharger le rapport PDF
export function getCampaignReportUrl(clientId, campaignId) {
  return `${BASE_URL}/${clientId}/campaigns/${campaignId}/report.pdf`;
}

// ───────────────────────────────────────────────
// 📋 API pour les Steps (Étapes) des campagnes
// ───────────────────────────────────────────────

// Récupérer toutes les étapes d'une campagne
export async function getCampaignSteps(clientId, campaignId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des étapes:', error);
    throw error;
  }
}

// Créer une nouvelle étape
export async function createCampaignStep(clientId, campaignId, stepData) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stepData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la création de l\'étape:', error);
    throw error;
  }
}

// Mettre à jour une étape
export async function updateCampaignStep(clientId, campaignId, stepId, stepData) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps/${stepId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stepData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'étape:', error);
    throw error;
  }
}

// Réorganiser l'ordre des étapes
export async function reorderCampaignSteps(clientId, campaignId, stepOrders) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps/reorder`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ stepOrders })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la réorganisation des étapes:', error);
    throw error;
  }
}

// Supprimer une étape
export async function deleteCampaignStep(clientId, campaignId, stepId) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/campaigns/${campaignId}/steps/${stepId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'étape:', error);
    throw error;
  }
}
