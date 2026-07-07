// ──────────────────────────────
// 📦 Modal d'ajout d'équipement - flux multi-étapes
// ──────────────────────────────
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { FaServer, FaShieldAlt, FaHdd, FaNetworkWired, FaWifi, FaGlobe, FaEdit } from "react-icons/fa";
import styles from "./AddEquipmentModal.module.css";
import { fetchClientsList } from "../../api/clients";
import EquipmentFormModal from "./EquipmentFormModal";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";

const CATEGORIES = [
  { id: "Internet", label: "Internet", icon: FaGlobe },
  { id: "Firewalls", label: "Firewalls", icon: FaShieldAlt },
  { id: "Serveurs", label: "Serveurs", icon: FaServer },
  { id: "Stockage", label: "Stockage", icon: FaHdd },
  { id: "Switch", label: "Switch", icon: FaNetworkWired },
  { id: "BorneWifi", label: "Borne WiFi", icon: FaWifi },
];

export default function AddEquipmentModal({ onClose, onEquipmentAdded, prefilledClient = null }) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const enterpriseAutocompleteRef = useRef(null);
  const hasLoadedClientsRef = useRef(false);

  // Fermer le dropdown au clic extérieur
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

  const filteredClients = enterpriseSearch.trim()
    ? clients.filter((c) =>
        (c.name || "")
          .toLowerCase()
          .includes(enterpriseSearch.trim().toLowerCase())
      )
    : clients;

  // Charger une seule fois les entreprises (liste légère) à partir de l'étape source.
  useEffect(() => {
    if (step < 2 || hasLoadedClientsRef.current) return;

    const controller = new AbortController();
    setLoadingClients(true);

    fetchClientsList({ signal: controller.signal })
      .then((all) => {
        setClients(Array.isArray(all) ? all : []);
        hasLoadedClientsRef.current = true;
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Erreur chargement clients:", err);
        setClients([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingClients(false);
      });

    return () => {
      controller.abort();
    };
  }, [step]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setSelectedCategory(null);
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleManualAddClick = () => {
    if (prefilledClient) {
      setSelectedClient(prefilledClient);
      setShowClientModal(true);
      return;
    }
    setStep(3);
  };

  const handleClientSelectAndOpen = (client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  const handleClientModalClose = () => {
    setShowClientModal(false);
    setSelectedClient(null);
    onEquipmentAdded?.();
    onClose();
  };

  const hasUnsavedChanges =
    step > 1 || Boolean(selectedCategory || selectedClient || enterpriseSearch.trim());

  const { requestClose, discardConfirmOpen, cancelDiscard, confirmDiscard } = useModalCloseGuard({
    open: true,
    onClose,
    hasUnsavedChanges,
  });

  // Quand on ouvre le formulaire équipement, on masque le modal d'ajout
  if (showClientModal && selectedClient && selectedCategory) {
    return createPortal(
      <EquipmentFormModal
        client={selectedClient}
        category={selectedCategory}
        onBack={() => setShowClientModal(false)}
        onSuccess={handleClientModalClose}
      />,
      document.body
    );
  }

  return createPortal(
    <>
    <div className={styles.overlay} onClick={requestClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              <Icon icon="mdi:plus-circle-outline" className={styles.titleIcon} />
              Ajouter un équipement
            </h2>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={requestClose}
              title="Fermer"
              aria-label="Fermer"
            >
              <FaTimes />
            </button>
          </div>

          <div className={styles.stepsIndicator} title={`Étape ${step} sur 3`}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className={styles.body}>
            {/* Étape 1 : Catégorie */}
            {step === 1 && (
              <div className={styles.stepContent}>
                <p className={styles.stepDescription}>
                  Quelle catégorie de matériel souhaitez-vous ajouter ?
                </p>
                <div className={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const IconComponent = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={styles.categoryCard}
                        onClick={() => handleCategorySelect(cat)}
                      >
                        <IconComponent className={styles.categoryIcon} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Étape 2 : Source (Import ou Ajout manuel) */}
            {step === 2 && selectedCategory && (
              <div className={styles.stepContent}>
                <button
                  type="button"
                  className={styles.backLink}
                  onClick={handleBack}
                >
                  <Icon icon="mdi:arrow-left" /> Retour à la catégorie
                </button>
                <p className={styles.stepDescription}>
                  Comment souhaitez-vous ajouter cet équipement ?
                </p>
                <div className={styles.sourceOptions}>
                  {/* Import via intégration - placeholder désactivé */}
                  <div className={`${styles.sourceCard} ${styles.sourceCardDisabled}`}>
                    <Icon icon="mdi:cloud-download-outline" className={styles.sourceIcon} />
                    <h3 className={styles.sourceTitle}>Import via intégration</h3>
                    <p className={styles.sourceDesc}>
                      CheckMK, API...
                    </p>
                    <span className={styles.comingSoon}>Bientôt disponible</span>
                  </div>

                  {/* Ajout manuel */}
                  <button
                    type="button"
                    className={styles.sourceCard}
                    onClick={handleManualAddClick}
                  >
                    <Icon icon="mdi:pencil-plus-outline" className={styles.sourceIcon} />
                    <h3 className={styles.sourceTitle}>Ajout manuel</h3>
                    <p className={styles.sourceDesc}>
                      {prefilledClient
                        ? "Saisir les informations du matériel"
                        : "Saisir les informations du matériel et de l'entreprise"}
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Étape 3 : Saisie - entreprise + formulaire matériel */}
            {step === 3 && selectedCategory && (
              <div className={styles.stepContent}>
                <button
                  type="button"
                  className={styles.backLink}
                  onClick={handleBack}
                >
                  <Icon icon="mdi:arrow-left" /> Retour à la source
                </button>
                <p className={styles.stepDescription}>
                  Sélectionnez l&apos;entreprise et renseignez les informations du matériel.
                </p>
                {loadingClients ? (
                  <div className={styles.loadingClients}>Chargement des entreprises...</div>
                ) : clients.length === 0 ? (
                  <p className={styles.noClients}>
                    Aucune entreprise disponible.
                  </p>
                ) : (
                  <div className={styles.step4Form}>
                    <label className={styles.clientSelectLabel}>
                      Entreprise
                    </label>
                    <div className={styles.enterpriseAutocomplete} ref={enterpriseAutocompleteRef}>
                      <input
                        type="text"
                        className={styles.enterpriseInput}
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
                        <div className={styles.enterpriseDropdown}>
                          {filteredClients.length === 0 ? (
                            <div className={styles.enterpriseDropdownEmpty}>
                              Aucune entreprise trouvée
                            </div>
                          ) : (
                            filteredClients.slice(0, 15).map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                className={`${styles.enterpriseOption} ${selectedClient?.id === client.id ? styles.enterpriseOptionSelected : ""}`}
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
                      className={styles.continueButton}
                      disabled={!selectedClient}
                      onClick={() => selectedClient && handleClientSelectAndOpen(selectedClient)}
                    >
                      <FaEdit className={styles.continueButtonIcon} />
                      Renseigner les informations du matériel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
    <ModalDiscardConfirm
      open={discardConfirmOpen}
      onConfirm={confirmDiscard}
      onClose={cancelDiscard}
    />
    </>,
    document.getElementById("modal-root") || document.body
  );
}
