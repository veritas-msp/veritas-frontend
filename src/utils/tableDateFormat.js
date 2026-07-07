import { getAppRegionalSettings, formatAppDate, formatAppDateTime, formatAppDateRange, formatAppEventRange, formatAppLongDate } from "./appRegionalSettings";

/** Date courte pour tableaux, selon les paramètres généraux de l'instance. */
export function formatTableDate(value) {
  return formatAppDate(value, getAppRegionalSettings());
}

/** Date + heure pour tableaux, selon les paramètres généraux de l'instance. */
export function formatTableDateTime(value) {
  return formatAppDateTime(value, getAppRegionalSettings());
}

/** Plage d'événement pour tableaux */
export function formatTableEventRange(start, end) {
  return formatAppEventRange(start, end, getAppRegionalSettings());
}

/** Date longue (jour de semaine + date admin) */
export function formatTableLongDate(value) {
  return formatAppLongDate(value, getAppRegionalSettings());
}

/** Plage de dates courtes pour tableaux */
export function formatTableDateRange(start, end) {
  return formatAppDateRange(start, end, getAppRegionalSettings());
}
