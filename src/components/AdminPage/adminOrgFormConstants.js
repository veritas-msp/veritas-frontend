export const AGENT_FORM_SECTIONS = [
  {
    id: "identity",
    label: "Identité",
    description: "Email et nom",
    icon: "mdi:card-account-details-outline",
  },
  {
    id: "security",
    label: "Sécurité",
    description: "Mot de passe",
    icon: "mdi:lock-outline",
  },
  {
    id: "access",
    label: "Accès",
    description: "Profil assigné",
    icon: "mdi:shield-account-outline",
  },
];

export function buildDefaultAgentDraft(defaultProfile = "") {
  return {
    email: "",
    username: "",
    password: "",
    password2: "",
    profile: defaultProfile,
  };
}

export const AGENT_EDIT_MFA_SECTION = {
  id: "mfa",
  label: "MFA",
  description: "Authentification",
  icon: "mdi:shield-key-outline",
};

export const AGENT_EDIT_FORM_SECTIONS = [
  ...AGENT_FORM_SECTIONS,
  AGENT_EDIT_MFA_SECTION,
];

export function buildAgentDraftFromUser(user = {}) {
  return {
    id: user.id,
    email: user.email || "",
    username: user.username || "",
    password: "",
    password2: "",
    profile: user.profile || "",
    is_active: user.is_active !== false,
    role: user.role || "",
    mfa_enabled: !!user.mfa_enabled,
    mfa_pending_setup: !!user.mfa_pending_setup,
  };
}

export const DEFAULT_AGENT_PROFILE_NAME = "Agent";

export function resolveAgentProfileName(profilesList = []) {
  const agentProfile = profilesList.find(
    (profile) =>
      String(profile?.name || "").toLowerCase() === "agent" ||
      String(profile?.label || "").toLowerCase() === "agent"
  );
  return agentProfile?.name || DEFAULT_AGENT_PROFILE_NAME;
}

export const PROFILE_FORM_SECTIONS = [
  {
    id: "general",
    label: "Général",
    description: "Identifiant et libellé",
    icon: "mdi:information-outline",
  },
  {
    id: "inheritance",
    label: "Héritage",
    description: "Profil parent",
    icon: "mdi:source-branch",
  },
];

export function buildDefaultProfileDraft() {
  return {
    name: "",
    label: "",
    parentProfile: "",
  };
}

export const TEAM_FORM_SECTIONS = [
  {
    id: "general",
    label: "Général",
    description: "Nom et description",
    icon: "mdi:information-outline",
  },
  {
    id: "status",
    label: "Statut",
    description: "Disponibilité",
    icon: "mdi:toggle-switch-outline",
  },
];

export function buildDefaultTeamDraft() {
  return {
    name: "",
    description: "",
    isActive: true,
  };
}
