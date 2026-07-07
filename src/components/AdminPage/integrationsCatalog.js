export const INTEGRATION_CATEGORIES = [
  {
    id: "email-security",
    label: "Antispam & protection mail",
    icon: "mdi:email-search-outline",
  },
  {
    id: "endpoint-security",
    label: "Antivirus, EDR & XDR",
    icon: "mdi:shield-bug-outline",
  },
  { id: "cloud", label: "Cloud & identité", icon: "mdi:microsoft-azure" },
  { id: "dns", label: "DNS & domaines", icon: "mdi:web" },
  { id: "monitoring", label: "Monitoring & supervision", icon: "mdi:chart-timeline-variant" },
  { id: "email", label: "Notifications", icon: "mdi:email-outline" },
  { id: "backup", label: "Sauvegarde", icon: "mdi:backup-restore" },
];

const AVAILABLE = "available";
const COMING_SOON = "comingSoon";

export const INTEGRATIONS_CATALOG = [
  {
    id: "checkmk",
    name: "Checkmk",
    category: "monitoring",
    status: AVAILABLE,
    icon: "simple-icons:checkmk",
    iconColor: "#76b900",
    description: "Supervision des hôtes, services et rapports de monitoring.",
    enabledKey: "INTEGRATION_CHECKMK_ENABLED",
    fields: [
      { key: "CHECKMK_API_URL", label: "URL API Checkmk", type: "url" },
      { key: "CHECKMK_USERNAME", label: "Nom d'utilisateur", type: "text" },
      { key: "CHECKMK_PASSWORD", label: "Mot de passe", type: "password" },
      { key: "CHECKMK_SITE", label: "Site par défaut (optionnel)", type: "text" },
    ],
  },
  {
    id: "prtg",
    name: "PRTG",
    category: "monitoring",
    status: COMING_SOON,
    icon: "mdi:chart-bell-curve",
    iconColor: "#059669",
    description: "Remontée des sondes et alertes PRTG Network Monitor.",
  },
  {
    id: "zabbix",
    name: "Zabbix",
    category: "monitoring",
    status: COMING_SOON,
    icon: "mdi:server-network",
    iconColor: "#d40000",
    description: "Synchronisation des hôtes et métriques Zabbix.",
  },
  {
    id: "datadog",
    name: "Datadog",
    category: "monitoring",
    status: COMING_SOON,
    icon: "simple-icons:datadog",
    iconColor: "#632ca6",
    description: "Observabilité infrastructure et APM.",
  },
  {
    id: "bitdefender",
    name: "Bitdefender GravityZone",
    category: "endpoint-security",
    status: AVAILABLE,
    icon: "simple-icons:bitdefender",
    iconColor: "#ed1c24",
    description: "Inventaire des entreprises et postes GravityZone.",
    enabledKey: "INTEGRATION_BITDEFENDER_ENABLED",
    fields: [
      { key: "BITDEFENDER_API_URL", label: "URL API", type: "url" },
      { key: "BITDEFENDER_API_KEY", label: "Clé API", type: "password" },
    ],
  },
  {
    id: "sentinelone",
    name: "SentinelOne",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:shield-alert",
    iconColor: "#6b21a8",
    description: "EDR SentinelOne, agents et statuts de protection.",
    proOnly: true,
  },
  {
    id: "crowdstrike",
    name: "CrowdStrike Falcon",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:bird",
    iconColor: "#e11d48",
    description: "EDR/XDR Falcon · postes, détections et réponse.",
    proOnly: true,
  },
  {
    id: "sophos",
    name: "Sophos Central",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:shield-check",
    iconColor: "#0f62fe",
    description: "Antivirus, MDR et politiques Sophos Central.",
    proOnly: true,
  },
  {
    id: "defender-endpoint",
    name: "Microsoft Defender for Endpoint",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:microsoft",
    iconColor: "#0078d4",
    description: "EDR Microsoft · alertes, incidents et posture des postes.",
    proOnly: true,
  },
  {
    id: "cortex-xdr",
    name: "Palo Alto Cortex XDR",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:shield-search",
    iconColor: "#fa582d",
    description: "XDR Palo Alto · corrélation et investigation.",
    proOnly: true,
  },
  {
    id: "eset",
    name: "ESET PROTECT",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:shield-check",
    iconColor: "#00aeef",
    description: "Antivirus et EDR ESET pour endpoints.",
    proOnly: true,
  },
  {
    id: "trend-micro",
    name: "Trend Micro Vision One",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:shield-half-full",
    iconColor: "#d71920",
    description: "XDR Trend Micro et remontée des menaces.",
    proOnly: true,
  },
  {
    id: "kaspersky",
    name: "Kaspersky Endpoint Security",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:shield-lock-outline",
    iconColor: "#00a88e",
    description: "Protection endpoint Kaspersky et console KSC.",
    proOnly: true,
  },
  {
    id: "trellix",
    name: "Trellix (ex-McAfee)",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:shield-star-outline",
    iconColor: "#c01818",
    description: "ePO Trellix et statuts de protection endpoint.",
    proOnly: true,
  },
  {
    id: "withsecure",
    name: "WithSecure Elements",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:shield-account",
    iconColor: "#243746",
    description: "EDR WithSecure (ex-F-Secure) pour postes et serveurs.",
    proOnly: true,
  },
  {
    id: "harfanglab",
    name: "HarfangLab",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:owl",
    iconColor: "#1e3a5f",
    description: "EDR français · agents, alertes et investigation.",
    proOnly: true,
  },
  {
    id: "malwarebytes",
    name: "Malwarebytes Nebula",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:bug-check-outline",
    iconColor: "#0d3d2d",
    description: "Console Nebula et statuts de protection Malwarebytes.",
    proOnly: true,
  },
  {
    id: "huntress",
    name: "Huntress",
    category: "endpoint-security",
    status: COMING_SOON,
    icon: "mdi:target-account",
    iconColor: "#00b388",
    description: "EDR managé MSP · persistance, incidents et remédiation.",
    proOnly: true,
  },
  {
    id: "mailinblack",
    name: "Mailinblack Protect",
    category: "email-security",
    status: AVAILABLE,
    icon: "mdi:email-lock-outline",
    iconColor: "#1e3a5f",
    description:
      "Protection mail antispam, anti-phishing et anti-malware · API partenaire module Protect.",
    enabledKey: "INTEGRATION_MAILINBLACK_ENABLED",
    fields: [
      { key: "MAILINBLACK_API_URL", label: "URL API Mailinblack", type: "url" },
      { key: "MAILINBLACK_API_KEY", label: "Clé API Mailinblack", type: "password" },
    ],
  },
  {
    id: "vade",
    name: "Vade Secure",
    category: "email-security",
    status: COMING_SOON,
    icon: "mdi:email-lock-outline",
    iconColor: "#0066cc",
    description: "Filtrage cloud Vade · menaces avancées et phishing.",
    proOnly: true,
  },
  {
    id: "proofpoint",
    name: "Proofpoint Essentials",
    category: "email-security",
    status: COMING_SOON,
    icon: "mdi:email-check-outline",
    iconColor: "#1a3c6e",
    description: "Protection email Proofpoint pour MSP.",
    proOnly: true,
  },
  {
    id: "defender-office365",
    name: "Microsoft Defender for Office 365",
    category: "email-security",
    status: COMING_SOON,
    icon: "mdi:microsoft",
    iconColor: "#0078d4",
    description: "Sécurité Exchange Online et Microsoft 365.",
    proOnly: true,
  },
  {
    id: "hornetsecurity",
    name: "Hornetsecurity",
    category: "email-security",
    status: COMING_SOON,
    icon: "mdi:bee",
    iconColor: "#f5a623",
    description: "Suite de protection email et sauvegarde Hornetsecurity.",
    proOnly: true,
  },
  {
    id: "spamtitan",
    name: "SpamTitan",
    category: "email-security",
    status: COMING_SOON,
    icon: "mdi:email-remove-outline",
    iconColor: "#00a651",
    description: "Filtrage antispam et anti-phishing TitanHQ.",
    proOnly: true,
  },
  {
    id: "fortimail",
    name: "FortiMail",
    category: "email-security",
    status: COMING_SOON,
    icon: "mdi:email-fast-outline",
    iconColor: "#ee3124",
    description: "Passerelle email Fortinet · antispam et DLP.",
    proOnly: true,
  },
  {
    id: "trend-email",
    name: "Trend Micro Email Security",
    category: "email-security",
    status: COMING_SOON,
    icon: "mdi:email-check-outline",
    iconColor: "#d71920",
    description: "Protection messagerie Trend Micro.",
    proOnly: true,
  },
  {
    id: "mimecast",
    name: "Mimecast",
    category: "email-security",
    status: COMING_SOON,
    icon: "mdi:email-arrow-right-outline",
    iconColor: "#0b1f3a",
    description: "Sécurité email et continuité Mimecast.",
    proOnly: true,
  },
  {
    id: "azure-ad",
    name: "Microsoft Entra ID",
    category: "cloud",
    status: COMING_SOON,
    icon: "mdi:microsoft-azure",
    iconColor: "#0078d4",
    description: "Identité Microsoft 365 via Microsoft Graph · utilisateurs, MFA et applications Entra ID.",
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    category: "cloud",
    status: COMING_SOON,
    icon: "mdi:google",
    iconColor: "#4285f4",
    description: "Comptes et services Google Workspace.",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    category: "email",
    status: COMING_SOON,
    icon: "mdi:microsoft-teams",
    iconColor: "#6264a7",
    description: "Webhooks et alertes dans les canaux Teams.",
  },
  {
    id: "slack",
    name: "Slack",
    category: "email",
    status: COMING_SOON,
    icon: "mdi:slack",
    iconColor: "#4a154b",
    description: "Notifications MSP vers les canaux Slack.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "email",
    status: AVAILABLE,
    icon: "mdi:whatsapp",
    iconColor: "#25d366",
    description:
      "Réception des messages clients WhatsApp, création automatique de tickets support et réponses depuis Veritas.",
    enabledKey: "INTEGRATION_WHATSAPP_ENABLED",
    webhookPath: "/api/whatsapp/webhook",
    fields: [
      { key: "WHATSAPP_PHONE_NUMBER_ID", label: "Phone Number ID (Meta)", type: "text" },
      { key: "WHATSAPP_ACCESS_TOKEN", label: "Token d'accès permanent", type: "password" },
      { key: "WHATSAPP_APP_SECRET", label: "Secret de l'application Meta", type: "password" },
      { key: "WHATSAPP_VERIFY_TOKEN", label: "Token de vérification webhook", type: "password" },
      { key: "WHATSAPP_BUSINESS_ACCOUNT_ID", label: "ID compte Business (optionnel)", type: "text" },
      { key: "WHATSAPP_API_VERSION", label: "Version API Graph (ex. v21.0)", type: "text" },
    ],
  },
  {
    id: "ovh",
    name: "OVH",
    category: "dns",
    status: AVAILABLE,
    icon: "simple-icons:ovh",
    iconColor: "#123f6d",
    description: "Suivi des domaines et dates de renouvellement OVH.",
    enabledKey: "INTEGRATION_OVH_ENABLED",
    fields: [
      { key: "OVH_APPLICATION_KEY", label: "Application Key", type: "text" },
      { key: "OVH_APPLICATION_SECRET", label: "Application Secret", type: "password" },
      { key: "OVH_CONSUMER_KEY", label: "Consumer Key", type: "password" },
    ],
  },
  {
    id: "gandi",
    name: "Gandi",
    category: "dns",
    status: COMING_SOON,
    icon: "mdi:domain",
    iconColor: "#94a3b8",
    description: "Gestion des noms de domaine Gandi.",
    proOnly: true,
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "dns",
    status: COMING_SOON,
    icon: "simple-icons:cloudflare",
    iconColor: "#f38020",
    description: "DNS, certificats et zones Cloudflare.",
    proOnly: true,
  },
  {
    id: "ionos",
    name: "IONOS",
    category: "dns",
    status: COMING_SOON,
    icon: "mdi:server-network",
    iconColor: "#003d8f",
    description: "Registrar et hébergement IONOS (1&1).",
    proOnly: true,
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    category: "dns",
    status: COMING_SOON,
    icon: "simple-icons:godaddy",
    iconColor: "#1bdbdb",
    description: "Gestion des domaines GoDaddy.",
    proOnly: true,
  },
  {
    id: "namecheap",
    name: "Namecheap",
    category: "dns",
    status: COMING_SOON,
    icon: "mdi:tag-outline",
    iconColor: "#de3723",
    description: "Registrar Namecheap et zones DNS.",
    proOnly: true,
  },
  {
    id: "veeam",
    name: "Veeam",
    category: "backup",
    status: COMING_SOON,
    icon: "mdi:server-security",
    iconColor: "#00b336",
    description: "Jobs de sauvegarde et statuts Veeam.",
  },
  {
    id: "acronis",
    name: "Acronis Cyber Protect",
    category: "backup",
    status: COMING_SOON,
    icon: "mdi:shield-sync-outline",
    iconColor: "#0066cc",
    description: "Plans de protection et alertes Acronis.",
  },
];

export const AVAILABLE_INTEGRATIONS = INTEGRATIONS_CATALOG.filter(
  (item) => item.status === AVAILABLE
);

export function settingsToMap(settingsList = []) {
  if (!Array.isArray(settingsList)) return settingsList || {};
  return settingsList.reduce(
    (acc, setting) => ({ ...acc, [setting.key]: setting.value }),
    {}
  );
}

export function isIntegrationConfigured(integration, settings = {}) {
  if (!integration || integration.status === COMING_SOON) return false;
  if (!integration.enabledKey && !(integration.fields || []).length) return false;
  const raw = settings[integration.enabledKey];
  const normalized = `${raw ?? ""}`.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return (integration.fields || []).some(
    ({ key }) => `${settings[key] ?? ""}`.trim().length > 0
  );
}

export function getEndpointSecurityIntegrations() {
  return INTEGRATIONS_CATALOG.filter((item) => item.category === "endpoint-security");
}

export function getEmailSecurityIntegrations() {
  return INTEGRATIONS_CATALOG.filter((item) => item.category === "email-security");
}

export function getDnsIntegrations() {
  return INTEGRATIONS_CATALOG.filter((item) => item.category === "dns");
}

export function getIntegrationById(integrationId) {
  return INTEGRATIONS_CATALOG.find((item) => item.id === integrationId) || null;
}

/** Intégrations utilisables en édition Community (les autres affichent le badge Pro) */
export const COMMUNITY_FREE_INTEGRATION_IDS = new Set(["bitdefender", "mailinblack", "ovh"]);

export function isIntegrationCommunityFree(integrationId) {
  return COMMUNITY_FREE_INTEGRATION_IDS.has(integrationId);
}

export function isIntegrationProLocked(integration, isCommunity) {
  if (!isCommunity || !integration) return false;
  if (integration.proOnly) return true;
  return !isIntegrationCommunityFree(integration.id);
}

export function integrationShowsProBadge(integration, isCommunity) {
  if (!integration) return false;
  if (integration.proOnly) return true;
  return isIntegrationProLocked(integration, isCommunity);
}

export function getCategoryMeta(categoryId) {
  return INTEGRATION_CATEGORIES.find((category) => category.id === categoryId);
}

export function groupIntegrationsByCategory(items = INTEGRATIONS_CATALOG) {
  return INTEGRATION_CATEGORIES.map((category) => ({
    ...category,
    items: items.filter((item) => item.category === category.id),
  })).filter((section) => section.items.length > 0);
}

/** Variables CSS pour icônes catalogue (contraste dark mode via feuille de style). */
export function integrationIconStyle(iconColor) {
  if (!iconColor) return undefined;
  return { "--integration-icon-color": iconColor };
}
