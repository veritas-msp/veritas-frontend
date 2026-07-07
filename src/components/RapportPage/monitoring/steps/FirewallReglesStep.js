import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import styles from "../RapportMonitoringBuilder.module.css";

function parseCSV(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (ch === "\"") {
        if (inQuotes && next === "\"") {
          current += "\"";
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || "").replace(/^"|"$/g, "");
    });
    return row;
  });
  return { headers, rows };
}

function analyzeRules(rows) {
  const filterRules = [];
  const natRules = [];
  rows.forEach((row, index) => {
    const typeSlot = row["#type_slot"] || "";
    const ruleName = row["#rule_name"] || "";
    if (!ruleName) return;
    if (typeSlot === "local_filter_slot") {
      filterRules.push({
        index: index + 1,
        ruleName,
        state: row["#state"] || "",
        action: row["#action"] || "",
        fromSrc: row["#from_src"] || "",
        toDest: row["#to_dest"] || "",
        service: row["#service"] || "",
      });
    } else if (typeSlot === "local_nat_slot") {
      natRules.push({
        index: index + 1,
        ruleName,
        state: row["#state"] || "",
        fromSrc: row["#from_src"] || "",
        toDest: row["#to_dest"] || "",
        natFromTarget: row["#nat_from_target"] || "",
        natToTarget: row["#nat_to_target"] || "",
      });
    }
  });
  return {
    filterRules,
    natRules,
    totalFilterRules: filterRules.length,
    totalNatRules: natRules.length,
  };
}

function analyzeObjects(rows) {
  const list = rows.map((row, idx) => ({
    index: idx + 1,
    type: (row["#type"] || "unknown").toLowerCase(),
    name: row["#name"] || `Objet ${idx + 1}`,
    value:
      row["#ip"] ||
      row["#ipv6"] ||
      row["#begin"] ||
      row["#gwname"] ||
      row["#target"] ||
      "-",
    comment: row["#comment"] || "",
  }));
  return { list, total: list.length };
}

function analyzeAlarms(rows) {
  const entries = rows
    .filter((row) => (row.line_type || row["line_type"]) === "data")
    .map((row) => ({
      label: (row.value || row["value"] || "").trim(),
      count: Number(row.count || row["count"] || 0),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return {
    entries,
    total: entries.reduce((sum, e) => sum + e.count, 0),
  };
}

function analyzeWebTraffic(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const service = (row.dstiprep || row["dstiprep"] || row.dstname || row["dstname"] || "Service inconnu").toString();
    const bytes = Number(row.rcvd || row["rcvd"] || 0) + Number(row.sent || row["sent"] || 0);
    map.set(service, (map.get(service) || 0) + bytes);
  });
  const entries = [...map.entries()]
    .map(([service, totalBytes]) => ({ service, totalBytes }))
    .sort((a, b) => b.totalBytes - a.totalBytes)
    .slice(0, 5);
  return { entries };
}

function getServiceIconKey(label) {
  if (!label) return null;
  const s = label.toString().toLowerCase();
  if (s.includes("amazonaws") || s.includes("aws")) return "aws";
  if (s.includes("google") || s.includes("gstatic") || s.includes("youtube")) return "google";
  if (s.includes("adista")) return "adista";
  if (s.includes("github")) return "github";
  if (s.includes("atlassian") || s.includes("jira") || s.includes("confluence")) return "atlassian";
  if (s.includes("cloudflare")) return "cloudflare";
  if (s.includes("microsoft") || s.includes("office365") || s.includes("sharepoint") || s.includes("azure")) return "microsoft";
  return null;
}

function prettyBytes(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

function normalizeFirewall(fw) {
  if (!fw) return fw;
  if (fw.data && typeof fw.data === "object") {
    const { id: _dataId, ...rest } = fw.data;
    return {
      id: fw.id,
      ...rest,
      nom: fw.data.nom ?? fw.name ?? fw.item_key ?? "",
      site: fw.data.site ?? fw.site ?? "",
      modele: fw.data.modele ?? fw.modele ?? "",
    };
  }
  return fw;
}

export default function FirewallReglesStep({
  client,
  persistedState,
  onPersistState,
  onOpenComments,
  onTicketCreatedForEquipment,
  commentCounts = {},
  ticketCounts = {},
  highlightedEquipmentKey,
  reportPeriod,
}) {
  const fileInputRef = useRef(null);
  const helpPopoverRef = useRef(null);
  const [helpPopoverOpen, setHelpPopoverOpen] = useState(false);

  const [rulesData, setRulesData] = useState(() => persistedState?.rulesData ?? null);
  const [objectsData, setObjectsData] = useState(() => persistedState?.objectsData ?? null);
  const [alarmsData, setAlarmsData] = useState(() => persistedState?.alarmsData ?? null);
  const [webTrafficData, setWebTrafficData] = useState(() => persistedState?.webTrafficData ?? null);

  const syncPersistedState = (next) => {
    if (typeof onPersistState === "function") {
      onPersistState({
        rulesData: next.rulesData,
        objectsData: next.objectsData,
        alarmsData: next.alarmsData,
        webTrafficData: next.webTrafficData,
      });
    }
  };

  const totalTrafficBytes = useMemo(
    () => (webTrafficData?.entries || []).reduce((sum, e) => sum + (e.totalBytes || 0), 0),
    [webTrafficData]
  );

  useEffect(() => {
    if (!helpPopoverOpen) return;
    const onPointerDown = (e) => {
      if (helpPopoverRef.current && !helpPopoverRef.current.contains(e.target)) {
        setHelpPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [helpPopoverOpen]);

  const rawFirewalls = Array.isArray(client?.equipements?.Firewalls)
    ? client.equipements.Firewalls
    : [];
  const firewalls = rawFirewalls.map(normalizeFirewall);

  const handleUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { headers, rows } = parseCSV(e.target?.result || "");
        if (!rows.length) {
          toast.error("Le fichier CSV est vide ou invalide.");
          return;
        }
        const normalizedHeaders = headers.map((h) => h.toLowerCase());
        if (normalizedHeaders.includes("line_type") && normalizedHeaders.includes("value")) {
          const analyzed = analyzeAlarms(rows);
          setAlarmsData(analyzed);
          syncPersistedState({
            rulesData,
            objectsData,
            alarmsData: analyzed,
            webTrafficData,
          });
          toast.success(`${analyzed.entries.length} entrees d'alarme importees.`);
        } else if (normalizedHeaders.includes("dstname") && normalizedHeaders.includes("dstportname")) {
          const analyzed = analyzeWebTraffic(rows);
          setWebTrafficData(analyzed);
          syncPersistedState({
            rulesData,
            objectsData,
            alarmsData,
            webTrafficData: analyzed,
          });
          toast.success("Statistiques de trafic web importees.");
        } else {
          toast.error("Type de fichier CSV non reconnu.");
        }
      } catch (err) {
        console.error("Import Firewall CSV:", err);
        toast.error("Erreur pendant l'import CSV.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div className={styles.antivirusStepContainer}>
      <div className={styles.infraTableHeaderInline}>
        <div className={styles.infraTableHeaderInlineInfo}>
          <div className={styles.infraTableTitle}>Règles de firewall</div>
          <div className={styles.infraTableHeaderInlineCount}>
            {firewalls.length === 0
              ? "Aucun périphérique firewall trouvé."
              : `${firewalls.length} périphérique(s) firewall`}
          </div>
        </div>
        <div
          className={styles.infraTableToolbarInline}
          style={{ justifyContent: "flex-end", gap: "0.5rem", marginBottom: 0 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleUpload(e.target.files?.[0])}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() => fileInputRef.current?.click()}
            title="Importer un fichier CSV Stormshield"
          >
            <Icon icon="mdi:upload" />
            <span>Importer un CSV</span>
          </button>
          <div className={styles.firewallHelpWrap} ref={helpPopoverRef}>
            <button
              type="button"
              className={styles.infraIconButton}
              aria-expanded={helpPopoverOpen}
              aria-haspopup="dialog"
              title="Aide export alarmes Stormshield"
              onClick={(e) => {
                e.stopPropagation();
                setHelpPopoverOpen((v) => !v);
              }}
            >
              <Icon icon="mdi:help-circle-outline" />
            </button>
            {helpPopoverOpen ? (
              <div
                className={styles.firewallHelpPopover}
                role="dialog"
                aria-label="Export des alarmes depuis Stormshield"
              >
                <p className={styles.firewallHelpPopoverTitle}>Export CSV (Stormshield)</p>
                <ol className={styles.firewallHelpPopoverList}>
                  <li>Aller dans le menu Reporting / Logs / Alarmes (ou équivalent).</li>
                  <li>Filtrer la période souhaitée.</li>
                  <li>
                    Utiliser l&apos;option d&apos;export CSV (généralement via un bouton Export ou
                    sauvegarde).
                  </li>
                  <li>Importer ensuite le fichier ici dans Veritas.</li>
                </ol>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {firewalls.length > 0 && (
        <div style={{ marginTop: "0rem", marginBottom: "0.5rem" }}>
          <div className={styles.antivirusModalEndpointsScroll}>
            <table className={styles.antivirusModalTable}>
              <thead>
                <tr>
                  <th className={styles.antivirusStickyTh}>Nom</th>
                  <th className={styles.antivirusStickyTh}>Site</th>
                  <th className={styles.antivirusStickyTh}>Modèle</th>
                  <th className={styles.antivirusStickyTh}>Firmware</th>
                </tr>
              </thead>
              <tbody>
                {firewalls.map((fw, idx) => (
                  <tr key={fw.id || fw.nom || idx}>
                    <td>{fw.nom || fw.name || "-"}</td>
                    <td>{fw.site || "-"}</td>
                    <td>{fw.modele || "-"}</td>
                    <td>{fw.firmware || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: "0.25rem" }}>
        <h5 className={styles.antivirusModalSubtitle}>Alarmes (top 10)</h5>
        <div className={styles.antivirusModalEndpointsScroll}>
          <table className={styles.antivirusModalTable}>
            <thead>
              <tr>
                <th className={styles.antivirusStickyTh}>Libelle</th>
                <th className={styles.antivirusStickyTh}>Occurrences</th>
                <th className={styles.antivirusStickyTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(alarmsData?.entries || []).length > 0 ? (alarmsData.entries || []).map((a, idx) => {
                const moduleKey = "FirewallRegles";
                const baseLabel = a.label || `Alarme #${idx + 1}`;
                const equipmentKey = `FirewallRegles:alarm:${baseLabel}`;
                const commentCount = commentCounts[equipmentKey] || 0;
                const ticketCount = ticketCounts[equipmentKey] || 0;
                const isHighlighted =
                  highlightedEquipmentKey != null &&
                  String(highlightedEquipmentKey) === String(equipmentKey);
                const alarmItem = {
                  nom: baseLabel,
                  name: baseLabel,
                };

                return (
                  <tr
                    key={equipmentKey}
                    className={`${styles.infraTableRow} ${isHighlighted ? styles.infraTableRowHighlight : ""}`}
                  >
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        {getServiceIconKey(a.label) && (
                          <Icon
                            icon={
                              getServiceIconKey(a.label) === "aws" ? "mdi:aws" :
                              getServiceIconKey(a.label) === "google" ? "mdi:google" :
                              getServiceIconKey(a.label) === "adista" ? "mdi:cloud-outline" :
                              getServiceIconKey(a.label) === "github" ? "mdi:github" :
                              getServiceIconKey(a.label) === "atlassian" ? "mdi:atlassian" :
                              getServiceIconKey(a.label) === "cloudflare" ? "mdi:cloud-outline" :
                              getServiceIconKey(a.label) === "microsoft" ? "mdi:microsoft" :
                              "mdi:cloud-outline"
                            }
                            width={18}
                            height={18}
                          />
                        )}
                        {baseLabel}
                      </span>
                    </td>
                    <td>{a.count ?? 0}</td>
                    <td className={styles.infraTableCellActions}>
                      {typeof onOpenComments === "function" && (
                        <button
                          type="button"
                          className={styles.infraIconButton}
                          title="Commentaires"
                          onClick={() =>
                            onOpenComments(alarmItem, {
                              moduleKey,
                              equipmentKey,
                            })
                          }
                        >
                          <Icon icon="mdi:comment-text-outline" />
                          {commentCount > 0 && (
                            <span className={styles.infraCommentBadge}>
                              {commentCount}
                            </span>
                          )}
                        </button>
                      )}
                      {typeof onTicketCreatedForEquipment === "function" && (client?.id || client?.uuid) && (
                        <span className={styles.infraIconButtonWrapper}>
                          
                          {ticketCount > 0 && (
                            <span className={styles.infraTicketBadge}>
                              {ticketCount}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={2}>Aucune alarme importee.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

