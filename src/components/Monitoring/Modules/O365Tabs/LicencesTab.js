import React from 'react';
import styles from '../O365.module.css';
import { getLicenseDisplayName } from './utils';
import LicencesTabBase from '../../../ServicePage/TenantDetailTabs/LicencesTab';

export default function LicencesTab({ 
    licences, 
    dashboardMetrics, 
    theme,
    renderCommentSection
}) {
    return (
        <div className={styles.licensesSection} style={{ position: 'relative' }}>
            <LicencesTabBase
                licences={licences}
                dashboardMetrics={dashboardMetrics}
                theme={theme}
            />
            {/* Zone de commentaire */}
            {renderCommentSection && renderCommentSection('licences', 'Licences')}
        </div>
    );
}

