export const SCHEDULED_ALERT_TRIGGER_OPTIONS = [
  { value: "contract_expiration", label: "Expiration contrat client" },
  { value: "license_expiration_antivirus", label: "Expiration licence antivirus" },
  { value: "license_expiration_antispam", label: "Expiration licence antispam" },
  { value: "ticket_sla_risk", label: "SLA ticket bientôt dépassé" },
];

export const SCHEDULED_ALERT_FORM_SECTIONS = [
  {
    id: "general",
    label: "Planification",
    description: "Nom, CRON et déclencheur",
    icon: "mdi:clock-outline",
  },
  {
    id: "delivery",
    label: "Diffusion",
    description: "Canaux et destinataires",
    icon: "mdi:send-outline",
  },
];

const TRIGGER_LABELS = Object.fromEntries(
  SCHEDULED_ALERT_TRIGGER_OPTIONS.map((item) => [item.value, item.label])
);

export function buildDefaultScheduledAlertRule() {
  return {
    id: `cron-alert-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: "",
    cron: "0 8 * * *",
    triggerType: "contract_expiration",
    thresholdDays: 30,
    channels: ["mail"],
    recipients: "",
    enabled: true,
  };
}

export function describeScheduledAlertRule(rule = {}) {
  const trigger = TRIGGER_LABELS[rule.triggerType] || rule.triggerType || "-";
  const channels = Array.isArray(rule.channels) ? rule.channels : [];
  const channelLabel = channels.length
    ? channels.map((c) => (c === "teams" ? "Teams" : "Mail")).join(", ")
    : "Aucun canal";
  return `${trigger} · J-${Number(rule.thresholdDays ?? 0)} · ${channelLabel}`;
}
