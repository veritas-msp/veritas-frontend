import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FaLink, FaWifi } from "react-icons/fa";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import ImportEquipmentsModal from "./ImportEquipmentsModal";
import CheckMKMappingModal from "./CheckMKMappingModal";
import API_BASE_URL from "../../../../config";
import { GripVertical } from "lucide-react";

const StepBorneWifi = ({ form, setForm, onAdd, currentStepData, onImport, onRemoveAll }) => {
  const bornes = form.equipements?.BorneWifi || [];
  // Normaliser les SSID : s'assurer qu'ils ont tous un id
  const ssids = (form.ssids || []).map((ssid, index) => {
    if (typeof ssid === 'string') {
      return { id: `legacy-${index}-${ssid}`, nom: ssid };
    }
    if (!ssid.id) {
      return { ...ssid, id: `ssid-${Date.now()}-${index}` };
    }
    return ssid;
  });
  const bottomRef = useRef(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSSIDSection, setShowSSIDSection] = useState(false);
  
  // Mettre à jour form.ssids avec les SSID normalisés
  React.useEffect(() => {
    if (form.ssids && form.ssids.length > 0) {
      const normalized = form.ssids.map((ssid, index) => {
        if (typeof ssid === 'string') {
          return { id: `legacy-${index}-${ssid}`, nom: ssid };
        }
        if (!ssid.id) {
          return { ...ssid, id: `ssid-${Date.now()}-${index}` };
        }
        return ssid;
      });
      // Ne mettre à jour que si nécessaire
      const needsUpdate = normalized.some((ssid, i) => {
        const original = form.ssids[i];
        return typeof original === 'string' || !original.id;
      });
      if (needsUpdate) {
        setForm(prev => ({ ...prev, ssids: normalized }));
      }
    }
  }, []);
  
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
  const [checkmkMappingModal, setCheckmkMappingModal] = useState({ isOpen: false, borneIndex: null });
  const [checkmkMappings, setCheckmkMappings] = useState({});

  // Charger les mappings Check MK existants
  React.useEffect(() => {
    if (!form?.id) return;

    const loadMappings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${form.id}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const mappings = await response.json();
          // Distribuer les mappings par ID d'équipement
          const byIndex = {};
          (form.equipements?.BorneWifi || []).forEach((ap, idx) => {
            // Chercher un mapping qui correspond à l'ID de cet équipement
            const matchingMapping = mappings.find(m =>
              m.equipment_type === 'BorneWifi' &&
              m.equipment_id === ap.id
            );

            if (matchingMapping) {
              byIndex[idx] = matchingMapping;
            }
          });
          setCheckmkMappings(byIndex);
        }
      } catch (error) {
        console.error('Erreur chargement mappings Check MK:', error);
      }
    };

    loadMappings();
  }, [form?.id, bornes.length]);

  const toggleItemExpansion = (index) => {
    const next = new Set(expandedItems);
    if (next.has(index)) next.delete(index); else next.add(index);
    setExpandedItems(next);
  };

  // Drag & Drop handlers & sites grouping
  const handleDragStart = (e, index) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) card.style.opacity = '0.5';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSite(null);
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverIndex(null);
  };

  const handleSiteDragOver = (e, siteName) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;
    const draggedItem = bornes[draggedIndex];
    const currentSite = draggedItem.site || 'Sans site';
    const targetSiteNormalized = siteName === 'Sans site' ? 'Sans site' : siteName;
    if (currentSite === targetSiteNormalized) {
      e.dataTransfer.dropEffect = 'none';
      setDragOverSite(null);
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    setDragOverSite(siteName);
    setDragOverIndex(null);
  };

  const handleSiteDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSite(null);
  };

  const handleSiteDrop = (e, targetSite) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;
    const updated = [...bornes];
    const draggedItem = updated[draggedIndex];
    const newSite = targetSite === 'Sans site' ? '' : targetSite;
    const currentSite = draggedItem.site || 'Sans site';
    const targetSiteNormalized = targetSite === 'Sans site' ? 'Sans site' : targetSite;
    if (currentSite === targetSiteNormalized) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragOverSite(null);
      setIsDragging(false);
      return;
    }
    draggedItem.site = newSite;
    const newExpanded = new Set(expandedItems);
    setForm((prev) => ({ ...prev, equipements: { ...prev.equipements, BorneWifi: updated } }));
    setExpandedItems(newExpanded);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverSite !== null) return;
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragOverSite(null);
      setIsDragging(false);
      return;
    }
    const updated = [...bornes];
    const draggedItem = updated[draggedIndex];
    const dropItem = updated[dropIndex];
    const draggedSite = draggedItem.site || 'Sans site';
    const dropSite = dropItem.site || 'Sans site';
    if (draggedSite !== dropSite) {
      draggedItem.site = dropSite === 'Sans site' ? '' : dropSite;
    }
    updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);
    
    // Mettre à jour les mappings CheckMK pour suivre le déplacement (AVANT la mise à jour du formulaire)
    setCheckmkMappings((prevMappings) => {
      const newMappings = {};
      Object.keys(prevMappings).forEach((oldIndexStr) => {
        const oldIndex = parseInt(oldIndexStr, 10);
        let newIndex;
        if (oldIndex === draggedIndex) {
          newIndex = dropIndex;
        } else if (oldIndex < draggedIndex && oldIndex >= dropIndex) {
          newIndex = oldIndex + 1;
        } else if (oldIndex > draggedIndex && oldIndex <= dropIndex) {
          newIndex = oldIndex - 1;
        } else {
          newIndex = oldIndex;
        }
        newMappings[newIndex] = prevMappings[oldIndex];
      });
      return newMappings;
    });
    
    const newExpanded = new Set();
    expandedItems.forEach((oldIndex) => {
      if (oldIndex === draggedIndex) newExpanded.add(dropIndex);
      else if (oldIndex < draggedIndex && oldIndex >= dropIndex) newExpanded.add(oldIndex + 1);
      else if (oldIndex > draggedIndex && oldIndex <= dropIndex) newExpanded.add(oldIndex - 1);
      else newExpanded.add(oldIndex);
    });
    setExpandedItems(newExpanded);
    setForm((prev) => ({ ...prev, equipements: { ...prev.equipements, BorneWifi: updated } }));
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };

  const handleDragEnd = (e) => {
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) card.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setTimeout(() => setIsDragging(false), 100);
  };

  const clientSites = form.sites || [];
  const wifiSites = bornes.map(ap => ap.site).filter(site => site && site.trim() !== '').filter((site, idx, self) => self.indexOf(site) === idx);
  const allAvailableSites = [...new Set([...clientSites, ...wifiSites])].sort((a, b) => a.localeCompare(b));
  const groupedBySite = bornes.reduce((acc, ap, index) => {
    const site = ap.site || 'Sans site';
    if (!acc[site]) acc[site] = [];
    acc[site].push({ ...ap, originalIndex: index });
    return acc;
  }, {});
  const allSitesWithGroups = {};
  allAvailableSites.forEach(site => { allSitesWithGroups[site] = groupedBySite[site] || []; });
  if (groupedBySite['Sans site']) allSitesWithGroups['Sans site'] = groupedBySite['Sans site'];
  const sortedSites = Object.keys(allSitesWithGroups).sort((a, b) => { if (a === 'Sans site') return -1; if (b === 'Sans site') return 1; return a.localeCompare(b); });

  const visibleSites = sortedSites.filter(
    (site) => !(site === "Sans site" && (allSitesWithGroups[site] || []).length === 0)
  );

  // Fonction de validation d'unicité des noms
  const isNameUnique = (name, currentIndex) => {
    if (!name || !name.trim()) return true; // Nom vide est autorisé (sera invalidé par required)
    return !bornes.some((borne, idx) => idx !== currentIndex && borne.nom?.trim() === name.trim());
  };

  const update = async (index, field, value) => {
    const updated = [...bornes];
    const oldValue = updated[index][field];
    updated[index][field] = value;

    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, BorneWifi: updated },
    }));

    // Si on change le nom et qu'il y a un mapping CheckMK, supprimer le mapping seulement si le nouveau nom est valide
    if (field === 'nom' && checkmkMappings[index] && oldValue !== value) {
      // Vérifier si le nouveau nom est valide (unique)
      const newNameIsUnique = !bornes.some((borne, idx) => idx !== index && borne.nom?.trim() === value?.trim());

      if (newNameIsUnique) {
        try {
          const oldMapping = checkmkMappings[index];

          // Supprimer l'ancien mapping
          const deleteResponse = await fetch(`${API_BASE_URL}/checkmk/mapping/${oldMapping.id}`, {
            method: 'DELETE',
            credentials: 'include'
          });

          if (deleteResponse.ok) {
            // Supprimer le mapping de l'état local
            setCheckmkMappings(prev => {
              const newMappings = { ...prev };
              delete newMappings[index];
              return newMappings;
            });
          } else {
            console.error('Erreur lors de la suppression du mapping CheckMK:', await deleteResponse.text());
          }
        } catch (error) {
          console.error('Erreur lors de la suppression du mapping CheckMK:', error);
        }
      }
      // Si le nouveau nom n'est pas unique, on ne touche pas au mapping
    }
  };

  // Nettoyer les champs vides avant la sauvegarde
  const cleanBorneData = (borne) => {
    const cleaned = { ...borne };
    // Supprimer les champs vides ou avec valeurs par défaut
    if (!cleaned.controleur || cleaned.controleur.trim() === '') delete cleaned.controleur;
    if (!cleaned.emplacement || cleaned.emplacement.trim() === '') delete cleaned.emplacement;
    if (!cleaned.expirationGarantie || cleaned.expirationGarantie.trim() === '') delete cleaned.expirationGarantie;
    if (cleaned.supportsWifi6 === false || cleaned.supportsWifi6 === null) delete cleaned.supportsWifi6;
    // Supprimer bandes si toutes les valeurs sont false ou null
    if (cleaned.bandes) {
      const hasActiveBande = Object.values(cleaned.bandes).some(v => v === true);
      if (!hasActiveBande) delete cleaned.bandes;
    }
    // Nettoyer les SSID vides
    if (Array.isArray(cleaned.ssids)) {
      cleaned.ssids = cleaned.ssids.filter(ssid => ssid && (typeof ssid === 'string' ? ssid.trim() !== '' : ssid.nom?.trim() !== ''));
    }
    return cleaned;
  };

  // Gestion globale des SSID
  const addSSID = () => {
    const newSSID = { 
      id: Date.now().toString(), 
      nom: "",
      type: "prive",
      portailCaptif: null
    };
    setForm((prev) => ({
      ...prev,
      ssids: [...(prev.ssids || []), newSSID],
    }));
  };

  const removeSSID = (ssidId) => {
    const updatedSSIDs = ssids.filter(ssid => ssid.id !== ssidId);
    setForm((prev) => ({
      ...prev,
      ssids: updatedSSIDs,
    }));
    // Retirer ce SSID de toutes les bornes qui l'utilisent
    const updatedBornes = bornes.map(borne => ({
      ...borne,
      ssids: (borne.ssids || []).filter(ssid => {
        if (typeof ssid === 'string') return ssid !== ssidId;
        return ssid.id !== ssidId;
      })
    }));
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, BorneWifi: updatedBornes },
    }));
  };

  const updateSSID = (ssidId, field, value) => {
    const updatedSSIDs = ssids.map(ssid => 
      ssid.id === ssidId ? { ...ssid, [field]: value } : ssid
    );
    setForm((prev) => ({
      ...prev,
      ssids: updatedSSIDs,
    }));
  };

  // Gestion de l'assignation des SSID aux bornes
  const toggleSSIDOnBorne = (borneIndex, ssidId) => {
    const updated = [...bornes];
    if (!updated[borneIndex].ssids) {
      updated[borneIndex].ssids = [];
    }
    const ssidIndex = updated[borneIndex].ssids.findIndex(ssid => {
      if (typeof ssid === 'string') return ssid === ssidId;
      return ssid.id === ssidId;
    });
    if (ssidIndex >= 0) {
      // Retirer le SSID
      updated[borneIndex].ssids.splice(ssidIndex, 1);
    } else {
      // Ajouter le SSID
      updated[borneIndex].ssids.push(ssidId);
    }
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, BorneWifi: updated },
    }));
  };

  const isSSIDAssignedToBorne = (borneIndex, ssidId) => {
    const borne = bornes[borneIndex];
    if (!borne || !borne.ssids) return false;
    return borne.ssids.some(ssid => {
      if (typeof ssid === 'string') return ssid === ssidId;
      return ssid.id === ssidId;
    });
  };

  const remove = (index) => {
    const updated = [...bornes];
    updated.splice(index, 1);
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, BorneWifi: updated },
    }));
  };

  const removeAll = () => {
    if (!bornes.length) return;
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, BorneWifi: [] },
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
      id: `wifi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID unique
      nom: "",
      fabricant: "",
      modele: "",
      ip: "",
      vlan: "",
      firmware: "",
      adresseMac: "",
      numeroSerie: "",
      ssids: [],
      site: "",
    };
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, BorneWifi: [...bornes, newItem] },
    }));
  };
  
  // Exposer la fonction add via onAdd si fournie
  React.useEffect(() => {
    if (onAdd && currentStepData?.key) {
      onAdd[currentStepData.key] = add;
    }
  }, [onAdd, currentStepData, add]);


  return (
    <motion.div
      className={styles.stepContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "circOut" }}
    >
      {/* Section globale des SSID */}
      <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div
            onClick={() => setShowSSIDSection(!showSSIDSection)}
            style={{
              flex: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a' }}>SSID disponibles</h3>
            <Icon icon={showSSIDSection ? "mdi:chevron-up" : "mdi:chevron-down"} style={{ fontSize: '18px', color: '#6b7280' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addSSID();
              }}
              title="Ajouter un SSID"
              style={{
                background: 'transparent',
                color: '#6b7280',
                border: '1px dashed #e5e7eb',
                borderRadius: '8px',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '32px',
                height: '32px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0fdfa';
                e.currentTarget.style.borderColor = '#15d1a0';
                e.currentTarget.style.color = '#15d1a0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <Icon icon="mdi:plus" style={{ fontSize: '18px' }} />
            </button>
          </div>
        </div>
        {showSSIDSection && (
          <div>
            {ssids.length > 0 ? (
              <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: '#6b7280',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Nom du SSID
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: '#6b7280',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        VLAN
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: '#6b7280',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Type
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: '#6b7280',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Portail captif
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'center', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: '#6b7280',
                        borderBottom: '2px solid #e5e7eb',
                        width: '60px'
                      }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ssids.map((ssid) => (
                      <tr
                        key={ssid.id}
                        style={{
                          background: '#ffffff',
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                        }}
                      >
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="text"
                            value={ssid.nom || ''}
                            onChange={(e) => updateSSID(ssid.id, 'nom', e.target.value)}
                            placeholder="Nom du SSID"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              background: '#ffffff',
                              color: '#1a1a1a',
                              transition: 'border-color 0.2s ease'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#15d1a0';
                              e.target.style.boxShadow = '0 0 0 3px rgba(21, 209, 160, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="text"
                            value={ssid.vlan || ''}
                            onChange={(e) => updateSSID(ssid.id, 'vlan', e.target.value)}
                            placeholder="Ex: 10, 20, 30"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              background: '#ffffff',
                              color: '#1a1a1a',
                              transition: 'border-color 0.2s ease'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#15d1a0';
                              e.target.style.boxShadow = '0 0 0 3px rgba(21, 209, 160, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <select
                            value={ssid.type || 'prive'}
                            onChange={(e) => {
                              const newType = e.target.value;
                              updateSSID(ssid.id, 'type', newType);
                              // Si on passe de Public à Privé, désactiver le portail captif
                              if (newType === 'prive') {
                                updateSSID(ssid.id, 'portailCaptif', false);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              background: '#ffffff',
                              color: '#1a1a1a',
                              transition: 'border-color 0.2s ease',
                              cursor: 'pointer'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#15d1a0';
                              e.target.style.boxShadow = '0 0 0 3px rgba(21, 209, 160, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            <option value="prive">Privé</option>
                            <option value="public">Public</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              cursor: (ssid.type || 'prive') === 'public' ? 'pointer' : 'not-allowed',
                              opacity: (ssid.type || 'prive') === 'public' ? 1 : 0.6
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={ssid.portailCaptif === true}
                              onChange={(e) => updateSSID(ssid.id, 'portailCaptif', e.target.checked)}
                              disabled={(ssid.type || 'prive') !== 'public'}
                              style={{
                                width: '18px',
                                height: '18px',
                                cursor: (ssid.type || 'prive') === 'public' ? 'pointer' : 'not-allowed',
                                accentColor: '#15d1a0',
                                margin: 0
                              }}
                            />
                            <span style={{ fontSize: '0.875rem', color: '#1a1a1a', userSelect: 'none' }}>
                              {ssid.portailCaptif === true ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeSSID(ssid.id)}
                            title="Supprimer ce SSID"
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
                              transition: 'background 0.2s ease',
                              width: '32px',
                              height: '32px',
                              margin: '0 auto'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Icon icon="mdi:delete" width={14} height={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ marginBottom: '0.75rem', color: '#6b7280', fontSize: '0.875rem' }}>Aucun SSID créé</p>
            )}
          </div>
        )}
      </div>

      <div className={styles.formSection}>
        <div className={styles.scrollable}>
          {visibleSites.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>Aucune borne configurée</p>
              <p className={styles.emptyStateDescription}>
                Cliquez sur "Ajouter une borne WiFi" pour commencer
              </p>
            </div>
          ) : (
            visibleSites.map((siteName) => {
              const siteAps = allSitesWithGroups[siteName] || [];
              return (
                <div key={siteName} className={styles.siteGroup}>
                  <div className={`${styles.siteHeader} ${dragOverSite === siteName ? styles.siteDragOver : ''}`} onDragOver={(e) => handleSiteDragOver(e, siteName)} onDragLeave={handleSiteDragLeave} onDrop={(e) => handleSiteDrop(e, siteName)}>
                    <h3 className={styles.siteTitle}>{siteName}</h3>
                    <span className={styles.siteCount}>{siteAps.length} borne{siteAps.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className={styles.siteConnections}
                    onDragOver={(e) => { if (e.target.closest(`.${styles.serverCard}`)) return; e.preventDefault(); e.stopPropagation(); if (draggedIndex !== null) { const draggedItem = bornes[draggedIndex]; const currentSite = draggedItem.site || 'Sans site'; const targetSiteNormalized = siteName === 'Sans site' ? 'Sans site' : siteName; if (currentSite === targetSiteNormalized) { e.dataTransfer.dropEffect = 'none'; setDragOverSite(null); return; } } e.dataTransfer.dropEffect = 'move'; setDragOverSite(siteName); setDragOverIndex(null); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSite(null); }}
                    onDrop={(e) => { if (e.target.closest(`.${styles.serverCard}`)) return; e.preventDefault(); e.stopPropagation(); if (draggedIndex !== null) handleSiteDrop(e, siteName); }}
                  >
                    {siteAps.length === 0 && (<div className={styles.emptySiteMessage}>Aucune borne dans ce site. Glissez-déposez une borne ici pour l'assigner.</div>)}
                    {siteAps.map((ap, siteIndex) => {
                      const i = ap.originalIndex;
                      return (
                        <motion.div key={i} draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, i); }}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverSite(null); e.dataTransfer.dropEffect = 'move'; setDragOverIndex(i); }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => { e.stopPropagation(); handleDrop(e, i); }}
                          onDragEnd={(e) => { e.stopPropagation(); handleDragEnd(e); }}
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
                            <div className={styles.dragHandle} title="Glisser pour réorganiser" onClick={(e) => { e.stopPropagation(); }} onMouseDown={(e) => { e.stopPropagation(); }} style={{ opacity: 0.3, transition: 'opacity 0.2s ease', cursor: 'grab' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent-primary)'; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.3'; e.currentTarget.style.color = 'inherit'; }}>
                              <GripVertical size={18} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <FaWifi size={18} color="#1a1a1a" style={{ position: 'relative', top: '-1px' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontWeight: '600',
                                  color: '#1a1a1a',
                                  fontSize: '0.95rem',
                                  marginBottom: '0.25rem'
                                }}>
                                  {ap.nom || `Borne WiFi #${i + 1}`}
                                </div>
                                <div style={{
                                  fontSize: '0.8rem',
                                  color: '#6b7280',
                                  display: 'flex',
                                  gap: '0.5rem',
                                  flexWrap: 'wrap'
                                }}>
                                  {[
                                    ap.modele || 'Modèle ?',
                                    ap.ip
                                  ].filter(Boolean).map((item, idx) => (
                                    <span key={idx}>{item}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className={styles.serverActions}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCheckmkMappingModal({ isOpen: true, borneIndex: i });
                                }}
                                title={checkmkMappings[i] ? `Mappé vers: ${checkmkMappings[i].checkmk_host_name}` : "Mapper avec Check MK"}
                                style={{
                                  padding: '0.5rem',
                                  background: checkmkMappings[i] ? '#15d1a0' : '#9ca3af',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease',
                                  boxShadow: checkmkMappings[i] ? '0 2px 4px rgba(21, 209, 160, 0.3)' : '0 2px 4px rgba(156, 163, 175, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = 'scale(1.05)';
                                  e.target.style.boxShadow = checkmkMappings[i] 
                                    ? '0 4px 8px rgba(21, 209, 160, 0.35)' 
                                    : '0 4px 8px rgba(156, 163, 175, 0.35)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'scale(1)';
                                  e.target.style.boxShadow = checkmkMappings[i] 
                                    ? '0 2px 4px rgba(21, 209, 160, 0.3)' 
                                    : '0 2px 4px rgba(156, 163, 175, 0.3)';
                                }}
                                >
                                <FaLink size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); remove(i); }}
                                title="Supprimer cette borne"
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
                              {/* Ligne 1 : NetBIOS / Adresse IP / VLAN */}
                              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-nom-${i}`}>NetBIOS</label>
                                  <input
                                    id={`ap-nom-${i}`}
                                    value={ap.nom}
                                    onChange={(e) => update(i, "nom", e.target.value)}
                                    style={{
                                      borderColor: !isNameUnique(ap.nom, i) ? '#ef4444' : undefined,
                                      borderWidth: !isNameUnique(ap.nom, i) ? '2px' : '1px',
                                      fontSize: !isNameUnique(ap.nom, i) ? '1rem' : '0.9rem',
                                      fontWeight: !isNameUnique(ap.nom, i) ? 'bold' : 'normal'
                                    }}
                                  />
                                  {!isNameUnique(ap.nom, i) && (
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
                                  <label htmlFor={`ap-ip-${i}`}>Adresse IP</label>
                                  <input
                                    id={`ap-ip-${i}`}
                                    value={ap.ip}
                                    onChange={(e) => update(i, "ip", e.target.value)}
                                  />
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-vlan-${i}`}>VLAN</label>
                                  <input
                                    id={`ap-vlan-${i}`}
                                    value={ap.vlan || ""}
                                    onChange={(e) => update(i, "vlan", e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Ligne 2 : Marque / Modèle / N° Série */}
                              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-fabricant-${i}`}>Marque</label>
                                  <input
                                    id={`ap-fabricant-${i}`}
                                    value={ap.fabricant}
                                    onChange={(e) => update(i, "fabricant", e.target.value)}
                                  />
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-modele-${i}`}>Modèle</label>
                                  <input
                                    id={`ap-modele-${i}`}
                                    value={ap.modele}
                                    onChange={(e) => update(i, "modele", e.target.value)}
                                  />
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-serie-${i}`}>N° Série</label>
                                  <input
                                    id={`ap-serie-${i}`}
                                    value={ap.numeroSerie || ""}
                                    onChange={(e) => update(i, "numeroSerie", e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Ligne 3 : Adresse MAC / Version Firmware */}
                              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-mac-${i}`}>Adresse MAC</label>
                                  <input
                                    id={`ap-mac-${i}`}
                                    value={ap.adresseMac || ""}
                                    onChange={(e) => update(i, "adresseMac", e.target.value)}
                                  />
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-firmware-${i}`}>Version Firmware</label>
                                  <input
                                    id={`ap-firmware-${i}`}
                                    value={ap.firmware}
                                    onChange={(e) => update(i, "firmware", e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Section SSID */}
                              {ssids.length > 0 && (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                  <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '0.75rem', display: 'block' }}>
                                    SSID diffusés par cette borne
                                  </label>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                    {ssids.map((ssid) => {
                                      const ssidName = ssid.nom?.trim() || 'SSID sans nom';
                                      const isAssigned = isSSIDAssignedToBorne(i, ssid.id);
                                      return (
                                        <label
                                          key={ssid.id}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem',
                                            background: isAssigned ? '#f0fdfa' : '#ffffff',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            border: `1px solid ${isAssigned ? '#15d1a0' : '#e5e7eb'}`,
                                            transition: 'all 0.2s ease'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isAssigned) {
                                              e.currentTarget.style.borderColor = '#15d1a0';
                                              e.currentTarget.style.background = '#f9fafb';
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isAssigned) {
                                              e.currentTarget.style.borderColor = '#e5e7eb';
                                              e.currentTarget.style.background = '#ffffff';
                                            }
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isAssigned}
                                            onChange={() => toggleSSIDOnBorne(i, ssid.id)}
                                            style={{
                                              width: '18px',
                                              height: '18px',
                                              cursor: 'pointer',
                                              accentColor: '#15d1a0'
                                            }}
                                          />
                                          <span style={{ flex: 1, fontSize: '0.875rem', color: '#1a1a1a' }}>
                                            {ssidName}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  {ssids.length === 0 && (
                                    <div style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic', padding: '0.5rem' }}>
                                      Créez d'abord des SSID dans la section ci-dessus
                                    </div>
                                  )}
                                </div>
                              )}
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
                equipmentType="wifi"
                onImport={(importedDevices) => {
                  // Ajouter les équipements importés à la liste existante
                  setForm((prev) => ({
                    ...prev,
                    equipements: {
                      ...prev.equipements,
                      BorneWifi: [...bornes, ...importedDevices]
                    }
                  }));
                }}
              />

              {/* Modal de mapping Check MK */}
              {checkmkMappingModal.isOpen && 
               checkmkMappingModal.borneIndex !== null && 
               bornes[checkmkMappingModal.borneIndex] && (
                <CheckMKMappingModal
                  isOpen={checkmkMappingModal.isOpen}
                  onClose={() => setCheckmkMappingModal({ isOpen: false, borneIndex: null })}
                  equipmentName={bornes[checkmkMappingModal.borneIndex].nom || `Borne WiFi #${checkmkMappingModal.borneIndex + 1}`}
                  equipmentType="BorneWifi"
                  equipmentIndex={checkmkMappingModal.borneIndex}
                  equipmentId={bornes[checkmkMappingModal.borneIndex].id}
                  clientId={form.id}
                  requireService={false}
                  onMappingSaved={(mapping) => {
                    if (mapping) {
                      setCheckmkMappings(prev => ({
                        ...prev,
                        [checkmkMappingModal.borneIndex]: mapping
                      }));
                    } else {
                      setCheckmkMappings(prev => {
                        const newMappings = { ...prev };
                        delete newMappings[checkmkMappingModal.borneIndex];
                        return newMappings;
                      });
                    }
                  }}
                />
              )}
            </motion.div>
          );
        };

        export default StepBorneWifi;


