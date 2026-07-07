import API_BASE_URL from "../config";

async function handleJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || fallbackMessage);
  }
  return data;
}

export async function fetchTeams() {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors du chargement des équipes");
}

/** Équipes actives + membres agents (planning, tous utilisateurs authentifiés). */
export async function fetchTeamsForPlanning() {
  const response = await fetch(`${API_BASE_URL}/teams/planning`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors du chargement des équipes");
}

export async function fetchTeam(teamId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors du chargement de l'équipe");
}

export async function createTeam(payload) {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la création de l'équipe");
}

export async function updateTeam(teamId, payload) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la mise à jour de l'équipe");
}

export async function deleteTeam(teamId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 204) return true;
  return handleJsonResponse(response, "Erreur lors de la suppression de l'équipe");
}

export async function addTeamMember(teamId, payload) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de l'ajout du membre");
}

export async function updateTeamMember(teamId, userId, payload) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la mise à jour du membre");
}

export async function removeTeamMember(teamId, userId) {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 204) return true;
  return handleJsonResponse(response, "Erreur lors du retrait du membre");
}
