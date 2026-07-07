export const RMM_TOKEN_FORM_SECTIONS = [
  {
    id: "enterprise",
    label: "Entreprise",
    description: "Rattachement Veritas",
    icon: "mdi:office-building-outline",
  },
  {
    id: "details",
    label: "Détails",
    description: "Libellé et usage",
    icon: "mdi:tag-outline",
  },
];

export function buildDefaultTokenDraft() {
  return {
    clientId: "",
    label: "",
  };
}
