import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const HOME_COPY = {
  fr: {
    heroTitle: "Tableau de bord MSP",
    heroGreeting: "Bonjour, {name}",
    heroSubtitle: "Tout ce qu'il vous faut, au même endroit.",
    loading: "Chargement du tableau de bord…",
    errorLoad: "Impossible de charger le tableau de bord.",
    refresh: "Actualiser le tableau de bord",
    retry: "Réessayer",
    kpiAriaLabel: "Indicateurs prioritaires",
    secondaryKpiAriaLabel: "Indicateurs portefeuille",
    kpiNavigate: "Voir {label}",
    kpis: {
      clientsUnderContract: "Entreprises",
      equipMonitoredTotal: "Équipements",
      rmmAgents: "Agents RMM",
      contractsExpiringWindow: "Contrats expirant",
      contractsExpired: "Contrats expirés",
      licensesExpired: "Licences expirées",
      openTickets: "Tickets ouverts",
      urgentTickets: "Urgents",
      todoCount: "À traiter"
    },
    today: {
      title: "Aujourd'hui",
      ariaLabel: "Priorités du jour",
      urgent: "tickets urgents",
      todo: "à traiter",
      nextEvent: "Prochain RDV",
      noEvent: "Aucun RDV à venir"
    },
    panels: {
      tickets: {
        title: "Mes tickets",
        inProgress: "en cours",
        pending: "en attente",
        action: "Voir les tickets"
      },
      events: {
        title: "Mes événements",
        action: "Voir le planning"
      },
      surveillance: {
        title: "Surveillance",
        globalFleet: "Parc global",
        empty: "Aucun équipement surveillé"
      },
      todo: {
        title: "À traiter",
        action: "Centre de supervision"
      }
    },
    ticketsTable: {
      number: "N°",
      priority: "Priorité",
      description: "Descriptif",
      company: "Entreprise",
      modified: "Modifié"
    },
    priorities: {
      majorIncident: "Incident majeur",
      urgent: "Urgente",
      high: "Haute",
      low: "Basse",
      normal: "Normale"
    },
    empty: {
      tickets: "Aucun ticket ne vous est assigné",
      events: "Aucun événement ne vous est assigné",
      todo: "Rien à traiter pour le moment"
    },
    noTitle: "Sans titre",
    noClient: "Sans client",
    surveillance: {
      monitoredTooltip: "{label} : {ratio} surveillés ({percent}%)",
      freePlan: "Gratuit ·",
      discoverVeritas: "Découvrir Veritas",
      devicesMax: "{count} / {limit} périphériques max",
      devicesMaxOnly: "{limit} périphériques max"
    },
    eventTypes: {
      intervention: "Intervention",
      presentation: "Présentation",
      maintenance_preventive: "Préventive",
      maintenance: "Maintenance",
      mise_a_jour: "Mise à jour",
      conge: "Congé",
      integration_monitoring: "Monitoring",
      campagne: "Campagne",
      other: "Autre",
      fallback: "Événement"
    },
    todo: {
      sources: {
        supervision: "Supervision",
        cyber: "Cybersécurité",
        services: "Cloud IT et services"
      },
      contract: {
        expired: "Contrat expiré",
        expiring: "Contrat à renouveler",
        suspended: "Contrat suspendu",
        default: "Contrat",
        meta: "Contrat entreprise"
      },
      licenseDefault: "Licence"
    },
    guide: {
      fabLabel: "Guide de la page d'accueil",
      tourTitle: "Page d'accueil",
      steps: {
        hero: {
          title: "Tableau de bord",
          content: "Votre page d'accueil regroupe en un coup d'œil l'activité MSP du jour : organisation, message de bienvenue et date du jour."
        },
        today: {
          title: "Aujourd'hui",
          content: "Bandeau des priorités du jour : tickets urgents, éléments à traiter et prochain rendez-vous. Cliquez pour ouvrir le module concerné."
        },
        kpis: {
          title: "Indicateurs prioritaires",
          content: "Quatre indicateurs essentiels pour piloter la journée : tickets ouverts, urgents, éléments à traiter et entreprises. Le portefeuille complet apparaît en ligne secondaire.",
          contentCommunity: "Quatre indicateurs essentiels : tickets ouverts, urgents, entreprises et équipements."
        },
        tickets: {
          title: "Mes tickets",
          content: "Liste des tickets qui vous sont assignés : numéro, priorité, titre, entreprise et dernière modification. Cliquez une ligne pour ouvrir le détail."
        },
        surveillance: {
          title: "Surveillance",
          content: "Visualisez la couverture de monitoring par famille d'équipements (serveurs, postes, réseau…) et le ratio global du parc surveillé."
        },
        events: {
          title: "Mes événements",
          content: "Consultez vos prochaines interventions et rendez-vous planifiés, avec le type d'événement et les dates. Le lien ouvre le planning complet."
        },
        todo: {
          title: "À traiter",
          content: "Éléments à traiter remontés depuis la supervision, la cybersécurité et les services : contrats, licences et alertes. Cliquez pour accéder au module concerné."
        },
        news: {
          title: "Actualités tech",
          content: "Une sélection d'articles et de veille technologique pour rester informé, sans quitter Veritas."
        }
      }
    }
  },
  en: {
    heroTitle: "MSP dashboard",
    heroGreeting: "Hello, {name}",
    heroSubtitle: "Everything you need, in one place.",
    loading: "Loading dashboard…",
    errorLoad: "Unable to load the dashboard.",
    refresh: "Refresh dashboard",
    retry: "Try again",
    kpiAriaLabel: "Priority metrics",
    secondaryKpiAriaLabel: "Portfolio metrics",
    kpiNavigate: "View {label}",
    kpis: {
      clientsUnderContract: "Companies",
      equipMonitoredTotal: "Equipment",
      rmmAgents: "RMM agents",
      contractsExpiringWindow: "Contracts expiring",
      contractsExpired: "Expired contracts",
      licensesExpired: "Expired licenses",
      openTickets: "Open tickets",
      urgentTickets: "Urgent",
      todoCount: "To do"
    },
    today: {
      title: "Today",
      ariaLabel: "Today's priorities",
      urgent: "urgent tickets",
      todo: "to do",
      nextEvent: "Next appointment",
      noEvent: "No upcoming appointment"
    },
    panels: {
      tickets: {
        title: "My tickets",
        inProgress: "in progress",
        pending: "pending",
        action: "View tickets"
      },
      events: {
        title: "My events",
        action: "View schedule"
      },
      surveillance: {
        title: "Monitoring",
        globalFleet: "Global fleet",
        empty: "No monitored equipment"
      },
      todo: {
        title: "To do",
        action: "Monitoring center"
      }
    },
    ticketsTable: {
      number: "No.",
      priority: "Priority",
      description: "Description",
      company: "Company",
      modified: "Updated"
    },
    priorities: {
      majorIncident: "Major incident",
      urgent: "Urgent",
      high: "High",
      low: "Low",
      normal: "Normal"
    },
    empty: {
      tickets: "No tickets assigned to you",
      events: "No events assigned to you",
      todo: "Nothing to do right now"
    },
    noTitle: "Untitled",
    noClient: "No client",
    surveillance: {
      monitoredTooltip: "{label}: {ratio} monitored ({percent}%)",
      freePlan: "Free ·",
      discoverVeritas: "Discover Veritas",
      devicesMax: "{count} / {limit} devices max",
      devicesMaxOnly: "{limit} devices max"
    },
    eventTypes: {
      intervention: "On-site work",
      presentation: "Presentation",
      maintenance_preventive: "Preventive",
      maintenance: "Maintenance",
      mise_a_jour: "Update",
      conge: "Leave",
      integration_monitoring: "Monitoring",
      campagne: "Campaign",
      other: "Other",
      fallback: "Event"
    },
    todo: {
      sources: {
        supervision: "Monitoring",
        cyber: "Cybersecurity",
        services: "Cloud IT & Services"
      },
      contract: {
        expired: "Expired contract",
        expiring: "Contract to renew",
        suspended: "Suspended contract",
        default: "Contract",
        meta: "Company contract"
      },
      licenseDefault: "License"
    },
    guide: {
      fabLabel: "Home page guide",
      tourTitle: "Home",
      steps: {
        hero: {
          title: "Dashboard",
          content: "Your home page gives you a quick view of today's MSP activity: organization, welcome message and current date."
        },
        today: {
          title: "Today",
          content: "Priority strip for the day: urgent tickets, items to handle and next appointment. Click to open the relevant module."
        },
        kpis: {
          title: "Priority metrics",
          content: "Four essential metrics to run the day: open tickets, urgent, to-do items and companies. Full portfolio metrics appear on a secondary row.",
          contentCommunity: "Four essential metrics: open tickets, urgent, companies and equipment."
        },
        tickets: {
          title: "My tickets",
          content: "Tickets assigned to you as a list: number, priority, title, company and last update. Click a row to open details."
        },
        surveillance: {
          title: "Monitoring",
          content: "See monitoring coverage by equipment family (servers, workstations, network…) and the overall monitored fleet ratio."
        },
        events: {
          title: "My events",
          content: "Review your upcoming interventions and appointments with event type and dates. Use the link to open the full schedule."
        },
        todo: {
          title: "To do",
          content: "Items to handle from monitoring, cybersecurity and services: contracts, licenses and alerts. Click to open the relevant module."
        },
        news: {
          title: "Tech news",
          content: "A selection of articles and tech watch to stay informed without leaving Veritas."
        }
      }
    }
  },
  de: {
    heroTitle: "MSP-Dashboard",
    heroGreeting: "Guten Tag, {name}",
    heroSubtitle: "Alles, was Sie brauchen · an einem Ort.",
    loading: "Dashboard wird geladen…",
    errorLoad: "Dashboard konnte nicht geladen werden.",
    refresh: "Dashboard aktualisieren",
    retry: "Erneut versuchen",
    kpiAriaLabel: "Prioritätskennzahlen",
    secondaryKpiAriaLabel: "Portfolio-Kennzahlen",
    kpiNavigate: "{label} anzeigen",
    kpis: {
      clientsUnderContract: "Unternehmen",
      equipMonitoredTotal: "Geräte",
      rmmAgents: "RMM-Agenten",
      contractsExpiringWindow: "Auslaufende Verträge",
      contractsExpired: "Abgelaufene Verträge",
      licensesExpired: "Abgelaufene Lizenzen",
      openTickets: "Offene Tickets",
      urgentTickets: "Dringend",
      todoCount: "Zu erledigen"
    },
    today: {
      title: "Heute",
      ariaLabel: "Prioritäten heute",
      urgent: "dringende Tickets",
      todo: "zu erledigen",
      nextEvent: "Nächster Termin",
      noEvent: "Kein bevorstehender Termin"
    },
    panels: {
      tickets: {
        title: "Meine Tickets",
        inProgress: "in Bearbeitung",
        pending: "ausstehend",
        action: "Tickets anzeigen"
      },
      events: {
        title: "Meine Termine",
        action: "Planung anzeigen"
      },
      surveillance: {
        title: "Überwachung",
        globalFleet: "Gesamtbestand",
        empty: "Keine überwachten Geräte"
      },
      todo: {
        title: "Zu erledigen",
        action: "Supervisionszentrum"
      }
    },
    ticketsTable: {
      number: "Nr.",
      priority: "Priorität",
      description: "Beschreibung",
      company: "Unternehmen",
      modified: "Geändert"
    },
    priorities: {
      majorIncident: "Schwerer Vorfall",
      urgent: "Dringend",
      high: "Hoch",
      low: "Niedrig",
      normal: "Normal"
    },
    empty: {
      tickets: "Ihnen sind keine Tickets zugewiesen",
      events: "Ihnen sind keine Termine zugewiesen",
      todo: "Aktuell nichts zu erledigen"
    },
    noTitle: "Ohne Titel",
    noClient: "Kein Kunde",
    surveillance: {
      monitoredTooltip: "{label}: {ratio} überwacht ({percent}%)",
      freePlan: "Kostenlos ·",
      discoverVeritas: "Veritas entdecken",
      devicesMax: "{count} / {limit} Geräte max.",
      devicesMaxOnly: "{limit} Geräte max."
    },
    eventTypes: {
      intervention: "Einsatz",
      presentation: "Präsentation",
      maintenance_preventive: "Präventiv",
      maintenance: "Wartung",
      mise_a_jour: "Update",
      conge: "Urlaub",
      integration_monitoring: "Monitoring",
      campagne: "Kampagne",
      other: "Sonstiges",
      fallback: "Termin"
    },
    todo: {
      sources: {
        supervision: "Überwachung",
        cyber: "Cybersicherheit",
        services: "Cloud IT & Services"
      },
      contract: {
        expired: "Vertrag abgelaufen",
        expiring: "Vertrag zu verlängern",
        suspended: "Vertrag ausgesetzt",
        default: "Vertrag",
        meta: "Unternehmensvertrag"
      },
      licenseDefault: "Lizenz"
    },
    guide: {
      fabLabel: "Leitfaden Startseite",
      tourTitle: "Startseite",
      steps: {
        hero: {
          title: "Dashboard",
          content: "Ihre Startseite bündelt die MSP-Aktivität des Tages: Organisation, Begrüßung und aktuelles Datum."
        },
        today: {
          title: "Heute",
          content: "Prioritätsleiste des Tages: dringende Tickets, offene Punkte und nächster Termin. Klick öffnet das passende Modul."
        },
        kpis: {
          title: "Prioritätskennzahlen",
          content: "Vier Kennzahlen für den Tag: offene Tickets, dringend, zu erledigen und Unternehmen. Das volle Portfolio steht in der Nebenzeile.",
          contentCommunity: "Vier Kennzahlen: offene Tickets, dringend, Unternehmen und Geräte."
        },
        tickets: {
          title: "Meine Tickets",
          content: "Zugewiesene Tickets als Liste: Nummer, Priorität, Titel, Unternehmen und letzte Änderung. Zeile anklicken für Details."
        },
        surveillance: {
          title: "Überwachung",
          content: "Monitoring-Abdeckung nach Gerätefamilie (Server, Arbeitsplätze, Netzwerk…) und Gesamtverhältnis des überwachten Bestands."
        },
        events: {
          title: "Meine Termine",
          content: "Kommende Einsätze und Termine mit Typ und Datum. Link öffnet die vollständige Planung."
        },
        todo: {
          title: "Zu erledigen",
          content: "Offene Punkte aus Überwachung, Cybersicherheit und Services: Verträge, Lizenzen und Warnungen. Klick öffnet das passende Modul."
        },
        news: {
          title: "Tech-News",
          content: "Auswahl an Artikeln und Tech-Watch, ohne Veritas zu verlassen."
        }
      }
    }
  },
  it: {
    heroTitle: "Dashboard MSP",
    heroGreeting: "Buongiorno, {name}",
    heroSubtitle: "Tutto ciò che serve, in un solo posto.",
    loading: "Caricamento dashboard…",
    errorLoad: "Impossibile caricare la dashboard.",
    refresh: "Aggiorna dashboard",
    retry: "Riprova",
    kpiAriaLabel: "Indicatori prioritari",
    secondaryKpiAriaLabel: "Indicatori portafoglio",
    kpiNavigate: "Vedi {label}",
    kpis: {
      clientsUnderContract: "Aziende",
      equipMonitoredTotal: "Dispositivi",
      rmmAgents: "Agenti RMM",
      contractsExpiringWindow: "Contratti in scadenza",
      contractsExpired: "Contratti scaduti",
      licensesExpired: "Licenze scadute",
      openTickets: "Ticket aperti",
      urgentTickets: "Urgenti",
      todoCount: "Da trattare"
    },
    today: {
      title: "Oggi",
      ariaLabel: "Priorità di oggi",
      urgent: "ticket urgenti",
      todo: "da trattare",
      nextEvent: "Prossimo appuntamento",
      noEvent: "Nessun appuntamento in arrivo"
    },
    panels: {
      tickets: {
        title: "I miei ticket",
        inProgress: "in corso",
        pending: "in attesa",
        action: "Vedi ticket"
      },
      events: {
        title: "I miei eventi",
        action: "Vedi planning"
      },
      surveillance: {
        title: "Monitoraggio",
        globalFleet: "Parco globale",
        empty: "Nessun dispositivo monitorato"
      },
      todo: {
        title: "Da trattare",
        action: "Centro supervisione"
      }
    },
    ticketsTable: {
      number: "N°",
      priority: "Priorità",
      description: "Descrizione",
      company: "Azienda",
      modified: "Modificato"
    },
    priorities: {
      majorIncident: "Incidente grave",
      urgent: "Urgente",
      high: "Alta",
      low: "Bassa",
      normal: "Normale"
    },
    empty: {
      tickets: "Nessun ticket assegnato",
      events: "Nessun evento assegnato",
      todo: "Niente da trattare al momento"
    },
    noTitle: "Senza titolo",
    noClient: "Nessun cliente",
    surveillance: {
      monitoredTooltip: "{label}: {ratio} monitorati ({percent}%)",
      freePlan: "Gratuito ·",
      discoverVeritas: "Scopri Veritas",
      devicesMax: "{count} / {limit} dispositivi max",
      devicesMaxOnly: "{limit} dispositivi max"
    },
    eventTypes: {
      intervention: "Intervento",
      presentation: "Presentazione",
      maintenance_preventive: "Preventiva",
      maintenance: "Manutenzione",
      mise_a_jour: "Aggiornamento",
      conge: "Congedo",
      integration_monitoring: "Monitoraggio",
      campagne: "Campagna",
      other: "Altro",
      fallback: "Evento"
    },
    todo: {
      sources: {
        supervision: "Supervisione",
        cyber: "Cybersicurezza",
        services: "Cloud IT e servizi"
      },
      contract: {
        expired: "Contratto scaduto",
        expiring: "Contratto da rinnovare",
        suspended: "Contratto sospeso",
        default: "Contratto",
        meta: "Contratto azienda"
      },
      licenseDefault: "Licenza"
    },
    guide: {
      fabLabel: "Guida pagina iniziale",
      tourTitle: "Home",
      steps: {
        hero: {
          title: "Dashboard",
          content: "La home riassume l'attività MSP del giorno: organizzazione, messaggio di benvenuto e data."
        },
        today: {
          title: "Oggi",
          content: "Barra delle priorità del giorno: ticket urgenti, elementi da trattare e prossimo appuntamento. Clicca per aprire il modulo."
        },
        kpis: {
          title: "Indicatori prioritari",
          content: "Quattro indicatori essenziali per la giornata: ticket aperti, urgenti, da trattare e aziende. Il portafoglio completo è nella riga secondaria.",
          contentCommunity: "Quattro indicatori essenziali: ticket aperti, urgenti, aziende e dispositivi."
        },
        tickets: {
          title: "I miei ticket",
          content: "Ticket assegnati in elenco: numero, priorità, titolo, azienda e ultima modifica. Clicca una riga per il dettaglio."
        },
        surveillance: {
          title: "Monitoraggio",
          content: "Copertura di monitoring per famiglia di dispositivi (server, postazioni, rete…) e rapporto globale del parco monitorato."
        },
        events: {
          title: "I miei eventi",
          content: "Prossimi interventi e appuntamenti con tipo e date. Il link apre il planning completo."
        },
        todo: {
          title: "Da trattare",
          content: "Elementi da trattare da supervisione, cybersicurezza e servizi: contratti, licenze e alert. Clicca per aprire il modulo."
        },
        news: {
          title: "Notizie tech",
          content: "Selezione di articoli e tech watch senza uscire da Veritas."
        }
      }
    }
  },
  es: {
    heroTitle: "Panel MSP",
    heroGreeting: "Hola, {name}",
    heroSubtitle: "Todo lo que necesitas, en un solo lugar.",
    loading: "Cargando panel…",
    errorLoad: "No se pudo cargar el panel.",
    refresh: "Actualizar panel",
    retry: "Reintentar",
    kpiAriaLabel: "Indicadores prioritarios",
    secondaryKpiAriaLabel: "Indicadores de cartera",
    kpiNavigate: "Ver {label}",
    kpis: {
      clientsUnderContract: "Empresas",
      equipMonitoredTotal: "Equipos",
      rmmAgents: "Agentes RMM",
      contractsExpiringWindow: "Contratos por vencer",
      contractsExpired: "Contratos vencidos",
      licensesExpired: "Licencias vencidas",
      openTickets: "Tickets abiertos",
      urgentTickets: "Urgentes",
      todoCount: "Por tratar"
    },
    today: {
      title: "Hoy",
      ariaLabel: "Prioridades de hoy",
      urgent: "tickets urgentes",
      todo: "por tratar",
      nextEvent: "Próxima cita",
      noEvent: "Ninguna cita próxima"
    },
    panels: {
      tickets: {
        title: "Mis tickets",
        inProgress: "en curso",
        pending: "en espera",
        action: "Ver tickets"
      },
      events: {
        title: "Mis eventos",
        action: "Ver planning"
      },
      surveillance: {
        title: "Supervisión",
        globalFleet: "Parque global",
        empty: "Ningún equipo supervisado"
      },
      todo: {
        title: "Por tratar",
        action: "Centro de supervisión"
      }
    },
    ticketsTable: {
      number: "N.º",
      priority: "Prioridad",
      description: "Descripción",
      company: "Empresa",
      modified: "Modificado"
    },
    priorities: {
      majorIncident: "Incidente grave",
      urgent: "Urgente",
      high: "Alta",
      low: "Baja",
      normal: "Normal"
    },
    empty: {
      tickets: "No tienes tickets asignados",
      events: "No tienes eventos asignados",
      todo: "Nada por tratar por ahora"
    },
    noTitle: "Sin título",
    noClient: "Sin cliente",
    surveillance: {
      monitoredTooltip: "{label}: {ratio} supervisados ({percent}%)",
      freePlan: "Gratis ·",
      discoverVeritas: "Descubrir Veritas",
      devicesMax: "{count} / {limit} dispositivos máx.",
      devicesMaxOnly: "{limit} dispositivos máx."
    },
    eventTypes: {
      intervention: "Intervención",
      presentation: "Presentación",
      maintenance_preventive: "Preventivo",
      maintenance: "Mantenimiento",
      mise_a_jour: "Actualización",
      conge: "Permiso",
      integration_monitoring: "Monitorización",
      campagne: "Campaña",
      other: "Otro",
      fallback: "Evento"
    },
    todo: {
      sources: {
        supervision: "Supervisión",
        cyber: "Ciberseguridad",
        services: "Cloud IT y servicios"
      },
      contract: {
        expired: "Contrato vencido",
        expiring: "Contrato por renovar",
        suspended: "Contrato suspendido",
        default: "Contrato",
        meta: "Contrato empresa"
      },
      licenseDefault: "Licencia"
    },
    guide: {
      fabLabel: "Guía de inicio",
      tourTitle: "Inicio",
      steps: {
        hero: {
          title: "Panel",
          content: "La página de inicio reúne la actividad MSP del día: organización, bienvenida y fecha actual."
        },
        today: {
          title: "Hoy",
          content: "Franja de prioridades del día: tickets urgentes, elementos por tratar y próxima cita. Pulse para abrir el módulo."
        },
        kpis: {
          title: "Indicadores prioritarios",
          content: "Cuatro indicadores esenciales del día: tickets abiertos, urgentes, por tratar y empresas. La cartera completa está en la fila secundaria.",
          contentCommunity: "Cuatro indicadores esenciales: tickets abiertos, urgentes, empresas y equipos."
        },
        tickets: {
          title: "Mis tickets",
          content: "Tickets asignados en lista: número, prioridad, título, empresa y última modificación. Pulse una fila para el detalle."
        },
        surveillance: {
          title: "Supervisión",
          content: "Cobertura de monitorización por familia de equipos (servidores, puestos, red…) y ratio global del parque supervisado."
        },
        events: {
          title: "Mis eventos",
          content: "Próximas intervenciones y citas con tipo y fechas. El enlace abre el planning completo."
        },
        todo: {
          title: "Por tratar",
          content: "Elementos de supervisión, ciberseguridad y servicios: contratos, licencias y alertas. Pulse para abrir el módulo."
        },
        news: {
          title: "Noticias tech",
          content: "Selección de artículos y veille tecnológica sin salir de Veritas."
        }
      }
    }
  }
};
export function getHomePageCopy(locale) {
  const t = pickLocaleMessages(HOME_COPY, locale);
  return {
    ...t,
    heroGreeting: name => interpolate(t.heroGreeting, {
      name
    }),
    getKpiLabel: key => t.kpis[key] || key,
    getKpiNavigateLabel: key => interpolate(t.kpiNavigate, {
      label: t.kpis[key] || key
    }),
    getPriorityVisual: (priority, isMajorIncident = false) => {
      const key = String(priority || "normal").toLowerCase();
      if (isMajorIncident) {
        return {
          icon: "mdi:alert-octagon",
          label: t.priorities.majorIncident,
          tone: "major"
        };
      }
      if (key === "urgent" || key === "critical") {
        return {
          icon: "mdi:alert-octagon",
          label: t.priorities.urgent,
          tone: "major"
        };
      }
      if (key === "high") {
        return {
          icon: "mdi:arrow-up",
          label: t.priorities.high,
          tone: "high"
        };
      }
      if (key === "low") {
        return {
          icon: "mdi:arrow-down",
          label: t.priorities.low,
          tone: "low"
        };
      }
      return {
        icon: "mdi:minus",
        label: t.priorities.normal,
        tone: "normal"
      };
    },
    getEventTypeLabel: (type, typeLabel) => typeLabel || t.eventTypes[type] || t.eventTypes.other || type || t.eventTypes.fallback,
    getSurveillanceTooltip: (label, ratio, percent) => interpolate(t.surveillance.monitoredTooltip, {
      label,
      ratio,
      percent
    }),
    getDevicesMaxLabel: (count, limit, formatNumber) => count > 0 ? interpolate(t.surveillance.devicesMax, {
      count: formatNumber(count),
      limit: formatNumber(limit)
    }) : interpolate(t.surveillance.devicesMaxOnly, {
      limit: formatNumber(limit)
    }),
    buildGuideSteps: (isCommunity = false) => {
      const steps = t.guide.steps;
      const result = [{
        target: '[data-guide="home-hero"]',
        title: steps.hero.title,
        content: steps.hero.content
      }, {
        target: '[data-guide="home-today"]',
        title: steps.today.title,
        content: steps.today.content
      }, {
        target: '[data-guide="home-kpis"]',
        title: steps.kpis.title,
        content: isCommunity ? steps.kpis.contentCommunity : steps.kpis.content
      }, {
        target: '[data-guide="home-tickets"]',
        title: steps.tickets.title,
        content: steps.tickets.content
      }, {
        target: '[data-guide="home-surveillance"]',
        title: steps.surveillance.title,
        content: steps.surveillance.content
      }];
      if (!isCommunity) {
        result.push({
          target: '[data-guide="home-events"]',
          title: steps.events.title,
          content: steps.events.content
        }, {
          target: '[data-guide="home-todo"]',
          title: steps.todo.title,
          content: steps.todo.content
        });
      }
      result.push({
        target: '[data-guide="home-news"]',
        title: steps.news.title,
        content: steps.news.content
      });
      return result;
    }
  };
}
export function getHomePageStrings(locale) {
  return getHomePageCopy(locale);
}
