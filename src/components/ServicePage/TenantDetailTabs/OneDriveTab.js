import React from 'react';
import styles from '../TenantDetailPage.module.css';

export default function OneDriveTab({ onedriveData, theme }) {
  if (!onedriveData) {
    return (
      <div>
        <h2 className={styles.sectionTitle}>OneDrive</h2>
        <div className={styles.noDataMessage}>
          <p>Aucune donnée OneDrive disponible.</p>
          <p style={{ fontSize: '0.875rem', color: theme === 'dark' ? '#9ca3af' : '#6b7280', marginTop: '0.5rem' }}>
            Les données OneDrive ne sont pas présentes dans le snapshot. Veuillez lancer une <strong>synchronisation complète</strong> via le bouton de synchronisation pour charger et sauvegarder ces données.
          </p>
        </div>
      </div>
    );
  }

  if (onedriveData.success === false) {
    return (
      <div>
        <h2 className={styles.sectionTitle}>OneDrive</h2>
        <div className={styles.noDataMessage}>
          <p style={{ color: '#ef4444' }}>❌ Erreur lors du chargement des données OneDrive</p>
          <p className={styles.textSecondary}>
            {onedriveData.error || 'Erreur inconnue'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className={styles.sectionTitle}>OneDrive</h2>
      
      <div className={styles.metricsRow}>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Espace total utilisé</div>
          <div className={styles.metricValue} style={{ color: '#3b82f6' }}>
            {onedriveData.storage?.totalUsed || '0 B'}
          </div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Nombre de fichiers</div>
          <div className={styles.metricValue} style={{ color: '#10b981' }}>
            {onedriveData.storage?.totalFiles !== undefined ? onedriveData.storage.totalFiles.toLocaleString() : '0'}
          </div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Moyenne par utilisateur</div>
          <div className={styles.metricValue} style={{ color: '#8b5cf6' }}>
            {onedriveData.storage?.averagePerUser || '0 B'}
          </div>
        </div>
        {onedriveData.sharing?.byActivityType && (
          <>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Fichiers consultés/modifiés</div>
              <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                {onedriveData.sharing.byActivityType.viewedOrEdited !== undefined 
                  ? onedriveData.sharing.byActivityType.viewedOrEdited.toLocaleString() 
                  : '0'}
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Fichiers synchronisés</div>
              <div className={styles.metricValue} style={{ color: '#14b8a6' }}>
                {onedriveData.sharing.byActivityType.synced !== undefined 
                  ? onedriveData.sharing.byActivityType.synced.toLocaleString() 
                  : '0'}
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Partages internes</div>
              <div className={styles.metricValue} style={{ color: '#ec4899' }}>
                {onedriveData.sharing.byActivityType.sharedInternally !== undefined 
                  ? onedriveData.sharing.byActivityType.sharedInternally.toLocaleString() 
                  : '0'}
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Partages externes</div>
              <div className={styles.metricValue} style={{ color: '#ef4444' }}>
                {onedriveData.sharing.byActivityType.sharedExternally !== undefined 
                  ? onedriveData.sharing.byActivityType.sharedExternally.toLocaleString() 
                  : '0'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Top utilisateurs OneDrive */}
      {onedriveData.topUsers && onedriveData.topUsers.length > 0 && (
        <div className={styles.sectionSpacing}>
          <h3 className={styles.subsectionTitle}>Top utilisateurs</h3>
          <div className={styles.licensesTableContainer}>
            <table className={styles.licensesTable}>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th className={styles.textRight}>Stockage utilisé</th>
                  <th className={styles.textRight}>Fichiers</th>
                  <th className={styles.textRight}>Partagés</th>
                </tr>
              </thead>
              <tbody>
                {onedriveData.topUsers.slice(0, 10).map((user, idx) => (
                  <tr key={idx}>
                    <td>{user.name || user.userPrincipalName || 'N/A'}</td>
                    <td className={styles.textRight}>
                      {user.storageUsed ? `${(user.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB` : '0 GB'}
                    </td>
                    <td className={styles.textRight}>{user.fileCount?.toLocaleString() || '0'}</td>
                    <td className={styles.textRight}>{user.sharedCount?.toLocaleString() || '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Utilisateurs proches du quota */}
      {onedriveData.usersNearQuota && onedriveData.usersNearQuota.length > 0 && (
        <div className={styles.sectionSpacing}>
          <h3 className={styles.subsectionTitle}>Utilisateurs proches du quota (&gt;90%)</h3>
          <div className={styles.licensesTableContainer}>
            <table className={styles.licensesTable}>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th className={styles.textRight}>Utilisation</th>
                  <th className={styles.textRight}>Fichiers</th>
                </tr>
              </thead>
              <tbody>
                {onedriveData.usersNearQuota.map((user, idx) => (
                  <tr key={idx}>
                    <td>{user.name || 'N/A'}</td>
                    <td>{user.email || 'N/A'}</td>
                    <td className={styles.textRight}>
                      <span className={styles.badgeDanger}>
                        {user.usagePercent}% ({user.used})
                      </span>
                    </td>
                    <td className={styles.textRight}>{user.files?.toLocaleString() || '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

