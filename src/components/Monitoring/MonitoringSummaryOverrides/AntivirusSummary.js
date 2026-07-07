import React, { useMemo } from "react";
import { useTheme } from '../../../hooks/useTheme';
import styles from "./AntivirusSummary.module.css";
import { Icon as IconifyIcon } from "@iconify/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { scoreToLetter, scoreToColor } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import MetricLetter from "../common/MetricLetter";
import { FaDesktop, FaServer, FaApple, FaLaptop, FaCloud } from "react-icons/fa";
import { getIconPath } from "../../../utils/assetHelper";

const AntivirusSummary = ({ data, config }) => {
  const { theme } = useTheme();
  const staticData = config?.client?.equipements?.Antivirus || {};
  const comment = data?.comment || "";

  // Utiliser les données chargées dynamiquement si disponibles, sinon les données statiques
  const hasLoadedData = Boolean(data?.bitdefenderSolutions && Array.isArray(data.bitdefenderSolutions) && data.bitdefenderSolutions.length > 0);
  const bitDefenderSolutions = hasLoadedData
    ? data.bitdefenderSolutions
    : staticData?.solutions
      ? staticData.solutions.filter(sol => sol.solution === "GravityZone BitDefender")
      : staticData?.solution
        ? [{ ...staticData, solution: staticData.solution }] // Convertir l'ancien format en array
        : [];

  // Fonction pour calculer la note globale de santé du parc (identique à Antivirus.js)
  const calculateHealthScore = (statistics, enrichedData, endpoints) => {
    if (!statistics && (!enrichedData || !enrichedData.endpoints || enrichedData.endpoints.length === 0)) {
      return null;
    }

    let score = 100;
    const factors = [];
    const enrichedEndpoints = enrichedData?.endpoints || [];

    // 1. Taux de gestion (0-25 points)
    const totalEndpoints = statistics?.endpoints?.total || endpoints?.length || 0;
    const managedEndpoints = statistics?.endpoints?.managed || 0;
    const managedRate = totalEndpoints > 0 ? (managedEndpoints / totalEndpoints) * 100 : 0;
    const managementScore = (managedRate / 100) * 25;
    score -= (25 - managementScore);
    factors.push({ name: 'Gestion', value: managedRate, weight: 25, earnedPoints: Math.round(managementScore) });

    // 2. Taux d'infection (0-20 points)
    const infectedCount = enrichedEndpoints.filter(ep => ep.isInfected).length;
    const infectionRate = enrichedEndpoints.length > 0 ? (infectedCount / enrichedEndpoints.length) * 100 : 0;
    const infectionScore = Math.max(0, 20 - (infectionRate * 20 / 10));
    score -= (20 - infectionScore);
    factors.push({ name: 'Infection', value: infectionRate, weight: 20, earnedPoints: Math.round(infectionScore) });

    // 3. Taux d'endpoints en ligne (0-20 points)
    const onlineCount = enrichedEndpoints.filter(ep => ep.endpointState === 1).length;
    const onlineRate = enrichedEndpoints.length > 0 ? (onlineCount / enrichedEndpoints.length) * 100 : 0;
    const onlineScore = (onlineRate / 100) * 20;
    score -= (20 - onlineScore);
    factors.push({ name: 'Disponibilité', value: onlineRate, weight: 20, earnedPoints: Math.round(onlineScore) });

    // 4. Base antivirale à jour (0-15 points)
    const upToDateEndpoints = enrichedEndpoints.filter(ep => {
      const agent = ep.agent || {};
      return !agent.signatureOutdated && !agent.productOutdated;
    }).length;
    const upToDateRate = enrichedEndpoints.length > 0 ? (upToDateEndpoints / enrichedEndpoints.length) * 100 : 0;
    const upToDateScore = (upToDateRate / 100) * 15;
    score -= (15 - upToDateScore);
    factors.push({ name: 'Base antivirale', value: upToDateRate, weight: 15, earnedPoints: Math.round(upToDateScore) });

    // 5. Endpoints déconnectés depuis plus de 24h (0-10 points)
    const disconnected24h = enrichedEndpoints.filter(ep => {
      if (!ep.lastSeen) return false;
      const lastSeenDate = new Date(ep.lastSeen);
      const now = new Date();
      const diffHours = (now - lastSeenDate) / (1000 * 60 * 60);
      return diffHours > 24;
    }).length;
    const disconnectedRate = enrichedEndpoints.length > 0 ? (disconnected24h / enrichedEndpoints.length) * 100 : 0;
    const disconnectedScore = Math.max(0, 10 - (disconnectedRate * 10 / 20));
    score -= (10 - disconnectedScore);
    factors.push({ name: 'Connexion', value: 100 - disconnectedRate, weight: 10, earnedPoints: Math.round(disconnectedScore) });

    // 6. Taux de détection de malware (0-10 points)
    const malwareDetectedCount = enrichedEndpoints.filter(ep => ep.malwareDetected).length;
    const malwareRate = enrichedEndpoints.length > 0 ? (malwareDetectedCount / enrichedEndpoints.length) * 100 : 0;
    const malwareScore = Math.max(0, 10 - (malwareRate * 10 / 20));
    score -= (10 - malwareScore);
    factors.push({ name: 'Malware', value: malwareRate, weight: 10, earnedPoints: Math.round(malwareScore) });

    score = Math.max(0, Math.min(100, score));

    return {
      score: Math.round(score),
      factors,
      managedRate,
      infectionRate,
      onlineRate,
      malwareRate,
      upToDateRate,
      disconnectedRate
    };
  };

  // Fonction pour formater le nom du système d'exploitation
  const formatOSName = (osName) => {
    if (!osName) return "N/A";
    const os = String(osName).trim();
    if (os.toLowerCase().includes('windows')) {
      if (os.match(/windows\s*11/i)) return "Windows 11";
      if (os.match(/windows\s*10/i)) return "Windows 10";
      if (os.match(/windows\s*server\s*2022/i)) return "Windows Server 2022";
      if (os.match(/windows\s*server\s*2019/i)) return "Windows Server 2019";
      if (os.match(/windows\s*server\s*2016/i)) return "Windows Server 2016";
      if (os.match(/windows\s*server\s*2012\s*r2/i)) return "Windows Server 2012 R2";
      if (os.match(/windows\s*server\s*2012/i)) return "Windows Server 2012";
      if (os.match(/windows\s*server/i)) {
        const serverVersionMatch = os.match(/windows\s*server\s*(\d+)/i);
        if (serverVersionMatch) return `Windows Server ${serverVersionMatch[1]}`;
        return "Windows Server";
      }
      const windowsVersionMatch = os.match(/windows\s*(\d+)/i);
      if (windowsVersionMatch) return `Windows ${windowsVersionMatch[1]}`;
      return "Windows";
    }
    if (os.toLowerCase().includes('mac') || os.toLowerCase().includes('darwin')) {
      const macVersionMatch = os.match(/(?:macos|mac\s*os)\s*x?\s*(\d+[._]\d+)/i);
      if (macVersionMatch) {
        const version = macVersionMatch[1].replace('_', '.');
        return `macOS ${version}`;
      }
      return "macOS";
    }
    if (os.toLowerCase().includes('linux')) {
      if (os.match(/ubuntu/i)) return "Ubuntu";
      if (os.match(/debian/i)) return "Debian";
      if (os.match(/centos/i)) return "CentOS";
      if (os.match(/red\s*hat|rhel/i)) return "Red Hat";
      return "Linux";
    }
    return os;
  };

  // Fonction pour obtenir l'icône de l'endpoint
  const getEndpointIcon = (type) => {
    switch (type) {
      case 'stationsWindows':
      case 'physique':
        return <FaDesktop className={styles.endpointIcon} />;
      case 'ServeursWindows':
        return <FaServer className={styles.endpointIcon} />;
      case 'macos':
        return <FaApple className={styles.endpointIcon} />;
      case 'machinesPhysiques':
        return <FaLaptop className={styles.endpointIcon} />;
      case 'machinesVirtuelles':
      case 'virtuel':
        return <FaCloud className={styles.endpointIcon} />;
      default:
        return <FaDesktop className={styles.endpointIcon} />;
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };


  // Fonction pour parser les valeurs de taux
  const parseRateValue = (value) => {
    if (value === null || value === undefined || value === 'N/A') return null;
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isNaN(numeric) ? null : numeric;
  };

  // Fonction pour rendre une ligne de métrique
  const renderMetricRow = (label, value, higherIsBetter = true) => (
    <div style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#d1d5db' : '#374151', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      <MetricLetter value={value} higherIsBetter={higherIsBetter} theme={theme} showValue={false} />
      <strong>{label}</strong>
    </div>
  );

  // Couleurs pour les graphiques
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

  // Le composant est rendu seulement si le module est actif, donc on affiche toujours quelque chose
  // Vérifions si on a des données à afficher
  const hasAnyData = hasLoadedData || (staticData && (
    (staticData.solutions && Array.isArray(staticData.solutions) && staticData.solutions.length > 0) ||
    staticData.solution ||
    staticData.logiciel ||
    (staticData.endpoints && Array.isArray(staticData.endpoints) && staticData.endpoints.length > 0)
  ));


  // Si on a des données, afficher le contenu normal, sinon afficher le message d'attente
  if (hasAnyData) {
    // Afficher le contenu normal avec les données
    return (
      <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.antivirusGrid}>
          {bitDefenderSolutions.map((solution, solIndex) => {
          const syncData = solution.syncData || {};
          const endpoints = solution.endpoints || [];
          const statistics = solution.statistics || null;
          const enrichedData = data?.bitdefenderEnrichedEndpoints?.[solIndex] || null;
          const policies = data?.bitdefenderPolicies?.[solIndex] || null;
          const totalEndpoints = syncData.totalEndpoints || endpoints.length || 0;
          const physicalEndpoints = syncData.physicalEndpoints || endpoints.filter(ep => ep.type === 'physique').length || 0;
          const virtualEndpoints = syncData.virtualEndpoints || endpoints.filter(ep => ep.type === 'virtuel').length || 0;
          const managedEndpointsCount = statistics?.endpoints?.managed ?? endpoints.filter(ep => ep.isManaged).length ?? 0;
          const licencesTotales = solution.licencesTotales || "";
          const licencesUtilisees = managedEndpointsCount;
          const expiration = solution.expiration || "";
          const lastSync = syncData.lastSync || "";

          // Calculer la note de santé
          const healthScore = calculateHealthScore(statistics, enrichedData, endpoints);
          const manualScore = data?.solutions?.[solIndex]?.manualHealthScore;
          const healthScoreValue = manualScore !== undefined ? manualScore : healthScore?.score;
          const scoreColor = healthScoreValue !== null ? scoreToColor(healthScoreValue) : '#6b7280';
          const scoreLetter = healthScoreValue !== null ? scoreToLetter(healthScoreValue) : null;

          // Métriques
          const managedRateValue = parseRateValue(healthScore?.managedRate);
          const infectionRateValue = parseRateValue(healthScore?.infectionRate);
          const onlineRateValue = parseRateValue(healthScore?.onlineRate);
          const malwareRateValue = parseRateValue(healthScore?.malwareRate);
          const upToDateRateValue = parseRateValue(healthScore?.upToDateRate);
          const disconnectedRateValue = parseRateValue(healthScore?.disconnectedRate);

          // Données pour les graphiques
          const enrichedEndpoints = enrichedData?.endpoints || [];
          const managedEndpoints = endpoints.filter(ep => ep.isManaged);
          
          // Graphique OS
          const osDistribution = {};
          managedEndpoints.forEach(ep => {
            const os = ep.operatingSystem || 'N/A';
            const formattedOS = formatOSName(os);
            if (!osDistribution[formattedOS]) {
              osDistribution[formattedOS] = 0;
            }
            osDistribution[formattedOS]++;
          });
          const osChartData = Object.entries(osDistribution)
            .map(([os, count]) => ({ name: os, value: count }))
            .sort((a, b) => b.value - a.value);

          // Graphique modules
          const getModuleName = (moduleName) => {
            const moduleNames = {
              'advancedThreatControl': 'Contrôle avancé des menaces',
              'antimalware': 'Antimalware',
              'contentControl': 'Contrôle de contenu',
              'deviceControl': 'Contrôle des périphériques',
              'firewall': 'Pare-feu',
              'powerUser': 'Utilisateur avancé'
            };
            return moduleNames[moduleName] || moduleName;
          };

          // Fonction pour obtenir l'abréviation d'un module
          const getModuleAbbreviation = (moduleName) => {
            const abbreviations = {
              'advancedThreatControl': 'ATC',
              'antimalware': 'AM',
              'contentControl': 'CC',
              'deviceControl': 'DC',
              'firewall': 'FW',
              'powerUser': 'PU'
            };
            return abbreviations[moduleName] || moduleName.substring(0, 3).toUpperCase();
          };
          const moduleCounts = {};
          enrichedEndpoints.forEach(ep => {
            const modules = ep.modules || [];
            let activeModules = [];
            if (Array.isArray(modules)) {
              activeModules = modules;
            } else if (modules && typeof modules === 'object') {
              activeModules = Object.keys(modules).filter(key => modules[key] === true);
            }
            activeModules.forEach(module => {
              if (!moduleCounts[module]) {
                moduleCounts[module] = 0;
              }
              moduleCounts[module]++;
            });
          });
          const moduleChartData = Object.entries(moduleCounts)
            .map(([module, count]) => ({
              name: getModuleName(module),
              value: count,
              moduleKey: module
            }))
            .sort((a, b) => b.value - a.value);

          // Compter les endpoints infectés et déconnectés
          const infectedCount = enrichedEndpoints.filter(ep => ep.isInfected).length;
          const disconnected24h = enrichedEndpoints.filter(ep => {
            if (!ep.lastSeen) return false;
            const lastSeenDate = new Date(ep.lastSeen);
            const now = new Date();
            const diffHours = (now - lastSeenDate) / (1000 * 60 * 60);
            return diffHours > 24;
          }).length;

          // ID de l'entreprise GravityZone
          const companyId = solution.companyId || syncData.company?.id || null;

          // Filtrer les politiques pour n'afficher que celles utilisées par les endpoints de cette entreprise
          const companyPolicies = (() => {
            if (!policies?.policies || !enrichedData?.endpoints) return [];
            
            const allPolicies = policies.policies;
            const enrichedEndpoints = enrichedData.endpoints || [];
            
            // Identifier les politiques utilisées par les endpoints de cette solution
            const usedPolicyIds = new Set();
            enrichedEndpoints.forEach(ep => {
              if (ep.policy && ep.policy.id) {
                usedPolicyIds.add(ep.policy.id);
              }
            });
            
            // Filtrer pour ne garder que les politiques utilisées
            return allPolicies.filter(policy => usedPolicyIds.has(policy.id));
          })();

          return (
            <div key={`bitdefender-${solIndex}`} className={styles.antivirusCard}>
              {/* En-tête */}
              <div className={styles.cardHeader}>
                <div className={styles.headerLeft}>
                  <div className={styles.antivirusInfo}>
                    <h3 className={styles.antivirusName}>
                      <img 
                        src={getIconPath('bitdefender.png')} 
                        alt="BitDefender" 
                        style={{ width: '24px', height: '24px', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.75rem', borderRadius: '4px' }} 
                      />
                      <span>{solution.solution || solution.companyName || "GravityZone BitDefender"}</span>
                      {companyId && (
                        <span style={{
                          fontSize: '1.5rem',
                          fontWeight: '600',
                          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                          marginLeft: 'auto'
                        }}>
                          ID: {companyId}
                        </span>
                      )}
                    </h3>
                  </div>
                </div>
              </div>


              {/* Métriques principales */}
              <div className={styles.metricsRow}>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Total endpoints</div>
                  <div className={styles.metricValue}>
                    {statistics?.endpoints?.total ?? totalEndpoints ?? "N/A"}
                  </div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Gérés</div>
                  <div className={styles.metricValue} style={{ color: '#10b981' }}>
                    {statistics?.endpoints?.managed ?? managedEndpoints.length ?? "N/A"}
                  </div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Non gérés</div>
                  <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                    {statistics?.endpoints?.unmanaged ?? (totalEndpoints - managedEndpoints.length) ?? "N/A"}
                  </div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Taux de gestion</div>
                  <div className={styles.metricValue}>
                    {statistics?.availability?.managedRate !== undefined 
                      ? `${statistics.availability.managedRate}%` 
                      : (totalEndpoints > 0 ? `${((managedEndpoints.length / totalEndpoints) * 100).toFixed(1)}%` : "N/A")}
                  </div>
                </div>
                {enrichedEndpoints.length > 0 && (
                  <div className={styles.metricItem}>
                    <div className={styles.metricLabel}>Déconnectés {'>'} 24h</div>
                    <div className={styles.metricValue} style={{ color: disconnected24h > 0 ? '#ef4444' : '#10b981' }}>
                      {disconnected24h}
                    </div>
                  </div>
                )}
              </div>

              {/* Graphiques */}
              <div className={styles.chartsContainer} style={{ marginTop: '1.5rem' }}>
                {/* Graphique OS */}
                {osChartData.length > 0 && (
                  <div className={styles.chartCard}>
                    <h5 className={styles.chartTitle}>Répartition par OS (appareils gérés)</h5>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={osChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          stroke={theme === 'dark' ? '#d1d5db' : '#374151'}
                          fontSize={11}
                        />
                        <YAxis 
                          stroke={theme === 'dark' ? '#d1d5db' : '#374151'}
                          fontSize={11}
                          label={{ 
                            value: "Nombre d'endpoints", 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: theme === 'dark' ? '#d1d5db' : '#374151' }
                          }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                            border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                            borderRadius: '6px',
                            color: theme === 'dark' ? '#d1d5db' : '#374151'
                          }}
                          formatter={(value, name) => [`${value} endpoint${value > 1 ? 's' : ''}`, 'Endpoints']}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[4, 4, 0, 0]}
                        >
                          {osChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Graphique modules */}
                {moduleChartData.length > 0 && (
                  <div className={styles.chartCard}>
                    <h5 className={styles.chartTitle}>Modules activés sur les endpoints</h5>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={moduleChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          stroke={theme === 'dark' ? '#d1d5db' : '#374151'}
                          fontSize={11}
                        />
                        <YAxis 
                          stroke={theme === 'dark' ? '#d1d5db' : '#374151'}
                          fontSize={11}
                          label={{ 
                            value: "Nombre d'endpoints", 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: theme === 'dark' ? '#d1d5db' : '#374151' }
                          }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                            border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                            borderRadius: '6px',
                            color: theme === 'dark' ? '#d1d5db' : '#374151'
                          }}
                          formatter={(value, name) => [`${value} endpoint${value > 1 ? 's' : ''}`, 'Endpoints']}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[4, 4, 0, 0]}
                        >
                          {moduleChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Informations de licence */}
              {(licencesTotales || licencesUtilisees > 0 || expiration) && (
                <div className={styles.licenseSection} style={{ marginTop: '1.5rem' }}>
                  <h4 className={styles.sectionTitle}>Informations de licence</h4>
                  <div className={styles.licenseGrid}>
                    {licencesTotales && (
                      <div className={styles.licenseItem}>
                        <label>Licences totales</label>
                        <div className={styles.licenseValue}>{licencesTotales}</div>
                      </div>
                    )}
                    <div className={styles.licenseItem}>
                      <label>Licences utilisées</label>
                      <div className={styles.licenseValue}>{licencesUtilisees}</div>
                    </div>
                    {licencesTotales && (
                      <div className={styles.licenseItem}>
                        <label>Licences disponibles</label>
                        <div className={styles.licenseValue}>
                          {licencesTotales ? (parseInt(licencesTotales) - licencesUtilisees) : "N/A"}
                        </div>
                      </div>
                    )}
                    {expiration && (
                      <div className={styles.licenseItem}>
                        <label>Expiration</label>
                        <div className={styles.licenseValue}>{formatDate(expiration)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Politiques de sécurité - uniquement celles de l'entreprise */}
              {companyPolicies.length > 0 && (
                <div className={styles.policiesSection} style={{ marginTop: '1.5rem' }}>
                  <h4 className={styles.sectionTitle}>Politiques de sécurité</h4>
                  <div className={styles.policiesTableContainer}>
                    <table className={styles.policiesTable}>
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Endpoints</th>
                          <th>Appliquée</th>
                          <th>Créée le</th>
                          <th>Modifiée le</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyPolicies.map((policy, polIndex) => {
                          // Compter les endpoints par politique
                          const enrichedEndpoints = enrichedData?.endpoints || [];
                          const policyUsage = enrichedEndpoints.filter(ep => ep.policy && ep.policy.id === policy.id);
                          const usageCount = policyUsage.length;
                          const appliedCount = policyUsage.filter(ep => ep.policy?.applied).length;
                          
                          const formatDate = (dateStr) => {
                            if (!dateStr) return 'N/A';
                            try {
                              const date = new Date(dateStr);
                              return date.toLocaleDateString('fr-FR', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              });
                            } catch {
                              return dateStr;
                            }
                          };
                          
                          return (
                            <tr key={policy.id || polIndex}>
                              <td>
                                <div style={{ fontWeight: '500' }}>
                                  {policy.name || 'Sans nom'}
                                </div>
                                {policy.details?.createdBy && (
                                  <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                    marginTop: '0.25rem'
                                  }}>
                                    Créée par: {policy.details.createdBy}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{ 
                                  color: usageCount > 0 ? '#3b82f6' : '#6b7280',
                                  fontWeight: '500'
                                }}>
                                  {usageCount}
                                </span>
                              </td>
                              <td>
                                <span style={{ 
                                  padding: '0.25rem 0.5rem', 
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  backgroundColor: appliedCount > 0 ? '#d1fae5' : '#f3f4f6',
                                  color: appliedCount > 0 ? '#059669' : '#6b7280',
                                  fontWeight: '500'
                                }}>
                                  {appliedCount} / {usageCount}
                                </span>
                              </td>
                              <td>{formatDate(policy.details?.createDate)}</td>
                              <td>{formatDate(policy.details?.lastModifyDate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tableau complet des endpoints */}
              {endpoints.length > 0 && (
                <div className={styles.endpointsTableSection} style={{ marginTop: '1.5rem' }}>
                  <h4 className={styles.sectionTitle}>Liste des endpoints ({endpoints.length})</h4>
                  <div className={styles.endpointsTableContainer}>
                    <table className={styles.endpointsTable}>
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Type</th>
                          <th>IP</th>
                          <th>OS</th>
                          <th>Géré</th>
                          <th>Dernière connexion</th>
                          <th>Modules</th>
                          <th>Politique</th>
                          <th>Infecté</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoints.map((endpoint, epIndex) => {
                          const enrichedEndpoint = enrichedEndpoints.find(ep => ep.id === endpoint.id);
                          const isInfected = enrichedEndpoint?.isInfected || false;
                          const endpointState = enrichedEndpoint?.endpointState;
                          const lastSeen = enrichedEndpoint?.lastSeen;
                          const modules = enrichedEndpoint?.modules || [];
                          const agent = enrichedEndpoint?.agent || {};
                          const endpointPolicy = enrichedEndpoint?.policy;
                          
                          // Trouver le nom de la politique depuis la liste des politiques
                          const policyName = (() => {
                            if (!endpointPolicy || !policies?.policies) return null;
                            const policy = policies.policies.find(p => p.id === endpointPolicy.id);
                            return policy?.name || endpointPolicy.name || null;
                          })();
                          
                          let stateLabel = 'Inconnu';
                          let stateColor = '#6b7280';
                          let stateBgColor = '#f3f4f6';
                          if (endpointState === 1) {
                            stateLabel = 'En ligne';
                            stateColor = '#10b981';
                            stateBgColor = '#d1fae5';
                          } else if (endpointState === 2) {
                            stateLabel = 'Hors ligne';
                            stateColor = '#ef4444';
                            stateBgColor = '#fee2e2';
                          } else if (endpointState === 3) {
                            stateLabel = 'Suspendu';
                            stateColor = '#f59e0b';
                            stateBgColor = '#fef3c7';
                          }
                          
                          let isDisconnected24h = false;
                          let lastSeenLabel = 'N/A';
                          if (lastSeen) {
                            const lastSeenDate = new Date(lastSeen);
                            const now = new Date();
                            const diffHours = (now - lastSeenDate) / (1000 * 60 * 60);
                            isDisconnected24h = diffHours > 24;
                            lastSeenLabel = lastSeenDate.toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          }
                          
                          const isSignatureOutdated = agent.signatureOutdated || false;
                          const isProductOutdated = agent.productOutdated || false;
                          const isAntivirusUpToDate = !isSignatureOutdated && !isProductOutdated;
                          
                          const getModuleName = (moduleName) => {
                            const moduleNames = {
                              'advancedThreatControl': 'Contrôle avancé des menaces',
                              'antimalware': 'Antimalware',
                              'contentControl': 'Contrôle de contenu',
                              'deviceControl': 'Contrôle des périphériques',
                              'firewall': 'Pare-feu',
                              'powerUser': 'Utilisateur avancé'
                            };
                            return moduleNames[moduleName] || moduleName;
                          };

                          // Fonction pour obtenir l'abréviation d'un module
                          const getModuleAbbreviation = (moduleName) => {
                            const abbreviations = {
                              'advancedThreatControl': 'ATC',
                              'antimalware': 'AM',
                              'contentControl': 'CC',
                              'deviceControl': 'DC',
                              'firewall': 'FW',
                              'powerUser': 'PU'
                            };
                            return abbreviations[moduleName] || moduleName.substring(0, 3).toUpperCase();
                          };
                          
                          let activeModules = [];
                          if (Array.isArray(modules)) {
                            activeModules = modules;
                          } else if (modules && typeof modules === 'object') {
                            activeModules = Object.keys(modules).filter(key => modules[key] === true);
                          }

                          return (
                            <tr key={endpoint.id || epIndex}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {getEndpointIcon(endpoint.type)}
                                  <span>{endpoint.name || 'Sans nom'}</span>
                                </div>
                              </td>
                              <td>
                                <span style={{ 
                                  padding: '0.25rem 0.5rem', 
                                  borderRadius: '4px', 
                                  fontSize: '0.75rem',
                                  backgroundColor: endpoint.type === 'physique' ? '#e3f2fd' : '#f3e5f5',
                                  color: endpoint.type === 'physique' ? '#1976d2' : '#7b1fa2'
                                }}>
                                  {endpoint.type === 'physique' ? 'Physique' : endpoint.type === 'virtuel' ? 'Virtuel' : 'Autre'}
                                </span>
                              </td>
                              <td>{endpoint.ip || 'N/A'}</td>
                              <td>{formatOSName(endpoint.operatingSystem) || 'N/A'}</td>
                              <td>
                                <span style={{ 
                                  color: endpoint.isManaged ? '#10b981' : '#6b7280',
                                  fontWeight: '500'
                                }}>
                                  {endpoint.isManaged ? 'Oui' : 'Non'}
                                </span>
                              </td>
                              <td>
                                {lastSeen ? (
                                  <div style={{ fontSize: '0.75rem' }}>
                                    <div style={{ 
                                      color: isDisconnected24h ? '#ef4444' : '#10b981',
                                      fontWeight: '500',
                                      marginBottom: '0.25rem'
                                    }}>
                                      {isDisconnected24h ? '> 24h' : 'Récent'}
                                    </div>
                                    <div style={{ 
                                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                      fontSize: '0.7rem'
                                    }}>
                                      {lastSeenLabel}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#6b7280' }}>N/A</span>
                                )}
                              </td>
                              <td>
                                {activeModules.length > 0 ? (
                                  <div style={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: '0.25rem',
                                    maxWidth: '120px'
                                  }}>
                                    {activeModules.map((module, idx) => (
                                      <span 
                                        key={idx}
                                        style={{ 
                                          padding: '0.125rem 0.375rem',
                                          borderRadius: '4px',
                                          fontSize: '0.65rem',
                                          backgroundColor: theme === 'dark' ? '#1e1e3f' : '#e0e7ff',
                                          color: theme === 'dark' ? '#a5b4fc' : '#4338ca',
                                          display: 'inline-block',
                                          whiteSpace: 'nowrap',
                                          fontWeight: '600'
                                        }}
                                        title={getModuleName(module)}
                                      >
                                        {getModuleAbbreviation(module)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>N/A</span>
                                )}
                              </td>
                              <td>
                                {policyName ? (
                                  <span style={{ 
                                    fontSize: '0.875rem',
                                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-block',
                                    title: policyName
                                  }}>
                                    {policyName}
                                  </span>
                                ) : (
                                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>N/A</span>
                                )}
                              </td>
                              <td>
                                <span style={{ 
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  backgroundColor: isInfected ? '#fee2e2' : '#d1fae5',
                                  color: isInfected ? '#dc2626' : '#059669',
                                  fontWeight: '500'
                                }}>
                                  {isInfected ? 'Oui' : 'Non'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Zone de commentaire */}
              {comment && (
                <div className={styles.commentSection} style={{ marginTop: '1.5rem' }}>
                  <textarea
                    value={comment}
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

        {/* Carte pour l'ancien format (compatibilité) */}
        {!bitDefenderSolutions.length && staticData.logiciel && (
          <div className={styles.antivirusCard}>
            {/* En-tête de la carte */}
            <div className={styles.cardHeader}>
              <div className={styles.headerLeft}>
                <div className={styles.antivirusInfo}>
                  <h3 className={styles.antivirusName}>
                    <img
                      src={getIconPath('antivirus.png')}
                      alt="Antivirus"
                      style={{ width: '24px', height: '24px', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.75rem', borderRadius: '4px' }}
                    />
                    {staticData.logiciel}
                  </h3>
                </div>
              </div>
            </div>

            {/* Informations de l'antivirus */}
            <div className={styles.antivirusDetailsContainer}>
              <p className={styles.antivirusDetails}>
                {staticData.version && `Version ${staticData.version}`}
                {staticData.version && staticData.expiration && " • "}
                {staticData.expiration && `Expire le ${formatDate(staticData.expiration)}`}
              </p>
            </div>

            {/* Endpoints protégés */}
            {(() => {
              const totalEndpoints = (staticData.stationsWindows || 0) +
                                  (staticData.ServeursWindows || 0) +
                                  (staticData.macos || 0) +
                                  (staticData.machinesPhysiques || 0) +
                                  (staticData.machinesVirtuelles || 0);

              if (totalEndpoints > 0) {
                return (
                  <div className={styles.endpointSection}>
                    <h4 className={styles.endpointTitle}>Endpoints protégés ({totalEndpoints})</h4>
                    <div className={styles.endpointGrid}>
                      {staticData.stationsWindows > 0 && (
                        <div className={styles.endpointItem}>
                          <FaDesktop className={styles.endpointIcon} />
                          <span>Stations Windows</span>
                          <span className={styles.endpointCount}>{staticData.stationsWindows}</span>
                        </div>
                      )}
                      {staticData.ServeursWindows > 0 && (
                        <div className={styles.endpointItem}>
                          <FaServer className={styles.endpointIcon} />
                          <span>Serveurs Windows</span>
                          <span className={styles.endpointCount}>{staticData.ServeursWindows}</span>
                        </div>
                      )}
                      {staticData.macos > 0 && (
                        <div className={styles.endpointItem}>
                          <FaApple className={styles.endpointIcon} />
                          <span>MacOS</span>
                          <span className={styles.endpointCount}>{staticData.macos}</span>
                        </div>
                      )}
                      {staticData.machinesPhysiques > 0 && (
                        <div className={styles.endpointItem}>
                          <FaLaptop className={styles.endpointIcon} />
                          <span>Machines physiques</span>
                          <span className={styles.endpointCount}>{staticData.machinesPhysiques}</span>
                        </div>
                      )}
                      {staticData.machinesVirtuelles > 0 && (
                        <div className={styles.endpointItem}>
                          <FaCloud className={styles.endpointIcon} />
                          <span>Machines virtuelles</span>
                          <span className={styles.endpointCount}>{staticData.machinesVirtuelles}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Section des menaces */}
            {(() => {
              const threats = data?.threats || [];
              if (threats.length > 0) {
                const totalThreats = threats.reduce((total, threat) => total + (parseInt(threat.count) || 0), 0);
                return (
                  <div className={styles.threatsSection}>
                    <h4 className={styles.threatsTitle}>Types de menaces détectées ({totalThreats})</h4>
                    <div className={styles.threatsList}>
                      {threats.map((threat, i) => (
                        <div key={i} className={styles.threatItem}>
                          <div className={styles.threatInputGroup}>
                            <span className={styles.threatLabel}>{threat.type || 'Type inconnu'}</span>
                            <span className={styles.threatCount}>{threat.count || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Zone de commentaire */}
            {comment && (
              <div className={styles.commentSection}>
                <textarea
                  value={comment}
                  readOnly
                  className={styles.commentInput}
                  rows="2"
                  placeholder="Commentaire..."
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  } else {
    // Afficher le message d'attente de synchronisation
    return (
      <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.antivirusGrid}>
          <div className={styles.antivirusCard}>
            <div className={styles.cardHeader}>
              <div className={styles.headerLeft}>
                <div className={styles.antivirusInfo}>
                  <h3 className={styles.antivirusName}>
                    <img
                      src={getIconPath('antivirus.png')}
                      alt="Antivirus"
                      style={{ width: '24px', height: '24px', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.75rem', borderRadius: '4px' }}
                    />
                    <span>Antivirus</span>
                  </h3>
                </div>
              </div>
            </div>
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
              fontSize: '0.875rem'
            }}>
              <p>Module antivirus configuré. En attente de synchronisation des données...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default AntivirusSummary;
