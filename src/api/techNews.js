import API_BASE_URL from "../config";

export const TECH_NEWS_REACTION_EMOJIS = ["👍", "👀", "🔥", "😱", "💡", "🎯", "⚠️", "❤️"];

export async function fetchTechNews(locale = "fr", options = {}) {
  const params = new URLSearchParams({ locale });
  const res = await fetch(`${API_BASE_URL}/tech-news?${params}`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) throw new Error("Erreur chargement actualités");
  return res.json();
}

export async function fetchTechNewsReactions(articleIds, options = {}) {
  const ids = Array.isArray(articleIds) ? articleIds : [];
  if (ids.length === 0) {
    return { articles: {}, mine: {}, emojis: TECH_NEWS_REACTION_EMOJIS };
  }
  const params = new URLSearchParams({ ids: ids.join(",") });
  const res = await fetch(`${API_BASE_URL}/tech-news/reactions?${params}`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) throw new Error("Erreur chargement réactions");
  return res.json();
}

export async function toggleTechNewsReaction(articleId, emoji) {
  const res = await fetch(`${API_BASE_URL}/tech-news/reactions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articleId, emoji }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur lors de la réaction");
  return data;
}

export function subscribeTechNewsReactionStream({ onEvent, onError }) {
  const controller = new AbortController();
  let cancelled = false;

  (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tech-news/reactions/stream`, {
        credentials: "include",
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("Flux réactions indisponible");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Flux non supporté");

      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type !== "heartbeat") onEvent?.(payload);
          } catch {
            /* ignore malformed event */
          }
        }
      }
    } catch (err) {
      if (!cancelled && err.name !== "AbortError") onError?.(err);
    }
  })();

  return () => {
    cancelled = true;
    controller.abort();
  };
}
