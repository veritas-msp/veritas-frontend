import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import RmmAgentStatusBadge from "./RmmAgentStatusBadge";
import { formatEquipmentDetailRelative, getEquipmentDetailCopy, interpolate } from "./equipmentDetailPageI18n";
import { formatDiskUsage, formatRmmDateTime, formatStorageGB, formatTemperatureC, buildRmmAgentRowFromEquipment, getPerformanceSummary, getRmmAgentVersion, getRmmChassisInfo, getRmmInventoryFromEquipment, getRmmNetbiosName, getSecuritySummary, getSensorSummary, getUpdatesDetail, isRmmManagedEquipment, formatPendingKb, formatRmmExpectedCollectionLabel, getRmmOsEditionInfo, repairRmmTextEncoding, resolveRmmUptimeLabel } from "./rmmMonitoringUtils";
import RmmInstantMetrics from "./RmmInstantMetrics";
import metricStyles from "./RmmMetricHistoryPanel.module.css";
import styles from "./RmmMonitoringPanel.module.css";
function ToneBadge({
  label,
  tone = "neutral"
}) {
  if (!label) return null;
  return <span className={`${styles.toneBadge} ${styles[`toneBadge_${tone}`]}`}>{label}</span>;
}
function WindowsUpdatesSection({
  updatesDetail,
  lastFullInventoryAt,
  os,
  syncPending = false,
  expectedCollectionLabel = null
}) {
  return <>
      <div className={styles.updateSummary}>
        <ToneBadge label={updatesDetail.label} tone={updatesDetail.tone} />
        {updatesDetail.latestInstalledHotfix?.kb ? <ToneBadge label={`Latest installed KB: ${updatesDetail.latestInstalledHotfix.kb}`} tone="neutral" /> : null}
        {updatesDetail.rebootRequired ? <ToneBadge label="Restart required" tone="bad" /> : null}
        {updatesDetail.driverCount > 0 ? <ToneBadge label={`${updatesDetail.driverCount} pending driver(s)`} tone="warn" /> : null}
      </div>

      {!updatesDetail.hasPendingScan ? syncPending ? <p className={styles.updateNote}>
            Full sync requested · WUA analysis{" "}
            {expectedCollectionLabel || "at the next agent check-in"}.
          </p> : <p className={styles.updateNote}>
            Uninstalled updates are detected during a full agent sync
            (Windows Update Agent).
            {lastFullInventoryAt ? ` Last full sync: ${formatRmmDateTime(lastFullInventoryAt)}.` : " No full sync recorded for this device."}
          </p> : lastFullInventoryAt ? <p className={styles.updateNote}>
          WUA check on {formatRmmDateTime(lastFullInventoryAt)} · OS build{" "}
          {os.patchLabel || os.build || "-"}
        </p> : null}

      <div className={styles.updateCompareGrid}>
        <div className={styles.updateColumn}>
          <h4 className={styles.updateColumnTitle}>Installed (latest updates)</h4>
          {updatesDetail.recentHotfixes.length > 0 ? <table className={styles.diskTable}>
              <thead>
                <tr>
                  <th>KB</th>
                  <th>Date</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {updatesDetail.recentHotfixes.map(hotfix => <tr key={`${hotfix.id}-${hotfix.installedOnLabel || "na"}`}>
                    <td className={styles.mono}>{hotfix.kb || hotfix.id}</td>
                    <td>{hotfix.installedOnLabel || "-"}</td>
                    <td>{hotfix.description || "-"}</td>
                  </tr>)}
              </tbody>
            </table> : <p className={styles.updateEmpty}>No updates reported by the agent.</p>}
        </div>

        <div className={styles.updateColumn}>
          <h4 className={styles.updateColumnTitle}>Not installed (pending)</h4>
          {!updatesDetail.hasPendingScan ? <p className={styles.updateEmpty}>
              Run a full sync from RMM administration to compare missing KBs.
            </p> : updatesDetail.pendingItems.length > 0 ? <table className={styles.diskTable}>
              <thead>
                <tr>
                  <th>KB</th>
                  <th>Update</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {updatesDetail.pendingItems.slice(0, 20).map(item => <tr key={item.title || item.kb}>
                    <td className={styles.mono}>{formatPendingKb(item.kb) || "-"}</td>
                    <td>
                      {item.title || "-"}
                      {item.rebootRequired ? " (reboot)" : ""}
                    </td>
                    <td>{item.sizeMB != null ? `${item.sizeMB} Mo` : "-"}</td>
                  </tr>)}
              </tbody>
            </table> : <p className={styles.updateEmpty}>
              No pending software updates according to Windows Update Agent.
            </p>}

          {updatesDetail.driverItems.length > 0 ? <>
              <h4 className={styles.updateColumnTitle}>Pending drivers</h4>
              <ul className={styles.updateList}>
                {updatesDetail.driverItems.slice(0, 8).map(item => <li key={item.title || item.kb}>
                    {item.title || "-"}
                    {formatPendingKb(item.kb) ? ` (${formatPendingKb(item.kb)})` : ""}
                  </li>)}
              </ul>
            </> : null}
        </div>
      </div>
    </>;
}
function Field({
  label,
  value,
  mono = false
}) {
  if (value == null || value === "") return null;
  return <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={`${styles.fieldValue} ${mono ? styles.mono : ""}`}>{value}</span>
    </div>;
}
function DetailSection({
  title,
  children
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return <article className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </header>
      <div className={styles.sectionBody}>{items}</div>
    </article>;
}
function FullSection({
  title,
  children
}) {
  if (!children) return null;
  return <section className={styles.fullSection}>
      <header className={styles.fullSectionHeader}>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </header>
      <div className={styles.fullSectionBody}>{children}</div>
    </section>;
}
function DetailGroup({
  title,
  children,
  columns = 3
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return <div className={styles.detailGroup}>
      <h3 className={styles.detailGroupTitle}>{title}</h3>
      <div className={styles.detailGroupGrid} style={{
      "--detail-group-cols": columns
    }}>
        {items}
      </div>
    </div>;
}
function FullSectionGroup({
  title,
  children
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return <div className={styles.fullSectionGroup}>
      <h3 className={styles.detailGroupTitle}>{title}</h3>
      <div className={styles.fullSectionStack}>{items}</div>
    </div>;
}
function truncateMonoId(value, start = 8, end = 8) {
  const text = value == null ? "" : String(value);
  if (text.length <= start + end + 3) return text;
  return `${text.slice(0, start)}…${text.slice(-end)}`;
}
function formatGpuSummary(gpus) {
  if (!Array.isArray(gpus) || !gpus.length) return null;
  const labels = gpus.map(gpu => {
    const name = String(gpu?.name || "").trim();
    if (!name) return null;
    const ramMB = Number(gpu?.ramMB);
    return Number.isFinite(ramMB) && ramMB > 0 ? `${name} (${ramMB} Mo VRAM)` : name;
  }).filter(Boolean);
  return labels.length ? labels.join(", ") : null;
}
function RmmStorageSections({
  disks = [],
  physicalDisks = [],
  gpus = [],
  adapters = [],
  mappedDrives = [],
  localShares = []
}) {
  const hasAny = disks.length > 0 || physicalDisks.length > 0 || gpus.length > 0 || adapters.length > 1 || mappedDrives.length > 0 || localShares.length > 0;
  if (!hasAny) {
    return <div className={styles.emptyState}>
        <p className={styles.manualNote}>
          No volume, disk, or storage device reported. Run a full agent sync to
          populate this tab.
        </p>
      </div>;
  }
  return <FullSectionGroup title="Storage">
      {disks.length > 0 ? <FullSection title="Volumes">
          <table className={styles.diskTable}>
            <thead>
              <tr>
                <th>Disk</th>
                <th>Capacity</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              {disks.map(disk => {
            const usage = formatDiskUsage(disk.freeGB, disk.sizeGB);
            return <tr key={disk.device || disk.sizeGB}>
                    <td className={styles.mono}>{disk.device || "-"}</td>
                    <td>
                      {disk.sizeGB != null ? `${formatStorageGB(disk.sizeGB)} Go` : "-"}
                      {disk.freeGB != null ? ` (${formatStorageGB(disk.freeGB)} GB free)` : ""}
                    </td>
                    <td>
                      {usage ? <>
                          {usage.used} / {usage.total} Go ({usage.pct}%)
                          <div className={styles.usageBar}>
                            <div className={styles.usageFill} style={{
                      width: `${Math.min(100, usage.pct)}%`
                    }} />
                          </div>
                        </> : "-"}
                    </td>
                  </tr>;
          })}
            </tbody>
          </table>
        </FullSection> : null}

      {physicalDisks.length > 0 ? <FullSection title="Physical disks">
          <table className={styles.diskTable}>
            <thead>
              <tr>
                <th>Model</th>
                <th>Interface</th>
                <th>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {physicalDisks.map(disk => <tr key={`${disk.model}-${disk.sizeGB}`}>
                  <td>{disk.model || "-"}</td>
                  <td>{disk.interface || "-"}</td>
                  <td>{disk.sizeGB != null ? `${formatStorageGB(disk.sizeGB)} Go` : "-"}</td>
                </tr>)}
            </tbody>
          </table>
        </FullSection> : null}

      {gpus.length > 0 ? <FullSection title="Graphics cards">
          <table className={styles.diskTable}>
            <thead>
              <tr>
                <th>GPU</th>
                <th>Driver</th>
                <th>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {gpus.map(gpu => <tr key={`${gpu.name}-${gpu.driver}`}>
                  <td>{gpu.name}</td>
                  <td className={styles.mono}>{gpu.driver || "-"}</td>
                  <td>{gpu.resolution || "-"}</td>
                </tr>)}
            </tbody>
          </table>
        </FullSection> : null}

      {adapters.length > 1 ? <FullSection title="Network adapters">
          <table className={styles.diskTable}>
            <thead>
              <tr>
                <th>Interface</th>
                <th>IP</th>
                <th>MAC</th>
              </tr>
            </thead>
            <tbody>
              {adapters.map(adapter => <tr key={`${adapter.description}-${adapter.mac}`}>
                  <td>{adapter.description || "-"}</td>
                  <td className={styles.mono}>{adapter.ip || "-"}</td>
                  <td className={styles.mono}>{adapter.mac || "-"}</td>
                </tr>)}
            </tbody>
          </table>
        </FullSection> : null}

      {mappedDrives.length > 0 ? <FullSection title="Mapped network drives">
          <table className={styles.diskTable}>
            <thead>
              <tr>
                <th>Drive</th>
                <th>Path</th>
                <th>Free space</th>
              </tr>
            </thead>
            <tbody>
              {mappedDrives.map(drive => <tr key={`${drive.drive}-${drive.remotePath}`}>
                  <td className={styles.mono}>{drive.drive || "-"}</td>
                  <td className={styles.mono}>{drive.remotePath || drive.provider || "-"}</td>
                  <td>
                    {drive.sizeGB != null ? `${formatStorageGB(drive.freeGB) ?? "?"} / ${formatStorageGB(drive.sizeGB)} Go` : "-"}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </FullSection> : null}

      {localShares.length > 0 ? <FullSection title="Local shares">
          <table className={styles.diskTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              {localShares.map(share => <tr key={share.name || share.path}>
                  <td>{share.name || "-"}</td>
                  <td className={styles.mono}>{share.path || "-"}</td>
                </tr>)}
            </tbody>
          </table>
        </FullSection> : null}
    </FullSectionGroup>;
}
function RmmOperationsSections({
  updatesDetail,
  lastFullInventoryAt,
  os,
  syncPending,
  expectedCollectionLabel,
  services = {},
  serviceItems = [],
  security = {}
}) {
  const hasServices = serviceItems.length > 0;
  const hasBitLocker = security.bitLocker?.length > 0;
  return <>
      <FullSection title="Windows updates">
        <WindowsUpdatesSection updatesDetail={updatesDetail} lastFullInventoryAt={lastFullInventoryAt} os={os} syncPending={syncPending} expectedCollectionLabel={expectedCollectionLabel} />
      </FullSection>

      {hasServices || hasBitLocker ? <FullSectionGroup title="Services & encryption">
          {hasServices ? <FullSection title="Critical services">
              {services.stoppedCount > 0 ? <div className={styles.updateSummary}>
                  <ToneBadge label={`${services.stoppedCount} stopped service(s)`} tone="bad" />
                </div> : null}
              <table className={styles.diskTable}>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Startup</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceItems.map(svc => <tr key={svc.name}>
                      <td>
                        <RmmText value={svc.display || svc.name} />
                        <span className={styles.mono}> ({svc.name})</span>
                      </td>
                      <td>{svc.status === "Running" ? "Running" : svc.status || "-"}</td>
                      <td>{svc.startType || "-"}</td>
                    </tr>)}
                </tbody>
              </table>
            </FullSection> : null}

          {hasBitLocker ? <FullSection title="BitLocker">
              <table className={styles.diskTable}>
                <thead>
                  <tr>
                    <th>Volume</th>
                    <th>Protection</th>
                    <th>Encryption</th>
                  </tr>
                </thead>
                <tbody>
                  {security.bitLocker.map(vol => <tr key={vol.mountPoint}>
                      <td className={styles.mono}>{vol.mountPoint}</td>
                      <td>{vol.protection}</td>
                      <td>{vol.encryption}</td>
                    </tr>)}
                </tbody>
              </table>
            </FullSection> : <FullSection title="BitLocker">
              <p className={styles.manualNote}>
                No BitLocker volume reported by the agent for this device.
              </p>
            </FullSection>}
        </FullSectionGroup> : <FullSection title="BitLocker">
          <p className={styles.manualNote}>
            No BitLocker volume reported by the agent for this device.
          </p>
        </FullSection>}
    </>;
}
function RmmText({
  value,
  fallback = "-"
}) {
  if (value == null || value === "") return fallback;
  return repairRmmTextEncoding(String(value));
}
function RmmInventorySections({
  inventory
}) {
  const softwareItems = Array.isArray(inventory.software?.items) ? inventory.software.items : [];
  const printers = inventory.printers || {};
  const peripherals = inventory.peripherals || {};
  const printerItems = Array.isArray(printers.items) ? printers.items : [];
  const monitors = Array.isArray(peripherals.monitors) ? peripherals.monitors : [];
  const usbDevices = Array.isArray(peripherals.usbDevices) ? peripherals.usbDevices : [];
  const softwareTotal = inventory.software?.count ?? softwareItems.length;
  const [softwareSearch, setSoftwareSearch] = useState("");
  const filteredSoftware = useMemo(() => {
    const query = softwareSearch.trim().toLowerCase();
    if (!query) return softwareItems.slice(0, 80);
    return softwareItems.filter(item => {
      const haystack = [item?.name, item?.publisher, item?.version].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    }).slice(0, 80);
  }, [softwareItems, softwareSearch]);
  const hasAny = printerItems.length > 0 || monitors.length > 0 || usbDevices.length > 0 || softwareItems.length > 0;
  if (!hasAny) {
    return <div className={styles.emptyState}>
        <p className={styles.manualNote}>
          No printer, display, or software reported yet. Run a full agent sync to
          populate this tab.
        </p>
      </div>;
  }
  return <>
      {printerItems.length > 0 ? <FullSection title="Printers">
          {printers.default ? <p className={styles.manualNote}>
              Default: <RmmText value={printers.default} />
            </p> : null}
          <table className={styles.diskTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Driver</th>
                <th>Port</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {printerItems.map(printer => <tr key={`${printer.name}-${printer.port}`}>
                  <td>
                    <RmmText value={printer.name} />
                    {printer.isDefault ? " (default)" : ""}
                  </td>
                  <td><RmmText value={printer.driver} /></td>
                  <td className={styles.mono}>{printer.port || "-"}</td>
                  <td>{printer.offline ? "Offline" : "Online"}</td>
                </tr>)}
            </tbody>
          </table>
        </FullSection> : null}

      {monitors.length > 0 || usbDevices.length > 0 ? <FullSection title="Displays & devices">
          {monitors.length > 0 ? <>
              <h4 className={styles.sectionTitle}>Displays</h4>
              <table className={styles.diskTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Manufacturer</th>
                  </tr>
                </thead>
                <tbody>
                  {monitors.map((monitor, index) => <tr key={`${monitor.name}-${index}`}>
                      <td><RmmText value={monitor.name} /></td>
                      <td><RmmText value={monitor.manufacturer} /></td>
                    </tr>)}
                </tbody>
              </table>
            </> : null}
          {usbDevices.length > 0 ? <>
              <h4 className={styles.sectionTitle}>USB devices</h4>
              <table className={styles.diskTable}>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Class</th>
                  </tr>
                </thead>
                <tbody>
                  {usbDevices.map((device, index) => <tr key={`${device.name}-${index}`}>
                      <td><RmmText value={device.name} /></td>
                      <td><RmmText value={device.class} /></td>
                    </tr>)}
                </tbody>
              </table>
            </> : null}
        </FullSection> : null}

      {softwareItems.length > 0 ? <FullSection title="Installed software">
          <div className={styles.softwareToolbar}>
            <input type="search" className={styles.softwareSearch} placeholder="Search software…" value={softwareSearch} onChange={e => setSoftwareSearch(e.target.value)} />
            <span className={styles.softwareCount}>
              {softwareTotal} detected
              {softwareTotal > softwareItems.length ? ` (${softwareItems.length} reported)` : ""}
            </span>
          </div>
          <table className={styles.diskTable}>
            <thead>
              <tr>
                <th>Software</th>
                <th>Publisher</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {filteredSoftware.map(item => <tr key={`${item.name}-${item.version || ""}`}>
                  <td><RmmText value={item.name} /></td>
                  <td><RmmText value={item.publisher} /></td>
                  <td className={styles.mono}>{item.version || "-"}</td>
                </tr>)}
            </tbody>
          </table>
        </FullSection> : null}
    </>;
}
export function hasRmmInventoryExtras(equipment) {
  const inventory = getRmmInventoryFromEquipment(equipment);
  const printerItems = Array.isArray(inventory.printers?.items) ? inventory.printers.items : [];
  const monitors = Array.isArray(inventory.peripherals?.monitors) ? inventory.peripherals.monitors : [];
  const usbDevices = Array.isArray(inventory.peripherals?.usbDevices) ? inventory.peripherals.usbDevices : [];
  const softwareItems = Array.isArray(inventory.software?.items) ? inventory.software.items : [];
  return printerItems.length > 0 || monitors.length > 0 || usbDevices.length > 0 || softwareItems.length > 0;
}
export function RmmSyncPendingNotice({
  equipment = null,
  syncRequestedAt = null,
  heartbeatIntervalMinutes,
  onCancel = null,
  cancelling = false,
  variant = "banner"
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const syncCopy = copy.rmm.syncPending;
  const [expectedCollectionLabel, setExpectedCollectionLabel] = useState(() => equipment ? formatRmmExpectedCollectionLabel(equipment, heartbeatIntervalMinutes, {
    withAbsolute: false
  }) : null);
  useEffect(() => {
    if (!equipment) {
      setExpectedCollectionLabel(null);
      return undefined;
    }
    const refresh = () => setExpectedCollectionLabel(formatRmmExpectedCollectionLabel(equipment, heartbeatIntervalMinutes, {
      withAbsolute: false
    }));
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [equipment, heartbeatIntervalMinutes]);
  const whenLabel = syncRequestedAt ? formatEquipmentDetailRelative(syncRequestedAt, locale) : null;
  const collectionHint = expectedCollectionLabel ? interpolate(copy.rmm.nextCollection, {
    when: expectedCollectionLabel
  }) : null;
  const detailTitle = [equipment ? `${formatRmmExpectedCollectionLabel(equipment, heartbeatIntervalMinutes)}` : null, syncRequestedAt ? `${formatRmmDateTime(syncRequestedAt)}` : null].filter(Boolean).join("\n");
  if (variant === "chip") {
    return <span className={styles.syncPendingChip} title={[detailTitle, whenLabel ? interpolate(syncCopy.requested, {
      when: whenLabel
    }) : null].filter(Boolean).join("\n") || syncCopy.nextAgentPass}>
        <Icon icon="mdi:sync" className={`${styles.syncPendingChipIcon} ${styles.syncPendingSpin}`} aria-hidden />
        {syncCopy.title}
      </span>;
  }
  return <div className={styles.syncPendingBanner} role="status">
      <Icon icon="mdi:sync" className={`${styles.syncPendingBannerIcon} ${styles.syncPendingSpin}`} aria-hidden />
      <div className={styles.syncPendingBannerCopy}>
        <p className={styles.syncPendingBannerTitle}>{syncCopy.bannerTitle}</p>
        <p className={styles.syncPendingBannerText}>
          {collectionHint ? <>
              {collectionHint}
              {whenLabel ? ` · ${interpolate(syncCopy.requested, {
            when: whenLabel
          })}` : null}
            </> : <>
              {syncCopy.bannerDetail}
              {whenLabel ? ` · ${interpolate(syncCopy.requested, {
            when: whenLabel
          })}` : null}
            </>}
        </p>
      </div>
      {onCancel ? <button type="button" className={styles.syncPendingCancelBtn} onClick={onCancel} disabled={cancelling}>
          <Icon icon="mdi:close-circle-outline" aria-hidden />
          {syncCopy.cancel}
        </button> : null}
    </div>;
}
function PanelHeader({
  equipment,
  lastInventoryAt,
  lastFullInventoryAt,
  agentVersion,
  managed = true,
  syncPending = false,
  syncRequestedAt = null,
  title,
  titleIcon = "mdi:remote-desktop",
  copy,
  locale,
  agentStatusInHero = false
}) {
  const [nextCollectionLabel, setNextCollectionLabel] = useState(() => managed && equipment ? formatRmmExpectedCollectionLabel(equipment, undefined, {
    withAbsolute: false
  }) : null);
  useEffect(() => {
    if (!managed || !equipment) {
      setNextCollectionLabel(null);
      return undefined;
    }
    const refresh = () => setNextCollectionLabel(formatRmmExpectedCollectionLabel(equipment, undefined, {
      withAbsolute: false
    }));
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [equipment, managed, lastInventoryAt]);
  const subtitleTitle = !managed ? null : [lastInventoryAt ? interpolate(copy.rmm.heartbeatTooltip, {
    when: formatRmmDateTime(lastInventoryAt)
  }) : null, lastFullInventoryAt ? interpolate(copy.rmm.fullSyncTooltip, {
    when: formatRmmDateTime(lastFullInventoryAt)
  }) : null, equipment ? interpolate(copy.rmm.nextCollectionTooltip, {
    when: formatRmmExpectedCollectionLabel(equipment)
  }) : null].filter(Boolean).join("\n");
  let subtitle = !managed ? copy.rmm.manualManaged : (() => {
    const parts = [];
    if (lastInventoryAt) {
      parts.push(interpolate(copy.rmm.heartbeat, {
        when: formatEquipmentDetailRelative(lastInventoryAt, locale)
      }));
    }
    if (lastFullInventoryAt) {
      parts.push(interpolate(copy.rmm.fullSync, {
        when: formatEquipmentDetailRelative(lastFullInventoryAt, locale)
      }));
    }
    if (nextCollectionLabel) {
      parts.push(interpolate(copy.rmm.nextCollection, {
        when: nextCollectionLabel
      }));
    }
    return parts.length ? parts.join(" · ") : copy.rmm.waitingFirstInventory;
  })();
  const panelTitle = title || copy.rmm.title;
  return <header className={styles.panelHeader}>
      <div className={styles.titleBlock}>
        <h2 className={styles.title}>
          <Icon icon={titleIcon} className={styles.titleIcon} aria-hidden />
          {panelTitle}
        </h2>
        <SmartTooltip content={subtitleTitle || subtitle}>
          <p className={styles.subtitle}>{subtitle}</p>
        </SmartTooltip>
      </div>
      {!agentStatusInHero ? <div className={styles.headerMeta}>
          {managed && agentVersion ? <span className={styles.agentVersionChip} title={copy.agent.versionTitle}>
              <Icon icon="mdi:tag-outline" className={styles.agentVersionIcon} aria-hidden />
              {interpolate(copy.agent.chip, {
          version: agentVersion
        })}
            </span> : null}
          <RmmAgentStatusBadge equipment={equipment} />
        </div> : null}
    </header>;
}
export default function RmmMonitoringPanel({
  equipment,
  syncPending: syncPendingProp,
  syncRequestedAt: syncRequestedAtProp,
  variant = "general",
  agentStatusInHero = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const rmmFields = copy.rmm.fields;
  const inventory = useMemo(() => getRmmInventoryFromEquipment(equipment), [equipment]);
  const managed = isRmmManagedEquipment(equipment);
  const updatesDetail = useMemo(() => getUpdatesDetail(inventory), [inventory]);
  const osEdition = useMemo(() => getRmmOsEditionInfo(inventory, equipment), [inventory, equipment]);
  const perf = useMemo(() => getPerformanceSummary(inventory), [inventory]);
  const sensor = useMemo(() => getSensorSummary(inventory), [inventory]);
  const security = useMemo(() => getSecuritySummary(inventory), [inventory]);
  const os = inventory.os || {};
  const domain = inventory.domain || {};
  const network = inventory.network || {};
  const hardware = inventory.hardware || {};
  const chassis = getRmmChassisInfo(inventory);
  const disks = Array.isArray(hardware.disks) ? hardware.disks : [];
  const physicalDisks = Array.isArray(hardware.physicalDisks) ? hardware.physicalDisks : [];
  const gpus = Array.isArray(hardware.gpus) ? hardware.gpus : [];
  const adapters = Array.isArray(network.adapters) ? network.adapters : [];
  const shares = inventory.shares || {};
  const services = inventory.services || {};
  const mappedDrives = Array.isArray(shares.mappedDrives) ? shares.mappedDrives : [];
  const localShares = Array.isArray(shares.localShares) ? shares.localShares : [];
  const serviceItems = Array.isArray(services.items) ? services.items : [];
  const lastInventoryAt = inventory.lastInventoryAt || inventory.collectedAt || null;
  const lastFullInventoryAt = inventory.lastFullInventoryAt || null;
  const syncPending = syncPendingProp === true;
  const syncRequestedAt = syncPending ? syncRequestedAtProp ?? null : null;
  const expectedCollectionLabel = useMemo(() => syncPending ? formatRmmExpectedCollectionLabel(equipment, undefined, {
    withAbsolute: false
  }) : null, [equipment, syncPending, lastInventoryAt]);
  const agentVersion = getRmmAgentVersion(equipment);
  const metricAgent = useMemo(() => buildRmmAgentRowFromEquipment(equipment), [equipment]);
  const ip = equipment?.ip || network.ip || inventory.ip || null;
  const mac = equipment?.mac || network.mac || inventory.mac || null;
  const domainLabel = equipment?.domaine || inventory.domaine || (domain.joined ? domain.name : domain.workgroup || domain.name) || null;
  const domainDetail = domain.joined != null ? `${domainLabel || "-"}${domain.joined ? " (joint)" : " (workgroup)"}` : domainLabel;
  const uptimeLabel = useMemo(() => resolveRmmUptimeLabel(inventory), [inventory]);
  const hasHardwareSection = hardware.cpu || inventory.processeur || hardware.cores != null || chassis.manufacturer || chassis.model || chassis.serial || disks.length > 0 || gpus.length > 0;
  const panelHeader = <PanelHeader equipment={equipment} lastInventoryAt={lastInventoryAt} lastFullInventoryAt={lastFullInventoryAt} agentVersion={agentVersion} managed={managed} syncPending={syncPending} syncRequestedAt={syncRequestedAt} title={variant === "operations" ? copy.tabs.system : variant === "peripherals" ? copy.tabs.peripherals : copy.rmm.title} titleIcon={variant === "operations" ? "mdi:wrench-cog-outline" : variant === "peripherals" ? "mdi:devices" : "mdi:remote-desktop"} copy={copy} locale={locale} agentStatusInHero={agentStatusInHero} />;
  if (variant === "peripherals") {
    if (!managed) {
      return <div className={styles.emptyState}>
          <p className={styles.manualNote}>{copy.rmm.installAgentPeripherals}</p>
        </div>;
    }
    return <section className={styles.panel}>
        {panelHeader}
        <div className={styles.panelBody}>
          <RmmStorageSections disks={disks} physicalDisks={physicalDisks} gpus={gpus} adapters={adapters} mappedDrives={mappedDrives} localShares={localShares} />
          <RmmInventorySections inventory={inventory} />
        </div>
      </section>;
  }
  if (variant === "operations") {
    if (!managed) {
      return <div className={styles.emptyState}>
          <p className={styles.manualNote}>{copy.rmm.installAgentOperations}</p>
        </div>;
    }
    return <section className={styles.panel}>
        {panelHeader}
        <div className={styles.panelBody}>
          <RmmOperationsSections updatesDetail={updatesDetail} lastFullInventoryAt={lastFullInventoryAt} os={os} syncPending={syncPending} expectedCollectionLabel={expectedCollectionLabel} services={services} serviceItems={serviceItems} security={security} />
        </div>
      </section>;
  }
  if (!managed) {
    return <section className={styles.panel}>
        <PanelHeader equipment={equipment} lastInventoryAt={null} managed={false} copy={copy} locale={locale} />
        <div className={styles.emptyState}>
          <p className={styles.manualNote}>{copy.rmm.installAgentGeneral}</p>
        </div>
      </section>;
  }
  return <section className={styles.panel}>
      {panelHeader}

      <div className={styles.panelBody}>
        <div className={metricStyles.dashboard}>
          <RmmInstantMetrics agent={metricAgent} />
        </div>

        <DetailGroup title={rmmFields.workstation} columns={2}>
          <DetailSection title={rmmFields.agentIdentity}>
            <Field label={rmmFields.netbios} value={getRmmNetbiosName(equipment)} mono />
            <Field label={rmmFields.session} value={inventory.loggedUser || inventory.session?.user || null} />
            <Field label={rmmFields.uptime} value={uptimeLabel} />
            {perf.processCount != null ? <Field label={rmmFields.activeProcesses} value={String(perf.processCount)} /> : null}
            {inventory.machineId ? <div className={styles.field}>
                <span className={styles.fieldLabel}>Machine ID</span>
                <SmartTooltip content={inventory.machineId}>
                  <span className={`${styles.fieldValue} ${styles.mono}`}>
                    {truncateMonoId(inventory.machineId)}
                  </span>
                </SmartTooltip>
              </div> : null}
            <Field label={rmmFields.domain} value={domainDetail} />
          </DetailSection>

          <DetailSection title={rmmFields.windows}>
            <Field label={rmmFields.edition} value={osEdition.edition} />
            <Field label={rmmFields.version} value={osEdition.displayVersion} />
            <Field label={rmmFields.build} value={osEdition.build} mono />
            {!osEdition.edition && !osEdition.displayVersion ? <Field label={rmmFields.system} value={osEdition.osCaption} /> : null}
            <Field label={rmmFields.kernelVersion} value={os.version} mono />
            <Field label={rmmFields.license} value={osEdition.licenseLabel || (osEdition.licenseName ? `${osEdition.licenseName}` : null)} />
            <Field label={rmmFields.lastBoot} value={os.lastBoot ? formatRmmDateTime(os.lastBoot) : null} />
            <Field label={rmmFields.osInstall} value={os.installDate ? formatRmmDateTime(os.installDate) : null} />
          </DetailSection>
        </DetailGroup>

        <DetailGroup title={rmmFields.infrastructure} columns={3}>
          <DetailSection title={rmmFields.network}>
            <Field label={rmmFields.mainIp} value={ip} mono />
            <Field label={rmmFields.mainMac} value={mac} mono />
            <Field label={rmmFields.gateway} value={network.gateway} mono />
            <Field label="DNS" value={network.dns} mono />
          </DetailSection>

          {hasHardwareSection ? <DetailSection title={rmmFields.hardware}>
              <Field label={rmmFields.brand} value={chassis.manufacturer} />
              <Field label={rmmFields.model} value={chassis.model} />
              <Field label={rmmFields.serial} value={chassis.serial} mono />
              <Field label={rmmFields.processor} value={hardware.cpu || inventory.processeur} />
              <Field label={rmmFields.coresThreads} value={hardware.cores != null ? `${hardware.cores}${hardware.logicalProcessors != null ? ` / ${hardware.logicalProcessors}` : ""}` : null} />
              <Field label={rmmFields.frequency} value={hardware.currentClockMHz != null ? `${hardware.currentClockMHz} MHz${hardware.maxClockMHz ? ` (max ${hardware.maxClockMHz})` : ""}` : null} />
              <Field label={rmmFields.gpu} value={formatGpuSummary(gpus)} />
            </DetailSection> : null}

          {security.defender || security.firewall.length > 0 ? <DetailSection title={rmmFields.security}>
              {security.defender ? <>
                  <Field label="Defender" value={security.defender.enabled ? rmmFields.active : rmmFields.inactive} />
                  <Field label={rmmFields.realtimeProtection} value={security.defender.realTimeProtection ? rmmFields.yes : rmmFields.no} />
                  <Field label={rmmFields.signatureVersion} value={security.defender.productVersion} mono />
                </> : null}
              {security.firewall.map(profile => <Field key={profile.profile} label={interpolate(rmmFields.firewallProfile, {
            profile: profile.profile
          })} value={profile.enabled ? rmmFields.enabled : rmmFields.disabled} />)}
            </DetailSection> : null}

          {sensor.sensors.length > 0 || sensor.battery ? <DetailSection title={rmmFields.sensors}>
              {sensor.maxTempLabel ? <Field label={rmmFields.maxTemperature} value={sensor.maxTempLabel} /> : null}
              {sensor.sensors.slice(0, 6).map(item => <Field key={`${item.name}-${item.value}`} label={item.name} value={formatTemperatureC(item.value)} />)}
              {sensor.battery?.present ? <Field label={rmmFields.battery} value={sensor.battery.chargePct != null ? `${sensor.battery.chargePct}% · ${sensor.battery.status || "-"}` : sensor.battery.status} /> : null}
            </DetailSection> : null}
        </DetailGroup>
      </div>
    </section>;
}
