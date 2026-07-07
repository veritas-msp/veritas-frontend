import { Icon } from "@iconify/react";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import modalStyles from "./SalesFormModal.module.css";

const OPERATOR_OPTIONS = [
  { value: "equals", label: "Égal à" },
  { value: "not_equals", label: "Différent de" },
  { value: "contains", label: "Contient" },
  { value: "checked", label: "Coché (oui)" },
  { value: "not_checked", label: "Non coché" },
];

function getOperatorsForField(field) {
  if (!field) return OPERATOR_OPTIONS;
  if (field.fieldType === "checkbox") {
    return OPERATOR_OPTIONS.filter((opt) => opt.value === "checked" || opt.value === "not_checked");
  }
  if (field.fieldType === "select") {
    return OPERATOR_OPTIONS.filter((opt) => opt.value === "equals" || opt.value === "not_equals");
  }
  return OPERATOR_OPTIONS.filter((opt) => opt.value !== "checked" && opt.value !== "not_checked");
}

function ConditionValueInput({ condition, field, onChange }) {
  if (!field) {
    return (
      <input
        className={layout.input}
        value={condition.value || ""}
        placeholder="Valeur"
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
      />
    );
  }

  if (field.fieldType === "checkbox") {
    return <span className={modalStyles.conditionHint}>Aucune valeur requise</span>;
  }

  if (field.fieldType === "select" && Array.isArray(field.options) && field.options.length > 0) {
    return (
      <select
        className={layout.input}
        value={condition.value || ""}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
      >
        <option value="">- Choisir -</option>
        {field.options.map((option) => {
          const value = typeof option === "object" ? option.value || option.label : option;
          const label = typeof option === "object" ? option.label || option.value : option;
          return (
            <option key={String(value)} value={String(value)}>
              {label}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <input
      className={layout.input}
      value={condition.value || ""}
      placeholder="Valeur attendue"
      onChange={(e) => onChange({ ...condition, value: e.target.value })}
    />
  );
}

export default function FormConditionsEditor({
  title = "Conditions",
  hint = "Sans condition, toujours applicable.",
  matchMode = "all",
  conditions = [],
  formFields = [],
  excludeFieldKey = "",
  onChange,
}) {
  const fieldOptions = formFields
    .filter((field) => field?.fieldKey && field.fieldKey !== excludeFieldKey)
    .map((field) => ({ id: field.fieldKey, label: field.label || field.fieldKey, field }));

  const updateConditions = (nextConditions) => {
    onChange?.({ matchMode, conditions: nextConditions });
  };

  const addCondition = () => {
    const firstField = fieldOptions[0]?.field;
    updateConditions([
      ...conditions,
      {
        fieldKey: firstField?.fieldKey || "",
        operator: firstField?.fieldType === "checkbox" ? "checked" : "equals",
        value: "",
      },
    ]);
  };

  return (
    <div className={modalStyles.targetRuleSection}>
      <div className={modalStyles.targetRuleSectionHead}>
        <strong>{title}</strong>
        <p className={modalStyles.hint}>{hint}</p>
      </div>

      {fieldOptions.length === 0 ? (
        <p className={modalStyles.emptyRuleHint}>Aucun autre champ disponible pour construire des conditions.</p>
      ) : (
        <>
          <div className={layout.field}>
            <label className={layout.label}>Logique entre conditions</label>
            <select
              className={layout.input}
              value={matchMode}
              onChange={(e) => onChange?.({ matchMode: e.target.value, conditions })}
            >
              <option value="all">Toutes (ET)</option>
              <option value="any">Au moins une (OU)</option>
            </select>
          </div>

          {conditions.map((condition, conditionIndex) => {
            const field = fieldOptions.find((option) => option.id === condition.fieldKey)?.field;
            const operators = getOperatorsForField(field);
            return (
              <div key={`condition-${conditionIndex}`} className={modalStyles.conditionRow}>
                <select
                  className={layout.input}
                  value={condition.fieldKey || ""}
                  onChange={(e) => {
                    const nextField = fieldOptions.find((option) => option.id === e.target.value)?.field;
                    const nextConditions = [...conditions];
                    nextConditions[conditionIndex] = {
                      fieldKey: e.target.value,
                      operator: nextField?.fieldType === "checkbox" ? "checked" : "equals",
                      value: "",
                    };
                    updateConditions(nextConditions);
                  }}
                >
                  <option value="">- Champ -</option>
                  {fieldOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className={layout.input}
                  value={condition.operator || "equals"}
                  onChange={(e) => {
                    const nextConditions = [...conditions];
                    nextConditions[conditionIndex] = { ...condition, operator: e.target.value };
                    updateConditions(nextConditions);
                  }}
                >
                  {operators.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ConditionValueInput
                  condition={condition}
                  field={field}
                  onChange={(next) => {
                    const nextConditions = [...conditions];
                    nextConditions[conditionIndex] = next;
                    updateConditions(nextConditions);
                  }}
                />
                <button
                  type="button"
                  className={modalStyles.iconBtnDanger}
                  onClick={() => updateConditions(conditions.filter((_, idx) => idx !== conditionIndex))}
                  title="Retirer la condition"
                >
                  <Icon icon="mdi:close" />
                </button>
              </div>
            );
          })}

          <button type="button" className={modalStyles.linkBtn} onClick={addCondition}>
            <Icon icon="mdi:plus" /> Ajouter une condition
          </button>
        </>
      )}
    </div>
  );
}
