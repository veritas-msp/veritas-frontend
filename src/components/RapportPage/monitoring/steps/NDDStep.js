import React, { useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import API_BASE_URL from "../../../../config";
import styles from "../RapportMonitoringBuilder.module.css";
import { MonitoringStepSyncButton } from "../MonitoringStepLayout";

function getAuthHeaders() {
  return {};
}

function formatExpiration(raw) {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString("fr-FR");
  } catch {
    return String(raw);
  }
}

function getDomainName(domaine) {
  return domaine?.nom || domaine?.name || domaine?.fqdn || "";
}

async function fetchOvhDomainExpiration(domainName) {
  const response = await fetch(
    `${API_BASE_URL}/ovh/domain/${encodeURIComponent(domainName)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Impossible de récupérer ${domainName} depuis OVH`);
  }

  const result = await response.json();
  if (!result.success || !result.domain) {
    throw new Error(`Données OVH indisponibles pour ${domainName}`);
  }

  return result.domain;
}

export default function NDDStep({
  client,
  onRefreshClient,
  onOpenComments,
  onTicketCreatedForEquipment,
  commentCounts,
  ticketCounts,
  highlightedEquipmentKey,
}) {
  const [syncingKey, setSyncingKey] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const clientId = client?.id ?? client?.uuid;
  const domaines = Array.isArray(client?.equipements?.NDD)
    ? client.equipements.NDD
    : [];

  const persistDomainExpiration = useCallback(
    async (domaine, ovhDomain) => {
      if (!clientId) {
        throw new Error("Client introuvable.");
      }
      if (!domaine?.id) {
        throw new Error("Identifiant du domaine manquant en base.");
      }

      const domainName = getDomainName(domaine);
      const expiration = ovhDomain.expiration || ovhDomain.expirationDate || null;
      const nextData = {
        ...(domaine.data && typeof domaine.data === "object" ? domaine.data : domaine),
        nom: domainName,
        name: domainName,
        expiration,
        expirationDate: expiration,
        registrar: ovhDomain.registrar || domaine.registrar || "OVH",
        ovhSyncedAt: new Date().toISOString(),
      };

      delete nextData.id;
      delete nextData.is_active;
      delete nextData.checkmk_host_name;
      delete nextData.checkmk_site;
      delete nextData.checkmk_service_name;

      const response = await fetch(
        `${API_BASE_URL}/clients/modules/${clientId}/ndd/${domaine.id}`,
        {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            item_key: domaine.item_key || domainName,
            name: domaine.name || domainName,
            data: nextData,
            is_active: domaine.is_active !== false,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Erreur lors de la sauvegarde du domaine.");
      }

      return expiration;
    },
    [clientId]
  );

  const syncDomain = useCallback(
    async (domaine, { silent = false } = {}) => {
      const domainName = getDomainName(domaine);
      if (!domainName) {
        if (!silent) toast.error("Nom de domaine manquant.");
        return false;
      }

      const ovhDomain = await fetchOvhDomainExpiration(domainName);
      const expiration = await persistDomainExpiration(domaine, ovhDomain);

      if (!silent) {
        toast.success(
          expiration
            ? `${domainName} : expiration mise à jour (${formatExpiration(expiration)})`
            : `${domainName} synchronisé (aucune date d'expiration OVH)`
        );
      }

      return true;
    },
    [persistDomainExpiration]
  );

  const handleSyncCheckMK = async (domaine, { equipmentKey }) => {
    setSyncingKey(equipmentKey);
    try {
      await syncDomain(domaine);
      if (typeof onRefreshClient === "function") {
        await onRefreshClient();
      }
    } catch (err) {
      console.error("Sync OVH domaine:", err);
      toast.error(err?.message || "Erreur lors de la synchronisation OVH.");
    } finally {
      setSyncingKey(null);
    }
  };

  const handleSyncAll = async () => {
    if (syncingAll || syncingKey) return;
    if (domaines.length === 0) {
      toast.info("Aucun nom de domaine à synchroniser.");
      return;
    }

    setSyncingAll(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const domaine of domaines) {
        const domainName = getDomainName(domaine);
        setSyncingKey(domaine.id ?? domainName);
        try {
          const ok = await syncDomain(domaine, { silent: true });
          if (ok) successCount += 1;
        } catch (err) {
          errorCount += 1;
          console.error(`Sync OVH ${domainName}:`, err);
        }
      }

      if (typeof onRefreshClient === "function") {
        await onRefreshClient();
      }

      if (errorCount === 0) {
        toast.success(`${successCount} domaine(s) synchronisé(s) depuis OVH.`);
      } else {
        toast.warning(
          `${successCount} domaine(s) synchronisé(s), ${errorCount} erreur(s).`
        );
      }
    } finally {
      setSyncingKey(null);
      setSyncingAll(false);
    }
  };

  const columns = [
    {
      id: "name",
      label: "Nom de domaine",
      render: (domaine) => {
        const name = getDomainName(domaine) || "-";
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Icon icon="mdi:web" width={18} height={18} />
            {name}
          </span>
        );
      },
    },
    {
      id: "role",
      label: "Rôle",
      render: (domaine) => domaine.role || domaine.type || "-",
    },
    {
      id: "expiration",
      label: "Expiration",
      render: (domaine) => formatExpiration(domaine.expiration || domaine.expirationDate),
    },
    {
      id: "registrar",
      label: "Registrar / fournisseur",
      render: (domaine) =>
        domaine.registrar ||
        domaine.registrarName ||
        domaine.provider ||
        "-",
    },
  ];

  const isSyncing = syncingAll || syncingKey != null;

  return (
    <InfrastructureEquipmentTable
      title="Noms de domaine"
      moduleKey="NDD"
      equipments={domaines}
      columns={columns}
      onOpenComments={onOpenComments}
      onCreateTicket={onTicketCreatedForEquipment}
      clientId={clientId}
      onSyncCheckMK={handleSyncCheckMK}
      commentCounts={commentCounts}
      ticketCounts={ticketCounts}
      highlightedEquipmentKey={highlightedEquipmentKey}
      syncingEquipmentKey={syncingKey}
      forceSyncButton={true}
      showSearch={false}
      headerActions={
        <MonitoringStepSyncButton
          onClick={handleSyncAll}
          disabled={domaines.length === 0}
          loading={syncingAll}
          label="Sync OVH"
          loadingLabel="Synchronisation..."
          title="Synchroniser tous les domaines depuis OVH"
        />
      }
      externalLink={{
        url: "https://www.ovh.com/manager/#/web/domain",
        title: "Ouvrir l'espace domaines OVH",
      }}
    />
  );
}
