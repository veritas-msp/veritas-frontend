export const TICKET_TABLE_COLUMNS_PRIVATE_SETTING_KEY = "ticket_table_columns_private";

/** Colonnes configurables (hors checkbox / actions corbeille). */
export const TICKET_TABLE_COLUMN_IDS = Object.freeze([
  "ticket_number",
  "title",
  "channel",
  "type",
  "requester",
  "client",
  "assigned",
  "followers",
  "status",
  "priority",
  "sla",
  "created_at",
  "updated_at"
]);

export const DEFAULT_TICKET_TABLE_COLUMNS = Object.freeze([...TICKET_TABLE_COLUMN_IDS]);

const ALLOWED = new Set(TICKET_TABLE_COLUMN_IDS);

export const TICKET_TABLE_COLUMN_SORT_KEYS = Object.freeze({
  ticket_number: "ticket_number",
  title: "title",
  channel: "channel",
  type: "type",
  requester: "requester",
  client: "client",
  assigned: "assigned",
  followers: "followers",
  status: "status",
  priority: "priority",
  sla: "sla",
  created_at: "created_at",
  updated_at: "updated_at"
});

export function normalizeTicketTableColumns(raw, {
  allowNull = false,
  fallback = DEFAULT_TICKET_TABLE_COLUMNS
} = {}) {
  if (raw == null) return allowNull ? null : [...(fallback || DEFAULT_TICKET_TABLE_COLUMNS)];
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return allowNull ? null : [...(fallback || DEFAULT_TICKET_TABLE_COLUMNS)];
    }
  }
  if (list && typeof list === "object" && !Array.isArray(list) && Array.isArray(list.columns)) {
    list = list.columns;
  }
  if (!Array.isArray(list)) {
    return allowNull ? null : [...(fallback || DEFAULT_TICKET_TABLE_COLUMNS)];
  }
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const id = String(item || "").trim();
    if (!ALLOWED.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (out.length === 0) {
    return allowNull ? null : [...(fallback || DEFAULT_TICKET_TABLE_COLUMNS)];
  }
  return out;
}

export function filterColumnsForEdition(columns, { isCommunity = false } = {}) {
  const list = Array.isArray(columns) ? columns : [...DEFAULT_TICKET_TABLE_COLUMNS];
  if (!isCommunity) return [...list];
  return list.filter(id => id !== "sla");
}

export function getConfigurableTicketColumns({ isCommunity = false } = {}) {
  return filterColumnsForEdition(DEFAULT_TICKET_TABLE_COLUMNS, { isCommunity });
}

export function resolveEffectiveTicketTableColumns({
  publicColumns,
  privateColumns,
  isCommunity = false
} = {}) {
  const publicNormalized = filterColumnsForEdition(
    normalizeTicketTableColumns(publicColumns, { fallback: DEFAULT_TICKET_TABLE_COLUMNS }),
    { isCommunity }
  );
  const privateNormalized = privateColumns == null
    ? null
    : filterColumnsForEdition(
      normalizeTicketTableColumns(privateColumns, { allowNull: true, fallback: null }),
      { isCommunity }
    );
  if (!privateNormalized || privateNormalized.length === 0) {
    return {
      public: publicNormalized,
      private: null,
      effective: publicNormalized,
      source: "public"
    };
  }
  return {
    public: publicNormalized,
    private: privateNormalized,
    effective: privateNormalized,
    source: "private"
  };
}

export function toggleColumnInList(columns, columnId, enabled) {
  const id = String(columnId || "").trim();
  if (!ALLOWED.has(id)) return Array.isArray(columns) ? [...columns] : [];
  const current = Array.isArray(columns) ? columns.filter(item => ALLOWED.has(item)) : [];
  if (enabled) {
    if (current.includes(id)) return current;
    return [...current, id];
  }
  return current.filter(item => item !== id);
}
