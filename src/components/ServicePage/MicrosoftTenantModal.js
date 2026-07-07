import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import addStyles from "../EquipementPage/AddEquipmentModal.module.css";
import MicrosoftTenantStep from "./MicrosoftTenantStep";

export default function MicrosoftTenantModal({ clients, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState(null);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const enterpriseAutocompleteRef = useRef(null);

  // Fermer la dropdown au clic extérieur (même logique que AddEquipmentModal)
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

  const availableClients = useMemo(() => clients || [], [clients]);

  const filteredClients = useMemo(() => {
    const q = enterpriseSearch.trim().toLowerCase();
    if (!q) return availableClients;
    return availableClients.filter((c) =>
      (c.name || "").toLowerCase().includes(q)
    );
  }, [availableClients, enterpriseSearch]);

  const handleSelectAndContinue = (client) => {
    setSelectedClient(client);
    setStep(2);
  };

  const handleClose = () => {
    onClose?.();
  };

  const totalSteps = 2;

  const modalContent = (
    <div className={addStyles.overlay} onClick={handleClose}>
      <div
        className={addStyles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={addStyles.header}>
          <h2 className={addStyles.title}>
            <Icon icon="mdi:microsoft-azure" className={addStyles.titleIcon} />
            Ajouter un tenant Microsoft
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
          {/* Étape 1 : sélection client (même UX que AddEquipmentModal) */}
          {step === 1 && (
            <div className={addStyles.stepContent}>
              <p className={addStyles.stepDescription}>
                Sélectionnez l&apos;entreprise pour laquelle vous souhaitez
                configurer le tenant Microsoft.
              </p>
              {availableClients.length === 0 ? (
                <p className={addStyles.noClients}>
                  Aucune entreprise disponible.
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
                              onClick={() => {
                                setSelectedClient(client);
                                setEnterpriseSearch(client.name);
                                setEnterpriseDropdownOpen(false);
                              }}
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
                      selectedClient && handleSelectAndContinue(selectedClient)
                    }
                  >
                    Configurer le tenant Microsoft
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Étape 2 : configuration tenant */}
          {step === 2 && selectedClient && (
            <div className={addStyles.stepContent}>
              <MicrosoftTenantStep
                client={selectedClient}
                onBack={() => setStep(1)}
                onSaved={onSaved}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

