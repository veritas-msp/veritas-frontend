import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FaNetworkWired } from "react-icons/fa";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import ImportEquipmentsModal from "../../AdminPage/MonitoringClientSkeleton/ClientSteps/ImportEquipmentsModal";
import API_BASE_URL from "../../../config";
import { GripVertical } from "lucide-react";
import { SWITCH_CATALOG } from "../constants/equipmentCatalog";
import BrandModelFields from "../constants/BrandModelFields";

const StepSwitch = ({ form, setForm, onAdd, currentStepData, onImport, onRemoveAll }) => {
  const switches = form.equipements?.Switch || [];
  const bottomRef = useRef(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Exposer setShowImportModal via onImport
  React.useEffect(() => {
    if (onImport && currentStepData?.key) {
      onImport[currentStepData.key] = setShowImportModal;
    }
  }, [onImport, currentStepData]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverSite, setDragOverSite] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const toggleItemExpansion = (index) => {
    const next = new Set(expandedItems);
    if (next.has(index)) next.delete(index); else next.add(index);
    setExpandedItems(next);
  };

  // Fonction de validation d'unicité des noms
  const isNameUnique = (name, currentIndex) => {
    if (!name || !name.trim()) return true; // Nom vide est autorisé (sera invalidé par required)
    return !switches.some((sw, idx) => idx !== currentIndex && sw.nom?.trim() === name.trim());
  };

  const update = async (index, field, value) => {
    const updated = [...switches];
    const oldValue = updated[index][field];
    updated[index][field] = value;

    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Switch: updated },
    }));

    // Ancienne logique de suppression automatique des mappings CheckMK supprimée :
    // le mapping est désormais piloté directement par les colonnes checkmk_* de l'équipement.
  };

  const updateSwitchBrand = (index, brand) => {
    const updated = [...switches];
    updated[index] = { ...updated[index], fabricant: brand, modele: "" };
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Switch: updated },
    }));
  };

  const remove = (index) => {
    const updated = [...switches];
    updated.splice(index, 1);
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Switch: updated },
    }));
  };

  const removeAll = () => {
    if (!switches.length) return;
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Switch: [] },
    }));
  };
  
  // Exposer removeAll via onRemoveAll
  React.useEffect(() => {
    if (onRemoveAll && currentStepData?.key) {
      onRemoveAll[currentStepData.key] = removeAll;
    }
  }, [onRemoveAll, currentStepData, removeAll]);

  const add = () => {
    const newItem = {
      id: `switch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID unique
      nom: "",
      fabricant: "",
      modele: "",
      ip: "",
      vlan: "",
      manageable: false,
      poeSupport: false,
      empilage: false,
      firmware: "",
      numeroSerie: "",
      adresseMac: "",
      expirationGarantie: "",
      emplacement: "",
      site: "",
    };
    setForm((prev) => {
      const prevEquipements = prev.equipements || {};
      const prevSwitches = prevEquipements.Switch || [];
      return {
        ...prev,
        equipements: { ...prevEquipements, Switch: [...prevSwitches, newItem] },
      };
    });
  };
  
  // Exposer la fonction add via onAdd si fournie
  React.useEffect(() => {
    if (onAdd && currentStepData?.key) {
      onAdd[currentStepData.key] = add;
    }
  }, [onAdd, currentStepData, add]);

  // Drag & Drop handlers (reprise du pattern StepFirewalls)
  const handleDragStart = (e, index) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "0.5";
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSite(null);
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleSiteDragOver = (e, siteName) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;
    const draggedItem = switches[draggedIndex];
    const currentSite = draggedItem.site || "Sans site";
    const targetSiteNormalized = siteName === "Sans site" ? "Sans site" : siteName;
    if (currentSite === targetSiteNormalized) {
      e.dataTransfer.dropEffect = "none";
      setDragOverSite(null);
      return;
    }
    e.dataTransfer.dropEffect = "move";
    setDragOverSite(siteName);
    setDragOverIndex(null);
  };

  const handleSiteDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverSite(null);
    }
  };

  const handleSiteDrop = (e, targetSite) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;
    const updated = [...switches];
    const draggedItem = updated[draggedIndex];
    const newSite = targetSite === "Sans site" ? "" : targetSite;
    const currentSite = draggedItem.site || "Sans site";
    const targetSiteNormalized = targetSite === "Sans site" ? "Sans site" : targetSite;
    if (currentSite === targetSiteNormalized) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragOverSite(null);
      setIsDragging(false);
      return;
    }
    draggedItem.site = newSite;
    const newExpanded = new Set(expandedItems);
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Switch: updated },
    }));
    setExpandedItems(newExpanded);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverSite !== null) {
      return;
    }
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragOverSite(null);
      setIsDragging(false);
      return;
    }
    const updated = [...switches];
    const draggedItem = updated[draggedIndex];
    const dropItem = updated[dropIndex];
    const draggedSite = draggedItem.site || "Sans site";
    const dropSite = dropItem.site || "Sans site";
    if (draggedSite !== dropSite) {
      draggedItem.site = dropSite === "Sans site" ? "" : dropSite;
    }
    updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);
    const newExpanded = new Set();
    expandedItems.forEach((oldIndex) => {
      if (oldIndex === draggedIndex) newExpanded.add(dropIndex);
      else if (oldIndex < draggedIndex && oldIndex >= dropIndex) newExpanded.add(oldIndex + 1);
      else if (oldIndex > draggedIndex && oldIndex <= dropIndex) newExpanded.add(oldIndex - 1);
      else newExpanded.add(oldIndex);
    });
    setExpandedItems(newExpanded);

    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Switch: updated },
    }));
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };

  const handleDragEnd = (e) => {
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  };

  // Sites
  const clientSites = form.sites || [];
  const switchSites = switches
    .map(sw => sw.site)
    .filter(site => site && site.trim() !== "")
    .filter((site, index, self) => self.indexOf(site) === index);
  const allAvailableSites = [...new Set([...clientSites, ...switchSites])].sort((a, b) => a.localeCompare(b));
  const groupedBySite = switches.reduce((acc, sw, index) => {
    const site = sw.site || "Sans site";
    if (!acc[site]) acc[site] = [];
    acc[site].push({ ...sw, originalIndex: index });
    return acc;
  }, {});
  const allSitesWithGroups = {};
  allAvailableSites.forEach(site => {
    allSitesWithGroups[site] = groupedBySite[site] || [];
  });
  if (groupedBySite["Sans site"]) {
    allSitesWithGroups["Sans site"] = groupedBySite["Sans site"];
  }
  const sortedSites = Object.keys(allSitesWithGroups).sort((a, b) => {
    if (a === "Sans site") return -1;
    if (b === "Sans site") return 1;
    return a.localeCompare(b);
  });

  const visibleSites = sortedSites.filter(
    (site) => !(site === "Sans site" && (allSitesWithGroups[site] || []).length === 0)
  );

  return (
    <motion.div
      className={styles.stepContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "circOut" }}
    >
      <div className={styles.formSection}>

        <div className={styles.scrollable}>
          {visibleSites.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>Aucun switch configuré</p>
              <p className={styles.emptyStateDescription}>
                Cliquez sur "Ajouter un switch" pour commencer
              </p>
            </div>
          ) : (
            visibleSites.map((siteName) => {
              const siteSwitches = allSitesWithGroups[siteName] || [];
              if (siteName === "Sans site" && siteSwitches.length === 0) {
                return null;
              }
              return (
                <div key={siteName} className={styles.siteGroup}>
                  <div 
                    className={`${styles.siteHeader} ${dragOverSite === siteName ? styles.siteDragOver : ''}`}
                    onDragOver={(e) => handleSiteDragOver(e, siteName)}
                    onDragLeave={handleSiteDragLeave}
                    onDrop={(e) => handleSiteDrop(e, siteName)}
                  >
                    <h3 className={styles.siteTitle}>{siteName}</h3>
                    <span className={styles.siteCount}>{siteSwitches.length} switch{siteSwitches.length > 1 ? 's' : ''}</span>
                  </div>
                  <div 
                    className={styles.siteConnections}
                    onDragOver={(e) => {
                      if (e.target.closest(`.${styles.serverCard}`)) {
                        return;
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggedIndex !== null) {
                        const draggedItem = switches[draggedIndex];
                        const currentSite = draggedItem.site || "Sans site";
                        const targetSiteNormalized = siteName === "Sans site" ? "Sans site" : siteName;
                        if (currentSite === targetSiteNormalized) {
                          e.dataTransfer.dropEffect = "none";
                          setDragOverSite(null);
                          return;
                        }
                      }
                      e.dataTransfer.dropEffect = "move";
                      setDragOverSite(siteName);
                      setDragOverIndex(null);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverSite(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (e.target.closest(`.${styles.serverCard}`)) {
                        return;
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggedIndex !== null) {
                        handleSiteDrop(e, siteName);
                      }
                    }}
                  >
                    {siteSwitches.length === 0 && (
                      <div className={styles.emptySiteMessage}>
                        Aucun switch dans ce site. Glissez-déposez un switch ici pour l'assigner à ce site.
                      </div>
                    )}
                    {siteSwitches.map((sw, siteIndex) => {
                      const i = sw.originalIndex;
                      return (
              <motion.div
                key={i}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(e, i);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverSite(null);
                            e.dataTransfer.dropEffect = "move";
                            setDragOverIndex(i);
                          }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => {
                            e.stopPropagation();
                            handleDrop(e, i);
                          }}
                          onDragEnd={(e) => {
                            e.stopPropagation();
                            handleDragEnd(e);
                          }}
                          className={`${styles.serverCard} ${draggedIndex === i ? styles.dragging : ''} ${dragOverIndex === i ? styles.dragOver : ''}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                          style={{ 
                            cursor: 'grab',
                            background: '#ffffff',
                            border: `2px solid ${dragOverIndex === i ? '#15d1a0' : '#e5e7eb'}`,
                            borderRadius: '10px',
                            padding: '0.75rem 1rem',
                            marginBottom: '0.5rem',
                            transition: 'all 0.2s ease',
                            boxShadow: draggedIndex === i ? '0 8px 20px rgba(0,0,0,0.04)' : 'none'
                          }}
                        >
                          <div
                            className={`${styles.serverHeader} ${expandedItems.has(i) ? styles.serverHeaderExpanded : ''}`}
                            onClick={(e) => { if (!isDragging) toggleItemExpansion(i); }}
                            style={{ 
                              cursor: 'pointer',
                              background: expandedItems.has(i) ? '#f9fafb' : 'transparent',
                              padding: expandedItems.has(i) ? '0.75rem 1rem' : 0,
                              margin: expandedItems.has(i) ? '-0.75rem -1rem' : 0,
                              borderRadius: '8px',
                              transition: 'background 0.2s ease'
                            }}
                          >
                <div
                              className={styles.dragHandle}
                              title="Glisser pour réorganiser"
                              onClick={(e) => { e.stopPropagation(); }}
                              onMouseDown={(e) => { e.stopPropagation(); }}
                              style={{ opacity: 0.3, transition: 'opacity 0.2s ease', cursor: 'grab' }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.3'; e.currentTarget.style.color = 'inherit'; }}
                            >
                              <GripVertical size={18} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <FaNetworkWired size={18} color="#1a1a1a" style={{ position: 'relative', top: '-1px' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontWeight: '600',
                                  color: '#1a1a1a',
                                  fontSize: '0.95rem',
                                  marginBottom: '0.25rem'
                                }}>
                                  {sw.nom || `Switch #${i + 1}`}
                                </div>
                                <div style={{
                                  fontSize: '0.8rem',
                                  color: '#6b7280',
                                  display: 'flex',
                                  gap: '0.5rem',
                                  flexWrap: 'wrap'
                                }}>
                                  {[
                                    sw.modele || "Modèle ?",
                                    sw.ip,
                                    sw.poeSupport && 'PoE',
                                    sw.manageable && 'Manageable'
                                  ].filter(Boolean).map((item, idx) => (
                                    <span key={idx}>{item}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                  <div className={styles.serverActions}>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(i); }}
                      title="Supprimer ce switch"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                      <Icon icon="mdi:delete" width={14} height={14} />
                    </button>
                  </div>
                </div>

                          {expandedItems.has(i) && (
                            <motion.div 
                              className={styles.serverForm}
                              style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {/* Ligne 1 : NetBIOS / IP / VLAN */}
                              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                <div className={styles.formField}>
                                  <label htmlFor={`sw-nom-${i}`}>NetBIOS <span style={{color: 'red'}}>*</span></label>
                                  <input
                                    id={`sw-nom-${i}`}
                                    value={sw.nom}
                                    onChange={(e) => update(i, "nom", e.target.value)}
                                    required
                                    style={{
                                      borderColor: !isNameUnique(sw.nom, i) ? '#ef4444' : undefined,
                                      borderWidth: !isNameUnique(sw.nom, i) ? '2px' : '1px',
                                      fontSize: !isNameUnique(sw.nom, i) ? '1rem' : '0.9rem',
                                      fontWeight: !isNameUnique(sw.nom, i) ? 'bold' : 'normal'
                                    }}
                                  />
                                  {!isNameUnique(sw.nom, i) && (
                                    <div style={{
                                      color: '#ef4444',
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold',
                                      marginTop: '0.25rem'
                                    }}>
                                      ⚠️ Ce nom existe déjà !
                                    </div>
                                  )}
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`sw-ip-${i}`}>Adresse IP</label>
                                  <input
                                    id={`sw-ip-${i}`}
                                    value={sw.ip}
                                    onChange={(e) => update(i, "ip", e.target.value)}
                                  />
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`sw-vlan-${i}`}>VLAN</label>
                                  <input
                                    id={`sw-vlan-${i}`}
                                    value={sw.vlan || ""}
                                    onChange={(e) => update(i, "vlan", e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Ligne 2 : Marque / Modèle / N° Série */}
                              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                <BrandModelFields
                                  catalog={SWITCH_CATALOG}
                                  manufacturer={sw.fabricant}
                                  model={sw.modele}
                                  manufacturerId={`sw-fabricant-${i}`}
                                  modelId={`sw-modele-${i}`}
                                  fieldClassName={styles.formField}
                                  onManufacturerChange={(value) => updateSwitchBrand(i, value)}
                                  onModelChange={(value) => update(i, "modele", value)}
                                />
                                <div className={styles.formField}>
                                  <label htmlFor={`sw-serie-${i}`}>N° Série</label>
                                  <input
                                    id={`sw-serie-${i}`}
                                    value={sw.numeroSerie || ""}
                                    onChange={(e) => update(i, "numeroSerie", e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Ligne 3 : MAC / Firmware */}
                              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div className={styles.formField}>
                                  <label htmlFor={`sw-mac-${i}`}>Adresse MAC</label>
                                  <input
                                    id={`sw-mac-${i}`}
                                    value={sw.adresseMac || ""}
                                    onChange={(e) => update(i, "adresseMac", e.target.value)}
                                  />
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`sw-firmware-${i}`}>Version Firmware</label>
                                  <input
                                    id={`sw-firmware-${i}`}
                                    value={sw.firmware}
                                    onChange={(e) => update(i, "firmware", e.target.value)}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <ImportEquipmentsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        equipmentType="switch"
        onImport={(importedDevices) => {
          // Ajouter les équipements importés à la liste existante
          setForm((prev) => ({
            ...prev,
            equipements: {
              ...prev.equipements,
              Switch: [...switches, ...importedDevices]
            }
          }));
        }}
      />

    </motion.div>
  );
};

export default StepSwitch;


