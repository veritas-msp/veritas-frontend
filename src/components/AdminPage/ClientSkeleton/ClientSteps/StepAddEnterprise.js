import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import styles from "./StepAddEnterprise.module.css";
import { fetchActiveUsers } from "../../../../api/users";
import { useContractModuleOptions } from "../../../../hooks/useContractModuleOptions";
import ActivitySectorSelect from "../../../Misc/ActivitySectorSelect";
import SiretInput from "../../../Misc/SiretInput";
import { LEGAL_IDENTIFIER_LABEL } from "../../../../utils/siret";

export default function StepAddEnterprise({ form, setForm }) {
  const { enabledModules } = useContractModuleOptions();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [commercialSearch, setCommercialSearch] = useState("");
  const [selectedCommercialUser, setSelectedCommercialUser] = useState(null);
  const [commercialDropdownOpen, setCommercialDropdownOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const commercialAutocompleteRef = useRef(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const usersData = await fetchActiveUsers();
        setUsers(usersData);
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
  }, [form.commercial]);

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
      contrat: { ...prev.contrat, [field]: value },
    }));
  };

  const updatePrimaryContact = (field, value) => {
    setForm((prev) => ({
      ...prev,
      primaryContact: { ...(prev.primaryContact || {}), [field]: value },
    }));
  };

  const contact = form.primaryContact || {};

  const handleModuleChange = (moduleName, checked) => {
    setForm((prev) => ({
      ...prev,
      modules: { ...prev.modules, [moduleName]: checked },
    }));
  };

  const addSite = () => {
    const trimmed = newSiteName.trim();
    if (trimmed && !(form.sites || []).includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        sites: [...(prev.sites || []), trimmed],
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

  const filteredUsers = users
    .filter((user) =>
      commercialSearch.trim()
        ? (user.username || user.email || "")
            .toLowerCase()
            .includes(commercialSearch.trim().toLowerCase())
        : true
    )
    .slice(0, 15);

  return (
    <div className={styles.form}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Identité</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="clientName">Nom de l&apos;entreprise *</label>
            <input
              id="clientName"
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex. Société Dupont"
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="siret">{LEGAL_IDENTIFIER_LABEL}</label>
            <SiretInput
              id="siret"
              className={styles.select}
              value={form.siret || ""}
              onChange={(value) => setForm((prev) => ({ ...prev, siret: value }))}
            />
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label htmlFor="secteur">Secteur d&apos;activité</label>
            <ActivitySectorSelect
              id="secteur"
              className={styles.select}
              value={form.secteur || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, secteur: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Coordonnées</h3>
        <div className={styles.grid3}>
          <div className={styles.field}>
            <label htmlFor="addressStreet">Adresse</label>
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
          <div className={styles.field}>
            <label htmlFor="addressPostalCode">Code postal</label>
            <input
              id="addressPostalCode"
              type="text"
              inputMode="numeric"
              value={form.addressPostalCode || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, addressPostalCode: e.target.value }))
              }
              placeholder="33000"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="addressCity">Ville</label>
            <input
              id="addressCity"
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

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Sites</h3>
        <div className={styles.siteRow}>
          <input
            type="text"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSite();
              }
            }}
            placeholder="Ajouter un site (ville, agence…)"
          />
          <button
            type="button"
            onClick={addSite}
            disabled={!newSiteName.trim() || (form.sites || []).includes(newSiteName.trim())}
            className={styles.addSiteBtn}
            title="Ajouter le site"
          >
            <Icon icon="mdi:plus" />
          </button>
        </div>
        {(form.sites || []).length > 0 && (
          <div className={styles.siteChips}>
            {(form.sites || []).map((site) => (
              <span key={site} className={styles.siteChip}>
                <Icon icon="mdi:map-marker-outline" />
                {site}
                <button
                  type="button"
                  onClick={() => removeSite(site)}
                  className={styles.siteChipRemove}
                  aria-label={`Supprimer ${site}`}
                >
                  <Icon icon="mdi:close" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Contact principal *</h3>
        <p className={styles.cardHint}>
          Interlocuteur référent de l&apos;entreprise · il sera rattaché automatiquement à la fiche créée.
        </p>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="contactPrenom">Prénom</label>
            <input
              id="contactPrenom"
              type="text"
              value={contact.prenom || ""}
              onChange={(e) => updatePrimaryContact("prenom", e.target.value)}
              placeholder="Jean"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="contactNom">Nom *</label>
            <input
              id="contactNom"
              type="text"
              value={contact.nom || ""}
              onChange={(e) => updatePrimaryContact("nom", e.target.value)}
              placeholder="Dupont"
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="contactEmail">E-mail</label>
            <input
              id="contactEmail"
              type="email"
              value={contact.email || ""}
              onChange={(e) => updatePrimaryContact("email", e.target.value)}
              placeholder="jean.dupont@entreprise.fr"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="contactTelephone">Téléphone</label>
            <input
              id="contactTelephone"
              type="tel"
              value={contact.telephone || ""}
              onChange={(e) => updatePrimaryContact("telephone", e.target.value)}
              placeholder="06 12 34 56 78"
            />
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label htmlFor="contactPoste">Fonction</label>
            <input
              id="contactPoste"
              type="text"
              value={contact.poste || ""}
              onChange={(e) => updatePrimaryContact("poste", e.target.value.toUpperCase())}
              placeholder="EX. DIRECTEUR, RESPONSABLE IT"
              style={{ textTransform: "uppercase" }}
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Contrat</h3>
        <div className={styles.grid3}>
          <div className={styles.field}>
            <label htmlFor="contractStart">Date de début *</label>
            <input
              id="contractStart"
              type="date"
              value={form.contrat?.debut || ""}
              onChange={(e) => updateContrat("debut", e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="contractEnd">Date d&apos;expiration *</label>
            <input
              id="contractEnd"
              type="date"
              value={form.contrat?.expiration || ""}
              onChange={(e) => updateContrat("expiration", e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="commercial">Référent commercial</label>
            <div className={styles.autocomplete} ref={commercialAutocompleteRef}>
              <input
                id="commercial"
                type="text"
                placeholder="Rechercher un agent…"
                value={
                  commercialSearch ||
                  selectedCommercialUser?.username ||
                  selectedCommercialUser?.email ||
                  ""
                }
                onChange={(e) => {
                  setCommercialSearch(e.target.value);
                  setSelectedCommercialUser(null);
                  setForm((prev) => ({ ...prev, commercial: "" }));
                  setCommercialDropdownOpen(true);
                }}
                onFocus={() => setCommercialDropdownOpen(true)}
                disabled={loadingUsers}
              />
              {commercialDropdownOpen && Array.isArray(users) && (
                <div className={styles.dropdown}>
                  {filteredUsers.length === 0 ? (
                    <div className={styles.dropdownEmpty}>Aucun utilisateur trouvé</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className={`${styles.dropdownItem} ${
                          selectedCommercialUser?.id === user.id ? styles.dropdownItemSelected : ""
                        }`}
                        onClick={() => {
                          setSelectedCommercialUser(user);
                          setCommercialSearch(user.username || user.email || "");
                          setForm((prev) => ({ ...prev, commercial: user.id }));
                          setCommercialDropdownOpen(false);
                        }}
                      >
                        {user.username || user.email}
                        {user.email && user.username ? ` · ${user.email}` : ""}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Options du contrat *</h3>
        <div className={styles.modulesGrid}>
          {enabledModules.map((mod) => {
            const active = !!form.modules?.[mod.moduleKey];
            return (
              <div
                key={mod.moduleKey}
                className={`${styles.moduleTile} ${active ? styles.moduleTileActive : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onClick={() => handleModuleChange(mod.moduleKey, !active)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleModuleChange(mod.moduleKey, !active);
                  }
                }}
              >
                <Icon icon={mod.icon || "mdi:puzzle-outline"} className={styles.moduleTileIcon} />
                <span className={styles.moduleTileLabel}>{mod.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
