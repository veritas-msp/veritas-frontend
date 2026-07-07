import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaSync, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import { updateEquipment } from "../../api/equipment";
import { getUnifiApiConfig, isUnifiUdmGateway } from "./unifiEquipmentUtils";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import styles from "./UnifiApiConfigModal.module.css";

const modalRoot = document.getElementById("modal-root");

export default function UnifiApiConfigModal({ isOpen, onClose, equipment, onSaved }) {
  const existing = getUnifiApiConfig(equipment);
  const [host, setHost] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [rejectUnauthorized, setRejectUnauthorized] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState({
    host: "",
    apiKey: "",
    rejectUnauthorized: false,
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !equipment) return;
    const config = getUnifiApiConfig(equipment);
    const snapshot = {
      host: config.host || equipment.ip || "",
      apiKey: config.apiKey || "",
      rejectUnauthorized: config.rejectUnauthorized === true,
    };
    setHost(snapshot.host);
    setApiKey(snapshot.apiKey);
    setRejectUnauthorized(snapshot.rejectUnauthorized);
    setInitialSnapshot(snapshot);
  }, [isOpen, equipment]);

  const hasUnsavedChanges =
    host !== initialSnapshot.host ||
    apiKey !== initialSnapshot.apiKey ||
    rejectUnauthorized !== initialSnapshot.rejectUnauthorized;

  const { requestClose, discardConfirmOpen, cancelDiscard, confirmDiscard } = useModalCloseGuard({
    open: isOpen,
    onClose,
    hasUnsavedChanges,
    blocked: saving || testing,
  });

  if (!isOpen || !equipment || !modalRoot || !isUnifiUdmGateway(equipment)) return null;

  const handleTest = async () => {
    if (!host.trim() || !apiKey.trim()) {
      toast.warning("Renseignez l'URL et la clé API avant de tester");
      return;
    }
    setTesting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/unifi/equipment-test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: host.trim(),
          apiKey: apiKey.trim(),
          rejectUnauthorized,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || "Test de connexion échoué");
      }
      toast.success(data.message || "Connexion API UniFi réussie");
    } catch (err) {
      toast.error(err.message || "Impossible de joindre l'API UniFi");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!host.trim() || !apiKey.trim()) {
      toast.warning("URL et clé API sont requises");
      return;
    }
    setSaving(true);
    try {
      await updateEquipment(
        equipment.id,
        {
          name: equipment.name,
          model: equipment.model || equipment.modele,
          manufacturer: equipment.manufacturer || equipment.fabricant,
          unifiApiHost: host.trim(),
          unifiApiKey: apiKey.trim(),
          unifiApiRejectUnauthorized: rejectUnauthorized,
          unifiApiConfiguredAt: new Date().toISOString(),
        },
        equipment
      );
      toast.success("Connexion API UniFi enregistrée");
      onSaved?.({
        unifiApiHost: host.trim(),
        unifiApiKey: apiKey.trim(),
        unifiApiRejectUnauthorized: rejectUnauthorized,
        unifiApiConfiguredAt: new Date().toISOString(),
      });
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <>
    <div className={styles.overlay} onClick={requestClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Icon icon="simple-icons:ubiquiti" className={styles.titleIcon} />
            API UniFi · {equipment.name}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Fermer">
            <FaTimes />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.subtitle}>
            Paramétrez la connexion à l&apos;API locale du contrôleur (UDM Pro / UDM Pro Max) pour synchroniser
            automatiquement les données du périphérique.
          </p>

          <label className={styles.field}>
            <span className={styles.label}>URL du contrôleur</span>
            <input
              type="text"
              className={styles.input}
              placeholder="https://192.168.1.1"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
            <span className={styles.hint}>Adresse IP ou hostname du UDM Pro (HTTPS)</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Clé API locale</span>
            <input
              type="password"
              className={styles.input}
              placeholder="Clé API générée dans UniFi Network"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <span className={styles.hint}>UniFi OS → Paramètres → Control Plane → Integrations → API Keys</span>
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={rejectUnauthorized}
              onChange={(e) => setRejectUnauthorized(e.target.checked)}
            />
            Vérifier le certificat SSL (décocher si certificat auto-signé)
          </label>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnTest} onClick={handleTest} disabled={testing || saving}>
            <FaSync className={testing ? styles.spin : undefined} />
            {testing ? "Test…" : "Tester la connexion"}
          </button>
          <button type="button" className={styles.btnSecondary} onClick={requestClose} disabled={saving}>
            Annuler
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving || testing}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
    <ModalDiscardConfirm
      open={discardConfirmOpen}
      onConfirm={confirmDiscard}
      onClose={cancelDiscard}
    />
    </>,
    modalRoot
  );
}
