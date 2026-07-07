import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { buildComputerFleetStats } from "../../utils/computerFleetStats";
import {
  KpiCard,
  StatsPieChart,
  StatsDistributionBars,
  StatsDashboardBody,
  statsDashboardStyles as styles,
} from "./StatsDashboardWidgets";

export default function ComputerFleetStatsView({
  computers = [],
}) {
  const [powerPeriod, setPowerPeriod] = useState("monthly");

  const stats = useMemo(() => buildComputerFleetStats(computers), [computers]);

  const powerKwh = powerPeriod === "annual" ? stats.power.annualKwh : stats.power.monthlyKwh;
  const powerCost = powerPeriod === "annual" ? stats.power.annualCostEur : stats.power.monthlyCostEur;
  const powerPeriodLabel = powerPeriod === "annual" ? "annuelle" : "mensuelle";

  return (
    <StatsDashboardBody>
        <section className={styles.kpiGrid}>
          <KpiCard
            icon="mdi:monitor-dashboard"
            label="Parc total"
            value={stats.total}
            sub={`${stats.rmmManaged} sous RMM · ${stats.manual} manuel(s)`}
          />
          <KpiCard
            icon="mdi:shield-check-outline"
            label="Couverture RMM"
            value={`${stats.rmmCoveragePct}%`}
            sub={`${stats.agentStatus.online} en ligne · ${stats.agentStatus.offline} hors ligne`}
            tone={stats.rmmCoveragePct >= 90 ? "good" : stats.rmmCoveragePct >= 70 ? "warn" : "bad"}
          />
          <KpiCard
            icon="mdi:heart-pulse"
            label="Santé du parc"
            value={stats.fleetHealth.score != null ? `${stats.fleetHealth.score}%` : "-"}
            sub={stats.fleetHealth.label}
            tone={
              stats.fleetHealth.score == null
                ? "neutral"
                : stats.fleetHealth.score >= 80
                ? "good"
                : stats.fleetHealth.score >= 60
                ? "warn"
                : "bad"
            }
          />
          <KpiCard
            icon="mdi:microsoft-windows"
            label="Windows 11"
            value={stats.lifecycle.windows11}
            sub={
              stats.lifecycle.windows10 > 0
                ? `${stats.lifecycle.windows10} encore en Win. 10`
                : "Migration OS à jour"
            }
            tone={stats.lifecycle.windows10 > 0 ? "warn" : "good"}
          />
          <KpiCard
            icon="mdi:memory"
            label="RAM moyenne"
            value={stats.hardwareSummary.avgRamGb != null ? `${stats.hardwareSummary.avgRamGb} Go` : "-"}
            sub={
              stats.hardwareSummary.knownRamCount > 0
                ? `${stats.hardwareSummary.totalRamGb} Go cumulés`
                : "Données RMM requises"
            }
          />
          <KpiCard
            icon="mdi:flash-outline"
            label={`Conso. ${powerPeriodLabel}`}
            value={`${powerKwh} kWh`}
            sub={`≈ ${powerCost.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`}
          />
        </section>

        <section className={styles.chartGrid}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:factory" />
              Marques
            </h3>
            <StatsPieChart items={stats.brandDistribution} total={stats.total} centerLabel={stats.total} />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:laptop" />
              Modèles & profils CPU
            </h3>
            <StatsPieChart
              items={stats.modelDistribution}
              total={stats.total}
              centerLabel={stats.total}
              emptyLabel="Inventaire RMM requis pour les modèles"
            />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:microsoft-windows" />
              Systèmes d&apos;exploitation
            </h3>
            <StatsPieChart items={stats.osDistribution} total={stats.total} centerLabel={stats.total} />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:laptop-account" />
              Forme factorielle
            </h3>
            <StatsPieChart items={stats.formFactorDistribution} total={stats.total} centerLabel={stats.total} />
          </article>
        </section>

        <section className={styles.chartBarGrid}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:memory" />
              Mémoire vive (RAM)
            </h3>
            <StatsDistributionBars items={stats.ramDistribution} />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:chip" />
              Processeurs
            </h3>
            <StatsDistributionBars items={stats.cpuDistribution} />
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:harddisk" />
              Stockage
            </h3>
            <StatsDistributionBars items={stats.diskDistribution} />
          </article>
        </section>

        <section className={styles.columns}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:lan" />
              Supervision & conformité
            </h3>
            <ul className={styles.metricList}>
              <li>
                <span>Agents en ligne</span>
                <strong className={styles.metricGood}>{stats.agentStatus.online}</strong>
              </li>
              <li>
                <span>Agents hors ligne</span>
                <strong className={stats.agentStatus.offline > 0 ? styles.metricBad : ""}>
                  {stats.agentStatus.offline}
                </strong>
              </li>
              <li>
                <span>Inventaire obsolète (&gt; {stats.inventoryFreshness.staleThresholdDays} j)</span>
                <strong className={stats.inventoryFreshness.stale > 0 ? styles.metricWarn : ""}>
                  {stats.inventoryFreshness.stale}
                </strong>
              </li>
              <li>
                <span>MAJ Windows en attente</span>
                <strong className={stats.windowsUpdates.pending > 0 ? styles.metricWarn : styles.metricGood}>
                  {stats.windowsUpdates.pending}
                  {stats.windowsUpdates.pendingTotal > 0
                    ? ` (${stats.windowsUpdates.pendingTotal} correctif(s))`
                    : ""}
                </strong>
              </li>
              <li>
                <span>Postes à jour (MAJ)</span>
                <strong>{stats.windowsUpdates.upToDate}</strong>
              </li>
              <li>
                <span>Disques &gt; 85 %</span>
                <strong className={stats.diskAlerts > 0 ? styles.metricBad : ""}>{stats.diskAlerts}</strong>
              </li>
              <li>
                <span>Jointure domaine AD</span>
                <strong>{stats.domain.joined}</strong>
              </li>
              <li>
                <span>Workgroup</span>
                <strong>{stats.domain.workgroup}</strong>
              </li>
              <li>
                <span>Licences Windows inactives</span>
                <strong className={stats.licenseInactive > 0 ? styles.metricWarn : ""}>
                  {stats.licenseInactive}
                </strong>
              </li>
              <li>
                <span>Sans agent RMM</span>
                <strong className={stats.manual > 0 ? styles.metricWarn : ""}>{stats.manual}</strong>
              </li>
            </ul>
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:update" />
              Cycle de vie & agents
            </h3>
            <ul className={styles.metricList}>
              <li>
                <span>Windows 11</span>
                <strong className={styles.metricGood}>{stats.lifecycle.windows11}</strong>
              </li>
              <li>
                <span>Windows 10 (fin support)</span>
                <strong className={stats.lifecycle.windows10 > 0 ? styles.metricWarn : ""}>
                  {stats.lifecycle.windows10}
                </strong>
              </li>
              <li>
                <span>Stockage moyen</span>
                <strong>
                  {stats.hardwareSummary.avgDiskGb != null
                    ? `${stats.hardwareSummary.avgDiskGb} Go`
                    : "-"}
                </strong>
              </li>
              <li>
                <span>Postes avec RAM connue</span>
                <strong>
                  {stats.hardwareSummary.knownRamCount}/{stats.total}
                </strong>
              </li>
            </ul>
            <h4 className={styles.subPanelTitle}>Versions agent RMM</h4>
            <StatsDistributionBars items={stats.agentVersionDistribution} />
          </article>
        </section>

        <article className={styles.panel}>
          <div className={styles.panelHeaderRow}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:lightning-bolt-outline" />
              Consommation électrique estimée
            </h3>
            <div className={styles.periodToggle} role="tablist" aria-label="Période de consommation">
              <button
                type="button"
                role="tab"
                aria-selected={powerPeriod === "monthly"}
                className={powerPeriod === "monthly" ? styles.periodBtnActive : styles.periodBtn}
                onClick={() => setPowerPeriod("monthly")}
              >
                Mensuel
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={powerPeriod === "annual"}
                className={powerPeriod === "annual" ? styles.periodBtnActive : styles.periodBtn}
                onClick={() => setPowerPeriod("annual")}
              >
                Annuel
              </button>
            </div>
          </div>
          <p className={styles.powerDisclaimer}>
            Estimation basée sur le profil fixe/portable, {stats.power.hoursPerDay} h/jour,{" "}
            {stats.power.daysPerMonth} j/mois, tarif{" "}
            {stats.power.pricePerKwh.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}/kWh.
          </p>
          <div className={styles.powerSummary}>
            <div className={styles.powerHighlight}>
              <span className={styles.powerHighlightValue}>{powerKwh} kWh</span>
              <span className={styles.powerHighlightLabel}>
                {powerPeriod === "annual" ? "par an" : "par mois"}
              </span>
            </div>
            <div className={styles.powerHighlight}>
              <span className={styles.powerHighlightValue}>
                {powerCost.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
              <span className={styles.powerHighlightLabel}>coût estimé</span>
            </div>
          </div>
          {stats.power.breakdown.length > 0 ? (
            <div className={styles.powerBreakdown}>
              {stats.power.breakdown.map((row) => (
                <div key={row.profile} className={styles.powerBreakdownRow}>
                  <span>
                    {row.label} · {row.count} poste{row.count > 1 ? "s" : ""} · ~{row.watts} W
                  </span>
                  <strong>
                    {powerPeriod === "annual"
                      ? `${Math.round(row.monthlyKwh * 12 * 10) / 10} kWh/an`
                      : `${row.monthlyKwh} kWh/mois`}
                  </strong>
                </div>
              ))}
            </div>
          ) : null}
        </article>
    </StatsDashboardBody>
  );
}
