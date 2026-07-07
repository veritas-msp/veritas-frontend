import React from "react";
import styles from "../MonitoringSummary.module.css";
import Icon from "@mdi/react";
import { mdiWifiMarker } from "@mdi/js";

export default function WifiTitle() {
  return (
    <div id="wifi-section" className={styles.wifiTitleWrapper}>
      <div>
        <h2 className={styles.wifiSubTitle}>
          <Icon path={mdiWifiMarker} size="2.5rem" />
          VOS BORNES WIFI
        </h2>
        <p className={styles.wifiSubTitleDescription}>
          Topologie et état de vos bornes WiFi par site
        </p>
      </div>
    </div>
  );
}

