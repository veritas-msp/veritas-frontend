// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaCheck, FaTimes, FaSpinner, FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { getClientMfaDetails } from "../../api/clientOffice365";
import styles from "./MfaDetailsTable.module.css";
import SmartTooltip from "../SmartTooltip";

// ──────────────────────────────
// 🧩 Composant : MfaDetailsTable
// ──────────────────────────────
export default function MfaDetailsTable({ clientId, onUpdate, onSyncComplete, showCard = true, userFilter = 'all', methodFilter = null, onUserDataUpdate, hideServiceAccounts = false, onHideServiceAccountsChange, allowedUsers = [] }) {
  const [mfaDetails, setMfaDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Nombre d'éléments par page
  const [sortColumn, setSortColumn] = useState('displayName'); // Colonne de tri par défaut
  const [sortDirection, setSortDirection] = useState('asc'); // Direction du tri : 'asc' ou 'desc'
  const [searchQuery, setSearchQuery] = useState('');

  // Mapping rôles admin -> icône + libellé (aligné sur UtilisateursTab)
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

  const getAdminRoleIcons = (adminRoleString) => {
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
  };

  const refreshData = useCallback(async () => {
    await loadMfaDetails();
    if (onUpdate) {
      onUpdate();
    }
  }, [onUpdate]);

  useEffect(() => {
    if (clientId) {
      loadMfaDetails();
    }
  }, [clientId]);

  // Notifier le parent de la fonction de rafraîchissement
  useEffect(() => {
    if (onSyncComplete) {
      onSyncComplete(refreshData);
    }
  }, [onSyncComplete, refreshData]);

  // Notifier le parent des données utilisateurs pour calcul des statistiques
  useEffect(() => {
    if (onUserDataUpdate && mfaDetails) {
      onUserDataUpdate(mfaDetails);
    }
  }, [onUserDataUpdate, mfaDetails]);

  const loadMfaDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getClientMfaDetails(clientId);
      if (result.success) {
        setMfaDetails(result.userMfaDetails || []);
      }
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors du chargement des détails MFA:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMfaMethodLabel = (methodType) => {
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
  };

  const getMfaMethodIcon = (methodType) => {
    switch (methodType) {
      case 'microsoftauthenticatorauthenticationmethod':
        return <Icon icon="mdi:cellphone" />;
      case 'phoneauthenticationmethod':
        return <Icon icon="mdi:phone" />;
      case 'fido2authenticationmethod':
        return <Icon icon="mdi:usb" title="Clé de sécurité FIDO2" />;
      case 'softwareoathauthenticationmethod':
        return <Icon icon="mdi:shield-key" title="Application OATH" />;
      case 'temporaryaccesspassauthenticationmethod':
        return <Icon icon="mdi:clock-outline" title="Passe d'accès temporaire" />;
      case 'emailauthenticationmethod':
        return <Icon icon="mdi:email" title="Email" />;
      case 'passwordauthenticationmethod':
        // Cette méthode n'est pas considérée comme MFA
        return null;
      case 'windowshelloforbusinessauthenticationmethod':
        // Cette méthode n'est pas considérée comme MFA
        return null;
      default:
        return <Icon icon="mdi:help-circle" title={`Méthode inconnue: ${methodType}`} />;
    }
  };

  // Fonction pour déterminer si un utilisateur a de vraies méthodes MFA (excluant passwordauthenticationmethod)
  const hasRealMfaMethods = (user) => {
    return user.mfaMethods && user.mfaMethods.some(method => getMfaMethodIcon(method) !== null);
  };

  // Détection des comptes de service, alignée sur TenantDetail UtilisateursTab (adaptée aux champs disponibles)
  const isLikelyServiceAccountFromMfaUser = (user) => {
    const name = (user.displayName || '').toString();
    const upn = (user.userPrincipalName || '').toString();
    const combined = `${name} ${upn}`.toLowerCase();
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
  };

  // Fonction de tri des données (alignée UtilisateursTab : roleAdmin tri desc par défaut)
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'adminRole' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Fonction pour trier les utilisateurs
  const sortUsers = (users) => {
    return [...users].sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case 'displayName':
          aValue = (a.displayName || '').toLowerCase();
          bValue = (b.displayName || '').toLowerCase();
          break;
        case 'hasMfa':
          aValue = hasRealMfaMethods(a) ? 1 : 0;
          bValue = hasRealMfaMethods(b) ? 1 : 0;
          break;
        case 'admin':
          aValue = a.is_admin === true ? 1 : 0;
          bValue = b.is_admin === true ? 1 : 0;
          break;
        case 'latestRegistration':
          aValue = a.latestMfaRegistrationDate ? new Date(a.latestMfaRegistrationDate) : new Date(0);
          bValue = b.latestMfaRegistrationDate ? new Date(b.latestMfaRegistrationDate) : new Date(0);
          break;
        case 'accountEnabled':
          aValue = a.accountEnabled ? 1 : 0;
          bValue = b.accountEnabled ? 1 : 0;
          break;
        case 'adminRole': {
          const getRoleAdminStats = (u) => {
            const raw = u.admin_role ?? u.adminRole;
            let roles = [];
            if (Array.isArray(raw)) {
              roles = raw.map(r => String(r).trim()).filter(Boolean);
            } else if (raw != null && raw !== '') {
              const str = String(raw).trim();
              roles = str.split(',').map(r => r.trim()).filter(Boolean);
            }
            const label = roles.length ? roles.join(', ').toLowerCase() : '';
            return { count: roles.length, label };
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
            const methods = u.mfaMethods || u.mfa_methods || [];
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
      // Égalité : tri secondaire par nom pour ordre stable et déterministe
      const aName = (a.displayName || a.userPrincipalName || a.id || '').toString().toLowerCase();
      const bName = (b.displayName || b.userPrincipalName || b.id || '').toString().toLowerCase();
      if (aName < bName) return -1;
      if (aName > bName) return 1;
      return 0;
    });
  };

  // Icône de tri (même style que UtilisateursTab)
  const getSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) {
      return <FaSort style={{ fontSize: '0.75rem', opacity: 0.4, marginLeft: '0.25rem' }} />;
    }
    return sortDirection === 'asc'
      ? <FaSortUp style={{ fontSize: '0.75rem', marginLeft: '0.25rem', color: '#3b82f6' }} />
      : <FaSortDown style={{ fontSize: '0.75rem', marginLeft: '0.25rem', color: '#3b82f6' }} />;
  };

  const SortableHeader = ({ column, children }) => (
    <th
      className={styles.sortableHeader}
      onClick={() => handleSort(column)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {children}
        {getSortIcon(column)}
      </div>
    </th>
  );

  const baseUsers = useMemo(() => {
    if (!Array.isArray(mfaDetails)) return [];
    const allowedUpns = new Set(
      (Array.isArray(allowedUsers) ? allowedUsers : [])
        .map((u) => (u.userPrincipalName || u.email || '').toString().trim().toLowerCase())
        .filter(Boolean)
    );

    let scopedUsers = mfaDetails;
    if (allowedUpns.size > 0) {
      scopedUsers = mfaDetails.filter((u) => {
        const upn = (u.userPrincipalName || '').toString().trim().toLowerCase();
        return upn && allowedUpns.has(upn);
      });
    }

    if (!hideServiceAccounts) return scopedUsers;
    return scopedUsers.filter(u => !isLikelyServiceAccountFromMfaUser(u));
  }, [mfaDetails, allowedUsers, hideServiceAccounts]);

  const userHasMethod = (user, methodType) => {
    if (!methodType) return true;
    const methods = user.mfaMethods || user.mfa_methods || [];
    if (!Array.isArray(methods)) return false;
    return methods.includes(methodType);
  };

  const matchesSearch = (user) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (user.displayName || '').toLowerCase();
    const upn = (user.userPrincipalName || '').toLowerCase();
    return name.includes(q) || upn.includes(q);
  };

  // Filtrage des utilisateurs selon le filtre sélectionné (segment + méthode MFA + recherche)
  const filteredUsersUnsorted = baseUsers.filter((user) => {
    if (userFilter === 'admins' && user.is_admin !== true) return false;
    if (userFilter === 'users' && user.is_admin === true) return false;

    // Filtre par méthode MFA (SMS, Authenticator, Software OAuth, Email, etc.)
    if (methodFilter && !userHasMethod(user, methodFilter)) return false;

    // Filtre par recherche (nom / UPN)
    if (!matchesSearch(user)) return false;

    return true;
  });


  // Appliquer le tri aux utilisateurs filtrés
  const filteredUsers = sortUsers(filteredUsersUnsorted);

  // Calcul des données paginées sur les utilisateurs filtrés
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMfaDetails = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Remettre à la page 1 quand les données ou les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [mfaDetails, userFilter, methodFilter, hideServiceAccounts, searchQuery]);

  const handleExportCsv = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      return;
    }

    const header = ['Nom', 'UPN', 'Actif', 'Admin', 'MFA actif', 'Méthodes'];
    const rows = filteredUsers.map((user) => {
      const name = user.displayName || '';
      const upn = user.userPrincipalName || '';
      const actif = user.accountEnabled !== false ? 'Oui' : 'Non';
      const admin = user.is_admin === true ? 'Oui' : 'Non';
      const mfaActif = hasRealMfaMethods(user) ? 'Oui' : 'Non';
      const methods = Array.isArray(user.mfaMethods) ? user.mfaMethods.join('|') : '';
      return [name, upn, actif, admin, mfaActif, methods];
    });

    const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map(row => row.map(escape).join(';')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'utilisateurs_mfa.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const cardWrapper = showCard ? styles.detailsCard : styles.tableSectionWrap;

  if (loading) {
    return (
      <div className={cardWrapper}>
        <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.loadingIcon} />
          <p>Chargement des détails MFA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cardWrapper}>
        <div className={styles.errorState}>
          <Icon icon="mdi:alert-circle" className={styles.errorIcon} />
          <p>Erreur: {error}</p>
          <button onClick={refreshData} className={styles.retryButton}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const searchAndActionsRow = (
    <div className={styles.serviceAccountsRow}>
      <div className={styles.serviceAccountsLeft}>
        <div className={styles.serviceAccountsSearchContainer}>
          <div className={styles.serviceAccountsSearchBox}>
            <FaSearch className={styles.serviceAccountsSearchIcon} />
            <input
              type="text"
              className={styles.serviceAccountsSearchInput}
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.serviceAccountsSearchClearButton}
                onClick={() => {
                  setSearchQuery('');
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
                onChange={(e) => {
                  if (onHideServiceAccountsChange) {
                    onHideServiceAccountsChange(e.target.checked);
                  }
                  setCurrentPage(1);
                }}
                aria-label="Masquer les comptes de service"
              />
              <span className={styles.serviceAccountsSwitchTrack} aria-hidden="true" />
              <span className={styles.serviceAccountsSwitchThumb} aria-hidden="true" />
            </span>
            Masquer les comptes de service
          </label>
        </div>
      </div>
      <SmartTooltip as="span" content="Exporter la liste des utilisateurs en CSV">
        <button
          type="button"
          className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`}
          onClick={handleExportCsv}
          aria-label="Exporter en CSV"
        >
          <Icon icon="mdi:file-export" className={styles.headerActionIcon} />
        </button>
      </SmartTooltip>
    </div>
  );

  const headerContent = showCard ? (
    <div className={styles.cardHeader}>
      <div className={styles.cardTitle}>
        <Icon icon="mdi:account-multiple" className={styles.cardIcon} />
        <h3>Table des utilisateurs</h3>
      </div>
      {searchAndActionsRow}
    </div>
  ) : (
    <>
      <h3 className={styles.tableSectionTitle}>Table des utilisateurs</h3>
      <div className={styles.tableSectionSeparator} />
      {searchAndActionsRow}
    </>
  );

  const content = (
    <>
      {headerContent}

      <div className={styles.tableContainer}>
        <table className={styles.mfaTable}>
          <thead>
            <tr>
              <SortableHeader column="displayName">Nom</SortableHeader>
              <SortableHeader column="accountEnabled">Statut</SortableHeader>
              <th className={styles.sortableHeader} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('adminRole')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Rôle admin</span>
                  {getSortIcon('adminRole')}
                </div>
              </th>
              <SortableHeader column="admin">Admin</SortableHeader>
              <SortableHeader column="hasMfa">MFA actif</SortableHeader>
              <th className={styles.sortableHeader} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('methodes')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Méthodes</span>
                  {getSortIcon('methodes')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentMfaDetails.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.emptyRow}>
                  Lancez une première synchronisation pour voir les utilisateurs
                </td>
              </tr>
            ) : (
              currentMfaDetails.map((user) => (
                <tr key={user.id}>
                  <td className={styles.userCell}>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{user.displayName || user.userPrincipalName || '-'}</span>
                      <span className={styles.userEmail}>
                        {user.userPrincipalName || '-'}
                      </span>
                    </div>
                  </td>
                  <td className={styles.accountCell}>
                    {user.accountEnabled !== false ? (
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: '#d1fae5', color: '#059669', fontWeight: 500 }}>
                        Actif
                      </span>
                    ) : (
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 500 }}>
                        Désactivé
                      </span>
                    )}
                  </td>
                  <td>
                    {(() => {
                      const rawRole = user.admin_role || user.adminRole || '';
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
                      if (user.is_admin === true) {
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
                    {user.is_admin === true ? (
                      <FaCheck style={{ color: '#10b981', fontSize: '1rem' }} title="Administrateur" />
                    ) : (
                      <FaTimes style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '1rem' }} title="Non admin" />
                    )}
                  </td>
                  <td>
                    {hasRealMfaMethods(user) ? (
                      <FaCheck style={{ color: '#10b981', fontSize: '1rem' }} title="MFA actif" />
                    ) : (
                      <FaTimes style={{ color: '#ef4444', fontSize: '1rem' }} title="MFA inactif" />
                    )}
                  </td>
                  <td className={styles.methodsCell}>
                    {user.mfaMethods && user.mfaMethods.filter(method => getMfaMethodIcon(method) !== null).length > 0 ? (
                      <div className={styles.mfaMethodsList}>
                        {user.mfaMethods
                          .filter(method => getMfaMethodIcon(method) !== null)
                          .map((method, index) => (
                            <SmartTooltip key={index} content={getMfaMethodLabel(method)} placement="top">
                              <span className={styles.mfaMethodIcon} title={getMfaMethodLabel(method)}>
                                {getMfaMethodIcon(method)}
                              </span>
                            </SmartTooltip>
                          ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted, #9ca3af)' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination · même style que UtilisateursTab (chevrons, boutons carrés) */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.paginationButton}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Page précédente"
            aria-label="Précédent"
          >
            <Icon icon="mdi:chevron-left" />
          </button>
          <span className={styles.paginationInfo}>
            Page {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className={styles.paginationButton}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Page suivante"
            aria-label="Suivant"
          >
            <Icon icon="mdi:chevron-right" />
          </button>
        </div>
      )}


    </>
  );

  return showCard ? (
    <div className={styles.detailsCard}>
      {content}
    </div>
  ) : (
    <div className={styles.tableSectionWrap}>
      {content}
    </div>
  );
}
