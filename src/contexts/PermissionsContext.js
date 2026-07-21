import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMyPermissions } from "../api/permissions";
import { useAuthContext } from "./AuthContext";

const PermissionsContext = createContext(null);

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return ctx;
}

/** Safe hook: returns false when provider is missing or still loading. */
export function useCan(permissionKey) {
  const ctx = useContext(PermissionsContext);
  if (!ctx) return false;
  return ctx.can(permissionKey);
}

export function PermissionsProvider({
  children
}) {
  const {
    user,
    userRole,
    loading: authLoading
  } = useAuthContext();
  const [permissionSet, setPermissionSet] = useState(() => new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPermissionSet(new Set());
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMyPermissions();
      const list = Array.isArray(data?.permissions) ? data.permissions : [];
      setPermissionSet(new Set(list));
      setIsAdmin(Boolean(data?.isAdmin) || String(userRole || "").toLowerCase() === "admin");
    } catch (err) {
      console.warn("[permissions] Failed to load /me:", err?.message || err);
      setPermissionSet(new Set());
      setIsAdmin(String(userRole || "").toLowerCase() === "admin");
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const effectiveAdmin = isAdmin || String(userRole || "").toLowerCase() === "admin";

  const can = useCallback(key => {
    if (!key) return false;
    if (effectiveAdmin) return true;
    return permissionSet.has(String(key));
  }, [effectiveAdmin, permissionSet]);

  const canAny = useCallback(keys => {
    if (!Array.isArray(keys) || keys.length === 0) return false;
    if (effectiveAdmin) return true;
    return keys.some(k => permissionSet.has(String(k)));
  }, [effectiveAdmin, permissionSet]);

  const canAll = useCallback(keys => {
    if (!Array.isArray(keys) || keys.length === 0) return false;
    if (effectiveAdmin) return true;
    return keys.every(k => permissionSet.has(String(k)));
  }, [effectiveAdmin, permissionSet]);

  const value = useMemo(() => ({
    permissions: permissionSet,
    isAdmin: effectiveAdmin,
    loading,
    can,
    canAny,
    canAll,
    refresh
  }), [permissionSet, effectiveAdmin, loading, can, canAny, canAll, refresh]);

  return <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>;
}
