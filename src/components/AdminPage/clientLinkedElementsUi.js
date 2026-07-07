import { getClientDeletionBlockers, sumEquipmentCounts } from "./clientDeletionUi";
import { getBlockerLabel } from "./adminClientsI18n";

const INFRA_KEY = "equipment_infra";

export function getLinkedElementsTotal(client) {
  const blockers = getClientDeletionBlockers(client);
  const fromBlockers = blockers.reduce((sum, blocker) => sum + (Number(blocker.count) || 0), 0);
  if (fromBlockers > 0) return fromBlockers;

  const equipmentTotal = sumEquipmentCounts(client);
  return equipmentTotal > 0 ? equipmentTotal : 0;
}

export function getLinkedElementsSummary(client) {
  const blockers = getClientDeletionBlockers(client);
  const total = getLinkedElementsTotal(client);

  return {
    blockers,
    total,
    hasAny: total > 0,
  };
}

/** Lignes détaillées pour la modale « Éléments liés » */
export function getModalBlockerRows(client, locale = "fr") {
  const blockers = getClientDeletionBlockers(client);
  if (blockers.length > 0) {
    return blockers.map((blocker) => ({
      key: blocker.key,
      label: getBlockerLabel(locale, blocker.key, blocker.label),
      value: String(blocker.count ?? 0),
    }));
  }

  const equipmentTotal = sumEquipmentCounts(client);
  if (equipmentTotal > 0) {
    return [
      {
        key: INFRA_KEY,
        label: getBlockerLabel(locale, INFRA_KEY, "Équipements infrastructure"),
        value: String(equipmentTotal),
      },
    ];
  }

  return [];
}
