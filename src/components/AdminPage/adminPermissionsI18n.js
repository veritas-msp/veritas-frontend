import { createLocaleGetter } from "../../i18n/translate";
import { normalizeProfileName } from "../../utils/profileProtection";

const PROFILE_I18N = {
  fr: {
    names: {
      "super admin": "Super Admin",
      superadmin: "Super Admin",
      "super administrateur": "Super Admin",
      administrator: "Administrateur",
      administrateur: "Administrateur",
      admin: "Administrateur",
      supervisor: "Superviseur",
      superviseur: "Superviseur",
      agent: "Agent",
      collaborator: "Collaborateur",
      collaborateur: "Collaborateur",
      "read only": "Lecture",
      readonly: "Lecture",
      lecture: "Lecture",
      lecteur: "Lecture",
      reader: "Lecture"
    },
    labels: {
      "super admin": "Accès total non modifiable — propriétaire de l’instance.",
      superadmin: "Accès total non modifiable — propriétaire de l’instance.",
      "super administrateur": "Accès total non modifiable — propriétaire de l’instance.",
      administrator: "Accès complet à tous les modules et aux actions d’administration.",
      administrateur: "Accès complet à tous les modules et aux actions d’administration.",
      admin: "Accès complet à tous les modules et aux actions d’administration.",
      supervisor: "Supervise les activités, gère les équipes et accède aux fonctions avancées.",
      superviseur: "Supervise les activités, gère les équipes et accède aux fonctions avancées.",
      agent: "Traite les demandes au quotidien, gère les opérations et les dossiers clients.",
      collaborator: "Accès opérationnel restreint pour contribuer sans droits d’administration.",
      collaborateur: "Accès opérationnel restreint pour contribuer sans droits d’administration.",
      "read only": "Consultation uniquement, sans modification ni actions sensibles.",
      readonly: "Consultation uniquement, sans modification ni actions sensibles.",
      lecture: "Consultation uniquement, sans modification ni actions sensibles.",
      lecteur: "Consultation uniquement, sans modification ni actions sensibles.",
      reader: "Consultation uniquement, sans modification ni actions sensibles."
    }
  },
  en: {
    names: {
      "super admin": "Super Admin",
      superadmin: "Super Admin",
      "super administrateur": "Super Admin",
      administrator: "Administrator",
      administrateur: "Administrator",
      admin: "Administrator",
      supervisor: "Supervisor",
      superviseur: "Supervisor",
      agent: "Agent",
      collaborator: "Collaborator",
      collaborateur: "Collaborator",
      "read only": "Read-only",
      readonly: "Read-only",
      lecture: "Read-only",
      lecteur: "Read-only",
      reader: "Read-only"
    },
    labels: {
      "super admin": "Full non-editable access — instance owner.",
      superadmin: "Full non-editable access — instance owner.",
      "super administrateur": "Full non-editable access — instance owner.",
      administrator: "Full access to all modules and administrative actions.",
      administrateur: "Full access to all modules and administrative actions.",
      admin: "Full access to all modules and administrative actions.",
      supervisor: "Oversees activities, manages teams, and accesses advanced features.",
      superviseur: "Oversees activities, manages teams, and accesses advanced features.",
      agent: "Handles requests daily, manages operations, and works on customer cases.",
      collaborator: "Restricted operational access without administrative privileges.",
      collaborateur: "Restricted operational access without administrative privileges.",
      "read only": "View-only access, without data changes or sensitive actions.",
      readonly: "View-only access, without data changes or sensitive actions.",
      lecture: "View-only access, without data changes or sensitive actions.",
      lecteur: "View-only access, without data changes or sensitive actions.",
      reader: "View-only access, without data changes or sensitive actions."
    }
  }
};

const PERMISSIONS_COPY = {
  fr: {
    pageTitle: "Permissions",
    pageDescription: "Définissez les droits de lecture et les actions (créer, modifier, supprimer…) pour chaque profil.",
    pageDescriptionCommunity: "Consultez les actions par profil. La personnalisation est réservée à Veritas Pro.",
    searchPlaceholder: "Rechercher un profil…",
    loadingProfiles: "Chargement des profils…",
    loadProfilesError: "Erreur de chargement des profils",
    noProfiles: "Aucun profil",
    selectProfile: "Sélectionnez un profil pour éditer ses actions.",
    systemTag: "Système",
    unsaved: "Non enregistré",
    unsavedConfirm: "Des modifications non enregistrées seront perdues. Continuer ?",
    save: "Enregistrer",
    saving: "Enregistrement…",
    saveSuccess: "Permissions enregistrées",
    sectionTitle: "Actions autorisées",
    sectionHint: "Contrôle l’accès en lecture et les actions dans chaque page. La visibilité dans le menu est synchronisée avec le droit « Lire ».",
    sectionHintCommunity: "La personnalisation des actions est réservée à Veritas Pro.",
    loading: "Chargement des permissions…",
    loadError: "Impossible de charger les permissions.",
    saveError: "Échec de l’enregistrement des permissions.",
    protectedHint: "Le profil Super Admin conserve tous les droits (non modifiable).",
    empty: "Aucune action configurable.",
    columns: {
      resource: "Ressource",
      view: "Lire",
      create: "Créer",
      edit: "Modifier",
      delete: "Supprimer",
      export: "Exporter",
      manage: "Gérer",
      all: "Tout"
    },
    selectAllColumns: "Tout sélectionner / désélectionner",
    toggleRow: "Tout pour cette ressource",
    sections: {
      operations: "Opérations",
      crm: "CRM",
      support: "Support",
      supervision: "Supervision",
      documents: "Documents",
      tools: "Outils",
      administration: "Administration",
      autres: "Autres"
    },
    groups: {
      dashboard: "Tableau de bord",
      planning: "Planning",
      clients: "Entreprises",
      contacts: "Contacts",
      contracts: "Contrats",
      services: "Services",
      tickets: "Tickets",
      sales: "Services & installations",
      infrastructure: "Infrastructure",
      supervision: "Centre de supervision",
      monitoring: "Rapports",
      cybersecurite: "Cybersécurité",
      documents: "Documents",
      vault: "Coffre-fort (Vault)",
      configurateur: "Configurateur",
      rmm: "RMM",
      integrations: "Intégrations",
      config: "Configuration",
      users: "Utilisateurs & profils",
      maintenance: "Maintenance / Sauvegardes",
      license: "Licence"
    },
    actionLabels: {
      view: "Lire",
      create: "Créer",
      edit: "Modifier",
      delete: "Supprimer",
      export: "Exporter",
      manage: "Gérer"
    },
    actionOverrides: {
      "vault.view": "Voir les secrets",
      "contacts.manage": "Gérer l’accès portail",
      "tickets.manage": "Administration (modération, purge, automations)",
      "supervision.manage": "Gérer les règles d’alerte",
      "vault.manage": "Créer / modifier / supprimer",
      "config.view": "Accéder à l’administration",
      "config.manage": "Modifier les paramètres",
      "users.manage": "Créer / modifier / supprimer, gérer les permissions",
      "rmm.manage": "Gérer le RMM",
      "integrations.manage": "Gérer les intégrations"
    },
    profiles: PROFILE_I18N.fr
  },
  en: {
    pageTitle: "Permissions",
    pageDescription: "Define read access and actions (create, edit, delete…) for each profile.",
    pageDescriptionCommunity: "Browse actions by profile. Customization is available with Veritas Pro.",
    searchPlaceholder: "Search a profile…",
    loadingProfiles: "Loading profiles…",
    loadProfilesError: "Failed to load profiles",
    noProfiles: "No profiles",
    selectProfile: "Select a profile to edit its actions.",
    systemTag: "System",
    unsaved: "Unsaved",
    unsavedConfirm: "Unsaved changes will be lost. Continue?",
    save: "Save",
    saving: "Saving…",
    saveSuccess: "Permissions saved",
    sectionTitle: "Allowed actions",
    sectionHint: "Controls read access and actions inside each page. Menu visibility is synced with the Read permission.",
    sectionHintCommunity: "Action customization is available with Veritas Pro.",
    loading: "Loading permissions…",
    loadError: "Unable to load permissions.",
    saveError: "Failed to save permissions.",
    protectedHint: "The Super Admin profile keeps full access (not editable).",
    empty: "No configurable actions.",
    columns: {
      resource: "Resource",
      view: "Read",
      create: "Create",
      edit: "Edit",
      delete: "Delete",
      export: "Export",
      manage: "Manage",
      all: "All"
    },
    selectAllColumns: "Select / unselect all",
    toggleRow: "All for this resource",
    sections: {
      operations: "Operations",
      crm: "CRM",
      support: "Support",
      supervision: "Supervision",
      documents: "Documents",
      tools: "Tools",
      administration: "Administration",
      autres: "Other"
    },
    groups: {
      dashboard: "Dashboard",
      planning: "Planning",
      clients: "Companies",
      contacts: "Contacts",
      contracts: "Contracts",
      services: "Services",
      tickets: "Tickets",
      sales: "Services & installations",
      infrastructure: "Infrastructure",
      supervision: "Supervision center",
      monitoring: "Reports",
      cybersecurite: "Cybersecurity",
      documents: "Documents",
      vault: "Secrets (Vault)",
      configurateur: "Configurator",
      rmm: "RMM",
      integrations: "Integrations",
      config: "Configuration",
      users: "Users & profiles",
      maintenance: "Maintenance / Backups",
      license: "License"
    },
    actionLabels: {
      view: "Read",
      create: "Create",
      edit: "Edit",
      delete: "Delete",
      export: "Export",
      manage: "Manage"
    },
    actionOverrides: {
      "vault.view": "View secrets",
      "contacts.manage": "Manage portal access",
      "tickets.manage": "Administration (moderation, purge, automations)",
      "supervision.manage": "Manage alert rules",
      "vault.manage": "Create / edit / delete",
      "config.view": "Access administration",
      "config.manage": "Edit settings",
      "users.manage": "Create / edit / delete, manage permissions",
      "rmm.manage": "Manage RMM",
      "integrations.manage": "Manage integrations"
    },
    profiles: PROFILE_I18N.en
  }
};

export const getAdminPermissionsCopy = createLocaleGetter(PERMISSIONS_COPY);

export function getLocalizedProfileName(profileName, copy) {
  const key = normalizeProfileName(profileName);
  return copy?.profiles?.names?.[key] || profileName || "";
}

export function getLocalizedProfileLabel(profileName, fallbackLabel, copy) {
  const key = normalizeProfileName(profileName);
  return copy?.profiles?.labels?.[key] || (fallbackLabel && fallbackLabel !== profileName ? fallbackLabel : "") || "";
}
