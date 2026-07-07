export const REPORT_OPTIONS = [
  { id: "infrastructure", label: "Infrastructure" },
  { id: "cybersecurite", label: "Cybersécurité" },
  { id: "services", label: "Services" }
];

export const fallbackModulesByReport = {
  infrastructure: ["internet", "firewall", "serveurs", "stockage", "switch", "wifi"],
  cybersecurite: ["sauvegarde", "antivirus", "antispam", "firewallregles"],
  services: ["office365", "ndd"]
};

export const reportTitleMap = {
  infrastructure: "Infrastructure",
  cybersecurite: "Cybersécurité",
  services: "Services Managés"
};

export const reportDescriptionMap = {
  infrastructure: "Topologie, actifs critiques et santé du socle technique.",
  cybersecurite: "Protection, sauvegarde et contrôle des menaces.",
  services: "Visibilité sur les services managés et la couche SaaS."
};

export const reportSubtitleMap = {
  infrastructure: "INFRASTRUCTURE",
  cybersecurite: "CYBERSÉCURITÉ",
  services: "SERVICES MANAGÉS"
};

export const SECTION_ID_MAP = {
  'internet': 'internet-section',
  'serveurs': 'serveurs-section',
  'stockage': 'stockage-section',
  'firewall': 'firewalls-section',
  'switch': 'switch-section',
  'wifi': 'wifi-section',
  'sauvegarde': 'sauvegarde-section',
  'antivirus': 'antivirus-section',
  'antispam': 'antispam-section',
  'firewallregles': 'firewallregles-section',
  'ndd': 'ndd-section',
  'office365': 'office365-section'
};

