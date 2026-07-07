import React from 'react';

/**
 * Storage-specific form fields component (NAS, HDD, SAN, Robot de sauvegarde)
 */
const StorageFields = ({
  equipment,
  formData,
  setFormData,
  isEditing,
  availableSites,
  storageType,
  styles
}) => {
  return (
    <div className={styles.infoCard}>
      <h2 className={styles.cardTitle}>Informations Stockage ({storageType})</h2>
      <div className={styles.infoGrid}>
        <div style={{ padding: '1rem', color: 'var(--text-secondary, #9ca3af)' }}>
          À configurer pour type {storageType}
        </div>
      </div>
    </div>
  );
};

export default StorageFields;
