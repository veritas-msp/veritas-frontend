import { resolveActiveLocale } from "../i18n/locales";
const LOCALE_TAGS = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};
const LOCALE_DATE_FORMAT = {
  fr: "dd/mm/yyyy",
  en: "dd/mm/yyyy",
  de: "dd/mm/yyyy",
  it: "dd/mm/yyyy",
  es: "dd/mm/yyyy"
};
const DEFAULT_REGIONAL = {
  dateFormat: "dd/mm/yyyy",
  timezone: "Europe/Paris",
  locale: "fr"
};
let cachedRegional = {
  ...DEFAULT_REGIONAL
};
export function setAppRegionalSettings(settings = {}) {
  const locale = resolveActiveLocale(settings.app_default_locale || DEFAULT_REGIONAL.locale);
  cachedRegional = {
    dateFormat: resolveEffectiveDateFormat(settings.app_date_format, locale),
    timezone: settings.app_timezone || DEFAULT_REGIONAL.timezone,
    locale
  };
}
export function resolveEffectiveDateFormat(adminFormat, locale) {
  return LOCALE_DATE_FORMAT[locale] || adminFormat || DEFAULT_REGIONAL.dateFormat;
}
export function getAppRegionalSettings() {
  return cachedRegional;
}
export function parseDefaultPageSize(settings, fallback = 50) {
  const raw = settings?.app_default_page_size;
  const parsed = parseInt(String(raw), 10);
  return [25, 50, 100].includes(parsed) ? parsed : fallback;
}
function localeTag(locale) {
  return LOCALE_TAGS[locale] || LOCALE_TAGS.fr;
}
function getZonedParts(date, timezone, locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
}
function partValue(parts, type) {
  return parts.find(part => part.type === type)?.value || "";
}
export function parseAppDateValue(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const str = String(value).trim();
  if (!str) return null;
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (isoDateOnly) {
    return new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]));
  }
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function formatAppDate(value, regional = cachedRegional) {
  const date = parseAppDateValue(value);
  if (!date) return "-";
  const parts = getZonedParts(date, regional.timezone, regional.locale);
  const day = partValue(parts, "day");
  const month = partValue(parts, "month");
  const year = partValue(parts, "year");
  switch (regional.dateFormat) {
    case "mm/dd/yyyy":
      return `${month}/${day}/${year}`;
    case "yyyy-mm-dd":
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}
export function formatAppTime(value, regional = cachedRegional) {
  const date = parseAppDateValue(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat(localeTag(regional.locale), {
    timeZone: regional.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
export function formatAppDateTime(value, regional = cachedRegional) {
  if (!value) return "-";
  return `${formatAppDate(value, regional)} ${formatAppTime(value, regional)}`;
}
export function formatAppDateRange(start, end, regional = cachedRegional) {
  const startLabel = formatAppDate(start, regional);
  const endLabel = formatAppDate(end, regional);
  if (endLabel === "-" || startLabel === endLabel) return startLabel;
  return `${startLabel} → ${endLabel}`;
}
export function formatAppLongDate(value, regional = cachedRegional) {
  const date = parseAppDateValue(value) || new Date();
  if (Number.isNaN(date.getTime())) return "-";
  const weekday = new Intl.DateTimeFormat(localeTag(regional.locale), {
    timeZone: regional.timezone,
    weekday: "long"
  }).format(date);
  const capitalizedWeekday = weekday.charAt(0).toLocaleUpperCase(localeTag(regional.locale)) + weekday.slice(1);
  return `${capitalizedWeekday} ${formatAppDate(date, regional)}`;
}
export function formatAppEventRange(start, end, regional = cachedRegional) {
  const startDate = parseAppDateValue(start);
  const endDate = parseAppDateValue(end);
  if (!startDate) return "-";
  const startDay = formatAppDate(startDate, regional);
  const endDay = formatAppDate(endDate, regional);
  const timeOpts = {
    timeZone: regional.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };
  const startTime = new Intl.DateTimeFormat(localeTag(regional.locale), timeOpts).format(startDate);
  const endTime = !endDate || Number.isNaN(endDate.getTime()) ? "-" : new Intl.DateTimeFormat(localeTag(regional.locale), timeOpts).format(endDate);
  if (startDay === endDay) {
    return `${startDay} ${startTime} – ${endTime}`;
  }
  return `${formatAppDateTime(startDate, regional)} → ${formatAppDateTime(endDate, regional)}`;
}
