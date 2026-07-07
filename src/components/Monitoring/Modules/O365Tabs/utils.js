// Fonctions utilitaires partagées pour les onglets O365

// Mapping des identifiants de licences vers des noms lisibles
export const licenseNameMapping = {
    // Microsoft 365 Enterprise
    'ENTERPRISEPACK': 'Microsoft 365 E3',
    'ENTERPRISEPREMIUM': 'Microsoft 365 E5',
    'ENTERPRISEWITHSCAL': 'Microsoft 365 E3 avec téléphonie',
    'M365EDU_A3_FACULTY': 'Microsoft 365 A3 (Enseignants)',
    'M365EDU_A3_STUDENT': 'Microsoft 365 A3 (Étudiants)',
    'M365EDU_A5_FACULTY': 'Microsoft 365 A5 (Enseignants)',
    'M365EDU_A5_STUDENT': 'Microsoft 365 A5 (Étudiants)',
    
    // Microsoft 365 Business
    'O365_BUSINESS': 'Microsoft 365 Business Basic',
    'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Essentials',
    'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
    'SMB_BUSINESS': 'Microsoft 365 Business Standard',
    'SMB_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Essentials',
    'SMB_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
    
    // Exchange Online
    'EXCHANGESTANDARD': 'Exchange Online Plan 1',
    'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
    'EXCHANGEARCHIVE_ADDON': 'Exchange Online Archiving',
    'EXCHANGEDESKLESS': 'Exchange Online Kiosk',
    
    // SharePoint
    'SHAREPOINTSTANDARD': 'SharePoint Online Plan 1',
    'SHAREPOINTENTERPRISE': 'SharePoint Online Plan 2',
    'SHAREPOINTWAC': 'Office pour le web',
    
    // Teams
    'TEAMS_EXPLORATORY': 'Microsoft Teams Exploratory',
    'TEAMS1': 'Microsoft Teams (Essentiel)',
    'TEAMS_COMMERCIAL': 'Microsoft Teams Commercial',
    'TEAMS_EDU': 'Microsoft Teams pour l\'éducation',
    
    // Azure AD
    'AAD_PREMIUM': 'Azure AD Premium P1',
    'AAD_PREMIUM_P2': 'Azure AD Premium P2',
    'AAD_BASIC': 'Azure AD Basic',
    
    // Office
    'OFFICESUBSCRIPTION': 'Microsoft 365 Apps pour entreprise',
    'OFFICE_PRO_PLUS_SUBSCRIPTION_SMBIZ': 'Office 365 ProPlus',
    'OFFICE365_MIDSIZE_BUSINESS': 'Office 365 Midsize Business',
    
    // Sécurité et conformité
    'RMS_S_ENTERPRISE': 'Azure Rights Management',
    'RMS_S_PREMIUM': 'Azure Information Protection Premium P1',
    'RMS_S_PREMIUM2': 'Azure Information Protection Premium P2',
    'INTUNE_A': 'Microsoft Intune',
    'INTUNE_A_VL': 'Microsoft Intune (Volume)',
    
    // Visio et Project
    'VISIOCLIENT': 'Visio Plan 1',
    'VISIOONLINE_PLAN1': 'Visio Plan 1',
    'VISIOONLINE_PLAN2': 'Visio Plan 2',
    'PROJECTPROFESSIONAL': 'Project Plan 3',
    'PROJECTONLINE_PLAN_1': 'Project Plan 1',
    'PROJECTONLINE_PLAN_2': 'Project Plan 2',
    'PROJECTPREMIUM': 'Project Plan 5',
    
    // Autres
    'POWER_BI_STANDARD': 'Power BI (Gratuit)',
    'POWER_BI_PRO': 'Power BI Pro',
    'POWER_BI_PREMIUM': 'Power BI Premium',
    'FLOW_FREE': 'Power Automate (Gratuit)',
    'POWERAPPS_VIRAL': 'Power Apps (Gratuit)',
    'POWERAPPS_PER_USER': 'Power Apps par utilisateur',
    'STREAM': 'Microsoft Stream',
    'YAMMER_ENTERPRISE': 'Yammer Enterprise',
    'YAMMER_MIDSIZE': 'Yammer',
    
    // Licences gouvernementales
    'ENTERPRISEPACK_GOV': 'Microsoft 365 E3 (Gouvernement)',
    'ENTERPRISEPREMIUM_GOV': 'Microsoft 365 E5 (Gouvernement)',
    
    // Licences éducation
    'STANDARDWOFFPACK_STUDENT': 'Office 365 Éducation (Étudiants)',
    'STANDARDWOFFPACK_FACULTY': 'Office 365 Éducation (Enseignants)',
    'STANDARDWOFFPACK_IW_FACULTY': 'Office 365 Éducation Plus (Enseignants)',
    'STANDARDWOFFPACK_IW_STUDENT': 'Office 365 Éducation Plus (Étudiants)',
    
    // Licences à usage unique
    'DESKLESSPACK': 'Office 365 Kiosk',
    'DESKLESSWOFFPACK': 'Office 365 Kiosk',
    'WACSHAREPOINTSTD': 'Office pour le web avec SharePoint',
    'WACSHAREPOINTENT': 'Office pour le web avec SharePoint (Entreprise)',
};

/**
 * Convertit un identifiant de licence technique en nom lisible
 * @param {string} licenseId - L'identifiant technique (skuPartNumber, displayName, etc.)
 * @returns {string} - Le nom lisible de la licence
 */
export const getLicenseDisplayName = (licenseId) => {
    if (!licenseId) return 'Licence inconnue';
    
    // Normaliser l'identifiant (enlever les espaces, mettre en majuscules)
    const normalizedId = licenseId.toUpperCase().trim();
    
    // Vérifier dans le mapping
    if (licenseNameMapping[normalizedId]) {
        return licenseNameMapping[normalizedId];
    }
    
    // Si pas trouvé, essayer de trouver une correspondance partielle
    for (const [key, value] of Object.entries(licenseNameMapping)) {
        if (normalizedId.includes(key) || key.includes(normalizedId)) {
            return value;
        }
    }
    
    // Si toujours pas trouvé, formater l'identifiant pour le rendre plus lisible
    // Remplacer les underscores et tirets par des espaces, puis capitaliser
    const formatted = licenseId
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return formatted;
};

// Fonctions utilitaires pour les recommandations de sécurité
export const recommendationStateLabels = {
    terminé: "Terminé",
    resolved: "Terminé",
    completed: "Terminé",
    "en cours": "En cours",
    inprogress: "En cours",
    "in-progress": "En cours",
    actif: "Actif",
    active: "Actif",
    acknowledged: "Reconnu",
    todo: "À traiter",
    notstarted: "À traiter",
    inconnu: "Inconnu",
    unknown: "Inconnu"
};

export const priorityLevelLabelMap = {
    3: "Élevée",
    2: "Moyenne",
    1: "Faible",
    0: "Non classée"
};

export const priorityColorMap = {
    "Élevée": "#ef4444",
    "Moyenne": "#f59e0b",
    "Faible": "#6b7280",
    "Non classée": "#9ca3af"
};

export const stateBadgeStyles = {
    "Terminé": { background: "#dcfce7", color: "#166534" },
    "En cours": { background: "#fef3c7", color: "#92400e" },
    "Actif": { background: "#dbeafe", color: "#1e40af" },
    "Reconnu": { background: "#e0e7ff", color: "#3730a3" },
    "À traiter": { background: "#fee2e2", color: "#991b1b" },
    "Inconnu": { background: "#e5e7eb", color: "#374151" }
};

export const translateRecommendationStateLabel = (state) => {
    if (!state) return "Inconnu";
    const normalized = state.toString().toLowerCase();
    return recommendationStateLabels[normalized] || "Inconnu";
};

export const computePriorityLevel = (rec) => {
    const rank = typeof rec?.rank === 'number' ? rec.rank : null;
    const maxScore = typeof rec?.maxScore === 'number' ? rec.maxScore : 0;
    if (rec?.priorityLevel !== undefined && rec.priorityLevel !== null) {
        return rec.priorityLevel;
    }
    if (rank !== null) {
        if (rank <= 20) return 3;
        if (rank <= 60) return 2;
        if (rank > 0) return 1;
    }
    if (maxScore >= 15) return 3;
    if (maxScore >= 8) return 2;
    if (maxScore > 0) return 1;
    return 0;
};

export const getPriorityLabelFromLevel = (level) => {
    return priorityLevelLabelMap[level] || "Non classée";
};

export const getPriorityColorValue = (label) => {
    return priorityColorMap[label] || priorityColorMap["Non classée"];
};

export const getStateBadgeStyle = (label) => {
    return stateBadgeStyles[label] || stateBadgeStyles["Inconnu"];
};

export const getPriorityLabel = (rec) => {
    if (rec?.priorityLabel) return rec.priorityLabel;
    return getPriorityLabelFromLevel(computePriorityLevel(rec));
};

export const getStateLabel = (rec) => {
    return rec?.stateLabel || translateRecommendationStateLabel(rec?.state);
};

// Fonctions utilitaires pour le formatage
export const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
};

export const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
};

export const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

// Fonction pour trier les utilisateurs
export const getSortedUsers = (users, sortColumn, sortDirection) => {
    if (!sortColumn) return users;
    
    const sorted = [...users].sort((a, b) => {
        let aValue, bValue;
        
        switch (sortColumn) {
            case 'nom':
                aValue = (a.name || a.displayName || '').toLowerCase();
                bValue = (b.name || b.displayName || '').toLowerCase();
                break;
            case 'email':
                aValue = (a.email || a.userPrincipalName || '').toLowerCase();
                bValue = (b.email || b.userPrincipalName || '').toLowerCase();
                break;
            case 'dateCreation':
                aValue = a.createdDate ? new Date(a.createdDate).getTime() : 0;
                bValue = b.createdDate ? new Date(b.createdDate).getTime() : 0;
                break;
            case 'derniereConnexion':
                aValue = a.lastLoginDate ? new Date(a.lastLoginDate).getTime() : 0;
                bValue = b.lastLoginDate ? new Date(b.lastLoginDate).getTime() : 0;
                break;
            case 'statut':
                // Trier par statut : Bloqué < Inactif (>90j) < Inactif < Actif
                const getStatusValue = (user) => {
                    if (user.accountEnabled === false) return 0;
                    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
                    const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                    const isInactive = !lastLogin || lastLogin < period90Days;
                    const period30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    const isActive30 = lastLogin && lastLogin >= period30Days;
                    if (isActive30) return 3;
                    if (isInactive) return 1;
                    return 2;
                };
                aValue = getStatusValue(a);
                bValue = getStatusValue(b);
                break;
            case 'licence':
                aValue = (a.licenses || 'Aucune').toLowerCase();
                bValue = (b.licenses || 'Aucune').toLowerCase();
                break;
            default:
                return 0;
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    return sorted;
};

