import { getHomePageCopy } from "./homePageI18n";

const HOME_TODO_LIMIT = 8;

const CYBER_MODULES = new Set(["antivirus", "antispam"]);
const SERVICE_MODULES = new Set(["o365", "domain", "licences", "ssl", "toip"]);

const SOURCE_ICONS = {
  supervision: "mdi:radar",
  cyber: "mdi:shield-check-outline",
  services: "mdi:cloud-outline",
};

const SOURCE_NAV = {
  supervision: "Hardware",
  cyber: "Cybersecurite",
  services: "Service",
};

function resolveTodoSource(module) {
  if (CYBER_MODULES.has(module)) return "cyber";
  if (SERVICE_MODULES.has(module)) return "services";
  return "supervision";
}

export function buildHomeTodoActions(dashboard, { locale = "fr", limit = HOME_TODO_LIMIT } = {}) {
  const copy = getHomePageCopy(locale);
  const items = [];

  for (const alert of dashboard?.contractAlerts || []) {
    items.push({
      id: `contract-${alert.id}`,
      source: "supervision",
      sourceLabel: copy.todo.sources.supervision,
      sourceIcon: SOURCE_ICONS.supervision,
      navigateType: "ContratDetail",
      navigateData: { clientId: alert.id, name: alert.name },
      tone: alert.status === "expired" ? "bad" : "warn",
      label: copy.todo.contract[alert.status] || copy.todo.contract.default,
      title: alert.name,
      meta: copy.todo.contract.meta,
    });
  }

  for (const alert of dashboard?.licenseAlerts || []) {
    const source = resolveTodoSource(alert.module);
    items.push({
      id: alert.id || `license-${alert.clientId}-${alert.module}-${alert.label}`,
      source,
      sourceLabel: copy.todo.sources[source],
      sourceIcon: SOURCE_ICONS[source],
      navigateType: SOURCE_NAV[source],
      navigateData: { clientId: alert.clientId, name: alert.clientName },
      tone: alert.status === "expired" ? "bad" : "warn",
      label: alert.moduleLabel || alert.module || copy.todo.licenseDefault,
      title: alert.label || alert.clientName,
      meta: alert.clientName,
    });
  }

  const toneOrder = { bad: 0, warn: 1 };
  return items
    .sort((a, b) => (toneOrder[a.tone] ?? 9) - (toneOrder[b.tone] ?? 9))
    .slice(0, limit);
}
