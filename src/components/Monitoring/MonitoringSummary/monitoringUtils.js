import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { mdiWeb, mdiWallFire, mdiWifiMarker, mdiBug } from "@mdi/js";
import { FaEthernet } from "react-icons/fa";
import { IoServerSharp } from "react-icons/io5";
import { SECTION_ID_MAP } from "./monitoringConstants";

export function getModuleId(moduleName) {
  const key = String(moduleName).toLowerCase();
  return SECTION_ID_MAP[key] || `${key}-section`;
}

export function getModuleIcon(moduleName) {
  const key = String(moduleName || "").toLowerCase();
  const size = 50;

  switch (key) {
    // INFRASTRUCTURE
    case "internet":
      return <Icon path={mdiWeb} size={size} />;
    case "firewalls":
    case "firewall":
      return <Icon path={mdiWallFire} size={size} />;
    case "wifi":
    case "bornewifi":
      return <Icon path={mdiWifiMarker} size={size} />;
    case "serveurs":
      return (
        <IconifyIcon
          icon="mingcute:server-fill"
          width={size}
          height={size}
        />
      );
    case "stockage":
      return <IoServerSharp size={size} />;
    case "switch":
      return <FaEthernet size={size} />;

    // CYBERSÉCURITÉ
    case "antivirus":
      return <Icon path={mdiBug} size={size} />;
    case "antispam":
      return (
        <IconifyIcon
          icon="material-symbols:mail-shield-outline"
          width={size}
          height={size}
        />
      );
    case "firewallregles":
      return (
        <IconifyIcon
          icon="iconoir:pc-firewall"
          width={size}
          height={size}
        />
      );
    case "sauvegarde":
      return (
        <IconifyIcon
          icon="material-symbols:backup"
          width={size}
          height={size}
        />
      );

    // SERVICES
    case "office365":
      return (
        <IconifyIcon
          icon="hugeicons:office-365"
          width={size}
          height={size}
        />
      );
    case "ndd":
      return (
        <IconifyIcon
          icon="stash:domain"
          width={size}
          height={size}
        />
      );
    default:
      return null;
  }
}

export function formatModuleLabel(m) {
  if (!m) return '';
  const map = {
    internet: 'Internet',
    serveurs: 'Serveurs',
    stockage: 'Stockage',
    firewalls: 'Firewalls',
    firewall: 'Firewalls',
    switch: 'Switch',
    wifi: 'Wi‑Fi',
    sauvegarde: 'Sauvegarde',
    antivirus: 'Antivirus',
    antispam: 'Antispam',
    office365: 'Office 365',
    ndd: 'Noms de domaine',
    firewallregles: 'Règles de filtrage',
    summary: 'Résumé',
  };
  return map[String(m).toLowerCase()] || m;
}

export function getModuleCategory(moduleName) {
  if (!moduleName) return 'infrastructure';
  const key = String(moduleName).toLowerCase();
  
  // Modules Infrastructure
  const infrastructureModules = ['internet', 'serveurs', 'stockage', 'firewalls', 'firewall', 'switch', 'wifi'];
  
  // Modules Cybersécurité
  const cybersecuriteModules = ['sauvegarde', 'antivirus', 'antispam', 'coffre fort numérique', 'coffrefort', 'firewall regle de filtrage', 'firewallregle', 'firewallregles'];
  
  // Modules Services (nom de domaine, Office 365)
  const servicesModules = ['ndd', 'office365', 'office 365'];
  
  // Module Summary (résumé) - séparé
  if (key === 'summary' || key === 'résumé') {
    return 'summary';
  }
  
  if (infrastructureModules.includes(key)) {
    return 'infrastructure';
  } else if (cybersecuriteModules.includes(key)) {
    return 'cybersecurite';
  } else if (servicesModules.includes(key)) {
    return 'services';
  }
  
  // Par défaut, considérer comme infrastructure
  return 'infrastructure';
}

export function normalizeModuleName(key) {
  if (!key) return "";
  const normalizedKey = key.toLowerCase();
  if (normalizedKey === "internet") return "internet";
  if (normalizedKey === "serveurs" || normalizedKey === "serveur") return "serveurs";
  if (normalizedKey === "stockage") return "stockage";
  if (normalizedKey === "firewall" || normalizedKey === "parefeu") return "firewall";
  if (normalizedKey === "switch") return "switch";
  if (normalizedKey === "bornewifi" || normalizedKey === "wifi") return "wifi";
  if (normalizedKey === "sauvegarde" || normalizedKey === "backup") return "sauvegarde";
  if (normalizedKey === "antivirus") return "antivirus";
  if (normalizedKey === "antispam") return "antispam";
  if (normalizedKey === "firewallregles" || normalizedKey.includes("regle")) return "firewallregles";
  if (normalizedKey === "ndd") return "ndd";
  if (normalizedKey === "office365" || normalizedKey === "office 365" || normalizedKey === "o365") return "office365";
  return normalizedKey;
}

