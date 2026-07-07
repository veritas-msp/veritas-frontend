/** Familles matériel comptées comme « périphérique renseigné » pour le rapport monitoring. */
export const RAPPORT_PERIPHERAL_EQUIPMENT_TYPES = [
  "Serveurs",
  "NAS",
  "SAN",
  "Stockage",
  "Firewalls",
  "Internet",
  "Switch",
  "BorneWifi",
  "Alimentation",
  "Routeur",
  "TOIP",
  "Ordinateurs",
];

function isConfiguredPeripheral(item) {
  if (!item || typeof item !== "object" || item.is_active === false) return false;
  const name = String(item.name || item.nom || "").trim();
  return Boolean(name) || item.id != null;
}

export function countConfiguredPeripherals(equipements) {
  if (!equipements || typeof equipements !== "object") return 0;
  let total = 0;
  for (const type of RAPPORT_PERIPHERAL_EQUIPMENT_TYPES) {
    const bucket = equipements[type];
    if (!Array.isArray(bucket)) continue;
    total += bucket.filter(isConfiguredPeripheral).length;
  }
  return total;
}

export function hasConfiguredPeripherals(equipements) {
  return countConfiguredPeripherals(equipements) > 0;
}
