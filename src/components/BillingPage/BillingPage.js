import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaSearch } from "react-icons/fa";
import { fetchCyberPageData } from "../../api/clients";
import styles from "./BillingPage.module.css";
import adminStyles from "../AdminPage/AdminPanel.module.css";

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function computeLifecycleStatus(rawDate, isConfigured) {
  if (!isConfigured) return { key: "missing", label: "Non configuré" };
  const date = normalizeDate(rawDate);
  if (!date) return { key: "active", label: "Actif" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  if (days < 0) return { key: "expired", label: "Expiré" };
  if (days <= 30) return { key: "warning", label: "Expire bientôt" };
  return { key: "active", label: "Actif" };
}

function formatDate(value) {
  const date = normalizeDate(value);
  return date ? date.toLocaleDateString("fr-FR") : "-";
}

function firstAntivirusExpiry(client) {
  const solutions = client?.equipements?.Antivirus?.solutions;
  if (!Array.isArray(solutions) || solutions.length === 0) return null;
  return (
    solutions
      .map((s) => s?.expiration || s?.expirityDate || s?.syncData?.license?.expirationDate || null)
      .find(Boolean) || null
  );
}

function firstAntispamExpiry(client) {
  const solutions = client?.equipements?.Antispam?.solutions;
  if (!Array.isArray(solutions) || solutions.length === 0) return null;
  return solutions.map((s) => s?.expiration || s?.expirityDate || null).find(Boolean) || null;
}

function firstMicrosoftExpiry(client) {
  const licences = client?.equipements?.Office365?.licences;
  if (!Array.isArray(licences) || licences.length === 0) return null;
  return (
    licences
      .map((l) => l?.expirationDate || l?.expiryDate || l?.endDate || null)
      .find(Boolean) || null
  );
}

function hasProxySubscription(client) {
  const internet = client?.equipements?.Internet;
  if (!Array.isArray(internet)) return false;
  return internet.some((item) => String(item?.nom || item?.name || "").toLowerCase().includes("proxy"));
}

export default function BillingPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchCyberPageData();
        if (!active) return;
        setClients(Array.isArray(data?.clients) ? data.clients : []);
      } catch {
        if (!active) return;
        setClients([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    return clients.map((client) => {
      const maintenanceDate = client?.contrat?.expiration || null;
      const hasMaintenance = Boolean(client?.contrat?.debut || client?.contrat?.expiration);

      const antivirusDate = firstAntivirusExpiry(client);
      const hasAntivirus = Boolean(client?.equipements?.Antivirus?.solutions?.length);

      const antispamDate = firstAntispamExpiry(client);
      const hasAntispam = Boolean(client?.equipements?.Antispam?.solutions?.length);

      const microsoftDate = firstMicrosoftExpiry(client);
      const hasMicrosoft = Boolean(client?.modules?.Office365 || client?.equipements?.Office365?.licences?.length);

      const hasProxy = hasProxySubscription(client);
      const hasGoogleWorkspace = false;

      return {
        id: client.id,
        clientName: client.name || `Client ${client.id}`,
        maintenance: {
          status: computeLifecycleStatus(maintenanceDate, hasMaintenance),
          expiration: formatDate(maintenanceDate),
        },
        antivirus: {
          status: computeLifecycleStatus(antivirusDate, hasAntivirus),
          expiration: formatDate(antivirusDate),
        },
        proxy: {
          status: computeLifecycleStatus(null, hasProxy),
          expiration: "-",
        },
        antispam: {
          status: computeLifecycleStatus(antispamDate, hasAntispam),
          expiration: formatDate(antispamDate),
        },
        microsoft: {
          status: computeLifecycleStatus(microsoftDate, hasMicrosoft),
          expiration: formatDate(microsoftDate),
        },
        google: {
          status: computeLifecycleStatus(null, hasGoogleWorkspace),
          expiration: "-",
        },
      };
    });
  }, [clients]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.clientName.toLowerCase().includes(q));
  }, [rows, query]);

  if (loading) return null;

  return (
    <div className={adminStyles.simpleLayout}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Facturation & abonnements</h1>
          <p className={styles.subtitle}>
            Suivi du cycle de vie des abonnements MSP clients : maintenance, antivirus, proxy, antispam, Microsoft et Google Workspace.
          </p>
        </div>
        <div className={styles.searchWrap}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une entreprise..."
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Maintenance</th>
              <th>Antivirus</th>
              <th>Proxy</th>
              <th>Antispam</th>
              <th>Microsoft</th>
              <th>Google Workspace</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className={styles.clientName}>{row.clientName}</td>
                {["maintenance", "antivirus", "proxy", "antispam", "microsoft", "google"].map((key) => (
                  <td key={key}>
                    <div className={styles.cellStack}>
                      <span className={`${styles.badge} ${styles[`badge_${row[key].status.key}`]}`}>
                        {row[key].status.label}
                      </span>
                      <span className={styles.dateText}>{row[key].expiration}</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <div className={styles.emptyState}>
            <Icon icon="mingcute:search-2-fill" />
            <span>Aucun client correspondant.</span>
          </div>
        )}
      </div>
    </div>
  );
}
