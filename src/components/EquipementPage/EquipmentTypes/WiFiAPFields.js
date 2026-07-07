import React from 'react';

const WiFiAPFields = ({ equipment, formData, setFormData, isEditing, availableSites, styles }) => (
  <div className={styles.infoCard}>
    <h2 className={styles.cardTitle}>Informations Borne WiFi</h2>
    <div className={styles.infoGrid}>
      <div style={{ padding: '1rem', color: 'var(--text-secondary, #9ca3af)' }}>
        À configurer pour type Borne WiFi
      </div>
    </div>
  </div>
);

export default WiFiAPFields;
