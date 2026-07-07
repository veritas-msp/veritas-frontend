import { useState, useEffect, useMemo, useRef } from "react";
import { fetchContactsList, fetchClientsList } from "../../api/clients";
import { toast } from "react-toastify";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./ContactPage.module.css";
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import ContactModal from "./ContactModal";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatPageInfo } from "../../i18n/commonI18n";
import { getContactPageCopy, normalizeContactStatusKey } from "./contactPageI18n";
import { getContactSexeLabelLocalized } from "./contactFormModalI18n";
import { interpolate } from "../../i18n/translate";
import { getPortalStatusFromContact } from "../../api/contactPortal";
import {
  getContactSexeIcon,
  normalizeContactSexe,
} from "../../utils/contactSexe";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";

const LEGACY_CONTACTS_CACHE_KEY = "contacts_list_cache_v3";

function getContactInitials(contact) {
  const p = (contact.prenom || "").trim();
  const n = (contact.nom || "").trim();
  if (p && n) return `${p[0]}${n[0]}`.toUpperCase();
  return (n || p || "-").slice(0, 2).toUpperCase();
}

function getContactDisplayName(contact) {
  const parts = [contact.prenom, contact.nom].filter(Boolean);
  return parts.join(" ") || "-";
}

function formatClientDisplay(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(/\s*-\s*/g, " ");
}

export default function ContactPage({ onNavigate, pageParams, onPageParamsConsumed }) {
  const CONTACTS_CLIENTS_CACHE_KEY = "contacts_clients_cache_v1";
  const CONTACTS_CACHE_TTL_MS = 5 * 60 * 1000;

  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const common = useCommonCopy();
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getContactPageCopy(locale), [locale]);
  const [statusFilters, setStatusFilters] = useState(new Set());
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactModalInitial, setContactModalInitial] = useState(null);

  const loadControllerRef = useRef(null);
  const clientsControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const normalizePhone = (value) => {
    let normalized = (value || "").toString().trim();
    const excelTextMatch = normalized.match(/^=\s*"(.+)"$/);
    if (excelTextMatch) normalized = excelTextMatch[1];
    if (normalized.startsWith("'")) normalized = normalized.slice(1);
    return normalized.replace(/[^\d+]/g, "");
  };

  const toTelHref = (value) => {
    const normalized = normalizePhone(value);
    return normalized ? `tel:${normalized}` : "";
  };

  const toMailtoHref = (value) => {
    const email = (value || "").toString().trim();
    return email ? `mailto:${encodeURIComponent(email)}` : "";
  };

  const copyToClipboard = async (text, label) => {
    const raw = (text || "").toString().trim();
    if (!raw) {
      toast.info(interpolate(pageCopy.clipboard.unavailable, { label }));
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(raw);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = raw;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success(interpolate(pageCopy.clipboard.copied, { label }));
    } catch {
      toast.error(interpolate(pageCopy.clipboard.copyFailed, { label: label.toLowerCase() }));
    }
  };

  const buildContactSharePayload = (contact, clientDisplay) => {
    const fullName = getContactDisplayName(contact);
    const entreprise = (clientDisplay || "").toString().trim();
    const telephone = (contact?.telephone || "").toString().trim();
    const email = (contact?.email || "").toString().trim();
    const poste = (contact?.poste || "").toString().trim();
    const lines = pageCopy.share.lines;

    const payloadLines = [
      `${lines.contact}: ${fullName}`,
      entreprise ? `${lines.enterprise}: ${entreprise}` : null,
      poste ? `${lines.role}: ${poste}` : null,
      telephone ? `${lines.phone}: ${telephone}` : null,
      email ? `${lines.email}: ${email}` : null,
    ].filter(Boolean);

    return {
      title: interpolate(pageCopy.share.title, { name: fullName }),
      text: payloadLines.join("\n"),
    };
  };

  const shareContact = async (contact, clientDisplay) => {
    const payload = buildContactSharePayload(contact, clientDisplay);
    try {
      if (navigator?.share) {
        await navigator.share({ title: payload.title, text: payload.text });
        return;
      }
      toast.info(pageCopy.share.unavailable);
    } catch (e) {
      if (e?.name !== "AbortError") toast.info(pageCopy.share.cancelled);
    }
  };

  const getClientNameForSort = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    return raw.replace(/^\d+\s*[-\s]*\s*/, "").toLowerCase();
  };

  useEffect(() => {
    isMountedRef.current = true;
    try {
      sessionStorage.removeItem(LEGACY_CONTACTS_CACHE_KEY);
    } catch {
      // ignore
    }

    const controller = new AbortController();
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    loadData(controller.signal);

    const handleRefreshContacts = () => {
      const refreshController = new AbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = refreshController;
      loadData(refreshController.signal);
    };

    window.addEventListener("refreshContacts", handleRefreshContacts);

    const pollInterval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const pollController = new AbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = pollController;
      loadData(pollController.signal, { silent: true });
    }, 30000);

    return () => {
      isMountedRef.current = false;
      controller.abort();
      clientsControllerRef.current?.abort();
      clearInterval(pollInterval);
      window.removeEventListener("refreshContacts", handleRefreshContacts);
    };
  }, []);

  const ensureClientsLoaded = async () => {
    if (clients.length > 0) return true;

    try {
      const rawClients = sessionStorage.getItem(CONTACTS_CLIENTS_CACHE_KEY);
      if (rawClients) {
        const parsedClients = JSON.parse(rawClients);
        const clientsFresh =
          parsedClients?.savedAt &&
          Array.isArray(parsedClients?.data) &&
          Date.now() - parsedClients.savedAt < CONTACTS_CACHE_TTL_MS;
        if (clientsFresh) {
          setClients(parsedClients.data);
          return true;
        }
      }
    } catch {
      // ignore
    }

    clientsControllerRef.current?.abort();
    const controller = new AbortController();
    clientsControllerRef.current = controller;
    try {
      const clientsData = await fetchClientsList({ signal: controller.signal });
      if (controller.signal.aborted || !isMountedRef.current) return false;
      const normalized = Array.isArray(clientsData) ? clientsData : [];
      setClients(normalized);
      try {
        sessionStorage.setItem(
          CONTACTS_CLIENTS_CACHE_KEY,
          JSON.stringify({ savedAt: Date.now(), data: normalized })
        );
      } catch {
        // ignore
      }
      return true;
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Erreur chargement entreprises:", err);
        toast.error("Impossible de charger la liste des entreprises.");
      }
      return false;
    }
  };

  const loadData = async (signal, options = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const contactsData = await fetchContactsList(null, { signal });
      if (signal?.aborted || !isMountedRef.current) return;
      setContacts(Array.isArray(contactsData) ? contactsData : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!silent) {
        setError(err.message || "Erreur lors du chargement des données");
      }
      console.error("Erreur chargement:", err);
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  };

  const handleOpenAddContact = async () => {
    const ok = await ensureClientsLoaded();
    if (!ok) return;
    setContactModalInitial(null);
    setShowContactModal(true);
  };

  useEffect(() => {
    if (!pageParams?.openCreateModal) return;
    let cancelled = false;
    (async () => {
      const ok = await ensureClientsLoaded();
      if (cancelled || !ok) return;
      setContactModalInitial(null);
      setShowContactModal(true);
      onPageParamsConsumed?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [pageParams, onPageParamsConsumed]);

  const handleContactModalClose = () => {
    setShowContactModal(false);
    setContactModalInitial(null);
  };

  const handleContactSaved = (savedContact) => {
    if (!savedContact?.id) return;
    setContacts((prev) => {
      const index = prev.findIndex((c) => String(c.id) === String(savedContact.id));
      if (index === -1) {
        const clientName =
          savedContact.client_name ||
          clients.find((c) => String(c.id) === String(savedContact.client_id))?.name ||
          "";
        return [...prev, { ...savedContact, client_name: clientName }];
      }
      return prev.map((c) =>
        String(c.id) === String(savedContact.id) ? { ...c, ...savedContact } : c
      );
    });
  };

  const matchesSearch = (contact, query) =>
    [contact.nom, contact.prenom, contact.email, contact.telephone, contact.poste, contact.client_name]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query));

  const filteredForStats = useMemo(() => {
    let filtered = [...contacts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => matchesSearch(c, q));
    }
    return filtered;
  }, [contacts, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0, unknown: 0 };
    filteredForStats.forEach((c) => {
      const key = normalizeContactStatusKey(c.statut);
      if (counts[key] !== undefined) counts[key] += 1;
      else counts.unknown += 1;
    });
    return counts;
  }, [filteredForStats]);

  const filteredAndSortedContacts = useMemo(() => {
    let filtered = [...contacts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => matchesSearch(c, q));
    }

    if (statusFilters.size > 0) {
      filtered = filtered.filter((c) => statusFilters.has(normalizeContactStatusKey(c.statut)));
    }

    filtered.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      let aVal;
      let bVal;

      if (sortBy === "client") {
        aVal = getClientNameForSort(a.client_name);
        bVal = getClientNameForSort(b.client_name);
      } else {
        aVal = String(a[sortBy] || "").toLowerCase();
        bVal = String(b[sortBy] || "").toLowerCase();
      }

      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });

    return filtered;
  }, [contacts, searchQuery, statusFilters, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedContacts.length / pageSize));
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedContacts.slice(start, start + pageSize);
  }, [filteredAndSortedContacts, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilters, sortBy, sortOrder, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const portfolioTotal = contacts.length;

  const toggleStatusFilter = (statusKey) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(statusKey)) next.delete(statusKey);
      else next.add(statusKey);
      return next;
    });
  };

  const sortValue = `${sortBy}:${sortOrder}`;

  const handleSortChange = (value) => {
    const [column, order] = value.split(":");
    setSortBy(column);
    setSortOrder(order);
  };

  const openContact = (contact, background = false) => {
    if (!onNavigate) return;
    onNavigate("ContactDetail", contact, background ? { background: true } : undefined);
  };

  const handleExportCsv = () => {
    const headers = pageCopy.export.headers;
    const rows = [headers];

    filteredAndSortedContacts.forEach((contact) => {
      const rawClientLabel = pageCopy.getClientLabel(contact.client_id, contact.client_name);
      rows.push([
        contact.nom || "",
        contact.prenom || "",
        contact.statut || "",
        formatClientDisplay(rawClientLabel),
        contact.poste || "",
        contact.email || "",
        contact.telephone || "",
      ]);
    });

    const csvContent = rows
      .map((row) =>
        row
          .map((value) => {
            const stringValue = value == null ? "" : String(value);
            if (/[",;\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
            return stringValue;
          })
          .join(";")
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", pageCopy.export.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderPortalStatus = (contact) => {
    const ps = getPortalStatusFromContact(contact);
    if (ps === "active") {
      return (
        <SmartTooltip content={pageCopy.portal.active}>
          <span
            className={`${styles.portalStatusIcon} ${styles.portalStatusActive}`}
            aria-label={pageCopy.portal.active}
          >
            <Icon icon="mdi:account-check" aria-hidden />
          </span>
        </SmartTooltip>
      );
    }
    if (ps === "inactive") {
      return (
        <SmartTooltip content={pageCopy.portal.inactive}>
          <span
            className={`${styles.portalStatusIcon} ${styles.portalStatusInactive}`}
            aria-label={pageCopy.portal.inactive}
          >
            <Icon icon="mdi:account-cancel-outline" aria-hidden />
          </span>
        </SmartTooltip>
      );
    }
    return (
      <SmartTooltip content={pageCopy.portal.none}>
        <span
          className={`${styles.portalStatusIcon} ${styles.portalStatusNone}`}
          aria-label={pageCopy.portal.none}
        >
          <Icon icon="mdi:account-off-outline" aria-hidden />
        </span>
      </SmartTooltip>
    );
  };

  return (
    <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero
            eyebrow={pageCopy.eyebrow}
            title={pageCopy.pageTitle}
            subtitle={
              loading
                ? pageCopy.loadingPortfolio
                : pageCopy.formatSubtitle(filteredAndSortedContacts.length, portfolioTotal)
            }
            icon="mdi:account-group-outline"
            actions={
              <>
                <SmartTooltip content={pageCopy.exportCsv}>
                  <button
                    type="button"
                    className={layout.iconBtn}
                    onClick={handleExportCsv}
                    aria-label={pageCopy.exportCsvAria}
                  >
                    <Icon icon="mdi:download-outline" />
                  </button>
                </SmartTooltip>
                <SmartTooltip content={pageCopy.newContact}>
                  <button
                    type="button"
                    className={`${layout.primaryBtn} ${layout.primaryBtnIconOnly}`}
                    onClick={handleOpenAddContact}
                    aria-label={pageCopy.newContact}
                  >
                    <FaPlus />
                  </button>
                </SmartTooltip>
              </>
            }
          />

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
        {!loading && !error && (
          <div className={`${layout.kpiRow} ${styles.kpiRow3}`}>
            {pageCopy.statusFilters.map((item) => {
              const count = statusCounts[item.key] || 0;
              const active = statusFilters.has(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`${layout.kpiCard} ${active ? layout.kpiCardActive : ""} ${count === 0 ? layout.kpiCardDisabled : ""}`}
                  onClick={() => toggleStatusFilter(item.key)}
                  disabled={count === 0}
                >
                  <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${item.kpiTone}`]}`}>
                    <Icon icon={item.icon} />
                  </div>
                  <div className={layout.kpiBody}>
                    <span className={layout.kpiValue}>{count}</span>
                    <span className={layout.kpiLabel}>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className={`${layout.toolbar} ${styles.toolbarCompact}`}>
          <div className={`${layout.searchWrap} ${styles.searchWrapGrow}`}>
            <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
            <input
              type="text"
              inputMode="search"
              enterKeyHint="search"
              placeholder={pageCopy.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={layout.searchInput}
              aria-label={pageCopy.searchAria}
            />
            {searchQuery && (
              <SmartTooltip content={pageCopy.clearSearch}>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={layout.clearButton}
                  aria-label={pageCopy.clearSearch}
                >
                  <FaTimes />
                </button>
              </SmartTooltip>
            )}
          </div>
          <span className={layout.toolbarMeta}>{filteredAndSortedContacts.length}</span>
          <select
            className={layout.sortSelect}
            value={sortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label={pageCopy.sortAria}
          >
            {pageCopy.sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={layout.stateBox}>
            <Icon icon="mdi:loading" className={layout.spinning} />
            <span>{pageCopy.loading}</span>
          </div>
        ) : error ? (
          <div className={`${layout.stateBox} ${layout.stateBoxError}`}>
            <Icon icon="mdi:alert-circle-outline" />
            <span>{error}</span>
          </div>
        ) : paginatedContacts.length === 0 ? (
          <div className={layout.emptyState}>
            <Icon icon="mdi:account-outline" className={layout.emptyStateIcon} />
            <p className={layout.emptyStateTitle}>{pageCopy.emptyTitle}</p>
            <p className={layout.emptyStateHint}>{pageCopy.emptyHint}</p>
            <button type="button" className={layout.primaryBtn} onClick={handleOpenAddContact}>
              <Icon icon="mdi:plus" />
              {pageCopy.newContact}
            </button>
          </div>
        ) : (
          <div className={layout.listBody}>
            <div className={layout.listArea}>
              {paginatedContacts.map((contact) => {
                const rawClientLabel = pageCopy.getClientLabel(contact.client_id, contact.client_name);
                const clientDisplay = formatClientDisplay(rawClientLabel) || "-";
                const contactStatus = pageCopy.getContactStatus(contact.statut);
                const contactSexe = normalizeContactSexe(contact.sexe);

                return (
                  <article
                    key={contact.id}
                    className={`${layout.card} ${styles.contactCard}`}
                    onClick={() => openContact(contact)}
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        openContact(contact, true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openContact(contact);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.contactCardLead}>
                    <div className={`${layout.cardMain} ${styles.contactCardMain}`}>
                      <div className={layout.avatar}>
                        <span
                          className={layout.avatarRing}
                          style={{ borderColor: contactStatus.color }}
                        />
                        {getContactInitials(contact)}
                      </div>
                      <div className={layout.cardIdentity}>
                        <div className={layout.clientNameRow}>
                          <h2 className={layout.clientName}>
                            <SmartTooltip
                              content={getContactDisplayName(contact)}
                              as="span"
                              className={styles.clientNameInner}
                            >
                              <span className={layout.clientNameText}>
                                {getContactDisplayName(contact)}
                              </span>
                            </SmartTooltip>
                          </h2>
                          {(contact.tags || []).length > 0 && (
                            <div className={layout.cardTags} aria-label={pageCopy.tagsAria}>
                              {contact.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className={layout.clientTagChip}
                                  style={{
                                    backgroundColor: `${tag.color || "#2b5fab"}18`,
                                    borderColor: `${tag.color || "#2b5fab"}55`,
                                    color: tag.color || "#2b5fab",
                                  }}
                                >
                                  {tag.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={layout.clientMeta}>
                          <SmartTooltip content={pageCopy.enterprise} as="span" className={layout.clientMetaItem}>
                            <Icon
                              icon="mdi:domain"
                              className={layout.clientMetaIcon}
                              aria-hidden
                            />
                            <span className={layout.clientMetaText}>{clientDisplay}</span>
                          </SmartTooltip>
                          {contactSexe && (
                            <SmartTooltip content={pageCopy.civility} as="span" className={layout.clientMetaItem}>
                              <Icon
                                icon={getContactSexeIcon(contactSexe)}
                                className={layout.clientMetaIcon}
                                aria-hidden
                              />
                              <span className={layout.clientMetaText}>
                                {getContactSexeLabelLocalized(contactSexe, locale)}
                              </span>
                            </SmartTooltip>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.cardDetailsRow}>
                      <div className={styles.cardDetailCell}>
                        {contact.poste ? (
                          <>
                            <Icon
                              icon="mdi:briefcase-outline"
                              className={styles.cardDetailIcon}
                              aria-hidden
                            />
                            <SmartTooltip content={contact.poste} as="span" className={styles.cardDetailText}>
                              {contact.poste}
                            </SmartTooltip>
                          </>
                        ) : (
                          <span className={styles.cardDetailEmpty}>-</span>
                        )}
                      </div>
                      <span className={styles.cardDetailSep} aria-hidden>
                        |
                      </span>
                      <div className={styles.cardDetailCell}>
                        {contact.email ? (
                          <>
                            <Icon
                              icon="mdi:email-outline"
                              className={styles.cardDetailIcon}
                              aria-hidden
                            />
                            <SmartTooltip content={contact.email} as="span" className={styles.detailLinkWrap}>
                              <a
                                href={toMailtoHref(contact.email)}
                                className={styles.detailLink}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {contact.email}
                              </a>
                            </SmartTooltip>
                            <SmartTooltip content={pageCopy.actions.copyEmail}>
                              <button
                                type="button"
                                className={styles.inlineCopyBtn}
                                aria-label={pageCopy.actions.copyEmail}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(contact.email, pageCopy.clipboardLabels.email);
                                }}
                              >
                                <Icon icon="mdi:content-copy" />
                              </button>
                            </SmartTooltip>
                          </>
                        ) : (
                          <span className={styles.cardDetailEmpty}>-</span>
                        )}
                      </div>
                      <span className={styles.cardDetailSep} aria-hidden>
                        |
                      </span>
                      <div className={styles.cardDetailCell}>
                        {contact.telephone ? (
                          <>
                            <Icon
                              icon="mdi:phone-outline"
                              className={styles.cardDetailIcon}
                              aria-hidden
                            />
                            <SmartTooltip content={contact.telephone} as="span" className={styles.detailLinkWrap}>
                              <a
                                href={toTelHref(contact.telephone)}
                                className={styles.detailLink}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {contact.telephone}
                              </a>
                            </SmartTooltip>
                            <SmartTooltip content={pageCopy.actions.copyPhone}>
                              <button
                                type="button"
                                className={styles.inlineCopyBtn}
                                aria-label={pageCopy.actions.copyPhone}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(contact.telephone, pageCopy.clipboardLabels.phone);
                                }}
                              >
                                <Icon icon="mdi:content-copy" />
                              </button>
                            </SmartTooltip>
                          </>
                        ) : (
                          <span className={styles.cardDetailEmpty}>-</span>
                        )}
                      </div>
                    </div>
                    </div>

                    <div className={layout.cardExpiry} onClick={(e) => e.stopPropagation()}>
                      <span className={layout.expiryLabel}>{pageCopy.portal.label}</span>
                      {renderPortalStatus(contact)}
                    </div>

                    <div className={styles.cardActions}>
                      <SmartTooltip content={pageCopy.actions.copyCard}>
                        <button
                          type="button"
                          className={styles.iconActionBtn}
                          aria-label={pageCopy.actions.copyCardAria}
                          onClick={(e) => {
                            e.stopPropagation();
                            const payload = buildContactSharePayload(contact, clientDisplay);
                            copyToClipboard(payload.text, pageCopy.actions.shareCard);
                          }}
                        >
                          <Icon icon="mdi:content-copy" />
                        </button>
                      </SmartTooltip>
                      <SmartTooltip content="Partager">
                        <button
                          type="button"
                          className={styles.iconActionBtn}
                          aria-label="Partager la fiche contact"
                          onClick={(e) => {
                            e.stopPropagation();
                            shareContact(contact, clientDisplay);
                          }}
                        >
                          <Icon icon="mdi:share-variant" />
                        </button>
                      </SmartTooltip>
                    </div>

                    <Icon icon="mdi:chevron-right" className={layout.cardChevron} aria-hidden />
                  </article>
                );
              })}
            </div>

            {filteredAndSortedContacts.length > 0 && (
              <div className={layout.pagination}>
                <div className={layout.paginationLeft}>
                  <span className={layout.paginationLabel}>{common.perPage}</span>
                  <select
                    className={layout.paginationSelect}
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className={layout.paginationRight}>
                  <SmartTooltip content={common.prevPage}>
                    <button
                      type="button"
                      className={layout.pageBtn}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      aria-label={common.prevPage}
                    >
                      <FaChevronLeft />
                    </button>
                  </SmartTooltip>
                  <span className={layout.paginationInfo}>
                    {formatPageInfo(locale, currentPage, totalPages)}
                  </span>
                  <SmartTooltip content={common.nextPage}>
                    <button
                      type="button"
                      className={layout.pageBtn}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      aria-label={common.nextPage}
                    >
                      <FaChevronRight />
                    </button>
                  </SmartTooltip>
                </div>
              </div>
            )}
          </div>
        )}
            </div>
          </main>
        </div>
      </div>

      {showContactModal && (
        <ContactModal
          initialContact={contactModalInitial}
          onClose={handleContactModalClose}
          onSuccess={handleContactSaved}
          clients={clients}
        />
      )}
    </div>
  );
}
