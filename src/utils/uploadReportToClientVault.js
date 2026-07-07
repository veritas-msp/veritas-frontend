import { uploadClientFile } from "../api/clientFiles";

/**
 * Archive un export ZIP de rapport monitoring dans le coffre documentaire client.
 */
export async function uploadReportArchiveToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
}) {
  if (!blob || !clientId) {
    throw new Error("Données insuffisantes pour archiver le rapport.");
  }

  const baseName = String(fileName || "rapport-monitoring")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const zipName = baseName.toLowerCase().endsWith(".zip") ? baseName : `${baseName}.zip`;

  const file = new File([blob], zipName, { type: "application/zip" });

  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description,
    file,
    visibleToClient: Boolean(visibleToClient),
  });
}

/**
 * Archive un PDF de rapport d'intervention dans le coffre documentaire client.
 */
export async function uploadInterventionPdfToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
}) {
  if (!blob || !clientId) {
    throw new Error("Données insuffisantes pour archiver le rapport.");
  }

  const baseName = String(fileName || "rapport-intervention")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const pdfName = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;

  const file = new File([blob], pdfName, { type: "application/pdf" });

  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description,
    file,
    visibleToClient: Boolean(visibleToClient),
  });
}
