import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { getIconPath } from "../../../../utils/assetHelper";
import InstanceSauvegardeModal from "../../../CybersecuritePage/InstanceSauvegardeModal";
import AddJobModal from "../../../CybersecuritePage/AddJobModal";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import API_BASE_URL from "../../../../config";
import styles from "../RapportMonitoringBuilder.module.css";
import {
  MonitoringStepShell,
  MonitoringStepSection,
  MonitoringStepSyncButton,
  MonitoringStepTableWrap,
} from "../MonitoringStepLayout";

function formatDate(raw) {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? `${raw}` : d.toLocaleDateString("fr-FR");
  } catch {
    return `${raw}`;
  }
}

function formatDateTime(raw) {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? `${raw}` : d.toLocaleString("fr-FR");
  } catch {
    return `${raw}`;
  }
}

function getStatusLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s === "SUCCESS") return "Succes";
  if (s === "WARNING") return "Warning";
  if (s === "FAIL" || s === "FAILED") return "Erreur";
  if (s === "RUNNING") return "En cours";
  return s || "-";
}

function renderInstanceIcon(inst) {
  if (inst.logiciel === "Veeam") {
    return (
      <img
        src={getIconPath("veeam.png")}
        alt="Veeam"
        style={{ width: 20, height: 20, borderRadius: 4, marginRight: "0.5rem", verticalAlign: "middle" }}
      />
    );
  }
  if (inst.logiciel === "HYCU Backup") {
    return (
      <img
        src={getIconPath("hycu.png")}
        alt="HYCU Backup"
        style={{ width: 20, height: 20, borderRadius: 4, marginRight: "0.5rem", verticalAlign: "middle" }}
      />
    );
  }
  return (
    <Icon
      icon="mdi:database-sync-outline"
      width={20}
      height={20}
      style={{ marginRight: "0.5rem", verticalAlign: "middle" }}
    />
  );
}

function getAuthHeaders() {
  return {};
}

export default function SauvegardeStep({
  client,
  onRefreshClient,
  onOpenComments,
  onTicketCreatedForEquipment,
  commentCounts = {},
  ticketCounts = {},
  highlightedEquipmentKey,
}) {
  const rawSauvegarde = client?.equipements?.Sauvegarde;
  const instances = Array.isArray(rawSauvegarde?.instances) ? rawSauvegarde.instances : [];
  const clientId = client?.id ?? client?.uuid;
  const clientName = client?.raison_sociale || client?.name || client?.nom || "";

  const standardInstances = instances.filter(
    (inst) =>
      inst.logiciel !== "Active Backup for Microsoft 365" && inst.logiciel !== "HyperBackup"
  );
  const activeBackupInstances = instances.filter(
    (inst) => inst.logiciel === "Active Backup for Microsoft 365"
  );
  const hyperBackupInstances = instances.filter((inst) => inst.logiciel === "HyperBackup");

  const [jobsSyncLoading, setJobsSyncLoading] = useState(false);
  const [editInstanceModal, setEditInstanceModal] = useState({ open: false, instance: null });
  const [editJobModal, setEditJobModal] = useState({ open: false, job: null, instance: null });

  const syncJobsFromCheckMK = async () => {
    try {
      setJobsSyncLoading(true);
      const res = await fetch(`${API_BASE_URL}/checkmk/save-jobs/sync`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId: clientId ?? null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la synchronisation des jobs");
        return;
      }
      toast.success(
        data.message && data.updated != null
          ? `${data.message} (${data.updated} mis à jour)`
          : "Synchronisation terminée"
      );
      if (typeof onRefreshClient === "function") await onRefreshClient();
    } catch (err) {
      console.error("Sync jobs CheckMK:", err);
      toast.error("Erreur lors de la synchronisation des jobs");
    } finally {
      setJobsSyncLoading(false);
    }
  };

  // Tous les jobs de toutes les instances, avec référence à l'instance
  const allJobs = instances.flatMap((inst, idx) => {
    const instanceName = inst.nom || inst.logiciel || `instance-${idx}`;
    const instanceLabel = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
    const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
    return jobs.map((job) => ({
      ...job,
      _instanceKey: instanceName,
      _instanceLabel: instanceLabel,
      _instanceLogiciel: inst.logiciel,
      _instance: inst,
    }));
  });

  const ACTIVE_BACKUP_MODULES = [
    { key: "oneDrive", label: "OneDrive", icon: "mdi:microsoft-onedrive" },
    { key: "sharePoint", label: "SharePoint", icon: "mdi:microsoft-sharepoint" },
    { key: "exchange", label: "Exchange", icon: "mdi:email-outline" },
    { key: "teams", label: "Teams", icon: "mdi:microsoft-teams" },
    { key: "calendar", label: "Calendar", icon: "mdi:calendar" },
    { key: "contacts", label: "Contacts", icon: "mdi:contacts-outline" },
  ];

  const renderStandardInstanceTable = (list, title) => {
    if (!list || list.length === 0) return null;
    return (
      <MonitoringStepSection title={title} count={list.length}>
        <MonitoringStepTableWrap scrollable>
          <table className={equipmentStyles.equipmentTable}>
            <thead>
              <tr>
                {["Solution", "Nom", "Serveur", "Expiration", "Nombre de jobs", "Actions"].map(
                  (label) => (
                    <th key={label}>
                      <span className={equipmentStyles.thContent}>{label}</span>
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {list.map((inst, idx) => {
                const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
                const instanceLabel = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
                const server = inst.server || inst.serveur || inst.serveurLie || "-";
                return (
                  <tr key={inst.id || idx} className={equipmentStyles.equipmentRow}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center" }}>
                        {renderInstanceIcon(inst)}
                        {inst.logiciel || "-"}
                      </span>
                    </td>
                    <td>{instanceLabel}</td>
                    <td>{server}</td>
                    <td>{inst.expiration ? formatDate(inst.expiration) : "-"}</td>
                    <td>{jobs.length}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={equipmentStyles.mappingActionButton}
                        title="Éditer l'instance"
                        onClick={() => setEditInstanceModal({ open: true, instance: inst })}
                      >
                        <Icon icon="mdi:pencil" width={16} height={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </MonitoringStepTableWrap>
      </MonitoringStepSection>
    );
  };

  const renderActiveBackupInstanceTable = (list, title) => {
    if (!list || list.length === 0) return null;
    return (
      <MonitoringStepSection title={title} count={list.length}>
        <MonitoringStepTableWrap scrollable>
          <table className={equipmentStyles.equipmentTable}>
            <thead>
              <tr>
                {["Nom", "Modules activés", "Stockage de destination", "Actions"].map((label) => (
                  <th key={label}>
                    <span className={equipmentStyles.thContent}>{label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((inst, idx) => {
                const modules = inst.activeBackupModules || {};
                const storage = inst.activeBackupStorage || "-";
                const instanceLabel = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
                return (
                  <tr key={inst.id || idx} className={equipmentStyles.equipmentRow}>
                    <td>{instanceLabel}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                        {ACTIVE_BACKUP_MODULES.map((m) => {
                          const isActive = !!modules[m.key];
                          return (
                            <span
                              key={m.key}
                              title={`${m.label} : ${isActive ? "activé" : "inactif"}`}
                              style={{ opacity: isActive ? 1 : 0.35, display: "inline-flex" }}
                            >
                              <Icon icon={m.icon} width={18} height={18} />
                            </span>
                          );
                        })}
                      </span>
                    </td>
                    <td>{storage}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={equipmentStyles.mappingActionButton}
                        title="Éditer l'instance"
                        onClick={() => setEditInstanceModal({ open: true, instance: inst })}
                      >
                        <Icon icon="mdi:pencil" width={16} height={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </MonitoringStepTableWrap>
      </MonitoringStepSection>
    );
  };

  const renderHyperBackupInstanceTable = (list, title) => {
    if (!list || list.length === 0) return null;
    const formatNas = (v) => {
      if (!v || typeof v !== "string") return "-";
      return v.replace(/^(NAS|SAN|DISQUE)-/, "").replace(/-\d+$/, "") || v;
    };
    return (
      <MonitoringStepSection title={title} count={list.length}>
        <MonitoringStepTableWrap scrollable>
          <table className={equipmentStyles.equipmentTable}>
            <thead>
              <tr>
                {["Nom", "NAS d'origine", "NAS de destination", "Nombre de jobs", "Actions"].map(
                  (label) => (
                    <th key={label}>
                      <span className={equipmentStyles.thContent}>{label}</span>
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {list.map((inst, idx) => {
                const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
                const instanceLabel = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
                const source = formatNas(inst.hyperbackupSource);
                const dest = formatNas(inst.hyperbackupDestination);
                return (
                  <tr key={inst.id || idx} className={equipmentStyles.equipmentRow}>
                    <td>{instanceLabel}</td>
                    <td>{source}</td>
                    <td>{dest}</td>
                    <td>{jobs.length}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={equipmentStyles.mappingActionButton}
                        title="Éditer l'instance"
                        onClick={() => setEditInstanceModal({ open: true, instance: inst })}
                      >
                        <Icon icon="mdi:pencil" width={16} height={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </MonitoringStepTableWrap>
      </MonitoringStepSection>
    );
  };

  return (
    <MonitoringStepShell>
      {/* Instances (Veeam, HYCU) : Solution, Nom, Serveur, Expiration, Nb jobs */}
      {standardInstances.length > 0 && renderStandardInstanceTable(standardInstances, "Instances")}
      {instances.length === 0 && (
        <MonitoringStepSection
          title="Instances"
          isEmpty
          emptyMessage="Aucune instance de sauvegarde."
        />
      )}

      {/* Active Backup for Microsoft 365 : Nom, Modules activés, Stockage */}
      {renderActiveBackupInstanceTable(activeBackupInstances, "Active Backup for Microsoft 365")}

      {/* HyperBackup : Nom, NAS d'origine, NAS de destination, Nb jobs */}
      {renderHyperBackupInstanceTable(hyperBackupInstances, "HyperBackup")}

      {/* Table Jobs (tous les jobs, comme onglet Cybersécurité) */}
      <MonitoringStepSection
        title="Jobs"
        count={allJobs.length}
        isEmpty={allJobs.length === 0}
        emptyMessage="Aucun job de sauvegarde."
        headerActions={
          <MonitoringStepSyncButton
            onClick={syncJobsFromCheckMK}
            loading={jobsSyncLoading}
            title="Synchroniser durée et date de dernière sauvegarde depuis CheckMK"
          />
        }
      >
        <MonitoringStepTableWrap scrollable>
          <table className={equipmentStyles.equipmentTable}>
            <thead>
              <tr>
                {[
                  "Nom",
                  "Type de sauvegarde",
                  "Instance",
                  "Serveur",
                  "Destination",
                  "Régularité",
                  "Horaire",
                  "Rétention",
                  "Dernière sauvegarde",
                  "Durée",
                  "Dernière synchro",
                  "Dernier statut",
                  "Actions",
                ].map((label) => (
                  <th key={label}>
                    <span className={equipmentStyles.thContent}>{label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
                {allJobs.map((job, index) => {
                  const jobName = job.nom || job.jobName || `job-${index}`;
                  const instanceName = job._instanceKey;
                  const equipmentKey = `Sauvegarde:job:${instanceName}:${jobName}`;
                  const commentCount = commentCounts?.[equipmentKey] ?? 0;
                  const ticketCount = ticketCounts?.[equipmentKey] ?? 0;
                  const isHighlighted =
                    highlightedEquipmentKey != null &&
                    String(highlightedEquipmentKey) === String(equipmentKey);
                  const item = { nom: jobName, name: jobName, ...job };

                  const lastBackupStart =
                    job.last_backup_start ??
                    job.lastBackupStart ??
                    job.last_backup_date ??
                    job.lastBackupDate;
                  const lastBackupDuration =
                    job.last_backup_duration ?? job.lastBackupDuration;
                  const lastBackupSync = job.last_backup_date ?? job.lastBackupDate;

                  const typeSauvegarde = job.typeSauvegarde || job.type;
                  const typeLabel = typeSauvegarde
                    ? typeSauvegarde.charAt(0).toUpperCase() + typeSauvegarde.slice(1)
                    : "-";
                  const destination =
                    job._instanceLogiciel === "HYCU Backup" ? "DataCenter PSI" : (job.destination || job.serveurLie || job.source || "-");

                  const isHycuJob = job._instanceLogiciel === "HYCU Backup";
                  const lastBackupMs = lastBackupStart
                    ? new Date(lastBackupStart).getTime()
                    : null;
                  const now = Date.now();
                  const H24 = 24 * 60 * 60 * 1000;
                  const H48 = 48 * 60 * 60 * 1000;
                  const isRed =
                    !isHycuJob && (lastBackupMs == null || now - lastBackupMs > H48);
                  const isOrange =
                    !isHycuJob && !isRed && lastBackupMs != null && now - lastBackupMs > H24;
                  const rowAlertStyle = isHycuJob
                    ? { backgroundColor: "#f9fafb" }
                    : isRed
                      ? { backgroundColor: "#fee2e2", fontWeight: "bold" }
                      : isOrange
                        ? { backgroundColor: "#ffedd5", fontWeight: "bold" }
                        : { backgroundColor: "#dcfce7" };

                  return (
                    <tr
                      key={`${instanceName}-${jobName}-${index}`}
                      className={`${equipmentStyles.equipmentRow} ${
                        isHighlighted ? styles.infraTableRowHighlight : ""
                      }`}
                      style={rowAlertStyle}
                    >
                      <td>{jobName}</td>
                      <td>{typeLabel}</td>
                      <td>{job._instanceLabel}</td>
                      <td>{job.serveurLie || job.source || "-"}</td>
                      <td>{destination}</td>
                      <td>{job.regularite || "-"}</td>
                      <td>{job.horaire || "-"}</td>
                      <td>{job.retention || "-"}</td>
                      <td>
                        {lastBackupStart
                          ? (() => {
                              try {
                                return formatDateTime(lastBackupStart);
                              } catch {
                                return String(lastBackupStart);
                              }
                            })()
                          : "-"}
                      </td>
                      <td>{lastBackupDuration || "-"}</td>
                      <td>
                        {lastBackupSync
                          ? (() => {
                              try {
                                return formatDateTime(lastBackupSync);
                              } catch {
                                return String(lastBackupSync);
                              }
                            })()
                          : "-"}
                      </td>
                      <td>{getStatusLabel(job.lastStatus)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className={equipmentStyles.mappingActions}>
                          <div className={equipmentStyles.mappingActionsGroup}>
                        {typeof onOpenComments === "function" && (
                          <span className={styles.infraActionBadgeWrap}>
                            <button
                              type="button"
                              className={equipmentStyles.mappingActionButton}
                              title="Commentaires"
                              onClick={() =>
                                onOpenComments(item, {
                                  moduleKey: "Sauvegarde",
                                  equipmentKey,
                                })
                              }
                            >
                              <Icon icon="mdi:comment-text-outline" width={16} height={16} />
                            </button>
                            {commentCount > 0 && (
                              <span className={styles.infraCommentBadge}>
                                {commentCount}
                              </span>
                            )}
                          </span>
                        )}
                        {typeof onTicketCreatedForEquipment === "function" && clientId && (
                          <span className={styles.infraActionBadgeWrap}>
                            
                            {ticketCount > 0 && (
                              <span className={styles.infraTicketBadge}>
                                {ticketCount}
                              </span>
                            )}
                          </span>
                        )}
                        <button
                          type="button"
                          className={equipmentStyles.mappingActionButton}
                          title="Éditer le job"
                          onClick={() =>
                            setEditJobModal({
                              open: true,
                              job,
                              instance: job._instance,
                            })
                          }
                        >
                          <Icon icon="mdi:pencil" width={16} height={16} />
                        </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
          </table>
        </MonitoringStepTableWrap>
      </MonitoringStepSection>

      {editInstanceModal.open && editInstanceModal.instance && clientId && (
        <InstanceSauvegardeModal
          open={editInstanceModal.open}
          onClose={() => setEditInstanceModal({ open: false, instance: null })}
          mode="edit"
          instanceType={null}
          clientId={clientId}
          clientName={clientName}
          instance={editInstanceModal.instance}
          clients={[]}
          onSaved={() => {
            if (typeof onRefreshClient === "function") onRefreshClient();
          }}
        />
      )}

      {editJobModal.open && editJobModal.job && editJobModal.instance && clientId && (() => {
        const { _instance, _instanceKey, _instanceLabel, _instanceLogiciel, ...initialJob } = editJobModal.job;
        return (
          <AddJobModal
            open={editJobModal.open}
            onClose={() => setEditJobModal({ open: false, job: null, instance: null })}
            mode="edit"
            clientId={clientId}
            instance={editJobModal.instance}
            initialJob={initialJob}
            clients={[]}
            onSaved={() => typeof onRefreshClient === "function" && onRefreshClient()}
          />
        );
      })()}
    </MonitoringStepShell>
  );
}
