import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDetailCopy, interpolate } from "./equipmentDetailPageI18n";
import { buildDiskDonutSegments, buildMetricSnapshot, buildUsageDonutSegments, formatDiskVolumeFooter, formatDiskVolumeTitle, formatPct, formatStorageGB, formatTemp, resolveInstantDiskDrives, toneClassForPct } from "./rmmMetricDashboardUtils";
import styles from "./RmmMetricHistoryPanel.module.css";
function DonutTooltipPct({
  active,
  payload,
  unit = "%"
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return <div className={styles.chartTooltip}>
      <span className={styles.chartTooltipLabel}>{item.name}</span>
      <strong>
        {item.value}
        {unit}
      </strong>
    </div>;
}
function LegendList({
  segments,
  valueSuffix = ""
}) {
  if (!segments?.length) return null;
  return <ul className={styles.legendList}>
      {segments.map(segment => <li key={segment.name}>
          <span className={styles.legendSwatch} style={{
        background: segment.color
      }} aria-hidden />
          <span className={styles.legendName}>{segment.name}</span>
          <span className={styles.legendValue}>
            {segment.value}
            {valueSuffix}
          </span>
        </li>)}
    </ul>;
}
function DonutCard({
  title,
  icon,
  segments,
  centerValue,
  centerLabel,
  footer,
  tone = "neutral",
  emptyHint,
  unit = "%"
}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;
  return <article className={`${styles.donutCard} ${styles[`donutCard_${tone}`] || ""}`}>
      <header className={styles.donutCardHeader}>
        <Icon icon={icon} className={styles.donutCardIcon} aria-hidden />
        <h3 className={styles.donutCardTitle}>{title}</h3>
      </header>

      {!hasData ? <p className={styles.donutEmpty}>{emptyHint}</p> : <>
          <div className={styles.donutChartWrap}>
            <ResponsiveContainer width="100%" height={168}>
              <PieChart>
                <Pie data={segments} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="80%" paddingAngle={2} stroke="none">
                  {segments.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<DonutTooltipPct unit={unit} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.donutCenter}>
              <span className={styles.donutCenterValue}>{centerValue}</span>
              {centerLabel ? <span className={styles.donutCenterLabel}>{centerLabel}</span> : null}
            </div>
          </div>
          {footer ? <p className={styles.donutFooter}>{footer}</p> : null}
          <LegendList segments={segments} valueSuffix={unit} />
        </>}
    </article>;
}
function KpiGauge({
  label,
  value,
  hint,
  tone,
  icon
}) {
  return <div className={`${styles.kpiGauge} ${styles[`kpiGauge_${tone}`] || ""}`}>
      <div className={styles.kpiGaugeIconWrap}>
        <Icon icon={icon} aria-hidden />
      </div>
      <div className={styles.kpiGaugeBody}>
        <span className={styles.kpiGaugeLabel}>{label}</span>
        <strong className={styles.kpiGaugeValue}>{value}</strong>
        {hint ? <span className={styles.kpiGaugeHint}>{hint}</span> : null}
      </div>
    </div>;
}
export default function RmmInstantMetrics({
  agent
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const instant = copy.rmm.instant;
  const snapshot = useMemo(() => buildMetricSnapshot(agent), [agent]);
  const instantDisks = useMemo(() => resolveInstantDiskDrives(snapshot), [snapshot]);
  const ramSegments = buildUsageDonutSegments(snapshot.ramPct);
  const cpuSegments = buildUsageDonutSegments(snapshot.cpuPct);
  const diskDrive = snapshot.diskDrive || instant.diskPrimary;
  return <>
      <section className={styles.kpiRow} aria-label={instant.aria}>
        <KpiGauge label={instant.cpuCurrent} value={formatPct(snapshot.cpuPct)} tone={toneClassForPct(snapshot.cpuPct)} icon="mdi:chip" />
        <KpiGauge label={instant.ramCurrent} value={formatPct(snapshot.ramPct)} hint={snapshot.ramUsedGB != null && snapshot.ramTotalGB != null ? `${formatStorageGB(snapshot.ramUsedGB)} / ${formatStorageGB(snapshot.ramTotalGB)} Go` : null} tone={toneClassForPct(snapshot.ramPct, {
        warn: 70,
        critical: 90
      })} icon="mdi:memory" />
        <KpiGauge label={interpolate(instant.disk, {
        drive: diskDrive
      })} value={formatPct(snapshot.diskPct)} tone={toneClassForPct(snapshot.diskPct, {
        warn: 75,
        critical: 90
      })} icon="mdi:harddisk" />
        <KpiGauge label={instant.temperature} value={formatTemp(snapshot.tempC)} tone={snapshot.tempC >= 80 ? "critical" : snapshot.tempC >= 65 ? "warn" : "good"} icon="mdi:thermometer" />
      </section>

      <section className={styles.dashboardSection}>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>{instant.sectionTitle}</h3>
          <p className={styles.sectionDesc}>{instant.sectionDesc}</p>
        </header>
        <div className={styles.donutGrid}>
          <DonutCard title={instant.cpuLoad} icon="mdi:chip" segments={cpuSegments} centerValue={formatPct(snapshot.cpuPct)} centerLabel={instant.used} tone={toneClassForPct(snapshot.cpuPct)} emptyHint={instant.cpuMissing} />
          <DonutCard title={instant.ramMemory} icon="mdi:memory" segments={ramSegments} centerValue={formatPct(snapshot.ramPct)} centerLabel={instant.usedF} footer={snapshot.ramUsedGB != null && snapshot.ramTotalGB != null ? `${formatStorageGB(snapshot.ramUsedGB)} / ${formatStorageGB(snapshot.ramTotalGB)} Go` : null} tone={toneClassForPct(snapshot.ramPct, {
          warn: 70,
          critical: 90
        })} emptyHint={instant.ramMissing} />
          {instantDisks.map(disk => <DonutCard key={disk.label} title={formatDiskVolumeTitle(disk)} icon="mdi:harddisk" segments={buildDiskDonutSegments(disk)} centerValue={formatPct(disk.pct)} centerLabel={disk.pct != null ? instant.occupied : instant.capacity} footer={formatDiskVolumeFooter(disk)} tone={toneClassForPct(disk.pct, {
          warn: 75,
          critical: 90
        })} emptyHint={interpolate(instant.diskCapacityMissing, {
          title: formatDiskVolumeTitle(disk)
        })} />)}
          {instantDisks.length === 0 ? <DonutCard title={interpolate(instant.disk, {
          drive: diskDrive
        })} icon="mdi:harddisk" segments={buildDiskDonutSegments({
          pct: snapshot.diskPct
        })} centerValue={formatPct(snapshot.diskPct)} centerLabel={instant.occupied} tone={toneClassForPct(snapshot.diskPct, {
          warn: 75,
          critical: 90
        })} emptyHint={instant.diskMissing} /> : null}
        </div>
      </section>
    </>;
}
