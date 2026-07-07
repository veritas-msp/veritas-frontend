import moment from "moment";

/** Format stocké en base (timestamp without time zone = horloge locale). */
export const PLANNING_DATETIME_FORMAT = "YYYY-MM-DDTHH:mm:ss";

const PLANNING_PARSE_FORMATS = [
  PLANNING_DATETIME_FORMAT,
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DDTHH:mm",
  moment.ISO_8601,
];

function isWallClockString(value) {
  const str = String(value || "").trim();
  return (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str) &&
    !/[zZ]$/.test(str) &&
    !/[+-]\d{2}:?\d{2}$/.test(str)
  );
}

/** Sérialise une date/heure locale pour l'API planning (sans fuseau Z). */
export function formatPlanningDateTime(input) {
  const m = moment(input);
  return m.isValid() ? m.format(PLANNING_DATETIME_FORMAT) : null;
}

/** Parse une valeur API en Date locale pour le calendrier. */
export function parsePlanningDateTime(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (isWallClockString(str)) {
    const m = moment(str, PLANNING_PARSE_FORMATS, true);
    return m.isValid() ? m.toDate() : null;
  }

  const m = moment(str, PLANNING_PARSE_FORMATS, true);
  return m.isValid() ? m.toDate() : null;
}

/** Moment local pour formulaires / affichage. */
export function planningMoment(value) {
  if (value == null || value === "") return moment.invalid();
  if (value instanceof Date) return moment(value);

  const str = String(value).trim();
  if (isWallClockString(str)) {
    return moment(str, PLANNING_PARSE_FORMATS, true);
  }
  return moment(str, PLANNING_PARSE_FORMATS, true);
}
