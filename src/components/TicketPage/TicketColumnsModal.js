import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import {
  clearPrivateTicketTableColumns,
  savePrivateTicketTableColumns,
  savePublicTicketTableColumns
} from "../../api/tickets";
import {
  DEFAULT_TICKET_TABLE_COLUMNS,
  getConfigurableTicketColumns,
  toggleColumnInList
} from "../../utils/ticketTableColumns";
import styles from "./TicketColumnsModal.module.css";

const COLUMN_LABEL_KEYS = {
  ticket_number: "id",
  title: "subject",
  channel: "channel",
  type: "type",
  requester: "requester",
  client: "client",
  assigned: "assigned",
  followers: "followers",
  status: "status",
  priority: "priority",
  sla: "sla",
  created_at: "created",
  updated_at: "updated"
};

export default function TicketColumnsModal({
  open,
  onClose,
  onSaved,
  isAdmin = false,
  isCommunity = false,
  initialPublic = null,
  initialPrivate = null,
  copy
}) {
  const commonCopy = useCommonCopy();
  const columnsCopy = copy?.columnsModal || {};
  const tableCopy = copy?.table || {};
  const titleId = "ticket-columns-modal-title";
  const availableColumns = useMemo(
    () => getConfigurableTicketColumns({ isCommunity }),
    [isCommunity]
  );

  const [tab, setTab] = useState("private");
  const [publicColumns, setPublicColumns] = useState(() => [...DEFAULT_TICKET_TABLE_COLUMNS]);
  const [privateColumns, setPrivateColumns] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const savingRef = useRef(false);
  savingRef.current = saving;

  useEffect(() => {
    if (!open) return;
    setTab("private");
    setPublicColumns(
      Array.isArray(initialPublic) && initialPublic.length > 0
        ? [...initialPublic]
        : [...DEFAULT_TICKET_TABLE_COLUMNS]
    );
    setPrivateColumns(
      Array.isArray(initialPrivate) && initialPrivate.length > 0
        ? [...initialPrivate]
        : null
    );
    setError("");
    setSaving(false);
  }, [open, initialPublic, initialPrivate]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = event => {
      if (event.key === "Escape" && !savingRef.current) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const editingPublic = tab === "public";
  const draftColumns = editingPublic
    ? publicColumns
    : privateColumns == null
      ? [...publicColumns]
      : privateColumns;
  const hasPrivateView = Array.isArray(privateColumns) && privateColumns.length > 0;
  const canEditCurrent = editingPublic ? isAdmin : true;

  const getColumnLabel = columnId => {
    const key = COLUMN_LABEL_KEYS[columnId];
    return (key && tableCopy[key]) || columnId;
  };

  const handleToggle = (columnId, enabled) => {
    if (!canEditCurrent || saving) return;
    if (editingPublic) {
      setPublicColumns(prev => {
        const next = toggleColumnInList(prev, columnId, enabled);
        return next.length > 0 ? next : prev;
      });
      return;
    }
    setPrivateColumns(prev => {
      const base = prev == null ? [...publicColumns] : prev;
      const next = toggleColumnInList(base, columnId, enabled);
      return next.length > 0 ? next : base;
    });
  };

  const handleResetPrivate = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await clearPrivateTicketTableColumns();
      setPrivateColumns(null);
      onSaved?.(result);
      toast.success(columnsCopy.resetSuccess || "Private view reset");
      onClose?.();
    } catch (err) {
      setError(err?.message || columnsCopy.saveError || "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!canEditCurrent || saving) return;
    if (!draftColumns.length) {
      setError(columnsCopy.atLeastOne || "Select at least one column.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = editingPublic
        ? await savePublicTicketTableColumns(draftColumns)
        : await savePrivateTicketTableColumns(draftColumns);
      if (editingPublic) {
        setPublicColumns(result.public || draftColumns);
      } else {
        setPrivateColumns(result.private || draftColumns);
      }
      onSaved?.(result);
      toast.success(
        editingPublic
          ? columnsCopy.savePublicSuccess || "Public view saved"
          : columnsCopy.savePrivateSuccess || "Private view saved"
      );
      onClose?.();
    } catch (err) {
      setError(err?.message || columnsCopy.saveError || "Error");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={styles.shell}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.accentBar} aria-hidden />
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon="mdi:table-column" className={styles.headerIcon} />
            </div>
            <div>
              <h2 id={titleId} className={styles.title}>
                {columnsCopy.title || "Table columns"}
              </h2>
              <p className={styles.message}>
                {columnsCopy.subtitle || "Choose which columns are visible in the ticket list."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={commonCopy.close}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "private"}
            className={`${styles.tab} ${tab === "private" ? styles.tabActive : ""}`.trim()}
            onClick={() => setTab("private")}
            disabled={saving}
          >
            <Icon icon="mdi:account-outline" aria-hidden />
            {columnsCopy.privateTab || "Private view"}
          </button>
          {isAdmin ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "public"}
              className={`${styles.tab} ${tab === "public" ? styles.tabActive : ""}`.trim()}
              onClick={() => setTab("public")}
              disabled={saving}
            >
              <Icon icon="mdi:earth" aria-hidden />
              {columnsCopy.publicTab || "Public view"}
            </button>
          ) : null}
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>
            {editingPublic
              ? columnsCopy.publicHint || "Default columns for all users without a private view."
              : hasPrivateView
                ? columnsCopy.privateHintActive || "Your private columns override the public view."
                : columnsCopy.privateHintInactive ||
                  "No private view yet — the public view is used. Toggle columns to create yours."}
          </p>
          {!canEditCurrent ? (
            <p className={styles.adminOnly}>
              {columnsCopy.adminOnly || "Only administrators can edit the public view."}
            </p>
          ) : null}
          <div className={styles.columnList}>
            {availableColumns.map(columnId => {
              const checked = draftColumns.includes(columnId);
              return (
                <label key={columnId} className={styles.columnRow}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canEditCurrent || saving}
                    onChange={event => handleToggle(columnId, event.target.checked)}
                  />
                  <span className={styles.columnLabel}>{getColumnLabel(columnId)}</span>
                </label>
              );
            })}
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {!editingPublic && hasPrivateView ? (
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleResetPrivate}
                disabled={saving}
              >
                <Icon icon="mdi:restore" aria-hidden />
                {columnsCopy.resetPrivate || "Use public view"}
              </button>
            ) : null}
          </div>
          <div className={styles.footerRight}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={saving}
            >
              {commonCopy.cancel}
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saving || !canEditCurrent}
            >
              <Icon
                icon={saving ? "mdi:loading" : "mdi:content-save-outline"}
                className={saving ? styles.spinner : undefined}
              />
              {saving ? commonCopy.processing : commonCopy.save || columnsCopy.save || "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}