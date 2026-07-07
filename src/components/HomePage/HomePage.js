// ──────────────────────────────
// 📦 Accueil MSP · tableau de bord opérationnel
// ──────────────────────────────
import { useMemo, useState, useEffect, useCallback } from "react";
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
import styles from "./HomePage.module.css";

const HOME_LIST_LIMIT = 5;
const FREE_SURVEILLANCE_DEVICE_LIMIT = 100;

const HERO_KPIS = [
  { key: "clientsUnderContract", tone: "blue" },
  { key: "equipMonitoredTotal", tone: "teal" },
  { key: "rmmAgents", tone: "green" },
  { key: "contractsExpiringWindow", tone: "rose" },
  { key: "contractsExpired", tone: "orange" },
  { key: "licensesExpired", tone: "purple" },
  { key: "openTickets", tone: "amber" },
  { key: "urgentTickets", tone: "red" },
];

const COMMUNITY_KPI_KEYS = new Set([
  "clientsUnderContract",
  "equipMonitoredTotal",
  "rmmAgents",
  "openTickets",
  "urgentTickets",
]);

function formatDisplayNameFromEmailLocal(local) {
  if (!local) return "";
  const parts = local
    .split(/[._+\-]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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

function formatHeroKpiValue(key, kpis) {
  if (key === "equipMonitoredTotal") {
    return formatNumber(kpis.equipMonitoredTotal);
  }
  return formatNumber(kpis[key]);
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTicketDescription(ticket, noTitle) {
  const description = stripHtml(ticket.description);
  if (description) return truncateText(description, 120);
  return truncateText(String(ticket.title || "").trim() || noTitle, 120);
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

  return { inProgress, pending };
}

function getSurveillancePercent(family) {
  if (family?.surveillancePercent != null && !Number.isNaN(Number(family.surveillancePercent))) {
    return Math.max(0, Math.min(100, Math.round(Number(family.surveillancePercent))));
  }
  const total = Number(family?.count) || 0;
  const monitored = Number(family?.monitoredCount) || 0;
  if (total <= 0) return 0;
  return Math.round((monitored / total) * 100);
}

export default function HomePage({ onNavigate, isCommunity = false }) {
  const { user } = useAuthContext();
  const locale = useAppLocale();
  const formatters = useAppFormatters();
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);

  const userName = useMemo(() => {
    const pseudo = String(user?.username || "").trim();
    if (pseudo) return pseudo;
    if (!user?.email) return "";
    const local = user.email.split("@")[0];
    return formatDisplayNameFromEmailLocal(local);
  }, [user]);

  const todayLabel = useMemo(() => formatters.formatLongDate(new Date()), [formatters]);

  const copy = useMemo(() => getHomePageCopy(locale), [locale]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    fetchHomeDashboard({ signal: controller.signal })
      .then((dashboardData) => {
        setDashboard(dashboardData);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setLoadError(err.message || copy.errorLoad);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const navigate = useCallback(
    (type, data) => {
      if (typeof onNavigate === "function") onNavigate(type, data);
    },
    [onNavigate]
  );

  const kpis = dashboard?.kpis || {};
  const infra = dashboard?.infrastructure || {};
  const equipmentFamilies = useMemo(
    () => localizeEquipmentFamilies(infra.families || [], locale),
    [infra.families, locale]
  );
  const assignedTickets = dashboard?.recentTickets || [];
  const assignedTicketCounts = dashboard?.assignedTicketStats || countAssignedTicketStatuses(assignedTickets);
  const visibleEvents = (dashboard?.upcomingEvents || []).slice(0, HOME_LIST_LIMIT);
  const todoActions = useMemo(() => buildHomeTodoActions(dashboard, { locale }), [dashboard, locale]);
  const visibleHeroKpis = isCommunity
    ? HERO_KPIS.filter(({ key }) => COMMUNITY_KPI_KEYS.has(key))
    : HERO_KPIS;

  const homeGuideSteps = useMemo(
    () => getHomePageGuideSteps({ isCommunity, locale }),
    [isCommunity, locale]
  );

  return (
    <div className={`${styles.pageWrapper} msp-page-grid`}>
      <div className={styles.pageLayout}>
        <div className={styles.dashboardMain}>
        <motion.header
          className={styles.hero}
          data-guide="home-hero"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.heroMain}>
            <div className={styles.brandRow}>
              <div className={styles.brandMark}>V</div>
              <div>
                <p className={styles.orgName}>{dashboard?.organizationName || "Veritas"}</p>
                <h1 className={styles.heroTitle}>
                  {userName ? copy.heroGreeting(userName) : copy.heroTitle}
                </h1>
              </div>
            </div>
            <p className={styles.heroSubtitle}>{copy.heroSubtitle}</p>
          </div>
          <div className={styles.heroMeta}>
            <Icon icon="mdi:calendar-today" className={styles.heroMetaIcon} />
            <span className={styles.heroDate}>{todayLabel}</span>
          </div>
        </motion.header>

        {loading && (
          <div className={styles.loadingState}>
            <Icon icon="mdi:loading" className={styles.spinner} />
            <p>{copy.loading}</p>
          </div>
        )}

        {loadError ? <p className={styles.errorBanner}>{loadError}</p> : null}

        {!loading && !loadError && dashboard && (
          <>
            <section className={styles.kpiRow} aria-label={copy.kpiAriaLabel} data-guide="home-kpis">
              {visibleHeroKpis.map(({ key, tone }, index) => (
                <motion.div
                  key={key}
                  className={`${styles.kpiCard} ${styles[`kpiTone_${tone}`]}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                >
                  <span className={styles.kpiValue}>{formatHeroKpiValue(key, kpis)}</span>
                  <span className={styles.kpiLabel}>{copy.getKpiLabel(key)}</span>
                </motion.div>
              ))}
            </section>

            <div className={styles.dashboardGrid}>
              <section className={`${styles.panel} ${styles.panelPrimary}`} data-guide="home-tickets">
                <PanelHeader
                  title={copy.panels.tickets.title}
                  titleMeta={
                    <span className={styles.ticketStatusNote}>
                      <strong>{formatNumber(assignedTicketCounts.inProgress)}</strong>{" "}
                      {copy.panels.tickets.inProgress}
                      <span className={styles.ticketStatusNoteSep}>/</span>
                      <strong>{formatNumber(assignedTicketCounts.pending)}</strong>{" "}
                      {copy.panels.tickets.pending}
                    </span>
                  }
                  actionLabel={copy.panels.tickets.action}
                  onAction={() => navigate("Ticket")}
                  eyebrow
                />
                <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                  {assignedTickets.length > 0 ? (
                    <HomeTicketsTable
                      tickets={assignedTickets}
                      copy={copy}
                      formatDateTime={formatters.formatDateTime}
                      onOpen={(ticket) =>
                        navigate("TicketDetail", {
                          ticketId: ticket.id,
                          id: ticket.id,
                          ticketNumber: ticket.ticketNumber,
                          title: ticket.title,
                        })
                      }
                    />
                  ) : (
                    <EmptyState icon="mdi:ticket-outline" text={copy.empty.tickets} />
                  )}
                </div>
              </section>

              <section className={`${styles.panel} ${styles.panelPrimary}`} data-guide="home-events">
                <PanelHeader
                  title={copy.panels.events.title}
                  actionLabel={copy.panels.events.action}
                  onAction={() => navigate("Planning")}
                  eyebrow
                />
                <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                  {visibleEvents.length > 0 ? (
                    <ul className={styles.itemList}>
                      {visibleEvents.map((event) => (
                        <li key={event.id}>
                          <HomeEventCard
                            event={event}
                            locale={locale}
                            copy={copy}
                            formatDateRange={formatters.formatDateRange}
                            onOpen={() => navigate("Planning")}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState icon="mdi:calendar-blank-outline" text={copy.empty.events} />
                  )}
                </div>
              </section>

              <section className={`${styles.panel} ${styles.panelPrimary}`} data-guide="home-surveillance">
                <PanelHeader
                  title={copy.panels.surveillance.title}
                  eyebrow
                  headerMeta={
                    <SurveillancePlanNote
                      copy={copy}
                      monitoredTotal={infra.equipMonitoredTotal ?? kpis.equipMonitoredTotal}
                    />
                  }
                />
                <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                  {equipmentFamilies.length > 0 ? (
                    <div className={styles.surveyFamilyGrid}>
                      {equipmentFamilies.map((family) => (
                        <SurveillanceFamilyCard key={family.key} family={family} copy={copy} />
                      ))}
                      <div className={styles.surveySummary}>
                        <span>{copy.panels.surveillance.globalFleet}</span>
                        <strong>
                          {formatSurveillanceRatio(
                            infra.equipUnderSurveillanceCount ?? kpis.equipUnderSurveillanceCount,
                            infra.equipMonitoredTotal ?? kpis.equipMonitoredTotal
                          )}
                          {infra.equipSurveillancePercent != null
                            ? ` (${formatSurveillancePercent(infra.equipSurveillancePercent)})`
                            : kpis.equipSurveillancePercent != null
                              ? ` (${formatSurveillancePercent(kpis.equipSurveillancePercent)})`
                              : ""}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <EmptyState icon="mdi:server-network" text={copy.panels.surveillance.empty} />
                  )}
                </div>
              </section>

              <section className={`${styles.panel} ${styles.panelPrimary}`} data-guide="home-todo">
                <PanelHeader
                  title={copy.panels.todo.title}
                  actionLabel={copy.panels.todo.action}
                  onAction={() => navigate("Hardware")}
                  eyebrow
                />
                <div className={`${styles.panelBody} ${styles.panelBodyFlush}`}>
                  <HomeTodoList actions={todoActions} copy={copy} onNavigate={navigate} />
                </div>
              </section>
            </div>
          </>
        )}
        </div>

        <div className={styles.newsAside} data-guide="home-news">
          <HomeTechNewsColumn locale={locale} />
        </div>
      </div>

      <PageGuideHelpFab
        active={pageGuideOpen}
        onClick={() => setPageGuideOpen(true)}
        label={copy.guide.fabLabel}
      />
      <PageGuideTour
        open={pageGuideOpen}
        steps={homeGuideSteps}
        title={copy.guide.tourTitle}
        locale={locale}
        onClose={() => setPageGuideOpen(false)}
      />
    </div>
  );
}

function HomeEventCard({ event, locale, copy, formatDateRange, onOpen }) {
  const title = truncateText(String(event.title || "").trim() || copy.noTitle, 48);
  const clientLabel = event.clientName || copy.noClient;
  const fullTitle = String(event.title || "").trim() || copy.noTitle;
  const typeMeta = getHomeEventTypeMeta(event.type, event.typeLabel, locale);

  return (
    <button
      type="button"
      className={styles.eventCard}
      onClick={onOpen}
      title={`${fullTitle} · ${clientLabel}`}
    >
      <div className={styles.eventCardMain}>
        <div className={styles.eventCardHead}>
          <span className={styles.eventType}>
            <Icon icon={typeMeta.icon} className={styles.eventTypeIcon} aria-hidden />
            {typeMeta.label}
          </span>
        </div>
        <div className={styles.eventCardRow}>
          <span className={styles.eventCardTitle}>{title}</span>
          <span className={styles.eventCardSep} aria-hidden>
            |
          </span>
          <span className={styles.eventCardClient}>{clientLabel}</span>
        </div>
      </div>
      <div className={styles.eventCardDateCol}>
        <span className={styles.eventCardDate}>{formatDateRange(event.start, event.end)}</span>
      </div>
    </button>
  );
}

function HomeTicketsTable({ tickets, copy, formatDateTime, onOpen }) {
  const table = copy.ticketsTable;
  return (
    <div className={styles.homeTableWrap}>
      <table className={styles.homeTable}>
        <thead>
          <tr>
            <th>{table.number}</th>
            <th>{table.priority}</th>
            <th>{table.description}</th>
            <th>{table.company}</th>
            <th>{table.modified}</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const priorityVisual = copy.getPriorityVisual(ticket.priority, ticket.isMajorIncident);
            return (
              <tr
                key={ticket.id}
                className={`${styles.homeTableRow} ${ticket.isMajorIncident ? styles.homeTableRowMajor : ""}`}
                onClick={() => onOpen(ticket)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(ticket);
                  }
                }}
                role="button"
              >
                <td className={styles.homeTableNum}>#{ticket.ticketNumber || "-"}</td>
                <td>
                  <span
                    className={`${styles.priorityBadge} ${styles[`priorityBadge_${priorityVisual.tone}`]}`}
                    title={priorityVisual.label}
                  >
                    <Icon icon={priorityVisual.icon} aria-hidden />
                    {priorityVisual.label}
                  </span>
                </td>
                <td className={styles.homeTableDesc}>{formatTicketDescription(ticket, copy.noTitle)}</td>
                <td className={styles.homeTableClient}>{ticket.clientName || "-"}</td>
                <td className={styles.homeTableDate}>{formatDateTime(ticket.updatedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HomeTodoList({ actions, copy, onNavigate }) {
  if (!actions.length) {
    return (
      <EmptyState icon="mdi:check-circle-outline" text={copy.empty.todo} />
    );
  }

  return (
    <ul className={styles.todoList}>
      {actions.map((action) => (
        <li key={action.id}>
          <button
            type="button"
            className={`${styles.todoItem} ${styles[`todoItem_${action.tone}`]}`}
            onClick={() => {
              if (action.navigateType === "ContratDetail") {
                onNavigate(action.navigateType, action.navigateData);
                return;
              }
              onNavigate(action.navigateType);
            }}
          >
            <span
              className={`${styles.todoDot} ${styles[`todoDot_${action.tone}`]}`}
              aria-hidden
            />
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
        </li>
      ))}
    </ul>
  );
}

function PanelHeader({ icon, title, titleMeta = null, actionLabel, onAction, eyebrow = false, headerMeta = null }) {
  return (
    <div className={styles.panelHeader}>
      <div className={styles.panelHeaderMain}>
        {eyebrow ? (
          <div className={styles.panelEyebrowRow}>
            <h2 className={styles.panelEyebrow}>{title}</h2>
            {titleMeta}
          </div>
        ) : (
          <div className={styles.panelTitleRow}>
            {icon ? <Icon icon={icon} className={styles.panelIcon} /> : null}
            <h2 className={styles.panelTitle}>{title}</h2>
          </div>
        )}
        {headerMeta}
      </div>
      {actionLabel && onAction && (
        <button type="button" className={styles.panelAction} onClick={onAction}>
          <span>{actionLabel}</span>
          <Icon icon="mdi:arrow-right" className={styles.panelActionIcon} aria-hidden />
        </button>
      )}
    </div>
  );
}

function SurveillanceFamilyCard({ family, copy }) {
  const percent = getSurveillancePercent(family);
  const ratioLabel = formatSurveillanceRatio(family.monitoredCount, family.count);

  return (
    <div
      className={styles.surveyFamilyCard}
      title={copy.getSurveillanceTooltip(family.label, ratioLabel, percent)}
    >
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
    </div>
  );
}

function SurveillancePlanNote({ copy, monitoredTotal }) {
  const count = Number(monitoredTotal) || 0;
  const atOrOverLimit = count >= FREE_SURVEILLANCE_DEVICE_LIMIT;
  const limitLabel = copy.getDevicesMaxLabel(count, FREE_SURVEILLANCE_DEVICE_LIMIT, formatNumber);

  return (
    <p className={`${styles.planNote} ${atOrOverLimit ? styles.planNoteWarning : ""}`}>
      <Icon icon="mdi:lock-outline" className={styles.planNoteIcon} aria-hidden />
      <span>
        {copy.surveillance.freePlan}{" "}
        <a
          href={VERITAS_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.planNoteLink}
          title={copy.surveillance.discoverVeritas}
        >
          <strong>{limitLabel}</strong>
        </a>
      </span>
    </p>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className={styles.emptyState}>
      <Icon icon={icon} className={styles.emptyIcon} />
      <p>{text}</p>
    </div>
  );
}
