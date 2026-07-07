import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { createPortal } from "react-dom";
import { FaLink } from "react-icons/fa";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import adminStyles from "../../AdminPanel.module.css";
import CheckMKMappingModal from "./CheckMKMappingModal";
import API_BASE_URL from "../../../../config";

const StepStockage = ({ form, setForm, showTypeModal, setShowTypeModal: setShowTypeModalProp }) => {
  const [localShowTypeModal, setLocalShowTypeModal] = useState(false);
  const showTypeModalState = showTypeModal !== undefined ? showTypeModal : localShowTypeModal;
  const setShowTypeModalState = setShowTypeModalProp || setLocalShowTypeModal;
  const NAS = form.equipements.NAS || [];
  const bottomRef = useRef(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverSite, setDragOverSite] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [checkmkMappingModal, setCheckmkMappingModal] = useState({ isOpen: false, itemIndex: null });
  const [checkmkMappings, setCheckmkMappings] = useState({});

  const roleOptions = [
    "Stockage de sauvegarde",
    "Stockage de fichiers communs",
    "Stockage principal",
    "Stockage d'archivage",
    "Stockage de réplication",
    "Autre"
  ];

  const raidOptions = [
    "RAID 0",
    "RAID 1",
    "RAID 5",
    "RAID 6",
    "RAID 10",
    "RAID 50",
    "RAID 60",
    "SHR (Synology)",
    "SHR-2 (Synology)",
    "Qtier (QNAP)",
    "RAID-TP (QNAP)",
    "RAID-Z (ZFS)",
    "RAID-Z2 (ZFS)",
    "RAID-Z3 (ZFS)",
    "Autre"
  ];

  const capaciteOptions = [
    "1 TB",
    "2 TB",
    "4 TB",
    "6 TB",
    "8 TB",
    "10 TB",
    "12 TB",
    "16 TB",
    "20 TB",
    "24 TB",
    "32 TB",
    "40 TB",
    "48 TB",
    "64 TB",
    "80 TB",
    "100 TB",
    "Autre"
  ];

  const disqueOptions = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
    "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
    "31", "32", "33", "34", "35", "36", "37", "38", "39", "40",
    "41", "42", "43", "44", "45", "46", "47", "48", "49", "50"
  ];

  const toggleItemExpansion = (index) => {
    // Ne pas basculer l'expansion si on vient de faire un drag
    if (!isDragging) {
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      setExpandedItems(newExpanded);
    }
  };

  // Fonctions pour le drag and drop
  const handleDragStart = (e, index) => {
    // Empêcher le drag si on clique sur un champ de formulaire
    const target = e.target;
    const isFormElement = target.tagName === 'INPUT' || 
                         target.tagName === 'SELECT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.tagName === 'BUTTON' ||
                         target.closest('input, select, textarea, button');
    
    if (isFormElement) {
      e.preventDefault();
      return;
    }
    
    setIsDragging(true);
    setDraggedIndex(index);
    setDragOverSite(null);
    setDragOverIndex(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
    // Réduire l'opacité de la carte directement
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    // Quand on survole un équipement, on veut réordonner, pas changer de site
    setDragOverSite(null);
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    // Ne réinitialiser que si on quitte vraiment la carte
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleSiteDragOver = (e, siteName) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Vérifier si l'équipement est déjà dans ce site
    if (draggedIndex !== null) {
      const draggedItem = NAS[draggedIndex];
      const currentSite = draggedItem.site || "Sans site";
      const targetSiteNormalized = siteName === "Sans site" ? "Sans site" : siteName;
      
      // Si l'équipement est déjà dans ce site, on ne permet pas le drop
      if (currentSite === targetSiteNormalized) {
        e.dataTransfer.dropEffect = "none";
        setDragOverSite(null);
        return;
      }
    }
    
    e.dataTransfer.dropEffect = "move";
    // Quand on survole un site, on veut changer de site, pas réordonner
    setDragOverSite(siteName);
    setDragOverIndex(null);
  };

  const handleSiteDragLeave = (e) => {
    // Ne réinitialiser que si on quitte vraiment le header du site
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverSite(null);
    }
  };

  const handleSiteDrop = (e, targetSite) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;

    const updated = [...NAS];
    const draggedItem = updated[draggedIndex];
    
    // Si targetSite est "Sans site", on met une chaîne vide, sinon on met le nom du site
    const newSite = targetSite === "Sans site" ? "" : targetSite;
    
    // Vérifier si l'équipement est déjà dans ce site
    const currentSite = draggedItem.site || "Sans site";
    const targetSiteNormalized = targetSite === "Sans site" ? "Sans site" : targetSite;
    
    // Si l'équipement est déjà dans ce site, on ne fait rien
    if (currentSite === targetSiteNormalized) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragOverSite(null);
      setIsDragging(false);
      return;
    }
    
    // Si le site change, on met à jour le site de l'équipement
    draggedItem.site = newSite;

    // Mettre à jour les expandedItems (l'index reste le même car on change juste le site)
    const newExpanded = new Set(expandedItems);

    setForm((prev) => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated,
      },
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
    
    // Si on a un dragOverSite actif, on ne fait pas de réordonnancement
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

    const updated = [...NAS];
    const draggedItem = updated[draggedIndex];
    const dropItem = updated[dropIndex];
    const draggedSite = draggedItem.site || "Sans site";
    const dropSite = dropItem.site || "Sans site";
    
    // Si les sites sont différents, changer le site de l'équipement glissé
    if (draggedSite !== dropSite) {
      // Mettre à jour le site de l'équipement
      draggedItem.site = dropSite === "Sans site" ? "" : dropSite;
    }

    // Réordonner les équipements (dans le même site maintenant)
    updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    // Mettre à jour les expandedItems pour conserver l'état d'expansion
    const newExpanded = new Set();
    expandedItems.forEach((oldIndex) => {
      if (oldIndex === draggedIndex) {
        newExpanded.add(dropIndex);
      } else if (oldIndex < draggedIndex && oldIndex >= dropIndex) {
        newExpanded.add(oldIndex + 1);
      } else if (oldIndex > draggedIndex && oldIndex <= dropIndex) {
        newExpanded.add(oldIndex - 1);
      } else {
        newExpanded.add(oldIndex);
      }
    });
    setExpandedItems(newExpanded);

    // Mettre à jour les mappings CheckMK pour conserver les mappings lors du réordonnancement
    const newMappings = {};
    Object.keys(checkmkMappings).forEach((oldIndexStr) => {
      const oldIndex = parseInt(oldIndexStr);
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
      newMappings[newIndex] = checkmkMappings[oldIndex];
    });
    setCheckmkMappings(newMappings);

    setForm((prev) => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated,
      },
    }));

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };

  const handleDragEnd = (e) => {
    // Restaurer l'opacité de la carte directement
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    // Réinitialiser isDragging après un petit délai pour éviter les conflits avec le clic
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  };

  // Récupérer les sites du client depuis la base de données
  const clientSites = form.sites || [];
  
  // Récupérer les sites utilisés dans les équipements
  const equipmentSites = NAS
    .map(nas => nas.site)
    .filter(site => site && site.trim() !== "")
    .filter((site, index, self) => self.indexOf(site) === index); // Dédupliquer

  // Combiner les sites du client et ceux des équipements
  const allAvailableSites = [...new Set([...clientSites, ...equipmentSites])].sort((a, b) => a.localeCompare(b));

  // Grouper les équipements par site
  const groupedBySite = NAS.reduce((acc, nas, index) => {
    const site = nas.site || "Sans site";
    if (!acc[site]) {
      acc[site] = [];
    }
    acc[site].push({ ...nas, originalIndex: index });
    return acc;
  }, {});

  // Préparer la liste complète des sites, même vides
  let sortedSites = ["Sans site", ...allAvailableSites]
    .filter((site, index, self) => self.indexOf(site) === index)
    .sort((a, b) => {
      if (a === "Sans site") return -1;
      if (b === "Sans site") return 1;
      return a.localeCompare(b);
    });

  // S'assurer que chaque site existe dans groupedBySite, même vide
  sortedSites.forEach((site) => {
    if (!groupedBySite[site]) groupedBySite[site] = [];
  });

  // Retirer "Sans site" s'il n'y a aucun équipement
  if ((groupedBySite["Sans site"] || []).length === 0) {
    sortedSites = sortedSites.filter((site) => site !== "Sans site");
  }
  
  // Fonction de validation d'unicité des noms
  const isNameUnique = (name, currentIndex) => {
    if (!name || !name.trim()) return true; // Nom vide est autorisé (sera invalidé par required)
    return !NAS.some((nas, idx) => idx !== currentIndex && nas.nom?.trim() === name.trim());
  };

  const update = async (index, field, value) => {
    const updated = [...NAS];
    const oldValue = updated[index][field];

    // Validation pour les champs numériques - accepter uniquement des entiers
    if (field === "capacite" || field === "nbDisquesActuels" || field === "nbDisquesMax") {
      // Supprimer tous les caractères non numériques
      const numericValue = value.replace(/[^0-9]/g, '');
      updated[index][field] = numericValue;
    } else {
      updated[index][field] = value;
    }

    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, NAS: updated },
    }));

    // Si on change le nom et qu'il y a un mapping CheckMK, supprimer le mapping seulement si le nouveau nom est valide
    if (field === 'nom' && checkmkMappings[index] && oldValue !== value) {
      // Vérifier si le nouveau nom est valide (unique)
      const newNameIsUnique = !NAS.some((nas, idx) => idx !== index && nas.nom?.trim() === value?.trim());

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

  // Charger les mappings Check MK existants
  React.useEffect(() => {
    if (!form.id) return;

    const loadMappings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${form.id}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const mappings = await response.json();
          // Distribuer les mappings par ID d'équipement
          const byIndex = {};
          (form.equipements?.NAS || []).forEach((item, idx) => {
            // Chercher un mapping qui correspond à l'ID de cet équipement
            const matchingMapping = mappings.find(m =>
              m.equipment_type === 'Stockage' &&
              m.equipment_id === item.id
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
  }, [form.id, NAS.length]);

  const remove = (index) => {
    const updated = [...NAS];
    updated.splice(index, 1);
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, NAS: updated },
    }));
  };

  const add = (type) => {
    const newNAS = {
      id: `nas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID unique
      nom: "",
      role: "",
      nbDisquesActuels: "",
      nbDisquesMax: "",
      raid: "",
      type: type, // Type sélectionné : NAS, SAN, Robot de sauvegarde ou Disque dur externe
      capacite: "",
      fabricant: "",
      modele: "",
      ip: "",
      numeroSerie: "",
      expirationGarantie: "",
      numeroDisque: "", // Pour les disques durs externes (rotation)
      cassettesRDX: [], // Pour les robots de sauvegarde
      luns: [], // Pour NAS / SAN
    };
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, NAS: [...NAS, newNAS] },
    }));
    setShowTypeModalState(false);

    // Déplier automatiquement le nouvel équipement
    setTimeout(() => {
      setExpandedItems(new Set([...expandedItems, NAS.length]));
    }, 100);
  };

  const getStorageIconName = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("san")) return "mdi:server-network-outline";
    if (t.includes("robot")) return "mdi:vhs";
    if (t.includes("disque")) return "mdi:harddisk";
    return "mdi:nas";
  };

  const addCassetteRDX = (index) => {
    const updated = [...NAS];
    if (!updated[index].cassettesRDX) {
      updated[index].cassettesRDX = [];
    }
    updated[index].cassettesRDX.push({
      numero: "",
      capacite: ""
    });
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, NAS: updated },
    }));
  };

  const removeCassetteRDX = (index, cassetteIndex) => {
    const updated = [...NAS];
    updated[index].cassettesRDX.splice(cassetteIndex, 1);
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, NAS: updated },
    }));
  };

  const updateCassetteRDX = (index, cassetteIndex, field, value) => {
    const updated = [...NAS];
    updated[index].cassettesRDX[cassetteIndex][field] = value;
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, NAS: updated },
    }));
  };

  // Gestion des LUNs pour NAS / SAN
  const addLUN = (index) => {
    const updated = [...NAS];
    if (!updated[index].luns) updated[index].luns = [];
    updated[index].luns.push({ nom: "", iqn: "", capacite: "", role: "stockage" });
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, NAS: updated },
    }));
  };

  const updateLUN = (index, lunIndex, field, value) => {
    const updated = [...NAS];
    if (!updated[index].luns) updated[index].luns = [];
    updated[index].luns[lunIndex] = {
      ...updated[index].luns[lunIndex],
      [field]: value
    };
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, NAS: updated },
    }));
  };

  const removeLUN = (index, lunIndex) => {
    const updated = [...NAS];
    if (!updated[index].luns) return;
    updated[index].luns.splice(lunIndex, 1);
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, NAS: updated },
    }));
  };

  return (
    <motion.div
      className={styles.stepContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "circOut" }}
    >
      <div className={styles.formSection}>

        <div className={styles.scrollable}>
          {sortedSites.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>Aucun site ni équipement de stockage</p>
              <p className={styles.emptyStateDescription}>
                Ajoutez un site ou un équipement pour commencer.
              </p>
            </div>
          ) : (
            sortedSites.map((siteName) => {
              const siteEquipments = groupedBySite[siteName] || [];
              return (
                <div key={siteName} className={styles.siteGroup} style={{ marginBottom: '0.5rem' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${dragOverSite === siteName ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '0.75rem',
                      transition: 'all 0.2s ease'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSiteDragOver(e, siteName);
                    }}
                    onDragLeave={handleSiteDragLeave}
                    onDrop={(e) => handleSiteDrop(e, siteName)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 style={{
                        margin: 0,
                        color: '#1a1a1a',
                        fontSize: '0.95rem',
                        fontWeight: '700'
                      }}>
                        {siteName}
                      </h3>
                      <span style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                        {siteEquipments.length} équipement{siteEquipments.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {siteEquipments.length === 0 && (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: '#f9fafb',
                        border: '2px dashed #d1d5db',
                        borderRadius: '10px',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        Glissez-déposer un équipement ici.
                      </div>
                    )}
                    {siteEquipments.map((equipment, siteIndex) => {
                      const i = equipment.originalIndex; // Index original dans le tableau NAS
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
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                background: '#ffffff',
                border: `2px solid ${dragOverIndex === i ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '10px',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                cursor: isDragging ? 'grabbing' : 'grab',
                opacity: draggedIndex === i ? 0.5 : 1,
                marginBottom: '0.75rem'
              }}
            >
              <div 
                onClick={(e) => {
                  // Ne pas basculer l'expansion si on vient de faire un drag
                  if (!isDragging) {
                    toggleItemExpansion(i);
                  }
                }}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  background: expandedItems.has(i) ? '#f9fafb' : 'transparent',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{ color: '#9ca3af', cursor: 'grab' }}>
                  <GripVertical size={18} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon
                    icon={getStorageIconName(equipment.type)}
                    width={24}
                    height={24}
                    color="#1a1a1a"
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '600',
                      color: '#1a1a1a',
                      fontSize: '0.95rem',
                      marginBottom: '0.25rem'
                    }}>
                      {equipment.nom || `Équipement ${i + 1}`}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#6b7280',
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      {(equipment.type === 'Disque dur externe' ? [
                        equipment.capacite && `${equipment.capacite} GB`,
                        equipment.numeroDisque && `N° ${equipment.numeroDisque}`
                      ].filter(Boolean) : equipment.type === 'Robot de sauvegarde' ? [
                        equipment.modele,
                        equipment.numeroSerie,
                        equipment.capacite && `${equipment.capacite} GB`,
                        equipment.ip,
                        equipment.cassettesRDX && equipment.cassettesRDX.length > 0 && `${equipment.cassettesRDX.length} cassette${equipment.cassettesRDX.length > 1 ? 's' : ''}`
                      ].filter(Boolean) : [
                        equipment.modele,
                        equipment.numeroSerie,
                        equipment.capacite && `${equipment.capacite} GB`,
                        equipment.ip
                      ].filter(Boolean)).map((item, idx) => (
                        <span key={idx}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {equipment.type !== 'Disque dur externe' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCheckmkMappingModal({ isOpen: true, itemIndex: i });
                      }}
                      title={checkmkMappings[i] ? `Mappé vers: ${checkmkMappings[i].checkmk_host_name}` : "Mapper avec Check MK"}
                      style={{
                        padding: '0.5rem',
                        background: checkmkMappings[i] ? '#10b981' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <FaLink size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(i);
                    }}
                    title="Supprimer cet équipement"
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
                    <Icon icon="mdi:delete" width={20} height={20} />
                  </button>
                </div>
              </div>

              {/* Formulaire d'édition (affiché seulement si déplié) */}
              {expandedItems.has(i) && (
                <div style={{
                  padding: '1rem',
                  background: '#ffffff',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  {/* Ligne 1 : Nom / Rôle */}
                  <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className={styles.formField}>
                      <label htmlFor={`nas-nom-${i}`}>
                        {equipment.type === 'Disque dur externe' ? 'Nom du périphérique' : 'NetBIOS'} <span style={{color: 'red'}}>*</span>
                      </label>
                      <input
                        id={`nas-nom-${i}`}
                        value={equipment.nom}
                        onChange={(e) => update(i, "nom", e.target.value)}
                        required
                        style={{
                          borderColor: !isNameUnique(equipment.nom, i) ? '#ef4444' : (!equipment.nom || !equipment.nom.trim() ? 'red' : undefined),
                          borderWidth: !isNameUnique(equipment.nom, i) ? '2px' : '1px',
                          fontSize: !isNameUnique(equipment.nom, i) ? '1rem' : '0.9rem',
                          fontWeight: !isNameUnique(equipment.nom, i) ? 'bold' : 'normal'
                        }}
                      />
                      {!isNameUnique(equipment.nom, i) && (
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
                      <label htmlFor={`nas-role-${i}`}>Rôle <span style={{color: 'red'}}>*</span></label>
                      <select
                        id={`nas-role-${i}`}
                        value={equipment.role}
                        onChange={(e) => update(i, "role", e.target.value)}
                        required
                        style={{
                          borderColor: !equipment.role || (typeof equipment.role === 'string' && !equipment.role.trim()) ? 'red' : undefined
                        }}
                      >
                        <option value="">Sélectionner un rôle</option>
                        {roleOptions.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Ligne 2 : Marque / Modèle / N° Série */}
                  {equipment.type !== 'Disque dur externe' && (
                    <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-fabricant-${i}`}>Marque</label>
                        <input
                          id={`nas-fabricant-${i}`}
                          value={equipment.fabricant}
                          onChange={(e) => update(i, "fabricant", e.target.value)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-modele-${i}`}>Modèle</label>
                        <input
                          id={`nas-modele-${i}`}
                          value={equipment.modele}
                          onChange={(e) => update(i, "modele", e.target.value)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-serie-${i}`}>N° Série</label>
                        <input
                          id={`nas-serie-${i}`}
                          value={equipment.numeroSerie}
                          onChange={(e) => update(i, "numeroSerie", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ligne 3 : Garantie */}
                  {equipment.type !== 'Disque dur externe' && (
                    <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-garantie-${i}`}>Garantie (expiration)</label>
                        <input
                          id={`nas-garantie-${i}`}
                          type="date"
                          value={equipment.expirationGarantie}
                          onChange={(e) => update(i, "expirationGarantie", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ligne 4 : Adresse IP / VLAN */}
                  {equipment.type !== 'Disque dur externe' && (
                    <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-ip-${i}`}>Adresse IP</label>
                        <input
                          id={`nas-ip-${i}`}
                          value={equipment.ip}
                          onChange={(e) => update(i, "ip", e.target.value)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-vlan-${i}`}>VLAN</label>
                        <input
                          id={`nas-vlan-${i}`}
                          value={equipment.vlan || ""}
                          onChange={(e) => update(i, "vlan", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ligne 5 : Disques et capacité */}
                  {equipment.type !== 'Robot de sauvegarde' && equipment.type !== 'Disque dur externe' && (
                    <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-disques-actuels-${i}`}>Disques actuels</label>
                        <input
                          id={`nas-disques-actuels-${i}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={equipment.nbDisquesActuels}
                          onChange={(e) => update(i, "nbDisquesActuels", e.target.value)}
                          onKeyPress={(e) => {
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-disques-max-${i}`}>Disques maximum</label>
                        <input
                          id={`nas-disques-max-${i}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={equipment.nbDisquesMax}
                          onChange={(e) => update(i, "nbDisquesMax", e.target.value)}
                          onKeyPress={(e) => {
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-capacite-${i}`}>Capacité totale (GB)</label>
                        <input
                          id={`nas-capacite-${i}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={equipment.capacite}
                          onChange={(e) => update(i, "capacite", e.target.value)}
                          onKeyPress={(e) => {
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ligne 6 : RAID */}
                  {equipment.type !== 'Robot de sauvegarde' && equipment.type !== 'Disque dur externe' && (
                    <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-raid-${i}`}>Configuration RAID</label>
                        <select
                          id={`nas-raid-${i}`}
                          value={equipment.raid}
                          onChange={(e) => update(i, "raid", e.target.value)}
                        >
                          <option value="">Sélectionner une configuration</option>
                          {raidOptions.map(raid => (
                            <option key={raid} value={raid}>{raid}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* LUNs pour NAS / SAN */}
                  {(equipment.type === 'NAS' || equipment.type === 'SAN') && (
                    <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                      <label>LUNs</label>
                      {(equipment.luns || []).length === 0 && (
                        <p className={styles.noLicences} style={{ margin: '0.5rem 0' }}>Aucun LUN configuré</p>
                      )}
                      {(equipment.luns || []).map((lun, lunIndex) => (
                        <div
                          key={lunIndex}
                          className={styles.licenceItem}
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'stretch',
                            padding: '8px 12px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 6,
                            marginBottom: 8
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1.6, gap: 4 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nom</label>
                            <input
                              value={lun.iqn || ""}
                              onChange={(e) => updateLUN(i, lunIndex, "iqn", e.target.value)}
                              placeholder=""
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Capacité (GB)</label>
                            <input
                              value={lun.capacite || ""}
                              onChange={(e) => updateLUN(i, lunIndex, "capacite", e.target.value)}
                              placeholder=""
                              inputMode="numeric"
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 160, gap: 4 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rôle</label>
                            <select
                              value={lun.role || "stockage"}
                              onChange={(e) => updateLUN(i, lunIndex, "role", e.target.value)}
                            >
                              <option value="stockage">Stockage</option>
                              <option value="exploitation">Exploitation</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLUN(i, lunIndex)}
                            className={styles.deleteButton}
                            title="Supprimer ce LUN"
                            style={{ minWidth: 32, alignSelf: 'center' }}
                          >
                          <Icon icon="mdi:delete" width={20} height={20} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addLUN(i)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.5rem',
                          background: 'transparent',
                          border: '1px dashed #e5e7eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#6b7280',
                          transition: 'all 0.2s ease',
                          fontSize: '1.25rem',
                          fontWeight: '600'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#15d1a0';
                          e.currentTarget.style.color = '#15d1a0';
                          e.currentTarget.style.background = '#f0fdfa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.color = '#6b7280';
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Ajouter un LUN"
                      >
                        <Icon icon="mdi:plus" width={20} height={20} />
                      </button>
                    </div>
                  )}

                  {equipment.type === 'Robot de sauvegarde' && (
                    <div className={styles.formGrid}>
                      <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                        <label>Jeu de cassettes RDX</label>
                        <div>
                          {(equipment.cassettesRDX || []).length === 0 && (
                            <p className={styles.noLicences} style={{ margin: '0.5rem 0' }}>Aucune cassette configurée</p>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                            {(equipment.cassettesRDX || []).map((cassette, cassetteIndex) => (
                              <div key={cassetteIndex} className={styles.licenceItem} style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "stretch",
                                padding: "8px 12px",
                                background: "var(--bg-tertiary)",
                                borderRadius: 6,
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
                                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>N° cassette</label>
                                  <input
                                    value={cassette.numero || ""}
                                    onChange={(e) => updateCassetteRDX(i, cassetteIndex, "numero", e.target.value)}
                                  />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
                                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Capacité (GB)</label>
                                  <input
                                    value={cassette.capacite || ""}
                                    onChange={(e) => updateCassetteRDX(i, cassetteIndex, "capacite", e.target.value)}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeCassetteRDX(i, cassetteIndex)}
                                  className={styles.deleteButton}
                                  title="Supprimer cette cassette"
                                  style={{ minWidth: 24, alignSelf: 'center' }}
                                >
                                  <Icon icon="mdi:delete" width={20} height={20} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => addCassetteRDX(i)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0.5rem',
                              background: 'transparent',
                              border: '1px dashed #e5e7eb',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#6b7280',
                              transition: 'all 0.2s ease',
                              fontSize: '1.25rem',
                              fontWeight: '600'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#15d1a0';
                              e.currentTarget.style.color = '#15d1a0';
                              e.currentTarget.style.background = '#f0fdfa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#e5e7eb';
                              e.currentTarget.style.color = '#6b7280';
                              e.currentTarget.style.background = 'transparent';
                            }}
                            title="Ajouter une cassette RDX"
                          >
                            <Icon icon="mdi:plus" width={20} height={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {equipment.type === 'Disque dur externe' && (
                    <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-capacite-${i}`}>Capacité totale (GB)</label>
                        <input
                          id={`nas-capacite-${i}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={equipment.capacite}
                          onChange={(e) => update(i, "capacite", e.target.value)}
                          onKeyPress={(e) => {
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-numero-disque-${i}`}>N° Disque (rotation)</label>
                        <input
                          id={`nas-numero-disque-${i}`}
                          value={equipment.numeroDisque}
                          onChange={(e) => update(i, "numeroDisque", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
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

      {/* Modal de sélection du type d'équipement */}
      {showTypeModalState && createPortal(
        <div className={adminStyles.modalOverlay} onClick={() => setShowTypeModalState(false)}>
          <div
            className={adminStyles.modalContent}
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={adminStyles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon icon="mdi:harddisk" className={adminStyles.modalIcon} style={{ color: '#3b82f6' }} />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1a1a1a' }}>
                  Ajouter un équipement de stockage
                </h3>
              </div>
              <button
                className={adminStyles.closeButton}
                onClick={() => setShowTypeModalState(false)}
                title="Fermer"
              >
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={adminStyles.modalBody} style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem'
                }}
              >
                {[
                  { label: "NAS", icon: "mdi:nas", type: "NAS" },
                  { label: "SAN", icon: "mdi:server-network-outline", type: "SAN" },
                  { label: "Robot de sauvegarde", icon: "mdi:vhs", type: "Robot de sauvegarde" },
                  { label: "Disque dur externe", icon: "mdi:harddisk", type: "Disque dur externe" }
                ].map(({ label, icon, type }) => (
                  <button
                    key={label}
                    onClick={() => add(type)}
                    style={{
                      width: '100%',
                      border: '1px solid #e0e0e0',
                      borderRadius: '10px',
                      padding: '1rem',
                      background: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#eff6ff';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Icon icon={icon} width={40} height={40} color="#1a1a1a" />
                    <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.9rem' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de mapping Check MK */}
      {checkmkMappingModal.isOpen && checkmkMappingModal.itemIndex !== null && NAS[checkmkMappingModal.itemIndex] && (
                    <CheckMKMappingModal
                      isOpen={checkmkMappingModal.isOpen}
                      onClose={() => setCheckmkMappingModal({ isOpen: false, itemIndex: null })}
                      equipmentName={NAS[checkmkMappingModal.itemIndex].nom}
                      equipmentType="Stockage"
                      equipmentIndex={checkmkMappingModal.itemIndex}
                      equipmentId={NAS[checkmkMappingModal.itemIndex].id}
                      clientId={form.id}
                      requireService={false}
          onMappingSaved={(mapping) => {
            if (mapping) {
              setCheckmkMappings(prev => ({
                ...prev,
                [checkmkMappingModal.itemIndex]: mapping
              }));
            } else {
              setCheckmkMappings(prev => {
                const newMappings = { ...prev };
                delete newMappings[checkmkMappingModal.itemIndex];
                return newMappings;
              });
            }
          }}
        />
      )}
    </motion.div>
  );
};

export default StepStockage;
