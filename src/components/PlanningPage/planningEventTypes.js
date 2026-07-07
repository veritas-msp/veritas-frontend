import {
  getTicketTypeIcon,
  getTicketTypeSupportLabel,
} from "../../utils/ticketReminderEvent";

export const PLANNING_EVENT_TYPES = [
  { value: "intervention", label: "Intervention", icon: "mdi:wrench", kpiTone: "blue" },
  { value: "presentation", label: "Présentation", icon: "mdi:presentation", kpiTone: "violet" },
  { value: "maintenance_preventive", label: "Préventive", icon: "mdi:shield-check", kpiTone: "amber" },
  { value: "maintenance", label: "Maintenance", icon: "mdi:cog", kpiTone: "orange" },
  { value: "mise_a_jour", label: "Mise à jour", icon: "mdi:update", kpiTone: "blue" },
  { value: "conge", label: "Congé", icon: "mdi:beach", kpiTone: "teal" },
  { value: "integration_monitoring", label: "Monitoring", icon: "mdi:chart-line-variant", kpiTone: "cyan" },
  { value: "campagne", label: "Campagne", icon: "mdi:shield-lock", kpiTone: "violet" },
  { value: "other", label: "Autre", icon: "mdi:calendar-blank", kpiTone: "orange" },
];

export const PLANNING_TYPE_LABELS = Object.fromEntries(
  PLANNING_EVENT_TYPES.map((type) => [type.value, type.label])
);

export const PLANNING_SUPPORT_LEGEND = [
  { value: "support_incident", label: "Incident support", icon: "mdi:alert-circle-outline" },
  { value: "support_demande", label: "Demande support", icon: "mdi:hand-extended-outline" },
  { value: "support_probleme", label: "Problème support", icon: "mdi:bug-outline" },
];

export const PLANNING_LEGEND_ITEMS = [
  ...PLANNING_EVENT_TYPES.filter((type) => type.value !== "campagne"),
  ...PLANNING_SUPPORT_LEGEND,
  PLANNING_EVENT_TYPES.find((type) => type.value === "campagne"),
].filter(Boolean);

export function getPlanningEventTypeKey(event) {
  if (event?.isTicketReminder || event?.ticketId) {
    return "support";
  }
  return event?.resource || event?.type || "other";
}

export function getPlanningEventTypeIcon(event) {
  if (event?.isTicketReminder || event?.ticketId) {
    return getTicketTypeIcon(event.ticketType);
  }
  const key = getPlanningEventTypeKey(event);
  const match = PLANNING_EVENT_TYPES.find((type) => type.value === key);
  return match?.icon || "mdi:calendar-blank";
}

export function getPlanningEventTypeLabel(event) {
  if (event?.isTicketReminder || event?.ticketId) {
    return getTicketTypeSupportLabel(event.ticketType);
  }
  const key = getPlanningEventTypeKey(event);
  return PLANNING_TYPE_LABELS[key] || key;
}
