export const CONTACT_SEXE_OPTIONS = [
  { value: "", label: "Non renseigné" },
  { value: "monsieur", label: "Monsieur" },
  { value: "madame", label: "Madame" },
];

/** Options affichées en cartes (civilité du contact). */
export const CONTACT_CIVILITY_CARDS = [
  { value: "monsieur", label: "Monsieur", icon: "mdi:account-tie-outline" },
  { value: "madame", label: "Madame", icon: "mdi:account-outline" },
];

const SEXE_LABELS = {
  monsieur: "Monsieur",
  madame: "Madame",
};

const SEXE_SHORT_LABELS = {
  monsieur: "M.",
  madame: "Mme",
};

const SEXE_ICONS = {
  monsieur: "mdi:account-tie-outline",
  madame: "mdi:account-outline",
};

export function normalizeContactSexe(value) {
  if (value === null || value === undefined) return "";
  const raw = String(value).toLowerCase().trim();
  if (!raw) return "";
  if (["monsieur", "mr", "m.", "m", "homme", "masculin", "h"].includes(raw)) return "monsieur";
  if (["madame", "mme", "mme.", "mrs", "mlle", "femme", "féminin", "feminin", "f"].includes(raw)) {
    return "madame";
  }
  if (SEXE_LABELS[raw]) return raw;
  return "";
}

export function getContactSexeLabel(value) {
  const key = normalizeContactSexe(value);
  return key ? SEXE_LABELS[key] || key : "Non renseigné";
}

export function getContactSexeShortLabel(value) {
  const key = normalizeContactSexe(value);
  return key ? SEXE_SHORT_LABELS[key] || key : "";
}

export function getContactSexeIcon(value) {
  const key = normalizeContactSexe(value);
  return key ? SEXE_ICONS[key] || "mdi:account-outline" : null;
}
