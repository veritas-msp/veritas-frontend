import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import {
  SCHEDULED_ALERT_FORM_SECTIONS,
  SCHEDULED_ALERT_TRIGGER_OPTIONS,
} from "./scheduledAlertConstants";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./IngestionRuleFormModal.module.css";

export default function ScheduledAlertRuleFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  isTeamsIntegrationActive = false,
  onClose,
  onSave,
}) {
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("general");

  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
  }, [open]);

  const channels = Array.isArray(draft?.channels) ? draft.channels : [];

  const sectionMeta = useMemo(
    () => ({
      general: Boolean(String(draft?.name || "").trim() && String(draft?.cron || "").trim()),
      delivery:
        channels.length > 0
        && (!channels.includes("mail") || String(draft?.recipients || "").trim()),
    }),
    [draft, channels]
  );

  if (!open || !draft) return null;

  const patchDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const toggleChannel = (channel, enabled) => {
    const current = Array.isArray(draft.channels) ? draft.channels : [];
    const next = enabled
      ? Array.from(new Set([...current, channel]))
      : current.filter((item) => item !== channel);
    patchDraft({ channels: next });
  };

  const modalTitle = isCreate ? "Nouvelle règle CRON" : `Modifier ${draft.name || "la règle"}`;
  const modalSubtitle = isCreate
    ? "Planifiez une alerte automatique sur contrats, licences ou SLA."
    : "Ajustez la planification et les canaux de notification.";

  const renderSectionContent = () => {
    const section = SCHEDULED_ALERT_FORM_SECTIONS.find((item) => item.id === activeSection);

    switch (activeSection) {
      case "general":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{section?.label}</h3>
              <p className={layout.sectionDesc}>{section?.description}</p>
            </div>

            <div className={styles.statusRow}>
              <div>
                <div className={styles.statusLabel}>Règle active</div>
                <p className={styles.statusHint}>
                  Les règles inactives ne sont pas exécutées par le planificateur.
                </p>
              </div>
              <Switch
                checked={Boolean(draft.enabled)}
                onChange={(on) => patchDraft({ enabled: on })}
                label={draft.enabled ? "Active" : "Inactive"}
              />
            </div>

            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="cron-rule-name">
                  Nom de la règle
                </label>
                <input
                  id="cron-rule-name"
                  type="text"
                  className={layout.input}
                  value={draft.name || ""}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder="Ex. Contrats J-30"
                />
              </div>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="cron-rule-cron">
                  Expression CRON
                </label>
                <input
                  id="cron-rule-cron"
                  type="text"
                  className={layout.input}
                  value={draft.cron || ""}
                  onChange={(e) => patchDraft({ cron: e.target.value })}
                  placeholder="0 8 * * *"
                />
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="cron-rule-threshold">
                  Seuil (jours)
                </label>
                <input
                  id="cron-rule-threshold"
                  type="number"
                  min="0"
                  className={layout.input}
                  value={draft.thresholdDays ?? 30}
                  onChange={(e) => patchDraft({ thresholdDays: Number(e.target.value || 0) })}
                />
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="cron-rule-trigger">
                  Déclencheur
                </label>
                <select
                  id="cron-rule-trigger"
                  className={layout.input}
                  value={draft.triggerType || "contract_expiration"}
                  onChange={(e) => patchDraft({ triggerType: e.target.value })}
                >
                  {SCHEDULED_ALERT_TRIGGER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        );

      case "delivery":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{section?.label}</h3>
              <p className={layout.sectionDesc}>{section?.description}</p>
            </div>

            <div className={styles.statusRow}>
              <div>
                <div className={styles.statusLabel}>Notification par mail</div>
                <p className={styles.statusHint}>Envoie un email aux destinataires configurés.</p>
              </div>
              <Switch
                checked={channels.includes("mail")}
                onChange={(on) => toggleChannel("mail", on)}
                label={channels.includes("mail") ? "Activé" : "Désactivé"}
              />
            </div>

            <div className={styles.statusRow}>
              <div>
                <div className={styles.statusLabel}>Notification Teams</div>
                <p className={styles.statusHint}>
                  {isTeamsIntegrationActive
                    ? "Publie via l'intégration Microsoft Teams."
                    : "Intégration Teams inactive · activez-la dans Administration."}
                </p>
              </div>
              <Switch
                checked={channels.includes("teams")}
                onChange={(on) => toggleChannel("teams", on)}
                label={channels.includes("teams") ? "Activé" : "Désactivé"}
                disabled={!isTeamsIntegrationActive}
              />
            </div>

            <div className={`${layout.field} ${layout.fieldFull}`}>
              <label className={layout.label} htmlFor="cron-rule-recipients">
                Destinataires mail
              </label>
              <input
                id="cron-rule-recipients"
                type="text"
                className={layout.input}
                value={draft.recipients || ""}
                onChange={(e) => patchDraft({ recipients: e.target.value })}
                placeholder="email1@domaine.com, email2@domaine.com"
                disabled={!channels.includes("mail")}
              />
              <p className={styles.statusHint}>Séparez plusieurs adresses par des virgules.</p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return createPortal(
    <div className={layout.overlay} onClick={onClose} role="presentation">
      <div
        className={layout.shell}
        style={{ maxWidth: "min(760px, 100%)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduled-alert-form-title"
      >
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:clock-plus-outline" : "mdi:clock-edit-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>Alertes planifiées</p>
              <h2 className={layout.title} id="scheduled-alert-form-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className={layout.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label="Fermer"
          >
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label="Sections de la règle CRON">
            {SCHEDULED_ALERT_FORM_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`${layout.navItem} ${
                  activeSection === section.id ? layout.navItemActive : ""
                }`}
                onClick={() => setActiveSection(section.id)}
                aria-current={activeSection === section.id ? "step" : undefined}
              >
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
              </button>
            ))}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            CRON : {draft.cron || "-"} · {channels.length} canal{channels.length > 1 ? "aux" : ""}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving}>
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  Enregistrement…
                </>
              ) : isCreate ? (
                <>
                  <Icon icon="mdi:check" aria-hidden />
                  Créer la règle
                </>
              ) : (
                <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
