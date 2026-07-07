import React, { useState, useEffect } from "react";
import { FaBuilding, FaTimes, FaClipboardList, FaShieldAlt, FaHeadset, FaWrench, FaServer } from "react-icons/fa";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import styles from "./StepGeneral.module.css";
import ActivitySectorSelect from "../../../Misc/ActivitySectorSelect";
import SiretInput from "../../../Misc/SiretInput";
import { LEGAL_IDENTIFIER_LABEL } from "../../../../utils/siret";
import { fetchUsers } from "../../../../api/users";

const StepGeneral = ({ form, setForm, isEditing }) => {
  const [newSiteName, setNewSiteName] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const usersData = await fetchUsers();
        setUsers(usersData);
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  const addSite = () => {
    if (newSiteName.trim() && !(form.sites || []).includes(newSiteName.trim())) {
      setForm(prev => ({
        ...prev,
        sites: [...(prev.sites || []), newSiteName.trim()]
      }));
      setNewSiteName("");
    }
  };

  const removeSite = (siteToRemove) => {
    setForm(prev => ({
      ...prev,
      sites: (prev.sites || []).filter(site => site !== siteToRemove)
    }));
  };

  const handleSiteKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSite();
    }
  };

  const updateContrat = (field, value) => {
    setForm(prev => ({
      ...prev,
      contrat: {
        ...prev.contrat,
        [field]: value
      }
    }));
  };

  const handleModuleChange = (moduleName, checked) => {
    setForm(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleName]: checked
      }
    }));
  };

  const modulesConfig = [
    { key: 'Support', label: 'Support', icon: FaHeadset, isIconify: false },
    { key: 'Curatif', label: 'Curatif', icon: FaWrench, isIconify: false },
    { key: 'Preventif', label: 'Préventif', icon: FaClipboardList, isIconify: false },
    { key: 'Monitoring', label: 'Monitoring', icon: FaShieldAlt, isIconify: false },
    { key: 'Hebergement', label: 'Hébergement', icon: FaServer, isIconify: false },
    { key: 'MagicInfo', label: 'MagicInfo', icon: 'mdi:television', isIconify: true },
    { key: 'Videosurveillance', label: 'Vidéosurveillance', icon: 'mdi:cctv', isIconify: true },
  ];
  const accent = '#15d1a0';

  return (
    <div className={styles.container}>
      {/* Informations principales */}
      <div className={`${styles.formSection} ${styles.gridTwo}`}>
        <div className={styles.formField}>
          <label htmlFor="clientName">Nom de l'entreprise *</label>
          <input
            id="clientName"
            type="text"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Entreprise ABC"
            required
          />
        </div>
      </div>

      {/* Coordonnées entreprise */}
      <div className={`${styles.formSection} ${styles.gridThree}`}>
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
          <label htmlFor="address">Adresse</label>
          <input
            id="address"
            type="text"
            value={form.address || ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, address: e.target.value }))
            }
            placeholder="Ex: 10 rue du Château, 33000 Bordeaux"
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

      {/* Gestion des Lieux physiques */}
      <div className={styles.section}>
        <h3 className={styles.sectionHeading}>Lieux physiques</h3>
        
        <div className={styles.sitesContainer}>
          <div className={styles.addSiteInput}>
            <input
              type="text"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              onKeyPress={handleSiteKeyPress}
              placeholder="Nom du site (ex: Bordeaux, Libourne)"
              className={styles.siteInput}
            />
            <button
              type="button"
              onClick={addSite}
              disabled={!newSiteName.trim() || (form.sites || []).includes(newSiteName.trim())}
              className={styles.addSiteButton}
              title="Ajouter un site"
            >
              <Icon icon="mdi:plus" style={{ fontSize: '16px' }} />
            </button>
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

      {/* Ligne 3 : Contrat (dates + commercial) */}
      <div className={styles.section}>
        <h3 className={styles.sectionHeading}>Contrat</h3>
        <div className={`${styles.formSection} ${styles.gridThree}`}>
          <div className={styles.formField}>
            <label htmlFor="contractStart">Date de début *</label>
            <input
              id="contractStart"
              type="date"
              value={form.contrat?.debut || ''}
              onChange={(e) => updateContrat('debut', e.target.value)}
              required
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="contractEnd">Date d'expiration *</label>
            <input
              id="contractEnd"
              type="date"
              value={form.contrat?.expiration || ''}
              onChange={(e) => updateContrat('expiration', e.target.value)}
              required
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="commercial">Commercial</label>
            <select
              id="commercial"
              value={form.commercial || ''}
              onChange={(e) => setForm(prev => ({ ...prev, commercial: e.target.value }))}
              disabled={loadingUsers}
            >
              <option value="">Sélectionner un commercial</option>
              {users
                .filter(user => user.is_active !== false)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username || user.email}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ligne 5 : Options du contrat */}
      <div className={styles.section}>
        <h3 className={styles.sectionHeading}>Options du contrat</h3>
        <div className={styles.modulesGrid}>
          {modulesConfig.map(({ key, label, icon, isIconify }) => {
            const active = !!form.modules?.[key];
            return (
              <div
                key={key}
                className={`${styles.moduleItem} ${active ? styles.moduleItemActive : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onClick={() => handleModuleChange(key, !active)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleModuleChange(key, !active);
                  }
                }}
              >
                <div className={styles.moduleHeader}>
                  {isIconify ? (
                    <Icon icon={icon} className={styles.moduleIcon} />
                  ) : (
                    React.createElement(icon, { className: styles.moduleIcon })
                  )}
                  <div className={styles.moduleTitleBlock}>
                    <span className={styles.moduleName}>{label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepGeneral; 
