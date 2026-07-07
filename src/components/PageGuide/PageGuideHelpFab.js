import styles from "./PageGuideHelpFab.module.css";

export default function PageGuideHelpFab({ onClick, active = false, label = "Aide sur cette page" }) {
  return (
    <button
      type="button"
      className={`${styles.fab} ${active ? styles.fabActive : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      ?
    </button>
  );
}
