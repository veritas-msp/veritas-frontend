import { Icon } from "@iconify/react";
import styles from "./ClientDashboard.module.css";

export function PortalDeviceCard({ item, icon, monitoredLabel }) {
  return (
    <div className={styles.deviceCard}>
      <div className={styles.deviceIconWrap}>
        <Icon icon={icon} className={styles.deviceIcon} />
        <span className={`${styles.statusDot} ${item.active ? styles.dotOk : styles.dotOff}`} />
      </div>
      <span className={styles.deviceName}>{item.name}</span>
      {item.monitored ? <span className={styles.monitoredTag}>{monitoredLabel}</span> : null}
    </div>
  );
}

export function PortalInfrastructureGroups({ groups, monitoredLabel }) {
  if (!groups?.length) return null;
  return groups.map((group) => (
    <div key={group.type} className={styles.deviceGroup}>
      <div className={styles.deviceGroupLabel}>{group.label}</div>
      <div className={styles.deviceGrid}>
        {group.items.map((item) => (
          <PortalDeviceCard
            key={item.id}
            item={item}
            icon={group.icon}
            monitoredLabel={monitoredLabel}
          />
        ))}
      </div>
    </div>
  ));
}

export function PortalCloudServicesGrid({ groups }) {
  if (!groups?.length) return null;
  return (
    <div className={styles.cloudGrid}>
      {groups.map((group) => (
        <div key={group.type} className={styles.cloudCard}>
          <div className={styles.cloudCardHeader}>
            <Icon icon={group.icon} className={styles.cloudIcon} />
            <span>{group.label}</span>
          </div>
          <ul className={styles.cloudList}>
            {group.items.map((item) => (
              <li key={item.id} className={styles.cloudItem}>
                <span className={`${styles.statusDot} ${item.active ? styles.dotOk : styles.dotOff}`} />
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
