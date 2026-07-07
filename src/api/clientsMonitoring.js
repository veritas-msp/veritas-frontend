import API_BASE_URL from "../config"; // adapte le chemin si besoin

const BASE_URL = `${API_BASE_URL}/clients/general`;

export async function fetchClients() {
  const res = await fetch(BASE_URL, {
    credentials: 'include' // Auth via cookie HttpOnly
  });
  if (!res.ok) throw new Error("Erreur lors du fetch des clients");
  return await res.json();
}

export async function addClient(client) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    credentials: 'include', // Auth via cookie HttpOnly
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(client)
  });
  if (!res.ok) throw new Error("Erreur lors de l'ajout d'un client");
  return await res.json();
}

export async function deleteClient(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    credentials: 'include' // Auth via cookie HttpOnly
  });
  if (!res.ok) throw new Error("Erreur lors de la suppression du client");
  return await res.json();
}

export async function updateClient(id, updates) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    credentials: 'include', // Auth via cookie HttpOnly
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du client");
  return await res.json();
}
