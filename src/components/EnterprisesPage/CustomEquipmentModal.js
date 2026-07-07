import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  addClientCustomEquipment,
  deleteClientCustomEquipment,
  updateClientCustomEquipment,
} from "../../api/clients";
import { normalizeClientSites } from "../../utils/clientSites";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import styles from "./EnterpriseFormModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";

const SECTIONS = [
  {
    id: "identity",
    label: "Identité",
    description: "Nom du matériel",
    icon: "mdi:tag-outline",
  },
  {
    id: "details",
    label: "Caractéristiques",
    description: "Informations spécifiques",
    icon: "mdi:tune-variant",
  },
];

const LOCATION_FIELD_KEYS = new Set(["location", "lieu", "site", "emplacement"]);

function buildEmptyForm(fields = []) {
  const form = { name: "" };
  fields.forEach((field) => {
    form[field.fieldKey] = field.fieldType === "boolean" ? false : "";
  });
  return form;
}

function buildFormFromItem(item, fields = []) {
  const form = buildEmptyForm(fields);
  form.name = item?.name || "";
  fields.forEach((field) => {
    const value = item?.fields?.[field.fieldKey] ?? item?.data?.[field.fieldKey];
    if (field.fieldType === "boolean") {
      form[field.fieldKey] = Boolean(value);
    } else if (value != null) {
      form[field.fieldKey] = field.fieldType === "date" ? String(value).slice(0, 10) : String(value);
    }
  });
  return form;
}

function cloneFormSnapshot(form) {
  return JSON.parse(JSON.stringify(form));
}

function formsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isLocationField(field) {
  return LOCATION_FIELD_KEYS.has(String(field?.fieldKey || "").toLowerCase());
}

export default function CustomEquipmentModal({
  isOpen,
  onClose,
  family,
  item = null,
  client = null,
  clientId,
  onRefresh,
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const [activeSection, setActiveSection] = useState("identity");
  const [form, setForm] = useState(() => buildEmptyForm(family?.fields || []));
  const [initialSnapshot, setInitialSnapshot] = useState(() => buildEmptyForm(family?.fields || []));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fields = useMemo(() => family?.fields || [], [family?.fields]);
  const isAddMode = !item?.id;
  const siteOptions = useMemo(
    () => normalizeClientSites(client?.sites || []).map((site) => site.name).filter(Boolean),
    [client?.sites]
  );

  useEffect(() => {
    if (!isOpen || !family) return;
    const nextForm = item ? buildFormFromItem(item, fields) : buildEmptyForm(fields);
    setForm(nextForm);
    setInitialSnapshot(cloneFormSnapshot(nextForm));
    setActiveSection("identity");
  }, [isOpen, family, item, fields]);

  const patchForm = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const hasChanges = useMemo(() => !formsEqual(form, initialSnapshot), [form, initialSnapshot]);

  const { requestClose, discardConfirmOpen, cancelDiscard, confirmDiscard } = useModalCloseGuard({
    open: isOpen,
    onClose,
    hasUnsavedChanges: hasChanges,
    blocked: saving || deleting,
  });

  const sectionMeta = useMemo(() => {
    const identityDone = Boolean(String(form.name || "").trim());
    const detailsDone = fields.every((field) => {
      if (!field.required) return true;
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") return true;
      return value != null && String(value).trim() !== "";
    });
    return {
      identity: identityDone,
      details: detailsDone,
    };
  }, [form, fields]);

  const handleSubmit = async () => {
    if (!clientId || !family?.familyKey) return;

    const name = String(form.name || "").trim();
    if (!name) {
      toast.warning("Le nom est obligatoire");
      setActiveSection("identity");
      return;
    }

    for (const field of fields) {
      if (!field.required) continue;
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") continue;
      if (value == null || String(value).trim() === "") {
        toast.warning(`Le champ « ${field.label} » est obligatoire`);
        setActiveSection("details");
        return;
      }
    }

    const payloadFields = {};
    fields.forEach((field) => {
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") {
        payloadFields[field.fieldKey] = Boolean(value);
      } else if (value != null && String(value).trim() !== "") {
        payloadFields[field.fieldKey] = field.fieldType === "number" ? Number(value) : value;
      } else {
        payloadFields[field.fieldKey] = null;
      }
    });

    setSaving(true);
    try {
      const payload = { name, fields: payloadFields };
      if (isAddMode) {
        await addClientCustomEquipment(clientId, family.familyKey, payload);
        toast.success("Équipement ajouté");
      } else {
        await updateClientCustomEquipment(clientId, family.familyKey, item.id, payload);
        toast.success("Équipement mis à jour");
      }
      await onRefresh?.();
      onClose();
    } catch (error) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clientId || !item?.id || !family?.familyKey) return;
    const confirmMessage = interpolate(configCopy.confirm.deleteCustomEquipment.message, {
      name: item.name || form.name || configCopy.confirm.deleteCustomEquipment.fallbackName,
    });
    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    try {
      await deleteClientCustomEquipment(clientId, family.familyKey, item.id);
      toast.success("Équipement supprimé");
      await onRefresh?.();
      onClose();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const renderFieldInput = (field) => {
    const value = form[field.fieldKey];
    const id = `custom-equipment-${field.fieldKey}`;
    const labelClass = field.required ? `${styles.label} ${styles.labelRequired}` : styles.label;

    if (isLocationField(field) && siteOptions.length > 0) {
      return (
        <div className={styles.field}>
          <label className={labelClass} htmlFor={id}>{field.label}</label>
          <select
            id={id}
            className={styles.input}
            value={value || ""}
            onChange={(e) => patchForm({ [field.fieldKey]: e.target.value })}
          >
            <option value="">- Sélectionner un lieu -</option>
            {siteOptions.map((siteName) => (
              <option key={siteName} value={siteName}>{siteName}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.fieldType === "textarea") {
      return (
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={labelClass} htmlFor={id}>{field.label}</label>
          <textarea
            id={id}
            className={styles.input}
            rows={4}
            value={value || ""}
            onChange={(e) => patchForm({ [field.fieldKey]: e.target.value })}
          />
        </div>
      );
    }

    if (field.fieldType === "boolean") {
      return (
        <div className={styles.field}>
          <span className={styles.label}>{field.label}</span>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.8125rem",
              color: "var(--msp-muted, #5c6b82)",
              cursor: "pointer",
            }}
          >
            <input
              id={id}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => patchForm({ [field.fieldKey]: e.target.checked })}
            />
            Oui
          </label>
        </div>
      );
    }

    return (
      <div className={styles.field}>
        <label className={labelClass} htmlFor={id}>{field.label}</label>
        <input
          id={id}
          type={field.fieldType === "date" ? "date" : field.fieldType === "number" ? "number" : "text"}
          className={styles.input}
          value={value ?? ""}
          onChange={(e) => patchForm({ [field.fieldKey]: e.target.value })}
        />
      </div>
    );
  };

  if (!isOpen || !family) return null;

  const familyLabel = family.label || "Matériel";
  const equipmentName = item?.name || form.name || "";
  const modalTitle = isAddMode
    ? `Ajouter un ${familyLabel.toLowerCase()}`
    : `Modifier ${equipmentName || "l'équipement"}`;
  const modalSubtitle = isAddMode
    ? "Renseignez les informations du nouvel équipement."
    : `${familyLabel} · Mettez à jour les champs par section.`;
  const submitDisabled = saving || deleting || (!isAddMode && !hasChanges);

  return createPortal(
    <>
    <div className={styles.overlay} onClick={requestClose} role="presentation">
      <div
        className={styles.shell}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-equipment-modal-title"
      >
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon
                icon={
                  isAddMode
                    ? family.icon || "mdi:plus-circle-outline"
                    : "mdi:pencil-outline"
                }
              />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>Fiche équipement</p>
              <h2 className={styles.title} id="custom-equipment-modal-title">
                {modalTitle}
              </h2>
              <p className={styles.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={requestClose}
            disabled={saving || deleting}
            aria-label="Fermer"
          >
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav} aria-label="Sections du formulaire">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`${styles.navItem} ${
                  activeSection === section.id ? styles.navItemActive : ""
                }`}
                onClick={() => setActiveSection(section.id)}
                aria-current={activeSection === section.id ? "step" : undefined}
              >
                <Icon icon={section.icon} className={styles.navItemIcon} aria-hidden />
                <span className={styles.navItemText}>
                  <span className={styles.navItemLabel}>{section.label}</span>
                  <span className={styles.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] ? <span className={styles.navBadge}>✓</span> : null}
              </button>
            ))}
          </nav>

          <div className={styles.content}>
            {activeSection === "identity" ? (
              <>
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionTitle}>Identité</h3>
                  <p className={styles.sectionDesc}>
                    Nom affiché dans la cartographie et la liste des périphériques.
                  </p>
                </div>
                <div className={styles.fieldGrid2}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="custom-equipment-name">
                      Nom / libellé
                    </label>
                    <input
                      id="custom-equipment-name"
                      type="text"
                      className={styles.input}
                      value={form.name}
                      onChange={(e) => patchForm({ name: e.target.value })}
                      placeholder="Salle réunion A"
                      required
                    />
                  </div>
                </div>
              </>
            ) : null}

            {activeSection === "details" ? (
              <>
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionTitle}>Caractéristiques</h3>
                  <p className={styles.sectionDesc}>
                    Champs spécifiques à la famille {familyLabel.toLowerCase()}.
                  </p>
                </div>
                {fields.length === 0 ? (
                  <p className={styles.hint}>Aucun champ configuré pour cette famille.</p>
                ) : (
                  <div className={styles.fieldGrid2}>
                    {fields.map((field) => renderFieldInput(field))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        <footer className={styles.footer}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            {!isAddMode ? (
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={handleDelete}
                disabled={saving || deleting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "#dc2626",
                  borderColor: "rgba(220, 38, 38, 0.25)",
                  flexShrink: 0,
                }}
              >
                <Icon icon="mdi:delete-outline" aria-hidden />
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            ) : null}
            <span className={styles.footerHint}>
              {isAddMode
                ? "Les champs marqués * sont obligatoires"
                : hasChanges
                  ? "Modifications non enregistrées"
                  : "Aucune modification"}
            </span>
          </div>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={requestClose}
              disabled={saving || deleting}
            >
              Annuler
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleSubmit}
              disabled={submitDisabled}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  Enregistrement…
                </>
              ) : isAddMode ? (
                <>
                  <Icon icon="mdi:check" aria-hidden />
                  Créer l&apos;équipement
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
    </div>
    <ModalDiscardConfirm
      open={discardConfirmOpen}
      onConfirm={confirmDiscard}
      onClose={cancelDiscard}
    />
    </>,
    document.getElementById("modal-root") || document.body
  );
}
