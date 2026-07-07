import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import modalStyles from "./AntivirusOverviewModal.module.css";
import { StatsPanel, statsDashboardStyles as dashStyles } from "./StatsDashboardWidgets";

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#64748b", "#ec4899"];
const BAR_COLOR = "#ed1c24";

function ChartCard({ title, subtitle, children, emptyLabel, variant = "modal" }) {
  const isEmpty = !children;
  if (variant === "fleet") {
    return (
      <StatsPanel title={title}>
        {subtitle ? <p className={dashStyles.panelDesc}>{subtitle}</p> : null}
        {isEmpty ? <div className={modalStyles.chartEmpty}>{emptyLabel}</div> : children}
      </StatsPanel>
    );
  }
  return (
    <div className={modalStyles.chartCard}>
      <div className={modalStyles.chartCardHead}>
        <h5 className={modalStyles.chartCardTitle}>{title}</h5>
        {subtitle ? <p className={modalStyles.chartCardSubtitle}>{subtitle}</p> : null}
      </div>
      {isEmpty ? <div className={modalStyles.chartEmpty}>{emptyLabel}</div> : children}
    </div>
  );
}

function renderPie(data, nameKey = "name", valueKey = "value") {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={78}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry[nameKey]} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, ""]} />
        <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function renderBar(data, nameKey = "name", valueKey = "value") {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip />
        <Bar dataKey={valueKey} fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AntivirusOverviewCharts({
  statistics,
  enrichedSummary,
  incidents,
  variant = "modal",
}) {
  const isFleet = variant === "fleet";
  const endpointStatusData = useMemo(() => {
    const byStatus = statistics?.endpoints?.byStatus;
    if (!byStatus) return [];
    return [
      { name: "En ligne", value: byStatus.online || 0, color: "#22c55e" },
      { name: "Hors ligne", value: byStatus.offline || 0, color: "#ef4444" },
      { name: "Inconnu", value: byStatus.unknown || 0, color: "#94a3b8" },
    ].filter((item) => item.value > 0);
  }, [statistics]);

  const osDistributionData = useMemo(() => {
    const byOS = statistics?.endpoints?.byOS;
    if (!byOS || !Object.keys(byOS).length) return [];
    return Object.entries(byOS)
      .map(([name, value], index) => ({
        name,
        value,
        color: PIE_COLORS[index % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [statistics]);

  const threatHealthData = useMemo(() => {
    if (!enrichedSummary?.total) return [];
    const infected = enrichedSummary.infected || 0;
    const clean = Math.max(0, enrichedSummary.total - infected);
    return [
      { name: "Sains", value: clean, color: "#22c55e" },
      { name: "Infectés", value: infected, color: "#ef4444" },
    ].filter((item) => item.value > 0);
  }, [enrichedSummary]);

  const securityBarData = useMemo(() => {
    if (!enrichedSummary) return [];
    const items = [
      { name: "Infectés", value: enrichedSummary.infected || 0 },
      { name: "Détections 24h", value: enrichedSummary.malwareDetected || 0 },
      { name: "Hors ligne", value: enrichedSummary.offline || 0 },
    ].filter((item) => item.value > 0);
    return items.length ? items : null;
  }, [enrichedSummary]);

  const incidentsSeverityData = useMemo(() => {
    const items = incidents?.items || [];
    if (!items.length) return [];
    const counts = {};
    items.forEach((item) => {
      const severity = String(item.severity || item.priority || "Non classé");
      counts[severity] = (counts[severity] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const endpointTypeData = useMemo(() => {
    const byType = statistics?.endpoints?.byType;
    if (!byType) return [];
    return [
      { name: "Physiques", value: byType.physical || 0 },
      { name: "Virtuels", value: byType.virtual || 0 },
      { name: "Autres", value: byType.other || 0 },
    ].filter((item) => item.value > 0);
  }, [statistics]);

  const hasAnyChart =
    endpointStatusData.length > 0 ||
    osDistributionData.length > 0 ||
    threatHealthData.length > 0 ||
    securityBarData?.length > 0 ||
    incidentsSeverityData.length > 0 ||
    endpointTypeData.length > 0;

  if (!hasAnyChart) {
    const empty = (
      <div className={modalStyles.chartEmpty}>
        Aucune statistique disponible · cliquez sur Actualiser pour récupérer les données depuis
        GravityZone.
      </div>
    );
    if (isFleet) {
      return (
        <section className={dashStyles.chartGrid}>
          <StatsPanel title="Statistiques de sécurité" icon="mdi:chart-donut">
            {empty}
          </StatsPanel>
        </section>
      );
    }
    return (
      <div className={modalStyles.chartsSection}>
        <h4 className={modalStyles.chartsSectionTitle}>Statistiques de sécurité</h4>
        {empty}
      </div>
    );
  }

  const charts = (
    <>
      <ChartCard
        variant={variant}
        title="État des postes"
        subtitle="Répartition en ligne / hors ligne"
        emptyLabel="Données de connectivité indisponibles"
      >
        {renderPie(endpointStatusData)}
      </ChartCard>

      <ChartCard
        variant={variant}
        title="Santé des endpoints"
        subtitle="Postes infectés vs sains"
        emptyLabel="Données malware indisponibles"
      >
        {renderPie(threatHealthData)}
      </ChartCard>

      <ChartCard
        variant={variant}
        title="Systèmes d'exploitation"
        subtitle="Répartition par OS"
        emptyLabel="Répartition OS indisponible"
      >
        {renderPie(osDistributionData)}
      </ChartCard>

      <ChartCard
        variant={variant}
        title="Menaces & attaques"
        subtitle="Infections, détections récentes, postes hors ligne"
        emptyLabel="Aucune menace détectée"
      >
        {securityBarData ? renderBar(securityBarData) : null}
      </ChartCard>

      <ChartCard
        variant={variant}
        title="Incidents par sévérité"
        subtitle={`${incidents?.total ?? 0} incident(s) en aperçu`}
        emptyLabel="Aucun incident"
      >
        {incidentsSeverityData.length ? renderBar(incidentsSeverityData) : null}
      </ChartCard>

      <ChartCard
        variant={variant}
        title="Type de postes"
        subtitle="Physiques vs virtuels"
        emptyLabel="Répartition par type indisponible"
      >
        {endpointTypeData.length ? renderBar(endpointTypeData) : null}
      </ChartCard>
    </>
  );

  if (isFleet) {
    return <section className={dashStyles.chartGrid}>{charts}</section>;
  }

  return (
    <div className={modalStyles.chartsSection}>
      <h4 className={modalStyles.chartsSectionTitle}>Statistiques de sécurité</h4>
      <div className={modalStyles.chartsGrid}>{charts}</div>
    </div>
  );
}
