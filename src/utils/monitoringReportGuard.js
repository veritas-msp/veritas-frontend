export const MONITORING_REPORT_LEAVE_MESSAGE =
  "Un rapport de monitoring est en cours d'élaboration. Voulez-vous vraiment quitter ? Les modifications non sauvegardées seront perdues.";

export function confirmLeaveMonitoringReport() {
  return window.confirm(MONITORING_REPORT_LEAVE_MESSAGE);
}

export function isMonitoringReportBuilderActive(builderType, builderClient) {
  return builderType === "monitoring" && !!builderClient;
}
