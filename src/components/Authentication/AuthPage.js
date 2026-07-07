import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuthContext } from "../../contexts/AuthContext";
import { useForceLightTheme } from "../../hooks/useForceLightTheme";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import MaintenanceBanner from "../Misc/MaintenanceBanner/MaintenanceBanner";
import SystemOutagePage from "./SystemOutagePage";
import { getMaintenanceStatus } from "../../api/maintenance";
import { getSetupStatus } from "../../api/setup";
import { showSuccess, showError } from "../../utils/toast";
import { interpolate } from "../../i18n/translate";
import { getAuthCopy } from "./authI18n";
import API_BASE_URL from "../../config";
import { fetchLoginBranding } from "../../api/loginBranding";
import {
  buildLoginBrandingStyleVars,
  mergeBrandingWithAuthCopy,
} from "../../utils/loginBrandingUtils";
import AppVersion from "../Misc/AppVersion";
import EditionBadge from "../Misc/EditionBadge";
import { getSafeReturnPath } from "../../navigation/agentRoutes";
import styles from "./AuthPage.module.css";

export default function AuthPage() {
  useForceLightTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const locale = useAppLocale();
  const copy = useMemo(() => getAuthCopy(locale), [locale]);

  const {
    email, setEmail,
    password, setPassword,
    rememberMe, setRememberMe,
    showPassword, setShowPassword,
    loading, handleLogin,
    mfaPending, handleMfaLogin, cancelMfaLogin,
    user, userRole,
  } = useAuthContext();

  const [view, setView] = useState("login");
  const [accountType, setAccountType] = useState("agent");
  const [submitting, setSubmitting] = useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [statusRetrying, setStatusRetrying] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState("");
  const [apiVersion, setApiVersion] = useState(null);
  const [setupPending, setSetupPending] = useState(null);
  const [loginBranding, setLoginBranding] = useState(null);

  const formRef = useRef();

  const [mfaCode, setMfaCode] = useState("");

  const busy = loading || submitting;
  const authPanel = copy.panel[accountType];
  const activeBranding = useMemo(
    () => mergeBrandingWithAuthCopy(loginBranding?.[accountType], authPanel, accountType),
    [loginBranding, accountType, authPanel]
  );
  const panelHeadline = (
    <>
      {activeBranding.headlineLine1}
      <br />
      {activeBranding.headlineLine2}
    </>
  );
  const brandingStyleVars = useMemo(
    () => (activeBranding.custom ? buildLoginBrandingStyleVars(activeBranding, accountType) : null),
    [activeBranding, accountType]
  );

  const runSystemChecks = useCallback(async ({ showRetrying = false } = {}) => {
    if (showRetrying) setStatusRetrying(true);

    const checkEndpoint = async (endpoint, setter) => {
      try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`);
        const json = await res.json();
        if (endpoint === "/status" && json.version) {
          setApiVersion(json.version);
        }
        setter(json.status === "ok" ? "ok" : "error");
      } catch {
        setter("error");
      }
    };

    await Promise.all([
      checkEndpoint("/status", setServerStatus),
      checkEndpoint("/db-status", setDbStatus),
    ]);
    setLastCheck(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    setStatusChecked(true);
    if (showRetrying) setStatusRetrying(false);
  }, []);

  useEffect(() => {
    getSetupStatus()
      .then((status) => setSetupPending(Boolean(status?.needsSetup)))
      .catch(() => setSetupPending(false));
  }, []);

  useEffect(() => {
    fetchLoginBranding()
      .then((data) => setLoginBranding(data))
      .catch(() => setLoginBranding({ pro: false, agent: null, client: null }));
  }, []);

  useEffect(() => {
    if (setupPending) {
      navigate("/setup", { replace: true });
    }
  }, [setupPending, navigate]);

  useEffect(() => {
    if (!user || !userRole) return;
    if (location.pathname !== "/login") return;
    const rawFrom = typeof location.state?.from === "string" ? location.state.from : "/";
    const target = userRole === "client" ? "/client" : getSafeReturnPath(rawFrom);
    navigate(target, { replace: true });
  }, [user, userRole, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (setupPending) return undefined;

    runSystemChecks();
    const timer = setInterval(() => runSystemChecks(), 30000);

    getMaintenanceStatus()
      .then(setMaintenanceStatus)
      .catch(() => setMaintenanceStatus({ enabled: false }));

    return () => clearInterval(timer);
  }, [runSystemChecks, setupPending]);

  const goTo = (next) => {
    setPassword("");
    setShowPassword(false);

    if (next === "login") {
      const saved = localStorage.getItem("rememberedEmail");
      setEmail(saved || "");
      setRememberMe(!!saved);
    } else {
      setEmail("");
    }

    setView(next);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    handleLogin(accountType);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email) {
      showError("Veuillez saisir votre email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        showSuccess(copy.toasts.forgotSuccess);
        goTo("login");
      } else {
        showError(copy.toasts.forgotError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const systemHealthy = serverStatus === "ok" && dbStatus === "ok";
  const allOk = systemHealthy;

  if (setupPending === null || setupPending) {
    return (
      <div className={styles.statusBootScreen}>
        <span className={styles.spinner} aria-hidden="true" />
        <p>{setupPending ? copy.boot.redirectSetup : copy.boot.checkingSetup}</p>
      </div>
    );
  }

  if (!statusChecked) {
    return (
      <div className={styles.statusBootScreen}>
        <span className={styles.spinner} aria-hidden="true" />
        <p>{copy.boot.checkingService}</p>
      </div>
    );
  }

  if (!systemHealthy) {
    return (
      <SystemOutagePage
        serverStatus={serverStatus}
        dbStatus={dbStatus}
        lastCheck={lastCheck}
        onRetry={() => runSystemChecks({ showRetrying: true })}
        retrying={statusRetrying}
        locale={locale}
      />
    );
  }

  return (
    <div
      className={styles.wrapper}
      style={brandingStyleVars ? { "--login-accent": activeBranding.colors.accentColor } : undefined}
    >
      {maintenanceStatus?.enabled && (
        <MaintenanceBanner message={maintenanceStatus.message} />
      )}

      {/* ── Panneau gauche ── */}
      <aside
        className={`${styles.left} ${!activeBranding.custom && accountType === "client" ? styles.leftClient : ""} ${activeBranding.custom ? styles.leftBranded : ""}`}
        style={brandingStyleVars || undefined}
      >
        <div className={styles.leftTop}>
          <div className={styles.brand}>
            {activeBranding.logoUrl ? (
              <img src={activeBranding.logoUrl} alt="" className={styles.brandLogo} />
            ) : (
              <div className={styles.brandIcon}>V</div>
            )}
            <span className={styles.brandName}>{activeBranding.brandName || "Veritas"}</span>
            <AppVersion variant="dark" />
          </div>
          <h2 className={styles.leftHeadline}>{panelHeadline}</h2>
          <p className={styles.leftSub}>{activeBranding.sub}</p>
        </div>
        <ul className={styles.leftFeatures}>
          {activeBranding.features.map((f) => (
            <li key={f} className={styles.leftFeature}>
              <span className={styles.leftFeatureDot} />
              {f}
            </li>
          ))}
        </ul>
        <div className={styles.leftFooterMeta}>
          {apiVersion && <span className={styles.leftVersionMeta}>API v{apiVersion}</span>}
          <EditionBadge variant="dark" />
        </div>
      </aside>

      {/* ── Panneau droit ── */}
      <main
        className={styles.right}
        style={activeBranding.custom ? { background: activeBranding.colors.rightBgColor } : undefined}
      >
        <div className={styles.card}>
          {busy && (
            <div className={styles.loadingOverlay} aria-hidden="true">
              <span className={styles.spinner} />
            </div>
          )}

          {/* Toggle Agent / Client */}
          <div className={styles.accountToggle}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${accountType === "agent" ? styles.toggleActive : ""}`}
              onClick={() => { setAccountType("agent"); goTo("login"); }}
              disabled={busy}
            >
              {copy.accountToggle.agent}
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${accountType === "client" ? styles.toggleActive : ""}`}
              onClick={() => { setAccountType("client"); goTo("login"); }}
              disabled={busy}
            >
              {copy.accountToggle.client}
            </button>
          </div>

          <header className={styles.cardHeader}>
            {!mfaPending && view !== "login" && (
              <button type="button" className={styles.backBtn} onClick={() => goTo("login")} disabled={busy}>
                {copy.back}
              </button>
            )}
            {mfaPending && (
              <button type="button" className={styles.backBtn} onClick={cancelMfaLogin} disabled={busy}>
                {copy.back}
              </button>
            )}
            <h1 className={styles.cardTitle}>
              {mfaPending ? copy.mfa.title : copy.views[view].title}
            </h1>
            <p className={styles.cardSub}>
              {mfaPending ? copy.mfa.sub : copy.views[view].sub}
            </p>
          </header>

          <div className={styles.viewBody} key={mfaPending ? "mfa" : `${view}-${accountType}`}>
            {mfaPending ? (
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (mfaCode.length === 6) handleMfaLogin(mfaCode);
                }}
              >
                <div className={styles.field}>
                  <label htmlFor="mfa-code">{copy.mfa.codeLabel}</label>
                  <input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    disabled={busy}
                    required
                    placeholder="000000"
                    className={styles.mfaCodeInput}
                  />
                </div>
                <button type="submit" className={styles.btnPrimary} disabled={busy || mfaCode.length < 6}>
                  {copy.mfa.submit}
                </button>
              </form>
            ) : view === "login" && (
              <form ref={formRef} className={styles.form} onSubmit={handleLoginSubmit}>
                <Field
                  label={copy.fields.email} id="auth-email" type="email" autoComplete="email"
                  value={email} onChange={setEmail} disabled={busy} required
                  placeholder={accountType === "client" ? copy.placeholders.emailClient : copy.placeholders.emailAgent}
                />
                <PasswordField
                  id="auth-password"
                  label={copy.fields.password}
                  showLabel={copy.fields.showPassword}
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword((p) => !p)}
                  disabled={busy}
                />
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={busy}
                  />
                  {copy.fields.rememberMe}
                </label>
                <button type="submit" className={styles.btnPrimary} disabled={busy}>
                  {copy.fields.login}
                </button>
                <div className={styles.formLinks}>
                  <button type="button" className={styles.link} onClick={() => goTo("forgot")} disabled={busy}>
                    {copy.fields.forgotPassword}
                  </button>
                </div>
              </form>
            )}

            {!mfaPending && view === "forgot" && (
              <form className={styles.form} onSubmit={handleForgot}>
                <Field
                  label={copy.fields.email} id="forgot-email" type="email" autoComplete="email"
                  value={email} onChange={setEmail} disabled={busy} required
                />
                <button type="submit" className={styles.btnPrimary} disabled={busy}>
                  {copy.fields.sendLink}
                </button>
              </form>
            )}
          </div>

          <footer className={styles.footer}>
            <p>{activeBranding.footerText || copy.footer}</p>
          </footer>
        </div>
      </main>

      {/* ── Status dock ── */}
      <div className={styles.statusDock}>
        <button
          type="button"
          className={`${styles.statusFab} ${allOk ? styles.statusFabOk : styles.statusFabError}`}
          onClick={() => setStatusOpen((p) => !p)}
          aria-expanded={statusOpen}
        >
          <span className={styles.statusFabDot} />
          {copy.status.title}
        </button>
        {statusOpen && (
          <div className={styles.statusPanel}>
            <StatusRow label={copy.status.api} status={serverStatus} />
            <StatusRow label={copy.status.database} status={dbStatus} />
            {apiVersion && <p className={styles.statusMeta}>Veritas API v{apiVersion}</p>}
            <p className={styles.statusMeta}>{interpolate(copy.status.checkedAt, { time: lastCheck || "--:--" })}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, id, type, value, onChange, disabled, required, autoComplete, placeholder }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
    </div>
  );
}

function PasswordField({ id, label, showLabel, value, onChange, show, onToggle, disabled }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="current-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required
        />
        <button
          type="button"
          className={styles.eyeBtn}
          onClick={onToggle}
          tabIndex={-1}
          aria-label={showLabel}
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </div>
  );
}

function StatusRow({ label, status }) {
  return (
    <div className={styles.statusRow}>
      <span>{label}</span>
      <span className={status === "ok" ? styles.dotOk : styles.dotError} />
    </div>
  );
}
