// src/api/history.js
const API_URL = process.env.REACT_APP_API_BASE_URL;

export async function fetchUserHistory() {
  try {
    const res = await fetch(`${API_URL}/api/history`, {
      credentials: 'include',
    });

    if (!res.ok) throw new Error("Erreur lors du chargement de l'historique");

    return await res.json();
  } catch (err) {
    console.error("❌ fetchUserHistory:", err);
    return [];
  }
}

export async function fetchAllHistory() {
  try {
    const res = await fetch(`${API_URL}/api/history/all`, {
      credentials: 'include',
    });

    if (res.status === 403) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    if (!res.ok) {
      const err = new Error("Erreur lors du chargement de l'historique global");
      err.status = res.status;
      throw err;
    }

    return await res.json();
  } catch (err) {
    console.error("❌ fetchAllHistory:", err);
    return [];
  }
}

// Fonction pour compresser les données avant sauvegarde
function compressData(data) {
  try {
    // Si les données contiennent des images, on les compresse ou on les supprime
    if (data.appreciations) {
      const compressedAppreciations = {};
      
      Object.entries(data.appreciations).forEach(([type, appreciation]) => {
        const compressedAppreciation = { ...appreciation };
        
        // Au lieu de supprimer complètement les images, on garde les IDs
        // et on supprime seulement les base64 pour réduire la taille
        if (compressedAppreciation.images && Array.isArray(compressedAppreciation.images)) {
          // Garder les IDs numériques, supprimer les base64
          compressedAppreciation.images = compressedAppreciation.images.map(img => {
            if (typeof img === 'number') {
              return img; // Garder les IDs
            } else if (typeof img === 'string' && img.startsWith('data:image')) {
              return null; // Supprimer les base64
            } else if (typeof img === 'string' && img.startsWith('/uploads/photos/')) {
              return img; // Garder les URLs relatives
            }
            return img; // Garder le reste
          });
        }
        
        compressedAppreciations[type] = compressedAppreciation;
      });
      
      return {
        ...data,
        appreciations: compressedAppreciations
      };
    }
    
    return data;
  } catch (error) {
    console.error("Erreur lors de la compression des données:", error);
    return data;
  }
}

export async function saveDocumentToHistory({ name, type, data, overwrite, imageIds }) {
  try {
    // Compresser les données pour éviter l'erreur 413
    const compressedData = compressData(data);
    
    const payload = {
      name,
      type,
      data: compressedData
    };
    if (overwrite !== undefined) payload.overwrite = overwrite;
    if (imageIds && Array.isArray(imageIds)) payload.imageIds = imageIds;



    const res = await fetch(`${API_URL}/api/history`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      if (res.status === 413) {
        throw new Error("Les données sont trop volumineuses pour être sauvegardées. Veuillez réduire le contenu.");
      }
      throw new Error(`Erreur serveur: ${res.status} ${res.statusText}`);
    }

    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ saveDocumentToHistory:", err);
    
    // Retourner un objet d'erreur plus informatif
    return { 
      success: false, 
      error: err.message || "Erreur lors de la sauvegarde",
      details: err.toString()
    };
  }
}

export async function deleteDocumentById(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}`, {
      method: "DELETE",
      credentials: 'include',
    });
    
    if (res.ok) {
      const result = await res.json();
      return {
        success: true,
        deletedImages: result.deletedImages || 0
      };
    }
    
    return { success: false };
  } catch (err) {
    console.error("❌ deleteDocumentById:", err);
    return { success: false };
  }
}

export async function deleteDocumentByName(name, preserveImageIds = []) {
  try {
    const res = await fetch(`${API_URL}/api/history/by-name/${encodeURIComponent(name)}`, {
      method: "DELETE",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preserveImageIds }),
    });
    
    if (res.ok) {
      const result = await res.json();
      return {
        success: true,
        deletedImages: result.deletedImages || 0
      };
    }
    
    return { success: false };
  } catch (err) {
    console.error("❌ deleteDocumentByName:", err);
    return { success: false };
  }
}

export async function overwriteDocument(name, preserveImageIds = []) {
  try {
    const res = await fetch(`${API_URL}/api/history/overwrite/${encodeURIComponent(name)}`, {
      method: "DELETE",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preserveImageIds }),
    });
    
    if (res.ok) {
      const result = await res.json();
      return {
        success: true,
        deletedImages: result.deletedImages || 0,
        preservedImages: result.preservedImages || 0,
        totalImages: result.totalImages || 0
      };
    }
    
    return { success: false };
  } catch (err) {
    console.error("❌ overwriteDocument:", err);
    return { success: false };
  }
}

export async function updateDocumentName(id, newName) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}`, {
      method: "PATCH",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newName }),
    });
    return res.ok;
  } catch (err) {
    console.error("❌ updateDocumentName:", err);
    return false;
  }
}

// ──────────────────────────────
// 🗑️ Corbeille
// ──────────────────────────────
export async function moveDocumentToTrash(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}/trash`, {
      method: "POST",
      credentials: 'include',
    });
    return res.ok;
  } catch (err) {
    console.error("❌ moveDocumentToTrash:", err);
    return false;
  }
}

export async function restoreDocumentById(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}/restore`, {
      method: "POST",
      credentials: 'include',
    });
    return res.ok;
  } catch (err) {
    console.error("❌ restoreDocumentById:", err);
    return false;
  }
}

export async function purgeDocumentById(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}/purge`, {
      method: "DELETE",
      credentials: 'include',
    });
    return res.ok;
  } catch (err) {
    console.error("❌ purgeDocumentById:", err);
    return false;
  }
}

export async function fetchLastUserDocuments(limit = 3) {
  try {
    const res = await fetch(`${API_URL}/api/recent-docs?limit=${limit}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error("Erreur lors du chargement des documents récents");
    return await res.json();
  } catch (err) {
    console.error("❌ fetchLastUserDocuments:", err);
    return [];
  }
}

export async function fetchDocumentsByClient(clientName) {
  return [];
}
