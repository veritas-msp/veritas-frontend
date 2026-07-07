import { useState } from "react";
import { Icon } from "@iconify/react";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import builderStyles from "./SalesFormBuilder.module.css";
import FormConditionsEditor from "./FormConditionsEditor";

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Texte court" },
  { value: "textarea", label: "Texte long" },
  { value: "select", label: "Liste déroulante" },
  { value: "checkbox", label: "Oui / Non" },
  { value: "user", label: "Utilisateur" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date" },
];

export default function SalesFormFieldPropertiesPanel({
  fieldDraft,
  formFields = [],
  saving = false,
  onChange,
  onSave,
  onDelete,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState("properties");

  if (!fieldDraft) {
    return (
      <aside className={builderStyles.propsPanel}>
        <div className={builderStyles.propsHead}>
          <h4 className={builderStyles.propsTitle}>Propriétés</h4>
        </div>
        <div className={builderStyles.propsBody}>
          <p style={{ margin: 0, color: "var(--msp-muted)", fontSize: "0.85rem" }}>
            Sélectionnez un champ dans le formulaire pour afficher ses paramètres et règles de visibilité.
          </p>
        </div>
      </aside>
    );
  }

  const patch = (next) => onChange?.({ ...fieldDraft, ...next });

  return (
    <aside className={builderStyles.propsPanel}>
      <div className={builderStyles.propsHead}>
        <h4 className={builderStyles.propsTitle}>{fieldDraft.label || "Champ"}</h4>
        {onClose && (
          <button type="button" className={builderStyles.builderNavBtn} onClick={onClose} style={{ marginTop: "0.35rem" }}>
            <Icon icon="mdi:close" />
          </button>
        )}
      </div>

      <div className={builderStyles.propsTabs}>
        <button
          type="button"
          className={`${builderStyles.propsTab} ${activeTab === "properties" ? builderStyles.propsTabActive : ""}`}
          onClick={() => setActiveTab("properties")}
        >
          Propriétés
        </button>
        <button
          type="button"
          className={`${builderStyles.propsTab} ${activeTab === "rules" ? builderStyles.propsTabActive : ""}`}
          onClick={() => setActiveTab("rules")}
        >
          Règles
        </button>
      </div>

      <div className={builderStyles.propsBody}>
        {activeTab === "properties" ? (
          <>
            <div className={layout.field}>
              <label className={layout.label}>Libellé</label>
              <input
                className={layout.input}
                value={fieldDraft.label || ""}
                onChange={(e) => patch({ label: e.target.value })}
              />
            </div>
            <div className={layout.field}>
              <label className={layout.label}>Clé technique</label>
              <input
                className={layout.input}
                value={fieldDraft.fieldKey || ""}
                onChange={(e) => patch({ fieldKey: e.target.value })}
              />
            </div>
            <div className={layout.field}>
              <label className={layout.label}>Type</label>
              <select
                className={layout.input}
                value={fieldDraft.fieldType || "text"}
                onChange={(e) => patch({ fieldType: e.target.value })}
              >
                {FIELD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={layout.field}>
              <label className={layout.label}>Placeholder</label>
              <input
                className={layout.input}
                value={fieldDraft.placeholder || ""}
                onChange={(e) => patch({ placeholder: e.target.value })}
              />
            </div>
            {fieldDraft.fieldType === "select" && (
              <div className={layout.field}>
                <label className={layout.label}>Options (une par ligne)</label>
                <textarea
                  className={layout.input}
                  rows={4}
                  value={fieldDraft.optionsText || ""}
                  onChange={(e) => patch({ optionsText: e.target.value })}
                />
              </div>
            )}
            <label className={layout.label}>
              <input
                type="checkbox"
                checked={fieldDraft.required === true}
                onChange={(e) => patch({ required: e.target.checked })}
              />{" "}
              Obligatoire
            </label>
            <label className={layout.label}>
              <input
                type="checkbox"
                checked={fieldDraft.enabled !== false}
                onChange={(e) => patch({ enabled: e.target.checked })}
              />{" "}
              Actif
            </label>
          </>
        ) : (
          <FormConditionsEditor
            title="Si… alors afficher ce champ"
            hint="Définissez quand ce champ doit apparaître selon les valeurs d'autres champs."
            matchMode={fieldDraft.visibilityMatchMode || "all"}
            conditions={fieldDraft.visibilityConditions || []}
            formFields={formFields}
            excludeFieldKey={fieldDraft.fieldKey}
            onChange={({ matchMode, conditions }) =>
              patch({
                visibilityMatchMode: matchMode,
                visibilityConditions: conditions,
              })
            }
          />
        )}
      </div>

      <div className={builderStyles.propsFooter}>
        <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {onDelete && (
          <button type="button" className={layout.ghostBtn} onClick={onDelete}>
            Supprimer
          </button>
        )}
      </div>
    </aside>
  );
}
