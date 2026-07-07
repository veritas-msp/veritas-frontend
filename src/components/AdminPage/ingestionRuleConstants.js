import { buildEmptyFilterRoot } from "../../utils/ticketViewFilterTree";
import {
  MAIL_CRITERION_FIELD_OPTIONS,
  MAIL_CRITERION_OPERATOR_OPTIONS,
  describeExclusionRuleFilters,
  normalizeIngestionAction,
} from "../../utils/mailIngestionRules";

export const CRITERION_FIELD_OPTIONS = MAIL_CRITERION_FIELD_OPTIONS;
export const CRITERION_OPERATOR_OPTIONS = MAIL_CRITERION_OPERATOR_OPTIONS;

export const RULE_ACTION_OPTIONS = [
  { value: "create_ticket_support", label: "Créer un ticket support" },
  {
    value: "create_ticket_services",
    label: "Créer un ticket prestations / services",
    proOnly: true,
  },
  {
    value: "attach_comment",
    label: "Rattacher à un ticket existant (réponse)",
  },
  { value: "ignore_mail", label: "Ignorer" },
];

export const RULE_ACTION_LABELS = {
  create_ticket: "Créer un ticket support",
  create_ticket_support: "Créer un ticket support",
  create_ticket_services: "Créer un ticket prestations / services",
  attach_comment: "Rattacher à un ticket existant (réponse)",
  ignore_mail: "Ignorer",
};

export const INGESTION_RULE_FORM_SECTIONS = [
  {
    id: "general",
    label: "Paramètres",
    description: "Nom, action et statut",
    icon: "mdi:tune-variant",
  },
  {
    id: "criteria",
    label: "Critères",
    description: "Conditions de correspondance",
    icon: "mdi:filter-outline",
  },
];

export const buildDefaultExclusionCriterion = () => ({
  id: `criterion-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  field: "subject",
  operator: "contains",
  value: "",
});

export const buildDefaultExclusionRule = () => ({
  id: `exclude-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  name: "",
  collectorId: "",
  filterRoot: buildEmptyFilterRoot(),
  criteria: [],
  action: "create_ticket_support",
  actionTemplate: "",
  archiveOnMatch: true,
  enabled: true,
});

export function getCollectorLabel(collector) {
  if (!collector) return "-";
  return (
    String(collector.name || "").trim() ||
    String(collector.username || "").trim() ||
    String(collector.server || "").trim() ||
    String(collector.id || "").trim() ||
    "Collecteur"
  );
}

export function describeRuleCollector(rule, collectors = []) {
  const collectorId = String(rule?.collectorId || "").trim();
  if (!collectorId) return "Tous les collecteurs";
  const match = (Array.isArray(collectors) ? collectors : []).find(
    (item) => String(item?.id) === collectorId
  );
  return match ? getCollectorLabel(match) : "Collecteur supprimé";
}

export function describeExclusionRuleCriteria(rule) {
  return describeExclusionRuleFilters(rule);
}

export function getRuleActionLabel(action) {
  return RULE_ACTION_LABELS[normalizeIngestionAction(action)] || action;
}

export { normalizeIngestionAction } from "../../utils/mailIngestionRules";
