export {
  ATTACHMENT_FORMATS_LABEL,
  PORTAL_OPEN_STATUSES,
  getClientPortalCopy,
} from "./clientPortalI18n";

import { getClientPortalCopy } from "./clientPortalI18n";

/** @deprecated Use getClientPortalCopy(locale).getTicketStatus */
export const PORTAL_TICKET_STATUS = {
  new: "Nouveau",
  open: "Ouvert",
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Fermé",
};

/** @deprecated Use getClientPortalCopy(locale).getTicketPriority */
export const PORTAL_TICKET_PRIORITY = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

/** @deprecated Use getClientPortalCopy(locale).getTicketTypes */
export const PORTAL_TICKET_TYPES = [
  { key: "incident", label: "Incident", hint: "Panne ou interruption de service", icon: "mdi:alert-circle-outline" },
  { key: "demande", label: "Demande", hint: "Besoin ou question", icon: "mdi:hand-extended-outline" },
];

export function formatPortalDateTime(value, locale = "fr") {
  return getClientPortalCopy(locale).formatPortalDateTime(value);
}
