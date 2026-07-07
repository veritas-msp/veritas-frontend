// Construit l'URL de base de l'API en évitant la duplication de /apia
const getApiBaseUrl = () => {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";
  // Nettoie l'URL en enlevant les slashes finaux
  const cleanedUrl = baseUrl.replace(/\/+$/, '');
  // Vérifie si /api est déjà présent
  if (cleanedUrl.endsWith('/api')) {
    return cleanedUrl;
  }
  // Sinon, ajoute /api
  return cleanedUrl + "/api";
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
