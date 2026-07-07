import JSZip from "jszip";
import { saveAs } from "file-saver";

import {
  REPORT_META,
  buildExportCommentsEmptyHtml,
  buildExportHeaderHtml,
  buildReportDocumentHtml,
  buildReportPeriodLabel,
} from "./exportRapportHtmlTemplate";

/**
 * Collecte les règles CSS des feuilles de style du document (pour l'export HTML).
 */
function collectDocumentCSS() {
  let css = "";
  try {
    for (const sheet of document.styleSheets) {
      try {
        if (!sheet.cssRules) continue;
        for (const rule of sheet.cssRules) {
          css += rule.cssText + "\n";
        }
      } catch {
        // Feuilles externes ou CORS
      }
    }
  } catch (e) {
    console.warn("Export rapport: collecte CSS", e);
  }
  return css;
}

/**
 * Génère le HTML complet pour un rapport (infrastructure, cybersecurite ou services).
 */
function buildReportHTML(sectionClone, commentsHtml, config, reportType) {
  const clientName = config?.client?.name || config?.client?.nom || "CLIENT";
  const meta = REPORT_META[reportType] || { label: "de monitoring" };
  const documentTitle = `${clientName} - ${meta.label}`;
  const periodLabel = buildReportPeriodLabel(config?.client);

  const headerHtml = buildExportHeaderHtml({
    clientName,
    periodLabel,
    reportType,
  });

  const commentsBlock = commentsHtml || buildExportCommentsEmptyHtml();

  const bodyContent = `
  ${headerHtml}
  <main class="vex-main">
    ${sectionClone.outerHTML}
    ${commentsBlock}
  </main>`;

  return buildReportDocumentHtml({
    documentTitle,
    collectedCss: collectDocumentCSS(),
    bodyContent,
  });
}

/**
 * Génère un blob ZIP des rapports HTML (sans téléchargement).
 * @returns {Promise<{ blob: Blob, fileName: string }>}
 */
export async function buildRapportZipBlob(ref, config) {
  if (!ref?.current) {
    throw new Error(
      "Contenu du résumé non disponible. Ouvrez l'étape « Résumé du rapport » puis réessayez."
    );
  }
  if (!config?.client) {
    throw new Error("Configuration client manquante.");
  }

  const root = ref.current;
  const sections = [
    { type: "infrastructure", selector: '[data-export-section="infrastructure"]' },
    { type: "cybersecurite", selector: '[data-export-section="cybersecurite"]' },
    { type: "services", selector: '[data-export-section="services"]' },
  ];

  const zip = new JSZip();
  const clientName = (config.client.name || config.client.nom || "CLIENT").toString().replace(/\s+/g, " ");
  const fileNames = {
    infrastructure: `${clientName} - Rapport d'infrastructure.html`,
    cybersecurite: `${clientName} - Rapport de cybersécurité.html`,
    services: `${clientName} - Rapport des services.html`,
  };

  const commentsEl = root.querySelector('[data-export-comments="true"]');
  const commentsHtml = commentsEl ? commentsEl.outerHTML : "";

  for (const { type, selector } of sections) {
    const el = root.querySelector(selector);
    if (!el) continue;
    const clone = el.cloneNode(true);
    if (clone.style) {
      clone.style.display = "block";
    }
    const html = buildReportHTML(clone, commentsHtml, config, type);
    zip.file(fileNames[type], html);
  }

  if (Object.keys(zip.files).length === 0) {
    throw new Error("Aucun rapport à exporter. Ouvrez l'étape « Résumé du rapport » puis réessayez.");
  }

  const start = config.client.reportStartDate;
  const end = config.client.reportEndDate;
  let zipFileName = "RAPPORTS MONITORING";
  if (start && end) {
    const formatZipDate = (d) => {
      try {
        const date = new Date(d);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      } catch {
        return "";
      }
    };
    zipFileName = `RAPPORTS ${formatZipDate(start)} - ${formatZipDate(end)}`;
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, fileName: `${zipFileName}.zip` };
}

/**
 * Génère et télécharge un ZIP contenant les 3 rapports HTML (Infrastructure, Cybersécurité, Services).
 * @param {React.RefObject} ref - Ref du conteneur ayant les 3 sections avec data-export-section
 * @param {Object} config - { client } (client du rapport)
 * @returns {Promise<void>}
 */
export async function exportRapportAsZIP(ref, config) {
  const { blob, fileName } = await buildRapportZipBlob(ref, config);
  saveAs(blob, fileName);
}
