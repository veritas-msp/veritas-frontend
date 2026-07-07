/**
 * API dédiée au rapport de monitoring : récupère événements/notifications
 * et disponibilité Check MK pour la période du rapport uniquement.
 * N'utilise pas les appels de EquipmentDetailPage (equipment.js).
 */

import API_BASE_URL from "../config";

/**
 * Récupère les événements/notifications et la disponibilité pour un host
 * sur la période du rapport (startTime, endTime).
 * @param {string} hostName - Nom du host Check MK
 * @param {string} startTime - Date de début période (ISO)
 * @param {string} endTime - Date de fin période (ISO)
 * @param {string|null} site - Site Check MK (optionnel)
 * @returns {Promise<{ events: object, availability: object }>}
 */
export async function getCheckMKReportPeriodData(hostName, startTime, endTime, site = null) {
  const url = new URL(`${API_BASE_URL}/checkmk/report-period/${encodeURIComponent(hostName)}`);
  url.searchParams.append("start_time", startTime);
  url.searchParams.append("end_time", endTime);
  if (site) url.searchParams.append("site", site);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
