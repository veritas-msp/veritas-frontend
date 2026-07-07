import React, { useState } from "react";
import { FaBuilding, FaTimes } from "react-icons/fa";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import styles from "./StepGeneral.module.css";
import ActivitySectorSelect from "../../../Misc/ActivitySectorSelect";
import SiretInput from "../../../Misc/SiretInput";
import { LEGAL_IDENTIFIER_LABEL } from "../../../../utils/siret";

const StepGeneralInfo = ({ form, setForm }) => {
  const [newSiteName, setNewSiteName] = useState("");

  const addSite = () => {
    if (newSiteName.trim() && !(form.sites || []).includes(newSiteName.trim())) {
      setForm((prev) => ({
        ...prev,
        sites: [...(prev.sites || []), newSiteName.trim()],
      }));
      setNewSiteName("");
    }
  };

  const removeSite = (siteToRemove) => {
    setForm((prev) => ({
      ...prev,
      sites: (prev.sites || []).filter((site) => site !== siteToRemove),
    }));
  };

  const handleSiteKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSite();
    }
  };

  return (
    <div className={styles.container}>
      {/* Illustration + texte explicatif */}
      <div className={styles.introBlock}>
        <div className={styles.introIconWrapper}>
          <Icon icon="boxicons:enterprise-filled" className={styles.introIcon} />
        </div>
        <div className={styles.introTextWrapper}>
          <p className={styles.introText}>
            L&apos;entreprise est le cœur de la solution Veritas&nbsp;: c&apos;est à partir d&apos;elle que
            sont rattachés tous les éléments (contrats, équipements, modules, campagnes, etc.).
            Renseignez ici ses informations générales (coordonnées, identifiants, lieux physiques),
            puis définissez son contrat et les options associées à l&apos;étape suivante.
          </p>
        </div>
      </div>
      <div className={styles.introDivider} />

      <div className={`${styles.section} ${styles.sectionSpaced}`}>
        <h3 className={styles.sectionHeading}>Informations générales</h3>

        {/* Informations principales */}
        <div className={`${styles.formSection} ${styles.gridTwo}`}>
          <div className={styles.formField}>
            <label htmlFor="clientNumber">Numéro client</label>
            <input
              id="clientNumber"
              type="text"
              value={form.clientNumber || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, clientNumber: e.target.value.trim() }))
              }
              placeholder="Ex. 31"
              inputMode="numeric"
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="clientName">Nom de l'entreprise *</label>
            <input
              id="clientName"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Entreprise ABC"
              required
            />
          </div>
        </div>

      {/* Coordonnées entreprise */}
      <div className={`${styles.formSection} ${styles.gridTwo}`}>
          <div className={styles.formField}>
            <label htmlFor="siret">{LEGAL_IDENTIFIER_LABEL}</label>
            <SiretInput
              id="siret"
              value={form.siret || ""}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, siret: value }))
              }
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="sector">Secteur d'activité</label>
            <ActivitySectorSelect
              id="sector"
              value={form.secteur || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, secteur: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* Adresse - code postal + ville sur la même ligne */}
      <div className={styles.formSection}>
        <div className={styles.gridThree}>
          <div className={styles.formField}>
            <label htmlFor="addressStreet">Adresse (voie)</label>
            <input
              id="addressStreet"
              type="text"
              value={form.addressStreet || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, addressStreet: e.target.value }))
              }
              placeholder="10 rue du Château"
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="postalCode">Code postal</label>
            <input
              id="postalCode"
              type="text"
              value={form.addressPostalCode || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  addressPostalCode: e.target.value,
                }))
              }
              placeholder="33000"
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="city">Ville</label>
            <input
              id="city"
              type="text"
              value={form.addressCity || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, addressCity: e.target.value }))
              }
              placeholder="Bordeaux"
            />
          </div>
        </div>
      </div>

      {/* Lieux physiques */}
      <div className={`${styles.section} ${styles.sectionSpaced}`}>
        <h3 className={styles.sectionHeading}>Lieux physiques</h3>
        <p className={styles.sectionDescription}>
          Les lieux physiques représentent les sites de l&apos;entreprise (bureaux, agences, entrepôts, écoles, etc.).
          C&apos;est à ces lieux que vous pourrez rattacher les équipements matériels et les connexions internet
          pour structurer clairement l&apos;infrastructure dans Veritas.
        </p>
        <div className={styles.sitesContainer}>
          <div className={styles.formField}>
            <label htmlFor="siteName">Nom du site</label>
            <div className={styles.addSiteInput}>
              <input
                id="siteName"
                type="text"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                onKeyPress={handleSiteKeyPress}
                placeholder="Bordeaux, Libourne…"
                className={styles.siteInput}
              />
              <button
                type="button"
                onClick={addSite}
                disabled={
                  !newSiteName.trim() ||
                  (form.sites || []).includes(newSiteName.trim())
                }
                className={styles.addSiteButton}
                title="Ajouter un site"
              >
                <Icon icon="mdi:plus" style={{ fontSize: "16px" }} />
              </button>
            </div>
          </div>

          {(form.sites || []).length > 0 && (
            <div className={styles.sitesList}>
              {(form.sites || []).map((site, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={styles.siteItem}
                >
                  <FaBuilding className={styles.siteIcon} />
                  <span className={styles.siteName}>{site}</span>
                  <button
                    type="button"
                    onClick={() => removeSite(site)}
                    className={styles.removeSiteButton}
                    title="Supprimer ce site"
                  >
                    <FaTimes />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepGeneralInfo;

