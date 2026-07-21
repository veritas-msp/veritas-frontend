import { pickLocaleMessages } from "../../i18n/translate";
const STRINGS = {
  fr: {
    title: "Fil tech & cybersécurité",
    subtitle: "CVE, alertes et actualités IT",
    loading: "Chargement des actualités…",
    error: "Actualités indisponibles",
    empty: "Aucun article pour le moment",
    partial: "Certaines sources sont temporairement indisponibles",
    refresh: "Actualiser",
    reactAction: "Réagir",
    changeReaction: "Modifier ma réaction",
    reactionsLabel: "Réactions",
    addReaction: "Ajouter cette réaction",
    removeReaction: "Retirer votre réaction",
    reactedWith: emoji => `Ont réagi avec ${emoji}`,
    categories: {
      cve: "CVE",
      security: "Sécurité",
      news: "Actualités",
      tech: "Technologie"
    },
    timeAgo: (n, unit) => `Il y a ${n} ${unit}`,
    minutes: "min",
    hours: "h",
    days: "j"
  },
  en: {
    title: "Tech & security feed",
    subtitle: "CVEs, alerts and IT news",
    loading: "Loading news…",
    error: "News unavailable",
    empty: "No articles at the moment",
    partial: "Some sources are temporarily unavailable",
    refresh: "Refresh",
    reactAction: "React",
    changeReaction: "Change my reaction",
    reactionsLabel: "Reactions",
    addReaction: "Add this reaction",
    removeReaction: "Remove your reaction",
    reactedWith: emoji => `Reacted with ${emoji}`,
    categories: {
      cve: "CVE",
      security: "Security",
      news: "News",
      tech: "Technology"
    },
    timeAgo: (n, unit) => `${n} ${unit} ago`,
    minutes: "min",
    hours: "h",
    days: "d"
  },
  de: {
    title: "Tech- & Security-Feed",
    subtitle: "CVEs, Warnungen und IT-News",
    loading: "Nachrichten werden geladen…",
    error: "Nachrichten nicht verfügbar",
    empty: "Derzeit keine Artikel",
    partial: "Einige Quellen sind vorübergehend nicht erreichbar",
    refresh: "Aktualisieren",
    reactAction: "Reagieren",
    changeReaction: "Meine Reaktion ändern",
    reactionsLabel: "Reaktionen",
    addReaction: "Diese Reaktion hinzufügen",
    removeReaction: "Ihre Reaktion entfernen",
    reactedWith: emoji => `Reagiert mit ${emoji}`,
    categories: {
      cve: "CVE",
      security: "Sicherheit",
      news: "Nachrichten",
      tech: "Technologie"
    },
    timeAgo: (n, unit) => `vor ${n} ${unit}`,
    minutes: "Min.",
    hours: "Std.",
    days: "Tg."
  },
  it: {
    title: "Feed tech e sicurezza",
    subtitle: "CVE, avvisi e notizie IT",
    loading: "Caricamento notizie…",
    error: "Notizie non disponibili",
    empty: "Nessun articolo al momento",
    partial: "Alcune fonti sono temporaneamente non disponibili",
    refresh: "Aggiorna",
    reactAction: "Reagisci",
    changeReaction: "Modifica la mia reazione",
    reactionsLabel: "Reazioni",
    addReaction: "Aggiungi questa reazione",
    removeReaction: "Rimuovi la tua reazione",
    reactedWith: emoji => `Hanno reagito con ${emoji}`,
    categories: {
      cve: "CVE",
      security: "Sicurezza",
      news: "Notizie",
      tech: "Tecnologia"
    },
    timeAgo: (n, unit) => `${n} ${unit} fa`,
    minutes: "min",
    hours: "h",
    days: "g"
  },
  es: {
    title: "Feed tech y ciberseguridad",
    subtitle: "CVE, alertas y noticias IT",
    loading: "Cargando noticias…",
    error: "Noticias no disponibles",
    empty: "Sin artículos por el momento",
    partial: "Algunas fuentes no están disponibles temporalmente",
    refresh: "Actualizar",
    reactAction: "Reaccionar",
    changeReaction: "Cambiar mi reacción",
    reactionsLabel: "Reacciones",
    addReaction: "Añadir esta reacción",
    removeReaction: "Quitar tu reacción",
    reactedWith: emoji => `Reaccionaron con ${emoji}`,
    categories: {
      cve: "CVE",
      security: "Seguridad",
      news: "Noticias",
      tech: "Tecnología"
    },
    timeAgo: (n, unit) => `Hace ${n} ${unit}`,
    minutes: "min",
    hours: "h",
    days: "d"
  }
};
export function getHomeNewsStrings(locale) {
  return pickLocaleMessages(STRINGS, locale);
}
