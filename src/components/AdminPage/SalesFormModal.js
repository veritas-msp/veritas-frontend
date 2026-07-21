import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createSalesForm, createSalesFormField, deleteSalesFormField, updateSalesForm, updateSalesFormField } from "../../api/tickets";
import { fetchUsers } from "../../api/users";
import { fetchTeams } from "../../api/teams";
import API_BASE_URL from "../../config";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import pageLayout from "../EnterprisesPage/EnterprisesPage.module.css";
import IconPicker, { SALES_FORM_ICON_CHOICES } from "./IconPicker";
import modalStyles from "./SalesFormModal.module.css";
import MultiSuggestPicker from "./MultiSuggestPicker";
import SalesFormTargetRulesEditor, { createEmptyTargetRule, normalizeTicketTargetsDraft, serializeTicketTargetsDraft } from "./SalesFormTargetRulesEditor";
import builderStyles from "./SalesFormBuilder.module.css";
import SalesFormFieldPalette, { PALETTE_FIELD_TYPES } from "./SalesFormFieldPalette";
import SalesFormBuilderCanvas from "./SalesFormBuilderCanvas";
import SalesFormFieldPropertiesPanel from "./SalesFormFieldPropertiesPanel";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminDeleteConfirmsCopy } from "./adminModalsI18n";
const VISIBILITY_OPTIONS = [{
  value: "public",
  label: "All agents",
  hint: "Visible to everyone"
}, {
  value: "assigned",
  label: "Restricted",
  hint: "Profiles, agents or teams"
}];
const BUILDER_MODES = [{
  id: "builder",
  label: "Builder",
  icon: "mdi:cursor-move"
}, {
  id: "rules",
  label: "Ticket rules",
  icon: "mdi:gavel"
}, {
  id: "settings",
  label: "Settings",
  icon: "mdi:cog-outline"
}];
const EMPTY_TICKET_TARGETS = {
  version: 2,
  rules: []
};
const EMPTY_FORM = {
  kind: "prestation",
  key: "",
  label: "",
  icon: "mdi:file-document-outline",
  categorySlug: "",
  description: "",
  displayOrder: 0,
  enabled: true,
  visibility: "public",
  profileNames: [],
  userIds: [],
  teamIds: [],
  ticketTargets: {
    ...EMPTY_TICKET_TARGETS
  }
};
const EMPTY_FIELD = {
  fieldKey: "",
  label: "",
  fieldType: "text",
  required: false,
  placeholder: "",
  optionsText: "",
  displayOrder: 0,
  enabled: true,
  visibilityMatchMode: "all",
  visibilityConditions: []
};
function fieldToDraft(field) {
  if (!field) return {
    ...EMPTY_FIELD
  };
  return {
    fieldKey: field.fieldKey || "",
    label: field.label || "",
    fieldType: field.fieldType || "text",
    required: field.required === true,
    placeholder: field.placeholder || "",
    optionsText: Array.isArray(field.options) ? field.options.map(opt => typeof opt === "string" ? opt : opt.label || opt.value).join("\n") : "",
    displayOrder: field.displayOrder || 0,
    enabled: field.enabled !== false,
    visibilityMatchMode: field.visibilityRules?.matchMode === "any" ? "any" : "all",
    visibilityConditions: Array.isArray(field.visibilityRules?.conditions) ? field.visibilityRules.conditions.map(condition => ({
      ...condition
    })) : []
  };
}
function createLocalField(fieldType, displayOrder = 0) {
  const meta = PALETTE_FIELD_TYPES.find(item => item.type === fieldType);
  const suffix = Date.now().toString(36).slice(-4);
  return {
    id: `temp-${Date.now()}`,
    fieldKey: `${fieldType}_${suffix}`,
    label: meta?.label || "New field",
    fieldType,
    required: false,
    placeholder: "",
    options: [],
    displayOrder,
    enabled: true,
    visibilityRules: {
      matchMode: "all",
      conditions: []
    }
  };
}
function slugifyCategory(kind, formKey) {
  const safeKey = String(formKey || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${kind}-${safeKey}`;
}
function getUserLabel(user) {
  return user?.email || user?.username || user?.name || (user?.id ? `#${user.id}` : "");
}
function FieldHint({
  children
}) {
  return <p className={modalStyles.hint}>{children}</p>;
}
function ticketTargetsFromInitial(form) {
  return normalizeTicketTargetsDraft(form?.ticketTargets || {});
}
function formFromInitial(initialForm, kindDefault = "prestation") {
  if (!initialForm) {
    return {
      ...EMPTY_FORM,
      kind: kindDefault || "prestation",
      ticketTargets: {
        ...EMPTY_TICKET_TARGETS
      }
    };
  }
  return {
    kind: initialForm.kind,
    key: initialForm.key,
    label: initialForm.label,
    icon: initialForm.icon || "mdi:file-document-outline",
    categorySlug: initialForm.categorySlug,
    description: initialForm.description || "",
    displayOrder: initialForm.displayOrder || 0,
    enabled: initialForm.enabled !== false,
    visibility: initialForm.visibility === "assigned" ? "assigned" : "public",
    profileNames: Array.isArray(initialForm.profileNames) ? [...initialForm.profileNames] : [],
    userIds: Array.isArray(initialForm.userIds) ? initialForm.userIds.map(String) : [],
    teamIds: Array.isArray(initialForm.teamIds) ? initialForm.teamIds.map(String) : [],
    ticketTargets: ticketTargetsFromInitial(initialForm)
  };
}
export default function SalesFormModal({
  open,
  mode = "create",
  initialForm = null,
  kindDefault = "prestation",
  onClose,
  onSaved
}) {
  const locale = useAppLocale();
  const deleteCopy = useMemo(() => getAdminDeleteConfirmsCopy(locale), [locale]);
  const isCreate = mode === "create";
  const [builderMode, setBuilderMode] = useState("builder");
  const [formId, setFormId] = useState("");
  const [formDraft, setFormDraft] = useState(EMPTY_FORM);
  const [fields, setFields] = useState([]);
  const [fieldDraft, setFieldDraft] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [editingFieldId, setEditingFieldId] = useState("");
  const [savingForm, setSavingForm] = useState(false);
  const [savingField, setSavingField] = useState(false);
  const [activeDragType, setActiveDragType] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const resetFieldSelection = useCallback(() => {
    setSelectedFieldId("");
    setEditingFieldId("");
    setFieldDraft(null);
  }, []);
  useEffect(() => {
    if (!open) return;
    setBuilderMode("builder");
    setFormId(initialForm?.id ? String(initialForm.id) : "");
    setFormDraft(formFromInitial(initialForm, kindDefault));
    setFields(Array.isArray(initialForm?.fields) ? initialForm.fields : []);
    resetFieldSelection();
  }, [open, initialForm, kindDefault, resetFieldSelection]);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [profileRows, userRows, teamRows] = await Promise.all([fetch(`${API_BASE_URL}/profiles`, {
          credentials: "include"
        }).then(r => r.ok ? r.json() : []).catch(() => []), fetchUsers().catch(() => []), fetchTeams().catch(() => [])]);
        if (!cancelled) {
          setProfiles(Array.isArray(profileRows) ? profileRows : []);
          setUsers(Array.isArray(userRows) ? userRows : []);
          setTeams(Array.isArray(teamRows) ? teamRows : []);
        }
      } catch {
        if (!cancelled) {
          setProfiles([]);
          setUsers([]);
          setTeams([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);
  const userOptions = useMemo(() => users.filter(user => user?.id).map(user => ({
    id: String(user.id),
    label: getUserLabel(user),
    hint: user.profile || ""
  })), [users]);
  const profileOptions = useMemo(() => profiles.filter(profile => profile?.name).map(profile => ({
    id: profile.name,
    label: profile.name
  })), [profiles]);
  const teamOptions = useMemo(() => teams.filter(team => team?.id).map(team => ({
    id: String(team.id),
    label: team.name || `Team #${team.id}`
  })), [teams]);
  const sectionMeta = useMemo(() => ({
    builder: fields.length > 0,
    settings: Boolean(String(formDraft.label || "").trim() && String(formDraft.key || "").trim()) && (formDraft.visibility !== "assigned" || formDraft.profileNames.length > 0 || formDraft.userIds.length > 0 || formDraft.teamIds.length > 0),
    rules: (formDraft.ticketTargets?.rules || []).some(rule => rule.enabled !== false && (rule.always || (rule.conditions || []).length > 0 || rule.targets?.priority || rule.targets?.status || (rule.targets?.assigneeUserIds?.length || 0) > 0 || (rule.targets?.watcherUserIds?.length || 0) > 0 || (rule.targets?.teamIds?.length || 0) > 0))
  }), [formDraft, fields.length]);
  const buildFormPayload = () => ({
    kind: formDraft.kind,
    key: String(formDraft.key).trim(),
    label: String(formDraft.label).trim(),
    icon: String(formDraft.icon || "mdi:file-document-outline").trim(),
    categorySlug: String(formDraft.categorySlug || slugifyCategory(formDraft.kind, formDraft.key)).trim(),
    description: String(formDraft.description || "").trim(),
    displayOrder: Number(formDraft.displayOrder || 0),
    enabled: formDraft.enabled !== false,
    visibility: formDraft.visibility === "assigned" ? "assigned" : "public",
    profileNames: formDraft.visibility === "assigned" ? formDraft.profileNames : [],
    userIds: formDraft.visibility === "assigned" ? formDraft.userIds : [],
    teamIds: formDraft.visibility === "assigned" ? formDraft.teamIds : [],
    ticketTargets: serializeTicketTargetsDraft(formDraft.ticketTargets)
  });
  const validateForm = () => {
    if (!String(formDraft.label || "").trim() || !String(formDraft.key || "").trim()) {
      toast.error("Label and technical key are required");
      setBuilderMode("settings");
      return false;
    }
    if (formDraft.visibility === "assigned" && formDraft.profileNames.length === 0 && formDraft.userIds.length === 0 && formDraft.teamIds.length === 0) {
      toast.error("Select at least one profile, agent or team");
      setBuilderMode("settings");
      return false;
    }
    return true;
  };
  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setSavingForm(true);
    try {
      const payload = buildFormPayload();
      let saved;
      if (formId) {
        saved = await updateSalesForm(formId, payload);
        toast.success("Form updated");
      } else {
        saved = await createSalesForm(payload);
        toast.success("Form created");
        if (saved?.id) setFormId(String(saved.id));
      }
      if (saved?.fields) setFields(saved.fields);
      onSaved?.(saved);
    } catch (error) {
      toast.error(error.message || "Error saving form");
    } finally {
      setSavingForm(false);
    }
  };
  const selectField = field => {
    if (!field) {
      resetFieldSelection();
      return;
    }
    setSelectedFieldId(String(field.id));
    setEditingFieldId(String(field.id).startsWith("temp-") ? "" : String(field.id));
    setFieldDraft(fieldToDraft(field));
  };
  const ensureFormSaved = async () => {
    if (formId) return formId;
    if (!validateForm()) return null;
    setSavingForm(true);
    try {
      const payload = buildFormPayload();
      const saved = await createSalesForm(payload);
      if (saved?.id) {
        setFormId(String(saved.id));
        toast.success("Form created · you can add fields");
        onSaved?.(saved);
        return String(saved.id);
      }
    } catch (error) {
      toast.error(error.message || "Error creating form");
    } finally {
      setSavingForm(false);
    }
    return null;
  };
  const addFieldFromType = async fieldType => {
    const currentFormId = formId || (await ensureFormSaved());
    if (!currentFormId) {
      setBuilderMode("settings");
      return;
    }
    const nextOrder = fields.length ? Math.max(...fields.map(f => Number(f.displayOrder || 0))) + 10 : 10;
    const localField = createLocalField(fieldType, nextOrder);
    setFields(prev => [...prev, localField]);
    selectField(localField);
  };
  const handleDragStart = event => {
    const fieldType = event.active?.data?.current?.fieldType;
    if (fieldType) setActiveDragType(fieldType);
  };
  const updateFieldDraft = draft => {
    setFieldDraft(draft);
    if (!selectedFieldId || !draft) return;
    setFields(prev => prev.map(field => String(field.id) === String(selectedFieldId) ? {
      ...field,
      label: draft.label,
      fieldKey: draft.fieldKey,
      fieldType: draft.fieldType,
      placeholder: draft.placeholder,
      required: draft.required,
      enabled: draft.enabled,
      visibilityRules: {
        matchMode: draft.visibilityMatchMode === "any" ? "any" : "all",
        conditions: draft.visibilityConditions || []
      }
    } : field));
  };
  const handleDragEnd = async event => {
    setActiveDragType("");
    const {
      active,
      over
    } = event;
    if (!over) return;
    if (active.data.current?.source === "palette") {
      if (over.id === "form-canvas" || fields.some(field => field.id === over.id)) {
        await addFieldFromType(active.data.current.fieldType);
      }
      return;
    }
    if (active.data.current?.source === "canvas" && active.id !== over.id) {
      const oldIndex = fields.findIndex(field => field.id === active.id);
      const newIndex = fields.findIndex(field => field.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(fields, oldIndex, newIndex).map((field, index) => ({
        ...field,
        displayOrder: (index + 1) * 10
      }));
      setFields(reordered);
      if (formId) {
        await Promise.all(reordered.filter(field => !String(field.id).startsWith("temp-")).map(field => updateSalesFormField(formId, field.id, {
          displayOrder: field.displayOrder
        }))).catch(() => {});
      }
    }
  };
  const handleSaveField = async () => {
    if (!fieldDraft) return;
    const currentFormId = formId || (await ensureFormSaved());
    if (!currentFormId) {
      setBuilderMode("settings");
      return;
    }
    if (!String(fieldDraft.label || "").trim() || !String(fieldDraft.fieldKey || "").trim()) {
      toast.error("Field label and key are required");
      return;
    }
    setSavingField(true);
    try {
      const options = String(fieldDraft.optionsText || "").split("\n").map(line => line.trim()).filter(Boolean).map(line => ({
        label: line,
        value: line
      }));
      const payload = {
        fieldKey: String(fieldDraft.fieldKey).trim(),
        label: String(fieldDraft.label).trim(),
        fieldType: fieldDraft.fieldType || "text",
        required: fieldDraft.required === true,
        placeholder: String(fieldDraft.placeholder || "").trim(),
        options,
        displayOrder: Number(fieldDraft.displayOrder || 0),
        enabled: fieldDraft.enabled !== false,
        visibilityRules: {
          matchMode: fieldDraft.visibilityMatchMode === "any" ? "any" : "all",
          conditions: (fieldDraft.visibilityConditions || []).filter(condition => condition.fieldKey)
        }
      };
      let savedField;
      if (editingFieldId) {
        savedField = await updateSalesFormField(currentFormId, editingFieldId, payload);
        toast.success("Field updated");
      } else {
        savedField = await createSalesFormField(currentFormId, payload);
        toast.success("Field added");
      }
      setFields(prev => {
        const withoutTemp = prev.filter(field => String(field.id) !== String(selectedFieldId));
        if (editingFieldId) {
          return withoutTemp.concat(savedField).sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
        }
        return [...withoutTemp, savedField].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
      });
      selectField(savedField);
      onSaved?.();
    } catch (error) {
      toast.error(error.message || "Error saving field");
    } finally {
      setSavingField(false);
    }
  };
  const handleRemoveField = async field => {
    if (!field) return;
    if (!window.confirm(deleteCopy.salesFormFieldDelete)) return;
    if (String(field.id).startsWith("temp-")) {
      setFields(prev => prev.filter(item => String(item.id) !== String(field.id)));
      resetFieldSelection();
      return;
    }
    if (!formId) return;
    try {
      await deleteSalesFormField(formId, field.id);
      toast.success("Field deleted");
      if (String(selectedFieldId) === String(field.id)) resetFieldSelection();
      setFields(prev => prev.filter(item => String(item.id) !== String(field.id)));
      onSaved?.();
    } catch (error) {
      toast.error(error.message || "Error deleting field");
    }
  };
  if (!open) return null;
  const modalTitle = formId ? `Edit ${formDraft.label || "form"}` : "New form";
  const modalSubtitle = formId ? "Configure the request type, its visibility and fields." : "Create a professional service or installation request type.";
  const renderGeneralSection = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>General information</h3>
        <p className={layout.sectionDesc}>Type, displayed label and associated ticket category.</p>
      </div>
      <div className={modalStyles.formBlocks}>
        <div className={layout.fieldGrid2}>
          <div className={layout.field}>
            <label className={layout.label}>Type</label>
            <select className={layout.input} value={formDraft.kind} onChange={e => setFormDraft(prev => ({
            ...prev,
            kind: e.target.value,
            categorySlug: slugifyCategory(e.target.value, prev.key)
          }))}>
              <option value="prestation">Professional service</option>
              <option value="installation">Installation</option>
            </select>
          </div>
          <div className={layout.field}>
            <label className={layout.label}>Order</label>
            <input type="number" className={layout.input} value={formDraft.displayOrder} onChange={e => setFormDraft(prev => ({
            ...prev,
            displayOrder: Number(e.target.value || 0)
          }))} />
          </div>
          <div className={layout.field}>
            <label className={`${layout.label} ${layout.labelRequired}`}>Label</label>
            <input className={layout.input} value={formDraft.label} onChange={e => setFormDraft(prev => ({
            ...prev,
            label: e.target.value
          }))} autoFocus={isCreate} placeholder="E.g. On-site installation" />
            <FieldHint>Name shown to agents when creating a request.</FieldHint>
          </div>
          <div className={layout.field}>
            <label className={`${layout.label} ${layout.labelRequired}`}>Technical key</label>
            <input className={layout.input} value={formDraft.key} onChange={e => setFormDraft(prev => ({
            ...prev,
            key: e.target.value,
            categorySlug: slugifyCategory(prev.kind, e.target.value)
          }))} placeholder="E.g. site" />
            <FieldHint>
              Short internal identifier, no spaces (e.g. <code>site</code>, <code>audit</code>). Used to identify the
              form in the database · the ticket category is derived automatically.
            </FieldHint>
          </div>
          <div className={`${layout.field} ${layout.fieldFull}`}>
            <label className={layout.label}>Ticket category</label>
            <input className={layout.input} value={formDraft.categorySlug} onChange={e => setFormDraft(prev => ({
            ...prev,
            categorySlug: e.target.value
          }))} placeholder="E.g. installation-site" />
            <FieldHint>
              "Slug" = readable identifier stored on the ticket (e.g. <code>installation-site</code>). Used to
              filter and classify requests in the list. Generated from type + technical key.
            </FieldHint>
          </div>
        </div>

        <div className={modalStyles.sectionDivider} aria-hidden />

        <div className={modalStyles.iconSection}>
          <span className={layout.label}>Icon</span>
          <IconPicker variant="simple" value={formDraft.icon || "mdi:file-document-outline"} onChange={icon => setFormDraft(prev => ({
          ...prev,
          icon
        }))} choices={SALES_FORM_ICON_CHOICES} />
        </div>

        <div className={modalStyles.sectionDivider} aria-hidden />

        <div className={layout.fieldGrid2}>
          <div className={`${layout.field} ${layout.fieldFull}`}>
            <label className={layout.label}>Description</label>
            <textarea className={layout.input} rows={3} value={formDraft.description} onChange={e => setFormDraft(prev => ({
            ...prev,
            description: e.target.value
          }))} />
          </div>
          <div className={layout.field}>
            <label className={layout.label}>
              <input type="checkbox" checked={formDraft.enabled !== false} onChange={e => setFormDraft(prev => ({
              ...prev,
              enabled: e.target.checked
            }))} />{" "}
              Active
            </label>
          </div>
        </div>
      </div>
    </>;
  const renderVisibilitySection = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>Visibility</h3>
        <p className={layout.sectionDesc}>Define who can use this form when creating a request.</p>
      </div>
      <div className={`${layout.field} ${layout.fieldFull}`}>
        <div className={modalStyles.chipRow}>
          {VISIBILITY_OPTIONS.map(opt => <button key={opt.value} type="button" className={`${pageLayout.chip} ${formDraft.visibility === opt.value ? pageLayout.chipActive : ""}`} onClick={() => setFormDraft(prev => ({
          ...prev,
          visibility: opt.value,
          profileNames: opt.value === "assigned" ? prev.profileNames : [],
          userIds: opt.value === "assigned" ? prev.userIds : [],
          teamIds: opt.value === "assigned" ? prev.teamIds : []
        }))}>
              {opt.label}
            </button>)}
        </div>
        <FieldHint>{VISIBILITY_OPTIONS.find(opt => opt.value === formDraft.visibility)?.hint}</FieldHint>
      </div>
      {formDraft.visibility === "assigned" && <div className={`${layout.field} ${layout.fieldFull}`}>
          <label className={layout.label}>Who can use this form?</label>
          <FieldHint>Type to filter, then select from the list · like the ITIL category.</FieldHint>
          <div className={modalStyles.suggestGrid}>
            <MultiSuggestPicker inputId="sales-form-visibility-users" label="Agents" placeholder="Search for an agent…" options={userOptions} selectedIds={formDraft.userIds} emptyHint="No agent" onChange={userIds => setFormDraft(prev => ({
          ...prev,
          userIds
        }))} />
            <MultiSuggestPicker inputId="sales-form-visibility-profiles" label="Profiles" placeholder="Search for a profile…" options={profileOptions} selectedIds={formDraft.profileNames} emptyHint="No profile" onChange={profileNames => setFormDraft(prev => ({
          ...prev,
          profileNames
        }))} />
            <MultiSuggestPicker inputId="sales-form-visibility-teams" label="Teams" placeholder="Search for a team…" options={teamOptions} selectedIds={formDraft.teamIds} emptyHint="No team" onChange={teamIds => setFormDraft(prev => ({
          ...prev,
          teamIds
        }))} />
          </div>
        </div>}
    </>;
  const renderTargetsSection = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>Ticket targets</h3>
        <p className={layout.sectionDesc}>
          Define one or more targets. Each target corresponds to a ticket created when its conditions
          (field values) are met. With no conditions, the ticket is always created.
        </p>
      </div>
      <SalesFormTargetRulesEditor rules={formDraft.ticketTargets?.rules?.length ? formDraft.ticketTargets.rules : [createEmptyTargetRule(0)]} formFields={fields} userOptions={userOptions} teamOptions={teamOptions} onChange={rules => setFormDraft(prev => ({
      ...prev,
      ticketTargets: {
        version: 2,
        rules
      }
    }))} />
    </>;
  const renderSettingsSection = () => <div className={builderStyles.builderContent}>
      {renderGeneralSection()}
      <div className={modalStyles.sectionDivider} aria-hidden />
      {renderVisibilitySection()}
    </div>;
  const renderRulesSection = () => <div className={builderStyles.builderContent}>{renderTargetsSection()}</div>;
  const renderBuilderSection = () => <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={builderStyles.builderMain}>
        <SalesFormFieldPalette onQuickAdd={addFieldFromType} />
        <SalesFormBuilderCanvas formLabel={formDraft.label} formDescription={formDraft.description} fields={fields} selectedFieldId={selectedFieldId} onSelectField={selectField} onRemoveField={handleRemoveField} />
        <SalesFormFieldPropertiesPanel fieldDraft={fieldDraft} formFields={fields} saving={savingField} onChange={updateFieldDraft} onSave={handleSaveField} onDelete={fieldDraft ? () => handleRemoveField(fields.find(f => String(f.id) === String(selectedFieldId))) : null} onClose={resetFieldSelection} />
      </div>
      <DragOverlay>
        {activeDragType ? <div className={builderStyles.paletteItem}>
            <Icon icon={PALETTE_FIELD_TYPES.find(item => item.type === activeDragType)?.icon || "mdi:form-textbox"} className={builderStyles.paletteItemIcon} />
            {PALETTE_FIELD_TYPES.find(item => item.type === activeDragType)?.label || "Field"}
          </div> : null}
      </DragOverlay>
    </DndContext>;
  const renderMainContent = () => {
    if (builderMode === "rules") return renderRulesSection();
    if (builderMode === "settings") return renderSettingsSection();
    return renderBuilderSection();
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={`${layout.shell} ${builderStyles.builderShellWide}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sales-form-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={formDraft.icon || "mdi:file-document-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>Sales forms</p>
              <h2 className={layout.title} id="sales-form-modal-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={savingForm || savingField} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={`${layout.body} ${builderStyles.builderBody}`}>
          <nav className={builderStyles.builderNav} aria-label="Builder modes">
            {BUILDER_MODES.map(mode => <button key={mode.id} type="button" title={mode.label} className={`${builderStyles.builderNavBtn} ${builderMode === mode.id ? builderStyles.builderNavBtnActive : ""}`} onClick={() => setBuilderMode(mode.id)} aria-current={builderMode === mode.id ? "page" : undefined}>
                <Icon icon={mode.icon} aria-hidden />
              </button>)}
          </nav>
          {renderMainContent()}
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {formDraft.kind === "installation" ? "Installation" : "Professional service"} · {fields.length} field(s) ·{" "}
            {formDraft.enabled !== false ? "Active" : "Inactive"}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={savingForm || savingField}>
              Close
            </button>
            <button type="button" className={layout.primaryBtn} onClick={handleSaveForm} disabled={savingForm || savingField}>
              {savingForm ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  Saving…
                </> : formId ? <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  Save
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  Create form
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
