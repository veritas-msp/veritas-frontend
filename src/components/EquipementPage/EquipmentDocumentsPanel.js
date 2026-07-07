import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  deleteEquipmentDocument,
  fetchEquipmentDocuments,
  getEquipmentDocumentDownloadUrl,
  getEquipmentDocumentPreviewUrl,
  uploadEquipmentDocument,
} from "../../api/equipmentDocuments";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { ConfirmModal } from "../AdminPage/AdminUi";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getLocaleTag } from "../../i18n/locales";
import { getEquipmentDetailCopy, interpolate } from "./equipmentDetailPageI18n";
import { getEquipmentModalsCopy } from "./equipmentModalsI18n";
import styles from "./EquipmentDocumentsPanel.module.css";

const CATEGORY_VALUES = [
  "Facture / garantie",
  "Photo",
  "Configuration",
  "Manuel",
  "Procédure",
  "Autre",
];

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function formatSize(bytes) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(value, locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(getLocaleTag(locale));
}

function getCategoryLabel(category, copy) {
  return copy.documents.categoryLabels?.[category] || category || copy.documents.categoryLabels?.Autre || "Autre";
}

function getFileIcon(mimeType) {
  if (IMAGE_MIMES.has(mimeType)) return "mdi:file-image-outline";
  if (mimeType === "application/pdf") return "mdi:file-pdf-box";
  if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) return "mdi:file-excel-box";
  if (mimeType?.includes("word")) return "mdi:file-word-box";
  return "mdi:file-document-outline";
}

function matchesDocumentSearch(doc, query, copy, locale) {
  if (!query) return true;
  const haystack = [
    doc.file_name,
    getCategoryLabel(doc.category, copy),
    doc.description,
    formatSize(doc.size_bytes),
    formatDate(doc.created_at, locale),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default function EquipmentDocumentsPanel({ equipment, embedded = false }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const docCopy = copy.documents;
  const modalsCopy = useMemo(() => getEquipmentModalsCopy(locale), [locale]);
  const equipmentId = getEquipmentDbId(equipment);
  const clientId = equipment?.clientId;
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Autre");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((doc) => matchesDocumentSearch(doc, query, copy, locale));
  }, [documents, searchQuery, copy, locale]);

  const loadDocuments = useCallback(async () => {
    if (!equipmentId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchEquipmentDocuments({ equipmentId, clientId });
      setDocuments(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setDocuments([]);
      toast.error(docCopy.toasts.loadError);
    } finally {
      setLoading(false);
    }
  }, [equipmentId, clientId, docCopy.toasts.loadError]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !equipmentId || !clientId) return;

    setUploading(true);
    try {
      const created = await uploadEquipmentDocument({
        clientId,
        equipmentId,
        equipmentType: equipment?.type,
        equipmentName: equipment?.name,
        category,
        description: description.trim(),
        file,
      });
      setDocuments((prev) => [created, ...prev]);
      setDescription("");
      toast.success(docCopy.toasts.added);
    } catch (err) {
      toast.error(err.message || docCopy.toasts.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc) => {
    setDeleteTarget(doc);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEquipmentDocument(deleteTarget.id);
      setDocuments((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success(docCopy.toasts.deleted);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || docCopy.toasts.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  if (!equipmentId) {
    return (
      <div className={embedded ? styles.embeddedRoot : styles.panel}>
        <p className={styles.hint}>
          {docCopy.saveFirst}
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? styles.embeddedRoot : styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.uploadFields}>
          <div className={styles.field}>
            <label htmlFor="equipment-doc-category">{docCopy.category}</label>
            <select
              id="equipment-doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_VALUES.map((item) => (
                <option key={item} value={item}>
                  {getCategoryLabel(item, copy)}
                </option>
              ))}
            </select>
          </div>
          <div className={`${styles.field} ${styles.fieldGrow}`}>
            <label htmlFor="equipment-doc-description">{docCopy.descriptionOptional}</label>
            <input
              id="equipment-doc-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={docCopy.descriptionPlaceholder}
            />
          </div>
        </div>
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Icon icon="mdi:upload" aria-hidden />
          {uploading ? docCopy.uploading : docCopy.addDocument}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className={styles.hiddenInput}
          onChange={handleUpload}
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
        />
      </div>

      {loading ? (
        <p className={styles.hint}>{docCopy.loading}</p>
      ) : documents.length === 0 ? (
        <div className={styles.empty}>
          <Icon icon="mdi:file-document-outline" className={styles.emptyIcon} aria-hidden />
          <p>{docCopy.empty}</p>
        </div>
      ) : (
        <>
          <div className={styles.searchBar}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input
              type="search"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={docCopy.searchPlaceholder}
              aria-label={docCopy.searchAria}
            />
            {searchQuery ? (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchQuery("")}
                title={docCopy.clearSearch}
                aria-label={docCopy.clearSearch}
              >
                <Icon icon="mdi:close" aria-hidden />
              </button>
            ) : null}
            <span className={styles.searchCount}>
              {filteredDocuments.length} / {documents.length}
            </span>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className={styles.empty}>
              <Icon icon="mdi:file-search-outline" className={styles.emptyIcon} aria-hidden />
              <p>{interpolate(docCopy.noMatch, { query: searchQuery.trim() })}</p>
            </div>
          ) : (
        <ul className={styles.list}>
          {filteredDocuments.map((doc) => (
            <li key={doc.id} className={styles.row}>
              <div className={styles.rowMain}>
                <Icon icon={getFileIcon(doc.mime_type)} className={styles.fileIcon} aria-hidden />
                <div className={styles.rowText}>
                  <strong className={styles.fileName}>{doc.file_name}</strong>
                  <span className={styles.meta}>
                    {getCategoryLabel(doc.category, copy)} · {formatSize(doc.size_bytes)} · {formatDate(doc.created_at, locale)}
                  </span>
                  {doc.description ? <span className={styles.description}>{doc.description}</span> : null}
                </div>
              </div>
              <div className={styles.rowActions}>
                {IMAGE_MIMES.has(doc.mime_type) || doc.mime_type === "application/pdf" ? (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setPreviewDoc(doc)}
                    title={docCopy.preview}
                  >
                    <Icon icon="mdi:eye-outline" aria-hidden />
                  </button>
                ) : null}
                <a
                  className={styles.actionBtn}
                  href={getEquipmentDocumentDownloadUrl(doc.id)}
                  title={docCopy.download}
                >
                  <Icon icon="mdi:download" aria-hidden />
                </a>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={() => handleDelete(doc)}
                  title={docCopy.delete}
                >
                  <Icon icon="mdi:delete-outline" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
          )}
        </>
      )}

      {previewDoc ? (
        <div className={styles.previewOverlay} onClick={() => setPreviewDoc(null)} role="presentation">
          <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <header className={styles.previewHeader}>
              <strong>{previewDoc.file_name}</strong>
              <button type="button" className={styles.previewClose} onClick={() => setPreviewDoc(null)}>
                <Icon icon="mdi:close" aria-hidden />
              </button>
            </header>
            <div className={styles.previewBody}>
              {IMAGE_MIMES.has(previewDoc.mime_type) ? (
                <img
                  src={getEquipmentDocumentPreviewUrl(previewDoc.id)}
                  alt={previewDoc.file_name}
                  className={styles.previewImage}
                />
              ) : (
                <iframe
                  title={previewDoc.file_name}
                  src={getEquipmentDocumentPreviewUrl(previewDoc.id)}
                  className={styles.previewFrame}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={modalsCopy.confirm?.deleteDocument?.title}
        message={
          deleteTarget
            ? interpolate(modalsCopy.confirm?.deleteDocument?.message, {
                name: deleteTarget.file_name,
              })
            : ""
        }
        icon="mdi:delete-alert-outline"
        confirmLabel={modalsCopy.form?.delete}
        confirmVariant="dangerSolid"
        confirmLoading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
