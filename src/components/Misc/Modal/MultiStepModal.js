import React from "react";
import { Icon } from "@iconify/react";
import ModalV2 from "./ModalV2";
import styles from "./MultiStepModal.module.css";

/**
 * Modal multi-étapes générique avec header, stepper et footer d'actions.
 *
 * API pensée pour être réutilisée sur l'ensemble de l'application :
 * - steps: [{ key, label, subtitle?, icon? }]
 * - currentStep: index courant (contrôlé par le parent)
 * - onPrevious / onPrimary: navigation & action principale
 */
export default function MultiStepModal({
  isOpen = true,
  onClose,
  steps = [],
  currentStep = 0,
  onPrevious,
  onPrimary,
  primaryLabel,
  primaryIcon = "mdi:check",
  secondaryLabel,
  onSecondary,
  saving = false,
  size = "large", // small | medium | large
  closeOnOverlayClick = true,
  showPrimaryLabel = false,
  children,
}) {
  const totalSteps = Math.max(steps.length, 1);
  const safeStepIndex = Math.min(Math.max(currentStep, 0), totalSteps - 1);
  const activeStep = steps[safeStepIndex] || {};
  const progress = ((safeStepIndex + 1) / totalSteps) * 100;

  const renderIcon = (icon) => {
    if (!icon) return null;
    if (typeof icon === "string") {
      return <Icon icon={icon} className={styles.headerIcon} />;
    }
    try {
      return React.createElement(icon, { className: styles.headerIcon });
    } catch {
      return null;
    }
  };

  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} closeOnOverlayClick={closeOnOverlayClick}>
      <div className={`${styles.modal} ${styles[size]} ${showPrimaryLabel ? styles.showLabel : ""}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {renderIcon(activeStep.icon)}
            <div className={styles.headerTitles}>
              <h3 className={styles.title}>
                {activeStep.label || activeStep.title || "Modal"}
              </h3>
              {activeStep.subtitle && (
                <p className={styles.subtitle}>{activeStep.subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            title="Fermer"
            aria-label="Fermer"
          >
            <Icon icon="mdi:close" />
          </button>
        </div>

        {/* Corps */}
        <div className={styles.body}>{children}</div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {secondaryLabel && onSecondary && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onSecondary}
                disabled={saving}
              >
                {secondaryLabel}
              </button>
            )}
          </div>
          <div className={styles.footerRight}>
            {onPrevious && (
              <button
                type="button"
                className={styles.ghostButton}
                onClick={onPrevious}
                disabled={saving || safeStepIndex === 0}
              >
                <Icon icon="mdi:arrow-left" className={styles.footerIcon} />
                Précédent
              </button>
            )}
            {onPrimary && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onPrimary}
                disabled={saving}
                title={primaryLabel}
              >
                {saving ? (
                  <Icon
                    icon="mdi:loading"
                    className={`${styles.footerIcon} ${styles.loading}`}
                  />
                ) : (
                  <Icon icon={primaryIcon} className={styles.footerIcon} />
                )}
                <span>{primaryLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalV2>
  );
}

