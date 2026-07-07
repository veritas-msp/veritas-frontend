import React from 'react';

/**
 * Internet-specific form fields component
 */
const InternetFields = ({
  equipment,
  formData,
  setFormData,
  isEditing,
  styles
}) => {
  return (
    <div className={styles.infoCard}>
      <h2 className={styles.cardTitle}>Informations Internet</h2>
      <div className={styles.infoGrid}>
        <div style={{ padding: '1rem', color: 'var(--text-secondary, #9ca3af)' }}>
          À configurer pour type Internet
        </div>
      </div>
    </div>
  );
};

export default InternetFields;
