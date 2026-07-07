import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchHomeDashboard } from "../../api/stats";
import { fetchRmmAgents, requestRmmAgentSync, cancelRmmAgentSync } from "../../api/rmm";
import { getEquipmentListKey } from "../../utils/equipmentIdentity";
import {
  buildSupervisionTodoActions,
} from "./equipmentMspUtils";
import SupervisionAlertRulesPanel from "./SupervisionAlertRulesPanel";
import { useSupervisionAlertRules } from "../../hooks/useSupervisionAlertRules";
import { isSupervisionCriterionEnabled } from "./supervisionAlertRulesConfig";
import { mergeRmmAgentRows, isRmmSyncPending, getRmmAgentOsDisplay } from "./rmmMonitoringUtils";
import { formatRelativeFrench } from "./checkmkMonitoringUtils";
import { getOsIconName } from "./osIconUtils";
import EmbeddedEquipmentActionsMenu from "./EmbeddedEquipmentActionsMenu";
import MspEmptyState from "../Misc/MspEmptyState/MspEmptyState";
import MspPriorityPanel from "../Misc/MspPriorityPanel/MspPriorityPanel";
import BackupMspPanel from "./BackupMspPanel";
import ContractMspDashboard from "./ContractMspDashboard";
import RmmMspDashboard from "./RmmMspDashboard";
import { getContractMspDashboardCopy } from "./contractMspDashboardI18n";
import { getRmmMspDashboardCopy } from "./rmmMspDashboardI18n";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getLocaleTag } from "../../i18n/locales";
import {
  getLocalizedEquipmentTypeLabel,
} from "../../i18n/equipmentFamilyLabels";
import { interpolate } from "../../i18n/translate";
import { getSupervisionCenterCopy } from "./supervisionCenterPageI18n";
import { getBackupMspPanelCopy } from "./backupMspPanelI18n";
import MspOverviewHexPanel, { getHealthHexTone } from "../Misc/MspOverviewHexPanel/MspOverviewHexPanel";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import dashStyles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import SupportOrbitalBackground from "../Misc/ReportBugForm/SupportOrbitalBackground";
import styles from "./SupervisionCenterPage.module.css";

const TABS = [
  { id: "overview", label: "À traiter", icon: "mdi:lightning-bolt" },
  { id: "devices", label: "Périphériques", icon: "mdi:devices" },
  { id: "backups", label: "Sauvegardes", icon: "mdi:backup-restore" },
  { id: "contracts", label: "Contrats & licences", icon: "mdi:file-document-alert-outline" },
  { id: "rmm", label: "Agents RMM", icon: "mdi:laptop" },
  { id: "alert-rules", label: "Règles d'alerte", icon: "mdi:bell-cog-outline" },
];

const CONTRACT_STATUS_META = {
  expired: { label: "Expiré", className: styles.contractStatus_expired },
  expiring: { label: "Expire bientôt", className: styles.contractStatus_expiring },
  suspended: { label: "Suspendu", className: styles.contractStatus_suspended },
};

const LICENSE_MODULE_SECTIONS = [
  { module: "antivirus", label: "Antivirus", icon: "mdi:shield-search" },
  { module: "antispam", label: "Antispam", icon: "mdi:email-secure-outline" },
  { module: "domain", label: "Noms de domaine", icon: "mdi:web" },
  { module: "ssl", label: "Certificats SSL", icon: "mdi:certificate-outline" },
  { module: "licences", label: "Licences & abonnements", icon: "mdi:license" },
  { module: "o365", label: "Microsoft 365", icon: "mdi:microsoft" },
  { module: "backup", label: "Sauvegarde", icon: "mdi:backup-restore" },
  { module: "firewall", label: "Firewall", icon: "mdi:shield-outline" },
  { module: "toip", label: "TOIP / VoIP", icon: "mdi:phone-voip" },
];

const CONTRACT_STATUS_CLASS = {
  expired: styles.contractStatus_expired,
  expiring: styles.contractStatus_expiring,
  suspended: styles.contractStatus_suspended,
};

function buildContractAlertRows(alerts = [], licenseAlerts = [], copy) {
  const rows = [];
  const moduleSections = copy?.licenseModuleSections || LICENSE_MODULE_SECTIONS;

  for (const alert of Array.isArray(alerts) ? alerts : []) {
    rows.push({
      id: `contract-${alert.id}`,
      clientId: alert.id,
      clientName: alert.name,
      name: alert.name,
      subtitle: copy?.contractType?.msp || "Contrat MSP",
      type: copy?.contractType?.enterprise || "Contrat entreprise",
      typeKey: "contract",
      status: alert.status,
      expiration: alert.expiration,
      module: null,
    });
  }

  for (const alert of Array.isArray(licenseAlerts) ? licenseAlerts : []) {
    const typeLabel =
      alert.moduleLabel ||
      moduleSections.find((section) => section.module === alert.module)?.label ||
      alert.module ||
      copy?.contractType?.license ||
      "Licence";
    const detail = alert.label || typeLabel;
    rows.push({
      id: alert.id,
      clientId: alert.clientId,
      clientName: alert.clientName,
      name: alert.clientName || alert.label || typeLabel,
      subtitle: detail,
      type: typeLabel,
      typeKey: alert.module || "license",
      status: alert.status,
      expiration: alert.expiration,
      module: alert.module,
    });
  }

  return rows;
}

function getContractAlertSortValue(row, key) {
  switch (key) {
    case "name":
      return (row.name || "").toLowerCase();
    case "type":
      return (row.type || "").toLowerCase();
    case "status": {
      const rank = { expired: 0, suspended: 1, expiring: 2 };
      return rank[row.status] ?? 3;
    }
    case "expiration": {
      const time = row.expiration ? new Date(row.expiration).getTime() : Number.POSITIVE_INFINITY;
      return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
    }
    default:
      return "";
  }
}

const CONTRACT_ALERTS_TABLE_COLUMNS = [
  { key: "name", label: "Nom", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "status", label: "Statut", sortable: true },
  { key: "expiration", label: "Expiration", sortable: true },
];

function ContractAlertStatusDot({ status }) {
  const dotClass =
    status === "expired"
      ? styles.contractStatusDot_expired
      : status === "suspended"
        ? styles.contractStatusDot_suspended
        : styles.contractStatusDot_expiring;
  return <span className={`${styles.rmmStatus} ${dotClass}`} aria-hidden />;
}

function ContractAlertsList({ alerts, licenseAlerts = [], onNavigateClient, copy, formatDate, localeTag }) {
  const [sort, setSort] = useState({ key: "expiration", direction: "asc" });

  const rows = useMemo(
    () => buildContractAlertRows(alerts, licenseAlerts, copy),
    [alerts, licenseAlerts, copy]
  );

  const sortedRows = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getContractAlertSortValue(a, sort.key);
      const vb = getContractAlertSortValue(b, sort.key);
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * direction;
      }
      return String(va).localeCompare(String(vb), localeTag || "fr-FR", { numeric: true }) * direction;
    });
  }, [rows, sort, localeTag]);

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (rows.length === 0) {
    return (
      <EmptyGood
        icon="mdi:file-check-outline"
        title={copy.contracts.okTitle}
        text={copy.contracts.okText}
      />
    );
  }

  const expiredCount = rows.filter((row) => row.status === "expired").length;
  const expiringCount = rows.filter((row) => row.status === "expiring").length;
  const tableColumns = copy.tableColumns || CONTRACT_ALERTS_TABLE_COLUMNS;

  return (
    <div className={styles.contractAlertsFleet}>
      <div className={styles.rmmSummary}>
        <span className={styles.rmmSummaryItem}>
          <strong>{rows.length}</strong> {copy.formatAlertCount(rows.length)}
        </span>
        {expiredCount > 0 ? (
          <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryBad}`}>
            <strong>{expiredCount}</strong> {copy.formatExpiredCount(expiredCount)}
          </span>
        ) : null}
        {expiringCount > 0 ? (
          <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryWarn}`}>
            <strong>{expiringCount}</strong> {copy.formatExpiringCount(expiringCount)}
          </span>
        ) : null}
      </div>
      <div className={styles.rmmTableWrap}>
        <table className={styles.rmmTable}>
          <thead>
            <tr>
              {tableColumns.map((col) => {
                const isSorted = sort.key === col.key;
                const sortMark = isSorted ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕";
                return (
                  <th
                    key={col.key}
                    className={styles.rmmSortableTh}
                    onClick={() => handleSort(col.key)}
                    title={copy.formatSortBy(col.label)}
                    aria-label={col.label}
                  >
                    <span className={styles.rmmThContent}>
                      {col.label}
                      <span className={styles.rmmSortIndicator} aria-hidden>
                        {sortMark}
                      </span>
                    </span>
                  </th>
                );
              })}
              <th className={styles.rmmColActions} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const statusMeta = copy.contractStatusMeta[row.status] || copy.contractStatusMeta.expiring;
              const statusClass = CONTRACT_STATUS_CLASS[statusMeta.classKey || row.status] || CONTRACT_STATUS_CLASS.expiring;
              return (
                <tr key={row.id} className={styles.rmmTableRow}>
                  <td className={styles.rmmColHost}>
                    <div className={styles.rmmHostCell}>
                      <ContractAlertStatusDot status={row.status} />
                      <div className={styles.rmmHostBody}>
                        <span className={styles.rmmHost}>{row.name || "-"}</span>
                        {row.subtitle ? (
                          <span className={styles.rmmHostSub} title={row.subtitle}>
                            {row.subtitle}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className={styles.contractColType}>{row.type || "-"}</td>
                  <td>
                    <span className={`${styles.contractStatus} ${statusClass}`}>
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className={styles.contractColExpiration}>
                    {formatDate(row.expiration)}
                  </td>
                  <td className={styles.rmmColActions}>
                    <div className={styles.rmmRowActions}>
                      <button
                        type="button"
                        className={styles.rmmOpenEquipmentBtn}
                        onClick={() =>
                          onNavigateClient?.({
                            id: row.clientId,
                            name: row.clientName,
                            module: row.module,
                          })
                        }
                        title={copy.contracts.viewEnterprise}
                        aria-label={copy.contracts.viewEnterprise}
                      >
                        <Icon icon="mdi:open-in-new" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "0";
  return String(Math.round(Number(value)));
}

function EmptyGood({ icon, title, text }) {
  return <MspEmptyState icon={icon} title={title} text={text} />;
}

const PRIORITY_TREATMENT_HINTS = {
  monitor_critical: "Intervenir sur l'alerte CheckMK et rétablir le service.",
  monitor_warning: "Analyser le warning CheckMK avant dégradation.",
  agent_offline: "Contrôler alimentation, réseau et service agent RMM (hors ligne depuis plus de 48 h).",
  unmapped: "Mapper l'équipement à un hôte CheckMK depuis la fiche matériel.",
  no_data: "Vérifier le mapping CheckMK et la remontée des métriques.",
  warranty_expired: "Renouveler ou mettre à jour la garantie constructeur.",
  warranty_soon: "Planifier le renouvellement de garantie.",
  maintenance_expired: "Renouveler la licence de maintenance firewall.",
  maintenance_soon: "Anticiper le renouvellement de la licence maintenance.",
  battery_expired: "Remplacer la batterie onduleur / PDU.",
  battery_soon: "Commander ou planifier le remplacement batterie.",
  updates_pending: "Planifier l'installation des mises à jour Windows.",
  disk_critical: "Libérer ou étendre l'espace disque en urgence.",
  disk_warn: "Surveiller l'espace disque et planifier un nettoyage.",
  missing_ip: "Compléter l'adresse IP dans la fiche matériel.",
};

function RmmToneBadge({ label, tone = "neutral", onClick, title }) {
  if (!label || label === "-") {
    return <span className={styles.rmmCellMuted}>-</span>;
  }
  if (onClick) {
    return (
      <button
        type="button"
        className={`${styles.rmmBadge} ${styles[`rmmBadge_${tone}`]} ${styles.rmmBadgeBtn}`}
        onClick={onClick}
        title={title}
      >
        {label}
      </button>
    );
  }
  return (
    <span className={`${styles.rmmBadge} ${styles[`rmmBadge_${tone}`]}`}>{label}</span>
  );
}

function getRmmHostSubtitle(agent, copy, { syncPending = false } = {}) {
  const parts = [agent.domain, agent.logged_user].filter(Boolean);
  if (syncPending) parts.push(copy.rmm.syncRequested);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function getRmmAgentSortValue(agent, key) {
  switch (key) {
    case "hostname":
      return (agent.hostname || agent.machine_id || "").toLowerCase();
    case "client_name":
      return (agent.client_name || "").toLowerCase();
    case "os":
      return (getRmmAgentOsDisplay(agent).label || "").toLowerCase();
    case "os_build":
      return (getRmmAgentOsDisplay(agent).build || "").toLowerCase();
    case "ip":
      return (agent.ip || "").toLowerCase();
    case "updates_pending":
      return agent.updates_pending ?? -1;
    case "agent_version":
      return (agent.agent_version || "").toLowerCase();
    case "last_seen_at": {
      if (!agent.last_seen_at) return 0;
      const time = new Date(agent.last_seen_at).getTime();
      return Number.isFinite(time) ? time : 0;
    }
    default:
      return "";
  }
}

async function copyText(value, label, copy) {
  const raw = String(value || "").trim();
  if (!raw) return;
  try {
    await navigator.clipboard.writeText(raw);
    toast.success(copy.formatClipboardCopied(label));
  } catch {
    toast.error(copy.rmm.clipboard.copyFailed);
  }
}

function filterRmmAgentsBySearch(agents, searchQuery) {
  const query = String(searchQuery || "").trim().toLowerCase();
  const rows = Array.isArray(agents) ? agents : [];
  if (!query) return rows;
  return rows.filter((agent) => {
    const osDisplay = getRmmAgentOsDisplay(agent);
    const haystack = [
      agent.hostname,
      agent.machine_id,
      agent.client_name,
      agent.ip,
      agent.domain,
      agent.logged_user,
      agent.agent_version,
      osDisplay.label,
      osDisplay.build,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

function RmmAgentsList({
  agents,
  showOfflineOnly = false,
  searchQuery = "",
  onOpenEquipment,
  onViewMetricHistory,
  onRequestSync,
  onCancelSync,
  onRevokeAgent,
  onNavigateClient,
  isAdmin = false,
  copy,
  formatLastSeen,
  localeTag = "fr-FR",
}) {
  const [sort, setSort] = useState({ key: "last_seen_at", direction: "desc" });
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [syncingIds, setSyncingIds] = useState(() => new Set());

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const buildMenuItems = (agent) => {
    const hostname = agent.hostname || agent.machine_id || copy.rmm.workstation;
    const items = [];

    if (agent.client_id && onNavigateClient) {
      items.push({
        id: "client",
        icon: "mdi:office-building-outline",
        label: copy.rmm.menu.viewEnterprise,
        onClick: () =>
          onNavigateClient({
            id: agent.client_id,
            name: agent.client_name,
          }),
      });
    }

    if (isRmmSyncPending(agent)) {
      items.push({
        id: "cancel-sync",
        icon: "mdi:sync-off",
        label: copy.rmm.menu.cancelSync,
        disabled: syncingIds.has(agent.id),
        onClick: async () => {
          if (!agent.id || !onCancelSync) return;
          setSyncingIds((prev) => new Set(prev).add(agent.id));
          try {
            await onCancelSync(agent);
          } finally {
            setSyncingIds((prev) => {
              const next = new Set(prev);
              next.delete(agent.id);
              return next;
            });
          }
        },
      });
    } else {
      items.push({
        id: "sync",
        icon: "mdi:sync",
        label: copy.rmm.menu.fullSync,
        disabled: syncingIds.has(agent.id),
        onClick: async () => {
          if (!agent.id || !onRequestSync) return;
          setSyncingIds((prev) => new Set(prev).add(agent.id));
          try {
            await onRequestSync(agent);
          } finally {
            setSyncingIds((prev) => {
              const next = new Set(prev);
              next.delete(agent.id);
              return next;
            });
          }
        },
      });
    }

    if (onViewMetricHistory && agent.id && agent.equipment) {
      items.push({
        id: "metrics-history",
        icon: "mdi:chart-timeline-variant",
        label: copy.rmm.menu.metricsHistory,
        onClick: () => onViewMetricHistory(agent),
      });
    }

    items.push({ type: "divider" });

    items.push(
      {
        id: "copy-host",
        icon: "mdi:content-copy",
        label: copy.rmm.menu.copyHost,
        onClick: () => copyText(hostname, copy.rmm.clipboard.hostName, copy),
      },
      {
        id: "copy-ip",
        icon: "mdi:ip-network",
        label: copy.rmm.menu.copyIp,
        disabled: !agent.ip,
        onClick: () => copyText(agent.ip, copy.rmm.clipboard.ipAddress, copy),
      }
    );

    if (isAdmin && onRevokeAgent) {
      items.push({ type: "divider" });
      items.push({
        id: "revoke",
        icon: "mdi:link-off",
        label: copy.rmm.menu.revoke,
        danger: true,
        onClick: () => onRevokeAgent(agent),
      });
    }

    return items;
  };

  const list = useMemo(() => {
    const rows = Array.isArray(agents) ? agents : [];
    const filtered = showOfflineOnly ? rows.filter((a) => !a.online) : rows;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = getRmmAgentSortValue(a, sort.key);
      const vb = getRmmAgentSortValue(b, sort.key);
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * direction;
      }
      return String(va).localeCompare(String(vb), localeTag, { numeric: true }) * direction;
    });
  }, [agents, showOfflineOnly, sort, localeTag]);

  const stats = useMemo(() => {
    const rows = Array.isArray(agents) ? agents : [];
    const offline = rows.filter((a) => !a.online).length;
    const pendingUpdates = rows.filter((a) => (a.updates_pending ?? 0) > 0).length;
    const diskAlerts = rows.filter((a) => (a.disk_pct ?? 0) >= 85).length;
    return { total: rows.length, offline, pendingUpdates, diskAlerts };
  }, [agents]);

  if (!list.length) {
    const hasSearch = Boolean(String(searchQuery || "").trim());
    return (
      <EmptyGood
        icon={hasSearch ? "mdi:magnify-close" : showOfflineOnly ? "mdi:laptop" : "mdi:laptop-off"}
        title={
          hasSearch
            ? copy.rmm.empty.noMatchTitle
            : showOfflineOnly
              ? copy.rmm.empty.allOnlineTitle
              : copy.rmm.empty.noAgentsTitle
        }
        text={
          hasSearch
            ? copy.rmm.empty.noMatchText
            : showOfflineOnly
              ? copy.rmm.empty.allOnlineText
              : copy.rmm.empty.noAgentsText
        }
      />
    );
  }

  if (showOfflineOnly) {
    const offlineCards = [...list].sort((a, b) => {
      const ta = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const tb = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });

    return (
      <div className={styles.rmmOfflineList}>
        {offlineCards.map((agent) => {
          const hostname = agent.hostname || agent.machine_id || copy.rmm.workstation;
          const syncPending = isRmmSyncPending(agent);
          const canOpenEquipment = Boolean(agent.equipment && onOpenEquipment);
          const relativeLastSeen = agent.last_seen_at
            ? formatRelativeFrench(agent.last_seen_at)
            : null;

          return (
            <article key={agent.id} className={styles.rmmOfflineCard}>
              <div className={styles.rmmOfflineMain}>
                <span className={styles.rmmOfflineStatus} title={copy.rmm.offline} aria-hidden />
                <div className={styles.rmmOfflineBody}>
                  <h3 className={styles.rmmOfflineHost}>{hostname}</h3>
                  <div className={styles.rmmOfflineActivity}>
                    <span className={styles.rmmOfflineActivityLabel}>{copy.rmm.lastActivity}</span>
                    <strong className={styles.rmmOfflineActivityValue}>
                      {formatLastSeen(agent.last_seen_at)}
                    </strong>
                    {relativeLastSeen ? (
                      <span className={styles.rmmOfflineActivityRelative}>{relativeLastSeen}</span>
                    ) : null}
                  </div>
                  {(agent.client_name || agent.domain || syncPending) && (
                    <p className={styles.rmmOfflineMeta}>
                      {[agent.client_name, agent.domain].filter(Boolean).join(" · ")}
                      {syncPending
                        ? `${agent.client_name || agent.domain ? " · " : ""}${copy.rmm.syncRequested}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
              {canOpenEquipment ? (
                <button
                  type="button"
                  className={styles.rmmOfflineOpenBtn}
                  onClick={() => onOpenEquipment(agent.equipment)}
                >
                  <Icon icon="mdi:monitor-eye" aria-hidden />
                  {copy.rmm.viewWorkstation}
                </button>
              ) : (
                <span className={styles.rmmOfflineMissingLink}>{copy.rmm.notLinked}</span>
              )}
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.rmmFleet}>
      {!showOfflineOnly ? (
        <div className={styles.rmmSummary}>
          <span className={styles.rmmSummaryItem}>
            <strong>{stats.total}</strong> {copy.formatRmmWorkstationCount(stats.total)}
          </span>
          {stats.offline > 0 ? (
            <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryWarn}`}>
              <strong>{stats.offline}</strong> {copy.rmm.summary.offline}
            </span>
          ) : null}
          {stats.pendingUpdates > 0 ? (
            <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryWarn}`}>
              <strong>{stats.pendingUpdates}</strong> {copy.rmm.summary.pendingUpdates}
            </span>
          ) : null}
          {stats.diskAlerts > 0 ? (
            <span className={`${styles.rmmSummaryItem} ${styles.rmmSummaryBad}`}>
              <strong>{stats.diskAlerts}</strong> {copy.formatRmmDiskAlerts(stats.diskAlerts)}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={styles.rmmTableWrap}>
        <table className={styles.rmmTable}>
          <thead>
            <tr>
              {copy.rmmTableColumns.map((col) => {
                const isSorted = sort.key === col.key;
                const sortMark = isSorted ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕";
                const thClass = col.sortable ? styles.rmmSortableTh : undefined;

                if (!col.sortable) {
                  return (
                    <th key={col.key} className={thClass}>
                      {col.label}
                    </th>
                  );
                }

                return (
                  <th
                    key={col.key}
                    className={thClass}
                    onClick={() => handleSort(col.key)}
                    title={copy.formatRmmSortBy(col.label)}
                    aria-label={col.ariaLabel || col.label}
                  >
                    <span className={styles.rmmThContent}>
                      {col.label}
                      <span className={styles.rmmSortIndicator} aria-hidden>
                        {sortMark}
                      </span>
                    </span>
                  </th>
                );
              })}
              <th className={styles.rmmColActions} aria-label={copy.rmm.table.actions} />
            </tr>
          </thead>
          <tbody>
            {list.map((agent) => {
              const syncPending = isRmmSyncPending(agent);
              const canOpenEquipment = Boolean(agent.equipment && onOpenEquipment);
              const osDisplay = getRmmAgentOsDisplay(agent);
              const osIcon = osDisplay.iconSource
                ? getOsIconName(osDisplay.iconSource, { withFallback: true })
                : null;
              const hostSubtitle = getRmmHostSubtitle(agent, copy, { syncPending });
              return (
                <tr key={agent.id} className={styles.rmmTableRow}>
                  <td className={styles.rmmColHost}>
                    <div className={styles.rmmHostCell}>
                      <span
                        className={`${styles.rmmStatus} ${agent.online ? styles.rmmStatus_online : styles.rmmStatus_offline}`}
                        title={agent.online ? copy.rmm.online : copy.rmm.offline}
                      />
                      <div className={styles.rmmHostBody}>
                        <span className={styles.rmmHost}>{agent.hostname || agent.machine_id || copy.rmm.workstation}</span>
                        {hostSubtitle ? (
                          <span className={styles.rmmHostSub} title={hostSubtitle}>
                            {hostSubtitle}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className={styles.rmmCellMuted}>{agent.client_name || "-"}</td>
                  <td className={styles.rmmColOs} title={osDisplay.label || undefined}>
                    {osDisplay.label ? (
                      <span className={styles.rmmOsCell}>
                        {osIcon ? (
                          <Icon icon={osIcon} width={18} height={18} className={styles.rmmOsIcon} aria-hidden />
                        ) : null}
                        <span className={styles.rmmOsLabel}>{osDisplay.label}</span>
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={styles.rmmCellMono} title={osDisplay.build || undefined}>
                    {osDisplay.build || "-"}
                  </td>
                  <td className={styles.rmmCellMono}>{agent.ip || "-"}</td>
                  <td>
                    <RmmToneBadge label={agent.updates_label} tone={agent.updates_tone} />
                  </td>
                  <td className={styles.rmmCellMono}>{agent.agent_version || "-"}</td>
                  <td className={styles.rmmLastSeen}>{formatLastSeen(agent.last_seen_at)}</td>
                  <td className={styles.rmmColActions}>
                    <div className={styles.rmmRowActions}>
                      {canOpenEquipment ? (
                        <button
                          type="button"
                          className={styles.rmmOpenEquipmentBtn}
                          onClick={() => onOpenEquipment(agent.equipment)}
                          title={copy.rmm.viewWorkstation}
                          aria-label={copy.rmm.viewWorkstation}
                        >
                          <Icon icon="mdi:open-in-new" aria-hidden />
                        </button>
                      ) : null}
                      <EmbeddedEquipmentActionsMenu
                        menuKey={agent.id}
                        openMenuKey={openMenuKey}
                        onOpenChange={setOpenMenuKey}
                        items={buildMenuItems(agent)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SupervisionCenterPage({
  loading = false,
  error = null,
  statsItems = [],
  resolveMonitorStatus,
  statusCounts: statusCountsProp,
  onEquipmentOpen,
  devicesContent = null,
  equipmentRmmAgents = [],
  availableClients = [],
  selectedClients = new Set(),
  onToggleClient,
  onClearFilters,
  activeFiltersCount = 0,
  searchQuery = "",
  onSearchChange,
  headerActions = null,
  onNavigate,
  onRmmRevokeAgent,
  onRmmDataRefresh,
  deviceStatusFilter = "all",
  onDeviceStatusFilterChange,
  checkmkIntegrationEnabled = false,
  isMkMapped = () => false,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [rmmAgents, setRmmAgents] = useState([]);
  const [rmmLoading, setRmmLoading] = useState(true);
  const [rmmFromApi, setRmmFromApi] = useState(false);
  const [proPromoKey, setProPromoKey] = useState(null);
  const [backupStats, setBackupStats] = useState({ total: 0, issues: 0, critical: 0, warning: 0, ok: 0 });
  const { user } = useAuthContext();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const locale = useAppLocale();
  const localeTag = getLocaleTag(locale);
  const pageCopy = useMemo(() => getSupervisionCenterCopy(locale), [locale]);
  const backupCopy = useMemo(() => getBackupMspPanelCopy(locale), [locale]);
  const contractDashboardCopy = useMemo(() => getContractMspDashboardCopy(locale), [locale]);
  const rmmDashboardCopy = useMemo(() => getRmmMspDashboardCopy(locale), [locale]);
  const { formatDate, formatDateTime } = useAppFormatters();
  const formatLastSeenLocalized = useCallback(
    (value) => {
      if (!value) return pageCopy.time.never;
      const formatted = formatDateTime(value);
      return formatted === "-" ? "-" : formatted;
    },
    [formatDateTime, pageCopy.time.never]
  );
  const { rules: alertRules, catalog: alertRulesCatalog, applyRules } = useSupervisionAlertRules();

  const effectiveRmmAgents = useMemo(() => {
    const apiRows = Array.isArray(rmmAgents) ? rmmAgents : [];
    const fromEquipment = Array.isArray(equipmentRmmAgents) ? equipmentRmmAgents : [];
    return mergeRmmAgentRows(rmmFromApi ? apiRows : [], fromEquipment);
  }, [rmmFromApi, rmmAgents, equipmentRmmAgents]);

  const statusCounts = useMemo(() => {
    if (statusCountsProp) return statusCountsProp;
    return { total: statsItems.length, issues: 0, unmapped: 0, critical: 0, warning: 0, offline: 0 };
  }, [statusCountsProp, statsItems.length]);

  const priorityActions = useMemo(
    () =>
      resolveMonitorStatus
        ? buildSupervisionTodoActions(statsItems, resolveMonitorStatus, {
            limit: 12,
            alertRules,
            checkmkEnabled: checkmkIntegrationEnabled,
            isMkMapped,
          })
        : [],
    [statsItems, resolveMonitorStatus, alertRules, checkmkIntegrationEnabled, isMkMapped]
  );

  const supervisionPriorityItems = useMemo(
    () =>
      priorityActions.map((action) => {
        const { equipment, status, issue } = action;
        const equipmentType = getLocalizedEquipmentTypeLabel(equipment.type, locale, equipment.type);
        const metaParts = [
          equipment.clientName,
          equipmentType,
          equipment.ip,
          issue?.label,
        ].filter(Boolean);
        const verb =
          issue?.tone === "bad" || status === "critical" || status === "offline"
            ? pageCopy.priority.intervene
            : issue?.tone === "warn" || status === "warning"
              ? pageCopy.priority.analyze
              : pageCopy.priority.treat;
        return {
          id: getEquipmentListKey(equipment),
          name: equipment.name || pageCopy.priority.noName,
          meta: metaParts.join(" · "),
          tone: issue?.tone || status,
          verb,
          equipment,
        };
      }),
    [priorityActions, locale, pageCopy.priority]
  );

  const offlineAgents = useMemo(() => {
    const rows = Array.isArray(effectiveRmmAgents) ? effectiveRmmAgents.filter((a) => !a.online) : [];
    if (!alertRules) return rows;
    const showOffline = isSupervisionCriterionEnabled("ordinateurs", "agent_offline", alertRules);
    return showOffline ? rows : [];
  }, [effectiveRmmAgents, alertRules]);

  const kpis = dashboard?.kpis || {};
  const contractAlerts = dashboard?.contractAlerts || [];
  const licenseAlerts = dashboard?.licenseAlerts || [];

  const totalIssues = useMemo(() => {
    return (
      (statusCounts.issues || 0) +
      (statusCounts.unmapped || 0) +
      offlineAgents.length +
      (backupStats.issues || 0) +
      contractAlerts.length +
      licenseAlerts.length
    );
  }, [statusCounts, offlineAgents.length, backupStats.issues, contractAlerts.length, licenseAlerts.length]);

  const handleBackupStatsChange = useCallback((stats) => {
    setBackupStats(stats || { total: 0, issues: 0, critical: 0, warning: 0, ok: 0 });
  }, []);

  const loadDashboard = useCallback(async (signal) => {
    setDashboardLoading(true);
    try {
      const data = await fetchHomeDashboard({ signal });
      setDashboard(data);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Erreur chargement supervision dashboard:", err);
      }
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadRmm = useCallback(async (signal) => {
    setRmmLoading(true);
    try {
      const data = await fetchRmmAgents();
      if (signal?.aborted) return;
      const rows = Array.isArray(data?.agents) ? data.agents : Array.isArray(data) ? data : [];
      setRmmAgents(rows);
      setRmmFromApi(true);
    } catch (err) {
      if (err?.name !== "AbortError") {
        setRmmAgents([]);
        setRmmFromApi(false);
      }
    } finally {
      if (!signal?.aborted) setRmmLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    loadRmm(controller.signal);
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadDashboard(controller.signal);
      loadRmm(controller.signal);
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [loadDashboard, loadRmm]);

  const handleNavigateClient = useCallback(
    (alert) => {
      if (!onNavigate || !alert?.id) return;
      onNavigate("ContratDetail", {
        clientId: alert.id,
        name: alert.name,
      });
    },
    [onNavigate]
  );

  const handleRmmRequestSync = useCallback(
    async (agent) => {
      if (!agent?.id) return;
      try {
        await requestRmmAgentSync(agent.id);
        toast.success(pageCopy.formatRmmSyncToast(agent.hostname));
        await loadRmm();
        onRmmDataRefresh?.();
      } catch (err) {
        toast.error(err?.message || pageCopy.rmm.toasts.syncRequestFailed);
      }
    },
    [onRmmDataRefresh, loadRmm, pageCopy]
  );

  const handleRmmCancelSync = useCallback(
    async (agent) => {
      if (!agent?.id) return;
      try {
        await cancelRmmAgentSync(agent.id);
        toast.success(pageCopy.formatRmmSyncCancelledToast(agent.hostname));
        await loadRmm();
        onRmmDataRefresh?.();
      } catch (err) {
        toast.error(err?.message || pageCopy.rmm.toasts.syncCancelFailed);
      }
    },
    [onRmmDataRefresh, loadRmm, pageCopy]
  );

  const handleRmmRevokeAgent = useCallback(
    (agent) => {
      if (agent?.equipment && onRmmRevokeAgent) {
        onRmmRevokeAgent(agent);
        return;
      }
      toast.error(pageCopy.rmm.toasts.revokeFailed);
    },
    [onRmmRevokeAgent, pageCopy]
  );

  const handleRmmViewMetricHistory = useCallback(
    (agent) => {
      if (!agent?.equipment) {
        toast.error(pageCopy.rmm.toasts.metricsNoEquipment);
        return;
      }
      const payload = { ...agent.equipment, detailTab: "metrics" };
      if (onEquipmentOpen) {
        onEquipmentOpen(payload);
        return;
      }
      if (onNavigate) {
        onNavigate("EquipmentDetail", payload);
      }
    },
    [onEquipmentOpen, onNavigate, pageCopy]
  );

  const goToDevices = useCallback(
    (filter = "all") => {
      onDeviceStatusFilterChange?.(filter);
      setActiveTab("devices");
    },
    [onDeviceStatusFilterChange]
  );

  const supervisionHexItems = useMemo(() => {
    const hexKpi = pageCopy.overview.hexKpi || {};
    const surveillancePct =
      kpis.equipSurveillancePercent ?? dashboard?.infrastructure?.equipSurveillancePercent ?? null;

    return [
      {
        id: "devices",
        icon: "mdi:devices",
        label: hexKpi.devices,
        value: statusCounts.total || statsItems.length,
        tone: "neutral",
        onClick: () => goToDevices("all"),
      },
      {
        id: "issues",
        icon: "mdi:alert-circle-outline",
        label: hexKpi.issues,
        value: statusCounts.issues || 0,
        tone: (statusCounts.issues || 0) > 0 ? "warn" : "good",
        disabled: !(statusCounts.issues > 0),
        onClick: () => goToDevices("issues"),
      },
      {
        id: "critical",
        icon: "mdi:alert-octagon-outline",
        label: hexKpi.critical,
        value: statusCounts.critical || 0,
        tone: (statusCounts.critical || 0) > 0 ? "bad" : "good",
        disabled: !(statusCounts.critical > 0),
        onClick: () => goToDevices("issues"),
      },
      {
        id: "offline",
        icon: "mdi:laptop-off",
        label: hexKpi.offline,
        value: offlineAgents.length,
        tone: offlineAgents.length > 0 ? "warn" : "good",
        disabled: offlineAgents.length === 0,
        onClick: () => setActiveTab("rmm"),
      },
      {
        id: "backups",
        icon: "mdi:backup-restore",
        label: hexKpi.backups,
        value: backupStats.issues || 0,
        tone: (backupStats.issues || 0) > 0 ? "bad" : "good",
        disabled: !(backupStats.issues > 0),
        onClick: () => setActiveTab("backups"),
      },
      {
        id: "supervised",
        icon: "mdi:radar",
        label: hexKpi.supervised,
        value: surveillancePct ?? "-",
        tone: getHealthHexTone(surveillancePct),
        zeroMuted: false,
        disabled: surveillancePct == null,
      },
    ];
  }, [
    pageCopy.overview.hexKpi,
    statusCounts,
    statsItems.length,
    offlineAgents.length,
    backupStats.issues,
    kpis.equipSurveillancePercent,
    dashboard?.infrastructure?.equipSurveillancePercent,
    goToDevices,
  ]);

  const tabBadges = {
    overview: totalIssues,
    devices: statusCounts.total || statsItems.length,
    backups: backupStats.total || 0,
    contracts: contractAlerts.length + licenseAlerts.length,
    rmm: effectiveRmmAgents.length,
  };

  const isLoading = loading || dashboardLoading;

  if (isLoading && !statsItems.length && !dashboard) {
    return (
      <div className={`${cyberStyles.mspPage} ${cyberStyles.mspPageOrbital}`}>
        <SupportOrbitalBackground variant="page" />
        <div className={cyberStyles.mspLayout}>
          <div className={cyberStyles.mspMain}>
            <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
            <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList}`}>
              <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              <div className={`${styles.skeleton} ${styles.skeletonPanel}`} />
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${cyberStyles.mspPage} ${cyberStyles.mspPageOrbital}`}>
      <SupportOrbitalBackground variant="page" />
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>
          <header className={cyberStyles.mspHero}>
            <div className={cyberStyles.mspHeroMain}>
              <div className={`${cyberStyles.mspBrandMark} ${styles.brandMarkSupervision}`} aria-hidden>
                <Icon icon="mdi:radar" className={cyberStyles.mspBrandMarkIcon} />
              </div>
              <div className={cyberStyles.mspHeroCopy}>
                <span className={cyberStyles.mspEyebrow}>{pageCopy.eyebrow}</span>
                <h1 className={cyberStyles.mspTitle}>{pageCopy.pageTitle}</h1>
                <p className={cyberStyles.mspSubtitle}>{pageCopy.subtitle}</p>
              </div>
            </div>
            <nav className={cyberStyles.mspTabBar} role="tablist" aria-label={pageCopy.tabSectionsAria}>
              {pageCopy.tabs.map((tab) => {
                const badge = tabBadges[tab.id] || 0;
                const isActive = activeTab === tab.id;
                const showBadge = badge > 0 || tab.id === "devices" || tab.id === "rmm" || tab.id === "backups";
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`${cyberStyles.mspTab} ${isActive ? cyberStyles.mspTabActive : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon icon={tab.icon} className={cyberStyles.mspTabIcon} />
                    <span className={cyberStyles.mspTabLabelRow}>
                      <span>{tab.label}</span>
                      {showBadge ? (
                        <span className={`${styles.tabCount} ${badge === 0 ? styles.tabCountMuted : ""}`}>
                          {badge}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </nav>
          </header>

          <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
            {(activeTab === "backups" || activeTab === "contracts" || activeTab === "rmm") && !error ? (
              <div className={cyberStyles.tabContent}>
                {activeTab === "backups" ? (
                  <BackupMspPanel
                    embedded
                    onNavigate={onNavigate}
                    onStatsChange={handleBackupStatsChange}
                    copy={backupCopy}
                    localeTag={localeTag}
                  />
                ) : null}
                {activeTab === "contracts" ? (
                  <ContractMspDashboard
                    alerts={contractAlerts}
                    licenseAlerts={licenseAlerts}
                    loading={dashboardLoading}
                    onNavigateClient={handleNavigateClient}
                    copy={contractDashboardCopy}
                    pageCopy={pageCopy}
                    bcp47={localeTag}
                  />
                ) : null}
                {activeTab === "rmm" ? (
                  <RmmMspDashboard
                    agents={effectiveRmmAgents}
                    loading={rmmLoading}
                    copy={rmmDashboardCopy}
                    pageCopy={pageCopy}
                    formatLastSeen={formatLastSeenLocalized}
                    localeTag={localeTag}
                    isAdmin={isAdmin}
                    onOpenEquipment={onEquipmentOpen}
                    onViewMetricHistory={handleRmmViewMetricHistory}
                    onRequestSync={handleRmmRequestSync}
                    onCancelSync={handleRmmCancelSync}
                    onRevokeAgent={handleRmmRevokeAgent}
                    onNavigateClient={handleNavigateClient}
                  />
                ) : null}
              </div>
            ) : (
            <div className={`${dashStyles.dashboard} ${styles.dashboard}`}>
              {activeTab === "devices" &&
              (onSearchChange || availableClients.length > 1 || headerActions) ? (
                <div className={`${dashStyles.toolbar} ${styles.toolbar}`}>
                  {onSearchChange ? (
                    <label className={dashStyles.searchBox}>
                      <Icon icon="mdi:magnify" aria-hidden />
                      <input
                        type="search"
                        placeholder={pageCopy.search.devices}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                      />
                    </label>
                  ) : null}
                  {availableClients.length > 1 ? (
                    <div className={styles.clientFilters}>
                      <span className={styles.toolbarLabel}>{pageCopy.search.clients}</span>
                      {availableClients.slice(0, 8).map((clientName) => (
                        <button
                          key={clientName}
                          type="button"
                          className={`${styles.filterChip} ${selectedClients.has(clientName) ? styles.filterChipActive : ""}`}
                          onClick={() => onToggleClient?.(clientName)}
                        >
                          {clientName}
                        </button>
                      ))}
                      {availableClients.length > 8 ? (
                        <span className={styles.filterChip} style={{ cursor: "default", opacity: 0.7 }}>
                          +{availableClients.length - 8}
                        </span>
                      ) : null}
                      {activeFiltersCount > 0 ? (
                        <button type="button" className={styles.filterClear} onClick={onClearFilters}>
                          {interpolate(pageCopy.search.clearFilters, { count: String(activeFiltersCount) })}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {headerActions ? (
                    <div className={styles.toolbarActions}>{headerActions}</div>
                  ) : null}
                </div>
              ) : null}

              <div className={`${cyberStyles.tabContent} ${styles.content}`}>
          {error ? (
            <div className={styles.panel}>
              <MspEmptyState
                icon="mdi:alert-circle-outline"
                title={pageCopy.error.title}
                text={error}
              />
            </div>
          ) : null}

          {activeTab === "overview" && !error ? (
            <div className={styles.overviewStack}>
              <MspOverviewHexPanel
                title={pageCopy.overview.hexTitle}
                items={supervisionHexItems}
                loading={dashboardLoading && !dashboard}
              />

              <MspPriorityPanel
                title={pageCopy.overview.priorityTitle}
                countLabel={
                  priorityActions.length > 0 ? String(priorityActions.length) : undefined
                }
                headerAction={
                  priorityActions.length > 0 ? (
                    <button
                      type="button"
                      className={styles.filterClear}
                      onClick={() => goToDevices("todo")}
                    >
                      {pageCopy.overview.viewAll}
                    </button>
                  ) : null
                }
                items={supervisionPriorityItems}
                onItemClick={(item) => onEquipmentOpen?.(item.equipment)}
                emptyIcon="mdi:shield-check-outline"
                emptyTitle={pageCopy.priority.emptyTitle}
                emptyText={pageCopy.priority.emptyText}
              />
            </div>
          ) : null}

          {activeTab === "devices" && !error ? devicesContent : null}

          {activeTab === "alert-rules" && !error ? (
            <SupervisionAlertRulesPanel
              catalog={alertRulesCatalog}
              rules={alertRules}
              isAdmin={isAdmin}
              onSaved={applyRules}
            />
          ) : null}
              </div>
            </div>
            )}
            </div>
          </main>
        </div>
      </div>
      <ProFeaturePromoModal
        open={Boolean(proPromoKey)}
        featureKey={proPromoKey}
        onClose={() => setProPromoKey(null)}
      />
    </div>
  );
}
