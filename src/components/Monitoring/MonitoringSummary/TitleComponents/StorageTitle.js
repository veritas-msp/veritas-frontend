import React from "react";
import styles from "../MonitoringSummary.module.css";
import { IoServerSharp } from "react-icons/io5";

export default function StorageTitle() {
  return (
    <div id="stockage-section" className={styles.storageTitleWrapper}>
      <div>
        <h2 className={styles.storageSubTitle}>
          <IoServerSharp size="2.5rem" />
          VOS STOCKAGES
        </h2>
        <p className={styles.storageSubTitleDescription}>
          Topologie et capacité de vos stockages par site
        </p>
      </div>
    </div>
  );
}

