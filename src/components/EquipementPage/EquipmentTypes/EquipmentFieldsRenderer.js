import React from 'react';
import ServerFields from './ServerFields';
import StorageFields from './StorageFields';
import BackupRobotFields from './BackupRobotFields';

/**
 * Router component that renders the appropriate form fields based on equipment type
 */
const EquipmentFieldsRenderer = ({ 
  equipment, 
  formData, 
  setFormData, 
  isEditing, 
  availableSites,
  styles 
}) => {
  if (!equipment) return null;

  // Route to appropriate component based on equipment type
  switch (equipment.type) {
    case 'Serveurs':
      return (
        <ServerFields 
          equipment={equipment}
          formData={formData}
          setFormData={setFormData}
          isEditing={isEditing}
          availableSites={availableSites}
          styles={styles}
        />
      );
    
    case 'NAS':
      return (
        <StorageFields 
          equipment={equipment}
          formData={formData}
          setFormData={setFormData}
          isEditing={isEditing}
          availableSites={availableSites}
          storageType="NAS"
          styles={styles}
        />
      );
    
    case 'Internet':
      // Pas de carte spécifique : les champs sont dans la sidebar uniquement
      return null;
    
    case 'Firewalls':
      // Pas de carte spécifique : même message de mapping que serveurs/stockage si non mappé
      return null;

    case 'Switch':
      // Pas de carte spécifique : champs dans la sidebar, message de mapping si non mappé
      return null;

    case 'BorneWifi':
      // Pas de carte spécifique : champs dans la sidebar, message de mapping si non mappé
      return null;

    case 'Robot de sauvegarde':
      return (
        <BackupRobotFields 
          equipment={equipment}
          formData={formData}
          setFormData={setFormData}
          isEditing={isEditing}
          availableSites={availableSites}
          styles={styles}
        />
      );
    
    // Check for external HDD
    case 'Disque dur externe':
    case equipment.rawData?.type === 'Disque dur externe' ? true : false:
      return (
        <StorageFields 
          equipment={equipment}
          formData={formData}
          setFormData={setFormData}
          isEditing={isEditing}
          availableSites={availableSites}
          storageType="HDD"
          styles={styles}
        />
      );
    
    // Generic fields for other equipment types
    default:
      return (
        <div>
          <div style={{ padding: '1rem', color: 'var(--text-secondary, #9ca3af)' }}>
            Aucune configuration spécifique pour type {equipment.type}
          </div>
        </div>
      );
  }
};

export default EquipmentFieldsRenderer;
