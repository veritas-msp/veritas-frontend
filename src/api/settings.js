import API_BASE_URL from "../config"; // adapte le chemin si besoin

const BASE_URL = `${API_BASE_URL}/settings`;

export async function fetchSettings() {
  const res = await fetch(BASE_URL, { credentials: "include" });
  if (!res.ok) throw new Error("Erreur chargement des paramètres");
  return await res.json();
}

// Mapping des clés vers leurs labels et sections
const settingsMapping = {
  // Database
  'db_host': { section: 'db', label: 'Hôte de la base de données' },
  'db_port': { section: 'db', label: 'Port de la base de données' },
  'db_name': { section: 'db', label: 'Nom de la base de données' },
  'db_user': { section: 'db', label: 'Utilisateur de la base de données' },
  'db_password': { section: 'db', label: 'Mot de passe de la base de données' },
  
  // Email
  'BUG_REPORT_EMAIL': { section: 'email', label: 'Email pour les rapports de bugs' },
  'SMTP_HOST': { section: 'email', label: 'Serveur SMTP' },
  'SMTP_PORT': { section: 'email', label: 'Port SMTP' },
  'SMTP_USER': { section: 'email', label: 'Utilisateur SMTP' },
  'SMTP_PASS': { section: 'email', label: 'Mot de passe SMTP' },
  
  // GitHub
  'GITHUB_TOKEN': { section: 'github', label: 'Token d\'authentification GitHub' },
  'GITHUB_REPO_FRONT': { section: 'github', label: 'Repository Frontend' },
  'GITHUB_REPO_BACK': { section: 'github', label: 'Repository Backend' },
  
  // UniFi
  'UNIFI_API_KEY': { section: 'unifi', label: 'API Key UniFi Site Manager' },
  
  // Check MK
  'CHECKMK_API_URL': { section: 'checkmk', label: 'URL API Check MK' },
  'CHECKMK_USERNAME': { section: 'checkmk', label: 'Nom d\'utilisateur Check MK' },
  'CHECKMK_PASSWORD': { section: 'checkmk', label: 'Mot de passe Check MK' },
  'CHECKMK_SITE': { section: 'checkmk', label: 'Site Check MK (optionnel)' },
  
  // WhatsApp Business
  'WHATSAPP_PHONE_NUMBER_ID': { section: 'whatsapp', label: 'Phone Number ID WhatsApp' },
  'WHATSAPP_ACCESS_TOKEN': { section: 'whatsapp', label: 'Token d\'accès WhatsApp' },
  'WHATSAPP_APP_SECRET': { section: 'whatsapp', label: 'Secret application Meta' },
  'WHATSAPP_VERIFY_TOKEN': { section: 'whatsapp', label: 'Token de vérification webhook' },
  'WHATSAPP_BUSINESS_ACCOUNT_ID': { section: 'whatsapp', label: 'ID compte Business WhatsApp' },
  'WHATSAPP_API_VERSION': { section: 'whatsapp', label: 'Version API Graph WhatsApp' },
  
  // Entra ID (Microsoft Partner Center)
  'PARTNER_CENTER_APP_ID': { section: 'entraid', label: 'App ID Entra ID' },
  'PARTNER_CENTER_TENANT_ID': { section: 'entraid', label: 'Tenant ID Entra ID' },
  'PARTNER_CENTER_SECRET_ID': { section: 'entraid', label: 'Secret ID Entra ID' },
};

/**
 * ⬆️ Crée ou met à jour un paramètre.
 * @param {string} key - La clé du paramètre (ex: "db_host").
 * @param {string} value - La nouvelle valeur.
 * @returns {Promise<Object>} La réponse de l'API.
 */
export const updateSetting = async (key, value) => {
  const mapping = settingsMapping[key] || { section: 'general', label: key };
  
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      key, 
      value, 
      label: mapping.label, 
      section: mapping.section 
    }),
  });

  if (!response.ok) {
    throw new Error("La mise à jour du paramètre a échoué.");
  }
  return response.json();
};
