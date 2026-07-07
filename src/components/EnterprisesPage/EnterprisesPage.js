import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import API_BASE_URL from "../../config";
import styles from "./EnterprisesPage.module.css";
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import ClientModal from "../AdminPage/ClientSkeleton/ClientModal";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterprisesPageCopy } from "./enterprisesPageI18n";
import { localizeEquipmentCountColumns } from "../../i18n/equipmentFamilyLabels";
import {
  getLocalizedModuleLabel,
  localizeContractModules,
} from "../../i18n/contractModuleLabels";
import {
  buildEmptyModulesMap,
  getAllActiveModuleKeys,
  normalizeClientOptions,
} from "../../constants/contractModules";
import { getClientInitials, formatClientTabLabel, getClientNumber, getClientNameWithoutCode } from "../../utils/clientDisplay";
import { fetchEquipmentFamilies } from "../../api/equipmentFamilies";
import {
  buildActiveEquipmentCountColumns,
  getDefaultEquipmentFamilies,
} from "../AdminPage/equipmentFamilyConstants";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";

function getExpiryClass(status) {
  if (status === "expired") return styles.expiryDate_expired;
  if (status === "expiring") return styles.expiryDate_expiring;
  return "";
}

export default function EnterprisesPage({ onNavigate, pageParams, onPageParamsConsumed }) {
  const locale = useAppLocale();
  const formatters = useAppFormatters();
  const copy = useMemo(() => getEnterprisesPageCopy(locale), [locale]);
  const copyRef = useRef(copy);
  copyRef.current = copy;

  const { modules: contractModules, enabledModules } = useContractModuleOptions();

  const localizedContractModules = useMemo(
    () => localizeContractModules(contractModules, locale),
    [contractModules, locale]
  );
  const localizedEnabledModules = useMemo(
    () => localizedContractModules.filter((mod) => mod.enabled !== false),
    [localizedContractModules]
  );

  const resolveModuleLabel = useCallback(
    (moduleKey) => getLocalizedModuleLabel(contractModules, moduleKey, locale),
    [contractModules, locale]
  );
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [statusFilters, setStatusFilters] = useState(new Set());
  const [moduleFilters, setModuleFilters] = useState(new Set());
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientModalInitial, setClientModalInitial] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const [customFamilies, setCustomFamilies] = useState([]);
  const listControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!pageParams?.openCreateModal) return;
    setClientModalInitial(null);
    setShowClientModal(true);
    onPageParamsConsumed?.();
  }, [pageParams, onPageParamsConsumed]);

  const defaultEquipmentFamilies = useMemo(() => getDefaultEquipmentFamilies(), []);
  const equipmentCountColumns = useMemo(() => {
    const columns = buildActiveEquipmentCountColumns(defaultEquipmentFamilies, customFamilies);
    return localizeEquipmentCountColumns(columns, locale);
  }, [defaultEquipmentFamilies, customFamilies, locale]);

  const defaultModules = useMemo(() => buildEmptyModulesMap(contractModules), [contractModules]);

  const moduleIconByKey = useMemo(
    () => Object.fromEntries(contractModules.map((m) => [m.moduleKey, m.icon])),
    [contractModules]
  );

  const getEquipmentCount = (client, key) =>
    Number(client?.equipmentCounts?.[key]) || 0;

  useEffect(() => {
    isMountedRef.current = true;
    loadClients();
    loadEquipmentFamilies();

    const handleRefreshEnterprises = () => loadClients();
    const handleFamiliesUpdated = () => loadEquipmentFamilies();

    const pollInterval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadClients({ silent: true });
    }, 30000);

    window.addEventListener("refreshEnterprises", handleRefreshEnterprises);
    window.addEventListener("equipmentFamiliesUpdated", handleFamiliesUpdated);
    return () => {
      isMountedRef.current = false;
      listControllerRef.current?.abort();
      clearInterval(pollInterval);
      window.removeEventListener("refreshEnterprises", handleRefreshEnterprises);
      window.removeEventListener("equipmentFamiliesUpdated", handleFamiliesUpdated);
    };
  }, []);

  const loadEquipmentFamilies = async () => {
    try {
      const data = await fetchEquipmentFamilies();
      if (!isMountedRef.current) return;
      setCustomFamilies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement familles matériel:", err);
      if (isMountedRef.current) setCustomFamilies([]);
    }
  };

  const loadClients = async (options = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    listControllerRef.current?.abort();
    const listController = new AbortController();
    listControllerRef.current = listController;

    try {
      const res = await fetch(`${API_BASE_URL}/clients/list?_=${Date.now()}`, {
        credentials: "include",
        signal: listController.signal,
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message =
          errorData.error ||
          errorData.details ||
          copyRef.current.formatLoadErrorStatus(res.status);
        throw new Error(message);
      }

      const clientsData = await res.json();

      const parsedClients = (Array.isArray(clientsData) ? clientsData : []).map((client) => ({
        ...client,
        client_number: client.client_number ?? client.clientNumber ?? null,
        clientNumber: client.client_number ?? client.clientNumber ?? null,
        tags: Array.isArray(client.tags) ? client.tags : [],
        equipmentCounts: client.equipmentCounts || {},
        options: (() => {
          if (client.options && typeof client.options === "object") {
            return { ...defaultModules, ...client.options };
          }
          if (typeof client.options === "string" && client.options.trim()) {
            try {
              const parsed = JSON.parse(client.options);
              if (parsed && typeof parsed === "object") {
                return { ...defaultModules, ...parsed };
              }
            } catch {
              return parseOptionsToModules(client.options);
            }
          }
          return { ...defaultModules };
        })(),
        sites: (() => {
          if (Array.isArray(client.sites)) return client.sites;
          if (typeof client.sites === "string") {
            try {
              return JSON.parse(client.sites);
            } catch {
              return [];
            }
          }
          return client.sites || [];
        })(),
      }));
      if (!isMountedRef.current) return;
      setClients(parsedClients);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!silent) {
        setError(err.message || copyRef.current.loadError);
      }
      console.error("Erreur chargement clients:", err);
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  };

  const normalizeText = (value) =>
    (value || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const parseOptionsToModules = (value) => {
    const modules = { ...defaultModules };
    if (!value) return modules;
    const normalizedValue = normalizeText(value)
      .replace(/[\[\]\(\)"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const tokens = normalizedValue
      .split(/[|,;/]+/)
      .map((token) => normalizeText(token))
      .filter(Boolean);
    const mapping = {
      support: "Support",
      curatif: "Curatif",
      preventif: "Preventif",
      preventifve: "Preventif",
      preventive: "Preventif",
      monitoring: "Monitoring",
      hebergement: "Hebergement",
      magicinfo: "MagicInfo",
      videosurveillance: "Videosurveillance",
    };
    tokens.forEach((token) => {
      const key = mapping[token] || Object.keys(mapping).find((candidate) => token.includes(candidate));
      if (key && mapping[key]) modules[mapping[key]] = true;
    });
    Object.keys(mapping).forEach((candidate) => {
      if (normalizedValue.includes(candidate)) modules[mapping[candidate]] = true;
    });
    return modules;
  };

  const getContractStatus = copy.getContractStatus;

  const getEnterpriseNameForSort = (client) => {
    const name = getClientNameWithoutCode(client) || client?.name || "";
    return String(name).trim().toLowerCase();
  };

  const getTabDisplayName = (client) => formatClientTabLabel(client);

  const kpiFilteredClients = useMemo(() => {
    let base = [...clients];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      base = base.filter(
        (client) =>
          client.name?.toLowerCase().includes(query) ||
          getClientNumber(client).toLowerCase().includes(query) ||
          getClientNameWithoutCode(client).toLowerCase().includes(query) ||
          client.email?.toLowerCase().includes(query) ||
          client.phone?.toLowerCase().includes(query) ||
          client.commercial?.toLowerCase().includes(query) ||
          client.primaryContactName?.toLowerCase().includes(query) ||
          (client.tags || []).some((tag) => tag.label?.toLowerCase().includes(query))
      );
    }

    if (statusFilters.size > 0) {
      base = base.filter((client) => {
        const contractStatus = getContractStatus(
          client.contrat?.expiration,
          client.contrat?.suspendu
        );
        return statusFilters.has(contractStatus.status);
      });
    }

    if (moduleFilters.size > 0) {
      base = base.filter((client) => {
        const modules = client.options || client.contrat?.modules || {};
        return Array.from(moduleFilters).every((key) => modules?.[key]);
      });
    }

    return base;
  }, [clients, searchQuery, statusFilters, moduleFilters, copy]);

  const filteredAndSortedClients = useMemo(() => {
    const filtered = [...kpiFilteredClients];

    filtered.sort((a, b) => {
      let aValue;
      let bValue;

      switch (sortBy) {
        case "name":
          aValue = getEnterpriseNameForSort(a);
          bValue = getEnterpriseNameForSort(b);
          break;
        case "status": {
          const statusOrder = { active: 1, expiring: 2, suspended: 3, expired: 4, unknown: 5 };
          const aStatus = getContractStatus(a.contrat?.expiration, a.contrat?.suspendu);
          const bStatus = getContractStatus(b.contrat?.expiration, b.contrat?.suspendu);
          const aPriority = statusOrder[aStatus.status] || 5;
          const bPriority = statusOrder[bStatus.status] || 5;
          if (aPriority === bPriority) {
            aValue = aStatus.label.toLowerCase();
            bValue = bStatus.label.toLowerCase();
          } else {
            aValue = aPriority;
            bValue = bPriority;
          }
          break;
        }
        case "expiration":
          aValue = a.contrat?.expiration || "";
          bValue = b.contrat?.expiration || "";
          break;
        case "commercial":
          aValue = (a.commercial || "").toLowerCase();
          bValue = (b.commercial || "").toLowerCase();
          break;
        default:
          if (sortBy.startsWith("equipment:")) {
            const equipKey = sortBy.slice("equipment:".length);
            aValue = getEquipmentCount(a, equipKey);
            bValue = getEquipmentCount(b, equipKey);
            break;
          }
          return 0;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [kpiFilteredClients, sortBy, sortOrder, copy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedClients.length / pageSize));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedClients.slice(start, start + pageSize);
  }, [filteredAndSortedClients, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilters, moduleFilters, sortBy, sortOrder, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const hasActiveFilters = statusFilters.size > 0 || moduleFilters.size > 0;

  const portfolioTotal = clients.length;

  const toggleStatusFilter = (statusKey) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(statusKey)) next.delete(statusKey);
      else next.add(statusKey);
      return next;
    });
  };

  const toggleModuleFilter = (moduleKey) => {
    setModuleFilters((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  };

  const statusCounts = useMemo(() => {
    const counts = { active: 0, expiring: 0, expired: 0, suspended: 0, unknown: 0 };
    kpiFilteredClients.forEach((client) => {
      const status = getContractStatus(client.contrat?.expiration, client.contrat?.suspendu).status;
      if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [kpiFilteredClients, copy]);

  const moduleCounts = useMemo(() => {
    const counts = Object.fromEntries(enabledModules.map((m) => [m.moduleKey, 0]));
    kpiFilteredClients.forEach((client) => {
      const modules = client.options || client.contrat?.modules || {};
      enabledModules.forEach((mod) => {
        if (modules[mod.moduleKey]) counts[mod.moduleKey] += 1;
      });
    });
    return counts;
  }, [kpiFilteredClients, enabledModules]);

  const handleExportCsv = () => {
    const headers = copy.getCsvHeaders(equipmentCountColumns);
    const rows = [headers];

    filteredAndSortedClients.forEach((client) => {
      const modulesObj = client.options || client.contrat?.modules || {};
      const activeKeys = getAllActiveModuleKeys(modulesObj, contractModules);
      const activeLabels = activeKeys.map((key) => resolveModuleLabel(key));
      rows.push([
        formatClientTabLabel(client),
        activeLabels.join(", "),
        formatDate(client.contrat?.expiration),
        client.commercial || "",
        ...equipmentCountColumns.map((col) => getEquipmentCount(client, col.key)),
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
    link.setAttribute("download", copy.export.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openClient = (client, background = false) => {
    onNavigate(
      "ContratDetail",
      {
        clientId: client.id,
        name: getClientNameWithoutCode(client) || client.name,
        client_number: getClientNumber(client) || undefined,
      },
      background ? { background: true } : undefined
    );
  };

  const formatDate = (dateString) => formatters.formatDate(dateString);

  const sortValue = `${sortBy}:${sortOrder}`;

  const handleSortChange = (value) => {
    const [column, order] = value.split(":");
    setSortBy(column);
    setSortOrder(order);
  };

  return (
    <div className={`${mspStyles.mspPage} ${styles.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero
            eyebrow={copy.eyebrow}
            title={copy.pageTitle}
            subtitle={
              loading
                ? copy.loadingPortfolio
                : copy.formatSubtitle(filteredAndSortedClients.length, portfolioTotal)
            }
            icon="mdi:briefcase-outline"
            actions={
              <>
                <SmartTooltip content={copy.exportCsv}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={handleExportCsv}
                    aria-label={copy.exportCsvAria}
                  >
                    <Icon icon="mdi:download-outline" />
                  </button>
                </SmartTooltip>
                <SmartTooltip content={copy.newEnterprise}>
                  <button
                    type="button"
                    className={`${styles.primaryBtn} ${styles.primaryBtnIconOnly}`}
                    onClick={() => {
                      setClientModalInitial(null);
                      setShowClientModal(true);
                    }}
                    aria-label={copy.newEnterprise}
                  >
                    <FaPlus />
                  </button>
                </SmartTooltip>
              </>
            }
          />

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${styles.shell} ${styles.shellWide} ${styles.shellFull}`}>
        {!loading && !error && (
          <div className={styles.kpiRow}>
            {copy.statusFilterItems.map((item) => {
              const count = statusCounts[item.key] || 0;
              const active = statusFilters.has(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.kpiCard} ${active ? styles.kpiCardActive : ""} ${count === 0 ? styles.kpiCardDisabled : ""}`}
                  onClick={() => toggleStatusFilter(item.key)}
                  disabled={count === 0}
                >
                  <div className={`${styles.kpiIconWrap} ${styles[`kpiIcon_${item.kpiTone}`]}`}>
                    <Icon icon={item.icon} />
                  </div>
                  <div className={styles.kpiBody}>
                    <span className={styles.kpiValue}>{count}</span>
                    <span className={styles.kpiLabel}>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input
              type="text"
              inputMode="search"
              enterKeyHint="search"
              placeholder={copy.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label={copy.searchAria}
            />
            {searchQuery && (
              <SmartTooltip content={copy.clearSearch}>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={styles.clearButton}
                  aria-label={copy.clearSearch}
                >
                  <FaTimes />
                </button>
              </SmartTooltip>
            )}
          </div>
          <span className={styles.toolbarMeta}>
            {filteredAndSortedClients.length}
          </span>
          {!loading && !error && (
            <div className={styles.filterChips} role="group" aria-label={copy.filterByContract}>
              {hasActiveFilters && (
                <SmartTooltip content={copy.clearFilters}>
                  <button
                    type="button"
                    className={`${styles.chip} ${styles.chipReset} ${styles.chipIconOnly}`}
                    onClick={() => {
                      setStatusFilters(new Set());
                      setModuleFilters(new Set());
                    }}
                    aria-label={copy.clearFilters}
                  >
                    <Icon icon="mdi:filter-off" className={styles.chipIcon} />
                  </button>
                </SmartTooltip>
              )}
              {localizedEnabledModules.map((mod) => {
                const moduleKey = mod.moduleKey;
                const count = moduleCounts[moduleKey] || 0;
                const active = moduleFilters.has(moduleKey);
                return (
                  <SmartTooltip key={moduleKey} content={mod.label}>
                    <button
                      type="button"
                      className={`${styles.chip} ${active ? styles.chipActive : ""} ${count === 0 ? styles.chipDisabled : ""}`}
                      onClick={() => toggleModuleFilter(moduleKey)}
                      disabled={count === 0}
                      aria-label={mod.label}
                    >
                      <Icon icon={mod.icon || "mdi:puzzle-outline"} className={styles.chipIcon} />
                      <span className={styles.chipLabel}>{mod.label}</span>
                      <span className={styles.chipCount}>{count}</span>
                    </button>
                  </SmartTooltip>
                );
              })}
            </div>
          )}
          <select
            className={styles.sortSelect}
            value={sortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label={copy.sortAria}
          >
            {copy.sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={styles.stateBox}>
            <Icon icon="mdi:loading" className={styles.spinning} />
            <span>{copy.loading}</span>
          </div>
        ) : error ? (
          <div className={`${styles.stateBox} ${styles.stateBoxError}`}>
            <Icon icon="mdi:alert-circle-outline" />
            <span>{error}</span>
          </div>
        ) : paginatedClients.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon icon="mdi:office-building-outline" className={styles.emptyStateIcon} />
            <p className={styles.emptyStateTitle}>{copy.emptyTitle}</p>
            <p className={styles.emptyStateHint}>{copy.emptyHint}</p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                setClientModalInitial(null);
                setShowClientModal(true);
              }}
            >
              <Icon icon="mdi:plus" />
              {copy.newEnterprise}
            </button>
          </div>
        ) : (
          <div className={styles.listBody}>
            <div className={styles.listArea}>
              {paginatedClients.map((client) => {
                const modules = client.options || client.contrat?.modules || {};
                const activeModules = getAllActiveModuleKeys(modules, contractModules);
                const contractStatus = getContractStatus(
                  client.contrat?.expiration,
                  client.contrat?.suspendu
                );

                return (
                  <article
                    key={client.id}
                    className={styles.card}
                    onClick={() => openClient(client)}
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        openClient(client, true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openClient(client);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.cardMain}>
                      <div className={styles.avatar}>
                        <span className={styles.avatarRing} style={{ borderColor: contractStatus.color }} />
                        {getClientInitials(client)}
                      </div>
                      <div className={styles.cardIdentity}>
                        <div className={styles.clientNameRow}>
                          <h2 className={styles.clientName}>
                            <SmartTooltip
                              content={formatClientTabLabel(client)}
                              as="span"
                              className={styles.clientNameInner}
                            >
                              {getClientNumber(client) ? (
                                <>
                                  <span className={styles.clientCode}>{getClientNumber(client)}</span>
                                  <span className={styles.clientNameText}>
                                    {getClientNameWithoutCode(client) || "-"}
                                  </span>
                                </>
                              ) : (
                                <span className={styles.clientNameText}>{client.name || "-"}</span>
                              )}
                            </SmartTooltip>
                          </h2>
                        </div>
                        <div className={styles.clientMeta}>
                          <SmartTooltip
                            content={copy.primaryContact}
                            as="span"
                            className={styles.clientMetaItem}
                          >
                            <Icon
                              icon="mdi:account-outline"
                              className={styles.clientMetaIcon}
                              aria-hidden
                            />
                            <span className={styles.clientMetaText}>
                              {client.primaryContactName || "-"}
                            </span>
                          </SmartTooltip>
                          <SmartTooltip content={copy.commercial} as="span" className={styles.clientMetaItem}>
                            <Icon
                              icon="mdi:account-tie-outline"
                              className={styles.clientMetaIcon}
                              aria-hidden
                            />
                            <span className={styles.clientMetaText}>
                              {client.commercial || "-"}
                            </span>
                          </SmartTooltip>
                        </div>
                        {(client.tags || []).length > 0 && (
                          <div className={styles.cardTags} aria-label={copy.tagsAria}>
                            {client.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className={styles.clientTagChip}
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
                    </div>

                    <div className={styles.cardModules}>
                      {activeModules.length > 0 ? (
                        activeModules.map((key) => (
                          <span key={key} className={styles.moduleTag}>
                            <Icon
                              icon={moduleIconByKey[key] || "mdi:puzzle-outline"}
                              className={styles.moduleTagIcon}
                            />
                            {resolveModuleLabel(key)}
                          </span>
                        ))
                      ) : (
                        <span className={styles.moduleTag}>{copy.noModuleOptions}</span>
                      )}
                    </div>

                    <div className={styles.cardExpiry}>
                      <span className={styles.expiryLabel}>{copy.expiration}</span>
                      <span
                        className={`${styles.expiryDate} ${getExpiryClass(contractStatus.status)}`}
                      >
                        {formatDate(client.contrat?.expiration)}
                      </span>
                    </div>

                    <div className={styles.cardEquip}>
                      {equipmentCountColumns.map((col) => {
                        const count = getEquipmentCount(client, col.key);
                        return (
                          <SmartTooltip
                            key={col.key}
                            content={col.label}
                            as="span"
                            className={styles.equipItem}
                          >
                            <Icon icon={col.icon} className={styles.equipIcon} />
                            <span className={styles.equipCount}>{count}</span>
                          </SmartTooltip>
                        );
                      })}
                    </div>

                    <Icon icon="mdi:chevron-right" className={styles.cardChevron} aria-hidden />
                  </article>
                );
              })}
            </div>

            {filteredAndSortedClients.length > 0 && (
              <div className={styles.pagination}>
                <div className={styles.paginationLeft}>
                  <span className={styles.paginationLabel}>{copy.perPage}</span>
                  <select
                    className={styles.paginationSelect}
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className={styles.paginationRight}>
                  <SmartTooltip content={copy.prevPage}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      aria-label={copy.prevPage}
                    >
                      <FaChevronLeft />
                    </button>
                  </SmartTooltip>
                  <span className={styles.paginationInfo}>
                    {copy.formatPageInfo(currentPage, totalPages)}
                  </span>
                  <SmartTooltip content={copy.nextPage}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      aria-label={copy.nextPage}
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

      {showClientModal &&
        createPortal(
          <ClientModal
            initialClient={clientModalInitial}
            onClose={() => {
              setShowClientModal(false);
              setClientModalInitial(null);
            }}
            onSaved={() => window.dispatchEvent(new Event("refreshEnterprises"))}
          />,
          document.getElementById("modal-root") || document.body
        )}
    </div>
  );
}
