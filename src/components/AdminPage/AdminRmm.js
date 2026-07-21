import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchClientsList } from "../../api/clients";
import { createRmmEnrollmentToken, downloadRmmWindowsAgentSetup, downloadRmmWindowsAgentSetupMsi, downloadRmmWindowsAgentSetupZip, fetchRmmInstallerInfo, fetchRmmMetricsStorage, fetchRmmAgents, fetchRmmEnrollmentTokens, fetchRmmSettings, revokeRmmEnrollmentToken, restoreRmmEnrollmentToken, deleteRmmEnrollmentTokenPermanently, updateRmmAgentStatus, updateRmmSettings } from "../../api/rmm";
import { Badge, Btn, Card, ConfirmModal, Page, SubTabs, Table, Pagination, BtnIcon } from "./AdminUi";
import { useTablePagination } from "./useTablePagination";
import adminUi from "./AdminUi.module.css";
import { Icon } from "@iconify/react";
import RmmEnrollmentTokenValue from "../Rmm/RmmEnrollmentTokenValue";
import RmmEnrollmentTokenFormModal from "./RmmEnrollmentTokenFormModal";
import RmmEnrollmentTokenCreatedModal from "./RmmEnrollmentTokenCreatedModal";
import { buildDefaultTokenDraft } from "./rmmTokenConstants";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import RmmClientSettingsPanel from "./RmmClientSettingsPanel";
import { RmmCollectorsSection, RmmMetricsStorageSection, RmmTimingFields } from "./RmmSettingsBlocks";
import RmmConsumptionsPanel from "./RmmConsumptionsPanel";
import { DEFAULT_METRICS } from "./rmmMetricsStorageUtils";
import styles from "./AdminRmm.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminModalCopy } from "./adminModalsI18n";
import { formatRmmClientLabel, formatRmmDateTime, getAdminRmmCopy, interpolate } from "./adminRmmI18n";
const DEPLOY_PLATFORM_KEYS = ["windows", "macos", "linux", "ios", "android", "chromeos"];
const RMM_TAB_KEYS = [{
  key: "deploy",
  icon: "mdi:download-outline"
}, {
  key: "settings",
  icon: "mdi:cog-outline"
}, {
  key: "clientSettings",
  icon: "mdi:office-building-outline",
  proOnly: true,
  promoKey: "adminRmmClientSettings"
}, {
  key: "tokens",
  icon: "mdi:key-outline"
}, {
  key: "agents",
  icon: "mdi:laptop"
}, {
  key: "consumptions",
  icon: "mdi:chart-box-outline"
}];
const DEPLOY_PLATFORM_META = {
  windows: {
    icon: "mdi:microsoft-windows",
    available: true
  },
  macos: {
    icon: "mdi:apple",
    available: false
  },
  linux: {
    icon: "mdi:linux",
    available: false
  },
  ios: {
    icon: "mdi:apple-ios",
    available: false
  },
  android: {
    icon: "mdi:android",
    available: false
  },
  chromeos: {
    icon: "mdi:google-chrome",
    available: false
  }
};
function DeployPlatformInstructions({
  platformKey,
  copy,
  installerInfo,
  downloading,
  onDownloadWindows,
  onOpenTokensTab
}) {
  if (platformKey === "windows") {
    return <>
        <strong>{copy.deploy.windows.title}</strong>
        <div className={styles.instructionsDownloads}>
          <Btn icon="mdi:download" onClick={() => onDownloadWindows("msi")} disabled={!!downloading}>
            {downloading === "msi" ? copy.common.downloading : copy.deploy.windows.downloadMsi}
          </Btn>
          <Btn variant="ghost" icon="mdi:folder-zip-outline" onClick={() => onDownloadWindows("zip")} disabled={!!downloading}>
            {downloading === "zip" ? copy.common.downloading : copy.deploy.windows.downloadZip}
          </Btn>
          <Btn variant="ghost" icon="mdi:console" onClick={() => onDownloadWindows("cmd")} disabled={!!downloading}>
            {downloading === "cmd" ? copy.common.downloading : copy.deploy.windows.downloadCmd}
          </Btn>
          {installerInfo?.version ? <Badge variant="muted">
              {copy.common.build} {installerInfo.version}
            </Badge> : null}
        </div>
        <ol>
          <li>
            {copy.deploy.windows.step1.split("(")[0].trim()} (
            <button type="button" className={styles.tabLink} onClick={onOpenTokensTab}>
              {copy.deploy.windows.tokensTabLink}
            </button>
            ).
          </li>
          <li>{copy.deploy.windows.step2}</li>
          <li>{copy.deploy.windows.step3}</li>
          <li>{copy.deploy.windows.step4}</li>
        </ol>
      </>;
  }
  const platformCopy = copy.deploy.platforms[platformKey];
  const title = platformCopy?.title || copy.deploy.soon.defaultPlatform;
  return <>
      <strong>{interpolate(copy.deploy.soon.title, {
        platform: title
      })}</strong>
      <p className={styles.instructionsSoon}>
        {interpolate(copy.deploy.soon.message, {
        platform: title
      })}
      </p>
    </>;
}
function mapTokenTableRow(token, locale) {
  return {
    id: token.id,
    client_name: token.client_name || "-",
    token: token.token,
    label: token.label || "-",
    uses_count: token.max_uses != null ? `${token.uses_count} / ${token.max_uses}` : String(token.uses_count ?? 0),
    expires_at: token.expires_at ? formatRmmDateTime(token.expires_at, locale) : "-",
    created_at: token.created_at ? formatRmmDateTime(token.created_at, locale) : "-",
    revoked_at: token.revoked_at ? formatRmmDateTime(token.revoked_at, locale) : "-"
  };
}
export default function AdminRmm({
  isCommunity = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminRmmCopy(locale), [locale]);
  const rmmCopy = useMemo(() => getAdminModalCopy(locale, "rmmToken"), [locale]);
  const [tab, setTab] = useState("deploy");
  const [settings, setSettings] = useState(null);
  const [activeTokens, setActiveTokens] = useState([]);
  const [trashedTokens, setTrashedTokens] = useState([]);
  const [agents, setAgents] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenDraft, setTokenDraft] = useState(buildDefaultTokenDraft());
  const [creatingToken, setCreatingToken] = useState(false);
  const [createdToken, setCreatedToken] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(null);
  const [tokenListView, setTokenListView] = useState("active");
  const [downloading, setDownloading] = useState(null);
  const [installerInfo, setInstallerInfo] = useState(null);
  const [metricsStorage, setMetricsStorage] = useState(null);
  const [selectedDeployPlatform, setSelectedDeployPlatform] = useState("windows");
  const rmmTabs = useMemo(() => RMM_TAB_KEYS.map(item => ({
    ...item,
    label: copy.tabs[item.key],
    proOnly: isCommunity && Boolean(item.proOnly)
  })), [isCommunity, copy.tabs]);
  const deployPlatforms = useMemo(() => DEPLOY_PLATFORM_KEYS.map(key => ({
    key,
    ...DEPLOY_PLATFORM_META[key],
    title: copy.deploy.platforms[key]?.title || key,
    hint: copy.deploy.platforms[key]?.hint || ""
  })), [copy.deploy.platforms]);
  useEffect(() => {
    if (isCommunity && tab === "clientSettings") {
      setTab("settings");
    }
  }, [isCommunity, tab]);
  const handleTabChange = key => {
    const item = RMM_TAB_KEYS.find(entry => entry.key === key);
    if (isCommunity && item?.proOnly) {
      setProPromoFeature(item.promoKey || "adminRmmClientSettings");
      return;
    }
    setTab(key);
  };
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, activeTokensData, trashedTokensData, agentsData, clientsData, installerData, storageData] = await Promise.all([fetchRmmSettings(), fetchRmmEnrollmentTokens(undefined, {
        status: "active"
      }), fetchRmmEnrollmentTokens(undefined, {
        status: "revoked"
      }), fetchRmmAgents(), fetchClientsList(), fetchRmmInstallerInfo().catch(() => null), fetchRmmMetricsStorage().catch(() => null)]);
      setSettings(settingsData);
      setMetricsStorage(storageData);
      setActiveTokens(Array.isArray(activeTokensData) ? activeTokensData : []);
      setTrashedTokens(Array.isArray(trashedTokensData) ? trashedTokensData : []);
      setAgents(Array.isArray(agentsData) ? agentsData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setInstallerInfo(installerData);
    } catch (err) {
      toast.error(err.message || copy.toast.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.toast.loadError]);
  useEffect(() => {
    loadAll();
  }, [loadAll]);
  const clientOptions = useMemo(() => [...clients].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), locale)).map(c => ({
    value: String(c.id),
    label: c.name || formatRmmClientLabel(c.id, copy)
  })), [clients, locale, copy]);
  const displayedTokens = tokenListView === "trash" ? trashedTokens : activeTokens;
  const tokensPagination = useTablePagination(displayedTokens, {
    resetDeps: [tokenListView]
  });
  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = isCommunity ? {
        heartbeatIntervalMinutes: settings.heartbeatIntervalMinutes,
        offlineThresholdMinutes: settings.offlineThresholdMinutes,
        metrics: settings.metrics
      } : settings;
      const updated = await updateRmmSettings(payload);
      setSettings(updated);
      const storageData = await fetchRmmMetricsStorage().catch(() => null);
      setMetricsStorage(storageData);
      toast.success(copy.toast.settingsSaved);
    } catch (err) {
      toast.error(err.message || copy.toast.saveError);
    } finally {
      setSaving(false);
    }
  };
  const openCreateTokenModal = () => {
    setTokenDraft(buildDefaultTokenDraft());
    setTokenModalOpen(true);
  };
  const closeCreateTokenModal = () => {
    if (creatingToken) return;
    setTokenModalOpen(false);
    setTokenDraft(buildDefaultTokenDraft());
  };
  const handleCreateToken = async () => {
    if (!tokenDraft.clientId) {
      toast.warn(copy.toast.selectCompany);
      return;
    }
    setCreatingToken(true);
    try {
      const created = await createRmmEnrollmentToken({
        clientId: Number(tokenDraft.clientId),
        label: String(tokenDraft.label || "").trim() || null
      });
      setCreatedToken(created.token);
      setTokenModalOpen(false);
      setTokenDraft(buildDefaultTokenDraft());
      await loadAll();
      toast.success(copy.toast.tokenCreated);
    } catch (err) {
      toast.error(err.message || copy.toast.tokenCreateError);
    } finally {
      setCreatingToken(false);
    }
  };
  const handleCopyCreatedToken = async () => {
    if (!createdToken) return;
    try {
      await navigator.clipboard?.writeText(createdToken);
      toast.success(copy.toast.tokenCopied);
    } catch {
      toast.error(copy.toast.tokenCopyError);
    }
  };
  const handleRevokeToken = async () => {
    if (!confirmRevoke) return;
    try {
      await revokeRmmEnrollmentToken(confirmRevoke);
      setConfirmRevoke(null);
      await loadAll();
      toast.success(copy.toast.tokenRevoked);
    } catch (err) {
      toast.error(err.message || copy.toast.tokenRevokeError);
    }
  };
  const handleRestoreToken = async () => {
    if (!confirmRestore) return;
    try {
      await restoreRmmEnrollmentToken(confirmRestore);
      setConfirmRestore(null);
      await loadAll();
      toast.success(copy.toast.tokenRestored);
    } catch (err) {
      toast.error(err.message || copy.toast.tokenRestoreError);
    }
  };
  const handlePermanentDeleteToken = async () => {
    if (!confirmPermanentDelete) return;
    try {
      await deleteRmmEnrollmentTokenPermanently(confirmPermanentDelete);
      setConfirmPermanentDelete(null);
      await loadAll();
      toast.success(copy.toast.tokenDeleted);
    } catch (err) {
      toast.error(err.message || copy.toast.tokenDeleteError);
    }
  };
  const handleRevokeAgent = async agentId => {
    try {
      await updateRmmAgentStatus(agentId, "revoked");
      setAgents(prev => prev.filter(a => a.id !== agentId));
      toast.success(copy.toast.agentRevoked);
    } catch (err) {
      toast.error(err.message || copy.toast.agentRevokeError);
    }
  };
  const patchCollector = (key, value) => {
    setSettings(prev => ({
      ...prev,
      collectors: {
        ...prev.collectors,
        [key]: value
      }
    }));
  };
  const patchMetric = (key, value) => {
    setSettings(prev => ({
      ...prev,
      metrics: {
        ...(prev.metrics || {}),
        [key]: value
      }
    }));
  };
  const metricsAgentCount = metricsStorage?.stats?.activeAgents ?? agents.length ?? metricsStorage?.stats?.agentCountWithData ?? 0;
  const metricsAvgDisks = metricsStorage?.stats?.avgDisksPerAgent ?? 3;
  const handleDownloadWindows = async (format = "zip") => {
    setDownloading(format);
    try {
      let result;
      if (format === "msi") {
        result = await downloadRmmWindowsAgentSetupMsi();
      } else if (format === "cmd") {
        result = await downloadRmmWindowsAgentSetup();
      } else {
        result = await downloadRmmWindowsAgentSetupZip();
      }
      const version = result?.version || installerInfo?.version;
      toast.success(version ? interpolate(copy.toast.downloadWithVersion, {
        filename: result?.filename || "installateur",
        version
      }) : copy.toast.downloadStarted);
    } catch (err) {
      toast.error(err.message || copy.toast.downloadError);
    } finally {
      setDownloading(null);
    }
  };
  if (loading && !settings) {
    return <Page>
        <p className={adminUi.adminMutedText}>{copy.common.loading}</p>
      </Page>;
  }
  return <Page>
      <SubTabs items={rmmTabs} active={tab} onChange={handleTabChange} fullWidth />

      {tab === "deploy" && <Card title={copy.deploy.cardTitle} description={copy.deploy.cardDescription}>
          <div className={styles.deployGrid}>
            {deployPlatforms.map(platform => {
          const isSelected = selectedDeployPlatform === platform.key;
          return <button key={platform.key} type="button" className={`${styles.platformCard} ${isSelected ? styles.platformCardActive : ""} ${!platform.available ? styles.platformCardSoon : ""}`} aria-pressed={isSelected} onClick={() => setSelectedDeployPlatform(platform.key)}>
                  <div className={styles.platformHeader}>
                    <Icon icon={platform.icon} className={styles.platformIcon} aria-hidden />
                    <div className={styles.platformTitleRow}>
                      <div className={styles.platformTitle}>{platform.title}</div>
                      <Badge variant={platform.available ? "success" : "muted"}>
                        {platform.available ? copy.common.available : copy.common.comingSoon}
                      </Badge>
                    </div>
                  </div>
                  <p className={styles.platformHint}>{platform.hint}</p>
                </button>;
        })}
          </div>

          <div className={styles.instructions}>
            <DeployPlatformInstructions platformKey={selectedDeployPlatform} copy={copy} installerInfo={installerInfo} downloading={downloading} onDownloadWindows={handleDownloadWindows} onOpenTokensTab={() => setTab("tokens")} />
          </div>
        </Card>}

      {tab === "settings" && settings && <Card title={copy.settings.globalTitle} description={copy.settings.globalDescription} fill action={<Btn icon="mdi:content-save-outline" onClick={handleSaveSettings} disabled={saving}>
              {saving ? copy.common.saving : copy.common.save}
            </Btn>}>
          <div className={styles.settingsLayout}>
            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>{copy.settings.communicationTitle}</h3>
              <RmmTimingFields copy={copy} heartbeatMinutes={settings.heartbeatIntervalMinutes} offlineThresholdMinutes={settings.offlineThresholdMinutes} onHeartbeatChange={value => setSettings(prev => ({
            ...prev,
            heartbeatIntervalMinutes: value
          }))} onOfflineChange={value => setSettings(prev => ({
            ...prev,
            offlineThresholdMinutes: value
          }))} />
            </section>

            <RmmMetricsStorageSection copy={copy} locale={locale} metrics={settings.metrics || DEFAULT_METRICS} collectors={settings.collectors} onMetricChange={patchMetric} storageStats={metricsStorage?.stats} agentCount={metricsAgentCount} avgDisksPerAgent={metricsAvgDisks} />

            <RmmCollectorsSection copy={copy} isCommunity={isCommunity} onProClick={() => setProPromoFeature("adminRmmCollectors")} getChecked={key => !!settings.collectors?.[key]} onToggle={(key, checked) => patchCollector(key, checked)} />
          </div>
        </Card>}

      {tab === "clientSettings" && settings && !isCommunity && <RmmClientSettingsPanel copy={copy} locale={locale} globalSettings={settings} clientOptions={clientOptions} metricsStorageStats={metricsStorage?.stats} activeAgentCount={metricsAgentCount} onProClick={() => setProPromoFeature("adminRmmCollectors")} />}

      {tab === "tokens" && <Card title={copy.tokens.title} description={copy.tokens.description} fill action={tokenListView === "active" ? <Btn icon="mdi:plus" onClick={openCreateTokenModal}>
                {copy.tokens.newToken}
              </Btn> : null}>
          <div className={styles.tokensToolbar}>
            <div className={styles.tokenViewToggle} role="tablist" aria-label={copy.tokens.viewAria}>
              <button type="button" role="tab" aria-selected={tokenListView === "active"} className={`${styles.tokenViewBtn} ${tokenListView === "active" ? styles.tokenViewBtnActive : ""}`} onClick={() => setTokenListView("active")}>
                {copy.tokens.viewActive}
                {activeTokens.length > 0 ? <span className={styles.tokenViewCount}>{activeTokens.length}</span> : null}
              </button>
              <button type="button" role="tab" aria-selected={tokenListView === "trash"} className={`${styles.tokenViewBtn} ${tokenListView === "trash" ? styles.tokenViewBtnActive : ""}`} onClick={() => setTokenListView("trash")}>
                <Icon icon="mdi:trash-can-outline" aria-hidden />
                {copy.tokens.viewTrash}
                {trashedTokens.length > 0 ? <span className={styles.tokenViewCount}>{trashedTokens.length}</span> : null}
              </button>
            </div>
          </div>

          {loading ? <p className={adminUi.adminMutedText}>{copy.common.loadingShort}</p> : <>
              <Table columns={tokenListView === "trash" ? [{
          key: "client_name",
          label: copy.tokens.colCompany
        }, {
          key: "token",
          label: copy.tokens.colToken,
          render: row => <RmmEnrollmentTokenValue token={row.token} compact />
        }, {
          key: "label",
          label: copy.tokens.colLabel
        }, {
          key: "uses_count",
          label: copy.tokens.colUses
        }, {
          key: "revoked_at",
          label: copy.tokens.colRevoked
        }, {
          key: "actions",
          label: "",
          render: row => <div className={styles.tokenRowActions}>
                              <BtnIcon icon="mdi:restore" title={copy.common.restore} onClick={() => setConfirmRestore(row.id)} />
                              <BtnIcon icon="mdi:delete-forever-outline" title={copy.common.deletePermanently} variant="danger" onClick={() => setConfirmPermanentDelete(row.id)} />
                            </div>
        }] : [{
          key: "client_name",
          label: copy.tokens.colCompany
        }, {
          key: "token",
          label: copy.tokens.colToken,
          render: row => <RmmEnrollmentTokenValue token={row.token} compact />
        }, {
          key: "label",
          label: copy.tokens.colLabel
        }, {
          key: "uses_count",
          label: copy.tokens.colUses
        }, {
          key: "expires_at",
          label: copy.tokens.colExpires
        }, {
          key: "created_at",
          label: copy.tokens.colCreated
        }, {
          key: "actions",
          label: "",
          render: row => <Btn variant="ghost" icon="mdi:trash-can-outline" onClick={() => setConfirmRevoke(row.id)}>
                              {copy.common.trash}
                            </Btn>
        }]} rows={tokensPagination.paginatedItems.map(t => mapTokenTableRow(t, locale))} emptyMessage={tokenListView === "trash" ? copy.tokens.emptyTrash : copy.tokens.emptyActive} />
              {displayedTokens.length > 0 && <Pagination page={tokensPagination.page} totalPages={tokensPagination.totalPages} onPageChange={tokensPagination.setPage} pageSize={tokensPagination.pageSize} onPageSizeChange={tokensPagination.setPageSize} rangeLabel={tokensPagination.rangeLabel} />}
            </>}
        </Card>}

      {tab === "agents" && <Card title={copy.agents.title} description={copy.agents.description} fill>
          {loading ? <p className={adminUi.adminMutedText}>{copy.common.loadingShort}</p> : <Table columns={[{
        key: "client_name",
        label: copy.agents.colCompany
      }, {
        key: "hostname",
        label: copy.agents.colHostname
      }, {
        key: "agent_version",
        label: copy.agents.colVersion
      }, {
        key: "online",
        label: copy.agents.colStatus,
        render: row => row.online ? <Badge variant="success">{copy.agents.statusOnline}</Badge> : <Badge variant="warn">{copy.agents.statusOffline}</Badge>
      }, {
        key: "last_seen_at",
        label: copy.agents.colLastSeen
      }, {
        key: "actions",
        label: "",
        render: row => <Btn variant="ghost" onClick={() => handleRevokeAgent(row.id)}>
                      {copy.common.revoke}
                    </Btn>
      }]} rows={agents.map(a => ({
        id: a.id,
        client_name: a.client_name || "-",
        hostname: a.hostname || a.machine_id || "-",
        agent_version: a.agent_version || "-",
        online: a.online,
        status: a.status,
        last_seen_at: a.last_seen_at ? formatRmmDateTime(a.last_seen_at, locale) : "-"
      }))} emptyMessage={copy.agents.empty} />}
        </Card>}

      {tab === "consumptions" && settings && <Card title={copy.consumptions.cardTitle} description={copy.consumptions.cardDescription} fill>
          <RmmConsumptionsPanel copy={copy} locale={locale} settings={settings} agentCount={agents.length} metricsStorage={metricsStorage} />
        </Card>}

      <RmmEnrollmentTokenFormModal open={tokenModalOpen} copy={copy} draft={tokenDraft} setDraft={setTokenDraft} saving={creatingToken} clientOptions={clientOptions} onClose={closeCreateTokenModal} onSave={handleCreateToken} />

      <RmmEnrollmentTokenCreatedModal open={Boolean(createdToken)} copy={copy} token={createdToken} onClose={() => setCreatedToken(null)} onCopy={handleCopyCreatedToken} />

      <ConfirmModal open={!!confirmRevoke} title={rmmCopy.revokeTitle} message={rmmCopy.revokeMessage} confirmLabel={rmmCopy.revokeConfirm} onConfirm={handleRevokeToken} onClose={() => setConfirmRevoke(null)} />

      <ConfirmModal open={!!confirmRestore} title={rmmCopy.restoreTitle} message={rmmCopy.restoreMessage} confirmLabel={rmmCopy.restoreConfirm} onConfirm={handleRestoreToken} onClose={() => setConfirmRestore(null)} />

      <ConfirmModal open={!!confirmPermanentDelete} title={rmmCopy.purgeTitle} icon="mdi:delete-forever-outline" message={rmmCopy.purgeMessage} confirmLabel={rmmCopy.purgeConfirm} confirmVariant="dangerSolid" onConfirm={handlePermanentDeleteToken} onClose={() => setConfirmPermanentDelete(null)} />

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />
    </Page>;
}
