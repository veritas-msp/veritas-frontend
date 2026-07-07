import React from "react";
import styles from "../MonitoringSummary.module.css";
import Icon from "@mdi/react";
import { mdiWeb } from "@mdi/js";

export default function InternetTitle() {
  return (
    <div className={styles.internetTitleWrapper}>
      <div>
        <h2 className={styles.internetSubTitle}>
          <Icon path={mdiWeb} size="2.5rem" />
          VOS CONNEXIONS INTERNET
        </h2>
        <p className={styles.internetSubTitleDescription}>
          Vue d'ensemble de vos connexions Internet par site
        </p>
      </div>
    </div>
  );
}

