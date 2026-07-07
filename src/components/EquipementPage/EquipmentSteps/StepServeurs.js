// ──────────────────────────────
// 📦 Dépendances & Composants internes
// ──────────────────────────────
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { FaSync, FaServer, FaCube } from "react-icons/fa";
import { Icon } from "@iconify/react";
import React from "react";
import styles from "./Form.module.css";
import equipmentModalStyles from "./EquipmentStepsModal.module.css";
import SegmentedControl from "../../AdminPage/MonitoringClientSkeleton/ClientSteps/SegmentedControl";
import API_BASE_URL from "../../../config";
import RoleTagsSelect from "../RoleTagsSelect";
import { SERVER_ROLE_GROUPS, SERVER_ROLE_OPTIONS } from "../constants/serverRoleOptions";
import { SERVER_CATALOG } from "../constants/equipmentCatalog";
import BrandModelFields from "../constants/BrandModelFields";

const StepServeurs = ({ form, setForm, showTypeModal, setShowTypeModal: setShowTypeModalProp }) => {
  const [localShowTypeModal, setLocalShowTypeModal] = useState(false);
  const showTypeModalState = showTypeModal !== undefined ? showTypeModal : localShowTypeModal;
  const setShowTypeModalState = setShowTypeModalProp || setLocalShowTypeModal;
  const serveurs = form.equipements.Serveurs || [];
  const bottomRef = useRef(null);
  const [expandedServers, setExpandedServers] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverSite, setDragOverSite] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [haLinkSource, setHaLinkSource] = useState(null); // index du serveur en attente de lien HA

  // Ancienne logique de chargement des mappings CheckMK supprimée :
  // la couleur/état du bouton dépend désormais directement des colonnes checkmk_* du serveur.

  // Migration automatique des anciens serveurs (role string vers tableau)
  React.useEffect(() => {
    const needsMigration = serveurs.some(srv => typeof srv.role === 'string');
    
    if (needsMigration) {
      const updatedServeurs = serveurs.map(srv => {
        if (typeof srv.role === 'string') {
          return {
            ...srv,
            role: srv.role.trim() ? [srv.role] : []
          };
        }
        return srv;
      });
      
      setForm((prev) => ({
        ...prev,
        equipements: { ...prev.equipements, Serveurs: updatedServeurs },
      }));
    }
  }, []);

  const osOptions = [
    // Windows Server
    "Windows Server 2012 R2 Standard",
    "Windows Server 2012 R2 Datacenter",
    "Windows Server 2016 Standard",
    "Windows Server 2016 Datacenter",
    "Windows Server 2019 Standard",
    "Windows Server 2019 Datacenter",
    "Windows Server 2022 Standard",
    "Windows Server 2022 Datacenter",
    "Windows Server 2025 Standard",
    "Windows Server 2025 Datacenter",
    
    // Windows Desktop
    "Windows 10 Pro",
    "Windows 10 Enterprise",
    "Windows 11 Pro",
    "Windows 11 Enterprise",
    
    // Linux Ubuntu
    "Ubuntu Server 18.04 LTS",
    "Ubuntu Server 20.04 LTS",
    "Ubuntu Server 22.04 LTS",
    "Ubuntu Server 24.04 LTS",
    "Ubuntu Desktop 20.04 LTS",
    "Ubuntu Desktop 22.04 LTS",
    "Ubuntu Desktop 24.04 LTS",
    
    // Linux Debian
    "Debian 10 (Buster)",
    "Debian 11 (Bullseye)",
    "Debian 12 (Bookworm)",
    "Debian 13 (Trixie)",
    
    // Linux CentOS
    "CentOS 6",
    "CentOS 7",
    "CentOS 8",
    "CentOS Stream 8",
    "CentOS Stream 9",
    "CentOS Stream 10",
    
    // Red Hat
    "Red Hat Enterprise Linux 6",
    "Red Hat Enterprise Linux 7",
    "Red Hat Enterprise Linux 8",
    "Red Hat Enterprise Linux 9",
    "Red Hat Enterprise Linux 10",
    
    // SUSE
    "SUSE Linux Enterprise Server 12",
    "SUSE Linux Enterprise Server 15",
    "SUSE Linux Enterprise Server 16",
    "openSUSE Leap 15",
    "openSUSE Leap 16",
    "openSUSE Tumbleweed",
    
    // VMware
    "VMware ESXi 6.5",
    "VMware ESXi 6.7",
    "VMware ESXi 7.0",
    "VMware ESXi 8.0",
    "VMware ESXi 8.1",
    "VMware ESXi 8.2",
    "VMware vCenter Server 6.7",
    "VMware vCenter Server 7.0",
    "VMware vCenter Server 8.0",
    
    // Proxmox
    "Proxmox VE 6.x",
    "Proxmox VE 7.x",
    "Proxmox VE 8.x",
    
    // Autres Linux
    "AlmaLinux 8",
    "AlmaLinux 9",
    "Rocky Linux 8",
    "Rocky Linux 9",
    "Oracle Linux 7",
    "Oracle Linux 8",
    "Oracle Linux 9",
    "Fedora Server 37",
    "Fedora Server 38",
    "Fedora Server 39",
    "Fedora Server 40",
    
    // BSD
    "FreeBSD 12",
    "FreeBSD 13",
    "FreeBSD 14",
    "TrueNAS Core",
    "TrueNAS Scale",
    
    // Autres
    "Citrix XenServer 7.1",
    "Citrix XenServer 8.0",
    "Citrix XenServer 8.2",
    "Microsoft Hyper-V Server 2019",
    "Microsoft Hyper-V Server 2022",
    "Autre"
  ];

  const toggleServerExpansion = (index) => {
    // Ne pas basculer l'expansion si on vient de faire un drag
    if (!isDragging) {
      const newExpanded = new Set(expandedServers);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      setExpandedServers(newExpanded);
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
    // Trouver l'élément draggable parent (la carte)
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "0.5";
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    // Quand on survole un serveur, on veut réordonner, pas changer de site
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
    
    // Vérifier si le serveur est déjà dans ce site
    if (draggedIndex !== null) {
      const draggedItem = serveurs[draggedIndex];
      const currentSite = draggedItem.site || "Sans site";
      const targetSiteNormalized = siteName === "Sans site" ? "Sans site" : siteName;
      
      // Si le serveur est déjà dans ce site, on ne permet pas le drop
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

    const updated = [...serveurs];
    const draggedItem = updated[draggedIndex];
    
    // Si targetSite est "Sans site", on met une chaîne vide, sinon on met le nom du site
    const newSite = targetSite === "Sans site" ? "" : targetSite;
    
    // Vérifier si le serveur est déjà dans ce site
    const currentSite = draggedItem.site || "Sans site";
    const targetSiteNormalized = targetSite === "Sans site" ? "Sans site" : targetSite;
    
    // Si le serveur est déjà dans ce site, on ne fait rien
    if (currentSite === targetSiteNormalized) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragOverSite(null);
      setIsDragging(false);
      return;
    }
    
    // Si le site change, on met à jour le site du serveur
    draggedItem.site = newSite;

    // Mettre à jour les expandedServers (l'index reste le même car on change juste le site)
    const newExpanded = new Set(expandedServers);

    setForm((prev) => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: updated,
      },
    }));

    setExpandedServers(newExpanded);

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

    const updated = [...serveurs];
    const draggedItem = updated[draggedIndex];
    const dropItem = updated[dropIndex];
    const draggedSite = draggedItem.site || "Sans site";
    const dropSite = dropItem.site || "Sans site";
    
    // Si les sites sont différents, changer le site du serveur glissé
    if (draggedSite !== dropSite) {
      // Mettre à jour le site du serveur
      draggedItem.site = dropSite === "Sans site" ? "" : dropSite;
    }

    // Réordonner les serveurs (dans le même site maintenant)
    updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    // Mettre à jour les expandedServers pour conserver l'état d'expansion
    const newExpanded = new Set();
    expandedServers.forEach((oldIndex) => {
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
    setExpandedServers(newExpanded);

    setForm((prev) => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: updated,
      },
    }));

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };

  const handleDragEnd = (e) => {
    // Restaurer l'opacité de la carte
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    // Réinitialiser isDragging après un petit délai pour éviter les conflits avec le clic
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  };

  // Fonction de validation d'unicité des noms
  const isNameUnique = (name, currentIndex) => {
    if (!name || !name.trim()) return true; // Nom vide est autorisé (sera invalidé par required)
    return !serveurs.some((srv, idx) => idx !== currentIndex && srv.nom?.trim() === name.trim());
  };

  const updateServeur = async (index, field, value) => {
    const updated = [...serveurs];
    updated[index][field] = value;

    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Serveurs: updated },
    }));

    // Ancienne logique de synchronisation automatique des mappings CheckMK supprimée :
    // le mapping est désormais piloté directement par les colonnes checkmk_* du serveur.
  };

  const updateServerBrand = (index, brand) => {
    const updated = [...serveurs];
    updated[index] = { ...updated[index], marque: brand, modele: "" };
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Serveurs: updated },
    }));
  };

  const findLinkedIndex = (server, excludeIndex = null) => {
    const byIndex = server.serverHA;
    if (byIndex !== null && byIndex !== undefined && serveurs[byIndex] && byIndex !== excludeIndex) {
      return byIndex;
    }
    if (server.serverHAName) {
      const found = serveurs.findIndex(
        (srv, idx) => idx !== excludeIndex && srv.nom && srv.nom === server.serverHAName
      );
      if (found !== -1) return found;
    }
    return null;
  };

  const activateHAMode = (serverIndex, targetIndex) => {
    const updated = [...serveurs];
    const source = updated[serverIndex];
    const target = updated[targetIndex];

    // Lier uniquement si deux serveurs physiques nommés et non déjà en HA
    if (
      !source ||
      !target ||
      source.type !== "physique" ||
      target.type !== "physique" ||
      !source.nom?.trim() ||
      !target.nom?.trim() ||
      source.modeHA ||
      target.modeHA
    ) {
      setHaLinkSource(null);
      return;
    }

    source.modeHA = true;
    source.serverHA = targetIndex;
    source.serverHAName = target.nom || "";
    source.roleHA = "Primary";

    target.modeHA = true;
    target.serverHA = serverIndex;
    target.serverHAName = source.nom || "";
    target.roleHA = "Secondary";

    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Serveurs: updated },
    }));
    setHaLinkSource(null);
  };

  const deactivateHAMode = (serverIndex) => {
    const updated = [...serveurs];
    const current = updated[serverIndex];
    if (!current) return;

    const linkedIndex = findLinkedIndex(current, serverIndex);

    current.modeHA = false;
    current.serverHA = null;
    current.serverHAName = "";
    current.roleHA = "";

    if (linkedIndex !== null && updated[linkedIndex]) {
      updated[linkedIndex].modeHA = false;
      updated[linkedIndex].serverHA = null;
      updated[linkedIndex].serverHAName = "";
      updated[linkedIndex].roleHA = "";
    }

    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Serveurs: updated },
    }));
    setHaLinkSource(null);
  };

  const toggleRole = (index, role) => {
    const updated = [...serveurs];
    const currentRoles = updated[index].role || [];
    
    if (currentRoles.includes(role)) {
      // Retirer le rôle
      updated[index].role = currentRoles.filter(r => r !== role);
    } else {
      // Ajouter le rôle
      updated[index].role = [...currentRoles, role];
    }
    
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Serveurs: updated },
    }));
  };

  const removeServeur = (index) => {
    const updated = [...serveurs];
    const removed = updated[index];

    // Nettoyer le pair HA si nécessaire
    if (removed && removed.modeHA) {
      const linkedIndex = findLinkedIndex(removed, index);
      if (linkedIndex !== null && updated[linkedIndex]) {
        updated[linkedIndex] = {
          ...updated[linkedIndex],
          modeHA: false,
          serverHA: null,
          serverHAName: "",
          roleHA: ""
        };
      }
    }

    updated.splice(index, 1);
    if (haLinkSource === index) {
      setHaLinkSource(null);
    }
    setForm((prev) => ({
      ...prev,
      equipements: { ...prev.equipements, Serveurs: updated },
    }));
  };

  const addServeur = (type) => {
    setForm((prev) => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: [
          ...serveurs,
          {
            id: `serveur-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID unique
            nom: "",
            role: [],
            type: type,
            systeme: "",
            ip: "",
            vlan: "",
            processeur: "",
            stockage: "",
            memoire: "",
            marque: "",
            modele: "",
            numeroSerie: "",
            expirationGarantie: "",
            modeHA: false,
            serverHA: null,
            serverHAName: "",
            roleHA: ""
          },
        ],
      },
    }));
    setShowTypeModalState(false);

    // Déplier automatiquement le nouveau serveur
    setTimeout(() => {
      setExpandedServers(new Set([...expandedServers, serveurs.length]));
    }, 100);
  };

  const countPhysiques = serveurs.filter((s) => s.type === "physique").length;
  const countVirtuels = serveurs.filter((s) => s.type === "virtuel").length;

  // Fonction pour formater l'affichage des rôles
  const formatRoles = (roles) => {
    // S'assurer que roles est un tableau
    if (!Array.isArray(roles)) {
      // Si c'est une string, la convertir en tableau
      if (typeof roles === 'string' && roles.trim()) {
        return roles;
      }
      return 'Aucun rôle défini';
    }
    
    if (roles.length === 0) return 'Aucun rôle défini';
    if (roles.length === 1) return roles[0];
    if (roles.length === 2) return roles.join(' & ');
    return roles.slice(0, -1).join(', ') + ' & ' + roles[roles.length - 1];
  };

  // Récupérer les sites du client depuis la base de données
  const clientSites = form.sites || [];
  
  // Récupérer les sites utilisés dans les serveurs
  const serverSites = serveurs
    .map(srv => srv.site)
    .filter(site => site && site.trim() !== "")
    .filter((site, index, self) => self.indexOf(site) === index); // Dédupliquer

  // Combiner les sites du client et ceux des serveurs
  const allAvailableSites = [...new Set([...clientSites, ...serverSites])];

  // Grouper les serveurs par site
  const groupedBySite = serveurs.reduce((acc, srv, index) => {
    const site = srv.site || "Sans site";
    if (!acc[site]) {
      acc[site] = [];
    }
    acc[site].push({ ...srv, originalIndex: index });
    return acc;
  }, {});

  // Créer un tableau trié des sites (Sans site en premier) en affichant toujours les lieux même vides
  let sortedSites = ["Sans site", ...allAvailableSites]
    .filter((site, index, self) => self.indexOf(site) === index)
    .sort((a, b) => {
      if (a === "Sans site") return -1;
      if (b === "Sans site") return 1;
      return a.localeCompare(b);
    });

  // Retirer "Sans site" s'il n'y a aucun serveur dedans
  if ((groupedBySite["Sans site"] || []).length === 0) {
    sortedSites = sortedSites.filter(site => site !== "Sans site");
  }

  return (
    <motion.div
      className={styles.stepContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "circOut" }}
      style={{ display: "flex", flexDirection: "column", width: "100%" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1, minHeight: 0 }}>
          {sortedSites.length === 0 ? (
            <div style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              background: '#f9fafb',
              border: '2px dashed #d1d5db',
              borderRadius: '12px',
              color: '#6b7280'
            }}>
              <Icon icon="mingcute:server-fill" width={48} height={48} color="#9ca3af" style={{ marginBottom: '1rem' }} />
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1a1a1a' }}>
                Aucun serveur configuré
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                Ajoutez un serveur pour commencer.
              </p>
            </div>
          ) : (
            sortedSites.map((siteName) => {
              const siteServers = groupedBySite[siteName] || [];
              return (
                <div key={siteName} style={{ marginBottom: '0.5rem' }}>
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
                        {siteServers.length} serveur{siteServers.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {siteServers.length === 0 && (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: '#f9fafb',
                        border: '2px dashed #d1d5db',
                        borderRadius: '10px',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        Aucun serveur dans ce site. Glissez-déposez un serveur ici.
                      </div>
                    )}
                    {siteServers.map((server, siteIndex) => {
                      const i = server.originalIndex; // Index original dans le tableau serveurs
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  background: expandedServers.has(i) ? '#f9fafb' : 'transparent',
                  transition: 'background 0.2s ease'
                }}
                onClick={(e) => {
                  if (isDragging) return;
                  if (haLinkSource !== null) {
                    if (haLinkSource !== i) {
                      const sourceSrv = serveurs[haLinkSource];
                      const targetSrv = serveurs[i];
                      const canLink =
                        sourceSrv && targetSrv &&
                        sourceSrv.type === "physique" &&
                        targetSrv.type === "physique" &&
                        sourceSrv.nom?.trim() &&
                        targetSrv.nom?.trim() &&
                        !sourceSrv.modeHA &&
                        !targetSrv.modeHA;
                      if (canLink) {
                        activateHAMode(haLinkSource, i);
                      } else {
                        setHaLinkSource(null);
                      }
                    } else {
                      setHaLinkSource(null);
                    }
                    return;
                  }
                  toggleServerExpansion(i);
                }}
              >
                <div style={{ color: '#9ca3af', cursor: 'grab' }}>
                  <GripVertical size={18} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {server.type === 'physique' ? (
                    <FaServer size={24} color="#1a1a1a" />
                  ) : (
                    <FaCube size={24} color="#1a1a1a" />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '600',
                      color: '#1a1a1a',
                      fontSize: '0.95rem',
                      marginBottom: '0.25rem'
                    }}>
                      {server.nom || `Serveur ${i + 1}`}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#6b7280',
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      {[
                        formatRoles(server.role) !== 'Aucun rôle défini' && formatRoles(server.role),
                        server.ip,
                        server.systeme
                      ].filter(Boolean).map((item, idx) => (
                        <span key={idx}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {server.type === 'physique' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (server.modeHA) {
                          deactivateHAMode(i);
                          return;
                        }
                        if (!server.nom?.trim()) return;
                        if (haLinkSource === i) {
                          setHaLinkSource(null);
                          return;
                        }
                        setHaLinkSource(i);
                      }}
                      title={
                        server.modeHA
                          ? "Désactiver HA"
                          : haLinkSource === i
                            ? "Cliquez sur un autre serveur physique pour le lier"
                            : "Activer HA : cliquez ensuite sur un autre serveur physique"
                      }
                      style={{
                        padding: '0.5rem',
                        background: server.modeHA
                          ? '#10b981'
                          : haLinkSource === i
                            ? '#0ea5e9'
                            : '#9ca3af',
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
                      <Icon
                        icon={
                          server.modeHA
                            ? "mdi:lan-check"
                            : haLinkSource === i
                              ? "mdi:lan-pending"
                              : "mdi:lan-connect"
                        }
                        width={14}
                        height={14}
                      />
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeServeur(i);
                    }}
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
                    title="Supprimer"
                  >
                    <Icon icon="mdi:delete" width={20} height={20} />
                  </button>
                </div>
              </div>
              

              {expandedServers.has(i) && (
                <div style={{
                  padding: '1rem',
                  background: '#ffffff',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        NetBIOS <span style={{color: '#ef4444'}}>*</span>
                      </label>
                      <input
                        type="text"
                        value={server.nom || ""}
                        onChange={(e) => updateServeur(i, "nom", e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: `2px solid ${
                            !isNameUnique(server.nom, i) ? '#ef4444' :
                            (!server.nom || !server.nom.trim() ? '#ef4444' : '#e0e0e0')
                          }`,
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: !isNameUnique(server.nom, i) ? '1rem' : '0.9rem',
                          fontWeight: !isNameUnique(server.nom, i) ? 'bold' : 'normal'
                        }}
                      />
                      {!isNameUnique(server.nom, i) && (
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

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        Système d'exploitation <span style={{color: '#ef4444'}}>*</span>
                      </label>
                      <select
                        value={server.systeme || ""}
                        onChange={(e) => updateServeur(i, "systeme", e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: `1px solid ${!server.systeme || !server.systeme.trim() ? '#ef4444' : '#e0e0e0'}`,
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="">Sélectionnez un OS</option>
                        {osOptions.map((os) => (
                          <option key={os} value={os}>
                            {os}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        Rôles <span style={{color: '#ef4444'}}>*</span>
                      </label>
                      <RoleTagsSelect
                        groups={SERVER_ROLE_GROUPS}
                        options={SERVER_ROLE_OPTIONS}
                        value={Array.isArray(server.role) ? server.role : []}
                        onChange={(selected) => updateServeur(i, "role", selected)}
                        placeholder="Sélectionnez les rôles"
                      />
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        Adresse IP <span style={{color: '#ef4444'}}>*</span>
                      </label>
                      <input
                        type="text"
                        value={server.ip || ""}
                        onChange={(e) => updateServeur(i, "ip", e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: `1px solid ${!server.ip || !server.ip.trim() ? '#ef4444' : '#e0e0e0'}`,
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        VLAN
                      </label>
                      <input
                        type="text"
                        value={server.vlan || ""}
                        onChange={(e) => updateServeur(i, "vlan", e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  </div>

                  {server.type === 'physique' && (
                    <>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <BrandModelFields
                          catalog={SERVER_CATALOG}
                          manufacturer={server.marque}
                          model={server.modele}
                          manufacturerId={`srv-marque-${i}`}
                          modelId={`srv-modele-${i}`}
                          labelStyle={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#1a1a1a'
                          }}
                          fieldStyle={{ minWidth: 0 }}
                          inputStyle={{
                            width: '100%',
                            padding: '0.6rem 0.75rem',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            background: '#ffffff',
                            color: '#1a1a1a',
                            fontSize: '0.9rem'
                          }}
                          onManufacturerChange={(value) => updateServerBrand(i, value)}
                          onModelChange={(value) => updateServeur(i, "modele", value)}
                        />

                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#1a1a1a'
                          }}>
                            N° Série
                          </label>
                          <input
                            type="text"
                            value={server.numeroSerie || ""}
                            onChange={(e) => updateServeur(i, "numeroSerie", e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.6rem 0.75rem',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              background: '#ffffff',
                              color: '#1a1a1a',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#1a1a1a'
                        }}>
                          Garantie (expiration)
                        </label>
                        <input
                          type="date"
                          value={server.expirationGarantie || ""}
                          onChange={(e) => updateServeur(i, "expirationGarantie", e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.75rem',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            background: '#ffffff',
                            color: '#1a1a1a',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        {server.type === 'virtuel' ? 'VCPU' : 'CPU'}
                      </label>
                      <input
                        type="text"
                        value={server.processeur || ""}
                        onChange={(e) => updateServeur(i, "processeur", e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        RAM (GB)
                      </label>
                      <input
                        type="number"
                        value={server.memoire || ""}
                        onChange={(e) => updateServeur(i, "memoire", e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        Stockage (GB)
                      </label>
                      <input
                        type="number"
                        value={server.stockage || ""}
                        onChange={(e) => updateServeur(i, "stockage", e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  </div>
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
      </div>

      {/* Modal de sélection du type de serveur */}
      {showTypeModalState && (
        <div className={equipmentModalStyles.modalOverlay} onClick={() => setShowTypeModalState(false)}>
          <div
            className={equipmentModalStyles.modalContent}
            style={{ maxWidth: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={equipmentModalStyles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon icon="mingcute:server-fill" className={equipmentModalStyles.modalIcon} style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                <h3>Ajouter un serveur</h3>
              </div>
              <button
                className={equipmentModalStyles.closeButton}
                onClick={() => setShowTypeModalState(false)}
                title="Fermer"
              >
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={equipmentModalStyles.modalBody}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem'
              }}>
                {[
                  { label: "Physique", icon: <FaServer size={40} color="#1a1a1a" />, type: "physique" },
                  { label: "Virtuel", icon: <FaCube size={40} color="#1a1a1a" />, type: "virtuel" }
                ].map(({ label, icon, type }) => (
                  <button
                    key={label}
                    onClick={() => addServeur(type)}
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
                    {icon}
                    <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.9rem' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
};

export default StepServeurs;
