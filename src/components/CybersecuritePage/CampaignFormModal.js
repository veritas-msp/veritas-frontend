import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import localStyles from "./CampaignFormModal.module.css";

function getClientLabel(client) {
  if (!client) return "";
  return client.name || client.nom || `Client #${client.id}`;
}

export default function CampaignFormModal({
  open,
  onClose,
  clients = [],
  formData,
  onFormDataChange,
  editingCampaign = null,
  onSubmit,
  saving = false,
  copy,
  getCampaignTypeLabel,
}) {
  const commonCopy = useCommonCopy();
  const isEditing = Boolean(editingCampaign?.id);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const enterpriseAutocompleteRef = useRef(null);

  const clientList = useMemo(() => (Array.isArray(clients) ? clients : []), [clients]);

  const selectedClient = useMemo(() => {
    if (!formData?.client_id) return null;
    return (
      clientList.find((c) => String(c.id) === String(formData.client_id)) || null
    );
  }, [clientList, formData?.client_id]);

  const filteredClients = useMemo(() => {
    const query = enterpriseSearch.trim().toLowerCase();
    if (!query) return clientList.slice(0, 12);
    return clientList
      .filter((c) => getClientLabel(c).toLowerCase().includes(query))
      .slice(0, 12);
  }, [clientList, enterpriseSearch]);

  useEffect(() => {
    if (!open) return;
    if (selectedClient) {
      setEnterpriseSearch(getClientLabel(selectedClient));
    } else {
      setEnterpriseSearch("");
    }
    setEnterpriseDropdownOpen(false);
  }, [open, selectedClient]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        enterpriseAutocompleteRef.current &&
        !enterpriseAutocompleteRef.current.contains(e.target)
      ) {
        setEnterpriseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const patchForm = (patch) => {
    onFormDataChange?.((prev) => ({ ...prev, ...patch }));
  };

  const formValid = Boolean(
    formData?.client_id && String(formData?.name || "").trim() && formData?.type
  );

  if (!open) return null;

  const modalTitle = isEditing ? copy.modal.editTitle : copy.modal.createTitle;
  const modalSubtitle = isEditing ? copy.modal.editSubtitle : copy.modal.createSubtitle;
  const typeLabel = getCampaignTypeLabel
    ? getCampaignTypeLabel(formData?.type || "microsoft_security")
    : formData?.type;

  return createPortal(
    <div className={styles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={`${styles.shell} ${styles.shellMedium}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-form-modal-title"
      >
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:shield-lock-outline" />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{copy.modal.eyebrow}</p>
              <h2 className={styles.title} id="campaign-form-modal-title">
                {modalTitle}
              </h2>
              <p className={styles.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={copy.modal.close}
          >
            <FaTimes />
          </button>
        </header>

        <form
          className={localStyles.form}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.(e);
          }}
        >
          <div className={localStyles.formScroll}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{copy.modal.sectionTitle}</h3>
              <p className={styles.sectionDesc}>{copy.modal.sectionDesc}</p>
            </div>

            <div className={styles.fieldStack}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label
                  className={`${styles.label} ${styles.labelRequired}`}
                  htmlFor="campaign-form-enterprise"
                >
                  {copy.modal.enterprise.replace(" *", "")}
                </label>
                <div className={styles.autocomplete} ref={enterpriseAutocompleteRef}>
                  <input
                    id="campaign-form-enterprise"
                    type="text"
                    className={styles.input}
                    placeholder={copy.modal.enterpriseSearch}
                    value={enterpriseSearch}
                    onChange={(e) => {
                      setEnterpriseSearch(e.target.value);
                      patchForm({ client_id: "" });
                      setEnterpriseDropdownOpen(true);
                    }}
                    onFocus={() => setEnterpriseDropdownOpen(true)}
                    autoComplete="off"
                    required
                  />
                  {enterpriseDropdownOpen ? (
                    <div className={styles.dropdown}>
                      {filteredClients.length === 0 ? (
                        <div className={styles.dropdownEmpty}>{copy.modal.noEnterprise}</div>
                      ) : (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            className={`${styles.dropdownOption} ${
                              String(formData.client_id) === String(client.id)
                                ? styles.dropdownOptionSelected
                                : ""
                            }`}
                            onClick={() => {
                              patchForm({ client_id: client.id });
                              setEnterpriseSearch(getClientLabel(client));
                              setEnterpriseDropdownOpen(false);
                            }}
                          >
                            {getClientLabel(client)}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={styles.fieldGrid2}>
                <div className={styles.field}>
                  <label
                    className={`${styles.label} ${styles.labelRequired}`}
                    htmlFor="campaign-form-name"
                  >
                    {copy.modal.name.replace(" *", "")}
                  </label>
                  <input
                    id="campaign-form-name"
                    type="text"
                    className={styles.input}
                    value={formData.name || ""}
                    onChange={(e) => patchForm({ name: e.target.value })}
                    placeholder={copy.modal.namePlaceholder}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label
                    className={`${styles.label} ${styles.labelRequired}`}
                    htmlFor="campaign-form-type"
                  >
                    {copy.modal.type.replace(" *", "")}
                  </label>
                  <select
                    id="campaign-form-type"
                    className={styles.input}
                    value={formData.type || "microsoft_security"}
                    onChange={(e) => patchForm({ type: e.target.value })}
                    required
                    disabled
                  >
                    <option value="microsoft_security">{typeLabel}</option>
                  </select>
                </div>
              </div>

              <div className={styles.fieldGrid2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="campaign-form-start">
                    {copy.modal.startDate}
                  </label>
                  <input
                    id="campaign-form-start"
                    type="date"
                    className={styles.input}
                    value={formData.start_date || ""}
                    onChange={(e) => patchForm({ start_date: e.target.value })}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="campaign-form-end">
                    {copy.modal.endDate}
                  </label>
                  <input
                    id="campaign-form-end"
                    type="date"
                    className={styles.input}
                    value={formData.end_date || ""}
                    min={formData.start_date || undefined}
                    onChange={(e) => patchForm({ end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="campaign-form-description">
                  {copy.modal.specificity}
                </label>
                <textarea
                  id="campaign-form-description"
                  className={styles.input}
                  rows={4}
                  value={formData.description || ""}
                  onChange={(e) => patchForm({ description: e.target.value })}
                  placeholder={copy.modal.specificityPlaceholder}
                />
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            <span className={styles.footerHint} />
            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={onClose}
                disabled={saving}
              >
                {commonCopy.cancel}
              </button>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={saving || !formValid}
              >
                {saving ? (
                  <>
                    <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                    {commonCopy.saving}
                  </>
                ) : isEditing ? (
                  <>
                    <Icon icon="mdi:content-save-outline" aria-hidden />
                    {copy.modal.saveEdit}
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:check" aria-hidden />
                    {copy.modal.saveCreate}
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
}
