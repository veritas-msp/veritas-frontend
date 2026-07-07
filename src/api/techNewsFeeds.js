import API_BASE_URL from "../config";

const BASE = `${API_BASE_URL}/tech-news/feeds`;

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data;
}

export async function fetchTechNewsFeedsMeta() {
  const res = await fetch(`${BASE}/meta`, { credentials: "include" });
  return parseJson(res);
}

export async function fetchTechNewsFeeds(locale = "fr") {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${BASE}?${params}`, { credentials: "include" });
  return parseJson(res);
}

export async function createTechNewsFeed(payload) {
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateTechNewsFeed(id, payload) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function deleteTechNewsFeed(id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJson(res);
}

export async function resetTechNewsFeeds(locale = "fr") {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${BASE}/reset?${params}`, {
    method: "POST",
    credentials: "include",
  });
  return parseJson(res);
}
