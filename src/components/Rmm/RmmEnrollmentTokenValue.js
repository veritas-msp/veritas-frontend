import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import SmartTooltip from "../SmartTooltip";
import styles from "./RmmEnrollmentTokenValue.module.css";

export default function RmmEnrollmentTokenValue({ token, compact = false, full = false }) {
  if (!token) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copié");
    } catch {
      toast.error("Impossible de copier le token");
    }
  };

  return (
    <div className={`${styles.wrap} ${compact ? styles.wrapCompact : ""} ${full ? styles.wrapFull : ""}`}>
      <code className={`${styles.token} ${full ? styles.tokenFull : ""}`} title={full ? undefined : token}>
        {token}
      </code>
      <SmartTooltip content="Copier le token" as="span">
        <button
          type="button"
          className={styles.copyBtn}
          onClick={handleCopy}
          aria-label="Copier le token d'enrôlement"
        >
          <Icon icon="mdi:content-copy" aria-hidden />
        </button>
      </SmartTooltip>
    </div>
  );
}
