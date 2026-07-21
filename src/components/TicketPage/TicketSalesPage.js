import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./TicketPage.module.css";
import SmartTooltip from "../SmartTooltip";
import { fetchTickets, fetchDeletedTickets, restoreTicket, permanentlyDeleteTicket, bulkUpdateTickets, fetchSalesForms } from "../../api/tickets";
import { fetchUsers } from "../../api/users";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { useAuthContext } from "../../contexts/AuthContext";
import TicketBulkActionModal from "./TicketBulkActionModal";
import TicketConfirmModal from "./TicketConfirmModal";
import { getTicketSlaDisplay } from "../../utils/ticketSlaUtils";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatSalesBulkLabel, getTicketSalesPageCopy, interpolate } from "./ticketSalesPageI18n";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
function getCategoryLabel(category, categoryLabels = {}) {
  if (categoryLabels[category]) return categoryLabels[category];
  const prefix = String(category || "").startsWith("installation-") ? "installation-" : "prestation-";
  return String(category || "").replace(new RegExp(`^${prefix}`), "").replace(/-/g, " ").trim() || "-";
}
function excerptText(text, maxLength = 240) {
  const clean = String(text || "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength)}…`;
}
function buildTicketSubjectTooltip(ticket, labels, copy) {
  const description = excerptText(ticket.description);
  const meta = [labels.kindLabel, labels.statusLabel, labels.priorityLabel, labels.category, labels.clientLabel, labels.requesterLabel, labels.commentsCount != null ? copy.formatCommentCount(labels.commentsCount) : null].filter(Boolean);
  return <div className={styles.subjectTooltip}>
      <div className={styles.subjectTooltipTitle}>{ticket.title}</div>
      {description ? <p className={styles.subjectTooltipDesc}>{description}</p> : null}
      {meta.length > 0 ? <p className={styles.subjectTooltipMeta}>{meta.join(" · ")}</p> : null}
    </div>;
}
function normalizeStatus(status) {
  return status === "open" ? "new" : status;
}
function toCsvCell(value) {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(";") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function isPrestationTicket(ticket) {
  return String(ticket?.type || "").toLowerCase() === "demande" && String(ticket?.category || "").startsWith("prestation-");
}
function isInstallationTicket(ticket) {
  return String(ticket?.type || "").toLowerCase() === "demande" && String(ticket?.category || "").startsWith("installation-");
}
function isSalesTicket(ticket) {
  return isPrestationTicket(ticket) || isInstallationTicket(ticket);
}
export default function TicketSalesPage({
  onNavigate
}) {
  const {
    userRole
  } = useAuthContext();
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getTicketSalesPageCopy(locale), [locale]);
  const isAdmin = userRole === "admin";
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [salesForms, setSalesForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [viewMode, setViewMode] = useState("active");
  const [activeViewId, setActiveViewId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [slaNow, setSlaNow] = useState(() => Date.now());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  useEffect(() => {
    const timer = window.setInterval(() => setSlaNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const activeView = useMemo(() => pageCopy.salesViews.find(view => view.id === activeViewId) || pageCopy.salesViews[0], [activeViewId, pageCopy.salesViews]);
  const categoryLabels = useMemo(() => Object.fromEntries(salesForms.filter(form => form.enabled !== false).map(form => [form.categorySlug, form.label])), [salesForms]);
  const salesTickets = useMemo(() => tickets.filter(isSalesTicket), [tickets]);
  const ticketsForView = useMemo(() => {
    if (activeView.kind === "prestation") return salesTickets.filter(isPrestationTicket);
    if (activeView.kind === "installation") return salesTickets.filter(isInstallationTicket);
    return salesTickets;
  }, [salesTickets, activeView.kind]);
  const loadData = async () => {
    setLoading(true);
    try {
      const ticketFetcher = viewMode === "trash" ? fetchDeletedTickets : fetchTickets;
      const [ticketRows, userRows, contactRows, clientRows, formRows] = await Promise.all([ticketFetcher({
        limit: 200
      }), fetchUsers().catch(() => []), fetchContactsList().catch(() => []), fetchClientsList().catch(() => []), fetchSalesForms().catch(() => [])]);
      setTickets(Array.isArray(ticketRows) ? ticketRows : []);
      setUsers(Array.isArray(userRows) ? userRows : []);
      setContacts(Array.isArray(contactRows) ? contactRows : []);
      setClients(Array.isArray(clientRows) ? clientRows : []);
      setSalesForms(Array.isArray(formRows) ? formRows : []);
    } catch (error) {
      toast.error(error.message || pageCopy.toasts.loadError);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, [viewMode]);
  const filteredCountByStatus = useMemo(() => {
    const counts = {
      new: 0,
      in_progress: 0,
      pending: 0,
      resolved: 0,
      closed: 0
    };
    salesTickets.forEach(t => {
      const ticketStatus = normalizeStatus(t.status);
      if (counts[ticketStatus] !== undefined) counts[ticketStatus] += 1;
    });
    return counts;
  }, [salesTickets]);
  const findContactById = contactId => {
    if (contactId === null || contactId === undefined || contactId === "") return null;
    return contacts.find(row => String(row.id) === String(contactId)) || null;
  };
  const resolveUserLabel = (userId, fallback) => {
    const u = users.find(row => String(row.id) === String(userId));
    return u?.ticket_helpdesk_display_name || u?.name || u?.nom || u?.username || u?.email || fallback || "-";
  };
  const resolveRequesterContactId = ticket => ticket?.requester_contact_id || ticket?.requesterContactId || "";
  const resolveRequesterFallback = ticket => ticket?.requester_name || ticket?.requester_full_name || ticket?.requester_contact_name || ticket?.requester_email || ticket?.requester_contact_email || "-";
  const resolveContactLabel = (contactId, fallback) => {
    const c = findContactById(contactId);
    if (!c) return fallback || "-";
    const fullName = `${c.prenom || ""} ${c.nom || ""}`.trim();
    return fullName || c.email || fallback || "-";
  };
  const resolveClientId = ticket => {
    const requesterContact = findContactById(resolveRequesterContactId(ticket));
    if (requesterContact?.client_id) return requesterContact.client_id;
    return ticket?.client_id || "";
  };
  const resolveClientLabel = ticket => {
    if (ticket?.client_name || ticket?.client_nom) {
      return ticket.client_name || ticket.client_nom;
    }
    const resolvedClientId = resolveClientId(ticket);
    if (resolvedClientId) {
      const client = clients.find(c => String(c.id) === String(resolvedClientId));
      return client?.name || client?.nom || "-";
    }
    const requesterContact = findContactById(resolveRequesterContactId(ticket));
    return requesterContact?.client_name || requesterContact?.entreprise || "-";
  };
  const resolveAssigneesLabel = ticket => {
    const assignees = Array.isArray(ticket?.assignees) ? ticket.assignees : [];
    if (assignees.length > 0) {
      const labels = assignees.map(a => {
        if (a === null || a === undefined) return "";
        if (typeof a === "string" || typeof a === "number") {
          return resolveUserLabel(a);
        }
        return resolveUserLabel(a.user_id || a.userId || a.id || a.value, a.name || a.nom || a.email || "");
      }).filter(label => label && label !== "-");
      return labels.length > 0 ? labels.join(", ") : "-";
    }
    return resolveUserLabel(ticket?.assigned_user_id, ticket?.assigned_email);
  };
  const resolveFollowersLabel = ticket => {
    const followers = Array.isArray(ticket?.watchers) ? ticket.watchers : [];
    if (followers.length === 0) {
      const followersCount = Number(ticket?.followers_count || 0);
      return followersCount > 0 ? pageCopy.formatFollowersCount(followersCount) : "-";
    }
    const labels = followers.map(w => {
      if (w === null || w === undefined) return "";
      if (typeof w === "string" || typeof w === "number") {
        return resolveUserLabel(w);
      }
      return resolveUserLabel(w.user_id || w.userId || w.id || w.value, w.name || w.nom || w.email || "");
    }).filter(label => label && label !== "-");
    if (labels.length > 0) return labels.join(", ");
    const followersCount = Number(ticket?.followers_count || followers.length || 0);
    return followersCount > 0 ? pageCopy.formatFollowersCount(followersCount) : "-";
  };
  const resolvePriorityLabel = priority => pageCopy.priorityLabels[priority] || priority || "-";
  const resolveChannelMeta = channel => pageCopy.channelMeta[channel] || {
    label: channel || "-",
    icon: "mdi:help-circle-outline"
  };
  const getPriorityVisual = priority => pageCopy.getPriorityVisual(priority);
  const getTicketKindLabel = ticket => pageCopy.getKindLabel(ticket);
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };
  const getSortIndicator = column => {
    if (sortBy !== column) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };
  const toggleStatusFilter = statusKey => {
    setViewMode("active");
    setStatus(prev => prev === statusKey ? "" : statusKey);
  };
  const handleSelectView = view => {
    setActiveViewId(view.id);
    setCategoryFilter("");
    setStatus("");
  };
  const getViewTicketCount = view => {
    if (view.kind === "prestation") return salesTickets.filter(isPrestationTicket).length;
    if (view.kind === "installation") return salesTickets.filter(isInstallationTicket).length;
    return salesTickets.length;
  };
  const renderViewItem = view => {
    const isActive = activeViewId === view.id;
    const count = getViewTicketCount(view);
    return <div key={view.id} className={`${styles.viewItem} ${isActive ? styles.viewItemActive : ""}`} onClick={() => handleSelectView(view)} onKeyDown={e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelectView(view);
      }
    }} role="button" tabIndex={0} title={view.hint} aria-pressed={isActive}>
        <span className={styles.viewItemMain}>
          <span className={styles.viewItemCount} aria-label={pageCopy.formatViewCountAria(count)}>
            {count}
          </span>
          <Icon icon={view.icon} className={styles.viewItemIcon} aria-hidden />
          <span className={styles.viewItemLabel}>{view.name}</span>
        </span>
      </div>;
  };
  const sortedTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const rows = [...ticketsForView].filter(row => {
      if (!status) return true;
      return normalizeStatus(row.status) === status;
    }).filter(row => {
      if (!categoryFilter) return true;
      return String(row.category || "") === categoryFilter;
    }).filter(row => {
      if (!normalizedSearch) return true;
      const searchable = [row.ticket_number, row.title, row.channel, row.category, getCategoryLabel(row.category, categoryLabels), getTicketKindLabel(row), resolveClientLabel(row), resolveContactLabel(resolveRequesterContactId(row), resolveRequesterFallback(row)), resolveAssigneesLabel(row), resolveFollowersLabel(row), resolvePriorityLabel(row.priority), row.status].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(normalizedSearch);
    });
    const factor = sortDirection === "asc" ? 1 : -1;
    const statusOrder = {
      new: 1,
      in_progress: 2,
      pending: 3,
      resolved: 4,
      closed: 5
    };
    const priorityOrder = {
      low: 1,
      normal: 2,
      high: 3,
      urgent: 4
    };
    rows.sort((a, b) => {
      let aValue = "";
      let bValue = "";
      if (sortBy === "ticket_number") {
        aValue = Number(a.ticket_number || 0);
        bValue = Number(b.ticket_number || 0);
      } else if (sortBy === "title") {
        aValue = String(a.title || "").toLowerCase();
        bValue = String(b.title || "").toLowerCase();
      } else if (sortBy === "channel") {
        aValue = String(a.channel || "").toLowerCase();
        bValue = String(b.channel || "").toLowerCase();
      } else if (sortBy === "category") {
        aValue = getCategoryLabel(a.category, categoryLabels).toLowerCase();
        bValue = getCategoryLabel(b.category, categoryLabels).toLowerCase();
      } else if (sortBy === "kind") {
        aValue = getTicketKindLabel(a).toLowerCase();
        bValue = getTicketKindLabel(b).toLowerCase();
      } else if (sortBy === "client") {
        aValue = resolveClientLabel(a).toLowerCase();
        bValue = resolveClientLabel(b).toLowerCase();
      } else if (sortBy === "requester") {
        aValue = resolveContactLabel(resolveRequesterContactId(a), resolveRequesterFallback(a)).toLowerCase();
        bValue = resolveContactLabel(resolveRequesterContactId(b), resolveRequesterFallback(b)).toLowerCase();
      } else if (sortBy === "assigned") {
        aValue = resolveAssigneesLabel(a).toLowerCase();
        bValue = resolveAssigneesLabel(b).toLowerCase();
      } else if (sortBy === "followers") {
        aValue = Number(a.followers_count || (Array.isArray(a.watchers) ? a.watchers.length : 0));
        bValue = Number(b.followers_count || (Array.isArray(b.watchers) ? b.watchers.length : 0));
      } else if (sortBy === "status") {
        aValue = statusOrder[normalizeStatus(a.status)] || 99;
        bValue = statusOrder[normalizeStatus(b.status)] || 99;
      } else if (sortBy === "priority") {
        aValue = priorityOrder[a.priority] || 99;
        bValue = priorityOrder[b.priority] || 99;
      } else if (sortBy === "created_at") {
        aValue = new Date(a.created_at || 0).getTime();
        bValue = new Date(b.created_at || 0).getTime();
      } else if (sortBy === "updated_at") {
        aValue = new Date(a.updated_at || 0).getTime();
        bValue = new Date(b.updated_at || 0).getTime();
      }
      if (aValue < bValue) return -1 * factor;
      if (aValue > bValue) return 1 * factor;
      return 0;
    });
    return rows;
  }, [ticketsForView, sortBy, sortDirection, contacts, clients, users, status, categoryFilter, search, categoryLabels]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedTickets.length / pageSize)), [sortedTickets.length, pageSize]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [viewMode, activeViewId, search, status, categoryFilter]);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTickets.slice(start, start + pageSize);
  }, [sortedTickets, currentPage, pageSize]);
  const selectedCount = selectedIds.size;
  const allOnPageSelected = paginatedTickets.length > 0 && paginatedTickets.every(ticket => selectedIds.has(ticket.id));
  const toggleTicketSelection = (ticketId, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(ticketId);else next.delete(ticketId);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedTickets.forEach(ticket => next.delete(ticket.id));
      } else {
        paginatedTickets.forEach(ticket => next.add(ticket.id));
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, categoryFilter, sortBy, sortDirection, viewMode, activeViewId, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const openCreatePage = (kind = "prestation") => {
    onNavigate?.("TicketSalesCreate", {
      kind
    });
  };
  const handleRestoreTicket = async ticketId => {
    try {
      await restoreTicket(ticketId);
      toast.success(pageCopy.toasts.restored);
      await loadData();
    } catch (error) {
      toast.error(error.message || pageCopy.toasts.restoreError);
    }
  };
  const closeConfirmModal = () => {
    if (bulkDeleting) return;
    setConfirmModal(null);
  };
  const handlePermanentDelete = ticketId => {
    if (!isAdmin) {
      toast.error(pageCopy.bulk.adminOnlyPurge);
      return;
    }
    setConfirmModal({
      title: pageCopy.bulk.purgeOneTitle,
      message: pageCopy.bulk.purgeMessage,
      confirmLabel: pageCopy.bulk.confirmPurge,
      icon: "mdi:delete-forever-outline",
      variant: "danger",
      onConfirm: async () => {
        setBulkDeleting(true);
        try {
          await permanentlyDeleteTicket(ticketId);
          toast.success(pageCopy.bulk.toastPurgedOne);
          setConfirmModal(null);
          await loadData();
        } catch (error) {
          toast.error(error.message || pageCopy.bulk.toastPurgeError);
        } finally {
          setBulkDeleting(false);
        }
      }
    });
  };
  const handleBulkRestore = async () => {
    if (selectedCount === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkUpdateTickets({
        ticketIds: [...selectedIds],
        action: "restore"
      });
      if (result.failureCount > 0) {
        toast.warn(interpolate(pageCopy.toasts.bulkRestorePartial, {
          success: String(result.successCount),
          failure: String(result.failureCount)
        }));
      } else {
        toast.success(interpolate(result.successCount > 1 ? pageCopy.toasts.bulkRestoreOkPlural : pageCopy.toasts.bulkRestoreOk, {
          count: String(result.successCount)
        }));
      }
      clearSelection();
      await loadData();
    } catch (error) {
      toast.error(error.message || pageCopy.toasts.bulkRestoreError);
    } finally {
      setBulkDeleting(false);
    }
  };
  const handleBulkPurge = () => {
    if (!isAdmin || selectedCount === 0) return;
    const label = formatSalesBulkLabel(locale, selectedCount);
    setConfirmModal({
      title: interpolate(pageCopy.bulk.purgeTitle, {
        label
      }),
      message: pageCopy.bulk.purgeMessage,
      confirmLabel: pageCopy.bulk.confirmPurge,
      icon: "mdi:delete-forever-outline",
      variant: "danger",
      onConfirm: async () => {
        setBulkDeleting(true);
        try {
          const result = await bulkUpdateTickets({
            ticketIds: [...selectedIds],
            action: "purge"
          });
          if (result.failureCount > 0) {
            toast.warn(interpolate(pageCopy.toasts.bulkPurgePartial, {
              success: String(result.successCount),
              failure: String(result.failureCount)
            }));
          } else {
            toast.success(interpolate(result.successCount > 1 ? pageCopy.toasts.bulkPurgeOkPlural : pageCopy.toasts.bulkPurgeOk, {
              count: String(result.successCount)
            }));
          }
          clearSelection();
          setConfirmModal(null);
          await loadData();
        } catch (error) {
          toast.error(error.message || pageCopy.bulk.toastPurgeError);
        } finally {
          setBulkDeleting(false);
        }
      }
    });
  };
  const handleBulkDelete = () => {
    if (!isAdmin || selectedCount === 0) return;
    const label = formatSalesBulkLabel(locale, selectedCount);
    setConfirmModal({
      title: interpolate(pageCopy.bulk.deleteTitle, {
        label
      }),
      message: pageCopy.bulk.deleteMessage,
      confirmLabel: pageCopy.bulk.confirmDelete,
      icon: "mdi:delete-outline",
      variant: "danger",
      onConfirm: async () => {
        setBulkDeleting(true);
        try {
          const result = await bulkUpdateTickets({
            ticketIds: [...selectedIds],
            action: "delete"
          });
          if (result.failureCount > 0) {
            toast.warn(interpolate(pageCopy.toasts.bulkDeletePartial, {
              success: String(result.successCount),
              failure: String(result.failureCount)
            }));
          } else {
            toast.success(interpolate(result.successCount > 1 ? pageCopy.toasts.bulkDeleteOkPlural : pageCopy.toasts.bulkDeleteOk, {
              count: String(result.successCount)
            }));
          }
          clearSelection();
          setConfirmModal(null);
          await loadData();
        } catch (error) {
          toast.error(error.message || pageCopy.toasts.bulkDeleteError);
        } finally {
          setBulkDeleting(false);
        }
      }
    });
  };
  const handleBulkActionSuccess = async result => {
    if (result?.failureCount > 0) {
      toast.warn(interpolate(pageCopy.toasts.bulkUpdatePartial, {
        success: String(result.successCount),
        failure: String(result.failureCount)
      }));
    } else {
      const count = result?.successCount || selectedCount;
      toast.success(interpolate(count > 1 ? pageCopy.toasts.bulkUpdateOkPlural : pageCopy.toasts.bulkUpdateOk, {
        count: String(count)
      }));
    }
    clearSelection();
    await loadData();
  };
  const handleExportCsv = () => {
    const headers = pageCopy.getCsvHeaders();
    const rows = sortedTickets.map(t => {
      const ticketStatus = normalizeStatus(t.status);
      return [`#${t.ticket_number || "-"}`, t.title || "", getTicketKindLabel(t), getCategoryLabel(t.category, categoryLabels), t.channel || "-", resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t)), resolveClientLabel(t), resolveAssigneesLabel(t), resolveFollowersLabel(t), pageCopy.getStatusBadge(ticketStatus) || t.status || "-", resolvePriorityLabel(t.priority), pageCopy.formatDateTime(t.created_at), pageCopy.formatDateTime(t.updated_at)];
    });
    const csvContent = [headers.map(toCsvCell).join(";"), ...rows.map(row => row.map(toCsvCell).join(";"))].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.href = url;
    link.download = `${pageCopy.csv.filenamePrefix}-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const categoryFilterOptions = useMemo(() => {
    const forms = salesForms.filter(form => {
      if (form.enabled === false) return false;
      if (activeView.kind === "installation") return form.kind === "installation";
      if (activeView.kind === "prestation") return form.kind === "prestation";
      return true;
    });
    return [{
      value: "",
      label: pageCopy.allCategories
    }, ...forms.map(form => ({
      value: form.categorySlug,
      label: form.label
    }))];
  }, [salesForms, activeView.kind]);
  const createKind = activeView.kind === "installation" ? "installation" : "prestation";
  return <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow={pageCopy.eyebrow} title={pageCopy.pageTitle} subtitle={pageCopy.formatSubtitle(loading, viewMode, activeView.name, sortedTickets.length)} icon="mdi:briefcase-edit-outline" actions={<>
                <label className={`${styles.trashSwitch} ${viewMode === "trash" ? styles.trashSwitchOn : ""}`} title={pageCopy.trashSwitchTitle}>
                  <Icon icon="mdi:trash-can-outline" className={styles.trashSwitchIcon} aria-hidden />
                  <span className={styles.trashSwitchLabel}>{pageCopy.trashSwitchLabel}</span>
                  <input type="checkbox" className={styles.trashSwitchInput} checked={viewMode === "trash"} onChange={e => {
              const showTrash = e.target.checked;
              setViewMode(showTrash ? "trash" : "active");
              if (showTrash) setStatus("");
            }} aria-label={pageCopy.trashSwitchAria} />
                  <span className={styles.trashSwitchSlider} aria-hidden />
                </label>
                <SmartTooltip content={pageCopy.exportCsv}>
                  <button type="button" className={layout.iconBtn} onClick={handleExportCsv} disabled={sortedTickets.length === 0} aria-label={pageCopy.exportCsvAria}>
                    <Icon icon="mdi:download-outline" />
                  </button>
                </SmartTooltip>
                <button type="button" className={`${layout.primaryBtn} ${layout.primaryBtnIconOnly}`} onClick={() => openCreatePage(createKind)} disabled={viewMode === "trash"} aria-label={pageCopy.newRequestAria}>
                  <FaPlus />
                </button>
              </>} />

          <main className={mspStyles.mspContent}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
        {viewMode !== "trash" && !loading && <div className={styles.kpiRow4}>
            {pageCopy.statusFilters.map(item => {
                const count = filteredCountByStatus[item.key] || 0;
                const active = status === item.key;
                return <button key={item.key} type="button" className={`${layout.kpiCard} ${active ? layout.kpiCardActive : ""} ${count === 0 ? layout.kpiCardDisabled : ""}`} onClick={() => toggleStatusFilter(item.key)} disabled={count === 0}>
                  <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${item.kpiTone}`] || layout.kpiIcon_blue}`}>
                    <Icon icon={item.icon} />
                  </div>
                  <div className={layout.kpiBody}>
                    <span className={layout.kpiValue}>{count}</span>
                    <span className={layout.kpiLabel}>{item.label}</span>
                  </div>
                </button>;
              })}
          </div>}

        <div className={`${styles.viewsLayout} ${viewMode === "trash" ? styles.viewsLayoutTrash : ""}`}>
          {viewMode !== "trash" && <aside className={styles.viewsPane} aria-label={pageCopy.views.paneAria}>
              <div className={styles.viewsPaneHeader}>
                <span className={styles.viewsTitle}>{pageCopy.views.title}</span>
              </div>
              <div className={styles.viewsList}>
                <div className={styles.viewsGroupLabel}>{pageCopy.views.typesGroup}</div>
                {pageCopy.salesViews.map(view => renderViewItem(view))}
              </div>
            </aside>}

          <div className={styles.mainColumn}>
            {viewMode !== "trash" ? <div className={styles.activeViewBanner}>
                <span className={styles.activeViewBannerMain}>
                  <Icon icon={activeView.icon} className={styles.activeViewBannerIcon} aria-hidden />
                  <span>
                    <strong>{activeView.name}</strong>
                    <span className={styles.activeViewBannerHint}>{activeView.hint}</span>
                  </span>
                </span>
              </div> : <div className={`${styles.activeViewBanner} ${styles.trashBanner}`}>
                <span className={styles.activeViewBannerMain}>
                  <Icon icon="mdi:trash-can-outline" className={styles.activeViewBannerIcon} aria-hidden />
                  <span>
                    <strong>{pageCopy.trashBanner.title}</strong>
                    <span className={styles.activeViewBannerHint}>{pageCopy.trashBanner.hint}</span>
                  </span>
                </span>
              </div>}

            <div className={`${layout.toolbar} ${styles.toolbarGrow}`}>
              <div className={`${layout.searchWrap} ${styles.searchWrapFull}`}>
                <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
                <input type="text" inputMode="search" className={layout.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder={pageCopy.search.placeholder} aria-label={pageCopy.search.aria} />
                {search && <button type="button" className={layout.clearButton} onClick={() => setSearch("")} aria-label={pageCopy.search.clear}>
                    <FaTimes />
                  </button>}
              </div>
              <span className={layout.toolbarMeta}>{sortedTickets.length}</span>
              <select className={layout.sortSelect} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label={pageCopy.search.filterCategory}>
                {categoryFilterOptions.map(opt => <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            {loading ? <div className={layout.stateBox}>
                <Icon icon="mdi:loading" className={layout.spinning} />
                <span>{pageCopy.loading}</span>
              </div> : sortedTickets.length === 0 ? <div className={layout.emptyState}>
                <Icon icon="mdi:briefcase-edit-outline" className={layout.emptyStateIcon} />
                <p className={layout.emptyStateTitle}>
                  {viewMode === "trash" ? pageCopy.empty.trashTitle : pageCopy.empty.noRequestsTitle}
                </p>
                <p className={layout.emptyStateHint}>
                  {viewMode === "trash" ? pageCopy.empty.trashHint : pageCopy.empty.activeHint}
                </p>
                {viewMode !== "trash" && <button type="button" className={layout.primaryBtn} onClick={() => openCreatePage(createKind)}>
                    <Icon icon="mdi:plus" />
                    {pageCopy.empty.newRequest}
                  </button>}
              </div> : <>
                {selectedCount > 0 && <div className={styles.bulkBar}>
                    <div className={styles.bulkInfo}>
                      <strong>{selectedCount}</strong>
                      <span>{pageCopy.formatBulkSelected(selectedCount)}</span>
                    </div>
                    <div className={styles.bulkActions}>
                      {viewMode === "trash" && <>
                          <button type="button" className={styles.bulkBtn} onClick={handleBulkRestore} disabled={bulkDeleting}>
                            <Icon icon="mdi:restore" />
                            {pageCopy.bulk.restore}
                          </button>
                          {isAdmin && <button type="button" className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={handleBulkPurge} disabled={bulkDeleting}>
                              <Icon icon="mdi:delete-forever-outline" />
                              {bulkDeleting ? pageCopy.bulk.purgeLoading : pageCopy.bulk.purge}
                            </button>}
                        </>}
                      {viewMode !== "trash" && <button type="button" className={styles.bulkBtn} onClick={() => setBulkModalOpen(true)}>
                          <Icon icon="mdi:pencil-outline" />
                          {pageCopy.bulk.edit}
                        </button>}
                      {viewMode !== "trash" && isAdmin && <button type="button" className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={handleBulkDelete} disabled={bulkDeleting}>
                          <Icon icon="mdi:delete-outline" />
                          {bulkDeleting ? pageCopy.bulk.deleteLoading : pageCopy.bulk.delete}
                        </button>}
                      <button type="button" className={styles.bulkBtnGhost} onClick={clearSelection}>
                        {pageCopy.bulk.clearSelection}
                      </button>
                    </div>
                  </div>}

                <div className={styles.tablePanel}>
                  <div className={styles.tableScroll}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.checkboxCell}>
                            <input type="checkbox" className={styles.rowCheckbox} checked={allOnPageSelected} onChange={toggleSelectAllOnPage} onClick={e => e.stopPropagation()} aria-label={pageCopy.table.selectAll} />
                          </th>
                          <th onClick={() => handleSort("ticket_number")}>{pageCopy.table.id}{getSortIndicator("ticket_number")}</th>
                          <th onClick={() => handleSort("title")}>{pageCopy.table.subject}{getSortIndicator("title")}</th>
                          <th onClick={() => handleSort("channel")}>{pageCopy.table.channel}{getSortIndicator("channel")}</th>
                          <th onClick={() => handleSort("kind")}>{pageCopy.table.type}{getSortIndicator("kind")}</th>
                          <th onClick={() => handleSort("category")}>{pageCopy.table.category}{getSortIndicator("category")}</th>
                          <th onClick={() => handleSort("requester")}>{pageCopy.table.requester}{getSortIndicator("requester")}</th>
                          <th onClick={() => handleSort("client")}>{pageCopy.table.client}{getSortIndicator("client")}</th>
                          <th onClick={() => handleSort("assigned")}>{pageCopy.table.assigned}{getSortIndicator("assigned")}</th>
                          <th onClick={() => handleSort("followers")}>{pageCopy.table.followers}{getSortIndicator("followers")}</th>
                          <th onClick={() => handleSort("status")}>{pageCopy.table.status}{getSortIndicator("status")}</th>
                          <th onClick={() => handleSort("priority")}>{pageCopy.table.priority}{getSortIndicator("priority")}</th>
                          <th>{pageCopy.table.sla}</th>
                          <th onClick={() => handleSort("created_at")}>{pageCopy.table.created}{getSortIndicator("created_at")}</th>
                          <th onClick={() => handleSort("updated_at")}>{pageCopy.table.updated}{getSortIndicator("updated_at")}</th>
                          {viewMode === "trash" && <th>{pageCopy.table.actions}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTickets.map(t => {
                            const ticketStatus = normalizeStatus(t.status);
                            const isSelected = selectedIds.has(t.id);
                            return <tr key={t.id} className={isSelected ? styles.selectedRow : undefined} onClick={() => onNavigate?.("TicketDetail", {
                              ticketId: t.id,
                              ticketNumber: t.ticket_number,
                              title: t.title
                            })}>
                              <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                                <input type="checkbox" className={styles.rowCheckbox} checked={isSelected} onChange={e => toggleTicketSelection(t.id, e.target.checked)} aria-label={pageCopy.formatSelectOne(t.ticket_number || t.id)} />
                              </td>
                              <td>#{t.ticket_number || "-"}</td>
                              <td>
                                <SmartTooltip as="span" className={styles.subjectCellWrap} content={buildTicketSubjectTooltip(t, {
                                  kindLabel: getTicketKindLabel(t),
                                  statusLabel: pageCopy.getStatusBadge(ticketStatus) || t.status,
                                  priorityLabel: resolvePriorityLabel(t.priority),
                                  category: getCategoryLabel(t.category, categoryLabels),
                                  clientLabel: resolveClientLabel(t),
                                  requesterLabel: resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t)),
                                  commentsCount: Number(t.comments_count ?? 0) || null
                                }, pageCopy)}>
                                  <span className={styles.subjectCell}>
                                    <span className={styles.subjectCellText}>{t.title}</span>
                                  </span>
                                </SmartTooltip>
                              </td>
                              <td>
                                <span className={styles.channelCell} title={resolveChannelMeta(t.channel).label}>
                                  <Icon icon={resolveChannelMeta(t.channel).icon} className={styles.channelIcon} />
                                </span>
                              </td>
                              <td>{getTicketKindLabel(t)}</td>
                              <td>{getCategoryLabel(t.category, categoryLabels)}</td>
                              <td>
                                {resolveRequesterContactId(t) ? <button type="button" className={styles.linkCellBtn} onClick={e => {
                                  e.stopPropagation();
                                  onNavigate?.("ContactDetail", {
                                    contactId: resolveRequesterContactId(t)
                                  });
                                }}>
                                    {resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t))}
                                  </button> : <span>{resolveContactLabel(resolveRequesterContactId(t), resolveRequesterFallback(t))}</span>}
                              </td>
                              <td>
                                {resolveClientId(t) ? <button type="button" className={styles.linkCellBtn} onClick={e => {
                                  e.stopPropagation();
                                  onNavigate?.("ContratDetail", {
                                    clientId: resolveClientId(t),
                                    name: resolveClientLabel(t)
                                  });
                                }}>
                                    {resolveClientLabel(t)}
                                  </button> : <span>{resolveClientLabel(t)}</span>}
                              </td>
                              <td>{resolveAssigneesLabel(t)}</td>
                              <td>{resolveFollowersLabel(t)}</td>
                              <td>
                                <span className={styles.statusBadge}>
                                  {pageCopy.getStatusBadge(ticketStatus) || t.status}
                                </span>
                              </td>
                              <td>
                                <span className={styles.priorityIndicator} title={getPriorityVisual(t.priority).label}>
                                  <Icon icon={getPriorityVisual(t.priority).icon} />
                                </span>
                              </td>
                              <td>
                                {(() => {
                                  const sla = getTicketSlaDisplay(t, {
                                    clients,
                                    now: slaNow
                                  });
                                  return <span className={`${styles.slaBadge} ${styles[`slaBadge_${sla.tone}`] || styles.slaBadge_neutral}`} title={pageCopy.getSlaTitle(sla.phase)}>
                                      <Icon icon="mdi:timer-outline" />
                                      {sla.label}
                                    </span>;
                                })()}
                              </td>
                              <td>{pageCopy.formatDateTime(t.created_at)}</td>
                              <td>{pageCopy.formatDateTime(t.updated_at)}</td>
                              {viewMode === "trash" && <td>
                                  <div className={styles.actionRow}>
                                    <button type="button" className={styles.rowActionBtn} title={pageCopy.table.restoreTitle} onClick={e => {
                                    e.stopPropagation();
                                    handleRestoreTicket(t.id);
                                  }}>
                                      <Icon icon="mdi:restore" />
                                      {pageCopy.table.restore}
                                    </button>
                                    {isAdmin && <button type="button" className={`${styles.rowActionBtn} ${styles.rowActionDanger}`} title={pageCopy.table.purgeTitle} onClick={e => {
                                    e.stopPropagation();
                                    handlePermanentDelete(t.id);
                                  }}>
                                        <Icon icon="mdi:delete-forever-outline" />
                                        {pageCopy.table.purge}
                                      </button>}
                                  </div>
                                </td>}
                            </tr>;
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={layout.pagination}>
                  <div className={layout.paginationLeft}>
                    <span className={layout.paginationLabel}>{pageCopy.pagination.perPage}</span>
                    <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className={layout.paginationRight}>
                    <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1} aria-label={pageCopy.pagination.prev}>
                      <FaChevronLeft />
                    </button>
                    <span className={layout.paginationInfo}>
                      {pageCopy.formatPagination(currentPage, totalPages)}
                    </span>
                    <button type="button" className={layout.pageBtn} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} aria-label={pageCopy.pagination.next}>
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              </>}
          </div>
        </div>

        <TicketConfirmModal open={Boolean(confirmModal)} title={confirmModal?.title} message={confirmModal?.message} confirmLabel={confirmModal?.confirmLabel} icon={confirmModal?.icon} variant={confirmModal?.variant} loading={bulkDeleting} onClose={closeConfirmModal} onConfirm={confirmModal?.onConfirm} />

        <TicketBulkActionModal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} ticketIds={[...selectedIds]} users={users} contacts={contacts} onSuccess={handleBulkActionSuccess} />
            </div>
          </main>
        </div>
      </div>
    </div>;
}
