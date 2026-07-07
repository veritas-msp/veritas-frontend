import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchTechNews } from "../../api/techNews";
import { useTechNewsReactions } from "../../hooks/useTechNewsReactions";
import { getHomeNewsStrings } from "./homeNewsI18n";
import TechNewsReactions from "./TechNewsReactions";
import styles from "./HomeTechNewsColumn.module.css";

const CATEGORY_ICONS = {
  cve: "mdi:bug-outline",
  security: "mdi:shield-alert-outline",
  news: "mdi:newspaper-variant-outline",
  tech: "mdi:chip",
};

const CATEGORY_TONES = {
  cve: styles.catCve,
  security: styles.catSecurity,
  news: styles.catNews,
  tech: styles.catTech,
};

function formatRelativeTime(iso, t, locale) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t.timeAgo(1, t.minutes);
  if (diffMin < 60) return t.timeAgo(diffMin, t.minutes);
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 48) return t.timeAgo(diffH, t.hours);
  const diffD = Math.floor(diffH / 24);
  return t.timeAgo(diffD, t.days);
}

export default function HomeTechNewsColumn({ locale }) {
  const t = useMemo(() => getHomeNewsStrings(locale), [locale]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const articleIds = useMemo(() => items.map((item) => item.id).filter(Boolean), [items]);
  const { reactions, mine, pending, react } = useTechNewsReactions(articleIds);

  const load = useCallback(
    (signal) => {
      setLoading(true);
      setError(false);
      fetchTechNews(locale, { signal })
        .then((data) => {
          setItems(Array.isArray(data?.items) ? data.items : []);
          setPartial(!!data?.partial);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setError(true);
          setItems([]);
        })
        .finally(() => setLoading(false));
    },
    [locale]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  const localeTag = useMemo(() => {
    const map = { fr: "fr-FR", en: "en-GB", de: "de-DE", it: "it-IT", es: "es-ES" };
    return map[locale] || "fr-FR";
  }, [locale]);

  return (
    <aside className={styles.column} aria-label={t.title}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <Icon icon="mdi:rss" className={styles.headerIcon} aria-hidden />
          <div>
            <h2 className={styles.title}>{t.title}</h2>
            <p className={styles.subtitle}>{t.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          title={t.refresh}
          aria-label={t.refresh}
        >
          <Icon icon="mdi:refresh" className={loading ? styles.spinning : ""} />
        </button>
      </div>

      {partial && !loading && !error && (
        <p className={styles.partialNote}>{t.partial}</p>
      )}

      <div className={styles.feed}>
        {loading && (
          <div className={styles.stateBox}>
            <Icon icon="mdi:loading" className={styles.spinning} />
            <span>{t.loading}</span>
          </div>
        )}

        {!loading && error && (
          <div className={styles.stateBox}>
            <Icon icon="mdi:wifi-off" />
            <span>{t.error}</span>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className={styles.stateBox}>
            <Icon icon="mdi:newspaper-remove-outline" />
            <span>{t.empty}</span>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <ul className={styles.list}>
            {items.map((item) => {
              const cat = item.category || "news";
              const catLabel = t.categories[cat] || t.categories.news;
              const catIcon = CATEGORY_ICONS[cat] || CATEGORY_ICONS.news;
              const catTone = CATEGORY_TONES[cat] || CATEGORY_TONES.news;

              return (
                <li key={item.id} className={styles.listItem}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.article}
                  >
                    <div className={styles.articleTop}>
                      <span className={`${styles.category} ${catTone}`}>
                        <Icon icon={catIcon} className={styles.categoryIcon} />
                        {catLabel}
                      </span>
                      {item.publishedAt && (
                        <time
                          className={styles.time}
                          dateTime={item.publishedAt}
                          title={new Date(item.publishedAt).toLocaleString(localeTag)}
                        >
                          {formatRelativeTime(item.publishedAt, t, locale)}
                        </time>
                      )}
                    </div>
                    <span className={styles.articleTitle}>{item.title}</span>
                    {item.snippet && (
                      <span className={styles.snippet}>{item.snippet}</span>
                    )}
                    <span className={styles.source}>{item.source}</span>
                  </a>
                  <TechNewsReactions
                    articleId={item.id}
                    reactions={reactions[item.id]}
                    myReaction={mine[item.id] || null}
                    pending={!!pending[item.id]}
                    onReact={react}
                    t={t}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
