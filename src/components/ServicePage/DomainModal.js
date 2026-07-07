import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import { showError, showSuccess } from "../../utils/toast";
import API_BASE_URL from "../../config";
import addStyles from "../EquipementPage/AddEquipmentModal.module.css";

export default function DomainModal({ clients, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState(null);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const enterpriseAutocompleteRef = useRef(null);

  const [loadingClientModules, setLoadingClientModules] = useState(false);
  const [clientModules, setClientModules] = useState(null);
  const [domainName, setDomainName] = useState("");
  const [registrar, setRegistrar] = useState("");
  const [expiration, setExpiration] = useState("");
  const [saving, setSaving] = useState(false);
  const [showOvhPanel, setShowOvhPanel] = useState(false);
  const [ovhDomains, setOvhDomains] = useState([]);
  const [loadingOvhDomains, setLoadingOvhDomains] = useState(false);
  const [selectedOvhDomains, setSelectedOvhDomains] = useState(new Set());
  const [importedDomains, setImportedDomains] = useState([]);

  useEffect(() => {
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
  }, []);

  const domainClients = useMemo(
    () => clients || [],
    [clients]
  );

  const filteredClients = useMemo(() => {
    const q = enterpriseSearch.trim().toLowerCase();
    if (!q) return domainClients;
    return domainClients.filter((c) =>
      (c.name || "").toLowerCase().includes(q)
    );
  }, [domainClients, enterpriseSearch]);

  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    setEnterpriseSearch(client.name);
    setEnterpriseDropdownOpen(false);
    setStep(2);

    setLoadingClientModules(true);
    try {
      const modulesData = await fetchClientModules(client.id);
      setClientModules(modulesData);
    } catch (error) {
      console.error("Erreur chargement modules client:", error);
      showError("Erreur lors du chargement des données du client.");
      setStep(1);
      setSelectedClient(null);
    } finally {
      setLoadingClientModules(false);
    }
  };

  const handleClose = () => {
    onClose?.();
  };

  const totalSteps = 2;

  const handleSave = async () => {
    if (!selectedClient?.id) {
      showError("Client introuvable.");
      return;
    }

    if (!domainName.trim() && importedDomains.length === 0) {
      showError("Ajoutez au moins un domaine (manuel ou via OVH).");
      return;
    }

    try {
      setSaving(true);
      const modulesData = clientModules || {};

      const modules = modulesData.modules || selectedClient.modules || { Monitoring: true, Preventif: false };
      const existingMonitoring = modulesData.modules_monitoring || selectedClient.modules_monitoring || {};
      const modulesMonitoring = {
        ...existingMonitoring,
        NDD: true,
      };

      const existingEquipements = modulesData.equipements || selectedClient.equipements || {};
      const existingDomains = Array.isArray(existingEquipements.NDD)
        ? existingEquipements.NDD
        : [];

      const domainsToAdd = [];

      // Domaines importés depuis OVH
      if (importedDomains.length > 0) {
        const existingNames = new Set(
          existingDomains.map((d) => (d.nom || "").toLowerCase())
        );
        importedDomains.forEach((d) => {
          if (d.nom && !existingNames.has(d.nom.toLowerCase())) {
            domainsToAdd.push(d);
            existingNames.add(d.nom.toLowerCase());
          }
        });
      }

      // Domaine saisi manuellement
      if (domainName.trim()) {
        domainsToAdd.push({
          nom: domainName.trim(),
          expiration: expiration || "",
          registrar: registrar.trim() || "",
        });
      }

      const updatedEquipements = {
        ...existingEquipements,
        NDD: [...existingDomains, ...domainsToAdd],
      };

      await saveClientModules(selectedClient.id, {
        modules,
        modules_monitoring: modulesMonitoring,
        equipements: updatedEquipements,
      });

      showSuccess("Nom de domaine ajouté avec succès.");
      onSaved?.();
      onClose?.();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du nom de domaine:", error);
      showError("Erreur lors de l'enregistrement du nom de domaine.");
    } finally {
      setSaving(false);
    }
  };

  const loadOvhDomains = async () => {
    setLoadingOvhDomains(true);
    setOvhDomains([]);
    setSelectedOvhDomains(new Set());

    try {
      const response = await fetch(`${API_BASE_URL}/ovh/domains`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        showError(errorData.error || `Erreur HTTP: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.domains)) {
        setOvhDomains(data.domains);
        if (data.domains.length === 0) {
          showError("Aucun domaine trouvé dans votre compte OVH");
        } else {
          showSuccess(`${data.domains.length} domaine(s) chargé(s) depuis OVH`);
        }
      } else {
        showError(data.error || "Impossible de charger les domaines OVH");
      }
    } catch (err) {
      console.error("Erreur chargement domaines OVH:", err);
      showError("Erreur lors du chargement des domaines OVH");
    } finally {
      setLoadingOvhDomains(false);
    }
  };

  const toggleDomainSelection = (domainName) => {
    setSelectedOvhDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainName)) {
        next.delete(domainName);
      } else {
        next.add(domainName);
      }
      return next;
    });
  };

  const handleImportOvhDomains = () => {
    if (selectedOvhDomains.size === 0) {
      showError("Veuillez sélectionner au moins un domaine OVH.");
      return;
    }

    const domainsToImport = ovhDomains
      .filter((domain) => {
        const domainName = domain.domain || domain.name || domain;
        return selectedOvhDomains.has(domainName);
      })
      .map((domain) => {
        const domainName = domain.domain || domain.name || domain;
        const expirationRaw = domain.expiration || domain.expirationDate || "";
        const registrarValue = domain.registrar || "OVH";

        return {
          nom: domainName,
          expiration: expirationRaw
            ? new Date(expirationRaw).toISOString().split("T")[0]
            : "",
          registrar: registrarValue,
        };
      });

    if (domainsToImport.length === 0) {
      showError("Aucun domaine valide à importer.");
      return;
    }

    setImportedDomains((prev) => [...prev, ...domainsToImport]);
    showSuccess(`${domainsToImport.length} domaine(s) sélectionné(s) pour import.`);
    setShowOvhPanel(false);
  };

  const modalContent = (
    <div className={addStyles.overlay} onClick={handleClose}>
      <div
        className={addStyles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={addStyles.header}>
          <h2 className={addStyles.title}>
            <Icon icon="mdi:web" className={addStyles.titleIcon} />
            Ajouter un nom de domaine
          </h2>
          <button
            type="button"
            className={addStyles.closeBtn}
            onClick={handleClose}
            title="Fermer"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div
          className={addStyles.stepsIndicator}
          title={`Étape ${step} sur ${totalSteps}`}
        >
          <div className={addStyles.progressTrack}>
            <div
              className={addStyles.progressFill}
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className={addStyles.body}>
          {step === 1 && (
            <div className={addStyles.stepContent}>
              <p className={addStyles.stepDescription}>
                Sélectionnez l&apos;entreprise pour laquelle vous souhaitez
                ajouter un nom de domaine.
              </p>
              {domainClients.length === 0 ? (
                <p className={addStyles.noClients}>
                  Aucun client disponible. Configurez d&apos;abord des clients
                  dans la page Entreprises.
                </p>
              ) : (
                <div className={addStyles.step4Form}>
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
                  <button
                    type="button"
                    className={addStyles.continueButton}
                    disabled={!selectedClient}
                    onClick={() =>
                      selectedClient && handleSelectClient(selectedClient)
                    }
                  >
                    Continuer
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedClient && (
            <div className={addStyles.stepContent}>
              <button
                type="button"
                className={addStyles.backLink}
                onClick={() => setStep(1)}
              >
                <Icon icon="mdi:arrow-left" /> Retour à la sélection
                d&apos;entreprise
              </button>
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
                    Nom de domaine
                  </label>
                  <input
                    type="text"
                    className={addStyles.enterpriseInput}
                    placeholder="Ex: exemple.com"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                  />

                  <label className={addStyles.clientSelectLabel} style={{ marginTop: "1rem" }}>
                    Registrar
                  </label>
                  <input
                    type="text"
                    className={addStyles.enterpriseInput}
                    placeholder="Ex: OVH, Gandi..."
                    value={registrar}
                    onChange={(e) => setRegistrar(e.target.value)}
                  />

                  <label className={addStyles.clientSelectLabel} style={{ marginTop: "1rem" }}>
                    Date d&apos;expiration
                  </label>
                  <input
                    type="date"
                    className={addStyles.enterpriseInput}
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "1.25rem",
                    }}
                  >
                    <div>
                      <button
                        type="button"
                        className={addStyles.secondaryButton}
                        onClick={async () => {
                          setShowOvhPanel((prev) => !prev);
                          if (!showOvhPanel && ovhDomains.length === 0) {
                            await loadOvhDomains();
                          }
                        }}
                        title="Importer des domaines depuis OVH"
                      >
                        <Icon icon="mdi:cloud-download" style={{ marginRight: "0.35rem" }} />
                        Importer depuis OVH
                      </button>
                    </div>
                    <div>
                      <button
                        type="button"
                        className={addStyles.secondaryButton}
                        onClick={handleClose}
                        style={{ marginRight: "0.5rem" }}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        className={addStyles.primaryButton}
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                  {showOvhPanel && (
                    <div
                      style={{
                        marginTop: "1.25rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.75rem",
                        padding: "0.75rem 1rem",
                        maxHeight: "260px",
                        overflowY: "auto",
                        background: "#f9fafb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Icon icon="mdi:cloud-download" style={{ fontSize: "1.1rem", color: "#15d1a0" }} />
                          <strong style={{ fontSize: "0.95rem" }}>Domaines OVH</strong>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                          {loadingOvhDomains
                            ? "Chargement..."
                            : `${ovhDomains.length} domaine(s)`}
                        </span>
                      </div>
                      {loadingOvhDomains ? (
                        <div style={{ padding: "0.5rem 0", fontSize: "0.85rem", color: "#6b7280" }}>
                          Chargement des domaines OVH...
                        </div>
                      ) : ovhDomains.length === 0 ? (
                        <div style={{ padding: "0.5rem 0", fontSize: "0.85rem", color: "#6b7280" }}>
                          Aucun domaine trouvé dans votre compte OVH.
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                            Cochez les domaines à ajouter pour ce client, puis cliquez sur
                            <strong> Importer les domaines sélectionnés</strong>.
                          </div>
                          <div
                            style={{
                              borderRadius: "0.5rem",
                              border: "1px solid #e5e7eb",
                              background: "#ffffff",
                              maxHeight: "180px",
                              overflowY: "auto",
                            }}
                          >
                            {ovhDomains.map((domain) => {
                              const name = domain.domain || domain.name || domain;
                              const expirationRaw = domain.expiration || domain.expirationDate || "";
                              const expirationLabel = expirationRaw
                                ? new Date(expirationRaw).toLocaleDateString("fr-FR")
                                : "-";
                              return (
                                <label
                                  key={name}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.4rem 0.75rem",
                                    borderBottom: "1px solid #f3f4f6",
                                    fontSize: "0.85rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedOvhDomains.has(name)}
                                      onChange={() => toggleDomainSelection(name)}
                                      style={{ cursor: "pointer" }}
                                    />
                                    <span>{name}</span>
                                  </div>
                                  <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6b7280" }}>
                                    {expirationLabel}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              marginTop: "0.5rem",
                            }}
                          >
                            <button
                              type="button"
                              className={addStyles.secondaryButton}
                              onClick={handleImportOvhDomains}
                            >
                              Importer les domaines sélectionnés
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

