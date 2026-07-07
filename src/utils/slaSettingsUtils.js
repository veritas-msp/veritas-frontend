export const SLA_TIME_MODES = ["calendar", "business_hours", "business_days"];

export const SLA_TIME_MODE_LABELS = {
  calendar: "Heures calendaires (24h/24)",
  business_hours: "Heures ouvrées",
  business_days: "Jours ouvrés",
};

export const SLA_TIME_MODE_HINTS = {
  calendar: "Les délais entreprise (en heures) s'additionnent en continu, y compris la nuit et le week-end.",
  business_hours:
    "Les délais comptent uniquement pendant les plages d'ouverture ci-dessous. Hors horaires, le compteur est en pause.",
  business_days:
    "Chaque unité de délai correspond à une journée ouvrée complète (jusqu'à l'heure de fermeture du jour).",
};

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_LABELS = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

export function createDefaultWeekSchedule() {
  return WEEKDAY_ORDER.map((day) => ({
    day,
    enabled: day >= 1 && day <= 5,
    open: "09:00",
    close: "18:00",
  }));
}

export const DEFAULT_SLA_SETTINGS = {
  timeMode: "calendar",
  timezone: "Europe/Paris",
  weekSchedule: createDefaultWeekSchedule(),
};

export function formatWeekScheduleSummary(settings) {
  const openDays = (settings?.weekSchedule || []).filter((row) => row.enabled);
  if (!openDays.length) return "Aucun jour ouvré configuré";
  const first = openDays[0];
  const sameHours = openDays.every((row) => row.open === first.open && row.close === first.close);
  const days = openDays.map((row) => WEEKDAY_LABELS[row.day]).join(", ");
  if (sameHours) return `${days} · ${first.open}–${first.close}`;
  return days;
}

export function getSlaUnitLabel(timeMode) {
  if (timeMode === "business_days") return "jours ouvrés";
  if (timeMode === "business_hours") return "heures ouvrées";
  return "heures";
}
