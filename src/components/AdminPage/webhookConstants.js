export const WEBHOOK_TYPE_PRESETS = [
  {
    key: "teams",
    label: "Microsoft Teams",
    subtitle: "Canal Teams via webhook entrant",
    icon: "mdi:microsoft-teams",
  },
  {
    key: "slack",
    label: "Slack",
    subtitle: "Canal Slack entrant",
    icon: "mdi:slack",
    comingSoon: true,
  },
  {
    key: "webhook",
    label: "Webhook custom",
    subtitle: "Endpoint HTTP personnalisé",
    icon: "mingcute:link-2-fill",
  },
];

export const WEBHOOK_FORM_SECTIONS = [
  {
    id: "type",
    label: "Type",
    description: "Canal de destination",
    icon: "mdi:transit-connection-variant",
  },
  {
    id: "config",
    label: "Configuration",
    description: "Nom, URL et statut",
    icon: "mdi:cog-outline",
  },
];

export function buildDefaultWebhookDraft() {
  return {
    id: `notif-webhook-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: "",
    channel: "teams",
    channelName: "",
    url: "",
    enabled: true,
  };
}

export function describeWebhookChannel(channelKey) {
  const preset = WEBHOOK_TYPE_PRESETS.find((item) => item.key === channelKey);
  return preset?.label || channelKey || "-";
}
