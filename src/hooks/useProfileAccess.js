import { useEffect, useState } from "react";
import { DOCUMENTS_CONFIG } from "../utils/constants";
import API_BASE_URL from "../config";

// Liste des accès aux pages (infrastructure, cybersécurité, service, contrat, contact)
const PAGES_ACCESS_CONFIG = [
  { key: "Dashboard", label: "Tableau de bord KPI", accessKey: "dashboard_enabled" },
  { key: "Hardware", label: "Centre de supervision", accessKey: "infrastructure_enabled" },
  { key: "Cybersecurite", label: "Cybersécurité", accessKey: "cybersecurite_enabled" },
  { key: "Planning", label: "Planning", accessKey: "planning_enabled" },
  { key: "Ticket", label: "Support", accessKey: "tickets_enabled" },
  { key: "TicketSales", label: "Prestations et installations", accessKey: "tickets_enabled" },
  { key: "Service", label: "Service", accessKey: "service_enabled" },
  { key: "Contrat", label: "Contrat", accessKey: "contrat_enabled" },
  { key: "Contact", label: "Contact", accessKey: "contact_enabled" },
];

function mapProfileToAccess(data) {
  const access = {};
  DOCUMENTS_CONFIG.forEach((doc) => {
    access[doc.key] = !!data[doc.accessKey];
  });
  PAGES_ACCESS_CONFIG.forEach((page) => {
    access[page.key] = !!data[page.accessKey];
  });
  return access;
}

export function useProfileAccess(profileName, refreshTrigger) {
  const [access, setAccess] = useState({});

  useEffect(() => {
    const fetchAccess = async () => {
      const normalizedProfile = String(profileName || "").trim();
      if (!normalizedProfile) {
        setAccess({});
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE_URL}/profiles/${encodeURIComponent(normalizedProfile)}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Profil non trouvé");
        const data = await res.json();
        setAccess(mapProfileToAccess(data));
      } catch (err) {
        console.warn("Erreur chargement accès profil", err);
        setAccess({});
      }
    };

    fetchAccess();
  }, [profileName, refreshTrigger]);

  return access;
}
