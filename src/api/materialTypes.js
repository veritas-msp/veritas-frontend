import API_BASE_URL from "../config"; // adapte le chemin si besoin

const BASE_URL = `${API_BASE_URL}/material-types`;

export async function fetchCustomTypes(category = null) {
  const url = category ? `${BASE_URL}?category=${encodeURIComponent(category)}` : BASE_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur lors du chargement des types personnalisés");
  return await res.json();
}

// ADD · créer un nouveau type
export const addCustomType = async (label, category) => {
  const id = crypto.randomUUID();

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, label, category }),
  });

  if (!res.ok) throw new Error("Erreur lors de l'ajout du type personnalisé");
  return await res.json();
};

// UPDATE · modifier un type existant (par son ID)
export const updateCustomType = async (id, newLabel, newCategory) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: newLabel, category: newCategory }),
  });

  if (!res.ok) throw new Error("Erreur lors de la mise à jour du type");
  return await res.json();
};

// DELETE · supprimer un type personnalisé
export const deleteCustomType = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Erreur lors de la suppression du type");
  return await res.json();
};
