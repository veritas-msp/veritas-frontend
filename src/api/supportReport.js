import API_BASE_URL from "../config";

export async function submitSupportRequest({ title, description, type, context, images = [] }) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  formData.append("type", type);
  if (context) {
    formData.append("context", JSON.stringify(context));
  }
  images.slice(0, 5).forEach((file) => formData.append("images", file));

  const res = await fetch(`${API_BASE_URL}/report`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erreur lors de l'envoi de la demande");
  }
  return data;
}
