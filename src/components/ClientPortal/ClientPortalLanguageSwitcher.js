import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { APP_LOCALES } from "../../i18n/locales";
import { setUserLocaleOverride } from "../../hooks/useAppGeneralSettings";
import styles from "./ClientDashboard.module.css";

export default function ClientPortalLanguageSwitcher({ locale, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const current = APP_LOCALES.find((entry) => entry.code === locale) ?? APP_LOCALES[0];

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectLocale = (code) => {
    if (code !== locale) {
      setUserLocaleOverride(code);
    }
    setOpen(false);
  };

  return (
    <div className={styles.langSwitcher} ref={rootRef}>
      <button
        type="button"
        className={`${styles.langToggleBtn} ${open ? styles.langToggleBtnOpen : ""}`.trim()}
        onClick={() => setOpen((value) => !value)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.langFlag} aria-hidden>
          {current.flag}
        </span>
        <Icon icon="mdi:chevron-down" className={styles.langChevron} aria-hidden />
      </button>

      {open ? (
        <ul className={styles.langMenu} role="listbox" aria-label={ariaLabel}>
          {APP_LOCALES.map(({ code, flag, label }) => (
            <li key={code} role="option" aria-selected={locale === code}>
              <button
                type="button"
                className={`${styles.langMenuItem} ${locale === code ? styles.langMenuItemActive : ""}`.trim()}
                onClick={() => selectLocale(code)}
              >
                <span className={styles.langFlag} aria-hidden>
                  {flag}
                </span>
                <span className={styles.langMenuLabel}>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
