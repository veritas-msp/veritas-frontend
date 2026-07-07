import React, { useState, useMemo, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import { showError, showSuccess } from "../../utils/toast";
import API_BASE_URL from "../../config";
import addStyles from "../EquipementPage/AddEquipmentModal.module.css";
import styles from "./CybersecuritePage.module.css";
import CenteredFormModal from "../Misc/CenteredFormModal";

export default function AntivirusSolutionModal({ clients, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState(null);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const enterpriseAutocompleteRef = useRef(null);

  const [loadingClientModules, setLoadingClientModules] = useState(false);
  const [clientModules, setClientModules] = useState(null);
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const companyAutocompleteRef = useRef(null);
  const [saving, setSaving] = useState(false);

  // Fermer le dropdown au clic extérieur (même logique que AddEquipmentModal)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        enterpriseAutocompleteRef.current &&
        !enterpriseAutocompleteRef.current.contains(e.target)
      ) {
        setEnterpriseDropdownOpen(false);
      }
      if (
        companyAutocompleteRef.current &&
        !companyAutocompleteRef.current.contains(e.target)
      ) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clients pour lesquels on peut gérer l'antivirus (tous les clients pour l'instant)
  const antivirusClients = useMemo(
    () => clients || [],
    [clients]
  );

  const filteredClients = useMemo(() => {
    const q = enterpriseSearch.trim().toLowerCase();
    if (!q) return antivirusClients;
    return antivirusClients.filter((c) =>
      (c.name || "").toLowerCase().includes(q)
    );
  }, [antivirusClients, enterpriseSearch]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setEnterpriseSearch(client.name);
    setEnterpriseDropdownOpen(false);
  };

  const handleClose = () => {
    onClose?.();
  };

  const getAuthHeaders = () => ({});

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bitdefender/companies`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.companies) {
        const uniqueCompanies = [];
        const seenIds = new Set();

        data.companies.forEach((company) => {
          const id = company.id || company._id;
          const name = company.name || company.companyName || "Entreprise sans nom";
          if (id) {
            if (!seenIds.has(id)) {
              seenIds.add(id);
              uniqueCompanies.push({ id, name });
            }
          } else {
            const key = name.toLowerCase().trim();
            if (!seenIds.has(key)) {
              seenIds.add(key);
              uniqueCompanies.push({ id: key, name });
            }
          }
        });

        setCompanies(uniqueCompanies);
      } else {
        throw new Error(data.error || "Erreur lors de la récupération des entreprises");
      }
    } catch (error) {
      console.error("❌ Erreur chargement entreprises BitDefender:", error);
      showError(`Erreur lors du chargement des entreprises Bitdefender: ${error.message}`);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const totalSteps = 2;

  const handleSave = async () => {
    if (!selectedClient?.id) {
      showError("Client introuvable.");
      return;
    }
    if (!companyId || !companyId.trim()) {
      showError("Renseignez l'ID de l'entreprise Bitdefender (Company ID).");
      return;
    }

    try {
      setSaving(true);
      const modulesData = clientModules || {};

      const modules = modulesData.modules || selectedClient.modules || { Monitoring: true, Preventif: false };
      const existingMonitoring = modulesData.modules_monitoring || selectedClient.modules_monitoring || {};
      const modulesMonitoring = {
        ...existingMonitoring,
        Antivirus: true,
      };

      const existingEquipements = modulesData.equipements || selectedClient.equipements || {};
      const antivirusEquipement = existingEquipements.Antivirus || {};
      const existingSolutions = Array.isArray(antivirusEquipement.solutions)
        ? antivirusEquipement.solutions
        : [];

      const newSolution = {
        id: Date.now(),
        solution: "GravityZone BitDefender",
        licencesTotales: "",
        licencesUtilisees: "",
        expiration: "",
        companyId: companyId.trim(),
      };

      const updatedEquipements = {
        ...existingEquipements,
        Antivirus: {
          ...antivirusEquipement,
          solutions: [...existingSolutions, newSolution],
        },
      };

      await saveClientModules(selectedClient.id, {
        modules,
        modules_monitoring: modulesMonitoring,
        equipements: updatedEquipements,
      });

      showSuccess("Solution Bitdefender ajoutée avec succès.");
      onSaved?.({
        clientId: selectedClient.id,
        solution: newSolution,
      });
      onClose?.();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la solution antivirus:", error);
      showError("Erreur lors de l'enregistrement de la solution antivirus.");
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (step === 1) {
      if (!selectedClient) {
        showError("Sélectionnez d'abord une entreprise.");
        return;
      }

      setStep(2);
      setLoadingClientModules(true);
      try {
        const modulesData = await fetchClientModules(selectedClient.id);
        setClientModules(modulesData);
        // Charger aussi les entreprises Bitdefender pour le mapping
        await loadCompanies();
      } catch (error) {
        console.error("Erreur chargement modules client:", error);
        showError("Erreur lors du chargement des données du client.");
        setStep(1);
        setSelectedClient(null);
      } finally {
        setLoadingClientModules(false);
      }
      return;
    }

    // step 2 -> enregistrer la solution
    await handleSave();
  };

  return (
    <CenteredFormModal
      isOpen={true}
      onClose={handleClose}
      title="Ajouter une solution antivirus"
      icon="mdi:shield-search"
    >
      <div className={addStyles.body}>
        {step === 1 && (
          <div className={addStyles.stepContent}>
            <p className={addStyles.stepDescription}>
              Sélectionnez l&apos;entreprise pour laquelle vous souhaitez
              ajouter une solution antivirus Bitdefender.
            </p>
            {antivirusClients.length === 0 ? (
              <p className={addStyles.noClients}>
                Aucun client disponible. Configurez d&apos;abord des clients
                dans la page Entreprises.
              </p>
            ) : (
              <div
                className={addStyles.step4Form}
                style={{ marginBottom: "1.5rem" }}
              >
                <label className={addStyles.clientSelectLabel}>
                  Entreprise
                </label>
                <div
                  className={addStyles.enterpriseAutocomplete}
                  ref={enterpriseAutocompleteRef}
                >
                  <input
                    type="text"
                    className={addStyles.enterpriseInput}
                    placeholder="Rechercher une entreprise..."
                    value={enterpriseSearch || (selectedClient?.name ?? "")}
                    onChange={(e) => {
                      setEnterpriseSearch(e.target.value);
                      setSelectedClient(null);
                      setEnterpriseDropdownOpen(true);
                    }}
                    onFocus={() => setEnterpriseDropdownOpen(true)}
                  />
                  {enterpriseDropdownOpen && (
                    <div className={addStyles.enterpriseDropdown}>
                      {filteredClients.length === 0 ? (
                        <div className={addStyles.enterpriseDropdownEmpty}>
                          Aucune entreprise trouvée
                        </div>
                      ) : (
                        filteredClients.slice(0, 15).map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            className={`${addStyles.enterpriseOption} ${
                              selectedClient?.id === client.id
                                ? addStyles.enterpriseOptionSelected
                                : ""
                            }`}
                            onClick={() => handleSelectClient(client)}
                          >
                            {client.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedClient && (
          <div className={addStyles.stepContent}>
            <p className={addStyles.stepDescription}>
              Entreprise : <strong>{selectedClient.name}</strong>
            </p>
            {loadingClientModules ? (
              <div style={{ padding: "1rem", color: "#9ca3af" }}>
                Chargement des données du client...
              </div>
            ) : (
              <div className={addStyles.step4Form}>
                <label className={addStyles.clientSelectLabel}>
                  Entreprise Bitdefender (GravityZone)
                </label>
                {loadingCompanies ? (
                  <div
                    style={{
                      padding: "0.75rem 0",
                      color: "#9ca3af",
                      fontSize: "0.9rem",
                    }}
                  >
                    Chargement des entreprises Bitdefender...
                  </div>
                ) : companies.length === 0 ? (
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary, #9ca3af)",
                      marginTop: "0.25rem",
                    }}
                  >
                    Aucune entreprise Bitdefender disponible. Vérifiez la
                    connexion à GravityZone.
                  </p>
                ) : (
                  <div
                    className={addStyles.enterpriseAutocomplete}
                    ref={companyAutocompleteRef}
                  >
                    <input
                      type="text"
                      className={addStyles.enterpriseInput}
                      placeholder="Rechercher une entreprise Bitdefender..."
                      value={companySearch}
                      onChange={(e) => {
                        setCompanySearch(e.target.value);
                        setCompanyDropdownOpen(true);
                      }}
                      onFocus={() => setCompanyDropdownOpen(true)}
                    />
                    {companyDropdownOpen && (
                      <div className={addStyles.enterpriseDropdown}>
                        {companies
                          .filter((c) => {
                            const q = companySearch.trim().toLowerCase();
                            if (!q) return true;
                            return c.name.toLowerCase().includes(q);
                          })
                          .slice(0, 15)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className={addStyles.enterpriseOption}
                              onClick={() => {
                                setCompanyId(c.id);
                                setCompanySearch(c.name);
                                setCompanyDropdownOpen(false);
                              }}
                            >
                              {c.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
                <label
                  className={addStyles.clientSelectLabel}
                  style={{ marginTop: "1rem" }}
                >
                  Company ID Bitdefender
                </label>
                <input
                  type="text"
                  className={addStyles.enterpriseInput}
                  placeholder="Ex: 123456789"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                />
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary, #9ca3af)",
                    marginTop: "0.25rem",
                  }}
                >
                  Utilisé pour lier cette entreprise à son tenant Bitdefender
                  (GravityZone) pour la synchronisation automatique.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.modalActions}>
        {step === 2 && (
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.iconPrimaryButton}`}
            onClick={() => setStep(1)}
            disabled={saving}
            title="Retour à la sélection d'entreprise"
          >
            <Icon icon="mdi:chevron-left" />
          </button>
        )}
        <button
          type="button"
          className={`${styles.primaryButton} ${styles.iconPrimaryButton}`}
          onClick={handleContinue}
          disabled={saving}
          title={step === 1 ? "Continuer" : "Enregistrer la solution"}
        >
          <Icon
            icon={
              saving
                ? "mdi:loading"
                : step === 1
                ? "mdi:arrow-right"
                : "mdi:check"
            }
            className={saving ? styles.spinning : ""}
          />
        </button>
      </div>
    </CenteredFormModal>
  );
}

