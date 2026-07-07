import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Form.module.css";
import API_BASE_URL from "../../../../config";
import { toast } from "react-toastify";

/**
 * Modal pour synchroniser les équipements avec UniFi
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {Function} onClose - Fonction pour fermer le modal
 * @param {Function} onSync - Fonction appelée avec les équipements synchronisés
 * @param {string} equipmentType - 'switch' ou 'wifi'
 * @param {string} siteId - ID du site UniFi lié au client (optionnel)
 */
const UnifiSyncModal = ({ isOpen, onClose, onSync, equipmentType = 'switch', siteId = null }) => {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [siteName, setSiteName] = useState("");

  useEffect(() => {
    if (isOpen && siteId) {
      setDevices([]);
      loadDevices(siteId);
    } else if (isOpen && !siteId) {
      toast.error("Aucun site UniFi lié à ce client. Veuillez configurer un site dans l'étape de configuration des modules.");
      onClose();
    }
  }, [isOpen, siteId]);

  const loadDevices = async (siteIdToLoad) => {
    if (!siteIdToLoad) {
      toast.error("Aucun site UniFi configuré");
      return;
    }

    setLoading(true);
    setDevices([]);
    setSiteName("");
    
    try {
      console.log('📡 Chargement des devices pour siteId:', siteIdToLoad, 'type:', equipmentType);
      const response = await fetch(`${API_BASE_URL}/unifi/devices/${siteIdToLoad}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Utilise les cookies HttpOnly pour l'authentification
      });

      console.log('📦 Réponse API:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Erreur HTTP:', errorData);
        toast.error(`Erreur : ${errorData.error || `HTTP ${response.status}`}`);
        return;
      }

      const data = await response.json();
      console.log('✅ Données reçues:', data);
      console.log('📊 Switches:', data.switches?.length || 0);
      console.log('📊 Access Points:', data.accessPoints?.length || 0);
      console.log('📊 Tous les devices:', data.devices?.length || 0);

      if (data.success) {
        // Retourner TOUS les devices pour l'instant (on les affichera tous)
        // On filtrera côté UI ou on laissera l'utilisateur choisir
        const allDevices = data.devices || [];
        
        console.log('🔍 Tous les devices:', allDevices.length, allDevices);
        console.log('📊 Switches trouvés:', data.switches?.length || 0);
        console.log('📊 Access Points trouvés:', data.accessPoints?.length || 0);
        
        // Si on a des switches/AP filtrés, les utiliser, sinon afficher tous les devices
        const filteredDevices = (data.switches && data.switches.length > 0) || (data.accessPoints && data.accessPoints.length > 0)
          ? (equipmentType === 'switch' ? (data.switches || []) : (data.accessPoints || []))
          : allDevices; // Si aucun filtre ne fonctionne, afficher tous les devices
        
        console.log('🔍 Devices à afficher:', filteredDevices.length, filteredDevices);
        
        setDevices(filteredDevices);
        setSelectedDevices(new Set()); // Réinitialiser les sélections
        
        // Stocker le nom du site pour affichage
        if (data.siteName) {
          setSiteName(data.siteName);
        }
        
        if (filteredDevices.length === 0) {
          console.warn('⚠️ Aucun équipement trouvé');
          toast.info(`Aucun équipement trouvé pour ce site`);
        } else {
          toast.success(`${filteredDevices.length} équipement(s) chargé(s)`);
        }
      } else {
        console.error('❌ Réponse non réussie:', data);
        toast.error(`Erreur : ${data.error || 'Impossible de charger les devices'}`);
      }
    } catch (err) {
      console.error('❌ Erreur chargement devices:', err);
      toast.error("Erreur lors du chargement des équipements");
    } finally {
      setLoading(false);
    }
  };

  const toggleDeviceSelection = (deviceId) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const handleSync = () => {
    if (selectedDevices.size === 0) {
      toast.error("Veuillez sélectionner au moins un équipement");
      return;
    }

    // Convertir uniquement les devices sélectionnés au format de notre application
    const mappedDevices = devices
      .filter(device => {
        const deviceId = device.id || device.device_id || device.mac;
        return selectedDevices.has(deviceId);
      })
      .map(device => {
      if (equipmentType === 'switch') {
        return {
          nom: device.name || `Switch-${device.mac?.slice(-4) || 'unknown'}`,
          fabricant: "Ubiquiti",
          modele: device.model || '',
          ip: device.ip || '',
          manageable: device.manageable !== undefined ? device.manageable : true,
          nombrePorts: device.nombrePorts || '',
          poeSupport: device.poeSupport || false,
          empilage: false,
          firmware: device.version || '',
          numeroSerie: device.serial || '',
          expirationGarantie: '',
          emplacement: '',
          // Stocker l'ID UniFi pour référence future
          unifiId: device.id,
          unifiMac: device.mac
        };
      } else {
        // Access Point / Borne WiFi
        return {
          nom: device.name || `AP-${device.mac?.slice(-4) || 'unknown'}`,
          fabricant: "Ubiquiti",
          modele: device.model || '',
          ip: device.ip || '',
          firmware: device.version || '',
          numeroSerie: device.serial || '',
          expirationGarantie: '',
          emplacement: '',
          supportsWifi6: device.supportsWifi6 || false,
          bandes: device.bandes || { "2.4GHz": true, "5GHz": true, "6GHz": false },
          ssids: [],
          controleur: '',
          // Stocker l'ID UniFi pour référence future
          unifiId: device.id,
          unifiMac: device.mac
        };
      }
    });

    onSync(mappedDevices);
    onClose();
    toast.success(`${mappedDevices.length} équipement(s) synchronisé(s) avec succès`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modalContent}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3 style={{ margin: 0 }}>🔌 Synchroniser avec UniFi</h3>
            <button className={styles.closeButton} onClick={onClose}>
              ×
            </button>
          </div>

          <div className={styles.modalBody}>
            {siteName && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <strong>Site UniFi :</strong> {siteName}
              </div>
            )}
            
            {loading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Chargement des équipements...</p>
              </div>
            )}

            {devices.length > 0 && (
              <div className={styles.devicesList}>
                <h4 style={{ marginBottom: "0.75rem" }}>
                  {devices.length} équipement(s) trouvé(s) - {selectedDevices.size} sélectionné(s)
                </h4>
                <div className={styles.devicesScrollable}>
                  {devices.map((device, index) => {
                    const deviceId = device.id || device.device_id || device.mac || index;
                    const isSelected = selectedDevices.has(deviceId);
                    return (
                      <div 
                        key={deviceId} 
                        className={`${styles.deviceItem} ${isSelected ? styles.deviceItemSelected : ''}`}
                        onClick={() => toggleDeviceSelection(deviceId)}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                          marginBottom: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDeviceSelection(deviceId)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <strong>{device.name || device.ip || 'Sans nom'}</strong>
                            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: "0.25rem 0" }}>
                              Type: {device.type || 'unknown'} • IP: {device.ip || 'Non configurée'}
                              {device.model && ` • Modèle: ${device.model}`}
                              {device.serial && ` • S/N: ${device.serial}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={styles.modalActions}>
            <button
              className={styles.modalButtonCancel}
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              className={styles.modalButtonConfirm}
              onClick={handleSync}
              disabled={selectedDevices.size === 0}
            >
              Synchroniser ({selectedDevices.size})
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UnifiSyncModal;

