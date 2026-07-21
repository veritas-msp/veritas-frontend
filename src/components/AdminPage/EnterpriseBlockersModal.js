import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { getLinkedElementsSummary, getModalBlockerRows } from "./clientLinkedElementsUi";
import { isClientDeletable } from "./clientDeletionUi";
import { useAdminClientsCopy } from "../../hooks/useAdminCopy";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./EnterpriseBlockersModal.module.css";
export default function EnterpriseBlockersModal({
  open,
  client,
  onClose
}) {
  const locale = useAppLocale();
  const copy = useAdminClientsCopy();
  const common = useCommonCopy();
  if (!open || !client) return null;
  const rows = getModalBlockerRows(client, locale);
  const {
    total
  } = getLinkedElementsSummary(client);
  const deletable = isClientDeletable(client);
  const modalCopy = copy.blockersModal;
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="enterprise-blockers-title">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:link-variant" />
            </div>
            <div>
              <h2 className={styles.title} id="enterprise-blockers-title">
                {modalCopy.title}
              </h2>
              <p className={styles.subtitle}>
                {deletable ? modalCopy.subtitleDeletable : modalCopy.subtitleBlocked}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={modalCopy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.totalRow}>
            <span className={styles.totalBadge}>{total}</span>
            <span className={styles.totalLabel}>
              {total > 1 ? modalCopy.totalPlural : modalCopy.totalSingular}
            </span>
          </div>
          {!deletable && <p className={styles.intro}>{modalCopy.intro}</p>}
          <ul className={styles.blockerList}>
            {rows.map(row => <li key={row.key} className={styles.blockerItem}>
                <span className={styles.blockerLabel}>{row.label}</span>
                <span className={styles.blockerCount}>{row.value}</span>
              </li>)}
          </ul>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.primaryBtn} onClick={onClose}>
            {common.close}
          </button>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
