import { DEFAULT_METRICS, METRICS_FIELDS } from "./rmmMetricsStorageUtils";

export const COLLECTOR_GROUPS = {
  system: "Système & réseau",
  hardware: "Matériel",
  monitoring: "Supervision & sécurité",
  sync: "Inventaire complet (sync)",
};

export const COLLECTORS = [
  {
    key: "os",
    group: "system",
    label: "Système d'exploitation",
    description: "Version, build, édition Windows, installation et dernier démarrage.",
  },
  {
    key: "domain",
    group: "system",
    label: "Domaine / workgroup",
    description: "Appartenance au domaine Active Directory ou workgroup.",
  },
  {
    key: "network",
    group: "system",
    label: "Réseau",
    description: "Cartes actives, IP, MAC, passerelle et DNS.",
  },
  {
    key: "session",
    group: "system",
    label: "Session utilisateur",
    description: "Compte Windows actuellement connecté sur le poste.",
  },
  {
    key: "updates",
    group: "system",
    label: "Correctifs Windows",
    description: "Hotfixes récents, MAJ/pilotes en attente et redémarrage requis.",
  },
  {
    key: "license",
    group: "system",
    label: "Licence Windows",
    description: "Édition Windows activée sur le poste.",
  },
  {
    key: "chassis",
    group: "hardware",
    label: "Marque, modèle & n° de série",
    description: "Constructeur, modèle du poste et numéro de série BIOS.",
  },
  {
    key: "hardware",
    group: "hardware",
    label: "Matériel",
    description: "CPU, RAM, disques logiques/physiques et GPU.",
  },
  {
    key: "performance",
    group: "monitoring",
    label: "Performance",
    description: "Charge CPU, RAM utilisée, uptime et processus actifs.",
  },
  {
    key: "sensors",
    group: "monitoring",
    label: "Capteurs",
    description: "Températures WMI et batterie (portables).",
  },
  {
    key: "security",
    group: "monitoring",
    label: "Sécurité locale",
    description: "Defender, pare-feu et BitLocker.",
  },
  {
    key: "printers",
    group: "sync",
    label: "Imprimantes",
    description: "Imprimantes installées, pilote, port et imprimante par défaut.",
    syncOnly: true,
  },
  {
    key: "shares",
    group: "sync",
    label: "Partages & lecteurs mappés",
    description: "Lecteurs réseau mappés et partages locaux Windows.",
    syncOnly: true,
  },
  {
    key: "services",
    group: "sync",
    label: "Services critiques",
    description: "État des services essentiels (spooler, Defender, RPC…).",
    syncOnly: true,
  },
  {
    key: "peripherals",
    group: "sync",
    label: "Écrans & périphériques USB",
    description: "Moniteurs connectés et périphériques USB/HID.",
    syncOnly: true,
  },
  {
    key: "software",
    group: "sync",
    label: "Logiciels installés",
    description:
      "Programmes détectés via le registre (150 max.). Collecté uniquement lors d'une synchronisation complète.",
    syncOnly: true,
    heavy: true,
  },
];

export function buildOverridesFromForm(global, form) {
  const overrides = {};
  if (form.customized.heartbeatIntervalMinutes) {
    overrides.heartbeatIntervalMinutes = form.values.heartbeatIntervalMinutes;
  }
  if (form.customized.offlineThresholdMinutes) {
    overrides.offlineThresholdMinutes = form.values.offlineThresholdMinutes;
  }
  const collectors = {};
  for (const collector of COLLECTORS) {
    if (form.customized.collectors?.[collector.key]) {
      collectors[collector.key] = Boolean(form.values.collectors?.[collector.key]);
    }
  }
  if (Object.keys(collectors).length > 0) {
    overrides.collectors = collectors;
  }
  const metrics = {};
  for (const field of METRICS_FIELDS) {
    if (form.customized.metrics?.[field.key]) {
      metrics[field.key] = form.values.metrics?.[field.key];
    }
  }
  if (Object.keys(metrics).length > 0) {
    overrides.metrics = metrics;
  }
  return overrides;
}

export function formStateFromClientSettings(data) {
  const global = data?.global || {};
  const overrides = data?.overrides || {};
  const effective = data?.effective || global;

  const customized = {
    heartbeatIntervalMinutes: overrides.heartbeatIntervalMinutes != null,
    offlineThresholdMinutes: overrides.offlineThresholdMinutes != null,
    collectors: {},
    metrics: {},
  };
  for (const collector of COLLECTORS) {
    customized.collectors[collector.key] =
      overrides.collectors?.[collector.key] !== undefined &&
      overrides.collectors?.[collector.key] !== null;
  }
  for (const field of METRICS_FIELDS) {
    customized.metrics[field.key] =
      overrides.metrics?.[field.key] !== undefined && overrides.metrics?.[field.key] !== null;
  }

  return {
    useCustom: Boolean(data?.hasCustomConfig),
    customized,
    values: {
      heartbeatIntervalMinutes: effective.heartbeatIntervalMinutes,
      offlineThresholdMinutes: effective.offlineThresholdMinutes,
      collectors: { ...effective.collectors },
      metrics: { ...(effective.metrics || DEFAULT_METRICS) },
    },
    global,
  };
}
