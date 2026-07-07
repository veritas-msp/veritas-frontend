import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import styles from "./StepGeneral.module.css";
import { fetchActiveUsers } from "../../../../api/users";
import { useContractModuleOptions } from "../../../../hooks/useContractModuleOptions";

const StepContractOptions = ({ form, setForm }) => {
  const { enabledModules } = useContractModuleOptions();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
   const [commercialSearch, setCommercialSearch] = useState("");
   const [selectedCommercialUser, setSelectedCommercialUser] = useState(null);
   const [commercialDropdownOpen, setCommercialDropdownOpen] = useState(false);
   const commercialAutocompleteRef = useRef(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const usersData = await fetchActiveUsers();
        setUsers(usersData);
        // Pré-sélectionner le référent si déjà présent dans le formulaire
        if (form.commercial) {
          const existing = usersData.find((u) => u.id === form.commercial);
          if (existing) {
            setSelectedCommercialUser(existing);
            setCommercialSearch(existing.username || existing.email || "");
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        commercialAutocompleteRef.current &&
        !commercialAutocompleteRef.current.contains(e.target)
      ) {
        setCommercialDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateContrat = (field, value) => {
    setForm((prev) => ({
      ...prev,
      contrat: {
        ...prev.contrat,
        [field]: value,
      },
    }));
  };

  const handleModuleChange = (moduleName, checked) => {
    setForm((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleName]: checked,
      },
    }));
  };

  const modulesConfig = enabledModules.map((mod) => ({
    key: mod.moduleKey,
    label: mod.label,
    icon: mod.icon || "mdi:puzzle-outline",
  }));

  return (
    <div className={styles.container}>
      {/* Illustration + texte explicatif contrat */}
      <div className={styles.introBlock}>
        <div className={styles.introIconWrapper}>
          <Icon icon="ph:file-text-fill" className={styles.introIcon} />
        </div>
        <div className={styles.introTextWrapper}>
          <p className={styles.introText}>
            Le contrat définit le cadre de la relation avec l&apos;entreprise&nbsp;:
            type d&apos;accord, période de validité et options souscrites (support,
            supervision, hébergement, etc.). Complétez ces informations pour garantir
            un suivi clair et homogène dans Veritas.
          </p>
        </div>
      </div>
      <div className={styles.introDivider} />

      {/* Type de contrat */}
      <div className={styles.section}>
        <h3 className={styles.sectionHeading}>Type de contrat</h3>
        <div className={styles.contractTypeGrid}>
          {[
            {
              key: "EDUCATION",
              label: "Éducation / scolaire",
              emoji: "🎓",
            },
            {
              key: "PROFESSIONNEL",
              label: "Professionnel",
              emoji: "🏢",
            },
            {
              key: "HEBERGEMENT",
              label: "Hébergement",
              emoji: "☁️",
            },
          ].map((type) => {
            const active = form.contrat?.type === type.key;
            return (
              <button
                key={type.key}
                type="button"
                className={`${styles.contractTypeCard} ${
                  active ? styles.contractTypeCardActive : ""
                }`}
                onClick={() => updateContrat("type", type.key)}
              >
                <span className={styles.contractTypeIcon}>{type.emoji}</span>
                <span className={styles.contractTypeLabel}>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contrat : dates + référent commercial */}
      <div className={styles.section}>
        <h3 className={styles.sectionHeading}>Contrat</h3>
        <div className={`${styles.formSection} ${styles.gridThree}`}>
          <div className={styles.formField}>
            <label htmlFor="contractStart">Date de début *</label>
            <input
              id="contractStart"
              type="date"
              value={form.contrat?.debut || ""}
              onChange={(e) => updateContrat("debut", e.target.value)}
              required
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="contractEnd">Date d'expiration *</label>
            <input
              id="contractEnd"
              type="date"
              value={form.contrat?.expiration || ""}
              onChange={(e) => updateContrat("expiration", e.target.value)}
              required
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="commercial">Référent commercial</label>
            <div
              className={styles.userAutocomplete}
              ref={commercialAutocompleteRef}
            >
              <input
                id="commercial"
                type="text"
                className={styles.userInput}
                placeholder="Rechercher un référent commercial..."
                value={
                  commercialSearch ||
                  selectedCommercialUser?.username ||
                  selectedCommercialUser?.email ||
                  ""
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setCommercialSearch(value);
                  setSelectedCommercialUser(null);
                  setForm((prev) => ({ ...prev, commercial: "" }));
                  setCommercialDropdownOpen(true);
                }}
                onFocus={() => setCommercialDropdownOpen(true)}
                disabled={loadingUsers}
              />
              {commercialDropdownOpen && Array.isArray(users) && (
                <div className={styles.userDropdown}>
                  {users.length === 0 ? (
                    <div className={styles.userDropdownEmpty}>
                      Aucun utilisateur trouvé
                    </div>
                  ) : (
                    users
                      .filter((user) =>
                        commercialSearch.trim()
                          ? (user.username || user.email || "")
                              .toLowerCase()
                              .includes(
                                commercialSearch.trim().toLowerCase()
                              )
                          : true
                      )
                      .slice(0, 15)
                      .map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className={`${styles.userOption} ${
                            selectedCommercialUser?.id === user.id
                              ? styles.userOptionSelected
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedCommercialUser(user);
                            setCommercialSearch(
                              user.username || user.email || ""
                            );
                            setForm((prev) => ({
                              ...prev,
                              commercial: user.id,
                            }));
                            setCommercialDropdownOpen(false);
                          }}
                        >
                          {user.username || user.email}
                          {user.email
                            ? ` (${user.email})`
                            : ""}
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Options du contrat */}
      <div className={styles.section}>
        <h3 className={styles.sectionHeading}>Options du contrat</h3>
        <p className={styles.sectionDescription}>
          Les options du contrat représentent les services activés pour cette entreprise&nbsp;:
          support, interventions curatives ou préventives, supervision, hébergement, affichage
          dynamique, vidéosurveillance, etc. Sélectionnez uniquement les briques réellement
          souscrites afin de refléter fidèlement le périmètre contractuel dans Veritas.
        </p>
        <div className={styles.modulesGrid}>
          {modulesConfig.map(({ key, label, icon }) => {
            const active = !!form.modules?.[key];
            return (
              <div
                key={key}
                className={`${styles.moduleItem} ${
                  active ? styles.moduleItemActive : ""
                }`}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onClick={() => handleModuleChange(key, !active)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleModuleChange(key, !active);
                  }
                }}
              >
                <div className={styles.moduleHeader}>
                  <Icon icon={icon} className={styles.moduleIcon} />
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

export default StepContractOptions;

