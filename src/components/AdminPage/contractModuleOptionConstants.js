export const CONTRACT_MODULE_OPTION_FORM_SECTIONS = [
  {
    id: "identity",
    label: "Identité",
    description: "Clé et libellé",
    icon: "mdi:identifier",
  },
  {
    id: "presentation",
    label: "Présentation",
    description: "Icône et visibilité",
    icon: "mdi:palette-outline",
  },
];

export function buildDefaultContractModuleOptionDraft() {
  return {
    moduleKey: "",
    label: "",
    icon: "mdi:puzzle-outline",
    enabled: true,
    sortOrder: "",
  };
}

export function buildContractModuleOptionDraftFromModule(mod) {
  return {
    moduleKey: mod.moduleKey || "",
    label: mod.label || "",
    icon: mod.icon || "mdi:puzzle-outline",
    enabled: mod.enabled !== false,
    sortOrder: String(mod.sortOrder ?? ""),
  };
}
