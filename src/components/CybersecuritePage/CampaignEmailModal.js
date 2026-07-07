// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { useState } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaTimes, FaPaperPlane, FaEnvelope } from "react-icons/fa";
import { toast } from 'react-toastify';
import API_BASE_URL from "../../config";
import { updateCampaignStep } from "../../api/campaigns";
import styles from "./CampaignEmailModal.module.css";

// ──────────────────────────────
// 🧩 Composant : CampaignEmailModal
// ──────────────────────────────
export default function CampaignEmailModal({ step, campaign, clientId, campaignId, onClose, onEmailSent }) {
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!emailTo || !emailTo.includes('@')) {
      toast.error('Veuillez renseigner une adresse email valide');
      return;
    }

    if (!emailSubject.trim()) {
      toast.error('Veuillez renseigner un sujet');
      return;
    }

    if (!emailContent.trim()) {
      toast.error('Veuillez rédiger le contenu de l\'email');
      return;
    }

    try {
      setSending(true);

      // Envoyer l'email
      const response = await fetch(`${API_BASE_URL}/email/send-campaign-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          content: emailContent,
          stepId: step.id,
          campaignId: campaignId,
          clientId: clientId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de l\'envoi de l\'email');
      }

      // Mettre à jour le step : cocher et sauvegarder la date d'envoi
      await updateCampaignStep(clientId, campaignId, step.id, {
        completed: true
      });

      toast.success('Email envoyé avec succès et étape marquée comme terminée');
      
      // Notifier le parent
      if (onEmailSent) {
        onEmailSent();
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <FaEnvelope className={styles.modalIcon} />
            <h3>Envoyer un email</h3>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            title="Fermer"
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              Destinataire <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="exemple@domaine.com"
              className={styles.fieldInput}
              required
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              Sujet <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Sujet de l'email"
              className={styles.fieldInput}
              required
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              Contenu <span className={styles.required}>*</span>
            </label>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Rédigez votre message ici..."
              className={styles.fieldTextarea}
              rows={12}
              required
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={sending}
          >
            <FaTimes />
            Annuler
          </button>
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={sending || !emailTo || !emailSubject.trim() || !emailContent.trim()}
          >
            {sending ? (
              <>
                <Icon icon="mdi:loading" className={styles.spinner} />
                Envoi en cours...
              </>
            ) : (
              <>
                <FaPaperPlane />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

