import React from "react";
import { useTheme } from "../../../hooks/useTheme";
import styles from "./ServeursSummary.module.css";
import { GrServer } from "react-icons/gr";
import { GrVirtualMachine } from "react-icons/gr";
import { MdWindow } from "react-icons/md";
import { FcLinux } from "react-icons/fc";
import { FaWindows, FaLinux } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";

const defaultServices = ["CPU", "C:/", "RAM", "UPTIME"];

const ServeursSummary = ({ data, config }) => {
    const { theme } = useTheme();
    const serveurs = config?.client?.equipements?.Serveurs || [];
    


    // Fonction pour générer une couleur basée sur le rôle du serveur
    const getRoleColor = (role) => {
        if (!role) return { bg: "#9ca3af", text: "#ffffff" };
        
        // Gérer le cas où role est un tableau (nouvelle structure)
        let roleString = role;
        if (Array.isArray(role)) {
            if (role.length === 0) return { bg: "#9ca3af", text: "#ffffff" };
            roleString = role[0]; // Prendre le premier rôle pour la couleur
        }
        
        // Vérifier que roleString est bien une chaîne
        if (typeof roleString !== 'string') {
            return { bg: "#9ca3af", text: "#ffffff" };
        }
        
        const roleColors = {
            // Contrôleurs de domaine
            "contrôleur de domaine": { bg: "#3b82f6", text: "#ffffff" },
            "controleur de domaine": { bg: "#3b82f6", text: "#ffffff" },
            "ad": { bg: "#3b82f6", text: "#ffffff" },
            "dc": { bg: "#3b82f6", text: "#ffffff" },
            
            // Serveurs de fichiers
            "fichiers": { bg: "#10b981", text: "#ffffff" },
            "files": { bg: "#10b981", text: "#ffffff" },
            "nas": { bg: "#10b981", text: "#ffffff" },
            
            // Serveurs web
            "web": { bg: "#f59e0b", text: "#ffffff" },
            "www": { bg: "#f59e0b", text: "#ffffff" },
            "http": { bg: "#f59e0b", text: "#ffffff" },
            
            // Serveurs de base de données
            "base de données": { bg: "#8b5cf6", text: "#ffffff" },
            "database": { bg: "#8b5cf6", text: "#ffffff" },
            "db": { bg: "#8b5cf6", text: "#ffffff" },
            "sql": { bg: "#8b5cf6", text: "#ffffff" },
            
            // Serveurs de messagerie
            "messagerie": { bg: "#ec4899", text: "#ffffff" },
            "mail": { bg: "#ec4899", text: "#ffffff" },
            "exchange": { bg: "#ec4899", text: "#ffffff" },
            
            // Serveurs de sauvegarde
            "sauvegarde": { bg: "#06b6d4", text: "#ffffff" },
            "backup": { bg: "#06b6d4", text: "#ffffff" },
            "sauve": { bg: "#06b6d4", text: "#ffffff" },
            
            // Serveurs d'application
            "application": { bg: "#f97316", text: "#ffffff" },
            "app": { bg: "#f97316", text: "#ffffff" },
            
            // Serveurs de monitoring
            "monitoring": { bg: "#84cc16", text: "#ffffff" },
            "monitor": { bg: "#84cc16", text: "#ffffff" },
            
            // Serveurs de sécurité
            "sécurité": { bg: "#ef4444", text: "#ffffff" },
            "securite": { bg: "#ef4444", text: "#ffffff" },
            "firewall": { bg: "#ef4444", text: "#ffffff" },
            "antivirus": { bg: "#ef4444", text: "#ffffff" },
        };
        
        const roleLower = roleString.toLowerCase();
        
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
        const hash = roleString.split('').reduce((a, b) => {
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

    // Fonction pour calculer le statut global du serveur
    const getServerStatus = (serverName) => {
        const srvData = data?.[serverName];
        if (!srvData) return { status: "unknown", icon: "●", color: "gray" };

        let totalCrit = 0;
        let totalWarn = 0;
        let totalOk = 0;
        let serviceCount = 0;

        defaultServices.forEach(service => {
            const serviceData = srvData[service] || {};
            const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
            
            totalCrit += parse(serviceData.crit, 0);
            totalWarn += parse(serviceData.warn, 0);
            totalOk += parse(serviceData.ok, 100);
            serviceCount++;
        });

        // Calcul de la note globale (0-100)
        const avgCrit = totalCrit / serviceCount;
        const avgWarn = totalWarn / serviceCount;
        const avgOk = totalOk / serviceCount;

        // Détermination du statut basé sur les moyennes
        if (avgCrit > 20) {
            return { status: "critical", icon: "●", color: "red" };
        } else if (avgCrit > 10 || avgWarn > 30) {
            return { status: "warning", icon: "●", color: "orange" };
        } else if (avgOk >= 90) {
            return { status: "excellent", icon: "●", color: "green" };
        } else if (avgOk >= 70) {
            return { status: "good", icon: "●", color: "lightgreen" };
        } else {
            return { status: "poor", icon: "●", color: "yellow" };
        }
    };

    // Fonction pour générer une couleur basée sur le VLAN
    const getVLANColor = (vlan) => {
        if (!vlan) return { bg: "#9ca3af", text: "#ffffff" };
        
        const vlanColors = {
            "10": { bg: "#3b82f6", text: "#ffffff" }, // bleu
            "20": { bg: "#10b981", text: "#ffffff" }, // vert
            "30": { bg: "#f59e0b", text: "#ffffff" }, // orange
            "40": { bg: "#8b5cf6", text: "#ffffff" }, // violet
            "50": { bg: "#ec4899", text: "#ffffff" }, // rose
            "60": { bg: "#06b6d4", text: "#ffffff" }, // cyan
            "70": { bg: "#f97316", text: "#ffffff" }, // orange foncé
            "80": { bg: "#84cc16", text: "#ffffff" }, // vert lime
            "90": { bg: "#ef4444", text: "#ffffff" }, // rouge
            "100": { bg: "#6366f1", text: "#ffffff" }, // indigo
        };
        
        return vlanColors[vlan] || { bg: "#6b7280", text: "#ffffff" };
    };

    const getOSIcon = (systeme) => {
        if (!systeme) return null;
        
        const systemeLower = systeme.toLowerCase();
        
        // Windows (tous les serveurs et desktop)
        if (systemeLower.includes('windows')) {
            return <FaWindows className={styles.osIcon} />;
        }
        
        // Linux (toutes les distributions)
        if (systemeLower.includes('linux') || 
            systemeLower.includes('ubuntu') || 
            systemeLower.includes('debian') || 
            systemeLower.includes('centos') || 
            systemeLower.includes('red hat') ||
            systemeLower.includes('suse') ||
            systemeLower.includes('opensuse') ||
            systemeLower.includes('almalinux') ||
            systemeLower.includes('rocky linux') ||
            systemeLower.includes('oracle linux') ||
            systemeLower.includes('fedora') ||
            systemeLower.includes('vmware esxi') ||
            systemeLower.includes('proxmox') ||
            systemeLower.includes('citrix xenserver') ||
            systemeLower.includes('microsoft hyper-v')) {
            return <FaLinux className={styles.osIcon} />;
        }
        
        return null;
    };

    // Fonction pour formater les informations du serveur
    const getServerInfo = (srv) => {
        const info = [];
        const physicalInfo = [];
        
        if (srv.systeme) {
            const osIcon = getOSIcon(srv.systeme);
            if (osIcon) {
                info.push({
                    type: 'os',
                    content: srv.systeme,
                    icon: osIcon
                });
            } else {
                info.push(srv.systeme);
            }
        }
        if (srv.ip) info.push(srv.ip);
        
        // Informations spécifiques aux serveurs physiques
        if (srv.type === "physique") {
            if (srv.marque && srv.modele) physicalInfo.push(`${srv.marque} ${srv.modele}`);
            else if (srv.marque) physicalInfo.push(srv.marque);
            else if (srv.modele) physicalInfo.push(srv.modele);
            if (srv.numeroSerie) physicalInfo.push(`S/N: ${srv.numeroSerie}`);
            if (srv.processeur) physicalInfo.push(srv.processeur);
            if (srv.stockage) physicalInfo.push(srv.stockage);
            if (srv.expirationGarantie) {
                const expirationDate = new Date(srv.expirationGarantie);
                const today = new Date();
                const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
                
                // Ajouter d'abord la date d'expiration
                physicalInfo.push(`Expire le ${expirationDate.toLocaleDateString('fr-FR')}`);
                
                // Puis l'état de la garantie (simplifié)
                if (daysUntilExpiration < 0) {
                    physicalInfo.push("Expiré");
                } else if (daysUntilExpiration <= 30) {
                    physicalInfo.push(`Expire dans ${daysUntilExpiration} jours`);
                }
            }
        } else {
            // Pour les serveurs virtuels, garder les informations dans la ligne principale
            if (srv.marque && srv.modele) info.push(`${srv.marque} ${srv.modele}`);
            else if (srv.marque) info.push(srv.marque);
            else if (srv.modele) info.push(srv.modele);
            if (srv.numeroSerie) info.push(`S/N: ${srv.numeroSerie}`);
            if (srv.processeur) info.push(srv.processeur);
            if (srv.stockage) info.push(srv.stockage);
            if (srv.expirationGarantie) {
                const expirationDate = new Date(srv.expirationGarantie);
                const today = new Date();
                const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
                
                // Ajouter d'abord la date d'expiration
                info.push(`Expire le ${expirationDate.toLocaleDateString('fr-FR')}`);
                
                // Puis l'état de la garantie (simplifié)
                if (daysUntilExpiration < 0) {
                    info.push("Expiré");
                } else if (daysUntilExpiration <= 30) {
                    info.push(`Expire dans ${daysUntilExpiration} jours`);
                }
            }
        }
        
        return { mainInfo: info, physicalInfo: physicalInfo };
    };

    // Fonction pour déterminer la valeur la plus haute dans une ligne
    const getHighestValue = (serviceData, service) => {
        const parse = (val, fallback) => {
            if (val === undefined || val === null || val === '') return fallback;
            const parsed = parseInt(val, 10);
            return isNaN(parsed) ? fallback : parsed;
        };
        
        const ok = parse(serviceData.ok, 100);
        const warn = parse(serviceData.warn, 0);
        const crit = parse(serviceData.crit, 0);
        
        const values = [ok, warn, crit];
        const maxValue = Math.max(...values);
        
        return {
            ok: { value: ok, isHighest: ok === maxValue },
            warn: { value: warn, isHighest: warn === maxValue },
            crit: { value: crit, isHighest: crit === maxValue }
        };
    };

    if (serveurs.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>Aucun serveur configuré pour ce client.</p>
            </div>
        );
    }

    return (
        <div className={`${styles.serversContainer} ${theme === "dark" ? styles.dark : ""}`}>
            {/* Carte module avec titre/sous-titre/icône */}
            <div className={styles.moduleCard}>
                <div className={styles.moduleHeader}>
                    <div className={styles.moduleIcon}>🖥️</div>
                    <div className={styles.moduleInfo}>
                        <h3 className={styles.moduleTitle}>Serveurs</h3>
                        <p className={styles.moduleSubtitle}>
                            Surveillance des serveurs physiques et virtuels
                        </p>
                    </div>
                </div>
                <hr className={styles.moduleDivider} />

                {/* Statistiques globales */}
                <div className={styles.statsSection}>
                    <div className={styles.statsGrid}>
                        {/* Statistiques par type */}
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>🖥️</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statName}>Serveurs physiques</div>
                                <div className={styles.statValue}>
                                    <span className={styles.statNumber}>
                                        {serveurs.filter(s => s.type === "physique").length}
                                    </span>
                                    <span className={styles.statLabel}>
                                        ({serveurs.length > 0 ? Math.round((serveurs.filter(s => s.type === "physique").length / serveurs.length) * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>☁️</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statName}>Serveurs virtuels</div>
                                <div className={styles.statValue}>
                                    <span className={styles.statNumber}>
                                        {serveurs.filter(s => s.type === "virtuel").length}
                                    </span>
                                    <span className={styles.statLabel}>
                                        ({serveurs.length > 0 ? Math.round((serveurs.filter(s => s.type === "virtuel").length / serveurs.length) * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>🔗</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statName}>VLANs utilisés</div>
                                <div className={styles.statValue}>
                                    <span className={styles.statNumber}>
                                        {new Set(serveurs.filter(s => s.vlan).map(s => s.vlan)).size}
                                    </span>
                                    <span className={styles.statLabel}>
                                        sur {serveurs.filter(s => s.vlan).length} serveurs
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>🛡️</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statName}>Garanties actives</div>
                                <div className={styles.statValue}>
                                    <span className={styles.statNumber}>
                                        {serveurs.filter(s => {
                                            if (!s.expirationGarantie) return false;
                                            const expirationDate = new Date(s.expirationGarantie);
                                            const today = new Date();
                                            return expirationDate > today;
                                        }).length}
                                    </span>
                                    <span className={styles.statLabel}>
                                        sur {serveurs.filter(s => s.expirationGarantie).length} garanties
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Répartition par VLAN */}
                    {serveurs.filter(s => s.vlan).length > 0 && (
                        <div className={styles.vlanStatsSection}>
                            <h4 className={styles.vlanStatsTitle}>Répartition par VLAN</h4>
                            <div className={styles.vlanStatsGrid}>
                                {Array.from(new Set(serveurs.filter(s => s.vlan).map(s => s.vlan)))
                                    .sort((a, b) => parseInt(a) - parseInt(b))
                                    .map(vlan => {
                                        const vlanServers = serveurs.filter(s => s.vlan === vlan);
                                        const vlanColor = getVLANColor(vlan);
                                        return (
                                            <div key={vlan} className={styles.vlanStatItem}>
                                                <span 
                                                    className={styles.vlanBadge}
                                                    style={{ backgroundColor: vlanColor.bg, color: vlanColor.text }}
                                                >
                                                    VLAN {vlan}
                                                </span>
                                                <span className={styles.vlanCount}>
                                                    {vlanServers.length} serveur{vlanServers.length > 1 ? 's' : ''}
                                                </span>
                                                <span className={styles.vlanPercentage}>
                                                    ({Math.round((vlanServers.length / serveurs.length) * 100)}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Cartes des serveurs à l'intérieur */}
                <div className={styles.serversGrid}>
                    {serveurs
                        .sort((a, b) => {
                            // Tri: physiques d'abord, puis virtuels
                            if (a.type === "physique" && b.type !== "physique") return -1;
                            if (a.type !== "physique" && b.type === "physique") return 1;
                            // Si même type, tri par nom
                            return a.nom.localeCompare(b.nom);
                        })
                        .map((srv, i) => {
                            const serverStatus = getServerStatus(srv.nom);
                            const { mainInfo, physicalInfo } = getServerInfo(srv);
                            const roleColor = getRoleColor(srv.role);
                            
                            // Vérifier si le serveur est mappé CheckMK
                            const isMapped = Boolean(srv.checkmk_host_name);

                            return (
                                <div key={i} className={styles.serverCard}>
                                    {/* Badge de mapping en haut à droite */}
                                    <span
                                        className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`}
                                        title={isMapped ? "Synchronisé CheckMK" : "Non mappé"}
                                    >
                                        <IconifyIcon
                                            icon={isMapped ? "simple-icons:checkmk" : "picon:not"}
                                            width={16}
                                            height={16}
                                            color={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                        />
                                    </span>
                                    {/* En-tête de la carte */}
                                    <div className={styles.cardHeader}>
                                        <div className={styles.headerLeft}>
                                            <div className={`${styles.statusDot} ${styles[serverStatus.status]}`}></div>
                                            <div className={styles.serverInfo}>
                                                <h3 className={styles.serverName}>
                                                    {srv.nom}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className={styles.serverType}>
                                            <span className={styles.typeLabel} style={{ backgroundColor: "#6b7280", color: "#ffffff" }}>
                                                {srv.type === "physique" ? "Physique" : "Virtuel"}
                                            </span>
                                            {srv.role && (
                                                Array.isArray(srv.role) ? (
                                                    // Si c'est un tableau, afficher chaque rôle
                                                    srv.role.map((role, roleIndex) => {
                                                        const roleColor = getRoleColor(role);
                                                        return (
                                                            <span 
                                                                key={roleIndex}
                                                                className={styles.roleLabel} 
                                                                style={{ backgroundColor: roleColor.bg, color: roleColor.text }}
                                                            >
                                                                {role}
                                                            </span>
                                                        );
                                                    })
                                                ) : (
                                                    // Si c'est une chaîne (ancienne structure)
                                                    <span 
                                                        className={styles.roleLabel} 
                                                        style={{ backgroundColor: getRoleColor(srv.role).bg, color: getRoleColor(srv.role).text }}
                                                    >
                                                        {srv.role}
                                                    </span>
                                                )
                                            )}
                                            {srv.vlan && (
                                                <span 
                                                    className={styles.vlanLabel} 
                                                    style={{ backgroundColor: getVLANColor(srv.vlan).bg, color: getVLANColor(srv.vlan).text }}
                                                >
                                                    VLAN {srv.vlan}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sous-titre avec les informations du serveur */}
                                    <div className={styles.serverDetailsContainer}>
                                        <p className={styles.serverDetails}>
                                            {mainInfo.map((item, index) => (
                                                <React.Fragment key={index}>
                                                    {typeof item === 'string' ? (
                                                        <>
                                                            {item}
                                                            {index < mainInfo.length - 1 && " • "}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className={styles.osInfo}>
                                                                {item.icon}
                                                                {item.content}
                                                            </span>
                                                            {index < mainInfo.length - 1 && " • "}
                                                        </>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </p>
                                        {physicalInfo.length > 0 && (
                                            <p className={styles.physicalInfo}>
                                                {physicalInfo.join(" • ")}
                                            </p>
                                        )}
                                    </div>

                                    {/* Tableau des métriques */}
                                    <div className={styles.metricsTable}>
                                        <table className={styles.serviceTable}>
                                            <thead>
                                                <tr>
                                                    <th scope="col">Service</th>
                                                    <th scope="col">OK</th>
                                                    <th scope="col">WARN</th>
                                                    <th scope="col">CRIT</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {defaultServices.map((service) => {
                                                    const serviceData = data?.[srv.nom]?.[service] || {};
                                                    const values = getHighestValue(serviceData, service);
                                                    
                                                    return (
                                                        <tr key={service}>
                                                            <td className={styles.serviceName}>{service}</td>
                                                            <td>
                                                                <span className={`${styles.metricValue} ${values.ok.isHighest ? styles.okValue : styles.metricValueDefault}`}>
                                                                    {values.ok.value}%
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`${styles.metricValue} ${values.warn.isHighest ? styles.warnValue : styles.metricValueDefault}`}>
                                                                    {values.warn.value}%
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`${styles.metricValue} ${values.crit.isHighest ? styles.critValue : styles.metricValueDefault}`}>
                                                                    {values.crit.value}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Zone de commentaire */}
                                    {data?.[srv.nom]?.comment && (
                                        <div className={styles.commentSection}>
                                            <textarea
                                                value={data[srv.nom].comment}
                                                readOnly
                                                className={styles.commentInput}
                                                rows="2"
                                                placeholder="Commentaire..."
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

export default ServeursSummary;
