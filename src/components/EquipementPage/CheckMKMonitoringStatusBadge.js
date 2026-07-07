import React from 'react';
import { Icon } from '@iconify/react';
import SmartTooltip from '../SmartTooltip';
import { formatRelativeFrench } from './checkmkMonitoringUtils';
import styles from './CheckMKMonitoringStatusBadge.module.css';

const STATUS_CONFIG = {
  critical: {
    className: styles.badgeCritical,
    icon: 'mdi:alert-circle',
    shortLabel: 'Critique',
  },
  warning: {
    className: styles.badgeWarning,
    icon: 'mdi:alert',
    shortLabel: 'Warning',
  },
  ok: {
    className: styles.badgeOk,
    icon: 'mdi:check-circle',
    shortLabel: 'OK',
  },
  no_data: {
    className: styles.badgeNoData,
    icon: 'mdi:database-off',
    shortLabel: '-',
  },
};

function buildTooltip(summary) {
  if (!summary) return 'Non mappé CheckMK';
  if (summary.status === 'no_data') {
    return 'Mappé CheckMK · aucune donnée synchronisée en base';
  }

  const lines = [];
  if (summary.critServices > 0) {
    lines.push(`${summary.critServices} service${summary.critServices > 1 ? 's' : ''} en critique`);
  }
  if (summary.warnServices > 0) {
    lines.push(`${summary.warnServices} service${summary.warnServices > 1 ? 's' : ''} en warning`);
  }
  if (summary.recentCritAlerts > 0) {
    lines.push(`${summary.recentCritAlerts} alerte${summary.recentCritAlerts > 1 ? 's' : ''} critique${summary.recentCritAlerts > 1 ? 's' : ''} (7 j)`);
  }
  if (summary.recentWarnAlerts > 0) {
    lines.push(`${summary.recentWarnAlerts} alerte${summary.recentWarnAlerts > 1 ? 's' : ''} warning (7 j)`);
  }
  if (lines.length === 0) {
    lines.push('Aucun service critique ni alerte récente');
  }
  if (summary.lastSyncedAt) {
    lines.push(`Sync : ${formatRelativeFrench(summary.lastSyncedAt)}`);
  }
  return lines.join(' · ');
}

function buildBadgeText(summary) {
  if (!summary || summary.status === 'no_data') return '-';
  if (summary.status === 'critical') {
    const parts = [];
    if (summary.critServices > 0) parts.push(`${summary.critServices} crit`);
    if (summary.recentCritAlerts > 0) parts.push(`${summary.recentCritAlerts} alerte`);
    return parts.join(' · ') || 'Crit';
  }
  if (summary.status === 'warning') {
    const parts = [];
    if (summary.warnServices > 0) parts.push(`${summary.warnServices} warn`);
    if (summary.recentWarnAlerts > 0) parts.push(`${summary.recentWarnAlerts} notif`);
    return parts.join(' · ') || 'Warn';
  }
  return 'OK';
}

export default function CheckMKMonitoringStatusBadge({
  summary,
  isMapped = false,
  compact = false,
  dotOnly = false,
}) {
  if (!isMapped) return null;

  const status = summary?.status || 'no_data';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.no_data;
  const tooltip = buildTooltip(summary);
  const text = dotOnly ? '' : buildBadgeText(summary);

  return (
    <SmartTooltip content={tooltip}>
      <span
        className={`${styles.badge} ${cfg.className} ${dotOnly ? styles.dotOnly : ''} ${compact ? styles.dotOnly : ''}`}
        aria-label={tooltip}
      >
        <Icon icon={cfg.icon} className={styles.badgeIcon} />
        {!compact && !dotOnly && status !== 'ok' && (
          <span className={styles.badgeText}>{text}</span>
        )}
        {!compact && !dotOnly && status === 'ok' && summary?.status === 'ok' && (
          <span className={styles.badgeText}>OK</span>
        )}
      </span>
    </SmartTooltip>
  );
}

export function getEquipmentDbId(equipment) {
  return equipment?.rawData?.id || equipment?.id || null;
}

export function isCheckMKMappableType(type) {
  return ['Serveurs', 'NAS', 'Stockage', 'Firewalls', 'Switch', 'BorneWifi', 'Alimentation', 'Routeur', 'TOIP'].includes(type);
}
