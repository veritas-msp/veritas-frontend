import {
  buildDefaultRule,
  buildEmptyFilterRoot,
  countRulesInTree,
  legacyRulesToFilterRoot,
  normalizeFilterRoot,
} from "./ticketViewFilterTree.js";
import { getTicketViewConstantsCopy } from "../i18n/ticketViewConstantsI18n.js";

export const TICKET_VIEW_FIELD_OPTIONS = [
  { value: "title", label: "Sujet" },
  { value: "description", label: "Description" },
  { value: "type", label: "Type ITIL" },
  { value: "category", label: "Catégorie" },
  { value: "status", label: "Statut" },
  { value: "priority", label: "Priorité" },
  { value: "channel", label: "Canal" },
  { value: "ticket_number", label: "N° ticket" },
  { value: "client_id", label: "ID client" },
  { value: "assigned", label: "Assigné (nom / email)" },
  { value: "assigned_user_id", label: "Assigné (agent)" },
  { value: "requester_contact_id", label: "ID contact demandeur" },
  { value: "tags", label: "Étiquettes / tags" },
];

export const TICKET_VIEW_STATUS_OPTIONS = [
  { value: "open", label: "Ouverts (hors résolu / clos)" },
  { value: "new", label: "Nouveau" },
  { value: "in_progress", label: "En cours" },
  { value: "pending", label: "En attente" },
  { value: "resolved", label: "Résolu" },
  { value: "closed", label: "Clos" },
];

export const TICKET_VIEW_OPERATOR_OPTIONS = [
  { value: "contains", label: "contient" },
  { value: "not_contains", label: "ne contient pas" },
  { value: "equals", label: "est égal à" },
  { value: "not_equals", label: "est différent de" },
  { value: "starts_with", label: "commence par" },
  { value: "ends_with", label: "se termine par" },
  { value: "in", label: "est parmi (liste)" },
  { value: "not_in", label: "n'est pas parmi" },
  { value: "is_empty", label: "est vide" },
  { value: "is_not_empty", label: "n'est pas vide" },
];

export const TICKET_VIEW_MATCH_MODES = [
  { value: "all", label: "Tous les critères (ET)" },
  { value: "any", label: "Au moins un critère (OU)" },
];

export const TICKET_VIEW_VISIBILITY_OPTIONS = [
  { value: "private", label: "Privée", hint: "Visible uniquement par vous", icon: "mdi:lock-outline" },
  { value: "public", label: "Publique", hint: "Visible de tous", icon: "mdi:earth" },
  { value: "assigned", label: "Assignée", hint: "Utilisateurs, profils et/ou équipes", icon: "mdi:account-multiple-check-outline" },
];

export const TICKET_VIEW_FORM_SECTIONS = [
  {
    id: "general",
    label: "Général",
    description: "Nom et description",
    icon: "mdi:information-outline",
  },
  {
    id: "visibility",
    label: "Visibilité",
    description: "Qui peut voir la vue",
    icon: "mdi:eye-outline",
  },
  {
    id: "filters",
    label: "Filtres",
    description: "Règles de tri des tickets",
    icon: "mdi:filter-variant",
  },
];

export function getTicketViewFieldOptions(locale) {
  return getTicketViewConstantsCopy(locale).fieldOptions;
}

export function getTicketViewStatusOptions(locale) {
  return getTicketViewConstantsCopy(locale).statusOptions;
}

export function getTicketViewOperatorOptions(locale) {
  return getTicketViewConstantsCopy(locale).operatorOptions;
}

export function getTicketViewMatchModes(locale) {
  return getTicketViewConstantsCopy(locale).matchModes;
}

export function getTicketViewVisibilityOptions(locale) {
  return getTicketViewConstantsCopy(locale).visibilityOptions;
}

export function getTicketViewFormSections(locale) {
  return getTicketViewConstantsCopy(locale).formSections;
}

export function getBuiltinTicketViews(locale) {
  const copy = getTicketViewConstantsCopy(locale);
  return BUILTIN_TICKET_VIEWS.map((view) => {
    const labels = copy.getBuiltinViewLabels(view.id);
    return {
      ...view,
      name: labels.name || view.name,
      description: labels.description || view.description,
    };
  });
}

export function describeViewAssignments(view = {}, locale = "fr") {
  const copy = getTicketViewConstantsCopy(locale);
  const parts = [];
  const users = view.users || [];
  const teams = view.teams || [];
  const profiles = view.profileNames || [];

  if (users.length > 0) {
    parts.push(copy.formatUserCount(users.length));
  }
  if (profiles.length > 0) {
    parts.push(copy.formatProfileCount(profiles.length, profiles.join(", ")));
  }
  if (teams.length > 0) {
    const teamLabels = teams.map((t) => t.name || t.id).join(", ");
    parts.push(copy.formatTeamCount(teams.length, teamLabels));
  }
  if (parts.length === 0) return copy.describe.noAssignment;
  return parts.join(" · ");
}

export const BUILTIN_TICKET_VIEW_IDS = {
  NEW: "__builtin_new__",
  IN_PROGRESS: "__builtin_in_progress__",
  PENDING: "__builtin_pending__",
  OPEN: "__builtin_open__",
  ALL: "__builtin_all__",
};

export const DEFAULT_TICKET_VIEW_ID = BUILTIN_TICKET_VIEW_IDS.ALL;

/** Vues intégrées affichées par défaut dans la colonne « Général ». */
export const BUILTIN_TICKET_VIEWS = [
  {
    id: BUILTIN_TICKET_VIEW_IDS.NEW,
    name: "Nouveaux tickets",
    icon: "mdi:inbox-arrow-down",
    description: "Tickets au statut nouveau",
    visibility: "public",
    isBuiltin: true,
    rules: {
      matchMode: "all",
      viewMode: "active",
      criteria: [{ field: "status", operator: "equals", value: "new" }],
    },
    sortBy: "updated_at",
    sortDirection: "desc",
  },
  {
    id: BUILTIN_TICKET_VIEW_IDS.IN_PROGRESS,
    name: "Tickets en cours",
    icon: "mdi:progress-clock",
    description: "Tickets en cours de traitement",
    visibility: "public",
    isBuiltin: true,
    rules: {
      matchMode: "all",
      viewMode: "active",
      criteria: [{ field: "status", operator: "equals", value: "in_progress" }],
    },
    sortBy: "updated_at",
    sortDirection: "desc",
  },
  {
    id: BUILTIN_TICKET_VIEW_IDS.PENDING,
    name: "Tickets en attente",
    icon: "mdi:pause-circle-outline",
    description: "Tickets en attente de retour",
    visibility: "public",
    isBuiltin: true,
    rules: {
      matchMode: "all",
      viewMode: "active",
      criteria: [{ field: "status", operator: "equals", value: "pending" }],
    },
    sortBy: "updated_at",
    sortDirection: "desc",
  },
  {
    id: BUILTIN_TICKET_VIEW_IDS.OPEN,
    name: "Tous les tickets ouvert",
    icon: "mdi:ticket-confirmation-outline",
    description: "Tickets ouverts (nouveau, en cours, en attente)",
    visibility: "public",
    isBuiltin: true,
    rules: {
      matchMode: "all",
      viewMode: "active",
      criteria: [{ field: "status", operator: "equals", value: "open" }],
    },
    sortBy: "updated_at",
    sortDirection: "desc",
  },
  {
    id: BUILTIN_TICKET_VIEW_IDS.ALL,
    name: "Tous les tickets",
    icon: "mdi:ticket-outline",
    description: "Tous les tickets actifs (hors corbeille)",
    visibility: "public",
    isBuiltin: true,
    rules: {
      matchMode: "all",
      viewMode: "active",
      criteria: [],
    },
    sortBy: "updated_at",
    sortDirection: "desc",
  },
];

export const DEFAULT_TICKET_VIEW_RULES = {
  viewMode: "active",
  filterRoot: buildEmptyFilterRoot(),
  matchMode: "all",
  criteria: [],
};

export function buildDefaultCriterion() {
  return buildDefaultRule();
}

export function normalizeTicketViewRules(rules = {}) {
  const filterRoot = normalizeFilterRoot(rules.filterRoot, rules);
  return {
    viewMode: rules.viewMode === "trash" ? "trash" : "active",
    filterRoot,
    matchMode: rules.matchMode === "any" ? "any" : "all",
    criteria: Array.isArray(rules.criteria) ? rules.criteria : [],
  };
}

export function buildDefaultTicketView(partial = {}) {
  return {
    name: "",
    description: "",
    pageScope: "ticket",
    visibility: "private",
    icon: "mdi:view-list",
    rules: {
      ...DEFAULT_TICKET_VIEW_RULES,
      filterRoot: buildEmptyFilterRoot(),
    },
    sortBy: "updated_at",
    sortDirection: "desc",
    displayOrder: 0,
    ...partial,
  };
}

function describeRuleBrief(rule, copy) {
  const field = copy.getFieldLabel(rule.field);
  const operator = copy.getOperatorLabel(rule.operator);
  if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
    return `${field} ${operator}`;
  }
  const value = String(rule.value || "").trim();
  return value ? `${field} ${operator} « ${value} »` : `${field} ${operator}…`;
}

function describeFilterGroupChildren(children = [], copy) {
  return children
    .map((child, index) => {
      const prefix =
        index > 0
          ? ` ${child.connector === "or" ? copy.describe.connectorOr : copy.describe.connectorAnd} `
          : "";
      if (child.type === "group") {
        const inner = describeFilterGroupChildren(child.children || [], copy);
        return `${prefix}(${inner || copy.describe.emptyGroup})`;
      }
      return `${prefix}${describeRuleBrief(child, copy)}`;
    })
    .join("");
}

export function describeViewCriteria(rules, locale = "fr") {
  const copy = getTicketViewConstantsCopy(locale);
  const filterRoot = normalizeFilterRoot(rules?.filterRoot, rules);
  const ruleCount = countRulesInTree(filterRoot);
  if (ruleCount === 0) return copy.describe.noFilter;
  const summary = describeFilterGroupChildren(filterRoot.children || [], copy);
  return summary.trim() || copy.describe.noFilter;
}

export function canUserEditTicketView(view, { userId, isAdmin = false } = {}) {
  if (!view || view.isBuiltin) return false;
  const ownerId = view.ownerUserId ?? view.owner_user_id;
  const isOwner = ownerId && userId && String(ownerId) === String(userId);
  const visibility = view.visibility === "profile" ? "assigned" : view.visibility;
  if (visibility === "private") return isOwner;
  if (visibility === "public") return isOwner || isAdmin;
  if (visibility === "assigned") return isAdmin;
  return false;
}

export { countRulesInTree, legacyRulesToFilterRoot, normalizeFilterRoot };
