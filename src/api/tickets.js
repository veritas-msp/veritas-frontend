import API_BASE_URL from "../config";

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const raw = query.toString();
  return raw ? `?${raw}` : "";
}

async function handleJsonResponse(response, fallbackMessage) {
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const validationDetails = Array.isArray(payload?.errors)
      ? payload.errors.map((e) => e.msg || e.message).filter(Boolean).join(", ")
      : null;
    const message =
      payload?.error ||
      payload?.message ||
      validationDetails ||
      fallbackMessage;
    throw new Error(message);
  }
  return payload;
}

export async function fetchTickets(filters = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets${buildQuery(filters)}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la récupération des tickets");
}

export async function fetchRandomTicket(filters = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/random${buildQuery(filters)}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Aucun ticket à traiter");
}

export async function fetchTicket(ticketId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la récupération du ticket");
}

export async function createTicket(ticketData) {
  const response = await fetch(`${API_BASE_URL}/tickets`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticketData),
  });
  return handleJsonResponse(response, "Erreur lors de la création du ticket");
}

export async function updateTicket(ticketId, ticketData) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticketData),
  });
  return handleJsonResponse(response, "Erreur lors de la mise à jour du ticket");
}

export async function updateTicketStatus(ticketId, status, note = "", options = {}) {
  const { consumeSupportCredit, refundSupportCredit, supportCreditDebits } = options;
  const body = { status, note };
  if (consumeSupportCredit !== undefined) body.consumeSupportCredit = consumeSupportCredit;
  if (refundSupportCredit !== undefined) body.refundSupportCredit = refundSupportCredit;
  if (Array.isArray(supportCreditDebits) && supportCreditDebits.length > 0) {
    body.supportCreditDebits = supportCreditDebits;
  }

  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleJsonResponse(response, "Erreur lors de la mise à jour du statut");
}

export async function resolveTicketWithValidation(
  ticketId,
  { reason, interventionType, actionType, consumeSupportCredit = false, supportCreditDebits = null } = {}
) {
  const body = { reason, interventionType, actionType, consumeSupportCredit };
  if (Array.isArray(supportCreditDebits) && supportCreditDebits.length > 0) {
    body.supportCreditDebits = supportCreditDebits;
  }
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/resolve-with-validation`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleJsonResponse(response, "Erreur lors de la résolution du ticket");
}

export async function fetchSolutionCatalog({ category = "", includeInactive = false } = {}) {
  const response = await fetch(
    `${API_BASE_URL}/tickets/solution-catalog${buildQuery({ category, includeInactive: includeInactive ? "true" : "" })}`,
    {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }
  );
  return handleJsonResponse(response, "Erreur lors du chargement du catalogue de solutions");
}

export async function createSolutionCatalogEntry(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/solution-catalog`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la création de l'entrée catalogue");
}

export async function updateSolutionCatalogEntry(entryId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/solution-catalog/${entryId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la modification de l'entrée catalogue");
}

export async function deleteSolutionCatalogEntry(entryId) {
  const response = await fetch(`${API_BASE_URL}/tickets/solution-catalog/${entryId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression de l'entrée catalogue");
}

export async function addTicketComment(ticketId, content, isInternal = false) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, isInternal }),
  });
  return handleJsonResponse(response, "Erreur lors de l'ajout du commentaire");
}

export async function updateTicketComment(
  ticketId,
  commentId,
  content,
  { removeAttachmentIds = [], removeAttachmentPaths = [] } = {}
) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments/${commentId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      removeAttachmentIds: Array.isArray(removeAttachmentIds) ? removeAttachmentIds : [],
      removeAttachmentPaths: Array.isArray(removeAttachmentPaths) ? removeAttachmentPaths : [],
    }),
  });
  return handleJsonResponse(response, "Erreur lors de la modification du commentaire");
}

export async function deleteTicketComment(ticketId, commentId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleJsonResponse(response, "Erreur lors de la suppression du commentaire");
}

export async function addTicketCommentWithAttachments(ticketId, { content, isInternal = false, files = [] }) {
  const formData = new FormData();
  formData.set("content", content || "");
  formData.set("isInternal", String(Boolean(isInternal)));
  files.forEach((file) => {
    formData.append("attachments", file);
  });

  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handleJsonResponse(response, "Erreur lors de l'ajout du commentaire");
}

export async function addTicketTag(ticketId, label, color) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/tags`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, color }),
  });
  return handleJsonResponse(response, "Erreur lors de l'ajout du tag");
}

export async function removeTicketTag(ticketId, tagId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/tags/${tagId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression du tag");
}

export async function addTicketWatcher(ticketId, userId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/watchers`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return handleJsonResponse(response, "Erreur lors de l'ajout du follower");
}

export async function removeTicketWatcher(ticketId, userId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/watchers/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression du follower");
}

export async function addTicketAssignee(ticketId, userId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/assignees`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return handleJsonResponse(response, "Erreur lors de l'ajout de l'assigné");
}

export async function removeTicketAssignee(ticketId, userId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/assignees/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression de l'assigné");
}

export async function deleteTicket(ticketId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression du ticket");
}

export async function bulkUpdateTickets(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/bulk`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse(response, "Erreur lors de l'action groupée sur les tickets");
}

export async function restoreTicket(ticketId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/restore`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la restauration du ticket");
}

export async function permanentlyDeleteTicket(ticketId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression définitive");
}

export async function fetchDeletedTickets(filters = {}) {
  const query = buildQuery(filters);
  const primary = await fetch(`${API_BASE_URL}/tickets/trash${query}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (primary.ok) return handleJsonResponse(primary, "Erreur lors de la récupération de la corbeille");
  if (primary.status !== 404) {
    return handleJsonResponse(primary, "Erreur lors de la récupération de la corbeille");
  }

  const fallback = await fetch(`${API_BASE_URL}/tickets${buildQuery({ ...filters, deleted: true })}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(fallback, "Erreur lors de la récupération de la corbeille");
}

export async function addLinkedTicket(ticketId, linkedTicketId, relation = "related") {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/links`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linkedTicketId, relation }),
  });
  return handleJsonResponse(response, "Erreur lors de l'ajout du ticket lié");
}

export async function removeLinkedTicket(ticketId, linkId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/links/${linkId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression du ticket lié");
}

export async function fetchTicketCategories() {
  const response = await fetch(`${API_BASE_URL}/tickets/categories`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la récupération des catégories ITIL");
}

export async function createTicketCategory(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/categories`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la création de la catégorie ITIL");
}

export async function updateTicketCategory(categoryId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/categories/${encodeURIComponent(String(categoryId || ""))}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la modification de la catégorie ITIL");
}

export async function deleteTicketCategory(categoryId) {
  const response = await fetch(`${API_BASE_URL}/tickets/categories/${encodeURIComponent(String(categoryId || ""))}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression de la catégorie ITIL");
}

export async function fetchTicketCategorySections() {
  const response = await fetch(`${API_BASE_URL}/tickets/category-sections`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la récupération des sections ITIL");
}

export async function createTicketCategorySection(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/category-sections`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la création de la section ITIL");
}

export async function updateTicketCategorySection(sectionId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/tickets/category-sections/${encodeURIComponent(String(sectionId || ""))}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    }
  );
  return handleJsonResponse(response, "Erreur lors de la modification de la section ITIL");
}

export async function deleteTicketCategorySection(sectionId) {
  const response = await fetch(
    `${API_BASE_URL}/tickets/category-sections/${encodeURIComponent(String(sectionId || ""))}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }
  );
  return handleJsonResponse(response, "Erreur lors de la suppression de la section ITIL");
}

export async function fetchTicketViews(pageScope = "ticket") {
  const response = await fetch(`${API_BASE_URL}/tickets/views${buildQuery({ pageScope })}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la récupération des vues tickets");
}

export async function fetchTicketViewCounts({
  pageScope = "ticket",
  viewId = "",
  search = "",
  ticketType = "",
  scope = "all",
  signal,
} = {}) {
  const response = await fetch(
    `${API_BASE_URL}/tickets/views/counts${buildQuery({ pageScope, viewId, search, ticketType, scope })}`,
    {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal,
    }
  );
  return handleJsonResponse(response, "Erreur lors du comptage des vues tickets");
}

export function buildTicketSearchPayload({
  viewRules,
  viewMode = "active",
  status = "",
  ticketType = "",
  search = "",
  sortBy = "updated_at",
  sortDirection = "desc",
  limit = 25,
  offset = 0,
} = {}) {
  const payload = {
    viewMode,
    status,
    ticketType,
    search,
    sortBy,
    sortDirection,
    limit,
    offset,
  };
  if (viewRules != null && typeof viewRules === "object") {
    payload.viewRules = viewRules;
  }
  return payload;
}

export async function searchTickets(payload = {}, signal) {
  const response = await fetch(`${API_BASE_URL}/tickets/search`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildTicketSearchPayload(payload)),
    signal,
  });
  return handleJsonResponse(response, "Erreur lors de la recherche des tickets");
}

export async function fetchAllMatchingTickets(payload = {}, { pageSize = 100, maxItems = 10000 } = {}) {
  const safePageSize = Math.min(Math.max(Number(pageSize) || 100, 1), 100);
  let offset = 0;
  let total = Infinity;
  const items = [];

  while (offset < total && items.length < maxItems) {
    const page = await searchTickets({
      ...payload,
      limit: safePageSize,
      offset,
    });
    const rows = Array.isArray(page?.items) ? page.items : [];
    total = Number(page?.total ?? rows.length);
    items.push(...rows);
    if (rows.length === 0) break;
    offset += rows.length;
  }

  return {
    items: items.slice(0, maxItems),
    total,
    truncated: items.length >= maxItems,
  };
}

export async function fetchAdminTicketViews(pageScope = "ticket") {
  const response = await fetch(`${API_BASE_URL}/tickets/views/admin${buildQuery({ pageScope })}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la récupération des vues tickets");
}

export async function createTicketView(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/views`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la création de la vue");
}

export async function updateTicketView(viewId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/views/${viewId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la mise à jour de la vue");
}

export async function deleteTicketView(viewId) {
  const response = await fetch(`${API_BASE_URL}/tickets/views/${viewId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression de la vue");
}

export async function fetchSalesForms(options = {}) {
  const params = new URLSearchParams();
  if (options.kind) params.set("kind", options.kind);
  if (options.includeDisabled) params.set("includeDisabled", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms${query}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    signal: options.signal,
  });
  return handleJsonResponse(response, "Erreur lors de la récupération des formulaires ventes");
}

export async function createSalesForm(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la création du formulaire");
}

export async function updateSalesForm(formId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la modification du formulaire");
}

export async function deleteSalesForm(formId) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la suppression du formulaire");
}

export async function createSalesFormField(formId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}/fields`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handleJsonResponse(response, "Erreur lors de la création du champ");
}

export async function updateSalesFormField(formId, fieldId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}/fields/${encodeURIComponent(String(fieldId))}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    }
  );
  return handleJsonResponse(response, "Erreur lors de la modification du champ");
}

export async function deleteSalesFormField(formId, fieldId) {
  const response = await fetch(
    `${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}/fields/${encodeURIComponent(String(fieldId))}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }
  );
  return handleJsonResponse(response, "Erreur lors de la suppression du champ");
}

export async function fetchTicketSatisfactions(filters = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/satisfactions${buildQuery(filters)}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors de la récupération des retours clients");
}

export async function fetchTicketSatisfactionCounts() {
  const response = await fetch(`${API_BASE_URL}/tickets/satisfactions/counts`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleJsonResponse(response, "Erreur lors du comptage des retours clients");
}

