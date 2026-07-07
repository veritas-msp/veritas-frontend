import React, { useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import { FaGlobe } from "react-icons/fa";
import styles from "./NDDSummary.module.css";

const NDDSummary = ({ data, config }) => {
    const { theme } = useTheme();
    const domaines = config?.client?.equipements?.NDD || [];

    // Fonction pour générer une couleur basée sur le rôle du domaine
    const getRoleColor = (role) => {
        if (!role) return { bg: "#9ca3af", text: "#ffffff" };
        
        const roleColors = {
            // Domaines principaux
            "principal": { bg: "#3b82f6", text: "#ffffff" },
            "primaire": { bg: "#3b82f6", text: "#ffffff" },
            "main": { bg: "#3b82f6", text: "#ffffff" },
            
            // Domaines de redirection
            "redirection": { bg: "#10b981", text: "#ffffff" },
            "redirect": { bg: "#10b981", text: "#ffffff" },
            "alias": { bg: "#10b981", text: "#ffffff" },
            
            // Domaines de test
            "test": { bg: "#f59e0b", text: "#ffffff" },
            "staging": { bg: "#f59e0b", text: "#ffffff" },
            "dev": { bg: "#f59e0b", text: "#ffffff" },
            
            // Domaines de sauvegarde
            "backup": { bg: "#8b5cf6", text: "#ffffff" },
            "sauvegarde": { bg: "#8b5cf6", text: "#ffffff" },
            "mirror": { bg: "#8b5cf6", text: "#ffffff" },
            
            // Domaines de marketing
            "marketing": { bg: "#ec4899", text: "#ffffff" },
            "promo": { bg: "#ec4899", text: "#ffffff" },
            "campaign": { bg: "#ec4899", text: "#ffffff" },
            
            // Domaines d'API
            "api": { bg: "#06b6d4", text: "#ffffff" },
            "rest": { bg: "#06b6d4", text: "#ffffff" },
            "service": { bg: "#06b6d4", text: "#ffffff" },
            
            // Domaines d'administration
            "admin": { bg: "#f97316", text: "#ffffff" },
            "management": { bg: "#f97316", text: "#ffffff" },
            "control": { bg: "#f97316", text: "#ffffff" },
            
            // Domaines de monitoring
            "monitoring": { bg: "#84cc16", text: "#ffffff" },
            "monitor": { bg: "#84cc16", text: "#ffffff" },
            "stats": { bg: "#84cc16", text: "#ffffff" },
            
            // Domaines de sécurité
            "security": { bg: "#ef4444", text: "#ffffff" },
            "securite": { bg: "#ef4444", text: "#ffffff" },
            "ssl": { bg: "#ef4444", text: "#ffffff" },
        };
        
        const roleLower = role.toLowerCase();
        
        // Recherche exacte d'abord
        if (roleColors[roleLower]) {
            return roleColors[roleLower];
        }
        
        // Recherche par mot-clé
        for (const [key, color] of Object.entries(roleColors)) {
            if (roleLower.includes(key)) {
                return color;
            }
        }
        
        // Couleur par défaut basée sur le hash du rôle
        const hash = role.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        const colors = [
            { bg: "#3b82f6", text: "#ffffff" }, // bleu
            { bg: "#10b981", text: "#ffffff" }, // vert
            { bg: "#f59e0b", text: "#ffffff" }, // orange
            { bg: "#8b5cf6", text: "#ffffff" }, // violet
            { bg: "#ec4899", text: "#ffffff" }, // rose
            { bg: "#06b6d4", text: "#ffffff" }, // cyan
            { bg: "#f97316", text: "#ffffff" }, // orange foncé
            { bg: "#84cc16", text: "#ffffff" }, // vert lime
        ];
        
        return colors[Math.abs(hash) % colors.length];
    };

    const getDomainInfo = (domaine) => {
        const info = [];
        if (domaine.expiration) {
            info.push(`Expire le ${domaine.expiration}`);
            const daysUntilExpiration = Math.ceil((new Date(domaine.expiration) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiration > 0) {
                info.push(`${daysUntilExpiration} jours restants`);
            } else if (daysUntilExpiration < 0) {
                info.push(`Expiré depuis ${Math.abs(daysUntilExpiration)} jours`);
            } else {
                info.push("Expire aujourd'hui");
            }
        }
        return info.join(" • ");
    };

    const expirationGroups = useMemo(() => {
        if (!domaines || domaines.length === 0) {
            return [];
        }

        const groups = {
            expired: [],
            less7: [],
            less30: [],
            less365: [],
            more365: [],
            unknown: []
        };

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayMs = 1000 * 60 * 60 * 24;

        domaines.forEach((domaine) => {
            // Utiliser la date d'expiration depuis data si disponible, sinon depuis la config
            const expiration = data?.[domaine.nom]?.expiration || domaine.expiration;
            
            if (!expiration) {
                groups.unknown.push(domaine);
                return;
            }

            const expirationDate = new Date(expiration);
            if (Number.isNaN(expirationDate.getTime())) {
                groups.unknown.push(domaine);
                return;
            }

            const diffDays = Math.ceil((expirationDate - startOfToday) / dayMs);

            if (diffDays < 0) {
                groups.expired.push(domaine);
            } else if (diffDays <= 7) {
                groups.less7.push(domaine);
            } else if (diffDays <= 30) {
                groups.less30.push(domaine);
            } else if (diffDays <= 365) {
                groups.less365.push(domaine);
            } else {
                groups.more365.push(domaine);
            }
        });

        const sortByExpiration = (list) =>
            list.slice().sort((a, b) => {
                const aExpiration = data?.[a.nom]?.expiration || a.expiration;
                const bExpiration = data?.[b.nom]?.expiration || b.expiration;
                const aTime = aExpiration ? new Date(aExpiration).getTime() : Infinity;
                const bTime = bExpiration ? new Date(bExpiration).getTime() : Infinity;

                if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
                    return (a?.nom || "").localeCompare(b?.nom || "");
                }
                if (Number.isNaN(aTime)) return 1;
                if (Number.isNaN(bTime)) return -1;

                return aTime - bTime;
            });

        const sections = [
            { key: "expired", label: "Expirés" },
            { key: "less7", label: "Dans moins de 7 jours" },
            { key: "less30", label: "Dans moins d'un mois" },
            { key: "less365", label: "Dans moins d'un an" },
            { key: "more365", label: "Dans plus d'un an" },
            { key: "unknown", label: "Sans date d'expiration" }
        ];

        return sections
            .map((section) => ({
                ...section,
                domaines:
                    section.key === "unknown"
                        ? groups[section.key].slice().sort((a, b) => (a?.nom || "").localeCompare(b?.nom || ""))
                        : sortByExpiration(groups[section.key])
            }))
            .filter((section) => section.domaines.length > 0);
    }, [domaines, data]);

    if (domaines.length === 0) {
        return (
            <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>Aucun nom de domaine configuré pour ce client.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
            {expirationGroups.map((group) => (
                <div key={group.key} className={styles.sectionGroup} id={`expiration-${group.key}`}>
                    <div className={styles.sectionSeparator}>
                        <h2 className={styles.sectionTitle}>
                            {group.label}
                            <span className={styles.sectionCount}>
                                {group.domaines.length} domaine{group.domaines.length > 1 ? "s" : ""}
                            </span>
                        </h2>
                    </div>
                    <div className={styles.nddGrid}>
                        {group.domaines.map((domaine, index) => {
                            // Utiliser la date d'expiration depuis data si disponible, sinon depuis la config
                            const domaineWithUpdatedExpiration = {
                                ...domaine,
                                expiration: data?.[domaine.nom]?.expiration || domaine.expiration
                            };
                            const domainInfo = getDomainInfo(domaineWithUpdatedExpiration);
                            const roleColor = getRoleColor(domaine.role);
                            
                            return (
                                <div
                                    key={index}
                                    className={styles.nddCard}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.headerLeft}>
                                            <div className={styles.nddInfo}>
                                                <h3 className={styles.nddName}>
                                                    <span className={styles.nddNameSection}>
                                                        <span style={{ marginRight: '0.5rem' }}>
                                                            <FaGlobe style={{
                                                                fontSize: '1.75rem',
                                                                color: theme === 'dark' ? '#d1d5db' : '#000000',
                                                                verticalAlign: 'middle',
                                                                display: 'inline-block'
                                                            }} />
                                                        </span>
                                                        <span className={styles.nddNameText}>
                                                            {domaine.nom}
                                                        </span>
                                                    </span>
                                                    {domainInfo && (
                                                        <span className={styles.connectionMeta}>
                                                            {domainInfo}
                                                        </span>
                                                    )}
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Commentaire du domaine */}
                                    {data?.[domaine.nom]?.comment && (
                                        <div className={styles.commentInfo}>
                                            💬 {data[domaine.nom].comment}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NDDSummary;
