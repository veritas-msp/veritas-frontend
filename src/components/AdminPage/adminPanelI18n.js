import { createLocaleGetter } from "../../i18n/translate";

/** Structure sans libellés · clés stables pour la navigation admin. */
export const ADMIN_NAV_STRUCTURE = [
  {
    id: "general",
    items: [
      { key: "general", icon: "mdi:cog-outline" },
      { key: "login-branding", icon: "mdi:palette-outline" },
      { key: "tech-news-feeds", icon: "mdi:rss" },
    ],
  },
  {
    id: "organization",
    items: [
      { key: "users", icon: "mdi:account-group-outline" },
      { key: "teams", icon: "mdi:account-multiple-outline" },
    ],
  },
  {
    id: "clients",
    items: [
      { key: "clients", icon: "mdi:office-building-outline" },
      { key: "client-portal", icon: "mdi:monitor-dashboard" },
      { key: "support-credits", icon: "mdi:ticket-confirmation-outline" },
      { key: "sla", icon: "mdi:timer-cog-outline" },
      {
        key: "nav-client-config",
        icon: "mdi:tune-variant",
        children: [{ key: "contract-modules" }, { key: "equipment-families" }],
      },
    ],
  },
  {
    id: "tickets",
    items: [
      { key: "tickets", icon: "mdi:ticket-outline" },
      { key: "mail-collect", icon: "mdi:email-outline" },
      { key: "sales-forms", icon: "mdi:briefcase-edit-outline" },
    ],
  },
  {
    id: "notifications",
    items: [
      { key: "notifications-inapp", icon: "mdi:bell-badge-outline" },
      { key: "notifications", icon: "mdi:bell-ring-outline" },
    ],
  },
  {
    id: "operations",
    items: [
      { key: "maintenance", icon: "mdi:bullhorn-outline" },
      { key: "scheduled-alerts", icon: "mdi:clock-outline" },
    ],
  },
  {
    id: "platform",
    items: [
      { key: "rmm", icon: "mdi:laptop-account" },
      { key: "integrations", icon: "mdi:link-variant" },
    ],
  },
  {
    id: "account",
    items: [{ key: "license", icon: "mdi:key-variant" }],
  },
];

const ADMIN_PANEL_COPY = {
  fr: {
    sections: {
      general: "Général",
      organization: "Organisation",
      clients: "Clients",
      tickets: "Tickets",
      notifications: "Notifications",
      operations: "Exploitation",
      platform: "Plateforme",
      account: "Compte",
    },
    items: {
      general: { label: "Paramètres généraux", description: "Langue, fuseau horaire et apparence" },
      "login-branding": { label: "Page de connexion", description: "Logo, couleurs et textes agent / client" },
      "tech-news-feeds": { label: "Flux actualités", description: "Sources RSS affichées à l'accueil" },
      users: { label: "Agents & permissions", description: "Comptes, profils et droits d'accès" },
      teams: { label: "Équipes", description: "Groupes d'agents pour tickets et planning" },
      clients: { label: "Fiches entreprise", description: "Liste et gestion des clients" },
      "client-portal": { label: "Accès portail client", description: "Comptes du portail self-service" },
      "support-credits": { label: "Carnets tickets", description: "Crédits support prépayés par client" },
      sla: { label: "SLA", description: "Délais et plages horaires par client" },
      "nav-client-config": {
        label: "Configuration fiche",
        description: "Contenu affiché sur les fiches client",
      },
      "contract-modules": { label: "Options contrat", description: "Modules visibles sur la fiche" },
      "equipment-families": { label: "Familles matériel", description: "Types d'équipements et champs" },
      tickets: { label: "Paramètres support", description: "Templates, macros, catégories et vues" },
      "mail-collect": { label: "Collecte mail", description: "Boîtes mail et tri des emails entrants" },
      "sales-forms": { label: "Formulaires ventes", description: "Champs des tickets prestation" },
      "notifications-inapp": {
        label: "Notifications in-app",
        description: "Cloche sidebar et alertes sur les tickets assignés",
      },
      notifications: { label: "Événements & webhooks", description: "Alertes automatiques et envoi externe" },
      maintenance: { label: "Message de maintenance", description: "Bandeau affiché aux utilisateurs" },
      "scheduled-alerts": { label: "Règles CRON", description: "Alertes planifiées automatiques" },
      rmm: { label: "RMM · Agents", description: "Postes supervisés et enrôlement" },
      integrations: { label: "Intégrations", description: "Connecteurs et synchronisations" },
      license: { label: "Licence Pro", description: "Activation et abonnement Veritas" },
    },
    searchPlaceholder: "Rechercher un menu…",
    clearSearch: "Effacer la recherche",
    noResults: "Aucun menu ne correspond à « {query} ».",
    adminSubtitle: "Administration",
    accessDenied: "Accès réservé aux administrateurs.",
  },
  en: {
    sections: {
      general: "General",
      organization: "Organization",
      clients: "Clients",
      tickets: "Tickets",
      notifications: "Notifications",
      operations: "Operations",
      platform: "Platform",
      account: "Account",
    },
    items: {
      general: { label: "General settings", description: "Language, timezone, and appearance" },
      "login-branding": { label: "Login page", description: "Logo, colors, and agent / client copy" },
      "tech-news-feeds": { label: "News feeds", description: "RSS sources shown on the home page" },
      users: { label: "Agents & permissions", description: "Accounts, profiles, and access rights" },
      teams: { label: "Teams", description: "Agent groups for tickets and scheduling" },
      clients: { label: "Company records", description: "Client list and management" },
      "client-portal": { label: "Client portal access", description: "Self-service portal accounts" },
      "support-credits": { label: "Ticket packs", description: "Prepaid support credits per client" },
      sla: { label: "SLA", description: "Deadlines and time windows per client" },
      "nav-client-config": {
        label: "Record configuration",
        description: "Content shown on client records",
      },
      "contract-modules": { label: "Contract options", description: "Modules visible on the record" },
      "equipment-families": { label: "Equipment families", description: "Equipment types and fields" },
      tickets: { label: "Support settings", description: "Templates, macros, categories, and views" },
      "mail-collect": { label: "Mail collection", description: "Mailboxes and inbound email routing" },
      "sales-forms": { label: "Sales forms", description: "Fields for service tickets" },
      "notifications-inapp": {
        label: "In-app notifications",
        description: "Sidebar bell and alerts on assigned tickets",
      },
      notifications: { label: "Events & webhooks", description: "Automatic alerts and external delivery" },
      maintenance: { label: "Maintenance message", description: "Banner shown to users" },
      "scheduled-alerts": { label: "CRON rules", description: "Scheduled automatic alerts" },
      rmm: { label: "RMM · Agents", description: "Supervised endpoints and enrollment" },
      integrations: { label: "Integrations", description: "Connectors and synchronizations" },
      license: { label: "Pro license", description: "Veritas activation and subscription" },
    },
    searchPlaceholder: "Search menu…",
    clearSearch: "Clear search",
    noResults: "No menu matches « {query} ».",
    adminSubtitle: "Administration",
    accessDenied: "Access restricted to administrators.",
  },
  de: {
    sections: {
      general: "Allgemein",
      organization: "Organisation",
      clients: "Kunden",
      tickets: "Tickets",
      notifications: "Benachrichtigungen",
      operations: "Betrieb",
      platform: "Plattform",
      account: "Konto",
    },
    items: {
      general: { label: "Allgemeine Einstellungen", description: "Sprache, Zeitzone und Darstellung" },
      "login-branding": { label: "Anmeldeseite", description: "Logo, Farben und Texte Agent / Kunde" },
      "tech-news-feeds": { label: "Nachrichten-Feeds", description: "RSS-Quellen auf der Startseite" },
      users: { label: "Agenten & Berechtigungen", description: "Konten, Profile und Zugriffsrechte" },
      teams: { label: "Teams", description: "Agentengruppen für Tickets und Planung" },
      clients: { label: "Unternehmensakten", description: "Kundenliste und Verwaltung" },
      "client-portal": { label: "Kundenportal-Zugang", description: "Self-Service-Portal-Konten" },
      "support-credits": { label: "Ticket-Pakete", description: "Prepaid-Support-Guthaben pro Kunde" },
      sla: { label: "SLA", description: "Fristen und Zeitfenster pro Kunde" },
      "nav-client-config": {
        label: "Akten-Konfiguration",
        description: "Inhalt auf Kundenakten",
      },
      "contract-modules": { label: "Vertragsoptionen", description: "Auf der Akte sichtbare Module" },
      "equipment-families": { label: "Gerätefamilien", description: "Gerätetypen und Felder" },
      tickets: { label: "Support-Einstellungen", description: "Vorlagen, Makros, Kategorien und Ansichten" },
      "mail-collect": { label: "Mail-Sammlung", description: "Postfächer und eingehende E-Mails" },
      "sales-forms": { label: "Vertriebsformulare", description: "Felder für Leistungstickets" },
      "notifications-inapp": {
        label: "In-App-Benachrichtigungen",
        description: "Sidebar-Glocke und Alerts bei zugewiesenen Tickets",
      },
      notifications: { label: "Ereignisse & Webhooks", description: "Automatische Alerts und externe Zustellung" },
      maintenance: { label: "Wartungsnachricht", description: "Banner für Benutzer" },
      "scheduled-alerts": { label: "CRON-Regeln", description: "Geplante automatische Alerts" },
      rmm: { label: "RMM · Agenten", description: "Überwachte Endpunkte und Enrollment" },
      integrations: { label: "Integrationen", description: "Connectoren und Synchronisationen" },
      license: { label: "Pro-Lizenz", description: "Veritas-Aktivierung und Abonnement" },
    },
    searchPlaceholder: "Menü suchen…",
    clearSearch: "Suche löschen",
    noResults: "Kein Menü entspricht « {query} ».",
    adminSubtitle: "Administration",
    accessDenied: "Zugang nur für Administratoren.",
  },
  it: {
    sections: {
      general: "Generale",
      organization: "Organizzazione",
      clients: "Clienti",
      tickets: "Ticket",
      notifications: "Notifiche",
      operations: "Operazioni",
      platform: "Piattaforma",
      account: "Account",
    },
    items: {
      general: { label: "Impostazioni generali", description: "Lingua, fuso orario e aspetto" },
      "login-branding": { label: "Pagina di accesso", description: "Logo, colori e testi agente / cliente" },
      "tech-news-feeds": { label: "Feed notizie", description: "Fonti RSS mostrate in home" },
      users: { label: "Agenti e permessi", description: "Account, profili e diritti di accesso" },
      teams: { label: "Team", description: "Gruppi di agenti per ticket e pianificazione" },
      clients: { label: "Schede azienda", description: "Elenco e gestione clienti" },
      "client-portal": { label: "Accesso portale clienti", description: "Account del portale self-service" },
      "support-credits": { label: "Carnet ticket", description: "Crediti supporto prepagati per cliente" },
      sla: { label: "SLA", description: "Scadenze e fasce orarie per cliente" },
      "nav-client-config": {
        label: "Configurazione scheda",
        description: "Contenuto mostrato sulle schede cliente",
      },
      "contract-modules": { label: "Opzioni contratto", description: "Moduli visibili sulla scheda" },
      "equipment-families": { label: "Famiglie hardware", description: "Tipi di equipaggiamento e campi" },
      tickets: { label: "Impostazioni supporto", description: "Template, macro, categorie e viste" },
      "mail-collect": { label: "Raccolta mail", description: "Caselle e smistamento email in entrata" },
      "sales-forms": { label: "Moduli vendite", description: "Campi dei ticket prestazione" },
      "notifications-inapp": {
        label: "Notifiche in-app",
        description: "Campanella sidebar e alert sui ticket assegnati",
      },
      notifications: { label: "Eventi e webhook", description: "Alert automatici e invio esterno" },
      maintenance: { label: "Messaggio di manutenzione", description: "Banner mostrato agli utenti" },
      "scheduled-alerts": { label: "Regole CRON", description: "Alert pianificati automatici" },
      rmm: { label: "RMM · Agenti", description: "Postazioni supervisionate e enrollment" },
      integrations: { label: "Integrazioni", description: "Connettori e sincronizzazioni" },
      license: { label: "Licenza Pro", description: "Attivazione e abbonamento Veritas" },
    },
    searchPlaceholder: "Cerca un menu…",
    clearSearch: "Cancella ricerca",
    noResults: "Nessun menu corrisponde a « {query} ».",
    adminSubtitle: "Amministrazione",
    accessDenied: "Accesso riservato agli amministratori.",
  },
  es: {
    sections: {
      general: "General",
      organization: "Organización",
      clients: "Clientes",
      tickets: "Tickets",
      notifications: "Notificaciones",
      operations: "Operaciones",
      platform: "Plataforma",
      account: "Cuenta",
    },
    items: {
      general: { label: "Ajustes generales", description: "Idioma, zona horaria y apariencia" },
      "login-branding": { label: "Página de inicio de sesión", description: "Logo, colores y textos agente / cliente" },
      "tech-news-feeds": { label: "Fuentes de noticias", description: "Fuentes RSS en la página de inicio" },
      users: { label: "Agentes y permisos", description: "Cuentas, perfiles y derechos de acceso" },
      teams: { label: "Equipos", description: "Grupos de agentes para tickets y planificación" },
      clients: { label: "Fichas de empresa", description: "Lista y gestión de clientes" },
      "client-portal": { label: "Acceso portal cliente", description: "Cuentas del portal self-service" },
      "support-credits": { label: "Carnets de tickets", description: "Créditos de soporte prepagados por cliente" },
      sla: { label: "SLA", description: "Plazos y franjas horarias por cliente" },
      "nav-client-config": {
        label: "Configuración de ficha",
        description: "Contenido mostrado en las fichas cliente",
      },
      "contract-modules": { label: "Opciones de contrato", description: "Módulos visibles en la ficha" },
      "equipment-families": { label: "Familias de hardware", description: "Tipos de equipos y campos" },
      tickets: { label: "Ajustes de soporte", description: "Plantillas, macros, categorías y vistas" },
      "mail-collect": { label: "Recogida de correo", description: "Buzones y clasificación de emails entrantes" },
      "sales-forms": { label: "Formularios de ventas", description: "Campos de tickets de prestación" },
      "notifications-inapp": {
        label: "Notificaciones in-app",
        description: "Campana sidebar y alertas en tickets asignados",
      },
      notifications: { label: "Eventos y webhooks", description: "Alertas automáticas y envío externo" },
      maintenance: { label: "Mensaje de mantenimiento", description: "Banner mostrado a los usuarios" },
      "scheduled-alerts": { label: "Reglas CRON", description: "Alertas programadas automáticas" },
      rmm: { label: "RMM · Agentes", description: "Equipos supervisados y enrolamiento" },
      integrations: { label: "Integraciones", description: "Conectores y sincronizaciones" },
      license: { label: "Licencia Pro", description: "Activación y suscripción Veritas" },
    },
    searchPlaceholder: "Buscar un menú…",
    clearSearch: "Borrar búsqueda",
    noResults: "Ningún menú coincide con « {query} ».",
    adminSubtitle: "Administración",
    accessDenied: "Acceso reservado a administradores.",
  },
};

export const getAdminPanelCopy = createLocaleGetter(ADMIN_PANEL_COPY);

function localizeNavItem(item, copy) {
  const meta = copy.items[item.key] || { label: item.key, description: "" };
  const localized = {
    ...item,
    label: meta.label,
    description: meta.description,
  };
  if (item.children) {
    localized.children = item.children.map((child) => localizeNavItem(child, copy));
  }
  return localized;
}

export function buildAdminNavSections(locale) {
  const copy = getAdminPanelCopy(locale);
  return ADMIN_NAV_STRUCTURE.map((section) => ({
    title: copy.sections[section.id],
    items: section.items.map((item) => localizeNavItem(item, copy)),
  }));
}

export function findParentGroupKey(tabKey) {
  for (const section of ADMIN_NAV_STRUCTURE) {
    for (const item of section.items) {
      if (item.children?.some((child) => child.key === tabKey)) {
        return item.key;
      }
    }
  }
  return null;
}

export function flattenNavItems(items) {
  return items.flatMap((item) => (item.children ? item.children : [item]));
}
