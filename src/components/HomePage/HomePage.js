import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchHomeDashboard } from "../../api/stats";
import HomeTechNewsColumn from "./HomeTechNewsColumn";
import { getHomePageCopy } from "./homePageI18n";
import { VERITAS_WEBSITE_URL } from "../Setup/setupConstants";
import PageGuideHelpFab from "../PageGuide/PageGuideHelpFab";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getHomePageGuideSteps } from "../PageGuide/homePageGuideSteps";
import { buildHomeTodoActions } from "./homeTodoActions";
import { getHomeEventTypeMeta } from "./homeEventTypes";
import { localizeEquipmentFamilies } from "../../i18n/equipmentFamilyLabels";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import styles from "./HomePage.module.css";

const HOME_LIST_LIMIT = 5;
const FREE_SURVEILLANCE_DEVICE_LIMIT = 100;

const PRIMARY_KPIS = [{
  key: "openTickets",
  tone: "amber",
  icon: "mdi:ticket-outline",
  navigateType: "Ticket"
}, {
  key: "urgentTickets",
  tone: "red",
  icon: "mdi:alert-octagon-outline",
  navigateType: "Ticket"
}, {
  key: "todoCount",
  tone: "orange",
  icon: "mdi:clipboard-list-outline",
  navigateType: "Hardware"
}, {
  key: "clientsUnderContract",
  tone: "blue",
  icon: "mdi:domain",
  navigateType: "Contrat"
}];

const COMMUNITY_PRIMARY_KPIS = [{
  key: "openTickets",
  tone: "amber",
  icon: "mdi:ticket-outline",
  navigateType: "Ticket"
}, {
  key: "urgentTickets",
  tone: "red",
  icon: "mdi:alert-octagon-outline",
  navigateType: "Ticket"
}, {
  key: "clientsUnderContract",
  tone: "blue",
  icon: "mdi:domain",
  navigateType: "Contrat"
}, {
  key: "equipMonitoredTotal",
  tone: "teal",
  icon: "mdi:server-network",
  navigateType: "Hardware"
}];

const SECONDARY_KPIS = [{
  key: "equipMonitoredTotal",
  icon: "mdi:server-network",
  navigateType: "Hardware"
}, {
  key: "rmmAgents",
  icon: "mdi:desktop-classic",
  navigateType: "Hardware"
}, {
  key: "contractsExpiringWindow",
  icon: "mdi:file-clock-outline",
  navigateType: "Contrat"
}, {
  key: "contractsExpired",
  icon: "mdi:file-alert-outline",
  navigateType: "Contrat"
}, {
  key: "licensesExpired",
  icon: "mdi:key-alert-outline",
  navigateType: "Service"
}];

function formatDisplayNameFromEmailLocal(local) {
  if (!local) return "";
  const parts = local.split(/[._+\-]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}
function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return String(Math.round(Number(value)));
}
function formatSurveillanceRatio(monitored, total) {
  const monitoredValue = Number(monitored) || 0;
  const totalValue = Number(total) || 0;
  return `${formatNumber(monitoredValue)} / ${formatNumber(totalValue)}`;
}
function formatSurveillancePercent(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return `${Math.round(Number(value))}%`;
}
function getKpiValue(key, kpis, todoCount) {
  if (key === "todoCount") return formatNumber(todoCount);
  if (key === "equipMonitoredTotal") return formatNumber(kpis.equipMonitoredTotal);
  return formatNumber(kpis[key]);
}
function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function formatTicketTitle(ticket, noTitle) {
  const title = String(ticket.title || "").trim();
  if (title) return truncateText(title, 80);
  const description = stripHtml(ticket.description);
  if (description) return truncateText(description, 80);
  return noTitle;
}
function truncateText(value, max = 72) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
function normalizeHomeTicketStatus(status) {
  const key = String(status || "").trim().toLowerCase();
  if (key === "open") return "new";
  return key;
}
function countAssignedTicketStatuses(tickets) {
  let inProgress = 0;
  let pending = 0;
  for (const ticket of tickets) {
    const status = normalizeHomeTicketStatus(ticket.status);
    if (status === "pending") {
      pending += 1;
    } else {
      inProgress += 1;
    }
  }
  return {
    inProgress,
    pending
  };
}
function getSurveillancePercent(family) {
  if (family?.surveillancePercent != null && !Number.isNaN(Number(family.surveillancePercent))) {
    return Math.max(0, Math.min(100, Math.round(Number(family.surveillancePercent))));
  }
  const total = Number(family?.count) || 0;
  const monitored = Number(family?.monitoredCount) || 0;
  if (total <= 0) return 0;
  return Math.round(monitored / total * 100);
}

export default function HomePage({
  onNavigate,
  isCommunity = false
}) {
  const {
    user
  } = useAuthContext();
  const locale = useAppLocale();
  const formatters = useAppFormatters();
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const abortRef = useRef(null);
  const userName = useMemo(() => {
    const pseudo = String(user?.username || "").trim();
    if (pseudo) return pseudo;
    if (!user?.email) return "";
    const local = user.email.split("@")[0];
    return formatDisplayNameFromEmailLocal(local);
  }, [user]);
  const todayLabel = useMemo(() => formatters.formatLongDate(new Date()), [formatters]);
  const copy = useMemo(() => getHomePageCopy(locale), [locale]);
  const loadDashboard = useCallback((options = {}) => {
    const {
      soft = false
    } = options;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (soft) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError("");
    fetchHomeDashboard({
      signal: controller.signal
    }).then(dashboardData => {
      setDashboard(dashboardData);
    }).catch(err => {
      if (err.name === "AbortError") return;
      setLoadError(err.message || copy.errorLoad);
      if (!soft) setDashboard(null);
    }).finally(() => {
      if (abortRef.current !== controller) return;
      setLoading(false);
      setRefreshing(false);
    });
  }, [copy.errorLoad]);
  useEffect(() => {
    loadDashboard();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadDashboard]);
  const navigate = useCallback((type, data) => {
    if (typeof onNavigate === "function") onNavigate(type, data);
  }, [onNavigate]);
  const kpis = dashboard?.kpis || {};
  const infra = dashboard?.infrastructure || {};
  const equipmentFamilies = useMemo(() => localizeEquipmentFamilies(infra.families || [], locale), [infra.families, locale]);
  const assignedTickets = dashboard?.recentTickets || [];
  const assignedTicketCounts = dashboard?.assignedTicketStats || countAssignedTicketStatuses(assignedTickets);
  const upcomingEvents = dashboard?.upcomingEvents || [];
  const visibleEvents = upcomingEvents.slice(0, HOME_LIST_LIMIT);
  const nextEvent = upcomingEvents[0] || null;
  const todoActions = useMemo(() => buildHomeTodoActions(dashboard, {
    locale
  }), [dashboard, locale]);
  const todoCount = todoActions.length;
  const primaryKpis = isCommunity ? COMMUNITY_PRIMARY_KPIS : PRIMARY_KPIS;
  const secondaryKpis = isCommunity ? [] : SECONDARY_KPIS;
  const homeGuideSteps = useMemo(() => getHomePageGuideSteps({
    isCommunity,
    locale
  }), [isCommunity, locale]);
  const showEventsAndTodo = !isCommunity;
  const orgName = dashboard?.organizationName || "Veritas";

  return <div className={`${styles.pageWrapper} msp-page-grid`}>
      <div className={styles.pageLayout}>
        <div className={styles.dashboardMain}>
          <div data-guide="home-hero">
            <MspPageHero className={styles.homeHero} eyebrow={orgName} title={userName ? copy.heroGreeting(userName) : copy.heroTitle} subtitle={copy.heroSubtitle} icon="mdi:view-dashboard-outline" actions={<div className={styles.heroAside}>
                  <div className={styles.heroMeta}>
                    <Icon icon="mdi:calendar-today" className={styles.heroMetaIcon} />
                    <span className={styles.heroDate}>{todayLabel}</span>
                  </div>
                  <button type="button" className={styles.refreshBtn} onClick={() => loadDashboard({
                soft: true
              })} disabled={loading || refreshing} title={copy.refresh} aria-label={copy.refresh}>
                    <Icon icon="mdi:refresh" className={refreshing ? styles.spinning : ""} aria-hidden />
                  </button>
                </div>} />
          </div>

          {loading && !dashboard ? <HomeSkeleton kpiCount={primaryKpis.length} showEventsAndTodo={showEventsAndTodo} /> : null}

          {loadError ? <div className={styles.errorBanner} role="alert">
              <p className={styles.errorBannerText}>{loadError}</p>
              <button type="button" className={styles.errorRetry} onClick={() => loadDashboard()}>
                {copy.retry}
              </button>
            </div> : null}

          {dashboard ? <>
              <TodayStrip copy={copy} urgentCount={Number(kpis.urgentTickets) || 0} todoCount={showEventsAndTodo ? todoCount : 0} nextEvent={showEventsAndTodo ? nextEvent : null} formatDateTime={formatters.formatDateTime} onNavigate={navigate} showTodo={showEventsAndTodo} />

              <section className={styles.kpiRow} style={{
              "--kpi-count": primaryKpis.length
            }} aria-label={copy.kpiAriaLabel} data-guide="home-kpis">
                {primaryKpis.map(({
                key,
                tone,
                icon,
                navigateType
              }, index) => {
                const label = copy.getKpiLabel(key);
                return <motion.button key={key} type="button" className={`${styles.kpiCard} ${styles[`kpiTone_${tone}`]}`} initial={{
                  opacity: 0,
                  y: 10
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  duration: 0.35,
                  delay: index * 0.04
                }} onClick={() => navigate(navigateType)} title={copy.getKpiNavigateLabel(key)} aria-label={copy.getKpiNavigateLabel(key)}>
                      <span className={styles.kpiIconWrap} aria-hidden>
                        <Icon icon={icon} />
                      </span>
                      <span className={styles.kpiValue}>{getKpiValue(key, kpis, todoCount)}</span>
                      <span className={styles.kpiLabel}>{label}</span>
                    </motion.button>;
              })}
              </section>

              {secondaryKpis.length > 0 ? <section className={styles.secondaryKpiRow} aria-label={copy.secondaryKpiAriaLabel}>
                  {secondaryKpis.map(({
                  key,
                  icon,
                  navigateType
                }) => <button key={key} type="button" className={styles.secondaryKpiChip} onClick={() => navigate(navigateType)} title={copy.getKpiNavigateLabel(key)}>
                      <Icon icon={icon} aria-hidden />
                      <strong>{getKpiValue(key, kpis, todoCount)}</strong>
                      <span>{copy.getKpiLabel(key)}</span>
                    </button>)}
                </section> : null}

              <div className={styles.opsStack}>
                <section className={`${styles.panel} ${styles.panelFull}`} data-guide="home-tickets">
                  <PanelHeader title={copy.panels.tickets.title} titleMeta={<span className={styles.ticketStatusNote}>
                        <strong>{formatNumber(assignedTicketCounts.inProgress)}</strong>{" "}
                        {copy.panels.tickets.inProgress}
                        <span className={styles.ticketStatusNoteSep}>/</span>
                        <strong>{formatNumber(assignedTicketCounts.pending)}</strong>{" "}
                        {copy.panels.tickets.pending}
                      </span>} actionLabel={copy.panels.tickets.action} onAction={() => navigate("Ticket")} eyebrow />
                  <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                    {assignedTickets.length > 0 ? <HomeTicketsList tickets={assignedTickets} copy={copy} formatDateTime={formatters.formatDateTime} onOpen={ticket => navigate("TicketDetail", {
                    ticketId: ticket.id,
                    id: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    title: ticket.title
                  })} /> : <EmptyState icon="mdi:ticket-outline" text={copy.empty.tickets} />}
                  </div>
                </section>

                {showEventsAndTodo ? <section className={`${styles.panel} ${styles.panelFull}`} data-guide="home-events">
                    <PanelHeader title={copy.panels.events.title} actionLabel={copy.panels.events.action} onAction={() => navigate("Planning")} eyebrow />
                    <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                      {visibleEvents.length > 0 ? <ul className={styles.itemList}>
                          {visibleEvents.map(event => <li key={event.id}>
                              <HomeEventCard event={event} locale={locale} copy={copy} formatDateRange={formatters.formatDateRange} onOpen={() => navigate("Planning")} />
                            </li>)}
                        </ul> : <EmptyState icon="mdi:calendar-blank-outline" text={copy.empty.events} />}
                    </div>
                  </section> : null}

                {showEventsAndTodo ? <section className={`${styles.panel} ${styles.panelFull}`} data-guide="home-todo">
                    <PanelHeader title={copy.panels.todo.title} actionLabel={copy.panels.todo.action} onAction={() => navigate("Hardware")} eyebrow />
                    <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                      <HomeTodoList actions={todoActions} copy={copy} onNavigate={navigate} />
                    </div>
                  </section> : null}

                <section className={`${styles.panel} ${styles.panelFull}`} data-guide="home-surveillance">
                  <PanelHeader title={copy.panels.surveillance.title} eyebrow headerMeta={isCommunity ? <SurveillancePlanNote copy={copy} monitoredTotal={infra.equipMonitoredTotal ?? kpis.equipMonitoredTotal} /> : null} />
                  <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                    {equipmentFamilies.length > 0 ? <div className={styles.surveyFamilyGrid}>
                        {equipmentFamilies.map(family => <SurveillanceFamilyCard key={family.key} family={family} copy={copy} />)}
                        <div className={styles.surveySummary}>
                          <span>{copy.panels.surveillance.globalFleet}</span>
                          <strong>
                            {formatSurveillanceRatio(infra.equipUnderSurveillanceCount ?? kpis.equipUnderSurveillanceCount, infra.equipMonitoredTotal ?? kpis.equipMonitoredTotal)}
                            {infra.equipSurveillancePercent != null ? ` (${formatSurveillancePercent(infra.equipSurveillancePercent)})` : kpis.equipSurveillancePercent != null ? ` (${formatSurveillancePercent(kpis.equipSurveillancePercent)})` : ""}
                          </strong>
                        </div>
                      </div> : <EmptyState icon="mdi:server-network" text={copy.panels.surveillance.empty} />}
                  </div>
                </section>
              </div>
            </> : null}
        </div>

        <div className={styles.newsAside} data-guide="home-news">
          <HomeTechNewsColumn locale={locale} />
        </div>
      </div>

      <PageGuideHelpFab active={pageGuideOpen} onClick={() => setPageGuideOpen(true)} label={copy.guide.fabLabel} />
      <PageGuideTour open={pageGuideOpen} steps={homeGuideSteps} title={copy.guide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>;
}

function TodayStrip({
  copy,
  urgentCount,
  todoCount,
  nextEvent,
  formatDateTime,
  onNavigate,
  showTodo
}) {
  const nextTitle = nextEvent ? truncateText(String(nextEvent.title || "").trim() || copy.noTitle, 36) : null;
  const nextWhen = nextEvent?.start ? formatDateTime(nextEvent.start) : null;
  return <section className={styles.todayStrip} data-guide="home-today" aria-label={copy.today.ariaLabel}>
      <div className={styles.todayLabel}>
        <Icon icon="mdi:lightning-bolt" aria-hidden />
        <span>{copy.today.title}</span>
      </div>
      <div className={styles.todayItems}>
        <button type="button" className={`${styles.todayItem} ${urgentCount > 0 ? styles.todayItemAlert : ""}`} onClick={() => onNavigate("Ticket")}>
          <strong>{formatNumber(urgentCount)}</strong>
          <span>{copy.today.urgent}</span>
        </button>
        {showTodo ? <button type="button" className={`${styles.todayItem} ${todoCount > 0 ? styles.todayItemWarn : ""}`} onClick={() => onNavigate("Hardware")}>
            <strong>{formatNumber(todoCount)}</strong>
            <span>{copy.today.todo}</span>
          </button> : null}
        {showTodo ? <button type="button" className={styles.todayItem} onClick={() => onNavigate("Planning")}>
            {nextEvent ? <>
                <strong className={styles.todayNextTitle}>{nextTitle}</strong>
                <span>{nextWhen || copy.today.nextEvent}</span>
              </> : <>
                <strong>—</strong>
                <span>{copy.today.noEvent}</span>
              </>}
          </button> : null}
      </div>
    </section>;
}

function HomeSkeleton({
  kpiCount,
  showEventsAndTodo
}) {
  return <div className={styles.skeleton} aria-hidden>
      <div className={styles.skeletonToday} />
      <div className={styles.skeletonKpiRow} style={{
      "--kpi-count": kpiCount
    }}>
        {Array.from({
        length: kpiCount
      }, (_, i) => <div key={i} className={styles.skeletonKpi} />)}
      </div>
      <div className={styles.skeletonOps}>
        <div className={styles.skeletonPanel} />
        {showEventsAndTodo ? <>
            <div className={styles.skeletonPanelSm} />
            <div className={styles.skeletonPanelSm} />
          </> : null}
        <div className={styles.skeletonPanelSm} />
      </div>
    </div>;
}

function HomeEventCard({
  event,
  locale,
  copy,
  formatDateRange,
  onOpen
}) {
  const title = truncateText(String(event.title || "").trim() || copy.noTitle, 48);
  const clientLabel = event.clientName || copy.noClient;
  const fullTitle = String(event.title || "").trim() || copy.noTitle;
  const typeMeta = getHomeEventTypeMeta(event.type, event.typeLabel, locale);
  return <button type="button" className={styles.eventCard} onClick={onOpen} title={`${fullTitle} · ${clientLabel}`}>
      <div className={styles.eventCardMain}>
        <div className={styles.eventCardHead}>
          <span className={styles.eventType}>
            <Icon icon={typeMeta.icon} className={styles.eventTypeIcon} aria-hidden />
            {typeMeta.label}
          </span>
        </div>
        <div className={styles.eventCardRow}>
          <span className={styles.eventCardTitle}>{title}</span>
          <span className={styles.eventCardSep} aria-hidden>|</span>
          <span className={styles.eventCardClient}>{clientLabel}</span>
        </div>
      </div>
      <div className={styles.eventCardDateCol}>
        <span className={styles.eventCardDate}>{formatDateRange(event.start, event.end)}</span>
      </div>
    </button>;
}

function HomeTicketsList({
  tickets,
  copy,
  formatDateTime,
  onOpen
}) {
  return <ul className={styles.ticketList}>
      {tickets.map(ticket => {
      const priorityVisual = copy.getPriorityVisual(ticket.priority, ticket.isMajorIncident);
      return <li key={ticket.id}>
            <button type="button" className={`${styles.ticketRow} ${ticket.isMajorIncident ? styles.ticketRowMajor : ""}`} onClick={() => onOpen(ticket)}>
              <span className={styles.ticketNum}>#{ticket.ticketNumber || "-"}</span>
              <span className={`${styles.priorityBadge} ${styles[`priorityBadge_${priorityVisual.tone}`]}`} title={priorityVisual.label}>
                <Icon icon={priorityVisual.icon} aria-hidden />
                {priorityVisual.label}
              </span>
              <span className={styles.ticketTitle}>{formatTicketTitle(ticket, copy.noTitle)}</span>
              <span className={styles.ticketClient}>{ticket.clientName || "-"}</span>
              <span className={styles.ticketDate}>{formatDateTime(ticket.updatedAt)}</span>
            </button>
          </li>;
    })}
    </ul>;
}

function HomeTodoList({
  actions,
  copy,
  onNavigate
}) {
  if (!actions.length) {
    return <EmptyState icon="mdi:check-circle-outline" text={copy.empty.todo} />;
  }
  return <ul className={styles.todoList}>
      {actions.map(action => <li key={action.id}>
          <button type="button" className={`${styles.todoItem} ${styles[`todoItem_${action.tone}`]}`} onClick={() => {
        if (action.navigateType === "ContratDetail") {
          onNavigate(action.navigateType, action.navigateData);
          return;
        }
        onNavigate(action.navigateType);
      }}>
            <span className={`${styles.todoDot} ${styles[`todoDot_${action.tone}`]}`} aria-hidden />
            <span className={styles.todoBody}>
              <span className={styles.todoTop}>
                <span className={styles.todoSource}>
                  <Icon icon={action.sourceIcon} aria-hidden />
                  {action.sourceLabel}
                </span>
                <span className={styles.todoLabel}>{action.label}</span>
              </span>
              <span className={styles.todoTitle}>{action.title}</span>
              {action.meta ? <span className={styles.todoMeta}>{action.meta}</span> : null}
            </span>
          </button>
        </li>)}
    </ul>;
}

function PanelHeader({
  icon,
  title,
  titleMeta = null,
  actionLabel,
  onAction,
  eyebrow = false,
  headerMeta = null
}) {
  return <div className={styles.panelHeader}>
      <div className={styles.panelHeaderMain}>
        {eyebrow ? <div className={styles.panelEyebrowRow}>
            <h2 className={styles.panelEyebrow}>{title}</h2>
            {titleMeta}
          </div> : <div className={styles.panelTitleRow}>
            {icon ? <Icon icon={icon} className={styles.panelIcon} /> : null}
            <h2 className={styles.panelTitle}>{title}</h2>
          </div>}
        {headerMeta}
      </div>
      {actionLabel && onAction && <button type="button" className={styles.panelAction} onClick={onAction}>
          <span>{actionLabel}</span>
          <Icon icon="mdi:arrow-right" className={styles.panelActionIcon} aria-hidden />
        </button>}
    </div>;
}

function SurveillanceFamilyCard({
  family,
  copy
}) {
  const percent = getSurveillancePercent(family);
  const ratioLabel = formatSurveillanceRatio(family.monitoredCount, family.count);
  return <div className={styles.surveyFamilyCard} title={copy.getSurveillanceTooltip(family.label, ratioLabel, percent)}>
      <div className={styles.surveyFamilyHead}>
        <span className={styles.surveyFamilyIconWrap}>
          <Icon icon={family.icon || "mdi:devices"} aria-hidden />
        </span>
        <span className={styles.surveyFamilyLabel}>{family.label}</span>
        <span className={styles.surveyFamilyMeta}>
          <span className={styles.surveyFamilyRatio}>{ratioLabel}</span>
          <span className={styles.surveyFamilyPct}>{formatSurveillancePercent(percent)}</span>
        </span>
      </div>
      <div className={styles.surveyFamilyBar} aria-hidden>
        <span className={styles.surveyFamilyBarFill} style={{
        width: `${percent}%`
      }} />
      </div>
    </div>;
}

function SurveillancePlanNote({
  copy,
  monitoredTotal
}) {
  const count = Number(monitoredTotal) || 0;
  const atOrOverLimit = count >= FREE_SURVEILLANCE_DEVICE_LIMIT;
  const limitLabel = copy.getDevicesMaxLabel(count, FREE_SURVEILLANCE_DEVICE_LIMIT, formatNumber);
  return <p className={`${styles.planNote} ${atOrOverLimit ? styles.planNoteWarning : ""}`}>
      <Icon icon="mdi:lock-outline" className={styles.planNoteIcon} aria-hidden />
      <span>
        {copy.surveillance.freePlan}{" "}
        <a href={VERITAS_WEBSITE_URL} target="_blank" rel="noopener noreferrer" className={styles.planNoteLink} title={copy.surveillance.discoverVeritas}>
          <strong>{limitLabel}</strong>
        </a>
      </span>
    </p>;
}

function EmptyState({
  icon,
  text
}) {
  return <div className={styles.emptyState}>
      <Icon icon={icon} className={styles.emptyIcon} />
      <p>{text}</p>
    </div>;
}
