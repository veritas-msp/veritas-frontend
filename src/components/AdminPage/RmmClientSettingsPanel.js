import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import {
  deleteRmmClientSettings,
  fetchRmmClientSettings,
  fetchRmmClientSettingsList,
  updateRmmClientSettings,
} from "../../api/rmm";
import { Badge, Btn, Card, Field, FormGrid, Switch, Table } from "./AdminUi";
import { buildOverridesFromForm, COLLECTORS, formStateFromClientSettings } from "./rmmConstants";
import { DEFAULT_METRICS, METRICS_FIELDS } from "./rmmMetricsStorageUtils";
import { formatRmmDateTime, interpolate } from "./adminRmmI18n";
import {
  RmmClientTimingFields,
  RmmCollectorsSection,
  RmmCollectorClientControls,
  RmmMetricsClientControl,
  RmmMetricsStorageSection,
} from "./RmmSettingsBlocks";
import styles from "./AdminRmm.module.css";

function emptyForm(global) {
  return {
    useCustom: false,
    customized: {
      heartbeatIntervalMinutes: false,
      offlineThresholdMinutes: false,
      collectors: Object.fromEntries(COLLECTORS.map((c) => [c.key, false])),
      metrics: Object.fromEntries(METRICS_FIELDS.map((f) => [f.key, false])),
    },
    values: {
      heartbeatIntervalMinutes: global?.heartbeatIntervalMinutes ?? 5,
      offlineThresholdMinutes: global?.offlineThresholdMinutes ?? 15,
      collectors: { ...(global?.collectors || {}) },
      metrics: { ...(global?.metrics || DEFAULT_METRICS) },
    },
    global: global || null,
  };
}

export default function RmmClientSettingsPanel({
  copy,
  locale = "fr",
  globalSettings,
  clientOptions = [],
  isCommunity = false,
  onProClick,
  metricsStorageStats = null,
  activeAgentCount = 0,
}) {
  const cs = copy.clientSettings;
  const [clientList, setClientList] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyForm(globalSettings));

  const loadClientList = useCallback(async () => {
    try {
      const items = await fetchRmmClientSettingsList();
      setClientList(Array.isArray(items) ? items : []);
    } catch {
      setClientList([]);
    }
  }, []);

  useEffect(() => {
    loadClientList();
  }, [loadClientList]);

  const loadClientSettings = useCallback(
    async (clientId) => {
      if (!clientId) {
        setForm(emptyForm(globalSettings));
        return;
      }
      setLoading(true);
      try {
        const data = await fetchRmmClientSettings(clientId);
        setForm(formStateFromClientSettings(data));
      } catch (err) {
        toast.error(err.message || copy.toast.clientLoadError);
        setForm(emptyForm(globalSettings));
      } finally {
        setLoading(false);
      }
    },
    [globalSettings, copy.toast.clientLoadError]
  );

  useEffect(() => {
    loadClientSettings(selectedClientId);
  }, [selectedClientId, loadClientSettings]);

  const selectedClientLabel = useMemo(
    () => clientOptions.find((c) => c.value === selectedClientId)?.label || "",
    [clientOptions, selectedClientId]
  );

  const patchCustomized = (path, value) => {
    setForm((prev) => {
      if (path.startsWith("collectors.")) {
        const key = path.split(".")[1];
        return {
          ...prev,
          customized: {
            ...prev.customized,
            collectors: { ...prev.customized.collectors, [key]: value },
          },
        };
      }
      if (path.startsWith("metrics.")) {
        const key = path.split(".")[1];
        return {
          ...prev,
          customized: {
            ...prev.customized,
            metrics: { ...prev.customized.metrics, [key]: value },
          },
        };
      }
      return {
        ...prev,
        customized: { ...prev.customized, [path]: value },
      };
    });
  };

  const patchValue = (path, value) => {
    setForm((prev) => {
      if (path.startsWith("collectors.")) {
        const key = path.split(".")[1];
        return {
          ...prev,
          values: {
            ...prev.values,
            collectors: { ...prev.values.collectors, [key]: value },
          },
        };
      }
      if (path.startsWith("metrics.")) {
        const key = path.split(".")[1];
        return {
          ...prev,
          values: {
            ...prev.values,
            metrics: { ...prev.values.metrics, [key]: value },
          },
        };
      }
      return {
        ...prev,
        values: { ...prev.values, [path]: value },
      };
    });
  };

  const formatOverridesSummary = (overrides = {}) => {
    const parts = [];
    const o = overrides || {};
    if (o.heartbeatIntervalMinutes != null) parts.push(cs.overrideHeartbeat);
    if (o.offlineThresholdMinutes != null) parts.push(cs.overrideOffline);
    if (o.collectors && Object.keys(o.collectors).length > 0) {
      parts.push(interpolate(cs.overrideCollectors, { count: Object.keys(o.collectors).length }));
    }
    if (o.metrics && Object.keys(o.metrics).length > 0) {
      parts.push(interpolate(cs.overrideMetrics, { count: Object.keys(o.metrics).length }));
    }
    return parts.length ? parts.join(", ") : "-";
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      toast.warn(copy.toast.selectCompany);
      return;
    }
    setSaving(true);
    try {
      if (!form.useCustom) {
        await updateRmmClientSettings(selectedClientId, { useCustom: false });
        toast.success(copy.toast.clientResetGlobal);
      } else {
        const overrides = buildOverridesFromForm(form.global, form);
        if (isCommunity && overrides.collectors) {
          delete overrides.collectors;
        }
        if (Object.keys(overrides).length === 0) {
          toast.warn(copy.toast.clientNeedOverride);
          setSaving(false);
          return;
        }
        await updateRmmClientSettings(selectedClientId, { useCustom: true, overrides });
        toast.success(copy.toast.clientSaved);
      }
      await loadClientList();
      await loadClientSettings(selectedClientId);
    } catch (err) {
      toast.error(err.message || copy.toast.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await deleteRmmClientSettings(selectedClientId);
      toast.success(copy.toast.clientReset);
      await loadClientList();
      await loadClientSettings(selectedClientId);
    } catch (err) {
      toast.error(err.message || copy.toast.clientResetError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card title={cs.listTitle} description={cs.listDescription} fill>
        <Table
          columns={[
            { key: "clientName", label: cs.colCompany },
            {
              key: "summary",
              label: cs.colOverrides,
              render: (row) => formatOverridesSummary(row.overrides),
            },
            {
              key: "updatedAt",
              label: cs.colUpdated,
              render: (row) =>
                row.updatedAt ? formatRmmDateTime(row.updatedAt, locale) : "-",
            },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <Btn variant="ghost" onClick={() => setSelectedClientId(String(row.clientId))}>
                  {copy.common.edit}
                </Btn>
              ),
            },
          ]}
          rows={clientList.map((item) => ({
            id: item.clientId,
            clientId: item.clientId,
            clientName: item.clientName,
            overrides: item.overrides,
            updatedAt: item.updatedAt,
          }))}
          emptyMessage={cs.emptyList}
        />
      </Card>

      <Card title={cs.editorTitle} description={cs.editorDescription}>
        <FormGrid cols={2}>
          <Field label={cs.companyField}>
            <select
              className={styles.clientSelect}
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">{cs.selectCompany}</option>
              {clientOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={cs.modeField}>
            <Switch
              checked={form.useCustom}
              onChange={(checked) => setForm((prev) => ({ ...prev, useCustom: checked }))}
              label={form.useCustom ? cs.customConfig : cs.useGlobal}
              disabled={!selectedClientId || loading}
            />
          </Field>
        </FormGrid>

        {selectedClientId ? (
          loading ? (
            <p className={styles.collectorsHint}>{copy.common.loadingShort}</p>
          ) : (
            <>
              <p className={styles.clientEditorTitle}>
                <Icon icon="mdi:office-building-outline" aria-hidden />
                {selectedClientLabel}
                {form.useCustom ? (
                  <Badge variant="warn">{cs.badgeCustom}</Badge>
                ) : (
                  <Badge variant="muted">{cs.badgeGlobal}</Badge>
                )}
              </p>

              <section className={styles.settingsSection}>
                <h3 className={styles.settingsSectionTitle}>{copy.settings.communicationTitle}</h3>
                <RmmClientTimingFields
                  copy={copy}
                  form={form}
                  disabled={!form.useCustom}
                  onCustomize={(path, value) => patchCustomized(path, value)}
                  onHeartbeatChange={(value) => patchValue("heartbeatIntervalMinutes", value)}
                  onOfflineChange={(value) => patchValue("offlineThresholdMinutes", value)}
                />
              </section>

              <RmmMetricsStorageSection
                copy={copy}
                locale={locale}
                metrics={form.values.metrics}
                collectors={form.values.collectors}
                disabled={!form.useCustom}
                storageStats={metricsStorageStats}
                agentCount={activeAgentCount}
                avgDisksPerAgent={metricsStorageStats?.avgDisksPerAgent ?? 3}
                renderMetricControl={(field) => (
                  <RmmMetricsClientControl
                    copy={copy}
                    field={field}
                    form={form}
                    disabled={!form.useCustom}
                    onCustomize={(key, value) => patchCustomized(`metrics.${key}`, value)}
                    onValueChange={(key, value) => patchValue(`metrics.${key}`, value)}
                  />
                )}
              />

              <RmmCollectorsSection
                copy={copy}
                isCommunity={isCommunity}
                onProClick={onProClick}
                hint={copy.collectors.hintClient}
                disabled={!form.useCustom}
                renderControls={(collector) => (
                  <RmmCollectorClientControls
                    copy={copy}
                    collector={collector}
                    form={form}
                    disabled={!form.useCustom || isCommunity}
                    onCustomize={(key, value) => patchCustomized(`collectors.${key}`, value)}
                    onValueChange={(key, value) => patchValue(`collectors.${key}`, value)}
                  />
                )}
              />

              <div className={styles.clientSettingsActions}>
                <Btn onClick={handleSave} disabled={saving}>
                  {saving ? copy.common.saving : copy.common.save}
                </Btn>
                {form.useCustom ? (
                  <Btn variant="ghost" onClick={handleReset} disabled={saving}>
                    {cs.resetToGlobal}
                  </Btn>
                ) : null}
              </div>
            </>
          )
        ) : (
          <p className={styles.collectorsHint}>{cs.pickCompanyHint}</p>
        )}
      </Card>
    </>
  );
}
