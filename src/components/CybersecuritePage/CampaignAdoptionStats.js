// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { useState, useEffect } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaCheckCircle, FaClock, FaSpinner, FaDownload } from "react-icons/fa";
import { toast } from 'react-toastify';
import { launchCampaign, finishCampaign, getCampaignStats, getCampaignReportUrl } from "../../api/campaigns";
import SmartTooltip from "../SmartTooltip";
import styles from "./CampaignAdoptionStats.module.css";

// ──────────────────────────────
// 🧩 Composant : CampaignAdoptionStats
// ──────────────────────────────
export default function CampaignAdoptionStats({ campaign, clientId, stats: propsStats, onCampaignUpdate, onStatsUpdate }) {
  const [stats, setStats] = useState(propsStats || null);
  const [loading, setLoading] = useState(!propsStats);
  const [actionLoading, setActionLoading] = useState(false);

  // Utiliser les stats passées en props si disponibles, sinon charger
  useEffect(() => {
    if (propsStats) {
      setStats(propsStats);
      setLoading(false);
    } else if (campaign && clientId) {
      loadStats();
    }
  }, [propsStats, campaign, clientId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await getCampaignStats(clientId, campaign.id);
      setStats(statsData);
      // Notifier le parent si callback fourni
      if (onStatsUpdate) {
        onStatsUpdate(statsData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className={styles.adoptionBlock}>
        <h3 className={styles.groupTitle}>Statistiques d'adoption de la campagne</h3>
        <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.loadingIcon} />
          <p>Chargement des statistiques d'adoption...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const hasStartSnapshot = stats.start !== null && stats.start !== undefined;
  const hasEndSnapshot = stats.end !== null && stats.end !== undefined;

  const renderSnapshot = (label, data) => {
    if (!data) {
      return (
        <div className={styles.snapshotBlock}>
          <div className={styles.snapshotBlockTitle}>{label}</div>
          <div className={styles.snapshotEmpty}>-</div>
        </div>
      );
    }
    const adminMfa = (data.adminMfaPercentage ?? data.mfaPercentage ?? 0);
    const nonAdminMfa = (data.nonAdminMfaPercentage ?? data.userMfaPercentage ?? data.mfaPercentage ?? 0);
    const nonAdminCount = data.nonAdminCount ?? (data.userCount != null && data.adminCount != null ? data.userCount - data.adminCount : 0);
    return (
      <div className={styles.snapshotBlock}>
        <div className={styles.snapshotBlockTitle}>{label}</div>
        <div className={styles.snapshotBlockDate}>
          {new Date(data.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <dl className={styles.snapshotKpis}>
          <div className={styles.snapshotKpi}>
            <dt>Admins</dt>
            <dd>{data.adminCount}</dd>
          </div>
          <div className={styles.snapshotKpi}>
            <dt>Non admin</dt>
            <dd>{nonAdminCount}</dd>
          </div>
          <div className={styles.snapshotKpi}>
            <dt>MFA admins</dt>
            <dd>{Number(adminMfa).toFixed(1)}%</dd>
          </div>
          <div className={styles.snapshotKpi}>
            <dt>MFA non admin</dt>
            <dd>{Number(nonAdminMfa).toFixed(1)}%</dd>
          </div>
        </dl>
      </div>
    );
  };

  const handleDownloadReport = () => {
    if (!clientId || !campaign?.id) return;
    const reportUrl = getCampaignReportUrl(clientId, campaign.id);
    window.open(reportUrl, '_blank');
  };

  return (
    <div className={styles.adoptionBlock}>
      <h3 className={styles.groupTitle}>Statistiques d'adoption de la campagne</h3>

      <div className={styles.snapshotsRow}>
        {renderSnapshot('Début', stats.start)}
        {renderSnapshot('Fin', stats.end)}
      </div>

      {hasStartSnapshot && hasEndSnapshot && (
        <div className={styles.comparisonRow}>
          <div className={styles.comparisonKpis}>
            {stats.comparison && (
              <>
                <div className={styles.comparisonKpi}>
                  <span className={styles.comparisonKpiLabel}>MFA admins</span>
                  <span className={styles.comparisonKpiVal}>
                    {(stats.comparison.adminMfaPercentage?.start ?? 0).toFixed(1)}% → {(stats.comparison.adminMfaPercentage?.end ?? 0).toFixed(1)}%
                    {(stats.comparison.adminMfaPercentage?.change != null) && (
                      <span className={styles.comparisonDelta}> {stats.comparison.adminMfaPercentage.change >= 0 ? '+' : ''}{stats.comparison.adminMfaPercentage.change.toFixed(1)}%</span>
                    )}
                  </span>
                </div>
                <div className={styles.comparisonKpi}>
                  <span className={styles.comparisonKpiLabel}>MFA non admin</span>
                  <span className={styles.comparisonKpiVal}>
                    {(stats.comparison.userMfaPercentage?.start ?? 0).toFixed(1)}% → {(stats.comparison.userMfaPercentage?.end ?? 0).toFixed(1)}%
                    {(stats.comparison.userMfaPercentage?.change != null) && (
                      <span className={styles.comparisonDelta}> {stats.comparison.userMfaPercentage.change >= 0 ? '+' : ''}{stats.comparison.userMfaPercentage.change.toFixed(1)}%</span>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
          <SmartTooltip as="span" content="Télécharger le rapport PDF">
            <button
              type="button"
              className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
              onClick={handleDownloadReport}
              aria-label="Télécharger le rapport PDF"
            >
              <FaDownload className={styles.headerActionIcon} />
            </button>
          </SmartTooltip>
        </div>
      )}
    </div>
  );
}
