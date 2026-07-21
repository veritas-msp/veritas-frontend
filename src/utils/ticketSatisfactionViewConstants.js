export const TICKET_SATISFACTION_VIEW_IDS = {
  MINE: "__satisfaction_mine__",
  ALL: "__satisfaction_all__"
};
export const TICKET_SATISFACTION_VIEWS = [{
  id: TICKET_SATISFACTION_VIEW_IDS.MINE,
  name: "Mes retours clients",
  icon: "mdi:account-star-outline",
  description: "Customer feedback on your assigned tickets",
  scope: "mine",
  isSatisfactionView: true
}, {
  id: TICKET_SATISFACTION_VIEW_IDS.ALL,
  name: "All customer feedback",
  icon: "mdi:star-multiple-outline",
  description: "Ensemble des retours clients",
  scope: "all",
  adminOnly: true,
  isSatisfactionView: true
}];
export function isTicketSatisfactionViewId(viewId) {
  return TICKET_SATISFACTION_VIEWS.some(view => String(view.id) === String(viewId));
}
export function resolveTicketSatisfactionScope(viewId) {
  const view = TICKET_SATISFACTION_VIEWS.find(item => String(item.id) === String(viewId));
  return view?.scope || "mine";
}
