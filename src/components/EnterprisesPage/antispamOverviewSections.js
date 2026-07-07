export const ANTISPAM_OVERVIEW_GROUPS = [
  { id: "core", label: "Vue d'ensemble" },
  { id: "exploited", label: "Module Protect" },
  { id: "preview", label: "APIs complémentaires" },
];

export const ANTISPAM_OVERVIEW_SECTIONS = [
  {
    id: "overview",
    group: "core",
    label: "Synthèse",
    description: "KPIs et statut des APIs",
    icon: "mdi:view-dashboard-outline",
  },
  {
    id: "domains",
    group: "exploited",
    label: "Domaines",
    description: "Admin / domaines",
    icon: "mdi:web",
    sectionKey: "domains",
  },
  {
    id: "users",
    group: "exploited",
    label: "Utilisateurs",
    description: "Comptes protégés",
    icon: "mdi:account-group-outline",
    sectionKey: "users",
  },
  {
    id: "senders",
    group: "exploited",
    label: "Expéditeurs",
    description: "Protect / senders",
    icon: "mdi:email-arrow-right-outline",
    sectionKey: "senders",
  },
  {
    id: "spools",
    group: "exploited",
    label: "Spools",
    description: "Messages en file",
    icon: "mdi:email-multiple-outline",
    sectionKey: "spools",
  },
  {
    id: "detectSpools",
    group: "preview",
    label: "Détection spools",
    description: "AdvancedSpool",
    icon: "mdi:radar",
    sectionKey: "detectSpools",
  },
];
