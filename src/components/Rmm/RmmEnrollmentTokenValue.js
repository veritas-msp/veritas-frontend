import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import SmartTooltip from "../SmartTooltip";
import styles from "./RmmEnrollmentTokenValue.module.css";
export default function RmmEnrollmentTokenValue({
  token,
  compact = false,
  full = false
}) {
  if (!token) {
    return null;
  }
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copied");
    } catch {
      toast.error("Unable to copy token");
    }
  };
  return <div className={`${styles.wrap} ${compact ? styles.wrapCompact : ""} ${full ? styles.wrapFull : ""}`}>
      <code className={`${styles.token} ${full ? styles.tokenFull : ""}`} title={full ? undefined : token}>
        {token}
      </code>
      <SmartTooltip content="Copy token" as="span">
        <button type="button" className={styles.copyBtn} onClick={handleCopy} aria-label="Copy enrollment token">
          <Icon icon="mdi:content-copy" aria-hidden />
        </button>
      </SmartTooltip>
    </div>;
}
