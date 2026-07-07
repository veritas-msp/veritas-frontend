import { useEffect, useRef } from "react";
import API_BASE_URL from "../config";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

/** Throttle des événements d'activité pour limiter le bruit. */
const ACTIVITY_THROTTLE_MS = 30_000;
/** Fréquence de vérification du renouvellement. */
const CHECK_INTERVAL_MS = 60_000;
/** Fenêtre d'activité récente pour considérer l'utilisateur actif. */
const ACTIVITY_WINDOW_MS = 15 * 60_000;
/** Intervalle minimum entre deux renouvellements silencieux. */
const RENEWAL_MIN_INTERVAL_MS = 10 * 60_000;

async function renewSessionSilently() {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok || res.status === 204;
}

/**
 * Prolonge silencieusement la session tant que l'utilisateur interagit avec l'application.
 */
export function useSessionRenewal(enabled) {
  const lastActivityRef = useRef(Date.now());
  const lastRenewalRef = useRef(0);
  const renewalInFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    lastActivityRef.current = Date.now();

    let activityTimer = null;
    const markActivity = () => {
      lastActivityRef.current = Date.now();
      if (activityTimer) return;
      activityTimer = window.setTimeout(() => {
        activityTimer = null;
      }, ACTIVITY_THROTTLE_MS);
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, markActivity, { passive: true });
    });

    const tryRenew = async () => {
      const now = Date.now();
      if (now - lastActivityRef.current > ACTIVITY_WINDOW_MS) return;
      if (now - lastRenewalRef.current < RENEWAL_MIN_INTERVAL_MS) return;
      if (renewalInFlightRef.current) return;

      renewalInFlightRef.current = true;
      try {
        const ok = await renewSessionSilently();
        if (ok) lastRenewalRef.current = Date.now();
      } catch {
        /* réseau indisponible : on réessaiera au prochain cycle */
      } finally {
        renewalInFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void tryRenew();
    }, CHECK_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void tryRenew();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, markActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibility);
      if (activityTimer) window.clearTimeout(activityTimer);
      window.clearInterval(intervalId);
    };
  }, [enabled]);
}
