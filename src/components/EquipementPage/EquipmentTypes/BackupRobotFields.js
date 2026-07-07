import React from 'react';

const BackupRobotFields = ({ equipment, formData, setFormData, isEditing, availableSites, styles }) => (
  <div className={styles.infoCard}>
    <h2 className={styles.cardTitle}>Informations Robot de Sauvegarde</h2>
    <div className={styles.infoGrid}>
      <div style={{ padding: '1rem', color: 'var(--text-secondary, #9ca3af)' }}>
        À configurer pour type Robot de Sauvegarde
      </div>
    </div>
  </div>
);

export default BackupRobotFields;
