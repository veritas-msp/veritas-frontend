const getApiBaseUrl = () => {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";
  const cleanedUrl = baseUrl.replace(/\/+$/, '');
  if (cleanedUrl.endsWith('/api')) {
    return cleanedUrl;
  }
  return cleanedUrl + "/api";
};
const API_BASE_URL = getApiBaseUrl();
export default API_BASE_URL;
