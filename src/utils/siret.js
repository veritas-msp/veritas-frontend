/** Libellés génériques (usage international) · le champ API reste `siret`. */
export const LEGAL_IDENTIFIER_LABEL = "Identifiant légal";
export const LEGAL_IDENTIFIER_PLACEHOLDER = "Numéro d'enregistrement";

/** Normalise la saisie : trim uniquement, sans format ni limite de longueur. */
export function normalizeLegalIdentifier(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed;
}

/** @deprecated Utiliser normalizeLegalIdentifier */
export function digitsOnlySiret(value) {
  return normalizeLegalIdentifier(value);
}

/** @deprecated Affichage brut sans formatage FR */
export function formatSiretDisplay(value) {
  return normalizeLegalIdentifier(value);
}

/** @deprecated */
export const SIRET_PLACEHOLDER = LEGAL_IDENTIFIER_PLACEHOLDER;

/** @deprecated */
export const SIRET_MAX_DIGITS = null;

/** @deprecated */
export const SIRET_DISPLAY_MAX_LENGTH = undefined;
