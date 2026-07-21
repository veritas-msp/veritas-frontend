import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const TAB_IDS = ["overview", "devices", "backups", "contracts", "rmm", "alert-rules"];
const LICENSE_MODULE_KEYS = ["antivirus", "antispam", "domain", "ssl", "licences", "o365", "backup", "firewall", "toip"];
const SUPERVISION_COPY = {
  fr: {
    eyebrow: "Services managés",
    pageTitle: "Centre de supervision",
    subtitle: "Infrastructure & continuité · périphériques, sauvegardes et agents RMM.",
    tabSectionsAria: "Sections supervision",
    tabs: {
      overview: "À traiter",
      devices: "Périphériques",
      backups: "Sauvegardes",
      contracts: "Contrats & licences",
      rmm: "Agents RMM",
      "alert-rules": "Règles d'alerte"
    },
    contractStatus: {
      expired: "Expiré",
      expiring: "Expire bientôt",
      suspended: "Suspendu"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Noms de domaine",
      ssl: "Certificats SSL",
      licences: "Licences & abonnements",
      o365: "Microsoft 365",
      backup: "Sauvegarde",
      firewall: "Firewall",
      toip: "TOIP / VoIP"
    },
    contractType: {
      msp: "Contrat MSP",
      enterprise: "Contrat entreprise",
      license: "Licence"
    },
    table: {
      name: "Nom",
      type: "Type",
      status: "Statut",
      expiration: "Expiration",
      actions: "Actions",
      sortBy: "Trier par {label}"
    },
    contracts: {
      okTitle: "Contrats et licences OK",
      okText: "Aucune échéance expirée ou à renouveler dans les 60 prochains jours (contrats, antivirus, antispam, domaines, SSL, licences).",
      alertCount: "{count} alerte",
      alertCountPlural: "{count} alertes",
      expiredCount: "{count} expirée",
      expiredCountPlural: "{count} expirées",
      expiringCount: "{count} à renouveler",
      viewEnterprise: "Voir l'entreprise",
      panelTitle: "Contrats & licences à traiter"
    },
    priority: {
      emptyTitle: "Aucune alerte périphérique",
      emptyText: "Tous les équipements supervisés sont dans un état nominal.",
      intervene: "Intervenir",
      analyze: "Analyser",
      treat: "Traiter",
      noName: "Sans nom",
      storage: "Stockage",
      hints: {
        monitor_critical: "Intervenir sur l'alerte CheckMK et rétablir le service.",
        monitor_warning: "Analyser le warning CheckMK avant dégradation.",
        agent_offline: "Contrôler alimentation, réseau et service agent RMM (hors ligne depuis plus de 48 h).",
        unmapped: "Mapper l'équipement à un hôte CheckMK depuis la fiche matériel.",
        no_data: "Vérifier le mapping CheckMK et la remontée des métriques.",
        warranty_expired: "Renouveler ou mettre à jour la garantie constructeur.",
        warranty_soon: "Planifier le renouvellement de garantie.",
        maintenance_expired: "Renouveler la licence de maintenance firewall.",
        maintenance_soon: "Anticiper le renouvellement de la licence maintenance.",
        battery_expired: "Remplacer la batterie onduleur / PDU.",
        battery_soon: "Commander ou planifier le remplacement batterie.",
        updates_pending: "Planifier l'installation des mises à jour Windows.",
        disk_critical: "Libérer ou étendre l'espace disque en urgence.",
        disk_warn: "Surveiller l'espace disque et planifier un nettoyage.",
        missing_ip: "Compléter l'adresse IP dans la fiche matériel."
      },
      statusHints: {
        critical: "Alerte supervision critique · intervention immédiate.",
        offline: "Agent RMM hors ligne · vérifier connectivité du poste.",
        warning: "Warning supervision · analyser avant dégradation.",
        unmapped: "Équipement non mappé CheckMK · activer la supervision.",
        no_data: "Aucune donnée de supervision · vérifier le mapping.",
        default: "Point de vigilance à traiter depuis la fiche matériel."
      }
    },
    familyStats: {
      emptyTitle: "Aucun équipement trouvé",
      emptyText: "Les statistiques par famille apparaîtront dès que du matériel sera renseigné.",
      monitored: "Supervisé",
      uncovered: "Non couvert",
      supervisedLabel: "supervisé",
      tooltip: "{label} · {monitored}/{total} supervisés",
      openFamily: "Voir les périphériques {label}"
    },
    overview: {
      hexTitle: "Vue d'ensemble",
      hexKpi: {
        todo: "À traiter",
        devices: "Périphériques",
        issues: "Alertes",
        critical: "Critiques",
        offline: "Hors ligne",
        backups: "Sauvegardes",
        supervised: "Supervisé"
      },
      priorityTitle: "À traiter en priorité",
      viewAll: "Voir tout",
      familyTitle: "Supervision par type de périphérique"
    },
    search: {
      devices: "Rechercher un périphérique, client, IP…",
      rmm: "Rechercher un poste, client, IP, OS…",
      clients: "Clients",
      clearFilters: "Effacer ({count})",
      agentCount: "{count} agent",
      agentCountPlural: "{count} agents"
    },
    rmm: {
      online: "En ligne",
      offline: "Hors ligne",
      workstation: "Poste",
      viewWorkstation: "Voir le poste",
      panelTitle: "Agents RMM",
      offlineCount: "{count} hors ligne",
      syncRequested: "Sync demandée",
      lastActivity: "Dernière activité",
      notLinked: "Poste non lié",
      sortBy: "Trier par {label}",
      summary: {
        workstation: "{count} poste",
        workstationPlural: "{count} postes",
        offline: "hors ligne",
        pendingUpdates: "MAJ en attente",
        diskAlert: "disque > 85%",
        diskAlertPlural: "disques > 85%"
      },
      table: {
        hostname: "Poste",
        client: "Client",
        os: "OS",
        build: "Build",
        ip: "IP",
        updates: "MAJ Windows",
        agent: "Agent",
        lastSeen: "Dernière activité",
        actions: "Actions"
      },
      empty: {
        noMatchTitle: "Aucun agent ne correspond",
        allOnlineTitle: "Tous les agents sont en ligne",
        noAgentsTitle: "Aucun agent RMM",
        noMatchText: "Ajustez la recherche (poste, client, IP, OS, domaine…).",
        allOnlineText: "Aucun poste n'est actuellement hors ligne.",
        noAgentsText: "Déployez l'agent Veritas sur les postes clients pour la supervision RMM."
      },
      menu: {
        viewEnterprise: "Voir l'entreprise",
        cancelSync: "Annuler sync complet",
        fullSync: "Sync complet",
        metricsHistory: "Historique métriques",
        copyHost: "Copier le nom du poste",
        copyIp: "Copier l'adresse IP",
        revoke: "Révoquer l'agent"
      },
      clipboard: {
        hostName: "Nom du poste",
        ipAddress: "Adresse IP",
        copied: "{label} copié",
        copyFailed: "Impossible de copier"
      },
      toasts: {
        syncRequested: "Sync complet demandé pour {hostname}. L'inventaire sera mis à jour au prochain passage de l'agent.",
        syncRequestFailed: "Impossible de demander la synchronisation",
        syncCancelled: "Demande de sync complet annulée pour {hostname}.",
        syncCancelFailed: "Impossible d'annuler la synchronisation",
        revokeFailed: "Poste introuvable pour révoquer cet agent",
        metricsNoEquipment: "Aucun équipement lié à cet agent pour afficher les métriques"
      }
    },
    time: {
      never: "Jamais"
    },
    error: {
      title: "Erreur de chargement"
    }
  },
  en: {
    eyebrow: "Managed services",
    pageTitle: "Monitoring center",
    subtitle: "Infrastructure & continuity · devices, backups, and RMM agents.",
    tabSectionsAria: "Monitoring sections",
    tabs: {
      overview: "To do",
      devices: "Devices",
      backups: "Backups",
      contracts: "Contracts & licenses",
      rmm: "RMM agents",
      "alert-rules": "Alert rules"
    },
    contractStatus: {
      expired: "Expired",
      expiring: "Expiring soon",
      suspended: "Suspended"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Domain names",
      ssl: "SSL certificates",
      licences: "Licenses & subscriptions",
      o365: "Microsoft 365",
      backup: "Backup",
      firewall: "Firewall",
      toip: "VoIP"
    },
    contractType: {
      msp: "MSP contract",
      enterprise: "Company contract",
      license: "License"
    },
    table: {
      name: "Name",
      type: "Type",
      status: "Status",
      expiration: "Expiration",
      actions: "Actions",
      sortBy: "Sort by {label}"
    },
    contracts: {
      okTitle: "Contracts and licenses OK",
      okText: "No expired or upcoming renewals within the next 60 days (contracts, antivirus, antispam, domains, SSL, licenses).",
      alertCount: "{count} alert",
      alertCountPlural: "{count} alerts",
      expiredCount: "{count} expired",
      expiredCountPlural: "{count} expired",
      expiringCount: "{count} to renew",
      viewEnterprise: "View company",
      panelTitle: "Contracts & licenses to review"
    },
    priority: {
      emptyTitle: "No device alerts",
      emptyText: "All supervised equipment is in a nominal state.",
      intervene: "Intervene",
      analyze: "Analyze",
      treat: "Handle",
      noName: "Unnamed",
      storage: "Storage",
      hints: {
        monitor_critical: "Address the CheckMK alert and restore the service.",
        monitor_warning: "Analyze the CheckMK warning before degradation.",
        agent_offline: "Check power, network, and RMM agent service (offline for more than 48 h).",
        unmapped: "Map the equipment to a CheckMK host from the hardware record.",
        no_data: "Verify CheckMK mapping and metric collection.",
        warranty_expired: "Renew or update the manufacturer warranty.",
        warranty_soon: "Plan warranty renewal.",
        maintenance_expired: "Renew the firewall maintenance license.",
        maintenance_soon: "Anticipate maintenance license renewal.",
        battery_expired: "Replace the UPS/PDU battery.",
        battery_soon: "Order or plan battery replacement.",
        updates_pending: "Schedule Windows update installation.",
        disk_critical: "Free or extend disk space urgently.",
        disk_warn: "Monitor disk space and plan cleanup.",
        missing_ip: "Complete the IP address in the hardware record."
      },
      statusHints: {
        critical: "Critical supervision alert · immediate action required.",
        offline: "RMM agent offline · check endpoint connectivity.",
        warning: "Monitoring warning · analyze before degradation.",
        unmapped: "Equipment not mapped to CheckMK · enable supervision.",
        no_data: "No supervision data · verify mapping.",
        default: "Item to handle from the hardware record."
      }
    },
    familyStats: {
      emptyTitle: "No equipment found",
      emptyText: "Family statistics will appear once hardware is recorded.",
      monitored: "Monitored",
      uncovered: "Not covered",
      supervisedLabel: "monitored",
      tooltip: "{label} · {monitored}/{total} monitored",
      openFamily: "View {label} devices"
    },
    overview: {
      hexTitle: "Overview",
      hexKpi: {
        todo: "To do",
        devices: "Devices",
        issues: "Alerts",
        critical: "Critical",
        offline: "Offline",
        backups: "Backups",
        supervised: "Monitored"
      },
      priorityTitle: "Priority items",
      viewAll: "View all",
      familyTitle: "Monitoring by device type"
    },
    search: {
      devices: "Search device, client, IP…",
      rmm: "Search workstation, client, IP, OS…",
      clients: "Clients",
      clearFilters: "Clear ({count})",
      agentCount: "{count} agent",
      agentCountPlural: "{count} agents"
    },
    rmm: {
      online: "Online",
      offline: "Offline",
      workstation: "Workstation",
      viewWorkstation: "View workstation",
      panelTitle: "RMM agents",
      offlineCount: "{count} offline",
      syncRequested: "Sync requested",
      lastActivity: "Last activity",
      notLinked: "Workstation not linked",
      sortBy: "Sort by {label}",
      summary: {
        workstation: "{count} workstation",
        workstationPlural: "{count} workstations",
        offline: "offline",
        pendingUpdates: "pending updates",
        diskAlert: "disk > 85%",
        diskAlertPlural: "disks > 85%"
      },
      table: {
        hostname: "Workstation",
        client: "Client",
        os: "OS",
        build: "Build",
        ip: "IP",
        updates: "Windows updates",
        agent: "Agent",
        lastSeen: "Last activity",
        actions: "Actions"
      },
      empty: {
        noMatchTitle: "No matching agents",
        allOnlineTitle: "All agents are online",
        noAgentsTitle: "No RMM agents",
        noMatchText: "Adjust your search (workstation, client, IP, OS, domain…).",
        allOnlineText: "No workstations are currently offline.",
        noAgentsText: "Deploy the Veritas agent on client workstations for RMM supervision."
      },
      menu: {
        viewEnterprise: "View company",
        cancelSync: "Cancel full sync",
        fullSync: "Full sync",
        metricsHistory: "Metrics history",
        copyHost: "Copy workstation name",
        copyIp: "Copy IP address",
        revoke: "Revoke agent"
      },
      clipboard: {
        hostName: "Workstation name",
        ipAddress: "IP address",
        copied: "{label} copied",
        copyFailed: "Unable to copy"
      },
      toasts: {
        syncRequested: "Full sync requested for {hostname}. Inventory will update on the agent's next run.",
        syncRequestFailed: "Unable to request synchronization",
        syncCancelled: "Full sync request cancelled for {hostname}.",
        syncCancelFailed: "Unable to cancel synchronization",
        revokeFailed: "Workstation not found to revoke this agent",
        metricsNoEquipment: "No equipment linked to this agent to show metrics"
      }
    },
    time: {
      never: "Never"
    },
    error: {
      title: "Loading error"
    }
  },
  de: {
    eyebrow: "Managed Services",
    pageTitle: "Überwachungszentrum",
    subtitle: "Infrastruktur & Kontinuität · Geräte, Backups und RMM-Agenten.",
    tabSectionsAria: "Überwachungsbereiche",
    tabs: {
      overview: "Zu erledigen",
      devices: "Geräte",
      backups: "Backups",
      contracts: "Verträge & Lizenzen",
      rmm: "RMM-Agenten",
      "alert-rules": "Alarmregeln"
    },
    contractStatus: {
      expired: "Abgelaufen",
      expiring: "Läuft bald ab",
      suspended: "Ausgesetzt"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Domainnamen",
      ssl: "SSL-Zertifikate",
      licences: "Lizenzen & Abonnements",
      o365: "Microsoft 365",
      backup: "Backup",
      firewall: "Firewall",
      toip: "VoIP"
    },
    contractType: {
      msp: "MSP-Vertrag",
      enterprise: "Unternehmensvertrag",
      license: "Lizenz"
    },
    table: {
      name: "Name",
      type: "Typ",
      status: "Status",
      expiration: "Ablauf",
      actions: "Aktionen",
      sortBy: "Sortieren nach {label}"
    },
    contracts: {
      okTitle: "Verträge und Lizenzen OK",
      okText: "Keine abgelaufenen oder bald fälligen Verlängerungen in den nächsten 60 Tagen.",
      alertCount: "{count} Alarm",
      alertCountPlural: "{count} Alarme",
      expiredCount: "{count} abgelaufen",
      expiredCountPlural: "{count} abgelaufen",
      expiringCount: "{count} zu erneuern",
      viewEnterprise: "Unternehmen anzeigen",
      panelTitle: "Verträge & Lizenzen zu bearbeiten"
    },
    priority: {
      emptyTitle: "Keine Gerätealarme",
      emptyText: "Alle überwachten Geräte sind im Normalzustand.",
      intervene: "Eingreifen",
      analyze: "Analysieren",
      treat: "Bearbeiten",
      noName: "Ohne Name",
      storage: "Speicher",
      hints: {
        monitor_critical: "CheckMK-Alarm bearbeiten und Dienst wiederherstellen.",
        monitor_warning: "CheckMK-Warnung vor Verschlechterung analysieren.",
        agent_offline: "Strom, Netzwerk und RMM-Agent prüfen (offline seit über 48 h).",
        unmapped: "Gerät in der Hardware-Akte einem CheckMK-Host zuordnen.",
        no_data: "CheckMK-Mapping und Metriken prüfen.",
        warranty_expired: "Herstellergarantie erneuern oder aktualisieren.",
        warranty_soon: "Garantieverlängerung planen.",
        maintenance_expired: "Firewall-Wartungslizenz erneuern.",
        maintenance_soon: "Wartungslizenz rechtzeitig erneuern.",
        battery_expired: "USV-/PDU-Batterie ersetzen.",
        battery_soon: "Batterieersatz planen oder bestellen.",
        updates_pending: "Windows-Updates einplanen.",
        disk_critical: "Speicherplatz dringend freigeben oder erweitern.",
        disk_warn: "Speicherplatz überwachen und Bereinigung planen.",
        missing_ip: "IP-Adresse in der Hardware-Akte ergänzen."
      },
      statusHints: {
        critical: "Kritischer Überwachungsalarm · sofort handeln.",
        offline: "RMM-Agent offline · Konnektivität prüfen.",
        warning: "Überwachungswarnung · vor Verschlechterung analysieren.",
        unmapped: "Gerät nicht CheckMK zugeordnet · Überwachung aktivieren.",
        no_data: "Keine Überwachungsdaten · Mapping prüfen.",
        default: "Punkt aus der Hardware-Akte bearbeiten."
      }
    },
    familyStats: {
      emptyTitle: "Keine inventarisierten Geräte",
      emptyText: "Familienstatistiken erscheinen, sobald Hardware erfasst ist.",
      monitored: "Überwacht",
      uncovered: "Nicht abgedeckt",
      supervisedLabel: "überwacht",
      tooltip: "{label} · {monitored}/{total} überwacht",
      openFamily: "Geräte {label} anzeigen"
    },
    overview: {
      hexTitle: "Übersicht",
      hexKpi: {
        todo: "Zu erledigen",
        devices: "Geräte",
        issues: "Alarme",
        critical: "Kritisch",
        offline: "Offline",
        backups: "Backups",
        supervised: "Überwacht"
      },
      priorityTitle: "Priorität",
      viewAll: "Alle anzeigen",
      familyTitle: "Überwachung nach Gerätetyp"
    },
    search: {
      devices: "Gerät, Kunde, IP suchen…",
      rmm: "Arbeitsplatz, Kunde, IP, OS suchen…",
      clients: "Kunden",
      clearFilters: "Löschen ({count})",
      agentCount: "{count} Agent",
      agentCountPlural: "{count} Agenten"
    },
    rmm: {
      online: "Online",
      offline: "Offline",
      workstation: "Arbeitsplatz",
      viewWorkstation: "Arbeitsplatz anzeigen",
      panelTitle: "RMM-Agenten",
      offlineCount: "{count} offline",
      syncRequested: "Sync angefordert",
      lastActivity: "Letzte Aktivität",
      notLinked: "Arbeitsplatz nicht verknüpft",
      sortBy: "Sortieren nach {label}",
      summary: {
        workstation: "{count} Arbeitsplatz",
        workstationPlural: "{count} Arbeitsplätze",
        offline: "offline",
        pendingUpdates: "Updates ausstehend",
        diskAlert: "Festplatte > 85%",
        diskAlertPlural: "Festplatten > 85%"
      },
      table: {
        hostname: "Arbeitsplatz",
        client: "Kunde",
        os: "OS",
        build: "Build",
        ip: "IP",
        updates: "Windows-Updates",
        agent: "Agent",
        lastSeen: "Letzte Aktivität",
        actions: "Aktionen"
      },
      empty: {
        noMatchTitle: "Kein passender Agent",
        allOnlineTitle: "Alle Agenten sind online",
        noAgentsTitle: "Keine RMM-Agenten",
        noMatchText: "Suche anpassen (Arbeitsplatz, Kunde, IP, OS, Domäne…).",
        allOnlineText: "Derzeit sind keine Arbeitsplätze offline.",
        noAgentsText: "Veritas-Agent auf Kunden-Arbeitsplätzen für RMM-Überwachung bereitstellen."
      },
      menu: {
        viewEnterprise: "Unternehmen anzeigen",
        cancelSync: "Vollsync abbrechen",
        fullSync: "Vollsync",
        metricsHistory: "Metrik-Verlauf",
        copyHost: "Arbeitsplatzname kopieren",
        copyIp: "IP-Adresse kopieren",
        revoke: "Agent widerrufen"
      },
      clipboard: {
        hostName: "Arbeitsplatzname",
        ipAddress: "IP-Adresse",
        copied: "{label} kopiert",
        copyFailed: "Kopieren nicht möglich"
      },
      toasts: {
        syncRequested: "Vollsync für {hostname} angefordert. Inventar wird beim nächsten Agentenlauf aktualisiert.",
        syncRequestFailed: "Synchronisation konnte nicht angefordert werden",
        syncCancelled: "Vollsync-Anfrage für {hostname} abgebrochen.",
        syncCancelFailed: "Synchronisation konnte nicht abgebrochen werden",
        revokeFailed: "Arbeitsplatz zum Widerruf dieses Agenten nicht gefunden",
        metricsNoEquipment: "Kein mit diesem Agenten verknüpftes Gerät für Metriken"
      }
    },
    time: {
      never: "Nie"
    },
    error: {
      title: "Ladefehler"
    }
  },
  it: {
    eyebrow: "Servizi gestiti",
    pageTitle: "Centro di supervisione",
    subtitle: "Infrastruttura e continuità · dispositivi, backup e agenti RMM.",
    tabSectionsAria: "Sezioni supervisione",
    tabs: {
      overview: "Da trattare",
      devices: "Dispositivi",
      backups: "Backup",
      contracts: "Contratti e licenze",
      rmm: "Agenti RMM",
      "alert-rules": "Regole di alert"
    },
    contractStatus: {
      expired: "Scaduto",
      expiring: "In scadenza",
      suspended: "Sospeso"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Domini",
      ssl: "Certificati SSL",
      licences: "Licenze e abbonamenti",
      o365: "Microsoft 365",
      backup: "Backup",
      firewall: "Firewall",
      toip: "VoIP"
    },
    contractType: {
      msp: "Contratto MSP",
      enterprise: "Contratto azienda",
      license: "Licenza"
    },
    table: {
      name: "Nome",
      type: "Tipo",
      status: "Stato",
      expiration: "Scadenza",
      actions: "Azioni",
      sortBy: "Ordina per {label}"
    },
    contracts: {
      okTitle: "Contratti e licenze OK",
      okText: "Nessuna scadenza o rinnovo entro i prossimi 60 giorni.",
      alertCount: "{count} alert",
      alertCountPlural: "{count} alert",
      expiredCount: "{count} scaduto",
      expiredCountPlural: "{count} scaduti",
      expiringCount: "{count} da rinnovare",
      viewEnterprise: "Vedi azienda",
      panelTitle: "Contratti e licenze da trattare"
    },
    priority: {
      emptyTitle: "Nessun alert dispositivo",
      emptyText: "Tutti gli equipaggiamenti supervisionati sono nominali.",
      intervene: "Intervenire",
      analyze: "Analizzare",
      treat: "Trattare",
      noName: "Senza nome",
      storage: "Storage",
      hints: {
        monitor_critical: "Intervenire sull'alert CheckMK e ripristinare il servizio.",
        monitor_warning: "Analizzare il warning CheckMK prima del degrado.",
        agent_offline: "Controllare alimentazione, rete e agente RMM (offline da oltre 48 h).",
        unmapped: "Associare l'equipaggiamento a un host CheckMK dalla scheda hardware.",
        no_data: "Verificare mapping CheckMK e metriche.",
        warranty_expired: "Rinnovare o aggiornare la garanzia costruttore.",
        warranty_soon: "Pianificare il rinnovo garanzia.",
        maintenance_expired: "Rinnovare la licenza manutenzione firewall.",
        maintenance_soon: "Anticipare il rinnovo licenza manutenzione.",
        battery_expired: "Sostituire la batteria UPS/PDU.",
        battery_soon: "Ordinare o pianificare sostituzione batteria.",
        updates_pending: "Pianificare installazione aggiornamenti Windows.",
        disk_critical: "Liberare o estendere spazio disco urgentemente.",
        disk_warn: "Monitorare spazio disco e pianificare pulizia.",
        missing_ip: "Completare l'indirizzo IP nella scheda hardware."
      },
      statusHints: {
        critical: "Alert supervisione critico · intervento immediato.",
        offline: "Agente RMM offline · verificare connettività.",
        warning: "Warning supervisione · analizzare prima del degrado.",
        unmapped: "Equipaggiamento non mappato CheckMK · attivare supervisione.",
        no_data: "Nessun dato supervisione · verificare mapping.",
        default: "Punto da trattare dalla scheda hardware."
      }
    },
    familyStats: {
      emptyTitle: "Nessun dispositivo inventariato",
      emptyText: "Le statistiche per famiglia appariranno con hardware registrato.",
      monitored: "Supervisionato",
      uncovered: "Non coperto",
      supervisedLabel: "supervisionato",
      tooltip: "{label} · {monitored}/{total} supervisionati",
      openFamily: "Vedi dispositivi {label}"
    },
    overview: {
      hexTitle: "Panoramica",
      hexKpi: {
        todo: "Da trattare",
        devices: "Dispositivi",
        issues: "Avvisi",
        critical: "Critici",
        offline: "Offline",
        backups: "Backup",
        supervised: "Supervisionato"
      },
      priorityTitle: "Da trattare in priorità",
      viewAll: "Vedi tutto",
      familyTitle: "Supervisione per tipo di dispositivo"
    },
    search: {
      devices: "Cerca dispositivo, cliente, IP…",
      rmm: "Cerca postazione, cliente, IP, OS…",
      clients: "Clienti",
      clearFilters: "Cancella ({count})",
      agentCount: "{count} agente",
      agentCountPlural: "{count} agenti"
    },
    rmm: {
      online: "Online",
      offline: "Offline",
      workstation: "Postazione",
      viewWorkstation: "Vedi postazione",
      panelTitle: "Agenti RMM",
      offlineCount: "{count} offline",
      syncRequested: "Sync richiesta",
      lastActivity: "Ultima attività",
      notLinked: "Postazione non collegata",
      sortBy: "Ordina per {label}",
      summary: {
        workstation: "{count} postazione",
        workstationPlural: "{count} postazioni",
        offline: "offline",
        pendingUpdates: "aggiornamenti in attesa",
        diskAlert: "disco > 85%",
        diskAlertPlural: "dischi > 85%"
      },
      table: {
        hostname: "Postazione",
        client: "Cliente",
        os: "OS",
        build: "Build",
        ip: "IP",
        updates: "Aggiornamenti Windows",
        agent: "Agente",
        lastSeen: "Ultima attività",
        actions: "Azioni"
      },
      empty: {
        noMatchTitle: "Nessun agente corrispondente",
        allOnlineTitle: "Tutti gli agenti sono online",
        noAgentsTitle: "Nessun agente RMM",
        noMatchText: "Modifica la ricerca (postazione, cliente, IP, OS, dominio…).",
        allOnlineText: "Nessuna postazione è attualmente offline.",
        noAgentsText: "Distribuisci l'agente Veritas sulle postazioni clienti per la supervisione RMM."
      },
      menu: {
        viewEnterprise: "Vedi azienda",
        cancelSync: "Annulla sync completo",
        fullSync: "Sync completo",
        metricsHistory: "Storico metriche",
        copyHost: "Copia nome postazione",
        copyIp: "Copia indirizzo IP",
        revoke: "Revoca agente"
      },
      clipboard: {
        hostName: "Nome postazione",
        ipAddress: "Indirizzo IP",
        copied: "{label} copiato",
        copyFailed: "Impossibile copiare"
      },
      toasts: {
        syncRequested: "Sync completo richiesto per {hostname}. L'inventario sarà aggiornato al prossimo passaggio dell'agente.",
        syncRequestFailed: "Impossibile richiedere la sincronizzazione",
        syncCancelled: "Richiesta sync completo annullata per {hostname}.",
        syncCancelFailed: "Impossibile annullare la sincronizzazione",
        revokeFailed: "Postazione non trovata per revocare questo agente",
        metricsNoEquipment: "Nessuna apparecchiatura collegata a questo agente per le metriche"
      }
    },
    time: {
      never: "Mai"
    },
    error: {
      title: "Errore di caricamento"
    }
  },
  es: {
    eyebrow: "Servicios gestionados",
    pageTitle: "Centro de supervisión",
    subtitle: "Infraestructura y continuidad · dispositivos, copias de seguridad y agentes RMM.",
    tabSectionsAria: "Secciones de supervisión",
    tabs: {
      overview: "Por tratar",
      devices: "Dispositivos",
      backups: "Copias de seguridad",
      contracts: "Contratos y licencias",
      rmm: "Agentes RMM",
      "alert-rules": "Reglas de alerta"
    },
    contractStatus: {
      expired: "Expirado",
      expiring: "Expira pronto",
      suspended: "Suspendido"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Dominios",
      ssl: "Certificados SSL",
      licences: "Licencias y suscripciones",
      o365: "Microsoft 365",
      backup: "Copia de seguridad",
      firewall: "Firewall",
      toip: "VoIP"
    },
    contractType: {
      msp: "Contrato MSP",
      enterprise: "Contrato empresa",
      license: "Licencia"
    },
    table: {
      name: "Nombre",
      type: "Tipo",
      status: "Estado",
      expiration: "Expiración",
      actions: "Acciones",
      sortBy: "Ordenar por {label}"
    },
    contracts: {
      okTitle: "Contratos y licencias OK",
      okText: "Ningún vencimiento o renovación en los próximos 60 días.",
      alertCount: "{count} alerta",
      alertCountPlural: "{count} alertas",
      expiredCount: "{count} expirado",
      expiredCountPlural: "{count} expirados",
      expiringCount: "{count} por renovar",
      viewEnterprise: "Ver empresa",
      panelTitle: "Contratos y licencias por tratar"
    },
    priority: {
      emptyTitle: "Ninguna alerta de dispositivo",
      emptyText: "Todos los equipos supervisados están en estado nominal.",
      intervene: "Intervenir",
      analyze: "Analizar",
      treat: "Tratar",
      noName: "Sin nombre",
      storage: "Almacenamiento",
      hints: {
        monitor_critical: "Actuar sobre la alerta CheckMK y restablecer el servicio.",
        monitor_warning: "Analizar el warning CheckMK antes de la degradación.",
        agent_offline: "Comprobar alimentación, red y agente RMM (offline más de 48 h).",
        unmapped: "Asociar el equipo a un host CheckMK desde la ficha hardware.",
        no_data: "Verificar mapping CheckMK y métricas.",
        warranty_expired: "Renovar o actualizar la garantía del fabricante.",
        warranty_soon: "Planificar renovación de garantía.",
        maintenance_expired: "Renovar licencia de mantenimiento firewall.",
        maintenance_soon: "Anticipar renovación de licencia de mantenimiento.",
        battery_expired: "Reemplazar batería SAI/PDU.",
        battery_soon: "Pedir o planificar reemplazo de batería.",
        updates_pending: "Planificar instalación de actualizaciones Windows.",
        disk_critical: "Liberar o ampliar espacio en disco urgentemente.",
        disk_warn: "Supervisar espacio en disco y planificar limpieza.",
        missing_ip: "Completar la dirección IP en la ficha hardware."
      },
      statusHints: {
        critical: "Alerta crítica de supervisión · intervención inmediata.",
        offline: "Agente RMM offline · verificar conectividad.",
        warning: "Warning de supervisión · analizar antes de degradación.",
        unmapped: "Equipo no mapeado CheckMK · activar supervisión.",
        no_data: "Sin datos de supervisión · verificar mapping.",
        default: "Punto a tratar desde la ficha hardware."
      }
    },
    familyStats: {
      emptyTitle: "Ningún dispositivo inventariado",
      emptyText: "Las estadísticas por familia aparecerán al registrar hardware.",
      monitored: "Supervisado",
      uncovered: "No cubierto",
      supervisedLabel: "supervisado",
      tooltip: "{label} · {monitored}/{total} supervisados",
      openFamily: "Ver dispositivos {label}"
    },
    overview: {
      hexTitle: "Resumen",
      hexKpi: {
        todo: "Por tratar",
        devices: "Dispositivos",
        issues: "Alertas",
        critical: "Críticos",
        offline: "Desconectados",
        backups: "Copias",
        supervised: "Supervisado"
      },
      priorityTitle: "Prioridad",
      viewAll: "Ver todo",
      familyTitle: "Supervisión por tipo de dispositivo"
    },
    search: {
      devices: "Buscar dispositivo, cliente, IP…",
      rmm: "Buscar equipo, cliente, IP, SO…",
      clients: "Clientes",
      clearFilters: "Borrar ({count})",
      agentCount: "{count} agente",
      agentCountPlural: "{count} agentes"
    },
    rmm: {
      online: "En línea",
      offline: "Desconectado",
      workstation: "Equipo",
      viewWorkstation: "Ver equipo",
      panelTitle: "Agentes RMM",
      offlineCount: "{count} desconectados",
      syncRequested: "Sync solicitada",
      lastActivity: "Última actividad",
      notLinked: "Equipo no vinculado",
      sortBy: "Ordenar por {label}",
      summary: {
        workstation: "{count} equipo",
        workstationPlural: "{count} equipos",
        offline: "desconectados",
        pendingUpdates: "actualizaciones pendientes",
        diskAlert: "disco > 85%",
        diskAlertPlural: "discos > 85%"
      },
      table: {
        hostname: "Equipo",
        client: "Cliente",
        os: "SO",
        build: "Build",
        ip: "IP",
        updates: "Actualizaciones Windows",
        agent: "Agente",
        lastSeen: "Última actividad",
        actions: "Acciones"
      },
      empty: {
        noMatchTitle: "Ningún agente coincide",
        allOnlineTitle: "Todos los agentes están en línea",
        noAgentsTitle: "Ningún agente RMM",
        noMatchText: "Ajusta la búsqueda (equipo, cliente, IP, SO, dominio…).",
        allOnlineText: "Ningún equipo está desconectado actualmente.",
        noAgentsText: "Despliega el agente Veritas en los equipos clientes para la supervisión RMM."
      },
      menu: {
        viewEnterprise: "Ver empresa",
        cancelSync: "Cancelar sync completo",
        fullSync: "Sync completo",
        metricsHistory: "Historial de métricas",
        copyHost: "Copiar nombre del equipo",
        copyIp: "Copiar dirección IP",
        revoke: "Revocar agente"
      },
      clipboard: {
        hostName: "Nombre del equipo",
        ipAddress: "Dirección IP",
        copied: "{label} copiado",
        copyFailed: "No se puede copiar"
      },
      toasts: {
        syncRequested: "Sync completo solicitado para {hostname}. El inventario se actualizará en el próximo paso del agente.",
        syncRequestFailed: "No se puede solicitar la sincronización",
        syncCancelled: "Solicitud de sync completo cancelada para {hostname}.",
        syncCancelFailed: "No se puede cancelar la sincronización",
        revokeFailed: "Equipo no encontrado para revocar este agente",
        metricsNoEquipment: "Ningún equipo vinculado a este agente para mostrar métricas"
      }
    },
    time: {
      never: "Nunca"
    },
    error: {
      title: "Error de carga"
    }
  }
};
const TAB_ICONS = {
  overview: "mdi:lightning-bolt",
  devices: "mdi:devices",
  backups: "mdi:backup-restore",
  contracts: "mdi:file-document-alert-outline",
  rmm: "mdi:laptop",
  "alert-rules": "mdi:bell-cog-outline"
};
const LICENSE_MODULE_ICONS = {
  antivirus: "mdi:shield-search",
  antispam: "mdi:email-secure-outline",
  domain: "mdi:web",
  ssl: "mdi:certificate-outline",
  licences: "mdi:license",
  o365: "mdi:microsoft",
  backup: "mdi:backup-restore",
  firewall: "mdi:shield-outline",
  toip: "mdi:phone-voip"
};
export function getSupervisionCenterCopy(locale) {
  const t = pickLocaleMessages(SUPERVISION_COPY, locale);
  return {
    ...t,
    tabs: TAB_IDS.map(id => ({
      id,
      label: t.tabs[id],
      icon: TAB_ICONS[id]
    })),
    licenseModuleSections: LICENSE_MODULE_KEYS.map(module => ({
      module,
      label: t.licenseModules[module],
      icon: LICENSE_MODULE_ICONS[module]
    })),
    contractStatusMeta: {
      expired: {
        label: t.contractStatus.expired,
        classKey: "expired"
      },
      expiring: {
        label: t.contractStatus.expiring,
        classKey: "expiring"
      },
      suspended: {
        label: t.contractStatus.suspended,
        classKey: "suspended"
      }
    },
    tableColumns: [{
      key: "name",
      label: t.table.name,
      sortable: true
    }, {
      key: "type",
      label: t.table.type,
      sortable: true
    }, {
      key: "status",
      label: t.table.status,
      sortable: true
    }, {
      key: "expiration",
      label: t.table.expiration,
      sortable: true
    }],
    formatAlertCount: count => interpolate(count === 1 ? t.contracts.alertCount : t.contracts.alertCountPlural, {
      count: String(count)
    }),
    formatExpiredCount: count => interpolate(count === 1 ? t.contracts.expiredCount : t.contracts.expiredCountPlural, {
      count: String(count)
    }),
    formatExpiringCount: count => interpolate(t.contracts.expiringCount, {
      count: String(count)
    }),
    formatAgentCount: count => interpolate(count === 1 ? t.search.agentCount : t.search.agentCountPlural, {
      count: String(count)
    }),
    formatSortBy: label => interpolate(t.table.sortBy, {
      label
    }),
    formatRmmSortBy: label => interpolate(t.rmm.sortBy, {
      label
    }),
    formatRmmOfflineCount: count => interpolate(t.rmm.offlineCount, {
      count: String(count)
    }),
    formatRmmWorkstationCount: count => interpolate(count === 1 ? t.rmm.summary.workstation : t.rmm.summary.workstationPlural, {
      count: String(count)
    }),
    formatRmmDiskAlerts: count => interpolate(count === 1 ? t.rmm.summary.diskAlert : t.rmm.summary.diskAlertPlural, {
      count: String(count)
    }),
    formatRmmSyncToast: hostname => interpolate(t.rmm.toasts.syncRequested, {
      hostname: hostname || t.rmm.workstation
    }),
    formatRmmSyncCancelledToast: hostname => interpolate(t.rmm.toasts.syncCancelled, {
      hostname: hostname || t.rmm.workstation
    }),
    formatClipboardCopied: label => interpolate(t.rmm.clipboard.copied, {
      label
    }),
    rmmTableColumns: [{
      key: "hostname",
      label: t.rmm.table.hostname,
      sortable: true
    }, {
      key: "client_name",
      label: t.rmm.table.client,
      sortable: true
    }, {
      key: "os",
      label: t.rmm.table.os,
      sortable: true
    }, {
      key: "os_build",
      label: t.rmm.table.build,
      sortable: true
    }, {
      key: "ip",
      label: t.rmm.table.ip,
      sortable: true
    }, {
      key: "updates_pending",
      label: t.rmm.table.updates,
      sortable: true
    }, {
      key: "agent_version",
      label: t.rmm.table.agent,
      sortable: true
    }, {
      key: "last_seen_at",
      label: t.rmm.table.lastSeen,
      sortable: true
    }],
    getPriorityHint: key => t.priority.hints[key] || null,
    getPriorityStatusHint: status => t.priority.statusHints[status] || t.priority.statusHints.default,
    getLicenseModuleLabel: module => t.licenseModules[module] || module
  };
}
