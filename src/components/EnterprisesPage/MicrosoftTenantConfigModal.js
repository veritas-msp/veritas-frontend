import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
  deleteClientOffice365Credentials,
  getClientOffice365Credentials,
  getClientSecretExpiration,
  saveClientOffice365Credentials,
  testClientOffice365Connection,
  testOffice365ConnectionWithCredentials,
} from "../../api/clientOffice365";
import { showError, showSuccess } from "../../utils/toast";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { buildMicrosoftTenantNavSections } from "./microsoftTenantFormConfig";
import {
  formatMicrosoftTenantSummary,
  isMicrosoftTenantConfigured,
  normalizeMicrosoftTenantCredentials,
} from "./microsoftTenantSolutionUtils";
import formStyles from "./EnterpriseFormModal.module.css";
import avStyles from "./AntivirusConfigModal.module.css";
import msStyles from "./MicrosoftTenantConfigModal.module.css";
import integrationStyles from "../AdminPage/BitdefenderIntegrationModal.module.css";
import EntraApiGuide from "./integrationGuides/EntraApiGuide";

const STORED_SECRET_MASK = "••••••••••••••••";

export default function MicrosoftTenantConfigModal({
  client,
  onClose,
  onSaved,
  onViewTenant,
  initialSection = "overview",
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [existingCredentials, setExistingCredentials] = useState(null);
  const [form, setForm] = useState({
    tenantId: "",
    clientIdAzure: "",
    clientSecret: "",
    secretKeyId: "",
  });
  const [secretExpiration, setSecretExpiration] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [applicationDisplayName, setApplicationDisplayName] = useState(null);

  const configured = useMemo(
    () => isMicrosoftTenantConfigured(client, credentials),
    [client, credentials]
  );

  const navSections = useMemo(
    () => buildMicrosoftTenantNavSections({ configured }),
    [configured]
  );

  const summary = useMemo(
    () => formatMicrosoftTenantSummary(credentials, client),
    [credentials, client]
  );

  const sectionBadges = useMemo(
    () => ({
      overview: configured,
      configuration: configured,
    }),
    [configured]
  );

  const loadCredentials = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const result = await getClientOffice365Credentials(client.id);
      if (result.success && result.credentials) {
        const normalized = normalizeMicrosoftTenantCredentials(result.credentials);
        setCredentials(normalized);
        setExistingCredentials(normalized);
        setForm({
          tenantId: normalized.tenantId || "",
          clientIdAzure: normalized.clientIdAzure || "",
          clientSecret: "",
          secretKeyId: normalized.secretKeyId || "",
        });
        try {
          const expirationResult = await getClientSecretExpiration(client.id);
          setSecretExpiration(expirationResult?.expirationDate || null);
        } catch {
          setSecretExpiration(null);
        }
        try {
          const testResult = await testClientOffice365Connection(client.id);
          setConnectionStatus("success");
          setApplicationDisplayName(testResult.applicationDisplayName || null);
        } catch {
          setConnectionStatus("error");
          setApplicationDisplayName(null);
        }
      } else {
        setCredentials(null);
        setExistingCredentials(null);
        setForm({ tenantId: "", clientIdAzure: "", clientSecret: "", secretKeyId: "" });
        setSecretExpiration(null);
        setConnectionStatus(null);
        setApplicationDisplayName(null);
      }
    } catch (error) {
      console.error(error);
      showError("Erreur lors du chargement du tenant Microsoft.");
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection, client?.id]);

  const handleTestConnection = async () => {
    if (!client?.id) return;
    setTestingConnection(true);
    try {
      let result;
      if (existingCredentials) {
        result = await testClientOffice365Connection(client.id);
      } else {
        const hasTenantId = form.tenantId?.trim();
        const hasClientIdAzure = form.clientIdAzure?.trim();
        const hasClientSecret = form.clientSecret?.trim();
        if (!hasTenantId || !hasClientIdAzure || !hasClientSecret) {
          showError("Renseignez Tenant ID, Client ID et Client Secret pour tester.");
          return;
        }
        result = await testOffice365ConnectionWithCredentials({
          tenantId: form.tenantId.trim(),
          clientIdAzure: form.clientIdAzure.trim(),
          clientSecret: form.clientSecret.trim(),
          secretKeyId: form.secretKeyId?.trim() || null,
        });
      }
      setConnectionStatus("success");
      setApplicationDisplayName(result.applicationDisplayName || null);
      showSuccess("Connexion Entra ID réussie.");
    } catch (error) {
      setConnectionStatus("error");
      setApplicationDisplayName(null);
      showError(error.message || "Échec du test de connexion.");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!client?.id) return;
    const hasTenantId = form.tenantId?.trim();
    const hasClientIdAzure = form.clientIdAzure?.trim();
    if (!hasTenantId || !hasClientIdAzure) {
      showError("Renseignez au minimum Tenant ID et Client ID.");
      return;
    }
    if (!existingCredentials && !form.clientSecret?.trim()) {
      showError("Le Client Secret est obligatoire pour la première configuration.");
      return;
    }

    setSaving(true);
    try {
      await saveClientOffice365Credentials(client.id, {
        tenantId: form.tenantId.trim(),
        clientIdAzure: form.clientIdAzure.trim(),
        clientSecret: form.clientSecret?.trim() || undefined,
        secretKeyId: form.secretKeyId?.trim() || null,
      });
      showSuccess("Tenant Microsoft enregistré.");
      await loadCredentials();
      if (typeof onSaved === "function") await onSaved();
      setActiveSection("overview");
    } catch (error) {
      showError(error.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client?.id) return;
    setDeleting(true);
    try {
      await deleteClientOffice365Credentials(client.id);
      showSuccess("Tenant Microsoft supprimé.");
      setDeleteConfirmOpen(false);
      setCredentials(null);
      setExistingCredentials(null);
      setForm({ tenantId: "", clientIdAzure: "", clientSecret: "", secretKeyId: "" });
      setSecretExpiration(null);
      setConnectionStatus(null);
      setApplicationDisplayName(null);
      if (typeof onSaved === "function") await onSaved();
    } catch (error) {
      showError(error.message || "Erreur lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  };

  const renderOverview = () => (
    <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Tenant Microsoft 365</h3>
        <p className={formStyles.sectionDesc}>
          Chaque client dispose d&apos;un tenant Entra ID dédié. Les statistiques (utilisateurs,
          licences, Exchange, Teams, sécurité…) s&apos;ouvrent dans un nouvel onglet Veritas.
        </p>
      </div>

      {!configured ? (
        <div className={avStyles.emptyState}>
          Aucun tenant configuré pour ce client.
          <button
            type="button"
            className={formStyles.ghostBtn}
            onClick={() => setActiveSection("configuration")}
            style={{ marginTop: "0.75rem" }}
          >
            Configurer un tenant dédié
          </button>
        </div>
      ) : (
        <div className={avStyles.solutionList}>
          <div className={avStyles.solutionCard}>
            <div className={`${avStyles.solutionCardIcon} ${msStyles.headerIconMicrosoft}`}>
              <Icon icon="hugeicons:office-365" aria-hidden />
            </div>
            <div className={avStyles.solutionCardMain}>
              <div className={avStyles.solutionName} title={summary.label}>
                {summary.label}
              </div>
              <div className={avStyles.solutionMeta}>
                {summary.providerName}
                {" · "}
                {summary.mode}
                {summary.tenantId ? ` · ${summary.shortTenantId}` : ""}
              </div>
              {connectionStatus === "success" && applicationDisplayName ? (
                <div className={avStyles.solutionMeta}>
                  Application : {applicationDisplayName}
                </div>
              ) : null}
              {secretExpiration ? (
                <div className={avStyles.solutionMeta}>
                  Secret expire le{" "}
                  {new Date(secretExpiration).toLocaleDateString("fr-FR")}
                </div>
              ) : null}
            </div>
            <div className={avStyles.solutionCardButtons}>
              {onViewTenant ? (
                <button
                  type="button"
                  className={avStyles.solutionIconBtn}
                  onClick={() => onViewTenant(credentials)}
                  disabled={deleting}
                  aria-label="Voir les statistiques"
                  title="Voir les statistiques"
                >
                  <Icon icon="mdi:chart-box-outline" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                className={avStyles.solutionIconBtn}
                onClick={() => setActiveSection("configuration")}
                disabled={deleting}
                aria-label="Éditer le tenant"
                title="Éditer"
              >
                <Icon icon="mdi:pencil-outline" aria-hidden />
              </button>
              <button
                type="button"
                className={`${avStyles.solutionIconBtn} ${avStyles.solutionIconBtnDanger}`}
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleting}
                aria-label="Supprimer le tenant"
                title="Supprimer"
              >
                <Icon
                  icon={deleting ? "mdi:loading" : "mdi:delete-outline"}
                  className={deleting ? formStyles.spinning : ""}
                  aria-hidden
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderConfiguration = () => (
    <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Tenant dédié · Entra ID</h3>
        <p className={formStyles.sectionDesc}>
          Renseignez les identifiants de l&apos;application enregistrée sur le tenant du client.
          Aucune intégration globale n&apos;est utilisée : chaque entreprise possède ses propres
          credentials.
        </p>
      </div>

      <div className={avStyles.notice}>
        <Icon icon="mdi:information-outline" className={avStyles.noticeIcon} aria-hidden />
        <div>
          <strong>Première configuration</strong>
          Créez l&apos;application sur Entra ID en suivant le guide, puis testez la connexion avant
          d&apos;enregistrer.
        </div>
      </div>

      <form
        className={avStyles.dedicatedTenantForm}
        autoComplete="off"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ms-tenant-id">
            Tenant ID
          </label>
          <input
            id="ms-tenant-id"
            type="text"
            className={formStyles.input}
            value={form.tenantId}
            onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ms-client-id">
            Client ID (Application ID)
          </label>
          <input
            id="ms-client-id"
            type="text"
            className={formStyles.input}
            value={form.clientIdAzure}
            onChange={(e) => setForm({ ...form, clientIdAzure: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ms-secret-key-id">
            ID du secret (optionnel)
          </label>
          <input
            id="ms-secret-key-id"
            type="text"
            className={formStyles.input}
            value={form.secretKeyId}
            onChange={(e) => setForm({ ...form, secretKeyId: e.target.value })}
            placeholder="Identifiant du secret (Key ID)"
            autoComplete="off"
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ms-client-secret">
            Client Secret
          </label>
          <input
            id="ms-client-secret"
            type="password"
            className={formStyles.input}
            value={form.clientSecret}
            onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
            placeholder={
              existingCredentials
                ? `${STORED_SECRET_MASK} (inchangé si vide)`
                : "Valeur du secret client"
            }
            autoComplete="new-password"
          />
          <button
            type="button"
            className={integrationStyles.guideLinkBtn}
            onClick={() => setActiveSection("guide")}
          >
            <Icon icon="mdi:help-circle-outline" aria-hidden />
            Comment créer l&apos;application sur Entra ID ?
          </button>
        </div>
      </form>

      {(connectionStatus || secretExpiration) && (
        <div className={avStyles.inlineActions}>
          {connectionStatus ? (
            <span
              className={`${avStyles.connectionOk} ${
                connectionStatus === "error" ? avStyles.connectionError : ""
              }`}
            >
              {connectionStatus === "success"
                ? `Connecté${applicationDisplayName ? ` (${applicationDisplayName})` : ""}`
                : "Connexion en erreur"}
            </span>
          ) : null}
          {secretExpiration ? (
            <span className={formStyles.footerHint}>
              Secret expire le {new Date(secretExpiration).toLocaleDateString("fr-FR")}
            </span>
          ) : null}
        </div>
      )}
    </>
  );

  const renderSectionContent = () => {
    if (loading) {
      return (
        <div className={avStyles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          Chargement du tenant Microsoft…
        </div>
      );
    }
    switch (activeSection) {
      case "configuration":
        return renderConfiguration();
      case "guide":
        return <EntraApiGuide />;
      default:
        return renderOverview();
    }
  };

  const showConfigurationActions = activeSection === "configuration";

  if (!client?.id) return null;

  return (
    <>
      {createPortal(
        <div
          className={formStyles.overlay}
          onClick={saving || testingConnection || deleting ? undefined : onClose}
          role="presentation"
        >
          <div
            className={formStyles.shell}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="microsoft-tenant-config-modal-title"
          >
            <div className={formStyles.accentBar} aria-hidden />
            <header className={formStyles.header}>
              <div className={formStyles.headerMain}>
                <div
                  className={`${formStyles.headerIconWrap} ${msStyles.headerIconMicrosoft}`}
                  aria-hidden
                >
                  <Icon icon="hugeicons:office-365" />
                </div>
                <div className={formStyles.headerText}>
                  <p className={formStyles.eyebrow}>Services</p>
                  <h2 className={formStyles.title} id="microsoft-tenant-config-modal-title">
                    Tenant Microsoft
                  </h2>
                  <p className={formStyles.subtitle}>{client.name}</p>
                </div>
              </div>
              <button
                type="button"
                className={formStyles.closeBtn}
                onClick={onClose}
                disabled={saving || deleting}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </header>

            <div className={formStyles.body}>
              <nav className={formStyles.nav} aria-label="Sections tenant Microsoft">
                {navSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`${formStyles.navItem} ${
                      activeSection === section.id ? formStyles.navItemActive : ""
                    }`}
                    onClick={() => setActiveSection(section.id)}
                    aria-current={activeSection === section.id ? "step" : undefined}
                  >
                    <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                    <span className={formStyles.navItemText}>
                      <span className={formStyles.navItemLabel}>{section.label}</span>
                      <span className={formStyles.navItemHint}>{section.description}</span>
                    </span>
                    {sectionBadges[section.id] ? (
                      <span className={formStyles.navBadge} aria-hidden>
                        ✓
                      </span>
                    ) : null}
                  </button>
                ))}
              </nav>

              <div className={formStyles.content}>{renderSectionContent()}</div>
            </div>

            <footer className={formStyles.footer}>
              <span className={formStyles.footerHint}>
                {configured ? "Tenant dédié configuré" : "Aucun tenant configuré"}
              </span>
              <div className={formStyles.footerActions}>
                {showConfigurationActions ? (
                  <>
                    <button
                      type="button"
                      className={formStyles.ghostBtn}
                      onClick={handleTestConnection}
                      disabled={testingConnection || saving}
                    >
                      <Icon
                        icon={testingConnection ? "mdi:loading" : "mdi:lan-check"}
                        className={testingConnection ? formStyles.spinning : ""}
                        aria-hidden
                      />
                      Tester la connexion
                    </button>
                    <button
                      type="button"
                      className={formStyles.primaryBtn}
                      onClick={handleSave}
                      disabled={saving || testingConnection}
                    >
                      <Icon
                        icon={saving ? "mdi:loading" : "mdi:content-save-outline"}
                        className={saving ? formStyles.spinning : ""}
                        aria-hidden
                      />
                      {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </>
                ) : null}
              </div>
            </footer>
          </div>
        </div>,
        document.getElementById("modal-root") || document.body
      )}
      <ConfirmModal
        open={deleteConfirmOpen}
        title={configCopy.confirm.deleteMicrosoftTenant.title}
        message={interpolate(configCopy.confirm.deleteMicrosoftTenant.message, {
          label: summary.label,
        })}
        confirmLabel={common.delete}
        variant="danger"
        icon="mdi:delete-outline"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
}
