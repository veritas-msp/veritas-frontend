import {
  normalizeFilterRoot,
  ticketMatchesFilterRoot,
} from "./ticketViewFilterTree.js";

function normalizeRules(rules = {}) {
  const raw = rules && typeof rules === "object" ? rules : {};
  const filterRoot = normalizeFilterRoot(raw.filterRoot, raw);
  return {
    matchMode: raw.matchMode === "any" ? "any" : "all",
    viewMode: raw.viewMode === "trash" ? "trash" : "active",
    filterRoot,
    criteria: Array.isArray(raw.criteria) ? raw.criteria : [],
  };
}

function normalizeStatus(status) {
  return status === "open" ? "new" : status;
}

function getFieldValue(ticket, field, context = {}) {
  const key = String(field || "").trim();
  if (!key) return "";

  if (key === "client_name") {
    return String(context.clientLabel || ticket?.client_name || ticket?.client_nom || "");
  }
  if (key === "requester") {
    return String(context.requesterLabel || "");
  }
  if (key === "assigned") {
    return String(context.assigneeLabel || ticket?.assigned_email || "");
  }

  let value = ticket?.[key];
  if (value === undefined) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    value = ticket?.[camel];
  }

  if (key === "status") return normalizeStatus(value);
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(String).join(",");
  return String(value);
}

function parseListValue(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function getTicketTagLabels(ticket) {
  const tags = Array.isArray(ticket?.tags) ? ticket.tags : [];
  return tags
    .map((tag) => String(tag?.label ?? tag ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function evaluateTagsCriterion(criterion = {}, ticket = {}) {
  const operator = String(criterion?.operator || "contains").trim();
  const tagLabels = getTicketTagLabels(ticket);
  const expected = String(criterion?.value ?? "").trim().toLowerCase();
  const expectedList = parseListValue(criterion?.value);

  if (operator === "is_empty") return tagLabels.length === 0;
  if (operator === "is_not_empty") return tagLabels.length > 0;

  if (operator === "in") {
    if (expectedList.length === 0) return false;
    return tagLabels.some((label) => expectedList.includes(label));
  }
  if (operator === "not_in") {
    if (expectedList.length === 0) return true;
    return !tagLabels.some((label) => expectedList.includes(label));
  }

  if (!expected) return false;

  const tagMatches = (label) => {
    if (operator === "equals") return label === expected;
    if (operator === "starts_with") return label.startsWith(expected);
    if (operator === "ends_with") return label.endsWith(expected);
    return label.includes(expected);
  };

  if (operator === "not_equals") return !tagLabels.some((label) => label === expected);
  if (operator === "not_contains") return !tagLabels.some((label) => label.includes(expected));
  return tagLabels.some(tagMatches);
}

export function evaluateCriterion(criterion = {}, ticket = {}, context = {}) {
  const field = String(criterion?.field || "").trim();
  if (field === "tags") {
    return evaluateTagsCriterion(criterion, ticket);
  }

  const operator = String(criterion?.operator || "contains").trim();
  const actual = String(getFieldValue(ticket, field, context)).toLowerCase().trim();

  if (operator === "is_empty") return actual === "";
  if (operator === "is_not_empty") return actual !== "";

  const expectedList = parseListValue(criterion?.value);
  const expected = String(criterion?.value ?? "").trim().toLowerCase();

  if (operator === "in") {
    if (expectedList.length === 0) return false;
    return expectedList.includes(actual);
  }
  if (operator === "not_in") {
    if (expectedList.length === 0) return true;
    return !expectedList.includes(actual);
  }

  if (!expected) return false;
  if (operator === "equals") return actual === expected;
  if (operator === "not_equals") return actual !== expected;
  if (operator === "starts_with") return actual.startsWith(expected);
  if (operator === "ends_with") return actual.endsWith(expected);
  if (operator === "not_contains") return !actual.includes(expected);
  return actual.includes(expected);
}

export function ticketMatchesViewRules(ticket, rulesInput = {}, context = {}) {
  const rules = normalizeRules(rulesInput);
  if (rules.filterRoot?.children?.length) {
    return ticketMatchesFilterRoot(rules.filterRoot, ticket, context, evaluateCriterion);
  }
  const criteria = rules.criteria.filter((c) => c && String(c.field || "").trim());
  if (criteria.length === 0) return true;
  const results = criteria.map((c) => evaluateCriterion(c, ticket, context));
  return rules.matchMode === "any" ? results.some(Boolean) : results.every(Boolean);
}

export function countTicketsForView(tickets, rules, getContextForTicket) {
  return tickets.filter((t) => ticketMatchesViewRules(t, rules, getContextForTicket(t))).length;
}

export { normalizeRules };
