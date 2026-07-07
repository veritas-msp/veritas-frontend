export const TECH_NEWS_FEED_FORM_SECTIONS = [
  {
    id: "source",
    label: "Source",
    description: "Nom et URL du flux",
    icon: "mdi:newspaper-variant-outline",
  },
  {
    id: "display",
    label: "Affichage",
    description: "Catégorie et ordre",
    icon: "mdi:tune-variant",
  },
];

export const DEFAULT_TECH_NEWS_FEED_CATEGORIES = ["cve", "security", "news", "tech"];

export function buildDefaultTechNewsFeedDraft() {
  return {
    source: "",
    url: "",
    category: "news",
    enabled: true,
    sortOrder: "",
  };
}

export function buildTechNewsFeedDraftFromFeed(feed) {
  return {
    source: feed.source || "",
    url: feed.url || "",
    category: feed.category || "news",
    enabled: feed.enabled !== false,
    sortOrder: String(feed.sortOrder ?? ""),
  };
}
