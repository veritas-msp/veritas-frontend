import React from "react";
import styles from "../MonitoringSummary.module.css";
import { Icon as IconifyIcon } from "@iconify/react";

export default function ServerTitle() {
  return (
    <div id="serveurs-section" className={styles.serverTitleWrapper}>
      <div>
        <h2 className={styles.serverSubTitle}>
          <IconifyIcon 
            icon="mingcute:server-fill" 
            width="2.5rem" 
            height="2.5rem" 
          />
          VOS SERVEURS
        </h2>
        <p className={styles.serverSubTitleDescription}>
          Topologie et état de vos serveurs par site
        </p>
      </div>
    </div>
  );
}

