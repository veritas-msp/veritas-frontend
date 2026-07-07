import { Icon } from "@iconify/react";
import styles from "./MspEmptyState.module.css";

export default function MspEmptyState({ icon, title, text, className = "" }) {
  return (
    <div className={`${styles.emptyState} ${className}`.trim()}>
      {icon ? <Icon icon={icon} className={styles.emptyIcon} aria-hidden /> : null}
      {title ? <p className={styles.emptyTitle}>{title}</p> : null}
      {text ? <p className={styles.emptyText}>{text}</p> : null}
    </div>
  );
}
