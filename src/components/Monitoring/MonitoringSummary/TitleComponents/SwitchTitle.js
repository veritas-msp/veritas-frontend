import React from "react";
import styles from "../MonitoringSummary.module.css";
import { FaEthernet } from "react-icons/fa";

export default function SwitchTitle() {
  return (
    <div id="switch-section" className={styles.switchTitleWrapper}>
      <div>
        <h2 className={styles.switchSubTitle}>
          <FaEthernet size="2.5rem" />
          VOS SWITCHS
        </h2>
        <p className={styles.switchSubTitleDescription}>
          Topologie et état de vos switchs par site
        </p>
      </div>
    </div>
  );
}

