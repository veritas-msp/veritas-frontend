import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchRmmEnrollmentTokens } from "../../api/rmm";
import RmmEnrollmentTokenValue from "./RmmEnrollmentTokenValue";
import SmartTooltip from "../SmartTooltip";

export default function EnterpriseRmmEnrollmentHero({
  clientId,
  isAdmin,
  compact = false,
  itemClassName = "",
  tokenWrapClassName = "",
}) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTokens = useCallback(async () => {
    if (!clientId || !isAdmin) {
      setTokens([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchRmmEnrollmentTokens(String(clientId));
      setTokens(Array.isArray(data) ? data : []);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, isAdmin]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  if (!isAdmin || loading) {
    return null;
  }

  const activeTokens = tokens.filter((t) => t?.token);
  if (activeTokens.length === 0) {
    return null;
  }

  const primary = activeTokens[0];
  const extraCount = activeTokens.length - 1;
  const extraHint =
    extraCount > 0
      ? activeTokens
          .slice(1)
          .map((t) => t.label || `Token ${t.id?.slice(0, 8) || ""}`)
          .join(", ")
      : null;

  return (
    <span className={itemClassName}>
      <SmartTooltip content="Token d'enrôlement RMM">
        <Icon icon="mdi:key-outline" aria-hidden />
      </SmartTooltip>
      {!compact && <span>Token d&apos;enrôlement</span>}
      <span className={tokenWrapClassName}>
        <RmmEnrollmentTokenValue token={primary.token} full />
      </span>
      {extraCount > 0 ? (
        <SmartTooltip content={`${extraCount} autre${extraCount > 1 ? "s" : ""} token${extraCount > 1 ? "s" : ""} actif${extraCount > 1 ? "s" : ""}${extraHint ? ` : ${extraHint}` : ""}`} as="span">
          <span aria-label={`${extraCount} autres tokens actifs`}>+{extraCount}</span>
        </SmartTooltip>
      ) : null}
    </span>
  );
}
