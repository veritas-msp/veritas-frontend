import { resolveEquipmentFamilyForAlerts } from "../../api/equipmentMonitoringAlerts";

/** Miroir backend · libellés et familles applicables. */
export const SUPERVISION_ALERT_CRITERIA = [
  {
    key: "monitor_critical",
    label: "Alerte critique (supervision)",
    description: "État critique remonté par CheckMK ou la supervision.",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
    defaultEnabled: true,
  },
  {
    key: "monitor_warning",
    label: "Warning supervision",
    description: "Avertissement remonté par CheckMK ou la supervision.",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip", "alimentation"],
    defaultEnabled: true,
  },
  {
    key: "agent_offline",
    label: "Agent RMM hors ligne (+48 h)",
    description: "Poste géré par l'agent RMM sans inventaire depuis plus de 48 heures.",
    families: ["ordinateurs"],
    defaultEnabled: false,
  },
  {
    key: "updates_pending",
    label: "Mises à jour obsolètes",
    description: "Mises à jour Windows en attente sur un poste RMM.",
    families: ["ordinateurs"],
    defaultEnabled: true,
  },
  {
    key: "disk_critical",
    label: "Disque critique (≥ 90 %)",
    description: "Espace disque critique sur un poste RMM.",
    families: ["ordinateurs"],
    defaultEnabled: true,
  },
  {
    key: "disk_warn",
    label: "Disque à surveiller (≥ 80 %)",
    description: "Espace disque élevé sur un poste RMM.",
    families: ["ordinateurs"],
    defaultEnabled: true,
  },
  {
    key: "unmapped",
    label: "Non mappé CheckMK",
    description: "Périphérique éligible à CheckMK sans mapping configuré.",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip"],
    defaultEnabled: true,
  },
  {
    key: "no_data",
    label: "Sans données supervision",
    description: "Périphérique mappé CheckMK mais sans données récentes.",
    families: ["servers", "stockage", "firewall", "switch", "wifi", "routeur", "internet", "toip"],
    defaultEnabled: false,
  },
  {
    key: "warranty_expired",
    label: "Garantie expirée",
    description: "Date de fin de garantie dépassée.",
    families: ["servers", "stockage", "firewall"],
    defaultEnabled: true,
  },
  {
    key: "warranty_soon",
    label: "Garantie expire bientôt",
    description: "Fin de garantie dans les prochains mois.",
    families: ["servers", "stockage", "firewall"],
    defaultEnabled: true,
  },
  {
    key: "maintenance_expired",
    label: "Licence maintenance expirée",
    description: "Contrat de maintenance firewall expiré.",
    families: ["firewall"],
    defaultEnabled: true,
  },
  {
    key: "maintenance_soon",
    label: "Licence maintenance bientôt",
    description: "Contrat de maintenance firewall à renouveler.",
    families: ["firewall"],
    defaultEnabled: true,
  },
  {
    key: "battery_expired",
    label: "Batterie à remplacer",
    description: "Onduleur / batterie hors service.",
    families: ["alimentation"],
    defaultEnabled: true,
  },
  {
    key: "battery_soon",
    label: "Batterie à surveiller",
    description: "Date batterie onduleur proche.",
    families: ["alimentation"],
    defaultEnabled: true,
  },
  {
    key: "missing_ip",
    label: "IP non renseignée",
    description: "Adresse IP manquante sur un équipement réseau.",
    families: ["servers", "firewall", "switch", "wifi", "routeur", "toip"],
    defaultEnabled: false,
  },
];

export const SUPERVISION_FAMILIES = [
  { key: "ordinateurs", label: "Ordinateurs" },
  { key: "servers", label: "Serveurs" },
  { key: "stockage", label: "Stockage" },
  { key: "firewall", label: "Firewalls" },
  { key: "switch", label: "Switch" },
  { key: "wifi", label: "Borne WiFi" },
  { key: "routeur", label: "Routeur / SD-WAN" },
  { key: "internet", label: "Internet" },
  { key: "toip", label: "TOIP" },
  { key: "alimentation", label: "Alimentation" },
];

const criteriaByKey = new Map(SUPERVISION_ALERT_CRITERIA.map((c) => [c.key, c]));

export function getCriteriaForFamily(familyKey) {
  const key = String(familyKey || "").toLowerCase();
  return SUPERVISION_ALERT_CRITERIA.filter((c) => c.families.includes(key));
}

export function buildDefaultSupervisionAlertRules() {
  const rules = {};
  for (const family of SUPERVISION_FAMILIES) {
    rules[family.key] = {};
    for (const criterion of getCriteriaForFamily(family.key)) {
      rules[family.key][criterion.key] = criterion.defaultEnabled;
    }
  }
  return rules;
}

export function isSupervisionCriterionEnabled(familyKey, criterionKey, rules) {
  const family = String(familyKey || "").toLowerCase();
  const criterion = String(criterionKey || "");
  const familyRules = rules?.[family];
  if (familyRules && familyRules[criterion] !== undefined) {
    return Boolean(familyRules[criterion]);
  }
  const meta = criteriaByKey.get(criterion);
  if (!meta) return true;
  return Boolean(meta.defaultEnabled);
}

export function resolveCriterionFromMonitorStatus(monitorStatus, source = "checkmk") {
  const status = String(monitorStatus || "").toLowerCase();
  if (status === "critical") return "monitor_critical";
  if (status === "warning") return "monitor_warning";
  if (status === "offline") return source === "rmm" ? "agent_offline" : "monitor_critical";
  if (status === "unmapped") return "unmapped";
  if (status === "no_data") return "no_data";
  return null;
}

export function resolveEquipmentFamilyKey(type) {
  return resolveEquipmentFamilyForAlerts(type);
}

export function isMonitorStatusAlertEnabled(equipment, monitorStatus, rules) {
  const family = resolveEquipmentFamilyKey(equipment?.type === "NAS" ? "Stockage" : equipment?.type);
  if (!family) return true;
  const source =
    equipment?.type === "Ordinateurs" &&
    (equipment?.agentManaged || equipment?.rawData?.source === "rmm")
      ? "rmm"
      : "checkmk";
  const criterionKey = resolveCriterionFromMonitorStatus(monitorStatus, source);
  if (!criterionKey) return true;
  return isSupervisionCriterionEnabled(family, criterionKey, rules);
}

export function filterSupervisionIssues(issues, equipmentType, rules) {
  const family = resolveEquipmentFamilyKey(equipmentType === "NAS" ? "Stockage" : equipmentType);
  if (!family || !Array.isArray(issues)) return issues || [];
  return issues.filter((issue) => isSupervisionCriterionEnabled(family, issue.key, rules));
}
