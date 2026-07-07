// ──────────────────────────────
// 📦 Dépendances & Composants internes
// ──────────────────────────────
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaTimes, FaSync, FaCheck, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../../config";
import ConfirmationModal from "../../../Misc/ConfirmationModal/ConfirmationModal";
import adminStyles from "../../AdminPanel.module.css";

const CheckMKMappingModal = ({ isOpen, onClose, equipmentName, equipmentType, equipmentIndex, equipmentId, clientId, onMappingSaved, requireService = true, allowTemporaryId = false }) => {
  const ACCENT_COLOR = '#15d1a0';
  const ACCENT_SHADOW = '0 0 0 3px rgba(21, 209, 160, 0.1)';
  const ACCENT_HIGHLIGHT = 'rgba(21, 209, 160, 0.1)';
  const [checkmkHosts, setCheckmkHosts] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [selectedHost, setSelectedHost] = useState("");
  const [checkmkServices, setCheckmkServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [site, setSite] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentMapping, setCurrentMapping] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Charger le mapping existant et la liste des hosts
  useEffect(() => {
    if (!isOpen || !clientId || !equipmentName) {
      // Réinitialiser les états quand le modal est fermé
      if (!isOpen) {
        setCurrentMapping(null);
        setSelectedHost("");
        setSelectedService("");
        setCheckmkServices([]);
        setSite("");
        setSearchTerm("");
        setServiceSearchTerm("");
      }
      return;
    }

    const loadData = async () => {
      // Charger le mapping existant
      try {
        const mappingResponse = await fetch(`${API_BASE_URL}/checkmk/mapping/${clientId}`, {
          credentials: 'include'
        });
        
        if (mappingResponse.ok) {
          const mappings = await mappingResponse.json();
          // Rechercher le mapping par type et ID (priorité), ou nom (fallback)
          let existingMapping = null;

          // 1. Priorité : mapping avec equipment_id correspondant
          if (equipmentId) {
            existingMapping = mappings.find(
              m => m.equipment_type === equipmentType &&
                   m.equipment_id === equipmentId
            );
          }

          // 2. Fallback : mapping avec même nom et sans equipment_id
          if (!existingMapping) {
            existingMapping = mappings.find(
              m => m.equipment_type === equipmentType &&
                   m.equipment_name === equipmentName &&
                   !m.equipment_id // Uniquement les mappings sans ID
            );
          }
          
          if (existingMapping) {
            setCurrentMapping(existingMapping);
            setSelectedHost(existingMapping.checkmk_host_name);
            setSite(existingMapping.checkmk_site || "");
            // Charger les services du host mappé, puis pré-sélectionner le service existant
            if (existingMapping.checkmk_host_name && requireService) {
              const existingServiceName = existingMapping.checkmk_service_name || "";
              await loadCheckMKServices(existingMapping.checkmk_host_name, existingServiceName);
            } else {
              const serviceName = existingMapping.checkmk_service_name || "";
              setSelectedService(serviceName);
            }
          } else {
            // Pas de mapping existant, réinitialiser
            setCurrentMapping(null);
            setSelectedHost("");
            setSelectedService("");
            setCheckmkServices([]);
            setSite("");
          }
        }
      } catch (error) {
        console.error('Erreur chargement mapping:', error);
      }

      // Charger la liste des hosts Check MK
      await loadCheckMKHosts();
    };

    loadData();
  }, [isOpen, clientId, equipmentName, equipmentType, requireService]);

  // Pré-sélectionner le service après le chargement des services
  useEffect(() => {
    if (currentMapping && currentMapping.checkmk_service_name && checkmkServices.length > 0) {
      const mappingServiceName = currentMapping.checkmk_service_name;
      
      const foundService = checkmkServices.find(s => 
        s.toLowerCase() === mappingServiceName.toLowerCase() ||
        s === mappingServiceName
      );
      
      if (foundService && selectedService !== foundService) {
        setSelectedService(foundService);
      } else if (mappingServiceName && !foundService && selectedService !== mappingServiceName) {
        // Si le service n'est pas trouvé exactement, essayer quand même
        setSelectedService(mappingServiceName);
      }
    }
  }, [checkmkServices, currentMapping]);

  const loadCheckMKHosts = async () => {
    setLoadingHosts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/checkmk/hosts`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Adapter selon la structure de la réponse Check MK
        const hosts = data.value || data.items || data || [];
        const hostNames = hosts.map(host => {
          if (typeof host === 'string') return host;
          return host.id || host.name || host.hostname || host.title || host;
        }).filter(Boolean);
        setCheckmkHosts(hostNames);
      } else {
        toast.error('Impossible de charger les hosts Check MK');
      }
    } catch (error) {
      console.error('Erreur chargement hosts Check MK:', error);
      toast.error('Erreur lors du chargement des hosts Check MK');
    } finally {
      setLoadingHosts(false);
    }
  };

  const loadCheckMKServices = async (hostName, serviceToSelect = null) => {
    if (!hostName || !requireService) return;
    
    setLoadingServices(true);
    setCheckmkServices([]);
    // Ne pas réinitialiser selectedService si on a un service à pré-sélectionner
    if (!serviceToSelect) {
      setSelectedService("");
    }
    try {
      const response = await fetch(`${API_BASE_URL}/checkmk/services/${encodeURIComponent(hostName)}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const services = data.services || [];
        const serviceNames = services.map(service => {
          if (typeof service === 'string') return service;
          return service.id || service.title || service.name || service;
        }).filter(Boolean);
        setCheckmkServices(serviceNames);
        
        // Pré-sélectionner le service si fourni et présent dans la liste
        if (serviceToSelect && serviceToSelect.trim()) {
          // Vérifier si le service existe dans la liste (comparaison insensible à la casse)
          const foundService = serviceNames.find(s => 
            s.toLowerCase() === serviceToSelect.toLowerCase().trim() ||
            s === serviceToSelect.trim()
          );
          
          if (foundService) {
            // Utiliser setTimeout pour s'assurer que l'état est mis à jour après setCheckmkServices
            setTimeout(() => {
              setSelectedService(foundService);
            }, 0);
          } else {
            console.warn('[CheckMKMappingModal] Service non trouvé dans la liste, sélection directe:', serviceToSelect.trim());
            // Si le service n'est pas trouvé, essayer de le sélectionner quand même
            // (peut-être que le format est légèrement différent)
            setTimeout(() => {
              setSelectedService(serviceToSelect.trim());
            }, 0);
          }
        }
      } else {
        toast.error('Impossible de charger les services Check MK');
      }
    } catch (error) {
      console.error('Erreur chargement services Check MK:', error);
      toast.error('Erreur lors du chargement des services Check MK');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleSave = async () => {
    if (!selectedHost.trim()) {
      toast.error('Veuillez sélectionner un host Check MK');
      return;
    }

    if (requireService && !selectedService.trim()) {
      toast.error('Veuillez sélectionner un service Check MK');
      return;
    }

    if (!clientId) {
      toast.error('ID client manquant');
      return;
    }

    setSaving(true);
    try {
      // Utiliser equipmentId en priorité, fallback sur equipmentIndex pour backward compatibility
      const finalEquipmentId = equipmentId || equipmentIndex;
      
      // Vérifier que l'ID est défini et n'est pas null/undefined (accepte 0 comme valide)
      if (finalEquipmentId === null || finalEquipmentId === undefined || finalEquipmentId === '') {
        console.error('❌ Equipment ID manquant:', { equipmentId, equipmentIndex, equipmentType, equipmentName });
        toast.error('ID de l\'équipement manquant. Veuillez sauvegarder l\'équipement avant de le mapper.');
        setSaving(false);
        return;
      }
      
      // Vérifier que l'ID n'est pas un ID temporaire (commence par "switch-", "firewall-", etc.)
      if (!allowTemporaryId && typeof finalEquipmentId === 'string' && finalEquipmentId.match(/^(switch|firewall|server|wifi|nas)-/)) {
        toast.error('Veuillez d\'abord sauvegarder l\'équipement avant de le mapper avec CheckMK.');
        setSaving(false);
        return;
      }
      
      const mappingData = {
        client_id: clientId,
        equipment_type: equipmentType,
        equipment_id: finalEquipmentId, // ID unique de l'équipement
        checkmk_host_name: selectedHost.trim(),
        checkmk_site: site.trim() || null,
        is_active: true
      };
      
      console.log('📤 Envoi mapping CheckMK:', mappingData);

      // Ajouter le service s'il est sélectionné (toujours pour requireService=true, optionnel sinon)
      if (selectedService && selectedService.trim()) {
        mappingData.checkmk_service_name = selectedService.trim();
      }

      const response = await fetch(`${API_BASE_URL}/checkmk/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(mappingData)
      });

      if (response.ok) {
        const newMapping = await response.json();
        setCurrentMapping(newMapping);
        toast.success('Mapping Check MK sauvegardé avec succès');
        if (onMappingSaved) {
          onMappingSaved(newMapping);
        }
        // Fermer le modal après sauvegarde réussie
        onClose();
      } else {
        const error = await response.json();
        toast.error(`Erreur: ${error.error || 'Impossible de sauvegarder le mapping'}`);
      }
    } catch (error) {
      console.error('Erreur sauvegarde mapping:', error);
      toast.error('Erreur lors de la sauvegarde du mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentMapping) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!currentMapping) return;

    try {
      const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${currentMapping.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setCurrentMapping(null);
        setSelectedHost("");
        setSelectedService("");
        setCheckmkServices([]);
        setSite("");
        setSearchTerm("");
        setServiceSearchTerm("");
        toast.success('Mapping supprimé avec succès');
        if (onMappingSaved) {
          onMappingSaved(null);
        }
        // Fermer le modal après suppression
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(`Erreur lors de la suppression du mapping: ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur suppression mapping:', error);
      toast.error('Erreur lors de la suppression du mapping');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const deleteMappingDirectly = async () => {
    if (!currentMapping) {
      // Pas de mapping, juste désélectionner
      setSelectedHost("");
      setSelectedService("");
      setCheckmkServices([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${currentMapping.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setCurrentMapping(null);
        setSelectedHost("");
        setSelectedService("");
        setCheckmkServices([]);
        setSite("");
        toast.success('Mapping supprimé avec succès');
        if (onMappingSaved) {
          onMappingSaved(null);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(`Erreur lors de la suppression du mapping: ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur suppression mapping:', error);
      toast.error('Erreur lors de la suppression du mapping');
    }
  };

  const filteredHosts = checkmkHosts.filter(host =>
    host.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trier pour mettre le host sélectionné en premier
  const sortedHosts = [...filteredHosts].sort((a, b) => {
    if (a === selectedHost) return -1;
    if (b === selectedHost) return 1;
    return 0;
  });

  if (!isOpen) return null;

  return (
    <div
      className={adminStyles.modalOverlay}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className={adminStyles.modalContent}
        style={{
          maxWidth: '1000px',
          height: '650px',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div className={adminStyles.modalHeader}>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.125rem', 
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '0.25rem'
            }}>
              Mapping Check MK
            </h3>
            <p style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: '#6b7280',
              fontWeight: '400'
            }}>
              {equipmentName} • {equipmentType}
            </p>
          </div>
          <button
            onClick={onClose}
            className={adminStyles.closeButton}
            title="Fermer"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className={adminStyles.modalBody} style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          gap: '1rem'
        }}>

          {/* Layout en deux colonnes pour Host et Service (si requis) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: requireService && selectedHost ? '1fr 1fr' : '1fr',
            gap: '1rem',
            flex: 1,
            minHeight: 0
          }}>

            {/* Sélection du host */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: '600',
                color: '#1a1a1a',
                letterSpacing: '0.01em'
              }}>
                Host Check MK <span style={{ color: '#ef4444' }}>*</span>
              </label>
            
              {/* Barre de recherche */}
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Rechercher un host..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 2rem 0.5rem 0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#1a1a1a',
                    fontSize: '0.8125rem',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = ACCENT_COLOR;
                    e.target.style.boxShadow = ACCENT_SHADOW;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <FaSearch style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '0.75rem',
                  zIndex: 1,
                  pointerEvents: 'none'
                }} />
              </div>

              {/* Liste des hosts */}
              <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                background: '#ffffff',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                position: 'relative',
                zIndex: 1
              }}>
                {loadingHosts ? (
                  <div style={{ 
                    padding: '1.5rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem'
                  }}>
                    <FaSync style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Chargement...</span>
                  </div>
                ) : sortedHosts.length === 0 ? (
                  <div style={{ 
                    padding: '1.5rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    fontSize: '0.8125rem'
                  }}>
                    {searchTerm ? 'Aucun host trouvé' : 'Aucun host disponible'}
                  </div>
                ) : (
                  sortedHosts.map((host, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        // Si le host est déjà sélectionné, le désélectionner (supprimer le mapping)
                        if (selectedHost === host) {
                          deleteMappingDirectly();
                        } else {
                          setSelectedHost(host);
                          setSelectedService("");
                          setCheckmkServices([]);
                          if (requireService) {
                            loadCheckMKServices(host, null);
                          }
                        }
                      }}
                      style={{
                        padding: '0.625rem 0.75rem',
                        cursor: 'pointer',
                        borderBottom: idx < sortedHosts.length - 1 ? '1px solid #e0e0e0' : 'none',
                        background: selectedHost === host ? ACCENT_COLOR : 'transparent',
                        color: selectedHost === host ? 'white' : '#1a1a1a',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: selectedHost === host ? '600' : '400',
                        fontSize: '0.8125rem'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedHost !== host) {
                          e.target.style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedHost !== host) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      <span>{host}</span>
                      {selectedHost === host && (
                        <FaCheck style={{ fontSize: '0.75rem', color: 'white' }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sélection du service (seulement si requis) */}
            {requireService && selectedHost && (
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  letterSpacing: '0.01em'
                }}>
                  Service Check MK <span style={{ color: '#ef4444' }}>*</span>
                </label>
                
                {/* Barre de recherche pour les services */}
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Rechercher un service..."
                    value={serviceSearchTerm}
                    onChange={(e) => setServiceSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 2rem 0.5rem 0.75rem',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      background: '#ffffff',
                      color: '#1a1a1a',
                      fontSize: '0.8125rem',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = ACCENT_COLOR;
                      e.target.style.boxShadow = ACCENT_SHADOW;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <FaSearch style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '0.75rem',
                    zIndex: 1,
                    pointerEvents: 'none'
                  }} />
                </div>

                {/* Liste des services */}
                <div style={{
                  flex: 1,
                  minHeight: '200px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  background: '#ffffff',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {loadingServices ? (
                    <div style={{ 
                      padding: '1.5rem', 
                      textAlign: 'center', 
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem'
                    }}>
                      <FaSync style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Chargement...</span>
                    </div>
                  ) : (() => {
                    const filteredServices = checkmkServices.filter(service => 
                      service.toLowerCase().includes(serviceSearchTerm.toLowerCase())
                    );
                    // Trier pour mettre le service sélectionné en premier
                    const sortedServices = [...filteredServices].sort((a, b) => {
                      if (a === selectedService) return -1;
                      if (b === selectedService) return 1;
                      return 0;
                    });
                    
                    if (sortedServices.length === 0) {
                      return (
                        <div style={{ 
                          padding: '1.5rem', 
                          textAlign: 'center', 
                          color: '#6b7280',
                          fontSize: '0.8125rem'
                        }}>
                          {serviceSearchTerm ? 'Aucun service trouvé' : 'Aucun service disponible'}
                        </div>
                      );
                    }
                    
                    return sortedServices.map((service, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedService(service)}
                        style={{
                          padding: '0.625rem 0.75rem',
                          cursor: 'pointer',
                          borderBottom: idx < sortedServices.length - 1 ? '1px solid #e0e0e0' : 'none',
                          background: selectedService === service ? ACCENT_COLOR : 'transparent',
                          color: selectedService === service ? 'white' : '#1a1a1a',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontWeight: selectedService === service ? '600' : '400',
                          fontSize: '0.8125rem'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedService !== service) {
                            e.target.style.background = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedService !== service) {
                            e.target.style.background = 'transparent';
                          }
                        }}
                      >
                        <span>{service}</span>
                        {selectedService === service && (
                          <FaCheck style={{ fontSize: '0.75rem', color: 'white' }} />
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className={adminStyles.modalActions}>
          <button
            onClick={handleSave}
            disabled={saving || !selectedHost.trim() || (requireService && !selectedService.trim())}
            className={adminStyles.primaryButton}
            style={{
              opacity: saving || !selectedHost.trim() || (requireService && !selectedService.trim()) ? 0.6 : 1,
              cursor: saving || !selectedHost.trim() || (requireService && !selectedService.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? (
              <FaSync style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <FaCheck />
            )}
          </button>
        </div>
      </motion.div>

      {/* Modal de confirmation de suppression */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Supprimer le mapping"
        message="Êtes-vous sûr de vouloir supprimer ce mapping Check MK ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmColor="#ef4444"
      />
    </div>
  );
};

export default CheckMKMappingModal;

