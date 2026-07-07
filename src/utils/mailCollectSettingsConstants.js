export const DEFAULT_MAIL_COLLECT_SETTINGS = {
  threadRepliesEnabled: true,
  orphanReplyBehavior: "ignore",
  deduplicateByMessageId: true,
  maxLogEntriesPerCollector: 300,
};

export const ORPHAN_REPLY_BEHAVIOR_OPTIONS = [
  {
    value: "ignore",
    label: "Ignorer",
    subtitle: "Laisser le mail en boîte de réception",
  },
  {
    value: "refuse",
    label: "Refuser",
    subtitle: "Déplacer vers le dossier refusés du collecteur",
  },
];

const ORPHAN_REPLY_BEHAVIORS = new Set(["ignore", "refuse"]);

export function normalizeMailCollectSettings(input = {}) {
  const rawMaxLogs = Number(input?.maxLogEntriesPerCollector);
  const orphanReplyBehavior = String(input?.orphanReplyBehavior || "ignore").trim().toLowerCase();

  return {
    threadRepliesEnabled: input?.threadRepliesEnabled !== false,
    orphanReplyBehavior: ORPHAN_REPLY_BEHAVIORS.has(orphanReplyBehavior) ? orphanReplyBehavior : "ignore",
    deduplicateByMessageId: input?.deduplicateByMessageId !== false,
    maxLogEntriesPerCollector: Number.isFinite(rawMaxLogs)
      ? Math.min(2000, Math.max(50, Math.round(rawMaxLogs)))
      : DEFAULT_MAIL_COLLECT_SETTINGS.maxLogEntriesPerCollector,
  };
}
