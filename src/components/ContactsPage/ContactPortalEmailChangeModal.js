import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import styles from "./ContactPortalEmailChangeModal.module.css";

function ContactPortalEmailChangeDialog({
  previousEmail = "",
  nextEmail = "",
  saving = false,
  onClose,
  onConfirm,
}) {
  return (
    <div
      className={styles.shell}
      onClick={(e) => e.stopPropagation()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="contact-portal-email-change-title"
      aria-describedby="contact-portal-email-change-desc"
    >
      <div className={styles.accentBar} aria-hidden />
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.iconWrap} aria-hidden>
            <Icon icon="mdi:email-sync-outline" />
          </div>
          <div>
            <h2 className={styles.title} id="contact-portal-email-change-title">
              Modifier l&apos;e-mail portail
            </h2>
            <p className={styles.subtitle} id="contact-portal-email-change-desc">
              Ce contact possède un compte portail client. La connexion utilisera l&apos;e-mail
              favori après enregistrement.
            </p>
          </div>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          disabled={saving}
          aria-label="Fermer"
        >
          <FaTimes />
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            Vérifiez le changement d&apos;e-mail de connexion avant de confirmer l&apos;enregistrement
            de la fiche contact.
          </p>
          <div className={styles.emailChange}>
            <div className={styles.emailRow}>
              <span className={styles.emailLabel}>Ancien e-mail</span>
              <span className={`${styles.emailValue} ${styles.emailValueOld}`}>
                <Icon icon="mdi:email-outline" aria-hidden />
                {previousEmail || "-"}
              </span>
            </div>
            <Icon icon="mdi:arrow-down" className={styles.emailArrow} aria-hidden />
            <div className={styles.emailRow}>
              <span className={styles.emailLabel}>Nouvel e-mail favori</span>
              <span className={`${styles.emailValue} ${styles.emailValueNew}`}>
                <Icon icon="mdi:star" aria-hidden />
                {nextEmail || "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
          Annuler
        </button>
        <button type="button" className={styles.primaryBtn} onClick={onConfirm} disabled={saving}>
          {saving ? (
            <>
              <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
              Enregistrement…
            </>
          ) : (
            <>
              <Icon icon="mdi:content-save-outline" aria-hidden />
              Confirmer et enregistrer
            </>
          )}
        </button>
      </footer>
    </div>
  );
}

export default function ContactPortalEmailChangeModal({
  open,
  embedded = false,
  previousEmail = "",
  nextEmail = "",
  saving = false,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  if (!open) return null;

  const dialog = (
    <ContactPortalEmailChangeDialog
      previousEmail={previousEmail}
      nextEmail={nextEmail}
      saving={saving}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );

  if (embedded) {
    return (
      <div
        className={styles.embeddedOverlay}
        onClick={saving ? undefined : onClose}
        role="presentation"
      >
        {dialog}
      </div>
    );
  }

  return createPortal(
    <div className={styles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      {dialog}
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
