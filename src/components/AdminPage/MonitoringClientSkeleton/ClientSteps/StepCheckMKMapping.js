// ──────────────────────────────
// 📦 Dépendances & Composants internes
// ──────────────────────────────
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaCheck, FaTimes, FaSync, FaSearch, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import styles from "./Form.module.css";
import API_BASE_URL from "../../../../config";
import ConfirmationModal from "../../../Misc/ConfirmationModal/ConfirmationModal";

const StepCheckMKMapping = ({ form, setForm }) => {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkmkHosts, setCheckmkHosts] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [checkmkConfigured, setCheckmkConfigured] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Récupérer tous les équipements du client
  const getAllEquipments = () => {
    const equipments = [];
    
    // Types d'équipements à mapper
    const equipmentTypes = [
      { key: 'Serveurs', array: form.equipements?.Serveurs || [] },
      { key: 'Firewalls', array: form.equipements?.Firewalls || [] },
      { key: 'Switch', array: form.equipements?.Switch || [] },
      { key: 'BorneWifi', array: form.equipements?.BorneWifi || [] },
      { key: 'NAS', array: form.equipements?.NAS || [] },
    ];

    equipmentTypes.forEach(({ key, array }) => {
      if (Array.isArray(array) && array.length > 0) {
        array.forEach((item) => {
          const equipmentName = item.nom || item.name || 'Sans nom';
          equipments.push({
            type: key,
            name: equipmentName,
            equipment_id: item.id,
            equipment: item
          });
        });
      }
    });

    return equipments;
  };

  // Charger les mappings existants
  useEffect(() => {
    const loadMappings = async () => {
      if (!form.id) return;
      
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${form.id}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setMappings(data);
        } else if (response.status === 401) {
          // Non authentifié, ignorer silencieusement
        } else {
          console.error('Erreur chargement mappings:', response.statusText);
        }
      } catch (error) {
        console.error('Erreur chargement mappings:', error);
      } finally {
        setLoading(false);
      }
    };

    // Vérifier si Check MK est configuré
    const checkConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/hosts`, {
          credentials: 'include'
        });
        if (response.ok) {
          setCheckmkConfigured(true);
        }
      } catch (error) {
        setCheckmkConfigured(false);
      }
    };

    loadMappings();
    checkConfig();
  }, [form.id]);

  // Charger la liste des hosts Check MK
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
        setCheckmkHosts(hosts.map(host => host.id || host.name || host.hostname || host));
      } else {
        console.error('Erreur chargement hosts Check MK:', response.statusText);
      }
    } catch (error) {
      console.error('Erreur chargement hosts Check MK:', error);
    } finally {
      setLoadingHosts(false);
    }
  };

  // Trouver le mapping pour un équipement
  const getMappingForEquipment = (equipmentType, equipmentId) => {
    return mappings.find(
      m => m.equipment_type === equipmentType && m.equipment_id === equipmentId
    );
  };

  // Sauvegarder ou créer un mapping
  const saveMapping = async (equipmentType, equipmentId, equipmentName, checkmkHostName, checkmkSite = '') => {
    if (!form.id || !checkmkHostName.trim()) return;

    setSaving(true);
    try {
      const existingMapping = getMappingForEquipment(equipmentType, equipmentId);
      
      const response = await fetch(`${API_BASE_URL}/checkmk/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          client_id: form.id,
          equipment_type: equipmentType,
          equipment_id: equipmentId,
          equipment_name: equipmentName,
          checkmk_host_name: checkmkHostName.trim(),
          checkmk_site: checkmkSite.trim() || null,
          is_active: true
        })
      });

      if (response.ok) {
        const newMapping = await response.json();
        
        // Mettre à jour la liste des mappings
        if (existingMapping) {
          setMappings(mappings.map(m => 
            m.id === existingMapping.id ? newMapping : m
          ));
        } else {
          setMappings([...mappings, newMapping]);
        }
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

  // Supprimer un mapping
  const deleteMapping = async (mappingId) => {
    setConfirmDeleteId(mappingId);
  };

  // Confirmer la suppression
  const confirmDeleteMapping = async () => {
    if (!confirmDeleteId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${confirmDeleteId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setMappings(mappings.filter(m => m.id !== confirmDeleteId));
        toast.success('Mapping supprimé avec succès');
      } else {
        toast.error('Erreur lors de la suppression du mapping');
      }
    } catch (error) {
      console.error('Erreur suppression mapping:', error);
      toast.error('Erreur lors de la suppression du mapping');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const toggleExpansion = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const equipments = getAllEquipments();
  const filteredEquipments = equipments.filter(eq => 
    eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!checkmkConfigured) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <FaExclamationTriangle style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '0.5rem' }}>Check MK non configuré</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Veuillez configurer Check MK dans les paramètres globaux avant de créer des mappings.
        </p>
      </div>
    );
  }

  if (equipments.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          Aucun équipement configuré. Configurez d'abord vos équipements (Serveurs, Firewalls, etc.) avant de créer des mappings Check MK.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={styles.stepContainer}
    >
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Mapping Check MK</h2>
        <p className={styles.stepDescription}>
          Associez vos équipements Veritas aux hosts Check MK pour récupérer automatiquement les statistiques de monitoring.
        </p>
      </div>

      {/* Barre de recherche */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <FaSearch style={{ 
            position: 'absolute', 
            left: '1rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)'
          }} />
          <input
            type="text"
            placeholder="Rechercher un équipement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}
          />
        </div>
      </div>

      {/* Bouton pour charger les hosts Check MK */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={loadCheckMKHosts}
          disabled={loadingHosts}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loadingHosts ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FaSync style={{ animation: loadingHosts ? 'spin 1s linear infinite' : 'none' }} />
          {loadingHosts ? 'Chargement...' : 'Charger les hosts Check MK'}
        </button>
        {checkmkHosts.length > 0 && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {checkmkHosts.length} host(s) disponible(s)
          </span>
        )}
      </div>

      {/* Liste des équipements */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Chargement des mappings...
          </div>
        ) : filteredEquipments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Aucun équipement trouvé
          </div>
        ) : (
          filteredEquipments.map((equipment, index) => {
            const mapping = getMappingForEquipment(equipment.type, equipment.equipment_id);
            const isExpanded = expandedItems.has(index);
            
            return (
              <motion.div
                key={`${equipment.type}-${equipment.name}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  overflow: 'hidden'
                }}
              >
                {/* En-tête de l'équipement */}
                <div
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--bg-tertiary)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => toggleExpansion(index)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.5rem',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        borderRadius: '4px',
                        fontWeight: '500'
                      }}>
                        {equipment.type}
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{equipment.name}</strong>
                    </div>
                    {mapping && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        <FaCheck style={{ color: '#10b981', marginRight: '0.25rem' }} />
                        Mappé vers: <strong>{mapping.checkmk_host_name}</strong>
                        {mapping.checkmk_site && ` (Site: ${mapping.checkmk_site})`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {mapping && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMapping(mapping.id);
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        <FaTimes />
                      </button>
                    )}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* Contenu expandable */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{
                      padding: '1rem',
                      borderTop: '1px solid var(--border-primary)',
                      background: 'var(--bg-tertiary)'
                    }}
                  >
                    <EquipmentMappingForm
                      equipment={equipment}
                      mapping={mapping}
                      checkmkHosts={checkmkHosts}
                      onSave={saveMapping}
                      saving={saving}
                    />
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmationModal
        isOpen={confirmDeleteId !== null}
        onConfirm={confirmDeleteMapping}
        onCancel={() => setConfirmDeleteId(null)}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer ce mapping ? Cette action ne peut pas être annulée."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmColor="danger"
      />
    </motion.div>
  );
};

// Composant pour le formulaire de mapping d'un équipement
const EquipmentMappingForm = ({ equipment, mapping, checkmkHosts, onSave, saving }) => {
  const [hostName, setHostName] = useState(mapping?.checkmk_host_name || '');
  const [site, setSite] = useState(mapping?.checkmk_site || '');
  const [showHostDropdown, setShowHostDropdown] = useState(false);

  useEffect(() => {
    if (mapping) {
      setHostName(mapping.checkmk_host_name);
      setSite(mapping.checkmk_site || '');
    }
  }, [mapping]);

  const handleSave = () => {
    if (hostName.trim()) {
      onSave(equipment.type, equipment.equipment_id, equipment.name, hostName, site);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '0.5rem', 
          fontSize: '0.875rem',
          fontWeight: '500',
          color: 'var(--text-primary)'
        }}>
          Host Check MK *
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            onFocus={() => setShowHostDropdown(checkmkHosts.length > 0)}
            placeholder="Nom du host dans Check MK"
            list={`hosts-${equipment.type}-${equipment.name}`}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}
          />
          {checkmkHosts.length > 0 && (
            <datalist id={`hosts-${equipment.type}-${equipment.name}`}>
              {checkmkHosts.map((host, idx) => (
                <option key={idx} value={host} />
              ))}
            </datalist>
          )}
        </div>
      </div>

      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '0.5rem', 
          fontSize: '0.875rem',
          fontWeight: '500',
          color: 'var(--text-primary)'
        }}>
          Site Check MK (optionnel)
        </label>
        <input
          type="text"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="Site Check MK (laisser vide pour le site par défaut)"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border-primary)',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem'
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !hostName.trim()}
        style={{
          padding: '0.75rem 1.5rem',
          background: saving || !hostName.trim() ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
          color: saving || !hostName.trim() ? 'var(--text-secondary)' : 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: saving || !hostName.trim() ? 'not-allowed' : 'pointer',
          fontSize: '0.9rem',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          alignSelf: 'flex-start'
        }}
      >
        {saving ? (
          <>
            <FaSync style={{ animation: 'spin 1s linear infinite' }} />
            Sauvegarde...
          </>
        ) : (
          <>
            <FaCheck />
            {mapping ? 'Mettre à jour' : 'Créer le mapping'}
          </>
        )}
      </button>
    </div>
  );
};

export default StepCheckMKMapping;

