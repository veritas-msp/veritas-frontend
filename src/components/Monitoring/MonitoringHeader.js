import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TbReportAnalytics } from "react-icons/tb";
import { FaSync, FaUpload, FaSave, FaFileExport, FaEthernet } from "react-icons/fa";
import { IoServerSharp } from "react-icons/io5";
import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { mdiWeb, mdiWallFire, mdiWifiMarker, mdiBug, mdiPhoneVoip } from "@mdi/js";
import SmartTooltip from "../SmartTooltip";
import styles from "./MonitoringHeader.module.css";

// Fonction pour raccourcir les noms de lieux (3 premières lettres)
const shortenSiteName = (siteName) => {
  if (!siteName) return siteName;
  // Prendre les 3 premières lettres en majuscules
  return siteName.substring(0, 3).toUpperCase();
};

export default function MonitoringHeader({
  clientName,
  title,
  stepLabel,
  progressPercent,
  reportStartDate = null,
  reportEndDate = null,
  modules = [],
  currentModule,
  currentSite,
  sites = [],
  onSelectSite,
  onSelectModule,
  onPrev,
  onNext,
  onReset,
  onQuit,
  hasPrev,
  hasNext,
  isLastItem,
  isFormValid,
  nextLabel = "Suivant",
  prevLabel = "Précédent",
  resetLabel = "Réinitialiser",
  nextDisabled = false,
  checkMKSyncInfo = null,
  summaryActions = null,
  csvImportInfo = null,
  children,
  isFullscreen = true
}) {
  const isBrowser = typeof window !== "undefined";
  const [office365SyncAvailable, setOffice365SyncAvailable] = useState(false);
  const [office365SyncLoading, setOffice365SyncLoading] = useState(false);
  const isOffice365Module = typeof currentModule === "string" && currentModule.toLowerCase().includes("office365");
  const formatReportDate = (value) => {
    if (!value) return null;
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  };

  const formattedStartDate = formatReportDate(reportStartDate);
  const formattedEndDate = formatReportDate(reportEndDate);

  useEffect(() => {
    if (!isBrowser) return;
    const updateAvailability = () => {
      setOffice365SyncAvailable(!!window.__office365SyncTrigger);
    };
    const updateState = (event) => {
      if (event?.detail && Object.prototype.hasOwnProperty.call(event.detail, "isSyncing")) {
        setOffice365SyncLoading(!!event.detail.isSyncing);
      } else {
        setOffice365SyncLoading(!!window.__office365SyncIsSyncing);
      }
    };
    updateAvailability();
    setOffice365SyncLoading(!!window.__office365SyncIsSyncing);
    window.addEventListener("office365-sync-available", updateAvailability);
    window.addEventListener("office365-sync-state", updateState);
    return () => {
      window.removeEventListener("office365-sync-available", updateAvailability);
      window.removeEventListener("office365-sync-state", updateState);
    };
  }, [isBrowser]);

  return (
    <>
      {/* Volets latéraux pour navigation (uniquement en plein écran) */}
      {isFullscreen && hasPrev && currentModule !== "summary" && (
        <div className={styles.leftPanel}>
          <SmartTooltip content={prevLabel} as="span" style={{ display: 'inline-flex' }}>
            <button 
              className={styles.panelButton} 
              onClick={onPrev}
              title={prevLabel}
            >
              <IconifyIcon
                icon="mynaui:chevron-left-solid"
                width={48}
                height={48}
                style={{ color: "#000000" }}
              />
            </button>
          </SmartTooltip>
        </div>
      )}
      {isFullscreen && hasNext && (
        <div className={styles.rightPanel}>
          <SmartTooltip content={nextDisabled ? "Veuillez remplir les champs requis" : (isLastItem ? 'Terminer' : nextLabel)} as="span" style={{ display: 'inline-flex' }}>
            <button
              className={`${styles.panelButton} ${styles.primary} ${nextDisabled ? styles.disabled : ''}`}
              onClick={isFormValid ? onNext : undefined}
              disabled={nextDisabled}
              title={nextDisabled ? "Veuillez remplir les champs requis" : (isLastItem ? 'Terminer' : nextLabel)}
            >
              {isLastItem ? (
                '✓'
              ) : (
                <IconifyIcon
                  icon="mynaui:chevron-right-solid"
                  width={48}
                  height={48}
                  style={{ color: "#000000" }}
                />
              )}
            </button>
          </SmartTooltip>
        </div>
      )}

      {/* Header sans background */}
      <header className={styles.headerSection}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeftGroup}>
            <div className={styles.headerInfo}>
              {clientName ? (
                <>
                  <p className={styles.clientName}>{clientName}</p>
                  {(formattedStartDate || formattedEndDate) && (
                    <p
                      className={styles.headerSubtitle}
                      style={{ fontSize: "0.8rem", opacity: 0.85 }}
                    >
                      {formattedStartDate || "-"}
                      {formattedEndDate ? ` au ${formattedEndDate}` : ""}
                    </p>
                  )}
                </>
              ) : null}
              <h1 className={styles.headerTitle}>{title}</h1>
            </div>
            
            {Array.isArray(modules) && modules.length > 0 && (
              <div className={styles.moduleNavContainer}>
                {(() => {
                  const filteredModules = modules.filter(m => !!m);
                  
                  // Fonction pour trier les modules infrastructure dans l'ordre spécifique
                  const getInfrastructureOrder = (moduleName) => {
                    const key = String(moduleName).toLowerCase();
                    if (key.includes('internet')) return 1;
                    if (key.includes('firewall') && !key.includes('regle')) return 2;
                    if (key.includes('serveur')) return 3;
                    if (key.includes('stockage')) return 4;
                    if (key.includes('switch')) return 5;
                    if (key.includes('wifi') || key.includes('borne')) return 6;
                    return 99; // Autres modules à la fin
                  };
                  
                  const infrastructureModules = filteredModules
                    .filter(m => getModuleCategory(m) === 'infrastructure')
                    .sort((a, b) => getInfrastructureOrder(a) - getInfrastructureOrder(b));
                  
                  // Fonction pour trier les modules cybersécurité dans l'ordre spécifique
                  const getCybersecuriteOrder = (moduleName) => {
                    const key = String(moduleName).toLowerCase();
                    if (key.includes('antivirus')) return 1;
                    if (key.includes('antispam')) return 2;
                    if (key.includes('firewall') || key.includes('firewallregle')) return 3;
                    if (key.includes('sauvegarde')) return 4;
                    return 99; // Autres modules à la fin
                  };
                  
                  const cybersecuriteModules = filteredModules
                    .filter(m => getModuleCategory(m) === 'cybersecurite')
                    .sort((a, b) => getCybersecuriteOrder(a) - getCybersecuriteOrder(b));
                  
                  const servicesModules = filteredModules.filter(m => getModuleCategory(m) === 'services');
                  const summaryModule = filteredModules.find(m => getModuleCategory(m) === 'summary');
                  
                  return (
                    <>
              <nav className={styles.moduleNav}>
                        {infrastructureModules.length > 0 && (
                          <div className={`${styles.moduleGroup} ${styles.infrastructureGroup}`}>
                            <div className={styles.groupHeader}>
                              <span className={`${styles.groupLabel} ${styles.infrastructureLabel}`}>INFRASTRUCTURE</span>
                              <div className={styles.groupLine} style={{ borderColor: '#3b82f6' }}></div>
                            </div>
                            <div className={styles.moduleButtonsRow}>
                              {infrastructureModules.map((m) => {
                                const icon = getModuleIcon(m);
                                const isActive = currentModule === m;
                                return (
                                  <SmartTooltip key={m} content={formatModuleLabel(m)} as="span" style={{ display: 'inline-flex' }}>
                                    <button
                                      className={`${styles.moduleBtn} ${isActive ? styles.active : ''} ${styles.infrastructure}`}
                                      title={formatModuleLabel(m)}
                                      onClick={() => onSelectModule && onSelectModule(m)}
                                    >
                                      {icon}
                                    </button>
                                  </SmartTooltip>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {cybersecuriteModules.length > 0 && (
                          <div className={`${styles.moduleGroup} ${styles.cybersecuriteGroup}`}>
                            <div className={styles.groupHeader}>
                              <span className={`${styles.groupLabel} ${styles.cybersecuriteLabel}`}>CYBERSECURITE</span>
                              <div className={styles.groupLine} style={{ borderColor: '#ef4444' }}></div>
                            </div>
                            <div className={styles.moduleButtonsRow}>
                              {cybersecuriteModules.map((m) => {
                                const icon = getModuleIcon(m);
                                const isActive = currentModule === m;
                                return (
                                  <SmartTooltip key={m} content={formatModuleLabel(m)} as="span" style={{ display: 'inline-flex' }}>
                                    <button
                                      className={`${styles.moduleBtn} ${isActive ? styles.active : ''} ${styles.cybersecurite}`}
                                      title={formatModuleLabel(m)}
                                      onClick={() => onSelectModule && onSelectModule(m)}
                                    >
                                      {icon}
                                    </button>
                                  </SmartTooltip>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {servicesModules.length > 0 && (
                          <div className={`${styles.moduleGroup} ${styles.servicesGroup}`}>
                            <div className={styles.groupHeader}>
                              <span className={`${styles.groupLabel} ${styles.servicesLabel}`}>SERVICES</span>
                              <div className={styles.groupLine} style={{ borderColor: '#8b5cf6' }}></div>
                            </div>
                            <div className={styles.moduleButtonsRow}>
                              {servicesModules.map((m) => {
                  const icon = getModuleIcon(m);
                  const isActive = currentModule === m;
                  return (
                    <SmartTooltip key={m} content={formatModuleLabel(m)} as="span" style={{ display: 'inline-flex' }}>
                      <button
                        className={`${styles.moduleBtn} ${isActive ? styles.active : ''} ${styles.services}`}
                        title={formatModuleLabel(m)}
                        onClick={() => onSelectModule && onSelectModule(m)}
                      >
                        {icon}
                      </button>
                    </SmartTooltip>
                  );
                })}
                            </div>
                          </div>
                        )}
                        {summaryModule && (
                          <div className={`${styles.moduleGroup} ${styles.summaryGroup}`}>
                            <div className={styles.groupHeader}>
                              <span className={`${styles.groupLabel} ${styles.summaryLabel}`}>RÉSUMÉ</span>
                              <div className={styles.groupLine} style={{ borderColor: 'transparent' }}></div>
                            </div>
                            <div className={styles.moduleButtonsRow}>
                              <SmartTooltip content={formatModuleLabel(summaryModule)} as="span" style={{ display: 'inline-flex' }}>
                                <button
                                  className={`${styles.moduleBtn} ${currentModule === summaryModule ? styles.active : ''} ${styles.summary}`}
                                  title={formatModuleLabel(summaryModule)}
                                  onClick={() => onSelectModule && onSelectModule(summaryModule)}
                                >
                                  {getModuleIcon(summaryModule)}
                                </button>
                              </SmartTooltip>
                            </div>
                          </div>
                        )}
              </nav>
                    </>
                  );
                })()}
                
                {/* Navigation par pills de sites - Grille 2x2 à droite de Summary */}
                {Array.isArray(sites) && sites.length > 0 && (
                  <div className={`${styles.moduleGroup} ${styles.sitesGroup}`}>
                    <div className={styles.groupHeader}>
                      <span className={`${styles.groupLabel} ${styles.sitesLabel}`}>LIEUX</span>
                      <div className={styles.groupLine} style={{ borderColor: '#6b7280' }}></div>
                    </div>
                    <div className={styles.moduleButtonsRow}>
                      {sites.map((site) => {
                        const isActive = currentSite === site;
                        return (
                            <SmartTooltip key={site} content={`Aller au site ${site}`} as="span" style={{ display: 'inline-flex' }}>
                              <button
                                className={`${styles.sitePill} ${isActive ? styles.active : ''}`}
                                title={`Aller au site ${site}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onSelectSite) {
                                    onSelectSite(site);
                                  }
                                }}
                              >
                                <span style={{ color: '#000000' }}>{shortenSiteName(site)}</span>
                              </button>
                            </SmartTooltip>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
          
          <div className={styles.headerRightGroup}>
            {/* Barre d'action avec boutons */}
            <div className={styles.actionBar}>
              {isOffice365Module && office365SyncAvailable && (
                <SmartTooltip content="Synchroniser les données Microsoft 365" as="div" style={{ display: 'inline-block' }}>
                  <button
                    onClick={() => {
                      if (isBrowser && typeof window.__office365SyncTrigger === "function") {
                        window.__office365SyncTrigger();
                      }
                    }}
                    disabled={office365SyncLoading}
                    className={styles.syncAllButton}
                    title="Synchroniser Microsoft 365"
                  >
                    <FaSync
                      style={{
                        animation: office365SyncLoading ? "spin 1s linear infinite" : "none"
                      }}
                    />
                  </button>
                </SmartTooltip>
              )}
              {/* Bouton de synchronisation - CheckMK pour la plupart des modules, BitDefender pour Antivirus (géré individuellement), OVH pour NDD */}
            {checkMKSyncInfo && checkMKSyncInfo.hasCheckMKMappings && (
              <SmartTooltip
                content={String(currentModule).toLowerCase() === 'ndd'
                  ? "Synchroniser toutes les dates d'expiration avec OVH"
                  : "Synchroniser tous les équipements mappés avec Check MK"}
                as="div"
                style={{ display: 'inline-block' }}
              >
                <button
                  onClick={checkMKSyncInfo.syncAllCheckMK}
                  disabled={checkMKSyncInfo.isLoading}
                  className={styles.syncAllButton}
                  title={String(currentModule).toLowerCase() === 'ndd'
                    ? "Synchroniser toutes les dates d'expiration avec OVH"
                    : "Synchroniser tous les équipements mappés avec Check MK"}
                >
                  <FaSync style={{
                    animation: checkMKSyncInfo.isLoading
                      ? 'spin 1s linear infinite'
                      : 'none'
                  }} />
                </button>
              </SmartTooltip>
            )}
              
              {csvImportInfo && csvImportInfo.triggerCSVImport && (
                <SmartTooltip content="Importer un fichier CSV" as="div" style={{ display: 'inline-block' }}>
                  <button
                    onClick={csvImportInfo.triggerCSVImport}
                    className={styles.syncAllButton}
                    title="Importer un fichier CSV"
                  >
                    <FaUpload />
                  </button>
                </SmartTooltip>
              )}
              {currentModule === 'summary' && summaryActions && (
                <div className={styles.summaryActions}>
                  <SmartTooltip content="Sauvegarder le rapport" as="div" style={{ display: 'inline-block' }}>
                    <button
                      onClick={summaryActions.openSaveModal}
                      className={styles.syncAllButton}
                      title="Sauvegarder"
                    >
                      <IconifyIcon
                        icon="material-symbols:save"
                        width={18}
                        height={18}
                      />
                    </button>
                  </SmartTooltip>
                  <SmartTooltip content="Exporter le rapport en HTML (ZIP)" as="div" style={{ display: 'inline-block' }}>
                    <button
                      onClick={summaryActions.exportHTML}
                      className={styles.syncAllButton}
                      title="Exporter HTML"
                    >
                      <IconifyIcon
                        icon="codicon:file-zip"
                        width={18}
                        height={18}
                      />
                    </button>
                  </SmartTooltip>
                </div>
              )}
              {/* Bouton Quitter supprimé : la fermeture se fait désormais via la barre d'onglets */}
          </div>
          </div>
          {/* Boutons de navigation mobile */}
          <div className={styles.mobileNavButtons}>
            {hasPrev && (
              <SmartTooltip content={prevLabel} as="span" style={{ display: 'inline-flex' }}>
                <button 
                  className={styles.mobileNavButton} 
                  onClick={onPrev}
                  title={prevLabel}
                >
                  ‹ Précédent
                </button>
              </SmartTooltip>
            )}
            {hasNext && (
              <SmartTooltip content={nextDisabled ? "Veuillez remplir les champs requis" : (isLastItem ? 'Terminer' : nextLabel)} as="span" style={{ display: 'inline-flex' }}>
                <button
                  className={`${styles.mobileNavButton} ${styles.primary} ${nextDisabled ? styles.disabled : ''}`}
                  onClick={isFormValid ? onNext : undefined}
                  disabled={nextDisabled}
                  title={nextDisabled ? "Veuillez remplir les champs requis" : (isLastItem ? 'Terminer' : nextLabel)}
                >
                  {isLastItem ? '✓ Terminer' : '› Suivant'}
                </button>
              </SmartTooltip>
            )}
          </div>
        </div>
        {/* Liseret de progression en bas du header */}
        <div className={styles.headerProgressBar}>
          {/* Barre de progression principale (étapes) */}
          <div
            className={styles.headerProgressBarFill}
            style={{ width: `${Math.min(Math.max(progressPercent || 0, 0), 100)}%` }}
          />

          {/* Barre de progression de la synchronisation globale (juste en dessous, en couleur) */}
          {checkMKSyncInfo && checkMKSyncInfo.isLoading && (
            <div className={styles.syncProgressBar}>
              <div className={styles.syncProgressBarFill} />
            </div>
          )}
        </div>
        {children}
      </header>
    </>
  );
} 

// Helpers locaux pour afficher des icônes par module
// ✅ Simplifié : la TAILLE de l'icône est gérée UNIQUEMENT via le CSS `.moduleBtnIcon svg`
function getModuleIcon(moduleName) {
  const key = String(moduleName || "").toLowerCase();
  const iconColor = "#000000"; // icônes en noir

  switch (key) {
    // INFRASTRUCTURE
    case "internet":
      return (
        <span className={styles.moduleBtnIcon}>
          <Icon path={mdiWeb} color={iconColor} />
        </span>
      );
    case "firewalls":
    case "firewall":
      return (
        <span className={styles.moduleBtnIcon}>
          <Icon path={mdiWallFire} color={iconColor} />
        </span>
      );
    case "wifi":
      return (
        <span className={styles.moduleBtnIcon}>
          <Icon path={mdiWifiMarker} color={iconColor} />
        </span>
      );
    case "serveurs":
      // Mingcute server-fill
      return (
        <span className={styles.moduleBtnIcon}>
          <IconifyIcon
            icon="mingcute:server-fill"
            color={iconColor}
          />
        </span>
      );
    case "stockage":
      // IonIcons server-sharp
      return (
        <span className={styles.moduleBtnIcon}>
          <IoServerSharp color={iconColor} />
        </span>
      );
    case "switch":
      // FontAwesomeSolid ethernet
      return (
        <span className={styles.moduleBtnIcon}>
          <FaEthernet color={iconColor} />
        </span>
      );

    // CYBERSÉCURITÉ
    case "antivirus":
      // MDI bug
      return (
        <span className={styles.moduleBtnIcon}>
          <Icon path={mdiBug} color={iconColor} />
        </span>
      );
    case "antispam":
      // Material Symbols mail-shield-outline
      return (
        <span className={styles.moduleBtnIcon}>
          <IconifyIcon
            icon="material-symbols:mail-shield-outline"
            color={iconColor}
          />
        </span>
      );
    case "firewallregles":
      // Iconoir pc-firewall
      return (
        <span className={styles.moduleBtnIcon}>
          <IconifyIcon
            icon="iconoir:pc-firewall"
            color={iconColor}
          />
        </span>
      );
    case "sauvegarde":
      // Material Symbols backup (fallback car Streamline n'est pas dispo via Iconify CDN)
      return (
        <span className={styles.moduleBtnIcon}>
          <IconifyIcon
            icon="material-symbols:backup"
            color={iconColor}
          />
        </span>
      );

    // SERVICES
    case "office365":
      // Hugeicons office-365
      return (
        <span className={styles.moduleBtnIcon}>
          <IconifyIcon
            icon="hugeicons:office-365"
            color={iconColor}
          />
        </span>
      );
    case "ndd":
      // Stash domain
      return (
        <span className={styles.moduleBtnIcon}>
          <IconifyIcon
            icon="stash:domain"
            color={iconColor}
          />
        </span>
      );
    case "summary":
    case "résumé":
      // Icône Summary : MDI invoice-text via Iconify
      return (
        <span className={styles.moduleBtnIcon}>
          <IconifyIcon
            icon="mdi:invoice-text"
            color={iconColor}
          />
        </span>
      );
    default:
      return (
        <span className={styles.moduleBtnIcon}>
          <TbReportAnalytics />
        </span>
      );
  }
}

function formatModuleLabel(m) {
  if (!m) return '';
  const map = {
    internet: 'Internet',
    serveurs: 'Serveurs',
    stockage: 'Stockage',
    firewalls: 'Firewalls',
    firewall: 'Firewalls',
    switch: 'Switch',
    wifi: 'Wi‑Fi',
    sauvegarde: 'Sauvegarde',
    antivirus: 'Antivirus',
    antispam: 'Antispam',
    office365: 'Office 365',
    ndd: 'Noms de domaine',
    firewallregles: 'Règles de filtrage',
    summary: 'Résumé',
  };
  return map[String(m).toLowerCase()] || m;
}

function getModuleCategory(moduleName) {
  if (!moduleName) return 'infrastructure';
  const key = String(moduleName).toLowerCase();
  
  // Modules Infrastructure
  const infrastructureModules = ['internet', 'serveurs', 'stockage', 'firewalls', 'firewall', 'switch', 'wifi'];
  
  // Modules Cybersécurité
  const cybersecuriteModules = ['sauvegarde', 'antivirus', 'antispam', 'coffre fort numérique', 'coffrefort', 'firewall regle de filtrage', 'firewallregle', 'firewallregles'];
  
  // Modules Services (nom de domaine, Office 365)
  const servicesModules = ['ndd', 'office365', 'office 365'];
  
  // Module Summary (résumé) - séparé
  if (key === 'summary' || key === 'résumé') {
    return 'summary';
  }
  
  if (infrastructureModules.includes(key)) {
    return 'infrastructure';
  } else if (cybersecuriteModules.includes(key)) {
    return 'cybersecurite';
  } else if (servicesModules.includes(key)) {
    return 'services';
  }
  
  // Par défaut, considérer comme infrastructure
  return 'infrastructure';
}
