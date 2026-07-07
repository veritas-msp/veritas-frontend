export const DEFAULT_IN_APP_SETTINGS = {
  enabled: true,
  events: {
    ticket_commented: {
      enabled: true,
      notifyAssignees: true,
      notifyWatchers: true,
      excludeInternalComments: false,
    },
    ticket_assigned: {
      enabled: true,
    },
    ticket_created: {
      enabled: false,
      notifyAssignees: true,
    },
    ticket_updated: {
      enabled: false,
      notifyAssignees: true,
    },
    ticket_resolved: {
      enabled: true,
      notifyAssignees: true,
      notifyWatchers: false,
    },
    ticket_satisfaction: {
      enabled: true,
      notifyAssignees: true,
      notifyWatchers: false,
    },
  },
};

export const IN_APP_EVENT_OPTIONS = [
  {
    key: "ticket_commented",
    label: "Commentaire ajouté",
    description: "Alerte lors d'un nouveau message sur un ticket suivi.",
    icon: "mdi:comment-text-outline",
    fields: [
      { key: "notifyAssignees", label: "Assignés", hint: "Agents assignés au ticket" },
      { key: "notifyWatchers", label: "Followers", hint: "Agents qui suivent le ticket" },
      { key: "excludeInternalComments", label: "Ignorer les notes internes", hint: "Ne pas alerter pour les réponses privées" },
    ],
  },
  {
    key: "ticket_assigned",
    label: "Assignation",
    description: "Alerte quand un agent est ajouté comme assigné.",
    icon: "mdi:account-arrow-right-outline",
    fields: [],
  },
  {
    key: "ticket_created",
    label: "Création de ticket",
    description: "Alerte à la création si un assigné est défini.",
    icon: "mdi:ticket-confirmation-outline",
    fields: [{ key: "notifyAssignees", label: "Notifier les assignés", hint: "Dès la création du ticket" }],
  },
  {
    key: "ticket_updated",
    label: "Modification de ticket",
    description: "Alerte lors d'une mise à jour (statut, priorité, etc.).",
    icon: "mdi:pencil-outline",
    fields: [{ key: "notifyAssignees", label: "Notifier les assignés", hint: "Sur toute modification" }],
  },
  {
    key: "ticket_resolved",
    label: "Résolution de ticket",
    description: "Alerte quand un ticket passe en résolu.",
    icon: "mdi:check-circle-outline",
    fields: [
      { key: "notifyAssignees", label: "Assignés", hint: "Agents assignés au ticket" },
      { key: "notifyWatchers", label: "Followers", hint: "Agents qui suivent le ticket" },
    ],
  },
  {
    key: "ticket_satisfaction",
    label: "Retour satisfaction client",
    description: "Alerte quand un client laisse une note sur un ticket terminé.",
    icon: "mdi:star-outline",
    fields: [
      { key: "notifyAssignees", label: "Assignés", hint: "Agent assigné au ticket" },
      { key: "notifyWatchers", label: "Followers", hint: "Agents qui suivent le ticket" },
    ],
  },
];

export const IN_APP_EVENT_GROUPS = [
  {
    id: "activity",
    title: "Activité",
    description: "Échanges et messages sur les tickets.",
    eventKeys: ["ticket_commented"],
  },
  {
    id: "assignment",
    title: "Assignation",
    description: "Prise en charge et réassignation.",
    eventKeys: ["ticket_assigned"],
  },
  {
    id: "lifecycle",
    title: "Cycle de vie",
    description: "Création, évolution et clôture des tickets.",
    eventKeys: ["ticket_created", "ticket_updated", "ticket_resolved", "ticket_satisfaction"],
  },
];

export function normalizeInAppSettings(raw = {}) {
  const defaults = DEFAULT_IN_APP_SETTINGS;
  const sourceEvents =
    raw?.events && typeof raw.events === "object" && !Array.isArray(raw.events) ? raw.events : {};

  const normalizeEvent = (key, fallback) => {
    const item = sourceEvents[key];
    if (!item || typeof item !== "object") return { ...fallback };
    return {
      ...fallback,
      ...Object.fromEntries(
        Object.entries(fallback).map(([field, defaultValue]) => [
          field,
          typeof item[field] === "boolean" ? item[field] : defaultValue,
        ])
      ),
    };
  };

  return {
    enabled: raw?.enabled !== false,
    events: {
      ticket_commented: normalizeEvent("ticket_commented", defaults.events.ticket_commented),
      ticket_assigned: normalizeEvent("ticket_assigned", defaults.events.ticket_assigned),
      ticket_created: normalizeEvent("ticket_created", defaults.events.ticket_created),
      ticket_updated: normalizeEvent("ticket_updated", defaults.events.ticket_updated),
      ticket_resolved: normalizeEvent("ticket_resolved", defaults.events.ticket_resolved),
      ticket_satisfaction: normalizeEvent("ticket_satisfaction", defaults.events.ticket_satisfaction),
    },
  };
}

export const DEFAULT_USER_IN_APP_PREFERENCES = {
  enabled: true,
  events: {
    ticket_commented: { enabled: true },
    ticket_assigned: { enabled: true },
    ticket_created: { enabled: true },
    ticket_updated: { enabled: true },
    ticket_resolved: { enabled: true },
    ticket_satisfaction: { enabled: true },
  },
};

export function normalizeUserInAppPreferences(raw = {}) {
  const defaults = DEFAULT_USER_IN_APP_PREFERENCES;
  const sourceEvents =
    raw?.events && typeof raw.events === "object" && !Array.isArray(raw.events) ? raw.events : {};

  const normalizeEvent = (key) => {
    const item = sourceEvents[key];
    const defaultEnabled = defaults.events[key]?.enabled !== false;
    if (!item || typeof item !== "object") return { enabled: defaultEnabled };
    return { enabled: item.enabled !== false };
  };

  return {
    enabled: raw?.enabled !== false,
    events: {
      ticket_commented: normalizeEvent("ticket_commented"),
      ticket_assigned: normalizeEvent("ticket_assigned"),
      ticket_created: normalizeEvent("ticket_created"),
      ticket_updated: normalizeEvent("ticket_updated"),
      ticket_resolved: normalizeEvent("ticket_resolved"),
      ticket_satisfaction: normalizeEvent("ticket_satisfaction"),
    },
  };
}
