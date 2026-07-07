import React, { useState, useMemo } from 'react';
import { Icon } from "@iconify/react";
import { FaSort, FaSortUp, FaSortDown, FaChevronLeft, FaChevronRight, FaCheck, FaTimes, FaSearch } from "react-icons/fa";
import { toast } from 'react-toastify';
import styles from '../TenantDetailPage.module.css';
import SmartTooltip from '../../SmartTooltip';
import { getLicenseDisplayName } from './utils';

// Libellé lisible pour une méthode MFA (tooltip)
function getMfaMethodLabel(methodType) {
  const labels = {
    microsoftauthenticatorauthenticationmethod: 'Microsoft Authenticator',
    phoneauthenticationmethod: 'Téléphone / SMS',
    fido2authenticationmethod: 'Clé FIDO2',
    softwareoathauthenticationmethod: 'Application OATH (TOTP)',
    temporaryaccesspassauthenticationmethod: 'Passe temporaire',
    emailauthenticationmethod: 'Email',
    passwordauthenticationmethod: 'Mot de passe',
    windowshelloforbusinessauthenticationmethod: 'Windows Hello'
  };
  return labels[methodType] || methodType;
}

// Icônes des méthodes MFA (même mapping que MfaDetailsTable / campagnes sécurité Microsoft)
function getMfaMethodIcon(methodType) {
  switch (methodType) {
    case 'microsoftauthenticatorauthenticationmethod':
      return <Icon icon="mdi:cellphone" />;
    case 'phoneauthenticationmethod':
      return <Icon icon="mdi:phone" />;
    case 'fido2authenticationmethod':
      return <Icon icon="mdi:usb" />;
    case 'softwareoathauthenticationmethod':
      return <Icon icon="mdi:shield-key" />;
    case 'temporaryaccesspassauthenticationmethod':
      return <Icon icon="mdi:clock-outline" />;
    case 'emailauthenticationmethod':
      return <Icon icon="mdi:email" />;
    case 'passwordauthenticationmethod':
    case 'windowshelloforbusinessauthenticationmethod':
      return null;
    default:
      return <Icon icon="mdi:help-circle" />;
  }
}

const USER_FILTER_ALL = 'all';
const USER_FILTER_ACTIVE_30 = 'active30';
const USER_FILTER_BLOCKED = 'blocked';
const USER_FILTER_INACTIVE_90 = 'inactive90';
const USER_FILTER_MFA_ACTIF = 'mfaActif';
const USER_FILTER_MFA_INACTIF = 'mfaInactif';
const USER_FILTER_ADMIN = 'admin';
const USER_FILTER_NON_ADMIN = 'nonAdmin';
const USER_FILTER_METHOD_PREFIX = 'method_';
const USER_FILTER_DOMAIN_PREFIX = 'domain_';
const NO_DOMAIN_KEY = '__no_domain__';

/** Extrait le domaine (partie après @) depuis userPrincipalName ou email */
function getUserDomain(user) {
  const raw = (user.userPrincipalName || user.email || '').toString().trim();
  const at = raw.indexOf('@');
  if (at === -1) return NO_DOMAIN_KEY;
  const domain = raw.slice(at + 1).toLowerCase();
  return domain || NO_DOMAIN_KEY;
}

const MFA_METHOD_FILTERS = [
  { key: 'microsoftauthenticatorauthenticationmethod', label: 'Authenticator', tooltip: 'Filtrer par Microsoft Authenticator (application mobile)' },
  { key: 'phoneauthenticationmethod', label: 'Téléphone', tooltip: 'Filtrer par authentification par téléphone (SMS / appel)' },
  { key: 'emailauthenticationmethod', label: 'Email', tooltip: 'Filtrer par authentification par email' },
  { key: 'fido2authenticationmethod', label: 'FIDO2', tooltip: 'Filtrer par clé de sécurité FIDO2' },
  { key: 'softwareoathauthenticationmethod', label: 'OATH', tooltip: 'Filtrer par application OATH (codes TOTP)' },
  { key: 'temporaryaccesspassauthenticationmethod', label: 'Passe temporaire', tooltip: 'Filtrer par passe d\'accès temporaire' }
];

// Méthodes affichées sur la 2e ligne KPI (ordre: Téléphone/SMS, Email, Authenticator, Software auth)
const MFA_METHOD_FILTERS_LINE2 = [
  { key: 'phoneauthenticationmethod', label: 'Téléphone/SMS', tooltip: 'Filtrer par authentification par téléphone (SMS / appel)' },
  { key: 'emailauthenticationmethod', label: 'Email', tooltip: 'Filtrer par authentification par email' },
  { key: 'microsoftauthenticatorauthenticationmethod', label: 'Authenticator', tooltip: 'Filtrer par Microsoft Authenticator (application mobile)' },
  { key: 'softwareoathauthenticationmethod', label: 'Software auth', tooltip: 'Filtrer par application OATH (codes TOTP)' }
];

function getMfaUserForUser(user, mfaDetails) {
  const upn = (user.userPrincipalName || user.email || '').toLowerCase().trim();
  const userId = user.id;
  return mfaDetails.find(m => {
    const mUpn = (m.userPrincipalName || m.user_principal_name || '').toLowerCase().trim();
    if (mUpn && upn && mUpn === upn) return true;
    if (userId && m.id && String(m.id) === String(userId)) return true;
    return false;
  }) || null;
}

// Mapping rôles admin -> icône (Iconify) + libellé pour tooltip
const ADMIN_ROLE_ICONS = [
  { pattern: /global\s*administrator/i, icon: 'mdi:earth', label: 'Global Administrator' },
  { pattern: /teams\s*administrator/i, icon: 'mdi:microsoft-teams', label: 'Teams Administrator' },
  { pattern: /exchange\s*administrator/i, icon: 'mdi:email-outline', label: 'Exchange Administrator' },
  { pattern: /sharepoint\s*administrator/i, icon: 'mdi:sharepoint', label: 'SharePoint Administrator' },
  { pattern: /user\s*administrator/i, icon: 'mdi:account-cog', label: 'User Administrator' },
  { pattern: /security\s*administrator/i, icon: 'mdi:shield-account', label: 'Security Administrator' },
  { pattern: /privileged\s*role/i, icon: 'mdi:shield-key', label: 'Privileged Role Administrator' },
  { pattern: /billing\s*administrator/i, icon: 'mdi:credit-card-outline', label: 'Billing Administrator' },
  { pattern: /application\s*administrator/i, icon: 'mdi:application-cog', label: 'Application Administrator' },
  { pattern: /helpdesk\s*administrator/i, icon: 'mdi:headset', label: 'Helpdesk Administrator' },
  { pattern: /intune\s*administrator/i, icon: 'mdi:cellphone-cog', label: 'Intune Administrator' },
  { pattern: /compliance\s*administrator/i, icon: 'mdi:gavel', label: 'Compliance Administrator' },
  { pattern: /conditional\s*access/i, icon: 'mdi:shield-lock', label: 'Conditional Access Administrator' },
  { pattern: /authentication\s*administrator/i, icon: 'mdi:fingerprint', label: 'Authentication Administrator' },
  { pattern: /license\s*administrator/i, icon: 'mdi:certificate-outline', label: 'License Administrator' },
  { pattern: /groups\s*administrator/i, icon: 'mdi:account-group', label: 'Groups Administrator' },
  { pattern: /password\s*administrator/i, icon: 'mdi:form-textbox-password', label: 'Password Administrator' },
  { pattern: /power\s*platform/i, icon: 'mdi:power', label: 'Power Platform Administrator' },
  { pattern: /cloud\s*application/i, icon: 'mdi:cloud-cog', label: 'Cloud Application Administrator' },
  { pattern: /directory\s*readers/i, icon: 'mdi:account-eye', label: 'Directory Readers' },
  { pattern: /reports\s*reader/i, icon: 'mdi:chart-box-outline', label: 'Reports Reader' },
  { pattern: /administrator|admin/i, icon: 'mdi:shield-account-outline', label: null }
];

function getAdminRoleIcons(adminRoleString) {
  if (adminRoleString == null || String(adminRoleString).trim() === '') return [];
  const roles = String(adminRoleString).split(',').map(r => r.trim()).filter(Boolean);
  const result = [];
  const seenLabels = new Set();
  for (const role of roles) {
    const entry = ADMIN_ROLE_ICONS.find(e => e.pattern.test(role));
    const label = entry?.label || role;
    const icon = entry?.icon || 'mdi:shield-account-outline';
    if (!seenLabels.has(label)) {
      seenLabels.add(label);
      result.push({ icon, label: label || role });
    }
  }
  return result;
}

function userHasMfa(mfaUser) {
  if (!mfaUser) return false;
  if (mfaUser.has_mfa === true) return true;
  const methods = mfaUser.mfa_methods || mfaUser.mfaMethods || [];
  return Array.isArray(methods) && methods.some(m => getMfaMethodIcon(m) !== null);
}

function userHasMethod(mfaUser, methodKey) {
  if (!mfaUser) return false;
  const methods = mfaUser.mfa_methods || mfaUser.mfaMethods || [];
  return Array.isArray(methods) && methods.includes(methodKey);
}

/** Détection côté client des comptes de service (même critères que le backend, pour anciens snapshots sans isServiceAccount) */
function isLikelyServiceAccountFromUser(user) {
  const name = (user.name || user.displayName || '').toString();
  const upn = (user.userPrincipalName || user.email || '').toString();
  const email = (user.email || '').toString();
  const combined = `${name} ${upn} ${email}`.toLowerCase();
  const patterns = [
    /aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/,
    /_srv/, /_service/, /_sync/,
    /compte de service|service account|compte service/,
    /bot\./, /bot@/, /connector/, /automation/,
    /azure ad sync|ad sync|dirsync|aadconnect|dir sync/,
    /directory synchronization|synchronization service|on-premises/,
    /healthmailbox|systemmailbox|federatedemail/
  ];
  return patterns.some(p => p.test(combined));
}

function getFilteredUsers(users, filter, mfaDetails = []) {
  if (!users) return [];
  if (filter === USER_FILTER_ALL) return users;
  const period30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const period90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  switch (filter) {
    case USER_FILTER_ACTIVE_30:
      return users.filter(u => {
        const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
        return lastLogin && lastLogin >= period30;
      });
    case USER_FILTER_BLOCKED:
      return users.filter(u => u.accountEnabled === false);
    case USER_FILTER_INACTIVE_90:
      return users.filter(u => {
        const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
        return !lastLogin || lastLogin < period90;
      });
    case USER_FILTER_MFA_ACTIF:
      return users.filter(u => userHasMfa(getMfaUserForUser(u, mfaDetails)));
    case USER_FILTER_ADMIN:
      return users.filter(u => {
        const m = getMfaUserForUser(u, mfaDetails);
        return m && m.is_admin === true;
      });
    case USER_FILTER_NON_ADMIN:
      return users.filter(u => {
        const m = getMfaUserForUser(u, mfaDetails);
        return m && m.is_admin !== true;
      });
    case USER_FILTER_MFA_INACTIF:
      return users.filter(u => {
        const m = getMfaUserForUser(u, mfaDetails);
        return m && !userHasMfa(m);
      });
    case USER_FILTER_MFA_ACTIF:
      return users.filter(u => userHasMfa(getMfaUserForUser(u, mfaDetails)));
    default:
      if (filter.startsWith(USER_FILTER_DOMAIN_PREFIX)) {
        const domain = filter.slice(USER_FILTER_DOMAIN_PREFIX.length);
        return users.filter(u => getUserDomain(u) === domain);
      }
      if (filter.startsWith(USER_FILTER_METHOD_PREFIX)) {
        const methodKey = filter.slice(USER_FILTER_METHOD_PREFIX.length);
        return users.filter(u => userHasMethod(getMfaUserForUser(u, mfaDetails), methodKey));
      }
      return users;
  }
}

const DOMAIN_FILTER_ALL = 'all';

export default function UtilisateursTab({ users, dashboardMetrics, detailData, mfaDetails = [], theme }) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [domainFilter, setDomainFilter] = useState(DOMAIN_FILTER_ALL);
  const [activeFilters, setActiveFilters] = useState([]);
  const [hideServiceAccounts, setHideServiceAccounts] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const usersPerPage = 10;

  // Exclure les comptes de service de la liste affichée (et des KPI) si l’option est activée
  // Si isServiceAccount est absent (ancien snapshot), on utilise la détection côté client
  const displayUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    if (!hideServiceAccounts) return users;
    return users.filter(u => {
      const isService = u.isServiceAccount === true || (u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u));
      return !isService;
    });
  }, [users, hideServiceAccounts]);
  const serviceAccountsCount = useMemo(() => (users || []).filter(u => u.isServiceAccount === true || (u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u))).length, [users]);

  const setDomainAndResetPage = (domain) => {
    setDomainFilter(domain);
    setCurrentPage(1);
  };

  const toggleFilter = (filterKey) => {
    setActiveFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
    setCurrentPage(1);
  };

  const clearActiveFilters = () => {
    setActiveFilters([]);
    setCurrentPage(1);
  };

  // Fonction pour gérer le tri des colonnes utilisateurs
  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      // Par défaut, pour la colonne rôle admin on veut les utilisateurs
      // avec le plus de rôles en premier => tri descendant par défaut.
      if (columnKey === 'roleAdmin') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  // Fonction pour trier les utilisateurs
  const getSortedUsers = (usersList) => {
    if (!sortColumn) return usersList;
    
    const sorted = [...usersList].sort((a, b) => {
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
        case 'statut':
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
        case 'mfaActif': {
          const getMfaInfo = (u) => {
            const upn = u.userPrincipalName || u.email || '';
            const mfa = mfaDetails.find(m => (m.userPrincipalName || m.user_principal_name || '') === upn);
            const methods = mfa?.mfa_methods || mfa?.mfaMethods || [];
            const hasMfa = mfa?.has_mfa ?? (Array.isArray(methods) && methods.some(m => getMfaMethodIcon(m) !== null));
            return hasMfa ? 1 : 0;
          };
          aValue = getMfaInfo(a);
          bValue = getMfaInfo(b);
          break;
        }
        case 'admin': {
          const getAdminInfo = (u) => {
            const upn = u.userPrincipalName || u.email || '';
            const mfa = mfaDetails.find(m => (m.userPrincipalName || m.user_principal_name || '') === upn);
            return mfa?.is_admin === true ? 1 : 0;
          };
          aValue = getAdminInfo(a);
          bValue = getAdminInfo(b);
          break;
        }
        case 'roleAdmin': {
          const getRoleAdminStats = (u) => {
            const mfa = getMfaUserForUser(u, mfaDetails);
            const raw = (mfa?.admin_role ?? mfa?.adminRole ?? '').toString().trim();
            if (!raw) return { count: 0, label: '' };
            const roles = raw.split(',').map(r => r.trim()).filter(Boolean);
            return { count: roles.length, label: raw.toLowerCase() };
          };
          const aStats = getRoleAdminStats(a);
          const bStats = getRoleAdminStats(b);
          if (aStats.count !== bStats.count) {
            aValue = aStats.count;
            bValue = bStats.count;
          } else {
            aValue = aStats.label;
            bValue = bStats.label;
          }
          break;
        }
        case 'methodes': {
          const getMethodCount = (u) => {
            const upn = u.userPrincipalName || u.email || '';
            const mfa = mfaDetails.find(m => (m.userPrincipalName || m.user_principal_name || '') === upn);
            const methods = mfa?.mfa_methods || mfa?.mfaMethods || [];
            if (!Array.isArray(methods)) return 0;
            return methods.filter(m => getMfaMethodIcon(m) !== null).length;
          };
          aValue = getMethodCount(a);
          bValue = getMethodCount(b);
          break;
        }
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  // Fonction pour obtenir l'icône de tri
  const getSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) {
      return <FaSort style={{ fontSize: '0.75rem', opacity: 0.4, marginLeft: '0.25rem' }} />;
    }
    return sortDirection === 'asc' 
      ? <FaSortUp style={{ fontSize: '0.75rem', marginLeft: '0.25rem', color: '#3b82f6' }} />
      : <FaSortDown style={{ fontSize: '0.75rem', marginLeft: '0.25rem', color: '#3b82f6' }} />;
  };

  /** Liste de base : filtrée par recherche + domaine (domaine sélectionné en haut) */
  const usersForKpi = useMemo(() => {
    if (!displayUsers || !displayUsers.length) return [];
    
    let base = displayUsers;
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      base = base.filter(u => {
        const name = (u.name || u.displayName || '').toLowerCase();
        const email = (u.email || u.userPrincipalName || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    if (domainFilter === DOMAIN_FILTER_ALL) return base;
    return base.filter(u => getUserDomain(u) === domainFilter);
  }, [displayUsers, domainFilter, userSearchQuery]);

  /** Liste après tous les filtres : domaine + chaque filtre actif (AND) */
  const filteredUsers = useMemo(() => {
    if (!activeFilters || activeFilters.length === 0) return usersForKpi;
    return activeFilters.reduce((acc, filterKey) => getFilteredUsers(acc, filterKey, mfaDetails), usersForKpi);
  }, [usersForKpi, activeFilters, mfaDetails]);

  // Fonction pour exporter les utilisateurs en CSV (liste filtrée affichée)
  const exportUsersToCSV = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      toast.error('Aucun utilisateur à exporter');
      return;
    }
    
    const usersToExport = getSortedUsers(filteredUsers);
    const headers = ['Nom', 'Email', 'Date de création', 'Statut', 'Licences', 'Rôle admin', 'Admin', 'MFA actif', 'Méthodes'];
    
    const methodKeyToLabel = Object.fromEntries(MFA_METHOD_FILTERS.map(m => [m.key, m.label]));
    
    const rows = usersToExport.map(user => {
      const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
      const createdDate = user.createdDate ? new Date(user.createdDate) : null;
      const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const isInactive = !lastLogin || lastLogin < period90Days;
      const period30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const isActive30 = lastLogin && lastLogin >= period30Days;
      
      const statusLabel = user.accountEnabled === false
        ? 'Bloqué'
        : isActive30
        ? 'Actif'
        : isInactive
        ? 'Inactif (>90j)'
        : 'Inactif';

      const mfaUser = getMfaUserForUser(user, mfaDetails);
      const mfaActifLabel = mfaUser == null ? '-' : userHasMfa(mfaUser) ? 'Oui' : 'Non';
      const adminLabel = mfaUser == null ? '-' : mfaUser.is_admin === true ? 'Oui' : 'Non';
      const adminRoleLabel = mfaUser == null ? '-' : (mfaUser.admin_role || mfaUser.adminRole || '-');
      const methodsRaw = mfaUser?.mfa_methods || mfaUser?.mfaMethods || [];
      const methods = Array.isArray(methodsRaw) ? [...new Set(methodsRaw)] : [];
      const methodLabels = methods.length > 0
        ? methods
            .filter(m => getMfaMethodIcon(m) !== null)
            .map(m => methodKeyToLabel[m] || m)
            .join(', ')
        : '';
      const methodesLabel = mfaUser == null ? '-' : (methodLabels || '-');
      
      return [
        user.name || user.displayName || '',
        user.email || user.userPrincipalName || '',
        createdDate ? createdDate.toLocaleDateString('fr-FR') : '',
        statusLabel,
        user.licenses || 'Aucune',
        adminRoleLabel,
        adminLabel,
        mfaActifLabel,
        methodesLabel
      ];
    });
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(';'))
    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    const clientName = detailData?.clientName || 'client';
    link.download = `utilisateurs_${clientName}_${dateStr}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Export CSV réussi : ${usersToExport.length} utilisateur(s) exporté(s)`);
  };

  // Pagination des utilisateurs (sur la liste filtrée)
  const sortedUsers = getSortedUsers(filteredUsers);
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / usersPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const blockedUsers = filteredUsers.filter(u => u.accountEnabled === false).length;
  const inactiveUsers90 = filteredUsers.filter(u => {
    const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
    const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return !lastLogin || lastLogin < period90Days;
  }).length;
  const activeUsers30Count = filteredUsers.filter(u => {
    const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
    const period30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return lastLogin && lastLogin >= period30;
  }).length;

  const mfaActifCount = filteredUsers.filter(u => userHasMfa(getMfaUserForUser(u, mfaDetails))).length;
  const mfaInactifCount = filteredUsers.filter(u => {
    const m = getMfaUserForUser(u, mfaDetails);
    return m && !userHasMfa(m);
  }).length;
  const adminCount = filteredUsers.filter(u => {
    const m = getMfaUserForUser(u, mfaDetails);
    return m && m.is_admin === true;
  }).length;
  const nonAdminCount = filteredUsers.filter(u => {
    const m = getMfaUserForUser(u, mfaDetails);
    return m && m.is_admin !== true;
  }).length;
  const methodCounts = useMemo(() => {
    const counts = {};
    MFA_METHOD_FILTERS.forEach(({ key }) => {
      counts[key] = filteredUsers.filter(u => userHasMethod(getMfaUserForUser(u, mfaDetails), key)).length;
    });
    return counts;
  }, [filteredUsers, mfaDetails]);

  /** Liste des domaines avec effectif, triée par effectif décroissant puis par nom */
  const domainCounts = useMemo(() => {
    const map = new Map();
    (displayUsers || []).forEach(u => {
      const d = getUserDomain(u);
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count || (a.domain === NO_DOMAIN_KEY ? 1 : b.domain === NO_DOMAIN_KEY ? -1 : a.domain.localeCompare(b.domain)));
  }, [displayUsers]);

  return (
    <section className={styles.kpiSection}>
      <h2 className={styles.sectionTitle}>Utilisateurs</h2>
      {users.length > 0 ? (
        <>
          {/* Filtres par domaine (tout en haut, impactent KPI + table) */}
          {domainCounts.length > 0 && (
            <>
              <h3 className={styles.subsectionTitle}>
                Filtres par domaine
              </h3>
              <div className={`${styles.statsCards} ${styles.statsCardsUsersKpi}`} style={{ marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`${styles.statCard} ${styles.statCardClickable} ${domainFilter === DOMAIN_FILTER_ALL ? styles.statCardActive : ''}`}
                  onClick={() => setDomainAndResetPage(DOMAIN_FILTER_ALL)}
                >
                  <div className={styles.statCardIcon}>
                    <Icon icon="mdi:earth" />
                  </div>
                  <div className={styles.statCardContent}>
                    <div className={styles.statCardLabel}>Tous les domaines</div>
                    <div className={styles.statCardValue}>{displayUsers.length.toLocaleString()}</div>
                  </div>
                </button>
                {domainCounts.map(({ domain, count }) => {
                  const label = domain === NO_DOMAIN_KEY ? 'Sans domaine' : domain;
                  return (
                    <SmartTooltip key={domain} as="div" className={styles.statCardTooltipWrapper} content={`Afficher uniquement les utilisateurs @${domain === NO_DOMAIN_KEY ? '…' : domain}`}>
                      <button
                        type="button"
                        className={`${styles.statCard} ${styles.statCardClickable} ${domainFilter === domain ? styles.statCardActive : ''}`}
                        onClick={() => setDomainAndResetPage(domain)}
                      >
                        <div className={styles.statCardIcon}>
                          <Icon icon="mdi:domain" />
                        </div>
                        <div className={styles.statCardContent}>
                          <div className={styles.statCardLabel}>{label}</div>
                          <div className={styles.statCardValue}>{count.toLocaleString()}</div>
                        </div>
                      </button>
                    </SmartTooltip>
                  );
                })}
              </div>
            </>
          )}

          {/* KPI : filtres cumulables (domaine + un ou plusieurs critères) */}
          {dashboardMetrics && (
            <>
              <h3 className={styles.subsectionTitle} style={{ marginTop: domainCounts.length > 0 ? '0.5rem' : '0' }}>
                Filtres globaux
              </h3>
              <div className={`${styles.statsCards} ${styles.statsCardsUsersKpi}`} style={{ marginBottom: '1rem' }}>
              <SmartTooltip as="div" className={styles.statCardTooltipWrapper} content="Réinitialiser les filtres critères (conserver le domaine)">
                <button
                  type="button"
                  className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.length === 0 ? styles.statCardActive : ''}`}
                  onClick={clearActiveFilters}
                >
                  <div className={styles.statCardIcon}>
                    <Icon icon="mdi:account-multiple" />
                  </div>
                  <div className={styles.statCardContent}>
                    <div className={styles.statCardLabel}>Total utilisateurs</div>
                    <div className={styles.statCardValue}>{filteredUsers.length.toLocaleString()}</div>
                  </div>
                </button>
              </SmartTooltip>
              <button
                type="button"
                className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_ADMIN) ? styles.statCardActive : ''}`}
                onClick={() => toggleFilter(USER_FILTER_ADMIN)}
              >
                <div className={styles.statCardIcon} style={{ color: '#3b82f6' }}>
                  <Icon icon="mdi:shield-account" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Admin</div>
                  <div className={styles.statCardValue} style={{ color: '#3b82f6' }}>{adminCount}</div>
                </div>
              </button>
              <button
                type="button"
                className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_NON_ADMIN) ? styles.statCardActive : ''}`}
                onClick={() => toggleFilter(USER_FILTER_NON_ADMIN)}
              >
                <div className={styles.statCardIcon}>
                  <Icon icon="mdi:account-outline" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Non admin</div>
                  <div className={styles.statCardValue}>{nonAdminCount}</div>
                </div>
              </button>
              <button
                type="button"
                className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_ACTIVE_30) ? styles.statCardActive : ''}`}
                onClick={() => toggleFilter(USER_FILTER_ACTIVE_30)}
              >
                <div className={styles.statCardIcon} style={{ color: '#10b981' }}>
                  <Icon icon="mdi:check-circle" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Utilisateur actif</div>
                  <div className={styles.statCardValue} style={{ color: '#10b981' }}>{activeUsers30Count.toLocaleString()}</div>
                </div>
              </button>
              <button
                type="button"
                className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_INACTIVE_90) ? styles.statCardActive : ''}`}
                onClick={() => toggleFilter(USER_FILTER_INACTIVE_90)}
              >
                <div className={styles.statCardIcon} style={{ color: '#f59e0b' }}>
                  <Icon icon="mdi:clock-outline" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Utilisateur inactif</div>
                  <div className={styles.statCardValue} style={{ color: '#f59e0b' }}>{inactiveUsers90}</div>
                </div>
              </button>
              <button
                type="button"
                className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_BLOCKED) ? styles.statCardActive : ''}`}
                onClick={() => toggleFilter(USER_FILTER_BLOCKED)}
              >
                <div className={styles.statCardIcon} style={{ color: '#ef4444' }}>
                  <Icon icon="mdi:account-cancel" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Utilisateur bloqué</div>
                  <div className={styles.statCardValue} style={{ color: '#ef4444' }}>{blockedUsers}</div>
                </div>
              </button>
              <button
                type="button"
                className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_MFA_ACTIF) ? styles.statCardActive : ''}`}
                onClick={() => toggleFilter(USER_FILTER_MFA_ACTIF)}
              >
                <div className={styles.statCardIcon} style={{ color: '#10b981' }}>
                  <Icon icon="mdi:shield-check" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>MFA actif</div>
                  <div className={styles.statCardValue} style={{ color: '#10b981' }}>{mfaActifCount}</div>
                </div>
              </button>
              <button
                type="button"
                className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_MFA_INACTIF) ? styles.statCardActive : ''}`}
                onClick={() => toggleFilter(USER_FILTER_MFA_INACTIF)}
              >
                <div className={styles.statCardIcon} style={{ color: '#ef4444' }}>
                  <Icon icon="mdi:shield-off" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>MFA inactif</div>
                  <div className={styles.statCardValue} style={{ color: '#ef4444' }}>{mfaInactifCount}</div>
                </div>
              </button>
              {MFA_METHOD_FILTERS_LINE2.map(({ key, label, tooltip }) => (
                <SmartTooltip key={key} as="div" className={styles.statCardTooltipWrapper} content={tooltip}>
                  <button
                    type="button"
                    className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_METHOD_PREFIX + key) ? styles.statCardActive : ''}`}
                    onClick={() => toggleFilter(USER_FILTER_METHOD_PREFIX + key)}
                  >
                    <div className={styles.statCardIcon}>
                      {getMfaMethodIcon(key)}
                    </div>
                    <div className={styles.statCardContent}>
                      <div className={styles.statCardLabel}>{label}</div>
                      <div className={styles.statCardValue}>{(methodCounts[key] ?? 0)}</div>
                    </div>
                  </button>
                </SmartTooltip>
              ))}
            </div>
            </>
          )}

          {/* Titre de la table des utilisateurs (même style que le titre "Utilisateurs") */}
          <h3 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>
            Table des utilisateurs
          </h3>

          {/* Option recherche + masquer comptes de service + Export */}
          <div className={styles.serviceAccountsRow}>
            <div className={styles.serviceAccountsLeft}>
              <div className={styles.serviceAccountsSearchContainer}>
                <div className={styles.serviceAccountsSearchBox}>
                  <FaSearch className={styles.serviceAccountsSearchIcon} />
                  <input
                    type="text"
                    className={styles.serviceAccountsSearchInput}
                    placeholder="Rechercher un utilisateur..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      className={styles.serviceAccountsSearchClearButton}
                      onClick={() => {
                        setUserSearchQuery('');
                        setCurrentPage(1);
                      }}
                      aria-label="Effacer la recherche"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.serviceAccountsOption}>
                <label className={styles.serviceAccountsLabel}>
                  <span className={styles.serviceAccountsSwitchWrap}>
                    <input
                      type="checkbox"
                      className={styles.serviceAccountsSwitchInput}
                      checked={hideServiceAccounts}
                      onChange={(e) => { setHideServiceAccounts(e.target.checked); setCurrentPage(1); }}
                      aria-label="Masquer les comptes de service"
                    />
                    <span className={styles.serviceAccountsSwitchTrack} aria-hidden="true" />
                    <span className={styles.serviceAccountsSwitchThumb} aria-hidden="true" />
                  </span>
                  Masquer les comptes de service
                </label>
                {hideServiceAccounts && serviceAccountsCount > 0 && (
                  <span className={styles.serviceAccountsCount}>
                    {serviceAccountsCount} compte{serviceAccountsCount > 1 ? 's' : ''} de service masqué{serviceAccountsCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <SmartTooltip as="span" content="Exporter la liste des utilisateurs en CSV">
              <button
                type="button"
                className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
                onClick={exportUsersToCSV}
                aria-label="Exporter en CSV"
              >
                <Icon icon="mdi:file-export" className={styles.headerActionIcon} />
              </button>
            </SmartTooltip>
          </div>
          <div
            className={styles.licensesTableContainer}
            style={{ overflowY: 'hidden', maxHeight: 'none' }}
          >
            <table className={styles.licensesTable}>
              <thead>
                <tr>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none', width: '150px', maxWidth: '150px' }}
                    onClick={() => handleSort('nom')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Nom</span>
                      {getSortIcon('nom')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('email')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Email</span>
                      {getSortIcon('email')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('dateCreation')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Date de création</span>
                      {getSortIcon('dateCreation')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('statut')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Statut</span>
                      {getSortIcon('statut')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('licence')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Licence</span>
                      {getSortIcon('licence')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('roleAdmin')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Rôle admin</span>
                      {getSortIcon('roleAdmin')}
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('admin')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Admin</span>
                      {getSortIcon('admin')}
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('mfaActif')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>MFA actif</span>
                      {getSortIcon('mfaActif')}
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('methodes')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Méthodes</span>
                      {getSortIcon('methodes')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, idx) => {
                  const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
                  const createdDate = user.createdDate ? new Date(user.createdDate) : null;
                  const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                  const isInactive = !lastLogin || lastLogin < period90Days;
                  const period30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  const isActive30 = lastLogin && lastLogin >= period30Days;

                  const statusLabel = user.accountEnabled === false
                    ? 'Bloqué'
                    : isActive30
                    ? 'Actif'
                    : isInactive
                    ? 'Inactif (>90j)'
                    : 'Inactif';
                  const statusBg = user.accountEnabled === false
                    ? '#fee2e2'
                    : isActive30
                    ? '#d1fae5'
                    : isInactive
                    ? '#fef3c7'
                    : '#e0e7ff';
                  const statusColor = user.accountEnabled === false
                    ? '#dc2626'
                    : isActive30
                    ? '#059669'
                    : isInactive
                    ? '#d97706'
                    : '#4338ca';

                  const licenseNames = user.licenses 
                    ? user.licenses.split(', ').map(lic => getLicenseDisplayName(lic.trim())).join(', ')
                    : 'Aucune';

                  const userUpn = user.userPrincipalName || user.email || '';
                  const mfaUser = mfaDetails.find(m => (m.userPrincipalName || m.user_principal_name || '') === userUpn);
                  const mfaMethodsRaw = mfaUser?.mfa_methods || mfaUser?.mfaMethods || [];
                  const mfaMethods = Array.isArray(mfaMethodsRaw) ? [...new Set(mfaMethodsRaw)] : [];
                  const hasMfa = mfaUser?.has_mfa ?? (mfaMethods.length > 0 && mfaMethods.some(m => getMfaMethodIcon(m) !== null));
                  const isAdmin = mfaUser?.is_admin === true;
                  const methodIcons = mfaMethods.length > 0
                    ? mfaMethods.filter(m => getMfaMethodIcon(m) !== null).map((method, i) => (
                        <SmartTooltip key={i} content={getMfaMethodLabel(method)} placement="top">
                          <span className={styles.mfaMethodIcon}>
                            {getMfaMethodIcon(method)}
                          </span>
                        </SmartTooltip>
                      ))
                    : null;

                  return (
                    <tr key={startIndex + idx}>
                      <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {user.name || user.displayName || user.userPrincipalName || 'N/A'}
                      </td>
                      <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                        {user.email || user.userPrincipalName || 'N/A'}
                      </td>
                      <td>
                        {createdDate ? createdDate.toLocaleDateString('fr-FR') : 'N/A'}
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          backgroundColor: statusBg,
                          color: statusColor,
                          fontWeight: 500
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {licenseNames}
                      </td>
                      <td>
                        {(() => {
                          const rawRole = mfaUser != null ? (mfaUser.admin_role ?? mfaUser.adminRole ?? '') : '';
                          const roleIcons = getAdminRoleIcons(rawRole);
                          if (roleIcons.length > 0) {
                            return (
                              <div className={styles.mfaMethodsList}>
                                {roleIcons.map(({ icon, label }, i) => (
                                  <SmartTooltip key={i} content={label} placement="top">
                                    <span className={styles.mfaMethodIcon} title={label}>
                                      <Icon icon={icon} />
                                    </span>
                                  </SmartTooltip>
                                ))}
                              </div>
                            );
                          }
                          if (mfaUser != null && isAdmin) {
                            return (
                              <SmartTooltip content="Administrateur" placement="top">
                                <span className={styles.mfaMethodIcon} title="Administrateur">
                                  <Icon icon="mdi:shield-account-outline" />
                                </span>
                              </SmartTooltip>
                            );
                          }
                          return <span style={{ color: 'var(--text-muted, #9ca3af)' }}>-</span>;
                        })()}
                      </td>
                      <td>
                        {mfaUser != null ? (
                          isAdmin ? (
                            (mfaUser.admin_role || mfaUser.adminRole) ? (
                              <SmartTooltip content={(mfaUser.admin_role || mfaUser.adminRole) || ''} placement="top">
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <FaCheck style={{ color: '#10b981', fontSize: '1rem' }} title="Administrateur" />
                                </span>
                              </SmartTooltip>
                            ) : (
                              <FaCheck style={{ color: '#10b981', fontSize: '1rem' }} title="Administrateur" />
                            )
                          ) : (
                            <FaTimes style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '1rem' }} title="Non admin" />
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted, #9ca3af)' }}>-</span>
                        )}
                      </td>
                      <td>
                        {mfaUser != null ? (
                          hasMfa ? <FaCheck style={{ color: '#10b981', fontSize: '1rem' }} title="MFA actif" /> : <FaTimes style={{ color: '#ef4444', fontSize: '1rem' }} title="MFA inactif" />
                        ) : (
                          <span style={{ color: 'var(--text-muted, #9ca3af)' }}>-</span>
                        )}
                      </td>
                      <td>
                        {methodIcons && methodIcons.length > 0 ? (
                          <div className={styles.mfaMethodsList}>
                            {methodIcons}
                          </div>
                        ) : mfaUser != null ? (
                          <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.8125rem' }}>-</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted, #9ca3af)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination · chevrons uniquement, style carré comme les autres tables */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.paginationButton}
                onClick={handlePreviousPage}
                disabled={safeCurrentPage === 1}
                aria-label="Précédent"
              >
                <FaChevronLeft />
              </button>
              <span className={styles.paginationInfo}>
                Page {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                className={styles.paginationButton}
                onClick={handleNextPage}
                disabled={safeCurrentPage === totalPages}
                aria-label="Suivant"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.noDataMessage}>
          <p>Aucun utilisateur disponible. Veuillez synchroniser les données.</p>
        </div>
      )}
    </section>
  );
}

