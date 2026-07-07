import { motion } from "framer-motion";
import styles from "./Form.module.css";
import { getIconPath } from "../../../../utils/assetHelper";

// Icônes par module
const icons = {
  Serveurs: getIconPath('serveurs.png'),
  Sauvegarde: getIconPath('sauvegarde.png'),
  Stockage: getIconPath('stockage.png'),
  Firewall: getIconPath('firewall.png'),
  Antispam: getIconPath('antispam.png'),
  Antivirus: getIconPath('antivirus.png'),
  Office365: getIconPath('office365.png'),
  NDD: getIconPath('ndd.png'),
};

// Libellés lisibles
const labels = {
  Serveurs: "Serveurs",
  Sauvegarde: "Sauvegarde",
  Stockage: "Stockage",
  Firewall: "Pare-feu",
  Antispam: "Antispam",
  Antivirus: "Antivirus",
  Office365: "Office 365",
  NDD: "Noms de domaine",
};

/**
 * Étape 1: Configuration générale du client et des modules.
 */
const StepGeneral = ({ form, setForm }) => {
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleModule = (key) => {
    setForm((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [key]: !prev.modules[key],
      },
    }));
  };

  const moduleOrder = [
    "Serveurs", "Stockage", "Firewall", "Sauvegarde",
    "Antivirus", "Antispam", "NDD", "Office365"
  ];

  return (
    <motion.div
      className={styles.stepContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "circOut" }}
    >
      {/* Section: Informations Client */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>👤 Informations Client</h3>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="clientName">Nom du client</label>
            <input
              id="clientName"
              value={form.clientName}
              onChange={(e) => handleChange("clientName", e.target.value)}
              placeholder="Ex: ACME Corp"
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="reportFrequency">Fréquence de rapport</label>
            <select
              id="reportFrequency"
              value={form.reportFrequency}
              onChange={(e) => handleChange("reportFrequency", e.target.value)}
            >
              <option value="Mensuelle">Mensuelle</option>
              <option value="Bimensuelle">Bimensuelle</option>
              <option value="Trimestrielle">Trimestrielle</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section: Contrat de maintenance */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>📄 Contrat de maintenance</h3>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="contratDebut">Date de début</label>
            <input
              id="contratDebut"
              type="date"
              value={form.contrat?.debut || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, contrat: { ...prev.contrat, debut: e.target.value } }))}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="contratExpiration">Date d’expiration</label>
            <input
              id="contratExpiration"
              type="date"
              value={form.contrat?.expiration || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, contrat: { ...prev.contrat, expiration: e.target.value } }))}
            />
          </div>
        </div>
      </div>

      {/* Section: Modules activés */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>📦 Modules activés</h3>
        <ModuleGrid
          modules={form.modules}
          moduleOrder={moduleOrder}
          onToggle={toggleModule}
        />
      </div>
    </motion.div>
  );
};

// Composant séparé pour la grille des modules pour plus de clarté
const ModuleGrid = ({ modules, moduleOrder, onToggle }) => (
  <div className={styles.moduleGrid}>
    {moduleOrder.map((key) => (
      <button
        key={key}
        type="button"
        className={`${styles.moduleToggleButton} ${modules[key] ? styles.active : ""}`}
        onClick={() => onToggle(key)}
      >
        <img src={icons[key]} alt="" />
        <span>{labels[key]}</span>
      </button>
    ))}
  </div>
);

export default StepGeneral;
