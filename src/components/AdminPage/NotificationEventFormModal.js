import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { Switch } from "./AdminUi";
import {
  NOTIFICATION_CHANNEL_OPTIONS,
  NOTIFICATION_EVENT_FORM_SECTIONS,
  NOTIFICATION_SOURCE_OPTIONS,
  TEAMS_THEME_COLOR_PRESETS,
  WEBHOOK_CHANNEL_ICON_BY_KEY,
  getSourceOption,
  isSoonElementKey,
  parseEmailTags,
} from "./notificationEventConstants";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
import styles from "./NotificationEventFormModal.module.css";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

function EmailChipField({ emails, inputValue, onInputChange, onAdd, onRemove, placeholder }) {
  return (
    <div className={styles.emailChipField}>
      {emails.map((email) => (
        <span key={email} className={styles.emailChip}>
          {email}
          <button type="button" className={styles.emailChipRemove} onClick={() => onRemove(email)} title="Retirer">
            <Icon icon="mdi:close" />
          </button>
        </span>
      ))}
      <input
        className={styles.emailChipInput}
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
            e.preventDefault();
            onAdd(inputValue);
            onInputChange("");
          }
          if (e.key === "Backspace" && !inputValue.trim() && emails.length > 0) {
            onRemove(emails[emails.length - 1]);
          }
        }}
        onBlur={() => {
          onAdd(inputValue);
          onInputChange("");
        }}
        placeholder={emails.length ? "" : placeholder}
      />
    </div>
  );
}

export default function NotificationEventFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  availableClients = [],
  webhooks = [],
  commentTemplates = [],
  editorRef,
  onClose,
  onSave,
  onOpenVariables,
}) {
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("trigger");
  const [emailToInput, setEmailToInput] = useState("");
  const [emailCcInput, setEmailCcInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [webhookSelectOpen, setWebhookSelectOpen] = useState(false);
  const webhookSelectRef = useRef(null);
  const internalEditorRef = useRef(null);
  const resolvedEditorRef = editorRef || internalEditorRef;

  useEffect(() => {
    if (!open) return;
    setActiveSection("trigger");
    setEmailToInput("");
    setEmailCcInput("");
    setShowPreview(false);
    setWebhookSelectOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open || !resolvedEditorRef?.current) return;
    if (draft?.useTemplate) return;
    resolvedEditorRef.current.innerHTML = String(draft?.customMessage || "");
  }, [open, draft?.useTemplate, draft?.id, resolvedEditorRef]);

  useEffect(() => {
    if (!open) return;
    const handleDocumentClick = (event) => {
      if (!webhookSelectRef.current) return;
      if (!webhookSelectRef.current.contains(event.target)) {
        setWebhookSelectOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [open]);

  const selectedWebhook = useMemo(
    () => webhooks.find((webhook) => String(webhook?.id || "") === String(draft?.webhookId || "")),
    [webhooks, draft?.webhookId]
  );

  const isTeamsWebhook =
    (draft?.channel || "webhook") === "webhook"
    && String(selectedWebhook?.channel || "").toLowerCase() === "teams";

  const sectionMeta = useMemo(() => {
    const channel = draft?.channel || "webhook";
    const channelOk =
      channel === "mail"
        ? parseEmailTags(draft?.emailTo).length > 0
        : channel === "webhook"
          ? Boolean(String(draft?.webhookId || "").trim())
          : false;
    const contentOk = draft?.useTemplate
      ? Boolean(String(draft?.templateId || "").trim())
      : Boolean(String(draft?.customMessage || "").trim());
    return {
      trigger: Boolean(draft?.source && draft?.element),
      target:
        draft?.scopeType !== "enterprise"
        || Boolean(String(draft?.enterpriseId || "").trim()),
      channel: channelOk,
      content: contentOk,
    };
  }, [draft]);

  if (!open || !draft) return null;

  const patchDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const addEmailChip = (field, rawValue) => {
    const candidate = String(rawValue || "").trim().replace(/,$/, "");
    if (!candidate) return;
    setDraft((prev) => {
      const current = parseEmailTags(prev?.[field] || "");
      const exists = current.some((email) => email.toLowerCase() === candidate.toLowerCase());
      if (exists) return prev;
      return { ...prev, [field]: [...current, candidate].join(", ") };
    });
  };

  const removeEmailChip = (field, valueToRemove) => {
    setDraft((prev) => {
      const nextList = parseEmailTags(prev?.[field] || "").filter(
        (email) => email.toLowerCase() !== String(valueToRemove || "").toLowerCase()
      );
      return { ...prev, [field]: nextList.join(", ") };
    });
  };

  const execEditorCommand = (command, value = null) => {
    if (!resolvedEditorRef.current) return;
    resolvedEditorRef.current.focus();
    document.execCommand(command, false, value);
    patchDraft({
      customMessage: String(resolvedEditorRef.current?.innerHTML || "").replace(
        /\soutline:\s*[^;"']+;?/gi,
        ""
      ),
    });
  };

  const insertImageUrl = () => {
    const rawUrl = window.prompt("URL publique de l'image (https://...)", "https://");
    if (!rawUrl) return;
    const url = String(rawUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error("URL image invalide. Utilise une URL http(s) publique.");
      return;
    }
    execEditorCommand("insertImage", url);
  };

  const modalTitle = isCreate ? "Nouvel événement de notification" : "Modifier l'événement";
  const modalSubtitle = isCreate
    ? "Déclenchez une notification automatique sur un événement métier."
    : "Ajustez le déclencheur, la cible et le contenu diffusé.";

  const renderWebhookSelect = () => {
    const disabled = (draft.channel || "webhook") !== "webhook";
    const selectedIcon =
      WEBHOOK_CHANNEL_ICON_BY_KEY[String(selectedWebhook?.channel || "").toLowerCase()]
      || "mingcute:link-2-fill";

    return (
      <div className={styles.webhookSelectWrap} ref={webhookSelectRef}>
        <button
          type="button"
          className={`${layout.input} ${styles.webhookSelectBtn}`}
          disabled={disabled}
          onClick={() => setWebhookSelectOpen((prev) => !prev)}
        >
          <span className={styles.webhookSelectLabel}>
            <Icon icon={selectedWebhook ? selectedIcon : "mingcute:link-2-fill"} aria-hidden />
            <span className={styles.webhookSelectText}>
              {selectedWebhook ? selectedWebhook.name || selectedWebhook.url : "Sélectionner un webhook"}
            </span>
          </span>
          <Icon icon={webhookSelectOpen ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden />
        </button>
        {webhookSelectOpen && !disabled && (
          <div className={styles.webhookDropdown}>
            {webhooks.length === 0 && (
              <div className={styles.webhookEmpty}>Aucun webhook disponible.</div>
            )}
            {webhooks.map((webhook) => {
              const iconName =
                WEBHOOK_CHANNEL_ICON_BY_KEY[String(webhook?.channel || "").toLowerCase()]
                || "mingcute:link-2-fill";
              const selected = String(draft.webhookId || "") === String(webhook.id || "");
              return (
                <button
                  key={webhook.id}
                  type="button"
                  className={`${styles.webhookOption} ${selected ? styles.webhookOptionSelected : ""}`}
                  onClick={() => {
                    patchDraft({ webhookId: String(webhook.id || "") });
                    setWebhookSelectOpen(false);
                  }}
                >
                  <Icon icon={iconName} aria-hidden />
                  <span className={styles.webhookSelectText}>{webhook.name || webhook.url}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "trigger":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>Déclencheur</h3>
              <p className={layout.sectionDesc}>
                Choisissez la source métier et l'événement qui déclenchera la notification.
              </p>
            </div>

            <div className={formStyles.statusRow}>
              <div>
                <div className={formStyles.statusLabel}>Événement actif</div>
                <p className={formStyles.statusHint}>
                  Les événements inactifs ne déclenchent aucune notification.
                </p>
              </div>
              <Switch
                checked={Boolean(draft.enabled)}
                onChange={(on) => patchDraft({ enabled: on })}
                label={draft.enabled ? "Actif" : "Inactif"}
              />
            </div>

            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-source">Source</label>
                <select
                  id="notif-source"
                  className={layout.input}
                  value={draft.source || "tickets"}
                  onChange={(e) => {
                    const nextSource = e.target.value;
                    const firstElement = getSourceOption(nextSource).elements[0];
                    patchDraft({ source: nextSource, element: firstElement?.key || "" });
                  }}
                >
                  {NOTIFICATION_SOURCE_OPTIONS.map((sourceItem) => (
                    <option key={sourceItem.key} value={sourceItem.key}>
                      {sourceItem.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-element">Élément</label>
                <select
                  id="notif-element"
                  className={layout.input}
                  value={draft.element || getSourceOption(draft.source || "tickets").elements[0]?.key}
                  onChange={(e) => patchDraft({ element: e.target.value })}
                >
                  {getSourceOption(draft.source || "tickets").elements.map((elementItem) => (
                    <option key={elementItem.key} value={elementItem.key}>
                      {elementItem.label}
                    </option>
                  ))}
                </select>
              </div>
              {isSoonElementKey(draft.element) && (
                <div className={layout.field}>
                  <label className={layout.label} htmlFor="notif-days-before">
                    Notifier combien de jours avant ?
                  </label>
                  <input
                    id="notif-days-before"
                    type="number"
                    min="1"
                    className={layout.input}
                    value={Number(draft.daysBefore ?? 30)}
                    onChange={(e) => patchDraft({ daysBefore: Number(e.target.value || 1) })}
                  />
                </div>
              )}
            </div>
          </>
        );

      case "target":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>Cible</h3>
              <p className={layout.sectionDesc}>
                Limitez la notification à une entreprise ou appliquez-la globalement.
              </p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-scope">Périmètre</label>
                <select
                  id="notif-scope"
                  className={layout.input}
                  value={draft.scopeType || "all"}
                  onChange={(e) =>
                    patchDraft({
                      scopeType: e.target.value,
                      enterpriseId: e.target.value === "enterprise" ? draft.enterpriseId : "",
                    })
                  }
                >
                  <option value="all">Toutes les entreprises</option>
                  <option value="enterprise">Entreprise spécifique</option>
                </select>
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-enterprise">Entreprise</label>
                <select
                  id="notif-enterprise"
                  className={layout.input}
                  value={draft.enterpriseId || ""}
                  onChange={(e) => patchDraft({ enterpriseId: e.target.value })}
                  disabled={(draft.scopeType || "all") !== "enterprise"}
                >
                  <option value="">Sélectionner une entreprise</option>
                  {availableClients.map((client) => (
                    <option key={String(client?.id)} value={String(client?.id)}>
                      {client?.name || client?.nom || `Entreprise ${client?.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        );

      case "channel":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>Canal</h3>
              <p className={layout.sectionDesc}>
                Sélectionnez le canal de diffusion et ses destinataires.
              </p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-channel">Canal de notification</label>
                <select
                  id="notif-channel"
                  className={layout.input}
                  value={draft.channel || "webhook"}
                  onChange={(e) =>
                    patchDraft({
                      channel: e.target.value,
                      webhookId: e.target.value === "webhook" ? draft.webhookId : "",
                    })
                  }
                >
                  {NOTIFICATION_CHANNEL_OPTIONS.map((channelItem) => (
                    <option key={channelItem.key} value={channelItem.key} disabled={Boolean(channelItem.comingSoon)}>
                      {channelItem.label}
                      {channelItem.comingSoon ? " (bientôt)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className={layout.field}>
                <label className={layout.label}>
                  {(draft.channel || "webhook") === "mail" ? "Destinataires" : "Webhook"}
                </label>
                {(draft.channel || "webhook") === "mail" ? (
                  <EmailChipField
                    emails={parseEmailTags(draft.emailTo)}
                    inputValue={emailToInput}
                    onInputChange={setEmailToInput}
                    onAdd={(value) => addEmailChip("emailTo", value)}
                    onRemove={(email) => removeEmailChip("emailTo", email)}
                    placeholder="Ajouter un destinataire"
                  />
                ) : (
                  renderWebhookSelect()
                )}
              </div>
            </div>
            {(draft.channel || "webhook") === "mail" && (
              <div className={`${layout.field} ${layout.fieldFull}`} style={{ marginTop: "0.75rem" }}>
                <label className={layout.label}>Copie (CC)</label>
                <EmailChipField
                  emails={parseEmailTags(draft.emailCc)}
                  inputValue={emailCcInput}
                  onInputChange={setEmailCcInput}
                  onAdd={(value) => addEmailChip("emailCc", value)}
                  onRemove={(email) => removeEmailChip("emailCc", email)}
                  placeholder="Ajouter un destinataire en copie"
                />
              </div>
            )}
          </>
        );

      case "content":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>Contenu</h3>
              <p className={layout.sectionDesc}>
                Utilisez un template existant ou rédigez un message personnalisé.
              </p>
            </div>

            <div className={formStyles.statusRow}>
              <div>
                <div className={formStyles.statusLabel}>Utiliser un template</div>
                <p className={formStyles.statusHint}>
                  Réutilise un modèle de commentaire déjà configuré.
                </p>
              </div>
              <Switch
                checked={Boolean(draft.useTemplate)}
                onChange={(on) =>
                  patchDraft({
                    useTemplate: on,
                    templateId: on ? draft.templateId : "",
                  })
                }
                label={draft.useTemplate ? "Activé" : "Désactivé"}
              />
            </div>

            {draft.useTemplate ? (
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="notif-template">Template sélectionné</label>
                <select
                  id="notif-template"
                  className={layout.input}
                  value={draft.templateId || ""}
                  onChange={(e) => patchDraft({ templateId: e.target.value })}
                >
                  <option value="">Sélectionner un template</option>
                  {commentTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name || "Template sans nom"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className={styles.toolbar}>
                  <button type="button" className={styles.toolBtn} onClick={() => execEditorCommand("bold")}>
                    <strong>B</strong>
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={() => execEditorCommand("italic")}>
                    <em>I</em>
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={() => execEditorCommand("underline")}>
                    <u>U</u>
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={() => execEditorCommand("insertUnorderedList")}>
                    • Liste
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={() => {
                    const url = window.prompt("URL du lien", "https://");
                    if (url) execEditorCommand("createLink", url);
                  }}>
                    Lien
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={onOpenVariables}>
                    Variables
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={insertImageUrl}>
                    <Icon icon="mdi:image-outline" aria-hidden />
                    Image URL
                  </button>
                  <input
                    type="color"
                    className={styles.colorInput}
                    onChange={(e) => execEditorCommand("foreColor", e.target.value)}
                    title="Couleur du texte"
                  />
                  <button
                    type="button"
                    className={styles.toolBtn}
                    onClick={() => setShowPreview((prev) => !prev)}
                    disabled={!isTeamsWebhook}
                  >
                    <Icon icon={showPreview ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden />
                    Aperçu Teams
                  </button>
                </div>

                {isTeamsWebhook && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <label className={layout.label}>Couleur du liseret Teams</label>
                    <div className={styles.colorSwatches}>
                      {TEAMS_THEME_COLOR_PRESETS.map((color) => {
                        const selected =
                          String(draft.teamsThemeColor || "").toLowerCase() === String(color).toLowerCase();
                        return (
                          <button
                            key={color}
                            type="button"
                            title={color}
                            className={`${styles.colorSwatch} ${selected ? styles.colorSwatchSelected : ""}`}
                            style={{ background: color }}
                            onClick={() => patchDraft({ teamsThemeColor: color })}
                          />
                        );
                      })}
                      <div className={styles.customColorRow}>
                        <span className={styles.customColorLabel}>Custom</span>
                        <input
                          type="color"
                          className={styles.colorInput}
                          value={String(draft.teamsThemeColor || "#13BA8E")}
                          onChange={(e) => patchDraft({ teamsThemeColor: e.target.value })}
                          title="Couleur personnalisée"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div
                  ref={resolvedEditorRef}
                  className={styles.editor}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) =>
                    patchDraft({
                      customMessage: String(e.currentTarget?.innerHTML || "").replace(
                        /\soutline:\s*[^;"']+;?/gi,
                        ""
                      ),
                    })
                  }
                />

                {showPreview && isTeamsWebhook && (
                  <div className={styles.previewWrap}>
                    <div className={styles.previewLabel}>Aperçu Teams</div>
                    <div
                      className={styles.previewCard}
                      style={{ borderTop: `4px solid ${String(draft.teamsThemeColor || "#13BA8E")}` }}
                    >
                      <div className={styles.previewTitle}>Veritas - Notification</div>
                      <div
                        className={styles.previewBody}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(
                            String(
                              resolvedEditorRef.current?.innerHTML || draft.customMessage || ""
                            ).trim() || "<em>Aucun message personnalisé saisi</em>"
                          ),
                        }}
                      />
                    </div>
                  </div>
                )}

                {!isTeamsWebhook && (
                  <p className={styles.hintText}>
                    L'aperçu Teams est disponible uniquement avec un canal Webhook de type Teams.
                  </p>
                )}
              </>
            )}
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
        style={{ maxWidth: "min(920px, 100%)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-event-form-title"
      >
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:bell-plus-outline" : "mdi:bell-edit-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>Notifications</p>
              <h2 className={layout.title} id="notification-event-form-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label="Fermer">
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label="Sections de la notification">
            {NOTIFICATION_EVENT_FORM_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`}
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
            {getSourceOption(draft.source).label} · {draft.channel === "mail" ? "Email" : "Webhook"}
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
                  Créer l'événement
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
