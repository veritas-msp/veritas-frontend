export const BACKUP_JOB_H24_MS = 24 * 60 * 60 * 1000;
export const BACKUP_JOB_H48_MS = 48 * 60 * 60 * 1000;

const STATUS_ORDER = { critical: 0, warning: 1, ok: 2, unmapped: 3, hycu: 4 };

export function isBackupJobMapped(job) {
  if (!job) return false;
  if (job.isMapped) return true;
  const mapping = job.checkmkMapping;
  if (mapping?.checkmk_host_name || mapping?.checkmk_service_name) return true;
  const raw = job.rawData;
  return !!(raw?.checkmk_host_name || raw?.checkmk_service_name);
}

/** critical/warning/ok = jobs mappés CheckMK | unmapped = pas de mapping | hycu = non synchronisable */
export function getBackupJobStatus(job) {
  if (!job || job.type !== 'job') return 'ok';
  if (job.instanceLogiciel === 'HYCU Backup') return 'hycu';
  if (!isBackupJobMapped(job)) return 'unmapped';

  const lastBackupStart = job.last_backup_start ?? job.rawData?.last_backup_start;
  const lastBackupMs = lastBackupStart ? new Date(lastBackupStart).getTime() : null;
  if (lastBackupMs == null || Number.isNaN(lastBackupMs)) return 'critical';

  const age = Date.now() - lastBackupMs;
  if (age > BACKUP_JOB_H48_MS) return 'critical';
  if (age > BACKUP_JOB_H24_MS) return 'warning';
  return 'ok';
}

export function getBackupJobStatusLabel(status) {
  switch (status) {
    case 'critical':
      return 'En erreur';
    case 'warning':
      return 'Retard';
    case 'ok':
      return 'OK';
    case 'hycu':
      return 'HYCU';
    case 'unmapped':
      return 'Non mappé';
    default:
      return '-';
  }
}

export function getBackupJobStatusTitle(status) {
  switch (status) {
    case 'critical':
      return 'Dernière sauvegarde il y a plus de 48 h ou inconnue';
    case 'warning':
      return 'Dernière sauvegarde il y a plus de 24 h';
    case 'ok':
      return 'Dernière sauvegarde il y a moins de 24 h';
    case 'hycu':
      return 'Job HYCU · non synchronisable avec CheckMK';
    case 'unmapped':
      return 'Job non mappé CheckMK · aucune alerte tant que le mapping n\'est pas configuré';
    default:
      return '';
  }
}

export function getBackupJobRowStyle(status) {
  switch (status) {
    case 'critical':
      return { backgroundColor: '#fee2e2', fontWeight: 'bold' };
    case 'warning':
      return { backgroundColor: '#ffedd5', fontWeight: 'bold' };
    case 'ok':
      return { backgroundColor: '#dcfce7' };
    default:
      return { backgroundColor: '#f9fafb' };
  }
}

export function compareBackupJobsByStatus(a, b) {
  const sa = STATUS_ORDER[getBackupJobStatus(a)] ?? 9;
  const sb = STATUS_ORDER[getBackupJobStatus(b)] ?? 9;
  return sa - sb;
}

export function computeBackupJobStats(jobs) {
  const stats = { total: 0, critical: 0, warning: 0, ok: 0, unmapped: 0, hycu: 0, issues: 0, monitored: 0 };
  (jobs || []).forEach((job) => {
    if (job?.type !== 'job') return;
    stats.total += 1;
    const status = getBackupJobStatus(job);
    if (status === 'critical') stats.critical += 1;
    else if (status === 'warning') stats.warning += 1;
    else if (status === 'ok') stats.ok += 1;
    else if (status === 'unmapped') stats.unmapped += 1;
    else if (status === 'hycu') stats.hycu += 1;
    if (status === 'critical' || status === 'warning' || status === 'ok') stats.monitored += 1;
  });
  stats.issues = stats.critical + stats.warning;
  return stats;
}
