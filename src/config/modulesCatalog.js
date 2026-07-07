/** Catalogue des modules navigables · aligné sur la sidebar et les docTypes MainApp. */

export const MODULE_SECTIONS = [
  {
    id: "crm",
    label: "CRM",
    modules: [
      {
        key: "Contrat",
        docType: "Contrat",
        label: "Entreprises",
        description: "Fiches clients, contrats et contacts liés",
        icon: "mingcute:building-1-fill",
        proOnly: false,
      },
      {
        key: "Contact",
        docType: "Contact",
        label: "Contacts",
        description: "Annuaire et accès portail client",
        icon: "mingcute:contacts-3-fill",
        proOnly: false,
      },
    ],
  },
  {
    id: "exploitation",
    label: "Exploitation",
    modules: [
      {
        key: "Ticket",
        docType: "Ticket",
        label: "Support",
        description: "Tickets incident et demande",
        icon: "mingcute:ticket-fill",
        proOnly: false,
      },
      {
        key: "TicketSales",
        docType: "TicketSales",
        label: "Prestations",
        description: "Interventions et installations",
        icon: "mdi:briefcase-edit-outline",
        proOnly: true,
      },
      {
        key: "Planning",
        docType: "Planning",
        label: "Planning",
        description: "Agenda et événements équipe",
        icon: "mingcute:calendar-time-add-fill",
        proOnly: true,
      },
    ],
  },
  {
    id: "managed",
    label: "Services managés",
    modules: [
      {
        key: "Hardware",
        docType: "Hardware",
        label: "Centre de supervision",
        description: "Supervision MSP, périphériques, alertes et agents RMM",
        icon: "mdi:radar",
        proOnly: false,
      },
      {
        key: "Cybersecurite",
        docType: "Cybersecurite",
        label: "Cybersécurité",
        description: "Antivirus, antispam et campagnes",
        icon: "mdi:shield-lock",
        proOnly: false,
      },
      {
        key: "Service",
        docType: "Service",
        label: "Cloud IT et services",
        description: "Microsoft 365, domaines, tenants",
        icon: "mdi:cloud-outline",
        proOnly: false,
      },
    ],
  },
  {
    id: "pilotage",
    label: "Pilotage",
    modules: [
      {
        key: "Rapport",
        docType: "Rapport",
        label: "Rapports",
        description: "Documents et cahiers de recette clients",
        icon: "mingcute:report-forms-fill",
        proOnly: true,
      },
    ],
  },
];

export function getAllCatalogModules() {
  return MODULE_SECTIONS.flatMap((section) =>
    section.modules.map((module) => ({ ...module, sectionId: section.id, sectionLabel: section.label }))
  );
}

export function getProOnlySidebarModules() {
  return getAllCatalogModules().filter((module) => module.proOnly);
}

export function isModuleLockedForEdition(module, isCommunity) {
  return Boolean(isCommunity && module.proOnly);
}
