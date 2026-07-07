import { useDraggable } from "@dnd-kit/core";
import { Icon } from "@iconify/react";
import builderStyles from "./SalesFormBuilder.module.css";

export const PALETTE_FIELD_TYPES = [
  { type: "text", label: "Texte court", icon: "mdi:form-textbox" },
  { type: "textarea", label: "Texte long", icon: "mdi:text-long" },
  { type: "select", label: "Liste déroulante", icon: "mdi:form-dropdown" },
  { type: "checkbox", label: "Oui / Non", icon: "mdi:toggle-switch-outline" },
  { type: "number", label: "Nombre", icon: "mdi:numeric" },
  { type: "date", label: "Date", icon: "mdi:calendar-outline" },
  { type: "user", label: "Utilisateur", icon: "mdi:account-outline" },
];

function PaletteItem({ type, label, icon, onQuickAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: "palette", fieldType: type },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={builderStyles.paletteItem}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      onClick={() => onQuickAdd?.(type)}
      {...listeners}
      {...attributes}
    >
      <Icon icon={icon} className={builderStyles.paletteItemIcon} aria-hidden />
      {label}
    </button>
  );
}

export default function SalesFormFieldPalette({ onQuickAdd }) {
  return (
    <aside className={builderStyles.palette}>
      <div className={builderStyles.paletteHead}>
        <p className={builderStyles.paletteTitle}>Champs</p>
        <p className={builderStyles.canvasDesc} style={{ marginTop: "0.35rem" }}>
          Glissez ou cliquez pour ajouter
        </p>
      </div>
      <div className={builderStyles.paletteList}>
        {PALETTE_FIELD_TYPES.map((item) => (
          <PaletteItem key={item.type} {...item} onQuickAdd={onQuickAdd} />
        ))}
      </div>
    </aside>
  );
}

export function paletteTypeFromDragId(id) {
  if (!String(id || "").startsWith("palette-")) return null;
  return String(id).replace("palette-", "");
}
