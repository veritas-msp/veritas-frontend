export const TODO_PRESET_COLORS = [
  "#15d1a0",
  "#2b5fab",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
];

export const TODO_DEFAULT_COLOR = TODO_PRESET_COLORS[0];

export const EVENT_FORM_SECTIONS = [
  {
    id: "general",
    label: "Général",
    description: "Titre, type et client",
    icon: "mdi:calendar-text-outline",
  },
  {
    id: "schedule",
    label: "Dates",
    description: "Créneau et agents",
    icon: "mdi:clock-outline",
  },
  {
    id: "description",
    label: "Description",
    description: "Contexte et détails",
    icon: "mdi:text-box-outline",
  },
  {
    id: "objects",
    label: "Objets",
    description: "Équipements liés",
    icon: "mdi:cube-outline",
  },
  {
    id: "todos",
    label: "To-do",
    description: "Liste de tâches",
    icon: "mdi:format-list-checks",
  },
];

export const EVENT_DESCRIPTION_EDITOR_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["blockquote", "code-block", "link"],
    ["clean"],
  ],
};

export const EVENT_DESCRIPTION_EDITOR_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
  "bullet",
  "align",
  "blockquote",
  "code-block",
  "link",
];

export function getLinkedItemIcon(item) {
  const type = (item?.type || "").toLowerCase();
  const group = (item?.group || "").toLowerCase();
  if (type.includes("serveur")) return "mdi:server";
  if (type.includes("nas") || type.includes("san") || type.includes("stock")) return "mdi:harddisk";
  if (type.includes("firewall")) return "mdi:shield-outline";
  if (type.includes("switch")) return "mdi:lan";
  if (type.includes("wifi") || type.includes("borne")) return "mdi:wifi";
  if (type.includes("camera") || type.includes("cam")) return "mdi:cctv";
  if (type.includes("internet")) return "mdi:web";
  if (type.includes("office365") || group.includes("tenant")) return "mdi:microsoft-office";
  if (type.includes("antivirus")) return "mdi:shield-check";
  if (type.includes("antispam")) return "mdi:email-lock";
  if (type.includes("sauveg")) return "mdi:content-save-outline";
  if (type.includes("ndd")) return "mdi:domain";
  return "mdi:cube-outline";
}
