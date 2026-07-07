import { useEffect, useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { fetchClientStats, fetchHomeKpis } from "../../api/stats";
import { fetchCyberPageData } from "../../api/clients";
import styles from "./SlaKpiPage.module.css";
import adminStyles from "../AdminPage/AdminPanel.module.css";

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getStatus(expirationDate, configured) {
  if (!configured) return { key: "missing", label: "Non configuré" };
  const date = normalizeDate(expirationDate);
  if (!date) return { key: "unknown", label: "Date manquante" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { key: "danger", label: "Expiré" };
  if (diffDays <= 30) return { key: "warning", label: "Expire bientôt" };
  return { key: "ok", label: "Actif" };
}

function firstAntivirusExpiry(client) {
  const solutions = client?.equipements?.Antivirus?.solutions;
  if (!Array.isArray(solutions)) return null;
  return solutions
    .map((s) => s?.expiration || s?.expirityDate || s?.syncData?.license?.expirationDate || null)
    .find(Boolean);
}

function firstAntispamExpiry(client) {
  const solutions = client?.equipements?.Antispam?.solutions;
  if (!Array.isArray(solutions)) return null;
  return solutions.map((s) => s?.expiration || s?.expirityDate || null).find(Boolean);
}

function firstMicrosoftExpiry(client) {
  const licences = client?.equipements?.Office365?.licences;
  if (!Array.isArray(licences)) return null;
  return licences.map((l) => l?.expirationDate || l?.expiryDate || l?.endDate || null).find(Boolean);
}

function formatDate(value) {
  const date = normalizeDate(value);
  return date ? date.toLocaleDateString("fr-FR") : "-";
}

export default function SlaKpiPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState(null);
  const [homeKpis, setHomeKpis] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [stats, kpis, cyber] = await Promise.all([
          fetchClientStats().catch(() => null),
          fetchHomeKpis().catch(() => null),
          fetchCyberPageData().catch(() => ({ clients: [] })),
        ]);
        if (!alive) return;
        setGlobalStats(stats);
        setHomeKpis(kpis);
        setClients(Array.isArray(cyber?.clients) ? cyber.clients : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const clientRows = useMemo(() => {
    return clients.map((client) => {
      const maintenanceExpiration = client?.contrat?.expiration || null;
      const maintenanceConfigured = Boolean(client?.contrat?.debut || client?.contrat?.expiration);

      const antivirusExpiration = firstAntivirusExpiry(client);
      const antivirusConfigured = Boolean(client?.equipements?.Antivirus?.solutions?.length);

      const antispamExpiration = firstAntispamExpiry(client);
      const antispamConfigured = Boolean(client?.equipements?.Antispam?.solutions?.length);

      const microsoftExpiration = firstMicrosoftExpiry(client);
      const microsoftConfigured = Boolean(
        client?.modules?.Office365 || client?.equipements?.Office365?.licences?.length
      );

      return {
        id: client.id,
        clientName: client.name || `Client ${client.id}`,
        maintenance: {
          ...getStatus(maintenanceExpiration, maintenanceConfigured),
          expiration: formatDate(maintenanceExpiration),
        },
        antivirus: {
          ...getStatus(antivirusExpiration, antivirusConfigured),
          expiration: formatDate(antivirusExpiration),
        },
        antispam: {
          ...getStatus(antispamExpiration, antispamConfigured),
          expiration: formatDate(antispamExpiration),
        },
        microsoft: {
          ...getStatus(microsoftExpiration, microsoftConfigured),
          expiration: formatDate(microsoftExpiration),
        },
      };
    });
  }, [clients]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientRows;
    return clientRows.filter((row) => row.clientName.toLowerCase().includes(q));
  }, [clientRows, query]);

  if (loading) return null;

  return (
    <div className={adminStyles.simpleLayout}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>SLA & KPI</h1>
          <p className={styles.subtitle}>Vue consolidée des indicateurs clients et du suivi des échéances de service.</p>
        </div>
        <div className={styles.searchWrap}>
          <FaSearch className={styles.searchIcon} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
            placeholder="Rechercher une entreprise..."
          />
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Clients monitorés</span>
          <strong className={styles.kpiValue}>{globalStats?.totalClients ?? 0}</strong>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Équipements monitorés</span>
          <strong className={styles.kpiValue}>{homeKpis?.equipMonitoredTotal ?? 0}</strong>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Jobs de sauvegarde</span>
          <strong className={styles.kpiValue}>{globalStats?.totalBackupJobs ?? 0}</strong>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Licences Microsoft 365</span>
          <strong className={styles.kpiValue}>{globalStats?.totalO365Licenses ?? 0}</strong>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Maintenance</th>
              <th>Antivirus</th>
              <th>Antispam</th>
              <th>Microsoft</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className={styles.nameCell}>{row.clientName}</td>
                {["maintenance", "antivirus", "antispam", "microsoft"].map((key) => (
                  <td key={key}>
                    <div className={styles.statusStack}>
                      <span className={`${styles.badge} ${styles[`badge_${row[key].key}`]}`}>{row[key].label}</span>
                      <span className={styles.expiration}>{row[key].expiration}</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && <div className={styles.empty}>Aucun client trouvé.</div>}
      </div>
    </div>
  );
}
