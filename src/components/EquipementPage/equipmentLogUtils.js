function parseLogDetailsRaw(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export function parseLogDetails(logOrRaw) {
  if (logOrRaw && typeof logOrRaw === "object" && "details" in logOrRaw) {
    return parseLogDetailsRaw(logOrRaw.details);
  }
  return parseLogDetailsRaw(logOrRaw);
}

export function formatLogDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getLogActionDetails(log) {
  const action = log.action || "unknown";
  const actionLower = action.toLowerCase();
  const details = parseLogDetails(log);

  if (
    actionLower.includes("connexion distante") ||
    details?.kind === "remote_access" ||
    details?.kind === "quick_connect"
  ) {
    const success = details?.success !== false;
    return {
      icon: "mdi:remote-desktop",
      color: success ? "#7C3AED" : "#D97706",
      label: success ? "Connexion distante" : "Tentative connexion distante",
    };
  }

  if (details?.kind === "rmm_agent_update") {
    return {
      icon: "mdi:update",
      color: "#2563EB",
      label: "Agent RMM",
    };
  }

  if (details?.kind === "rmm_full_sync") {
    return {
      icon: "mdi:sync",
      color: "#0D9488",
      label: "Sync complet RMM",
    };
  }

  if (details?.kind === "rmm_heartbeat") {
    const count = Number(details?.heartbeatCount) || 1;
    return {
      icon: "mdi:heart-pulse",
      color: "#2b5fab",
      label: count > 1 ? `Présence RMM (${count}/h)` : "Heartbeat RMM",
    };
  }

  const actionMap = {
    create: { icon: "mdi:plus-circle", color: "#10B981", label: "Créé" },
    update: { icon: "mdi:pencil-circle", color: "#3B82F6", label: "Modifié" },
    delete: { icon: "mdi:delete-circle", color: "#EF4444", label: "Supprimé" },
    read: { icon: "mdi:eye-circle", color: "#8B5CF6", label: "Consulté" },
    view: { icon: "mdi:eye-circle", color: "#8B5CF6", label: "Consulté" },
    download: { icon: "mdi:download-circle", color: "#F59E0B", label: "Téléchargé" },
    upload: { icon: "mdi:upload-circle", color: "#14B8A6", label: "Téléversé" },
  };

  for (const [key, meta] of Object.entries(actionMap)) {
    if (actionLower.includes(key)) {
      return meta;
    }
  }

  return { icon: "mdi:information-circle", color: "#6B7280", label: action };
}

function detailRow(label, value, options = {}) {
  if (value == null || value === "") return null;
  return {
    label,
    value: String(value),
    fullWidth: Boolean(options.fullWidth),
  };
}

function humanizeKey(key) {
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export function buildLogDetailRows(parsed, rawDetails) {
  if (!parsed) {
    if (rawDetails == null || rawDetails === "") return [];
    return null;
  }

  const { kind } = parsed;

  if (kind === "remote_access" || kind === "quick_connect") {
    return [
      detailRow("Solution", parsed.solutionLabel),
      detailRow("Identifiant", parsed.targetId),
      detailRow("URL", parsed.url, { fullWidth: true }),
      detailRow("Résultat", parsed.outcomeLabel),
    ].filter(Boolean);
  }

  if (kind === "rmm_agent_update") {
    const eventLabel =
      parsed.event === "install"
        ? "Installation"
        : parsed.event === "re_enroll"
          ? "Ré-enrôlement"
          : parsed.event === "update"
            ? "Mise à jour"
            : parsed.event;

    return [
      detailRow("Version précédente", parsed.previousVersion),
      detailRow("Nouvelle version", parsed.newVersion),
      detailRow("Événement", eventLabel),
      detailRow("Source", parsed.source),
      detailRow("Poste", parsed.hostname),
    ].filter(Boolean);
  }

  if (kind === "rmm_heartbeat" || kind === "rmm_full_sync") {
    const rows = [];

    if (parsed.heartbeatCount != null && parsed.heartbeatCount > 1) {
      rows.push(detailRow("Signaux sur 1 h", parsed.heartbeatCount));
    }
    if (parsed.lastHeartbeatAt) {
      rows.push(detailRow("Dernier signal", formatLogDateTime(parsed.lastHeartbeatAt)));
    }
    if (parsed.mode) {
      rows.push(detailRow("Mode", parsed.mode === "full" ? "Sync complet" : "Heartbeat léger"));
    }
    if (parsed.agentVersion) rows.push(detailRow("Version agent", parsed.agentVersion));
    if (parsed.collectedAt) {
      rows.push(detailRow("Collecte", formatLogDateTime(parsed.collectedAt)));
    }
    if (parsed.syncRequested) rows.push(detailRow("Déclenché par le serveur", "Oui"));
    if (parsed.cpuUsagePct != null) rows.push(detailRow("CPU", `${parsed.cpuUsagePct}%`));
    if (parsed.ramUsagePct != null) rows.push(detailRow("RAM", `${parsed.ramUsagePct}%`));
    if (parsed.loggedUser) rows.push(detailRow("Utilisateur session", parsed.loggedUser));
    if (parsed.osEdition) rows.push(detailRow("Édition Windows", parsed.osEdition));
    if (parsed.osDisplayVersion) rows.push(detailRow("Version Windows", parsed.osDisplayVersion));
    if (parsed.osBuild) rows.push(detailRow("Build", parsed.osBuild));
    if (parsed.licenseActivated != null) {
      rows.push(detailRow("Licence activée", parsed.licenseActivated ? "Oui" : "Non"));
    }
    if (kind === "rmm_full_sync" && parsed.pendingCount != null) {
      rows.push(detailRow("Mises à jour en attente", parsed.pendingCount));
    }
    if (parsed.rebootRequired) rows.push(detailRow("Redémarrage requis", "Oui"));

    return rows.filter(Boolean);
  }

  if (typeof parsed === "object" && !Array.isArray(parsed)) {
    const skipKeys = new Set(["kind"]);
    const entries = Object.entries(parsed).filter(
      ([key, value]) => !skipKeys.has(key) && value != null && value !== ""
    );

    if (entries.length > 0) {
      return entries
        .map(([key, value]) => {
          const displayValue =
            typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
          return detailRow(humanizeKey(key), displayValue, {
            fullWidth: displayValue.length > 48,
          });
        })
        .filter(Boolean);
    }
  }

  return null;
}

export function getLogDetailsFallbackText(rawDetails) {
  if (rawDetails == null || rawDetails === "") return "";
  if (typeof rawDetails === "string") {
    try {
      return JSON.stringify(JSON.parse(rawDetails), null, 2);
    } catch {
      return rawDetails;
    }
  }
  return JSON.stringify(rawDetails, null, 2);
}
