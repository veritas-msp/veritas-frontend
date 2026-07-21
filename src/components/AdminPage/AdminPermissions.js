import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import { updateProfilePermissions } from "../../api/permissions";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { useAdminCommonCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminPermissionsCopy, getLocalizedProfileLabel, getLocalizedProfileName } from "./adminPermissionsI18n";
import ProfilePermissionsEditor from "./ProfilePermissionsEditor";
import { isSuperAdminProtectedProfile } from "../../utils/profileProtection";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { Btn, Card, Page } from "./AdminUi";
import s from "./AdminPermissions.module.css";

const profileFetchInit = {
  credentials: "include"
};

export default function AdminPermissions() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminPermissionsCopy(locale), [locale]);
  const adminCopy = useAdminCommonCopy();
  const {
    isCommunity
  } = useVeritasEdition();
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [permissionsDraft, setPermissionsDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const suppressDirtyRef = useRef(true);

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profiles`, profileFetchInit);
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.profiles || [];
      setProfiles(raw);
      setSelectedProfile(prev => {
        if (prev && raw.some(p => p.name === prev)) return prev;
        return raw[0]?.name || null;
      });
    } catch {
      toast.error(copy.loadProfilesError);
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, [copy.loadProfilesError]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    suppressDirtyRef.current = true;
    setPermissionsDraft(null);
    setDirty(false);
  }, [selectedProfile]);

  const profileDisplay = useCallback(p => {
    const displayName = getLocalizedProfileName(p?.name, copy);
    const displayLabel = getLocalizedProfileLabel(p?.name, p?.label, copy);
    return {
      displayName,
      displayLabel
    };
  }, [copy]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p => {
      const {
        displayName,
        displayLabel
      } = profileDisplay(p);
      return String(p.name || "").toLowerCase().includes(q) || String(p.label || "").toLowerCase().includes(q) || displayName.toLowerCase().includes(q) || displayLabel.toLowerCase().includes(q);
    });
  }, [profiles, search, profileDisplay]);

  const selectedMeta = useMemo(() => profiles.find(p => p.name === selectedProfile) || null, [profiles, selectedProfile]);
  const selectedDisplay = useMemo(() => profileDisplay(selectedMeta || {
    name: selectedProfile
  }), [profileDisplay, selectedMeta, selectedProfile]);
  const permissionsLocked = isCommunity || isSuperAdminProtectedProfile(selectedProfile);

  const handleSelectProfile = name => {
    if (name === selectedProfile) return;
    if (dirty) {
      const ok = window.confirm(copy.unsavedConfirm);
      if (!ok) return;
    }
    setSelectedProfile(name);
  };

  const handleDraftChange = next => {
    setPermissionsDraft(next);
    if (suppressDirtyRef.current) {
      suppressDirtyRef.current = false;
      return;
    }
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selectedProfile || permissionsLocked || !permissionsDraft) return;
    setSaving(true);
    try {
      await updateProfilePermissions(selectedProfile, permissionsDraft);
      toast.success(copy.saveSuccess);
      setDirty(false);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  return <Page>
      <div className={s.pageFill} data-page-fill>
        <Card title={copy.pageTitle} description={isCommunity ? copy.pageDescriptionCommunity : copy.pageDescription} fill fillNoScroll action={!permissionsLocked && selectedProfile ? <Btn icon="mdi:content-save-outline" onClick={handleSave} disabled={saving || !dirty || !permissionsDraft}>
                {saving ? copy.saving : adminCopy.save || copy.save}
              </Btn> : null}>
          {isCommunity && <p className={s.communityHint}>
              {copy.sectionHintCommunity}{" "}
              <ProFeatureBadge variant="inline" className={s.proBadge} />
            </p>}

          <div className={s.layout}>
            <aside className={s.sidebar}>
              <div className={s.sidebarSearch}>
                <input type="search" placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className={s.profileList}>
                {profilesLoading ? <div className={s.empty}>{copy.loadingProfiles}</div> : filteredProfiles.length === 0 ? <div className={s.empty}>{copy.noProfiles}</div> : filteredProfiles.map(p => {
              const active = p.name === selectedProfile;
              const locked = isSuperAdminProtectedProfile(p.name);
              const {
                displayName,
                displayLabel
              } = profileDisplay(p);
              return <button key={p.name} type="button" className={`${s.profileItem} ${active ? s.profileItemActive : ""}`} onClick={() => handleSelectProfile(p.name)}>
                      <span className={s.profileIcon}>
                        <Icon icon={locked ? "mdi:shield-lock-outline" : "mdi:account-cog-outline"} />
                      </span>
                      <span className={s.profileMeta}>
                        <span className={s.profileName}>{displayName}</span>
                        {displayLabel ? <span className={s.profileLabel}>{displayLabel}</span> : null}
                      </span>
                      {locked ? <span className={s.lockTag}>{copy.systemTag}</span> : null}
                    </button>;
            })}
              </div>
            </aside>

            <div className={s.editorPane}>
              {!selectedProfile ? <div className={s.emptyPane}>{copy.selectProfile}</div> : <>
                  <div className={s.editorHead}>
                    <div>
                      <h3 className={s.editorTitle}>{selectedDisplay.displayName}</h3>
                      {selectedDisplay.displayLabel ? <p className={s.editorSubtitle}>{selectedDisplay.displayLabel}</p> : null}
                    </div>
                    {dirty && !permissionsLocked ? <span className={s.dirtyBadge}>{copy.unsaved}</span> : null}
                  </div>
                  <div className={s.editorBody}>
                    <ProfilePermissionsEditor profileName={selectedProfile} value={permissionsDraft} onChange={handleDraftChange} readOnly={permissionsLocked} hideAdminOnly={isCommunity} />
                  </div>
                </>}
            </div>
          </div>
        </Card>
      </div>
    </Page>;
}
