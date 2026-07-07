import React, { useState, useMemo, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";

import API_BASE_URL from "../../../../config";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import styles from "../RapportMonitoringBuilder.module.css";
import {
  MonitoringStepShell,
  MonitoringStepSubsectionHeader,
} from "../MonitoringStepLayout";

function getAuthHeaders() {
  return {};
}

function normalizeAntivirus(sol) {
  if (!sol) return sol;
  const name =
    sol.solution || sol.logiciel || sol.nom || sol.name || "Solution antivirus";
  return {
    ...sol,
    nom: name,
    name,
  };
}

function getSolutionName(sol) {
  return sol.solution || sol.logiciel || sol.nom || sol.name || "Solution antivirus";
}

function formatExpiration(sol) {
  const raw =
    sol.expiration ??
    sol.expirityDate ??
    sol.syncData?.license?.expirationDate ??
    null;
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString("fr-FR");
  } catch {
    return String(raw);
  }
}

function getEndpointsCount(sol) {
  const list = sol.syncData?.endpoints?.list ?? sol.endpoints ?? [];
  if (Array.isArray(list)) return list.length;
  return sol.syncData?.endpoints?.total ?? sol.endpointsTotal ?? "-";
}

function getEndpointTypeIcon(type) {
  const t = (type ?? "").toLowerCase();
  if (t === "virtuel" || t === "virtual") return "mdi:cube-outline";
  if (t === "physique" || t === "physical") return "mdi:desktop-classic";
  return "mdi:monitor";
}

function getEndpointOsIcon(os) {
  if (!os || typeof os !== "string") return null;
  const s = os.toLowerCase();
  if (s.includes("windows") || s.includes("microsoft")) return "mdi:windows";
  if (s.includes("linux") || s.includes("ubuntu") || s.includes("debian") || s.includes("centos") || s.includes("rhel") || s.includes("red hat")) return "mdi:linux";
  if (s.includes("mac") || s.includes("darwin")) return "mdi:apple";
  return null;
}

const MS_24H = 24 * 60 * 60 * 1000;

function parseLastSeen(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return raw < 1e12 ? new Date(raw * 1000) : new Date(raw);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Certains retours API donnent un timestamp numérique sous forme de string.
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!Number.isNaN(n)) {
        return n < 1e12 ? new Date(n * 1000) : new Date(n);
      }
    }
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function formatLastSeen(raw) {
  const d = parseLastSeen(raw);
  return d ? d.toLocaleString("fr-FR") : "-";
}

function isLastSeenOver24h(raw) {
  const d = parseLastSeen(raw);
  if (!d) return true;
  return Date.now() - d.getTime() > MS_24H;
}

function formatPolicyDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString("fr-FR");
  } catch {
    return String(dateStr);
  }
}

function extractPoliciesList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.policies)) return raw.policies;
  return [];
}

function buildPolicyTableRows(policiesList, enrichedEndpoints) {
  const policyUsage = new Map();
  const endpointOnlyNames = new Map();

  enrichedEndpoints.forEach((ep) => {
    const policyId = ep.policy?.id;
    if (policyId != null) {
      const key = String(policyId);
      const current = policyUsage.get(key) || { count: 0, applied: 0 };
      current.count += 1;
      if (ep.policy?.applied) current.applied += 1;
      policyUsage.set(key, current);
      return;
    }

    const name =
      ep.policy?.name ||
      ep.policyName ||
      "Sans politique";
    endpointOnlyNames.set(name, (endpointOnlyNames.get(name) || 0) + 1);
  });

  const allPolicies = extractPoliciesList(policiesList);
  if (allPolicies.length > 0) {
    const usedIds = new Set(policyUsage.keys());
    const visiblePolicies =
      usedIds.size > 0
        ? allPolicies.filter((p) => p?.id != null && usedIds.has(String(p.id)))
        : allPolicies;

    return visiblePolicies.map((policy) => {
      const usage = policyUsage.get(String(policy.id)) || { count: 0, applied: 0 };
      const endpoints =
        usage.count > 0 ? usage.count : policy.endpointsCount ?? 0;
      return {
        key: String(policy.id),
        name: policy.name || policy.policyName || "Sans nom",
        type: policy.type || policy.policyType || "-",
        endpoints,
        applied: usage.applied,
        totalForApplied: usage.count || endpoints,
        createdAt: policy.details?.createDate,
        modifiedAt: policy.details?.lastModifyDate,
        createdBy: policy.details?.createdBy,
      };
    });
  }

  if (endpointOnlyNames.size > 0) {
    return Array.from(endpointOnlyNames.entries()).map(([name, count]) => ({
      key: name,
      name,
      type: "-",
      endpoints: count,
      applied: null,
      totalForApplied: count,
      createdAt: null,
      modifiedAt: null,
      createdBy: null,
    }));
  }

  return [];
}

const ANTIVIRUS_POLICY_COLUMNS = [
  {
    id: "name",
    label: "Politique",
    render: (row) => (
      <div className={equipmentStyles.nameCell}>
        <Icon icon="mdi:shield-account-outline" width={16} height={16} />
        <span className={equipmentStyles.internetCellBold}>{row.name}</span>
      </div>
    ),
  },
  {
    id: "type",
    label: "Type",
    render: (row) => row.type || "-",
  },
  {
    id: "endpoints",
    label: "Endpoints",
    render: (row) => row.endpoints ?? "-",
  },
  {
    id: "applied",
    label: "Appliquée",
    render: (row) =>
      row.applied == null ? (
        "-"
      ) : (
        <span
          style={{
            padding: "0.2rem 0.45rem",
            borderRadius: "4px",
            fontSize: "0.75rem",
            backgroundColor: row.applied > 0 ? "#d1fae5" : "#f3f4f6",
            color: row.applied > 0 ? "#059669" : "#6b7280",
            fontWeight: 500,
          }}
        >
          {row.applied} / {row.totalForApplied}
        </span>
      ),
  },
  {
    id: "createdAt",
    label: "Créée le",
    render: (row) => formatPolicyDate(row.createdAt),
  },
  {
    id: "modifiedAt",
    label: "Modifiée le",
    render: (row) => formatPolicyDate(row.modifiedAt),
  },
  {
    id: "createdBy",
    label: "Créée par",
    render: (row) => row.createdBy || "-",
  },
];

function SolutionDetailBlock({
  solution,
  enrichedEndpoints,
  policiesList,
  endpointSearch,
  setEndpointSearch,
  endpointSort,
  setEndpointSort,
}) {
  const endpointList = useMemo(() => {
    const raw = solution.syncData?.endpoints?.list ?? solution.endpoints ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [solution]);

  const filteredEndpoints = useMemo(() => {
    const q = endpointSearch.trim().toLowerCase();
    if (!q) return endpointList;
    return endpointList.filter((ep) => {
      const name = (ep.name ?? "").toLowerCase();
      const fqdn = (ep.fqdn ?? "").toLowerCase();
      const ip = (ep.ip ?? "").toLowerCase();
      const os = (ep.operatingSystem ?? "").toLowerCase();
      const type = (ep.type ?? "").toLowerCase();
      return name.includes(q) || fqdn.includes(q) || ip.includes(q) || os.includes(q) || type.includes(q);
    });
  }, [endpointList, endpointSearch]);

  const sortedEndpoints = useMemo(() => {
    const { column: sortCol, direction: sortDir } = endpointSort;
    if (!sortCol) return filteredEndpoints;
    return [...filteredEndpoints].sort((a, b) => {
      if (sortCol === "managed") {
        const va = a.isManaged === true ? 1 : a.isManaged === false ? 0 : -1;
        const vb = b.isManaged === true ? 1 : b.isManaged === false ? 0 : -1;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortCol === "status") {
        const getStatus = (ep) => {
          const enriched = enrichedEndpoints.find(
            (e) =>
              e.id === ep.id ||
              String(e.id) === String(ep.id) ||
              ((e.name ?? "") === (ep.name ?? "") &&
                (e.ip ?? "") === (ep.ip ?? "") &&
                (e.fqdn ?? "") === (ep.fqdn ?? ""))
          );
          const state = enriched?.endpointState ?? ep.endpointState;
          if (state === 1 || ep.isManaged) return 2; // Actif
          if (state === 2) return 1; // Hors ligne
          return 0; // Inconnu
        };
        const va = getStatus(a);
        const vb = getStatus(b);
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortCol === "lastSeen") {
        const findEnriched = (ep) =>
          enrichedEndpoints.find((e) =>
            e.id === ep.id || String(e.id) === String(ep.id) ||
            ((e.name ?? "") === (ep.name ?? "") && (e.ip ?? "") === (ep.ip ?? "") && (e.fqdn ?? "") === (ep.fqdn ?? ""))
          );
        const getTs = (ep) => {
          const enriched = findEnriched(ep);
          const d = parseLastSeen(enriched?.lastSeen);
          return d ? d.getTime() : 0;
        };
        return sortDir === "asc" ? getTs(a) - getTs(b) : getTs(b) - getTs(a);
      }
      const getStr = (ep) => {
        switch (sortCol) {
          case "name": return (ep.name ?? "").toLowerCase();
          case "ip": return (ep.ip ?? "").toLowerCase();
          case "fqdn": return (ep.fqdn ?? "").toLowerCase();
          case "os": return (ep.operatingSystem ?? "").toLowerCase();
          default: return "";
        }
      };
      const cmp = String(getStr(a)).localeCompare(String(getStr(b)));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredEndpoints, endpointSort, enrichedEndpoints]);

  const policyTableRows = useMemo(
    () => buildPolicyTableRows(policiesList, enrichedEndpoints),
    [policiesList, enrichedEndpoints]
  );

  const policyEquipments = useMemo(
    () =>
      policyTableRows.map((row, index) => ({
        ...row,
        id: `${row.key}-${index}`,
        nom: row.name,
        name: row.name,
      })),
    [policyTableRows]
  );

  const enrichedMapById = useMemo(() => {
    const map = new Map();
    enrichedEndpoints.forEach((ep) => {
      if (ep.id != null) {
        map.set(ep.id, ep);
        map.set(String(ep.id), ep); // fallback si sync a number et API retourne string
      }
      const key = `${ep.name ?? ""}|${ep.ip ?? ""}|${ep.fqdn ?? ""}`.trim();
      if (key && key !== "||") map.set(key, ep);
    });
    return map;
  }, [enrichedEndpoints]);

  const getEndpointModules = (ep, enriched) => {
    const modules = enriched?.modules ?? ep.modules ?? [];
    let list = [];
    if (Array.isArray(modules)) {
      list = modules;
    } else if (modules && typeof modules === "object") {
      list = Object.keys(modules).filter((k) => modules[k] === true);
    }

    const moduleNames = {
      advancedThreatControl: "Contrôle avancé des menaces",
      antimalware: "Antimalware",
      contentControl: "Contrôle de contenu",
      deviceControl: "Contrôle des périphériques",
      firewall: "Pare-feu",
      powerUser: "Utilisateur avancé",
    };

    const abbreviations = {
      advancedThreatControl: "ATC",
      antimalware: "AM",
      antiphishing: "AP",
      antitampering: "AT",
      contentControl: "CC",
      deviceControl: "DC",
      firewall: "FW",
      powerUser: "PU",
    };

    const seen = new Set();
    return list.reduce((acc, moduleKey) => {
      const key = String(moduleKey);
      if (seen.has(key)) return acc;
      seen.add(key);
      const abbr =
        abbreviations[key] || key.substring(0, 3).toUpperCase();
      const fullName = moduleNames[key] || key;
      acc.push({ abbr, fullName, moduleKey: key });
      return acc;
    }, []);
  };

  const getEndpointPolicyName = (ep, enriched) => {
    if (enriched?.policy && (enriched.policy.name || enriched.policy.id)) {
      return enriched.policy.name || `ID ${enriched.policy.id}`;
    }
    if (ep.policy && (ep.policy.name || ep.policy.id)) {
      return ep.policy.name || `ID ${ep.policy.id}`;
    }
    return ep.policyName || null;
  };

  const isEndpointInfected = (ep, enriched) =>
    enriched?.isInfected === true ||
    ep.isInfected === true ||
    enriched?.malwareDetected === true ||
    ep.malwareDetected === true;

  return (
    <div className={styles.antivirusSolutionSections}>
      <h4 className={styles.stepSectionTitle}>{getSolutionName(solution)}</h4>

      {policyEquipments.length > 0 && (
        <InfrastructureEquipmentTable
          title="Politiques de sécurité"
          moduleKey="Antivirus"
          equipments={policyEquipments}
          columns={ANTIVIRUS_POLICY_COLUMNS}
          showSearch={true}
          showActions={false}
          totalCountLabel={`${policyEquipments.length} politique(s) au total`}
        />
      )}

      {endpointList.length > 0 && (
        <section className={styles.antivirusEndpointsSection}>
          <MonitoringStepSubsectionHeader
            title={`Endpoints (${sortedEndpoints.length}${endpointList.length !== sortedEndpoints.length ? ` / ${endpointList.length}` : ""})`}
            searchValue={endpointSearch}
            onSearchChange={setEndpointSearch}
            onSearchClear={() => setEndpointSearch("")}
            searchPlaceholder="Rechercher (nom, FQDN, IP, OS, type)..."
          />
          <div className={equipmentStyles.hardwarePageEmbedded}>
            <div className={`${equipmentStyles.tableWrapper} ${styles.antivirusEndpointsTableWrapper}`}>
            <table className={equipmentStyles.equipmentTable}>
              <thead>
                <tr>
                  {[
                    { key: "name", label: "Nom" },
                    { key: "fqdn", label: "FQDN" },
                    { key: "status", label: "Statut" },
                    { key: "managed", label: "Géré" },
                    { key: "ip", label: "IP" },
                    { key: "os", label: "OS" },
                    { key: "lastSeen", label: "Dernière connexion" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className={equipmentStyles.sortableTh}
                      onClick={() =>
                        setEndpointSort((prev) => ({
                          column: key,
                          direction:
                            prev.column === key && prev.direction === "asc"
                              ? "desc"
                              : "asc",
                        }))
                      }
                      title={`Trier par ${label}`}
                    >
                      <span>{label}</span>
                      {endpointSort.column === key && (
                        <Icon
                          icon={
                            endpointSort.direction === "asc"
                              ? "mdi:chevron-up"
                              : "mdi:chevron-down"
                          }
                          width={16}
                          height={16}
                          className={styles.antivirusModalSortIcon}
                        />
                      )}
                    </th>
                  ))}
                  <th>
                    <span className={equipmentStyles.thContent}>Modules</span>
                  </th>
                  <th>
                    <span className={equipmentStyles.thContent}>Politique</span>
                  </th>
                  <th>
                    <span className={equipmentStyles.thContent}>Infecté</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEndpoints.map((ep, idx) => {
                  const typeIcon = getEndpointTypeIcon(ep.type);
                  const osIcon = getEndpointOsIcon(ep.operatingSystem);
                  const fallbackKey = `${ep.name ?? ""}|${ep.ip ?? ""}|${ep.fqdn ?? ""}`.trim();
                  const enriched = enrichedMapById.get(ep.id)
                    ?? enrichedMapById.get(String(ep.id))
                    ?? (fallbackKey ? enrichedMapById.get(fallbackKey) : null);
                  const lastSeen =
                    enriched?.lastSeen ??
                    ep.lastSeen ??
                    ep.lastSuccessfulScan?.date ??
                    ep.lastSuccessfulScanDate ??
                    null;
                  const over24h = isLastSeenOver24h(lastSeen);
                  const modules = getEndpointModules(ep, enriched);
                  const policyName = getEndpointPolicyName(ep, enriched);
                  const infected = isEndpointInfected(ep, enriched);
                  const endpointState = enriched?.endpointState ?? ep.endpointState;
                  const statusLabel =
                    endpointState === 1 || ep.isManaged ? "Actif" : "Inactif";
                  return (
                    <tr
                      key={`${String(ep.id ?? "ep")}-${idx}-${ep.fqdn ?? ep.name ?? ""}`}
                      className={equipmentStyles.equipmentRow}
                    >
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          {typeIcon && <Icon icon={typeIcon} width={18} height={18} title={ep.type ?? "Type"} />}
                          {ep.name ?? "-"}
                        </span>
                      </td>
                      <td>{ep.fqdn ?? "-"}</td>
                      <td>
                        <span
                          style={{
                            padding: "0.15rem 0.45rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            backgroundColor:
                              statusLabel === "Actif"
                                ? "#d1fae5"
                                : statusLabel === "Inactif"
                                ? "#fee2e2"
                                : "#e5e7eb",
                            color:
                              statusLabel === "Actif"
                                ? "#16a34a"
                                : statusLabel === "Inactif"
                                ? "#dc2626"
                                : "#4b5563",
                            fontWeight: 500,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        {ep.isManaged === true ? "Oui" : ep.isManaged === false ? "Non" : "-"}
                      </td>
                      <td>{ep.ip ?? "-"}</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          {osIcon && <Icon icon={osIcon} width={18} height={18} title={ep.operatingSystem ?? "OS"} />}
                          {ep.operatingSystem ?? "-"}
                        </span>
                      </td>
                      <td>
                        {lastSeen ? (
                          <div style={{ fontSize: "0.75rem" }}>
                            <div
                              style={{
                                color: over24h ? "#dc2626" : "#16a34a",
                                fontWeight: 500,
                                marginBottom: "0.15rem",
                              }}
                            >
                              {over24h ? "> 24h" : "< 24h"}
                            </div>
                            <div
                              style={{
                                color: "#6b7280",
                                fontSize: "0.7rem",
                              }}
                            >
                              {formatLastSeen(lastSeen)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                            N/A
                          </span>
                        )}
                      </td>
                      <td>
                        {modules.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.25rem",
                              maxWidth: "140px",
                            }}
                          >
                            {modules.map((m, modIdx) => (
                              <span
                                key={`${String(ep.id ?? idx)}-${m.moduleKey}-${modIdx}`}
                                style={{
                                  padding: "0.1rem 0.35rem",
                                  borderRadius: "4px",
                                  fontSize: "0.65rem",
                                  backgroundColor: "#e0e7ff",
                                  color: "#4338ca",
                                  fontWeight: 600,
                                }}
                                title={m.fullName}
                              >
                                {m.abbr}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                            N/A
                          </span>
                        )}
                      </td>
                      <td>
                        {policyName ? (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#374151",
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                            }}
                            title={policyName}
                          >
                            {policyName}
                          </span>
                        ) : (
                          <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                            N/A
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            backgroundColor: infected ? "#fee2e2" : "#d1fae5",
                            color: infected ? "#dc2626" : "#059669",
                            fontWeight: 500,
                          }}
                        >
                          {infected ? "Oui" : "Non"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </section>
      )}

      {policyEquipments.length === 0 && endpointList.length === 0 && (
        <div className={styles.antivirusModalNoData}>
          Synchronisez pour charger les politiques et les endpoints.
        </div>
      )}
    </div>
  );
}

export default function AntivirusStep({
  client,
  onOpenComments,
  onTicketCreatedForEquipment,
  onRefreshClient,
  onAntivirusSyncStateChange,
  commentCounts,
  ticketCounts,
  highlightedEquipmentKey,
  reportPeriod,
}) {
  const rawAntivirus = client?.equipements?.Antivirus;
  const [endpointSearch, setEndpointSearch] = useState("");
  const [endpointSort, setEndpointSort] = useState({ column: null, direction: "asc" });
  const [syncingKey, setSyncingKey] = useState(null);

  let solutions = [];
  if (Array.isArray(rawAntivirus)) {
    solutions = rawAntivirus;
  } else if (rawAntivirus && Array.isArray(rawAntivirus.solutions)) {
    solutions = rawAntivirus.solutions;
  }

  const antivirusList = solutions.map(normalizeAntivirus);
  const solutionsWithCompany = useMemo(
    () => antivirusList.filter((s) => s.companyId ?? s.syncData?.company?.id),
    [antivirusList]
  );

  const columns = [
    {
      id: "solution",
      label: "Solution",
      render: (sol) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <Icon
            icon="simple-icons:bitdefender"
            width={18}
            height={18}
            title="Bitdefender"
          />
          {sol.nom || sol.solution || sol.logiciel || "-"}
        </span>
      ),
    },
    {
      id: "company",
      label: "Entreprise",
      render: (sol) =>
        sol.companyName ?? sol.syncData?.company?.name ?? "-",
    },
    {
      id: "utilisateurs",
      label: "Utilisateurs",
      render: (sol) =>
        sol.licencesUtilisees ??
        sol.utilisateurs ??
        sol.syncData?.license?.usedLicenses ??
        "-",
    },
    {
      id: "licences",
      label: "Licences",
      render: (sol) =>
        sol.licencesTotales ??
        sol.licences ??
        sol.syncData?.license?.totalLicenses ??
        "-",
    },
    {
      id: "endpoints",
      label: "Endpoints",
      render: (sol) => {
        const list = sol.syncData?.endpoints?.list ?? sol.endpoints ?? [];
        if (Array.isArray(list)) return list.length;
        return sol.syncData?.endpoints?.total ?? sol.endpointsTotal ?? "-";
      },
    },
    {
      id: "expiration",
      label: "Expiration",
      render: (sol) => formatExpiration(sol),
    },
  ];

  const handleSyncCheckMK = async (sol, { equipmentKey }) => {
    const companyId = sol.companyId ?? sol.syncData?.company?.id ?? null;
    if (!companyId) {
      toast.error("Impossible de synchroniser : Company ID Bitdefender manquant.");
      return;
    }
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) {
      toast.error("Client non identifié.");
      return;
    }
    setSyncingKey(equipmentKey);
    if (typeof onAntivirusSyncStateChange === "function") {
      onAntivirusSyncStateChange(true);
    }
    try {
      // 1) Déclencher la synchronisation BitDefender (même route que la page cybersécurité)
      const response = await fetch(`${API_BASE_URL}/bitdefender/sync/${companyId}`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur HTTP: ${response.status}`);
      }
      const result = await response.json();
      if (!result?.success || !result?.data) {
        throw new Error(result?.error || "Erreur lors de la synchronisation");
      }
      const syncData = result.data;

      // 2) Récupérer statistiques, endpoints enrichis et politiques pour aligner avec AntivirusDetailPage
      const [statsResponse, enrichedResponse, policiesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/bitdefender/statistics/${companyId}`, {
          headers: getAuthHeaders(),
          credentials: "include",
        }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/bitdefender/endpoints/${companyId}/enriched`, {
          headers: getAuthHeaders(),
          credentials: "include",
        }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/bitdefender/policies/${companyId}`, {
          headers: getAuthHeaders(),
          credentials: "include",
        }).catch(() => ({ ok: false })),
      ]);

      const statsJson = statsResponse.ok ? await statsResponse.json() : null;
      const stats = statsJson?.statistics || statsJson?.data || null;

      const enrichedJson = enrichedResponse.ok ? await enrichedResponse.json() : null;
      const enrichedEndpoints =
        enrichedJson?.endpoints || enrichedJson?.data?.endpoints || [];
      const enrichedCompany =
        enrichedJson?.company || enrichedJson?.data?.company || syncData?.company || null;

      const policiesJson = policiesResponse.ok ? await policiesResponse.json() : null;
      const policiesList = extractPoliciesList(
        policiesJson?.policies || policiesJson?.data?.policies
      );

      // 3) Fusionner endpoints bruts + enrichis + politiques
      const baseEndpoints =
        syncData?.endpoints?.list || syncData?.endpoints || [];

      const enrichedById = {};
      enrichedEndpoints.forEach((ep) => {
        if (ep && ep.id != null) {
          enrichedById[ep.id] = ep;
        }
      });

      const policyById = {};
      policiesList.forEach((p) => {
        if (p && p.id != null) {
          policyById[p.id] = p;
        }
      });

      // Fusion avec les endpoints déjà connus pour ne pas perdre d'information
      const previousEndpoints =
        sol.endpoints ||
        sol.syncData?.endpoints?.list ||
        sol.syncData?.endpoints ||
        [];

      const makeKey = (ep) => {
        if (!ep) return "";
        if (ep.id != null) return `id:${String(ep.id)}`;
        const name = ep.name || ep.computerName || "";
        const ip = ep.ip || "";
        const fqdn = ep.fqdn || "";
        return `k:${name}|${ip}|${fqdn}`;
      };

      const mergedMap = new Map();

      (Array.isArray(previousEndpoints) ? previousEndpoints : []).forEach(
        (ep) => {
          const key = makeKey(ep);
          if (!key) return;
          mergedMap.set(key, ep);
        }
      );

      baseEndpoints.forEach((ep) => {
        const key = makeKey(ep);
        if (!key) return;
        const existing = mergedMap.get(key) || {};

        const enriched =
          ep && ep.id != null ? enrichedById[ep.id] || {} : {};
        const endpointPolicy = enriched.policy || ep.policy || existing.policy || null;

        let policyName = existing.policyName || null;
        if (endpointPolicy && endpointPolicy.id != null && policyById[endpointPolicy.id]) {
          policyName = policyById[endpointPolicy.id].name || null;
        } else if (endpointPolicy && endpointPolicy.name) {
          policyName = endpointPolicy.name;
        }

        const mergedEp = {
          ...existing,
          ...ep,
          lastSeen: enriched.lastSeen ?? ep.lastSeen ?? existing.lastSeen,
          modules: enriched.modules ?? ep.modules ?? existing.modules,
          policy: endpointPolicy || existing.policy,
          policyName: policyName || existing.policyName,
          isInfected:
            enriched.isInfected ??
            ep.isInfected ??
            existing.isInfected,
          endpointState:
            enriched.endpointState ??
            ep.endpointState ??
            existing.endpointState,
        };

        mergedMap.set(key, mergedEp);
      });

      const mergedEndpoints = Array.from(mergedMap.values());

      const solutionName = sol.solution || sol.logiciel || sol.nom || "GravityZone BitDefender";
      const companyName = sol.companyName ?? enrichedCompany?.name ?? syncData?.company?.name ?? "";
      const license = syncData?.license || stats || null;
      const total =
        license?.totalLicenses ??
        license?.raw?.totalSlots ??
        license?.raw?.total ??
        null;
      const used =
        license?.usedLicenses ??
        license?.raw?.usedSlots ??
        license?.raw?.used ??
        null;
      const expirationDate =
        license?.expirationDate ??
        license?.raw?.expiryDate ??
        license?.raw?.expirationDate ??
        null;
      const expiration = expirationDate
        ? new Date(expirationDate).toISOString().split("T")[0]
        : "";

      // 4) Sauvegarder en base de données (v_b_clients_m_antivirus) avec les endpoints enrichis
      const putResponse = await fetch(
        `${API_BASE_URL}/bitdefender/antivirus/${clientId}`,
        {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            item_key: `solution-${solutionName}-${companyId}`,
            name: `${solutionName} #1`,
            data: {
              solution: solutionName,
              companyId,
              companyName,
              licencesTotales: total != null ? String(total) : "",
              licencesUtilisees: used != null ? String(used) : "",
              expiration,
              endpoints: Array.isArray(mergedEndpoints) ? mergedEndpoints : [],
              syncData: {
                company: enrichedCompany || syncData?.company || null,
                license: license || null,
                endpoints: mergedEndpoints,
                policies: policiesList,
                lastSync: new Date().toISOString(),
              },
            },
          }),
        }
      );
      if (!putResponse.ok) {
        const errData = await putResponse.json().catch(() => ({}));
        throw new Error(errData.error || "Erreur lors de la sauvegarde");
      }
      const putResult = await putResponse.json();
      if (putResult?.success !== true) {
        throw new Error(putResult?.error || "Erreur lors de la sauvegarde");
      }
      if (typeof onRefreshClient === "function") {
        await onRefreshClient();
      }
      toast.success("Synchronisation Bitdefender réussie. Données mises à jour.");
    } catch (err) {
      console.error("Sync Bitdefender:", err);
      toast.error(err?.message || "Erreur lors de la synchronisation Bitdefender.");
    } finally {
      setSyncingKey(null);
      if (typeof onAntivirusSyncStateChange === "function") {
        onAntivirusSyncStateChange(false);
      }
    }
  };

  return (
    <MonitoringStepShell>
      <InfrastructureEquipmentTable
        title="Antivirus"
        moduleKey="Antivirus"
        equipments={antivirusList}
        columns={columns}
        onOpenComments={onOpenComments}
        onCreateTicket={onTicketCreatedForEquipment}
        clientId={client?.id ?? client?.uuid}
        onSyncCheckMK={handleSyncCheckMK}
        commentCounts={commentCounts}
        ticketCounts={ticketCounts}
        highlightedEquipmentKey={highlightedEquipmentKey}
        reportPeriod={reportPeriod}
        syncingEquipmentKey={syncingKey}
        forceSyncButton={true}
        showSearch={false}
        externalLink={{
          url: "https://gravityzone.bitdefender.com/",
          title: "Ouvrir Bitdefender GravityZone",
        }}
      />

      {solutionsWithCompany.map((solution) => {
        const companyId = solution.companyId ?? solution.syncData?.company?.id;
        const enrichedEndpointsSource =
          (Array.isArray(solution.syncData?.endpoints?.list) && solution.syncData.endpoints.list) ||
          (Array.isArray(solution.syncData?.endpoints) && solution.syncData.endpoints) ||
          (Array.isArray(solution.endpoints) && solution.endpoints) ||
          [];
        const enrichedEndpoints = enrichedEndpointsSource;
        const policiesList =
          solution.syncData?.policies ||
          solution.data?.policies ||
          solution.policies ||
          [];

        return (
          <div key={companyId || getSolutionName(solution)}>
            <SolutionDetailBlock
              solution={solution}
              enrichedEndpoints={enrichedEndpoints}
              policiesList={policiesList}
              endpointSearch={endpointSearch}
              setEndpointSearch={setEndpointSearch}
              endpointSort={endpointSort}
              setEndpointSort={setEndpointSort}
            />
          </div>
        );
      })}
    </MonitoringStepShell>
  );
}
