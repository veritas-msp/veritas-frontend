import { Fragment, useEffect, useMemo, useState } from "react";
import { fetchPermissionsCatalog, fetchProfilePermissions } from "../../api/permissions";
import { getAdminPermissionsCopy } from "./adminPermissionsI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { isSuperAdminProtectedProfile } from "../../utils/profileProtection";
import s from "./ProfilePermissionsEditor.module.css";

const FEATURE_ACTIONS = ["view", "create", "edit", "delete", "export", "manage"];
const FEATURE_ACTION_SET = new Set(FEATURE_ACTIONS);

/**
 * GLPI-style matrix: rows = resources, columns = view + feature actions.
 */
export default function ProfilePermissionsEditor({
  profileName,
  value,
  onChange,
  readOnly = false,
  hideAdminOnly = true
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminPermissionsCopy(locale), [locale]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const protectedProfile = isSuperAdminProtectedProfile(profileName);
  const effectiveReadOnly = readOnly || protectedProfile;

  useEffect(() => {
    if (!profileName) {
      setCatalog([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catalogRes, permsRes] = await Promise.all([fetchPermissionsCatalog(), fetchProfilePermissions(profileName)]);
        if (cancelled) return;
        const groups = Array.isArray(catalogRes?.catalog) ? catalogRes.catalog : [];
        setCatalog(groups);
        const perms = permsRes?.permissions && typeof permsRes.permissions === "object" ? {
          ...permsRes.permissions
        } : {};
        onChange?.(perms);
      } catch (err) {
        if (cancelled) return;
        console.warn("[ProfilePermissionsEditor]", err?.message || err);
        setError(copy.loadError);
        setCatalog([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileName]);

  const featureGroups = useMemo(() => {
    return catalog.filter(group => {
      if (hideAdminOnly && group.adminOnly) return false;
      const actions = (group.actions || []).filter(a => FEATURE_ACTION_SET.has(a.action));
      return actions.length > 0;
    }).map(group => ({
      ...group,
      featureActions: (group.actions || []).filter(a => FEATURE_ACTION_SET.has(a.action)),
      actionKeys: new Set((group.actions || []).filter(a => FEATURE_ACTION_SET.has(a.action)).map(a => a.action))
    }));
  }, [catalog, hideAdminOnly]);

  const groupedBySection = useMemo(() => {
    const map = new Map();
    for (const group of featureGroups) {
      const section = group.section || "autres";
      if (!map.has(section)) map.set(section, []);
      map.get(section).push(group);
    }
    return Array.from(map.entries());
  }, [featureGroups]);

  const toggleKey = key => {
    if (effectiveReadOnly || !key) return;
    const next = {
      ...(value || {})
    };
    next[key] = !Boolean(next[key]);
    onChange?.(next);
  };

  const setKeys = (keys, enabled) => {
    if (effectiveReadOnly || !keys.length) return;
    const next = {
      ...(value || {})
    };
    for (const key of keys) next[key] = enabled;
    onChange?.(next);
  };

  const keysForAction = action => featureGroups.filter(g => g.actionKeys.has(action)).map(g => `${g.group}.${action}`);

  const keysForGroup = group => group.featureActions.map(a => a.key);

  const columnAllChecked = action => {
    const keys = keysForAction(action);
    return keys.length > 0 && keys.every(k => Boolean(value?.[k]));
  };

  const columnSomeChecked = action => {
    const keys = keysForAction(action);
    return keys.some(k => Boolean(value?.[k]));
  };

  const toggleColumn = action => {
    const keys = keysForAction(action);
    if (!keys.length) return;
    setKeys(keys, !columnAllChecked(action));
  };

  const toggleRow = group => {
    const keys = keysForGroup(group);
    if (!keys.length) return;
    const allOn = keys.every(k => Boolean(value?.[k]));
    setKeys(keys, !allOn);
  };

  const groupLabel = group => copy.groups?.[group.group] || group.group;
  const sectionLabel = section => copy.sections?.[section] || section;
  const cellTitle = (group, action) => {
    const key = `${group.group}.${action}`;
    return copy.actionOverrides?.[key] || copy.actionLabels?.[action] || copy.columns?.[action] || action;
  };

  if (loading) return <div className={s.state}>{copy.loading}</div>;
  if (error) return <div className={s.stateError}>{error}</div>;
  if (featureGroups.length === 0) return <div className={s.state}>{copy.empty}</div>;

  return <div className={s.root}>
      {(protectedProfile || readOnly && !protectedProfile) && <div className={s.banner}>
          {protectedProfile ? copy.protectedHint : copy.sectionHintCommunity}
        </div>}

      <div className={s.tableWrap}>
        <table className={s.matrix}>
          <thead>
            <tr>
              <th className={s.colResource}>{copy.columns.resource}</th>
              {FEATURE_ACTIONS.map(action => <th key={action} className={s.colAction}>
                  {copy.columns[action] || copy.actionLabels[action] || action}
                </th>)}
              <th className={s.colAll}>{copy.columns.all}</th>
            </tr>
          </thead>
          <tbody>
            {groupedBySection.map(([section, groups]) => <Fragment key={section}>
                <tr className={s.sectionRow}>
                  <td colSpan={FEATURE_ACTIONS.length + 2}>{sectionLabel(section)}</td>
                </tr>
                {groups.map(group => {
              const rowKeys = keysForGroup(group);
              const rowAll = rowKeys.length > 0 && rowKeys.every(k => Boolean(value?.[k]));
              return <tr key={group.group} className={s.dataRow}>
                      <td className={s.resourceCell}>{groupLabel(group)}</td>
                      {FEATURE_ACTIONS.map(action => {
                  if (!group.actionKeys.has(action)) {
                    return <td key={action} className={s.actionCell}>
                            <span className={s.na} aria-hidden>—</span>
                          </td>;
                  }
                  const key = `${group.group}.${action}`;
                  const checked = Boolean(value?.[key]);
                  return <td key={action} className={s.actionCell}>
                          <label className={`${s.check} ${checked ? s.checkOn : ""} ${effectiveReadOnly ? s.checkLocked : ""}`} title={cellTitle(group, action)}>
                            <input type="checkbox" checked={checked} disabled={effectiveReadOnly} onChange={() => toggleKey(key)} aria-label={`${groupLabel(group)} — ${copy.actionLabels[action] || action}`} />
                            <span className={s.checkBox} aria-hidden>
                              {checked ? <svg viewBox="0 0 16 16" className={s.checkIcon}><path d="M3.5 8.5l3 3 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                            </span>
                          </label>
                        </td>;
                })}
                      <td className={s.actionCell}>
                        <label className={`${s.check} ${rowAll ? s.checkOn : ""} ${effectiveReadOnly ? s.checkLocked : ""}`} title={copy.toggleRow || "All"}>
                          <input type="checkbox" checked={rowAll} disabled={effectiveReadOnly || rowKeys.length === 0} onChange={() => toggleRow(group)} aria-label={`${groupLabel(group)} — all`} />
                          <span className={s.checkBox} aria-hidden>
                            {rowAll ? <svg viewBox="0 0 16 16" className={s.checkIcon}><path d="M3.5 8.5l3 3 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                          </span>
                        </label>
                      </td>
                    </tr>;
            })}
              </Fragment>)}
          </tbody>
          {!effectiveReadOnly && <tfoot>
              <tr className={s.footerRow}>
                <td className={s.resourceCell}>{copy.selectAllColumns || "Select / unselect all"}</td>
                {FEATURE_ACTIONS.map(action => {
              const keys = keysForAction(action);
              const allOn = columnAllChecked(action);
              const some = columnSomeChecked(action);
              return <td key={action} className={s.actionCell}>
                      <label className={`${s.check} ${allOn ? s.checkOn : ""} ${some && !allOn ? s.checkPartial : ""}`} title={copy.actionLabels[action] || action}>
                        <input type="checkbox" checked={allOn} disabled={keys.length === 0} onChange={() => toggleColumn(action)} aria-label={`${copy.actionLabels[action] || action} — all`} />
                        <span className={s.checkBox} aria-hidden>
                          {allOn ? <svg viewBox="0 0 16 16" className={s.checkIcon}><path d="M3.5 8.5l3 3 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : some ? <span className={s.partialMark} /> : null}
                        </span>
                      </label>
                    </td>;
            })}
                <td className={s.actionCell} />
              </tr>
            </tfoot>}
        </table>
      </div>
    </div>;
}

export { isSuperAdminProtectedProfile as isAdminProtectedProfile, FEATURE_ACTIONS };
