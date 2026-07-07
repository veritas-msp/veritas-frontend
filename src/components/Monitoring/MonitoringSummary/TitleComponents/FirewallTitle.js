import React from "react";
import styles from "../MonitoringSummary.module.css";
import Icon from "@mdi/react";
import { mdiWallFire } from "@mdi/js";

export default function FirewallTitle() {
  return (
    <>
      <div>
        <h2 className={styles.firewallSubTitle}>
          <Icon path={mdiWallFire} size="2.5rem" />
          VOS FIREWALLS
        </h2>
        <p className={styles.firewallSubTitleDescription}>
          État de santé et statistiques de vos pare-feu
        </p>
      </div>
    </>
  );
}


