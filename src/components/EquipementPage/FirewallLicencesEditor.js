import React from "react";
import { Icon } from "@iconify/react";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";

const EMPTY_LICENCE = { nom: "", type: "", expiration: "" };

export default function FirewallLicencesEditor({ licences = [], onChange, idPrefix = "firewall-licence" }) {
  const list = Array.isArray(licences) ? licences : [];

  const updateLicence = (index, field, value) => {
    const next = list.map((lic, i) => (i === index ? { ...lic, [field]: value } : lic));
    onChange(next);
  };

  const removeLicence = (index) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const addLicence = () => {
    onChange([...list, { ...EMPTY_LICENCE }]);
  };

  return (
    <div className={styles.licenceList}>
      {list.length === 0 ? (
        <p className={styles.hint}>Aucune licence. Ajoutez une licence maintenance, UTM, IPS…</p>
      ) : (
        list.map((licence, index) => (
          <div key={`${idPrefix}-${index}`} className={styles.licenceRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${idPrefix}-nom-${index}`}>
                Nom
              </label>
              <input
                id={`${idPrefix}-nom-${index}`}
                type="text"
                className={styles.input}
                value={licence.nom ?? ""}
                onChange={(e) => updateLicence(index, "nom", e.target.value)}
                placeholder="Maintenance, UTM, IPS…"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${idPrefix}-type-${index}`}>
                Type
              </label>
              <input
                id={`${idPrefix}-type-${index}`}
                type="text"
                className={styles.input}
                value={licence.type ?? ""}
                onChange={(e) => updateLicence(index, "type", e.target.value)}
                placeholder="Bundle annuel, Support 24/7…"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${idPrefix}-exp-${index}`}>
                Expiration
              </label>
              <input
                id={`${idPrefix}-exp-${index}`}
                type="date"
                className={styles.input}
                value={licence.expiration ?? ""}
                onChange={(e) => updateLicence(index, "expiration", e.target.value)}
              />
            </div>
            <button
              type="button"
              className={styles.licenceRemoveBtn}
              onClick={() => removeLicence(index)}
              aria-label={`Supprimer la licence ${licence.nom || index + 1}`}
              title="Supprimer"
            >
              <Icon icon="mdi:delete-outline" aria-hidden />
            </button>
          </div>
        ))
      )}
      <button type="button" className={styles.licenceAddBtn} onClick={addLicence}>
        <Icon icon="mdi:plus" aria-hidden />
        Ajouter une licence
      </button>
    </div>
  );
}
