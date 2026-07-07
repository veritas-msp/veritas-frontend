export const NOTIFICATION_SOURCE_OPTIONS = [
  {
    key: "tickets",
    label: "Tickets",
    elements: [
      { key: "created", label: "Création" },
      { key: "updated", label: "Modification" },
      { key: "resolved", label: "Résolution" },
      { key: "commented", label: "Ajout de commentaire" },
    ],
  },
  {
    key: "entreprise",
    label: "Entreprise",
    elements: [
      { key: "updated", label: "Modification fiche entreprise" },
      { key: "contract_info_updated", label: "Information contrat modifiée" },
      { key: "contract_expiration_soon", label: "Date expiration contrat approche" },
      { key: "contract_expired", label: "Contrat expiré" },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    elements: [
      { key: "created", label: "Création" },
      { key: "updated", label: "Modification" },
    ],
  },
  {
    key: "infrastructure",
    label: "Infrastructure",
    elements: [
      { key: "internet_updated", label: "Connexion internet modifiée" },
      { key: "server_updated", label: "Serveur modifié" },
      { key: "firewall_updated", label: "Firewall modifié" },
      { key: "storage_updated", label: "Stockage modifié" },
      { key: "switch_updated", label: "Switch modifié" },
      { key: "wifi_ap_updated", label: "Borne Wi-Fi modifiée" },
    ],
  },
  {
    key: "cyber",
    label: "Cyber",
    elements: [
      { key: "campaign_updated", label: "Campagne modifiée" },
      { key: "campaign_start_date_soon", label: "Date de début campagne approche" },
      { key: "campaign_end_date_soon", label: "Date de fin campagne approche" },
      { key: "campaign_end_date_reached", label: "Date de fin campagne atteinte" },
      { key: "antivirus_updated", label: "Antivirus modifié" },
      { key: "antivirus_expiration_soon", label: "Expiration antivirus approche" },
      { key: "antivirus_expired", label: "Antivirus expiré" },
      { key: "antispam_updated", label: "Antispam modifié" },
      { key: "antispam_expiration_soon", label: "Expiration antispam approche" },
      { key: "antispam_expired", label: "Antispam expiré" },
      { key: "backup_updated", label: "Sauvegarde modifiée" },
    ],
  },
  {
    key: "services",
    label: "Services",
    elements: [
      { key: "tenant_updated", label: "Tenant modifié" },
      { key: "domain_updated", label: "Nom de domaine modifié" },
    ],
  },
  {
    key: "rapport",
    label: "Rapport",
    elements: [
      { key: "generated", label: "Rapport généré" },
      { key: "updated", label: "Rapport modifié" },
    ],
  },
];

export const NOTIFICATION_CHANNEL_OPTIONS = [
  { key: "mail", label: "Email" },
  { key: "webhook", label: "Webhook" },
  { key: "browser", label: "Navigateur (in-app)" },
  { key: "sms", label: "SMS", comingSoon: true },
];

export const WEBHOOK_CHANNEL_ICON_BY_KEY = {
  teams: "mdi:microsoft-teams",
  slack: "mdi:slack",
  webhook: "mingcute:link-2-fill",
};

export const TEAMS_THEME_COLOR_PRESETS = [
  "#13BA8E",
  "#2563EB",
  "#9333EA",
  "#DC2626",
  "#D97706",
  "#0F172A",
];

export const NOTIFICATION_EVENT_FORM_SECTIONS = [
  {
    id: "trigger",
    label: "Déclencheur",
    description: "Source et événement",
    icon: "mdi:flash-outline",
  },
  {
    id: "target",
    label: "Cible",
    description: "Périmètre entreprise",
    icon: "mdi:target",
  },
  {
    id: "channel",
    label: "Canal",
    description: "Webhook ou email",
    icon: "mdi:send-outline",
  },
  {
    id: "content",
    label: "Contenu",
    description: "Template ou message",
    icon: "mdi:text-box-outline",
  },
];

export const getSourceOption = (sourceKey) =>
  NOTIFICATION_SOURCE_OPTIONS.find((item) => item.key === sourceKey) || NOTIFICATION_SOURCE_OPTIONS[0];

export const getElementOption = (sourceKey, elementKey) => {
  const source = getSourceOption(sourceKey);
  return source.elements.find((item) => item.key === elementKey) || source.elements[0];
};

export const isSoonElementKey = (elementKey) => String(elementKey || "").toLowerCase().includes("_soon");

export const parseEmailTags = (value) =>
  String(value || "")
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean);

export function buildDefaultNotificationEvent() {
  return {
    id: `notif-event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    source: "tickets",
    element: "created",
    scopeType: "all",
    enterpriseId: "",
    daysBefore: 30,
    channel: "webhook",
    webhookId: "",
    emailTo: "",
    emailCc: "",
    useTemplate: false,
    templateId: "",
    customMessage: "",
    teamsThemeColor: "#13BA8E",
    enabled: true,
  };
}

export function describeNotificationEvent(draft = {}) {
  const source = getSourceOption(draft.source);
  const element = getElementOption(source.key, draft.element);
  return `${source.label} · ${element.label}`;
}
