import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
  ANTISPAM_OVERVIEW_GROUPS,
  ANTISPAM_OVERVIEW_SECTIONS,
} from "./antispamOverviewSections";
import { fetchMailinblackDashboard } from "../../api/clientMailinblack";
import { syncAndPersistAntispamSolution } from "./antispamSolutionUtils";
import { showError, showSuccess } from "../../utils/toast";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./AntivirusOverviewModal.module.css";
import SolutionDetailPageLayout from "./SolutionDetailPageLayout";
import {
  KpiCard,
  StatsPieChart,
  StatsDistributionBars,
  StatsDashboardBody,
  StatsPanel,
  buildDistributionItems,
  statsDashboardStyles as dashStyles,
} from "./StatsDashboardWidgets";

function formatDate(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

function StatusPill({ status, preview = false, compact = false }) {
  const resolved = preview && status === "error" ? "preview" : status;
  const map = {
    ok: { className: styles.statusOk, label: "OK", icon: "mdi:check-circle" },
    empty: { className: styles.statusEmpty, label: "Vide", icon: "mdi:minus-circle-outline" },
    error: { className: styles.statusError, label: "Erreur", icon: "mdi:close-circle" },
    permission_denied: {
      className: styles.statusDenied,
      label: compact ? "Auth" : "Non autorisé",
      icon: "mdi:lock-outline",
    },
    preview: {
      className: styles.statusPreview,
      label: compact ? "Aperçu" : "Aperçu",
      icon: "mdi:dots-horizontal-circle-outline",
    },
    info: { className: styles.statusInfo, label: "Info", icon: "mdi:information-outline" },
  };
  const meta = map[resolved] || map.info;
  return (
    <span
      className={`${styles.statusPill} ${compact ? styles.statusPillCompact : ""} ${meta.className}`}
    >
      {!compact ? <Icon icon={meta.icon} aria-hidden /> : null}
      {meta.label}
    </span>
  );
}

function SectionError({ error }) {
  if (!error) return null;
  return <div className={styles.errorBox}>{error}</div>;
}

function DataTable({ columns, rows, emptyLabel = "Aucune donnée" }) {
  if (!rows?.length) {
    return <div className={styles.emptyState}>{emptyLabel}</div>;
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || `${index}`}>
              {columns.map((col) => (
                <td key={col.key} className={col.mono ? styles.mono : undefined}>
                  {col.render ? col.render(row) : row[col.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderListSection(section, { preview = false } = {}) {
  if (!section) return <div className={styles.emptyState}>Section indisponible</div>;
  return (
    <>
      {preview ? (
        <div className={styles.previewBanner}>
          <Icon icon="mdi:flask-outline" aria-hidden />
          <span>API Mailinblack disponible · aperçu en lecture seule.</span>
        </div>
      ) : null}
      <SectionError error={section.error} />
      <div style={{ marginBottom: "0.75rem" }}>
        <StatusPill status={section.status} preview={preview} />
        {section.total != null ? (
          <span style={{ marginLeft: "0.5rem", fontSize: "0.78rem", color: "var(--msp-muted)" }}>
            {section.total} élément{section.total > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <DataTable
        columns={section.columns}
        rows={section.items}
        emptyLabel={
          section.status === "permission_denied"
            ? "Accès refusé · vérifiez la clé auth et le clientId"
            : section.error
              ? section.error
              : "Aucune donnée retournée"
        }
      />
    </>
  );
}

const SECTION_COLUMNS = {
  domains: [
    { key: "name", label: "Domaine" },
    { key: "status", label: "Statut" },
    { key: "expiration", label: "Expiration", render: (r) => formatDate(r.expiration) },
    {
      key: "autoRenew",
      label: "Renouv. auto",
      render: (r) => (r.autoRenew === true ? "Oui" : r.autoRenew === false ? "Non" : "-"),
    },
  ],
  users: [
    { key: "email", label: "E-mail" },
    { key: "name", label: "Nom" },
    { key: "role", label: "Rôle" },
    { key: "status", label: "Statut" },
  ],
  senders: [
    { key: "email", label: "Expéditeur" },
    { key: "domain", label: "Domaine" },
    { key: "status", label: "Statut" },
    {
      key: "authorized",
      label: "Autorisé",
      render: (r) => (r.authorized === true ? "Oui" : r.authorized === false ? "Non" : "-"),
    },
  ],
  spools: [
    { key: "subject", label: "Sujet" },
    { key: "sender", label: "De" },
    { key: "recipient", label: "À" },
    { key: "status", label: "Statut" },
    { key: "threat", label: "Menace" },
    { key: "receivedAt", label: "Reçu", render: (r) => formatDate(r.receivedAt) },
  ],
  detectSpools: [
    { key: "subject", label: "Sujet" },
    { key: "sender", label: "De" },
    { key: "status", label: "Statut" },
    { key: "threat", label: "Détection" },
  ],
};

const API_STATUS_LABELS = {
  ok: "OK",
  error: "Erreur",
  empty: "Vide",
  permission_denied: "Non autorisé",
  preview: "Aperçu",
  info: "Info",
};

export function AntispamOverviewPanel({
  active = true,
  client,
  antispamItem,
  onClose,
  onSynced,
  asPage = false,
  onBack,
  backLabel = "Retour",
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [lastPersistedAt, setLastPersistedAt] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const credentialContext = useMemo(
    () => ({
      clientId: client?.id,
      mailinblackTenantId: antispamItem?.mailinblackTenantId,
      mappingMode: antispamItem?.mappingMode || "reseller",
    }),
    [client?.id, antispamItem]
  );

  const customerId = antispamItem?.customerId;

  const loadDashboard = useCallback(
    async ({ persist = false } = {}) => {
      if (!customerId) return;
      setLoading(true);
      setLoadError(null);
      try {
        if (persist && client?.id) {
          const persisted = await syncAndPersistAntispamSolution(client.id, antispamItem);
          await onSynced?.();
          showSuccess("Données antispam actualisées et enregistrées.");
          if (persisted.dashboard) setDashboard(persisted.dashboard);
          setLastPersistedAt(
            persisted.updatedPayload?.syncData?.lastSync || new Date().toISOString()
          );
          return;
        }

        const dashboardData = await fetchMailinblackDashboard(customerId, credentialContext);
        setDashboard(dashboardData);
        setLastPersistedAt(antispamItem?.syncData?.lastSync || null);
      } catch (err) {
        setLoadError(err.message);
        showError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [customerId, credentialContext, client?.id, antispamItem, onSynced]
  );

  useEffect(() => {
    if (active && customerId) {
      setActiveSection("overview");
      const cached = antispamItem?.syncData?.dashboard;
      if (cached) setDashboard(cached);
      if (antispamItem?.syncData?.lastSync) setLastPersistedAt(antispamItem.syncData.lastSync);
      loadDashboard();
    }
  }, [active, customerId, loadDashboard, antispamItem?.syncData]);

  const sections = dashboard?.sections || {};
  const customerName =
    sections.customer?.data?.name ||
    antispamItem?.customerName ||
    antispamItem?.nom ||
    antispamItem?.name ||
    "Mailinblack Protect";

  const sectionViews = useMemo(() => {
    const views = {};
    Object.entries(SECTION_COLUMNS).forEach(([key, columns]) => {
      const section = sections[key];
      if (section) views[key] = { ...section, columns };
    });
    return views;
  }, [sections]);

  const renderOverview = () => {
    const customer = sections.customer?.data;
    const apiRows = [
      { name: "Client / compte", exploited: true, status: sections.customer?.status },
      { name: "Domaines (admin)", exploited: true, status: sections.domains?.status },
      { name: "Utilisateurs (admin)", exploited: true, status: sections.users?.status },
      { name: "Expéditeurs (protect)", exploited: true, status: sections.senders?.status },
      { name: "Spools (protect)", exploited: true, status: sections.spools?.status },
      { name: "Détection spools", exploited: false, status: sections.detectSpools?.status },
    ];

    const usersTotal = sections.users?.total ?? antispamItem?.utilisateursProteges ?? 0;
    const domainsTotal = sections.domains?.total ?? antispamItem?.domainesSurveilles ?? 0;
    const sendersTotal = sections.senders?.total ?? 0;
    const spoolsTotal = sections.spools?.total ?? 0;

    if (asPage) {
      const volumeDistribution = buildDistributionItems([
        { name: "Utilisateurs", count: usersTotal },
        { name: "Domaines", count: domainsTotal },
        { name: "Expéditeurs", count: sendersTotal },
        { name: "Spools", count: spoolsTotal },
      ]);

      const apiStatusCounts = {};
      apiRows.forEach((row) => {
        const key = row.status || "info";
        apiStatusCounts[key] = (apiStatusCounts[key] || 0) + 1;
      });
      const apiStatusDistribution = buildDistributionItems(
        Object.entries(apiStatusCounts).map(([status, count]) => ({
          name: API_STATUS_LABELS[status] || status,
          count,
        }))
      );

      const moduleBars = buildDistributionItems([
        { name: "Domaines", count: domainsTotal },
        { name: "Utilisateurs", count: usersTotal },
        { name: "Expéditeurs", count: sendersTotal },
        { name: "Spools", count: spoolsTotal },
      ]);

      const okApis = apiRows.filter((row) => row.status === "ok").length;
      const syncLabel = lastPersistedAt
        ? `Dernière sauvegarde : ${formatDate(lastPersistedAt)}`
        : "Non enregistré localement";

      return (
        <StatsDashboardBody>
          <StatsPanel title={customerName} icon="mdi:email-secure-outline">
            <p className={dashStyles.panelDesc}>
              Client Mailinblack Protect lié à {client?.name}. Dernière lecture API :{" "}
              {formatDate(dashboard?.fetchedAt)} · {syncLabel}
            </p>
          </StatsPanel>

          <section className={dashStyles.kpiGrid}>
            <KpiCard
              icon="mdi:account-group-outline"
              label="Utilisateurs"
              value={usersTotal || "-"}
              sub="Comptes protégés"
            />
            <KpiCard
              icon="mdi:web"
              label="Domaines"
              value={domainsTotal || "-"}
              sub="Domaines surveillés"
            />
            <KpiCard
              icon="mdi:email-arrow-right-outline"
              label="Expéditeurs"
              value={sendersTotal || "-"}
              sub="Liste Protect"
            />
            <KpiCard
              icon="mdi:email-multiple-outline"
              label="Spools"
              value={spoolsTotal || "-"}
              sub="Messages en file"
            />
            <KpiCard
              icon="mdi:api"
              label="APIs opérationnelles"
              value={`${okApis}/${apiRows.length}`}
              sub={`${apiRows.filter((row) => row.exploited).length} intégrées dans Veritas`}
              tone={okApis === apiRows.length ? "good" : okApis >= apiRows.length - 1 ? "warn" : "bad"}
            />
            <KpiCard
              icon="mdi:cloud-sync-outline"
              label="Synchronisation"
              value={lastPersistedAt ? "Enregistré" : "Lecture seule"}
              sub={syncLabel}
              tone={lastPersistedAt ? "good" : "neutral"}
            />
          </section>

          <section className={dashStyles.chartGrid}>
            <StatsPanel title="Répartition du parc" icon="mdi:chart-donut">
              <StatsPieChart
                items={volumeDistribution.items}
                total={volumeDistribution.total}
                emptyLabel="Aucun volume remonté par l'API"
              />
            </StatsPanel>
            <StatsPanel title="État des APIs" icon="mdi:shield-check-outline">
              <StatsPieChart
                items={apiStatusDistribution.items}
                total={apiStatusDistribution.total}
                emptyLabel="Statuts API indisponibles"
              />
            </StatsPanel>
            {customer ? (
              <StatsPanel title="Informations client" icon="mdi:card-account-details-outline">
                <ul className={dashStyles.metricList}>
                  <li>
                    <span>ID client</span>
                    <strong className={dashStyles.metricMono}>{customer.id}</strong>
                  </li>
                  {customer.domain ? (
                    <li>
                      <span>Domaine principal</span>
                      <strong>{customer.domain}</strong>
                    </li>
                  ) : null}
                  {customer.status ? (
                    <li>
                      <span>Statut</span>
                      <strong>{customer.status}</strong>
                    </li>
                  ) : null}
                  {dashboard?.session?.clientId ? (
                    <li>
                      <span>ClientId auth</span>
                      <strong className={dashStyles.metricMono}>{dashboard.session.clientId}</strong>
                    </li>
                  ) : null}
                </ul>
              </StatsPanel>
            ) : null}
          </section>

          <section className={dashStyles.chartBarGrid}>
            <StatsPanel title="Volumes par module" icon="mdi:chart-bar">
              <StatsDistributionBars
                items={moduleBars.items}
                emptyLabel="Aucun volume disponible"
              />
            </StatsPanel>
            <StatsPanel title="État des APIs Mailinblack" icon="mdi:api">
              <ul className={dashStyles.metricList}>
                {apiRows.map((row) => (
                  <li key={row.name}>
                    <span>{row.name}</span>
                    <StatusPill status={row.status} preview={!row.exploited} compact />
                  </li>
                ))}
              </ul>
            </StatsPanel>
          </section>
        </StatsDashboardBody>
      );
    }

    return (
      <>
        <div className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{customerName}</h3>
          <p className={formStyles.sectionDesc}>
            Client Mailinblack Protect lié à {client?.name}. Dernière lecture API :{" "}
            {formatDate(dashboard?.fetchedAt)}
            {lastPersistedAt ? <> · Dernière sauvegarde : {formatDate(lastPersistedAt)}</> : null}
          </p>
        </div>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Utilisateurs</span>
            <span className={styles.kpiValue}>
              {sections.users?.total ?? antispamItem?.utilisateursProteges ?? "-"}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Domaines</span>
            <span className={styles.kpiValue}>
              {sections.domains?.total ?? antispamItem?.domainesSurveilles ?? "-"}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Expéditeurs</span>
            <span className={styles.kpiValue}>{sections.senders?.total ?? "-"}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Spools</span>
            <span className={styles.kpiValue}>{sections.spools?.total ?? "-"}</span>
          </div>
        </div>

        {customer ? (
          <div className={styles.metaPanel}>
            <div>
              <strong>ID client</strong>
              <span className={styles.mono}>{customer.id}</span>
            </div>
            {customer.domain ? (
              <div>
                <strong>Domaine principal</strong>
                <span>{customer.domain}</span>
              </div>
            ) : null}
            {dashboard?.session?.clientId ? (
              <div>
                <strong>ClientId auth</strong>
                <span className={styles.mono}>{dashboard.session.clientId}</span>
              </div>
            ) : null}
            {customer.status ? (
              <div>
                <strong>Statut</strong>
                <span>{customer.status}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <h4 className={formStyles.sectionTitle} style={{ fontSize: "0.92rem", marginTop: "1.25rem" }}>
          État des APIs Mailinblack
        </h4>
        <div className={styles.apiMatrix}>
          {apiRows.map((row) => (
            <div key={row.name} className={styles.apiMatrixRow}>
              <span className={styles.apiMatrixName}>{row.name}</span>
              <StatusPill status={row.status} preview={!row.exploited} compact />
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderSectionContent = () => {
    if (!asPage && loading) {
      return (
        <div className={styles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          Chargement des données Mailinblack…
        </div>
      );
    }
    if (loadError) return <SectionError error={loadError} />;

    let content;
    switch (activeSection) {
      case "domains":
        content = renderListSection(sectionViews.domains);
        break;
      case "users":
        content = renderListSection(sectionViews.users);
        break;
      case "senders":
        content = renderListSection(sectionViews.senders);
        break;
      case "spools":
        content = renderListSection(sectionViews.spools);
        break;
      case "detectSpools":
        content = renderListSection(sectionViews.detectSpools, { preview: true });
        break;
      default:
        content = renderOverview();
    }

    if (asPage && activeSection !== "overview") {
      return (
        <StatsDashboardBody>
          <StatsPanel>{content}</StatsPanel>
        </StatsDashboardBody>
      );
    }

    return content;
  };

  const navEntries = useMemo(() => {
    const entries = [];
    let prevGroup = null;
    ANTISPAM_OVERVIEW_SECTIONS.forEach((section) => {
      if (section.group !== prevGroup) {
        const group = ANTISPAM_OVERVIEW_GROUPS.find((g) => g.id === section.group);
        entries.push({ type: "group", key: `group-${section.group}`, label: group?.label });
        prevGroup = section.group;
      }
      entries.push({ type: "section", key: section.id, section });
    });
    return entries;
  }, []);

  if (!active || !customerId) return null;

  const mappingLabel =
    antispamItem?.mappingMode === "dedicated" ? "Tenant dédié" : "Tenant global";

  if (asPage) {
    return (
      <SolutionDetailPageLayout
        accent="mailinblack"
        eyebrow="Cybersécurité · Mailinblack Protect"
        title={`Antispam · ${customerName}`}
        titleIcon="mdi:email-secure-outline"
        subtitle={`${client?.name || "-"} · ${mappingLabel}`}
        backLabel={backLabel}
        onBack={onBack}
        loading={loading}
        loadingMessage="Chargement des données Mailinblack…"
        onRefresh={() => loadDashboard()}
        footerHint={`${mappingLabel}${customerId ? ` · ID ${customerId}` : ""}`}
        onRefreshSave={() => loadDashboard({ persist: true })}
        refreshSaveLabel="Actualiser et enregistrer"
        navEntries={navEntries}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        navAriaLabel="Sections overview antispam"
      >
        {renderSectionContent()}
      </SolutionDetailPageLayout>
    );
  }

  const shell = (
    <div
      className={`${formStyles.shell} ${styles.shellWide}`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="antispam-overview-title"
    >
      <div className={styles.accentBarMailinblack} aria-hidden />
      <header className={formStyles.header}>
        <div className={formStyles.headerMain}>
          <div
            className={`${formStyles.headerIconWrap} ${styles.headerIconMailinblack}`}
            aria-hidden
          >
            <Icon icon="mdi:email-secure-outline" />
          </div>
          <div className={formStyles.headerText}>
            <p className={formStyles.eyebrow}>Cybersécurité · Mailinblack Protect</p>
            <h2 className={formStyles.title} id="antispam-overview-title">
              Antispam · {customerName}
            </h2>
            <p className={formStyles.subtitle}>
              {client?.name} · {mappingLabel}
            </p>
          </div>
        </div>
        <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label="Fermer">
          <FaTimes />
        </button>
      </header>

      <div className={formStyles.body}>
        <nav className={formStyles.nav} aria-label="Sections overview antispam">
          {navEntries.map((entry) =>
            entry.type === "group" ? (
              <div key={entry.key} className={styles.navGroupLabel}>
                {entry.label}
              </div>
            ) : (
              <button
                key={entry.key}
                type="button"
                className={`${formStyles.navItem} ${
                  activeSection === entry.section.id ? formStyles.navItemActive : ""
                }`}
                onClick={() => setActiveSection(entry.section.id)}
                aria-current={activeSection === entry.section.id ? "step" : undefined}
              >
                <Icon icon={entry.section.icon} className={formStyles.navItemIcon} aria-hidden />
                <span className={formStyles.navItemText}>
                  <span className={formStyles.navItemLabel}>{entry.section.label}</span>
                  <span className={formStyles.navItemHint}>{entry.section.description}</span>
                </span>
              </button>
            )
          )}
        </nav>
        <div className={formStyles.content}>{renderSectionContent()}</div>
      </div>

      <footer className={formStyles.footer}>
        <span className={formStyles.footerHint}>
          {mappingLabel}
          {customerId ? ` · ID ${customerId}` : ""}
        </span>
        <div className={formStyles.footerActions}>
          <button
            type="button"
            className={formStyles.primaryBtn}
            onClick={() => loadDashboard({ persist: true })}
            disabled={loading}
          >
            <Icon icon="mdi:cloud-sync-outline" aria-hidden />
            Actualiser et enregistrer
          </button>
        </div>
      </footer>
    </div>
  );

  return createPortal(
    <div
      className={formStyles.overlay}
      onClick={loading ? undefined : onClose}
      role="presentation"
    >
      {shell}
    </div>,
    document.getElementById("modal-root") || document.body
  );
}

export default function AntispamOverviewModal(props) {
  return <AntispamOverviewPanel {...props} active={props.open} />;
}
