// ──────────────────────────────
// 📦 Dépendances & Config
// ──────────────────────────────
import { useState, useEffect } from "react";
import { fetchSettings, updateSetting } from "../../api/settings";
import API_BASE_URL from "../../config";
import styles from "./AdminPanel.module.css";
import { Icon } from "@iconify/react";
import { showSuccess, showError } from "../../utils/toast";
import { getIconPath } from "../../utils/assetHelper";

// 🔐 Liste des paramètres DB à gérer (avec les clés correctes)
const dbKeys = [
  { key: "db_host", label: "Hôte", type: "text" },
  { key: "db_port", label: "Port", type: "number" },
  { key: "db_name", label: "Base de données", type: "text" },
  { key: "db_user", label: "Utilisateur", type: "text" },
  { key: "db_password", label: "Mot de passe", type: "password" },
];

// 📧 Liste des paramètres Email à gérer
const emailKeys = [
  { key: "BUG_REPORT_EMAIL", label: "Email rapports de bugs", type: "email" },
  { key: "SMTP_HOST", label: "Serveur SMTP", type: "text" },
  { key: "SMTP_PORT", label: "Port SMTP", type: "number" },
];


// 🐙 Liste des paramètres GitHub à gérer
const githubKeys = [
  { key: "GITHUB_TOKEN", label: "Token GitHub", type: "password" },
  { key: "GITHUB_REPO_FRONT", label: "Repository Frontend", type: "url" },
  { key: "GITHUB_REPO_BACK", label: "Repository Backend", type: "url" },
];

// 🛡️ Liste des paramètres BitDefender GravityZone à gérer
const bitdefenderKeys = [
  { key: "BITDEFENDER_API_URL", label: "URL API", type: "url" },
  { key: "BITDEFENDER_API_KEY", label: "API Key", type: "password" },
];

// 📊 Liste des paramètres Check MK à gérer
const checkmkKeys = [
  { key: "CHECKMK_API_URL", label: "URL API Check MK", type: "url" },
  { key: "CHECKMK_USERNAME", label: "Nom d'utilisateur", type: "text" },
  { key: "CHECKMK_PASSWORD", label: "Mot de passe", type: "password" },
  { key: "CHECKMK_SITE", label: "Site par défaut (optionnel)", type: "text" },
];

// 🌐 Liste des paramètres OVH à gérer
const ovhKeys = [
  // L'application key peut être affichée en clair
  { key: "OVH_APPLICATION_KEY", label: "Application Key", type: "text" },
  { key: "OVH_APPLICATION_SECRET", label: "Application Secret", type: "password" },
  { key: "OVH_CONSUMER_KEY", label: "Consumer Key", type: "password" },
];

// 🔐 Liste des paramètres Entra ID (Microsoft Partner Center) à gérer
const entraIdKeys = [
  { key: "PARTNER_CENTER_APP_ID", label: "App ID", type: "text" },
  { key: "PARTNER_CENTER_TENANT_ID", label: "Tenant ID", type: "text" },
  { key: "PARTNER_CENTER_SECRET_ID", label: "Secret ID", type: "password" },
];



export default function AdminSettings() {
  const [settings, setSettings] = useState({}); // Utiliser un objet pour un accès plus simple
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [bitdefenderStatus, setBitdefenderStatus] = useState(null);
  const [checkmkStatus, setCheckmkStatus] = useState(null);
  const [ovhStatus, setOvhStatus] = useState(null);
  const [entraIdStatus, setEntraIdStatus] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSettings();
        // Transformer le tableau en objet pour un accès direct par clé
        const settingsObject = data.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});
        // Initialiser la valeur par défaut pour BITDEFENDER_API_KEY si elle n'existe pas
        if (!settingsObject.BITDEFENDER_API_KEY) {
          settingsObject.BITDEFENDER_API_KEY = "80361e4e85a823021b9fc4fc0dd9748bade4af17ef15cfd481abaa0f3c2d14d2";
        }
        setSettings(settingsObject);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, []);

  // 🔁 Test de la connexion DB au chargement
  useEffect(() => {
    const checkStatus = async () => {
      setDbStatus("loading");
      try {
        const res = await fetch(`${API_BASE_URL}/db-status`);
        const data = await res.json();
        setDbStatus(data.status === "ok" ? "ok" : "error");
      } catch {
        setDbStatus("error");
      }
    };
    checkStatus();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // 💾 Sauvegarde groupée des paramètres
  const handleSaveAllDBSettings = async () => {
    try {
      setLoading(true);
      await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          updateSetting(key, value)
        )
      );
      showSuccess("Paramètres enregistrés avec succès");
    } catch (err) {
      console.error(err);
      showError("Erreur lors de l'enregistrement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Test de connexion à la base de données
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/db-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      setTestResult(data);
      setShowTestModal(true);
    } catch (err) {
      setTestResult({
        success: false,
        error: 'Erreur de connexion au serveur',
        details: err.message
      });
      setShowTestModal(true);
    }
    setTestingConnection(false);
  };


  // 🔍 Test de connexion GitHub
  const handleTestGitHubConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/github-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      setTestResult(data);
      setShowTestModal(true);
    } catch (err) {
      setTestResult({
        success: false,
        error: 'Erreur de connexion à GitHub',
        details: err.message
      });
      setShowTestModal(true);
    }
    setTestingConnection(false);
  };

  // 🔍 Test de connexion BitDefender GravityZone
  const handleTestBitdefenderConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bitdefender/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      setTestResult(data);
      setShowTestModal(true);
    } catch (err) {
      setTestResult({
        success: false,
        error: 'Erreur de connexion à l\'API BitDefender GravityZone',
        details: err.message
      });
      setShowTestModal(true);
    }
    setTestingConnection(false);
  };

  // 🔍 Test de connexion Check MK
  const handleTestCheckMKConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/checkmk/hosts`, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok && data) {
        setCheckmkStatus("ok");
        setTestResult({
          success: true,
          message: 'Connexion à Check MK réussie',
          checkmkInfo: {
            hostsAvailable: Array.isArray(data.value) ? data.value.length : Array.isArray(data.items) ? data.items.length : Array.isArray(data) ? data.length : 0,
            apiUrl: data.url || 'N/A'
          }
        });
      } else {
        setCheckmkStatus("error");
        setTestResult({
          success: false,
          error: data.error || 'Erreur de connexion à Check MK',
          details: data.details || data.message || `HTTP ${res.status}: ${res.statusText}`
        });
      }
      setShowTestModal(true);
    } catch (err) {
      setCheckmkStatus("error");
      setTestResult({
        success: false,
        error: 'Erreur de connexion à l\'API Check MK',
        details: err.message
      });
      setShowTestModal(true);
    }
    setTestingConnection(false);
  };

  // 🔍 Test d'envoi d'email
  const handleTestEmailConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/email-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      setTestResult(data);
      setShowTestModal(true);
    } catch (err) {
      setTestResult({
        success: false,
        error: 'Erreur d\'envoi d\'email',
        details: err.message
      });
      setShowTestModal(true);
    }
    setTestingConnection(false);
  };

  // 🔍 Test de connexion OVH
  const handleTestOvhConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ovh/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOvhStatus("ok");
        setTestResult({
          success: true,
          message: 'Connexion à l\'API OVH réussie',
          ovhInfo: {
            domainsAvailable: data.domainsCount || 0,
            apiEndpoint: data.endpoint || 'N/A'
          }
        });
      } else {
        setOvhStatus("error");
        setTestResult({
          success: false,
          error: data.error || 'Erreur de connexion à l\'API OVH',
          details: data.details || data.message || `HTTP ${res.status}: ${res.statusText}`
        });
      }
      setShowTestModal(true);
    } catch (err) {
      setOvhStatus("error");
      setTestResult({
        success: false,
        error: 'Erreur de connexion à l\'API OVH',
        details: err.message
      });
      setShowTestModal(true);
    }
    setTestingConnection(false);
  };

  // 🔍 Test de connexion Entra ID (Microsoft Partner Center)
  const handleTestEntraIdConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner-center/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      // Si erreur 401, c'est un problème d'authentification
      if (res.status === 401) {
        setEntraIdStatus("error");
        setTestResult({
          success: false,
          error: 'Erreur d\'authentification',
          details: 'Votre session a expiré. Veuillez vous reconnecter et réessayer.'
        });
        setShowTestModal(true);
        setTestingConnection(false);
        showError('Votre session a expiré. Veuillez vous reconnecter.');
        return;
      }
      
      const data = await res.json();

      if (res.ok && data.success) {
        setEntraIdStatus("ok");
        setTestResult({
          success: true,
          message: data.warning ? data.message : 'Connexion à Partner Center API réussie',
          warning: data.warning,
          entraIdInfo: {
            partnersAvailable: data.partnersCount || 0,
            tenantId: data.tenantId || 'N/A',
            appName: data.appName || 'N/A',
            secretExpiry: data.secretExpiry || null,
            secretError: data.secretError || null,
            permissionError: data.permissionError || false,
            consentIssue: data.consentIssue || false,
            errorCode: data.errorCode || null,
            suggestion: data.suggestion,
            partnerCenterAuth: data.partnerCenterAuth !== undefined ? data.partnerCenterAuth : null,
            multiTenantInfo: data.multiTenantInfo || null,
            adminConsentUrl: data.adminConsentUrl || null
          }
        });
      } else {
        setEntraIdStatus("error");
        setTestResult({
          success: false,
          error: data.error || 'Erreur de connexion à Microsoft Graph API',
          details: data.details || data.message || `HTTP ${res.status}: ${res.statusText}`
        });
      }
      setShowTestModal(true);
    } catch (err) {
      setEntraIdStatus("error");
      setTestResult({
        success: false,
        error: 'Erreur de connexion à Microsoft Graph API',
        details: err.message
      });
      setShowTestModal(true);
    }
    setTestingConnection(false);
  };

  return (
    <div className={styles.simpleLayout}>
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon icon="simple-icons:postgresql" style={{ fontSize: '32px', color: '#15d1a0' }} />
            PostgreSQL
          </h2>
          <button
            className={styles.testButton}
            onClick={handleTestConnection}
            disabled={loading || testingConnection}
            title="Tester la connexion DB"
          >
            {testingConnection ? <Icon icon="mdi:loading" className={`${styles.testIcon} ${styles.loading}`} /> : <Icon icon="mdi:connection" className={styles.testIcon} />}
          </button>
        </div>

        {/* Contenu direct */}
        <div className={styles.simpleContent}>

          <div className={styles.settingsGrid}>
            {dbKeys.map(({ key, label, type }) => (
              <div key={key} className={styles.settingRow}>
                <label htmlFor={key} className={styles.label}>{label}</label>
                <input
                  id={key}
                  type={type}
                  value={settings[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  disabled={loading}
                  className={styles.input}
                />
              </div>
            ))}
          </div>
        </div>
        <p className={styles.sectionSubtitle} style={{ marginTop: 0, marginBottom: '1rem' }}>
          Connexion à la base de données principale.
        </p>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon icon="mdi:github" style={{ fontSize: '32px', color: '#15d1a0' }} />
            GitHub
          </h2>
          <button
            className={styles.testButton}
            onClick={handleTestGitHubConnection}
            disabled={loading || testingConnection}
            title="Tester la connexion GitHub"
          >
            {testingConnection ? <Icon icon="mdi:loading" className={`${styles.testIcon} ${styles.loading}`} /> : <Icon icon="mdi:connection" className={styles.testIcon} />}
          </button>
        </div>

        {/* Contenu GitHub */}
        <div className={styles.simpleContent}>
          <div className={styles.settingsGrid}>
            {githubKeys.map(({ key, label, type }) => (
              <div key={key} className={styles.settingRow}>
                <label htmlFor={key} className={styles.label}>{label}</label>
                <input
                  id={key}
                  type={type}
                  value={settings[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  disabled={loading}
                  className={styles.input}
                />
              </div>
            ))}
          </div>
        </div>
        <p className={styles.sectionSubtitle} style={{ marginTop: 0, marginBottom: '1rem' }}>
          Clés et dépôts GitHub pour les intégrations.
        </p>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon icon="mdi:email-outline" style={{ fontSize: '32px', color: '#15d1a0' }} />
            Email
          </h2>
          <button
            className={styles.testButton}
            onClick={handleTestEmailConnection}
            disabled={loading || testingConnection}
            title="Tester l'envoi d'email"
          >
            {testingConnection ? <Icon icon="mdi:loading" className={`${styles.testIcon} ${styles.loading}`} /> : <Icon icon="mdi:email-send" className={styles.testIcon} />}
          </button>
        </div>

        {/* Contenu Email */}
        <div className={styles.simpleContent}>
          <div className={styles.settingsGrid}>
            {emailKeys.map(({ key, label, type }) => (
              <div key={key} className={styles.settingRow}>
                <label htmlFor={key} className={styles.label}>{label}</label>
                <input
                  id={key}
                  type={type}
                  value={settings[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  disabled={loading}
                  className={styles.input}
                />
              </div>
            ))}
          </div>
        </div>
        <p className={styles.sectionSubtitle} style={{ marginTop: 0, marginBottom: '1rem' }}>
          Serveur SMTP et destinataire support.
        </p>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon icon="simple-icons:bitdefender" style={{ fontSize: '32px', color: '#15d1a0' }} />
            BitDefender
          </h2>
          <button
            className={styles.testButton}
            onClick={handleTestBitdefenderConnection}
            disabled={loading || testingConnection}
            title="Tester la connexion BitDefender"
          >
            {testingConnection ? <Icon icon="mdi:loading" className={`${styles.testIcon} ${styles.loading}`} /> : <Icon icon="mdi:connection" className={styles.testIcon} />}
          </button>
        </div>

        {/* Contenu BitDefender */}
        <div className={styles.simpleContent}>
          <div className={styles.settingsGrid}>
            {bitdefenderKeys.map(({ key, label, type }) => (
              <div key={key} className={styles.settingRow}>
                <label htmlFor={key} className={styles.label}>{label}</label>
                <input
                  id={key}
                  type={type}
                  value={settings[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  disabled={loading}
                  className={styles.input}
                  placeholder={key === "BITDEFENDER_API_URL" ? "https://votre-domaine-bitdefender.com/api" : ""}
                />
              </div>
            ))}
          </div>
        </div>
        <p className={styles.sectionSubtitle}>API GravityZone pour la protection endpoints.</p>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={getIconPath('checkmk.png')} alt="Check MK" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '8px' }} />
            Check MK
          </h2>
          <button
            className={styles.testButton}
            onClick={handleTestCheckMKConnection}
            disabled={loading || testingConnection}
            title="Tester la connexion Check MK"
          >
            {testingConnection ? <Icon icon="mdi:loading" className={`${styles.testIcon} ${styles.loading}`} /> : <Icon icon="mdi:connection" className={styles.testIcon} />}
          </button>
        </div>

        {/* Contenu Check MK */}
        <div className={styles.simpleContent}>
          <div className={styles.settingsGrid}>
            {checkmkKeys.map(({ key, label, type }) => (
              <div key={key} className={styles.settingRow}>
                <label htmlFor={key} className={styles.label}>{label}</label>
                <input
                  id={key}
                  type={type}
                  value={settings[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  disabled={loading}
                  className={styles.input}
                  placeholder={key === "CHECKMK_API_URL" ? "https://monitoring.example.com/check_mk/api" : ""}
                />
              </div>
            ))}
          </div>
        </div>
        <p className={styles.sectionSubtitle}>Paramètres CheckMK pour le monitoring.</p>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon icon="simple-icons:ovh" style={{ fontSize: '32px', color: '#15d1a0' }} />
            OVH
          </h2>
          <button
            className={styles.testButton}
            onClick={handleTestOvhConnection}
            disabled={loading || testingConnection}
            title="Tester la connexion OVH"
          >
            {testingConnection ? <Icon icon="mdi:loading" className={`${styles.testIcon} ${styles.loading}`} /> : <Icon icon="mdi:connection" className={styles.testIcon} />}
          </button>
        </div>

        {/* Contenu OVH */}
        <div className={styles.simpleContent}>
          <div className={styles.settingsGrid}>
            {ovhKeys.map(({ key, label, type }) => (
              <div key={key} className={styles.settingRow}>
                <label htmlFor={key} className={styles.label}>{label}</label>
                <input
                  id={key}
                  type={type}
                  value={settings[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  disabled={loading}
                  className={styles.input}
                  placeholder={key === "OVH_APPLICATION_KEY" ? "Votre Application Key OVH" : key === "OVH_CONSUMER_KEY" ? "Votre Consumer Key OVH" : ""}
                />
              </div>
            ))}
          </div>
        </div>
        <p className={styles.sectionSubtitle}>Clés OVH pour domaines, DNS et services.</p>
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon icon="mdi:microsoft-azure" style={{ fontSize: '32px', color: '#15d1a0' }} />
            Entra ID
          </h2>
          <button
            className={styles.testButton}
            onClick={handleTestEntraIdConnection}
            disabled={loading || testingConnection}
            title="Tester la connexion Entra ID"
          >
            {testingConnection ? <Icon icon="mdi:loading" className={`${styles.testIcon} ${styles.loading}`} /> : <Icon icon="mdi:connection" className={styles.testIcon} />}
          </button>
        </div>

        {/* Contenu Entra ID */}
        <div className={styles.simpleContent}>
          <div className={styles.settingsGrid}>
            {entraIdKeys.map(({ key, label, type }) => (
              <div key={key} className={styles.settingRow}>
                <label htmlFor={key} className={styles.label}>{label}</label>
                <input
                  id={key}
                  type={type}
                  value={settings[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  disabled={loading}
                  className={styles.input}
                  placeholder={key === "PARTNER_CENTER_APP_ID" ? "Votre App ID Azure AD" : key === "PARTNER_CENTER_TENANT_ID" ? "Votre Tenant ID Azure AD" : ""}
                />
              </div>
            ))}
          </div>
        </div>
        <p className={styles.sectionSubtitle}>Identifiants Entra ID pour Microsoft Partner Center.</p>
      </div>

      {/* Actions finales */}
      <div className={styles.finalActions}>
        <button
          className={styles.primaryButton}
          onClick={handleSaveAllDBSettings}
          disabled={loading || dbStatus === "loading"}
        >
          {loading || dbStatus === "loading"
            ? "Chargement..."
            : "Enregistrer toutes les modifications"}
        </button>
      </div>

      {/* Modal de test de connexion */}
      {showTestModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTestModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', lineHeight: '1.2' }}>
                <Icon icon="mdi:connection" className={styles.modalIcon} />
                <h3>Résultat du test de connexion</h3>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setShowTestModal(false)}
                title="Fermer"
              >
                <Icon icon="mdi:close" width={20} height={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {testResult?.success ? (
                <div className={styles.successResult}>
                  <div className={styles.statusIcon}>
                    <Icon icon="mingcute:certificate-fill" style={{ color: '#15d1a0', fontSize: '64px' }} />
                  </div>
                  <h4>Test réussi</h4>
                  {testResult.databaseInfo && (
                    <div className={styles.databaseInfo}>
                      <ul>
                        <li><strong>Version :</strong> {testResult.databaseInfo.version}</li>
                        <li><strong>Nom :</strong> {testResult.databaseInfo.database}</li>
                        <li><strong>Serveur :</strong> {testResult.databaseInfo.host}</li>
                        <li><strong>Port :</strong> {testResult.databaseInfo.port}</li>
                      </ul>
                    </div>
                  )}
                  {testResult.githubInfo && (
                    <div className={styles.databaseInfo}>
                      <ul>
                        <li><strong>Utilisateur :</strong> {testResult.githubInfo.user}</li>
                        <li><strong>Nom :</strong> {testResult.githubInfo.name}</li>
                        <li><strong>Email :</strong> {testResult.githubInfo.email}</li>
                        <li><strong>Token :</strong> {testResult.githubInfo.token}</li>
                        {testResult.githubInfo.repositories && Object.keys(testResult.githubInfo.repositories).length > 0 && (
                          <li><strong>Repositories :</strong>
                            <ul>
                              {testResult.githubInfo.repositories.frontend && (
                                <li>Frontend: {testResult.githubInfo.repositories.frontend}</li>
                              )}
                              {testResult.githubInfo.repositories.backend && (
                                <li>Backend: {testResult.githubInfo.repositories.backend}</li>
                              )}
                            </ul>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  {testResult.emailInfo && (
                    <div className={styles.databaseInfo}>
                      <ul>
                        <li><strong>Destinataire :</strong> {testResult.emailInfo.to}</li>
                        <li><strong>Serveur SMTP :</strong> {testResult.emailInfo.smtpHost}:{testResult.emailInfo.smtpPort}</li>
                        <li><strong>Message ID :</strong> {testResult.emailInfo.messageId}</li>
                        <li><strong>Réponse :</strong> {testResult.emailInfo.response}</li>
                      </ul>
                    </div>
                  )}
                  {testResult.bitdefenderInfo && (
                    <div className={styles.databaseInfo}>
                      <ul>
                        <li><strong>URL API :</strong> {testResult.bitdefenderInfo.apiUrl}</li>
                        <li><strong>API Key :</strong> {testResult.bitdefenderInfo.apiKey}</li>
                        <li><strong>Entreprises disponibles :</strong> {testResult.bitdefenderInfo.companiesAvailable || 0}</li>
                      </ul>
                    </div>
                  )}
                  {testResult.checkmkInfo && (
                    <div className={styles.databaseInfo}>
                      <ul>
                        <li><strong>Hosts disponibles :</strong> {testResult.checkmkInfo.hostsAvailable || 0}</li>
                      </ul>
                    </div>
                  )}
                  {testResult.ovhInfo && (
                    <div className={styles.databaseInfo}>
                      <ul>
                        <li><strong>Domaines disponibles :</strong> {testResult.ovhInfo.domainsAvailable || 0}</li>
                        <li><strong>Endpoint API :</strong> {testResult.ovhInfo.apiEndpoint || 'N/A'}</li>
                      </ul>
                    </div>
                  )}
                  {testResult.entraIdInfo && (
                    <div className={styles.databaseInfo}>
                      <ul>
                        <li>
                          <strong>Nom de l'application :</strong> {testResult.entraIdInfo.appName || 'N/A'}
                          {testResult.entraIdInfo.consentIssue && (
                            <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                              ❌ Consentement administrateur requis
                            </span>
                          )}
                          {testResult.entraIdInfo.permissionError && !testResult.entraIdInfo.consentIssue && (
                            <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                              ⚠️ Permissions insuffisantes
                            </span>
                          )}
                        </li>
                        <li><strong>Tenant ID :</strong> {testResult.entraIdInfo.tenantId || 'N/A'}</li>
                        <li>
                          <strong>Date d'expiration du secret :</strong> {
                            testResult.entraIdInfo.secretExpiry 
                              ? new Date(testResult.entraIdInfo.secretExpiry).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'N/A'
                          }
                          {testResult.entraIdInfo.secretError && (
                            <div style={{ 
                              marginTop: '0.25rem', 
                              fontSize: '0.85rem', 
                              color: '#dc2626',
                              fontStyle: 'italic'
                            }}>
                              {testResult.entraIdInfo.secretError}
                            </div>
                          )}
                        </li>
                        <li>
                          <strong>Authentification Partner Center :</strong> {
                            testResult.entraIdInfo.partnerCenterAuth === null 
                              ? 'N/A' 
                              : testResult.entraIdInfo.partnerCenterAuth 
                                ? <span style={{ color: '#16a34a' }}>✓ Réussie</span>
                                : <span style={{ color: '#dc2626' }}>✗ Échouée</span>
                          }
                        </li>
                        <li><strong>Partenaires disponibles :</strong> {testResult.entraIdInfo.partnersAvailable || 0}</li>
                        {testResult.entraIdInfo.multiTenantInfo && (
                          <li>
                            <strong>Application multi-tenant :</strong> {
                              testResult.entraIdInfo.multiTenantInfo.isMultiTenant 
                                ? <span style={{ color: '#16a34a' }}>✓ Oui ({testResult.entraIdInfo.multiTenantInfo.signInAudience})</span>
                                : <span style={{ color: '#dc2626' }}>✗ Non ({testResult.entraIdInfo.multiTenantInfo.signInAudience})</span>
                            }
                          </li>
                        )}
                        {testResult.entraIdInfo.adminConsentUrl && (
                          <li>
                            <strong>URL de consentement administrateur :</strong>
                            <div style={{ marginTop: '0.25rem' }}>
                              <a 
                                href={testResult.entraIdInfo.adminConsentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  color: '#2563eb', 
                                  textDecoration: 'underline',
                                  fontSize: '0.9rem',
                                  wordBreak: 'break-all'
                                }}
                              >
                                {testResult.entraIdInfo.adminConsentUrl}
                              </a>
                              <div style={{ 
                                marginTop: '0.25rem', 
                                fontSize: '0.85rem', 
                                color: '#6b7280',
                                fontStyle: 'italic'
                              }}>
                                Cliquez sur ce lien pour créer le Service Principal dans les tenants clients
                              </div>
                            </div>
                          </li>
                        )}
                        {testResult.entraIdInfo.errorCode && (
                          <li style={{ color: '#dc2626' }}>
                            <strong>Code d'erreur :</strong> {testResult.entraIdInfo.errorCode}
                          </li>
                        )}
                      </ul>
                      {testResult.warning && (testResult.entraIdInfo?.consentIssue || testResult.entraIdInfo?.permissionError) && (
                        <div style={{ 
                          marginTop: '1rem', 
                          padding: '0.75rem', 
                          backgroundColor: '#fee2e2', 
                          border: '1px solid #dc2626', 
                          borderRadius: '6px',
                          color: '#991b1b'
                        }}>
                          <strong>
                            {testResult.entraIdInfo?.consentIssue 
                              ? '❌ CONSENTEMENT ADMINISTRATEUR REQUIS :' 
                              : '❌ Erreur de permissions :'
                            }
                          </strong>
                          <pre style={{ 
                            whiteSpace: 'pre-wrap', 
                            margin: '0.5rem 0 0 0',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                            lineHeight: '1.5'
                          }}>{testResult.warning}</pre>
                          {testResult.entraIdInfo.suggestion && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <strong>Suggestion :</strong>
                              <pre style={{ 
                                whiteSpace: 'pre-wrap', 
                                margin: '0.5rem 0 0 0',
                                fontSize: '0.875rem',
                                fontFamily: 'inherit'
                              }}>{testResult.entraIdInfo.suggestion}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.errorResult}>
                  <div className={styles.statusIcon}>
                    <Icon icon="mdi:close-circle" style={{ color: '#dc2626', fontSize: '64px' }} />
                  </div>
                  <h4>Erreur de connexion</h4>
                  {testResult?.details && (
                    <div className={styles.errorDetails}>
                      <h5>Détails :</h5>
                      <pre>{testResult.details}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
