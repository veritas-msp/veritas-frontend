import React, { useMemo, useState } from "react";
import { useTheme } from '../../../hooks/useTheme';
import styles from "./AntispamSummary.module.css";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { scoreToLetter, scoreToColor, scoreToLabel } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import MetricLetter from "../common/MetricLetter";
import { getIconPath } from "../../../utils/assetHelper";

const AntispamSummary = ({ data, config }) => {
  const { theme } = useTheme();
  const staticData = config?.client?.equipements?.Antispam || {};
  const statsData = data?.statsData || null;
  const usersData = data?.usersData || null;
  const [statsViewMode, setStatsViewMode] = useState("week"); // 'day' ou 'week' - par défaut 'week'
  const [statsPagination, setStatsPagination] = useState(1); // Pagination pour les statistiques

  // Fonction pour formater une date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };

  // Fonction pour récupérer la période du rapport
  const getReportPeriod = () => {
    if (config?.client?.checkmkPeriod) {
      return {
        start_time: config.client.checkmkPeriod.start_time,
        end_time: config.client.checkmkPeriod.end_time
      };
    }
    // Période par défaut : dernier mois
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    return {
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString()
    };
  };

  // Fonction pour filtrer les statistiques selon la période du rapport
  const filterStatsByReportPeriod = (stats) => {
    if (!stats || stats.length === 0) return [];
    
    const reportPeriod = getReportPeriod();
    if (!reportPeriod.start_time || !reportPeriod.end_time) return stats;
    
    // Normaliser les dates de début et fin (sans heures/minutes/secondes)
    const startDate = new Date(reportPeriod.start_time);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(reportPeriod.end_time);
    endDate.setHours(23, 59, 59, 999); // Inclure toute la journée de fin
    
    return stats.filter(stat => {
      // Parser la date au format DD/MM/YYYY
      const dateParts = stat.period.split('/');
      if (dateParts.length !== 3) return false;
      
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Les mois sont 0-indexés en JS
      const year = parseInt(dateParts[2], 10);
      const statDate = new Date(year, month, day);
      statDate.setHours(0, 0, 0, 0); // Normaliser à minuit
      
      // Vérifier si la date est dans la période du rapport
      return statDate >= startDate && statDate <= endDate;
    });
  };

  // Fonction pour calculer la note globale basée sur les statistiques importées (identique à Antispam.js)
  const calculateGlobalScore = () => {
    const defaultFactors = [
      {
        label: 'Emails valides',
        description: 'Pourcentage d\'emails valides parmi tous les emails traités',
        weight: '40 pts'
      },
      {
        label: 'Menaces bloquées',
        description: 'Pourcentage de menaces (spam, infectés, bannis) bloquées par l\'antispam',
        weight: '30 pts'
      },
      {
        label: 'Menaces critiques',
        description: 'Pourcentage de menaces critiques (infectés + spearphishing) détectées',
        weight: '20 pts'
      },
      {
        label: 'Spearphishing',
        description: 'Pourcentage d\'emails de spearphishing détectés',
        weight: '10 pts'
      }
    ];

    // Filtrer les statistiques selon la période du rapport
    const filteredStats = filterStatsByReportPeriod(statsData);
    
    if (!filteredStats || filteredStats.length === 0) {
      return { 
        score: null, 
        color: '#6b7280', 
        label: 'N/A', 
        factors: defaultFactors, 
        validRate: null, 
        threatRate: null, 
        criticalThreatRate: null, 
        spearphishingRate: null 
      };
    }

    const totals = filteredStats.reduce((acc, stat) => ({
      valid: acc.valid + (stat.valid || 0),
      infected: acc.infected + (stat.infected || 0),
      spam: acc.spam + (stat.spam || 0),
      banned: acc.banned + (stat.banned || 0),
      spearphishing: acc.spearphishing + (stat.spearphishing || 0),
      pending: acc.pending + (stat.pending || 0),
      total: acc.total + (stat.total || 0)
    }), { valid: 0, infected: 0, spam: 0, banned: 0, spearphishing: 0, pending: 0, total: 0 });

    if (totals.total === 0) {
      return { 
        score: null, 
        color: '#6b7280', 
        label: 'N/A', 
        factors: defaultFactors, 
        validRate: null, 
        threatRate: null, 
        criticalThreatRate: null, 
        spearphishingRate: null 
      };
    }

    // Calcul des taux
    const validRate = (totals.valid / totals.total) * 100;
    const threatRate = ((totals.infected + totals.spam + totals.banned + totals.spearphishing) / totals.total) * 100;
    const spearphishingRate = (totals.spearphishing / totals.total) * 100;
    const criticalThreatRate = ((totals.infected + totals.spearphishing) / totals.total) * 100;

    // Calcul de la note (sur 100)
    const validScore = Math.min(100, validRate * 1.0) * 0.4;
    const threatScore = Math.max(0, (100 - threatRate * 2)) * 0.3;
    const criticalThreatScore = Math.max(0, (100 - criticalThreatRate * 5)) * 0.2;
    const spearphishingScore = Math.max(0, (100 - spearphishingRate * 10)) * 0.1;

    let finalScore = validScore + threatScore + criticalThreatScore + spearphishingScore;
    finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));

    const color = scoreToColor(finalScore);
    const label = scoreToLabel(finalScore);

    const factors = [
      {
        label: 'Emails valides',
        description: 'Pourcentage d\'emails valides parmi tous les emails traités',
        weight: '40 pts',
        score: Math.round(validScore),
        value: validRate
      },
      {
        label: 'Menaces bloquées',
        description: 'Pourcentage de menaces (spam, infectés, bannis) bloquées par l\'antispam',
        weight: '30 pts',
        score: Math.round(threatScore),
        value: threatRate
      },
      {
        label: 'Menaces critiques',
        description: 'Pourcentage de menaces critiques (infectés + spearphishing) détectées',
        weight: '20 pts',
        score: Math.round(criticalThreatScore),
        value: criticalThreatRate
      },
      {
        label: 'Spearphishing',
        description: 'Pourcentage d\'emails de spearphishing détectés',
        weight: '10 pts',
        score: Math.round(spearphishingScore),
        value: spearphishingRate
      }
    ];

    return { 
      score: finalScore, 
      color, 
      label, 
      factors, 
      validRate, 
      threatRate, 
      criticalThreatRate, 
      spearphishingRate 
    };
  };

  // Fonction pour regrouper les statistiques par semaine (identique à Antispam.js)
  const groupStatsByWeek = () => {
    // Filtrer les statistiques selon la période du rapport
    const filteredStats = filterStatsByReportPeriod(statsData);
    
    if (!filteredStats || filteredStats.length === 0) return [];

    const weekMap = new Map();

    filteredStats.forEach(stat => {
      const dateParts = stat.period.split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const date = new Date(year, month, day);

        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diff);
        monday.setHours(0, 0, 0, 0);

        const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const weekLabel = `Semaine du ${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}/${monday.getFullYear()}`;

        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, {
            period: weekLabel,
            weekStart: monday,
            valid: 0,
            infected: 0,
            spam: 0,
            banned: 0,
            spearphishing: 0,
            pending: 0,
            total: 0
          });
        }

        const weekStat = weekMap.get(weekKey);
        weekStat.valid += stat.valid || 0;
        weekStat.infected += stat.infected || 0;
        weekStat.spam += stat.spam || 0;
        weekStat.banned += stat.banned || 0;
        weekStat.spearphishing += stat.spearphishing || 0;
        weekStat.pending += stat.pending || 0;
        weekStat.total += stat.total || 0;
      }
    });

    return Array.from(weekMap.values()).sort((a, b) => {
      return b.weekStart - a.weekStart;
    });
  };

  // Fonction pour nettoyer les caractères d'encodage
  const cleanText = (text) => {
    if (!text) return '';
    
    // Supprimer le BOM UTF-8
    text = text.replace(/^\uFEFF/, '');
    
    // Détecter si le texte a des caractères null entre chaque lettre (problème UTF-16)
    let hasNullChars = false;
    let nullCharCount = 0;
    for (let i = 0; i < Math.min(200, text.length); i += 2) {
      if (i + 1 < text.length && text.charCodeAt(i + 1) === 0) {
        nullCharCount++;
      }
    }
    hasNullChars = nullCharCount > Math.min(200, text.length) * 0.3;
    
    if (hasNullChars) {
      // Extraire seulement les caractères pairs (UTF-16 LE)
      let cleaned = '';
      for (let i = 0; i < text.length; i += 2) {
        if (i < text.length) {
          const char = text[i];
          const code = text.charCodeAt(i);
          // Garder seulement les caractères imprimables et les caractères de ligne
          if (code >= 32 || code === 9 || code === 10 || code === 13) {
            cleaned += char;
          }
        }
      }
      text = cleaned;
    } else {
      // Vérifier s'il y a beaucoup de caractères de contrôle
      let controlCharCount = 0;
      for (let i = 0; i < Math.min(200, text.length); i++) {
        const code = text.charCodeAt(i);
        // Caractères de contrôle (sauf tab, newline, carriage return)
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
          controlCharCount++;
        }
      }
      const hasControlChars = controlCharCount > text.length * 0.2;
      
      if (hasControlChars) {
        // Extraire seulement les caractères non-contrôle
        let cleaned = '';
        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          // Garder seulement les caractères imprimables et les caractères de ligne
          if (code >= 32 || code === 9 || code === 10 || code === 13) {
            cleaned += text[i];
          }
        }
        text = cleaned;
      }
    }
    
    // Nettoyer les caractères de contrôle invisibles restants et les caractères null
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    text = text.replace(/\0/g, ''); // Supprimer tous les caractères null restants
    
    return text;
  };

  // Fonction pour nettoyer une chaîne de caractères (pour les en-têtes et valeurs)
  const cleanString = (str) => {
    if (!str) return '';
    // Convertir en tableau de caractères et filtrer les caractères null
    let cleaned = '';
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const code = str.charCodeAt(i);
      // Ignorer les caractères null (code 0)
      if (code !== 0) {
        cleaned += char;
      }
    }
    // Supprimer les espaces en début et fin
    cleaned = cleaned.trim();
    return cleaned;
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

  // Calculer le score global
  const globalScore = calculateGlobalScore();
  const finalScore = globalScore.score;
  const scoreColor = finalScore !== null ? globalScore.color : '#6b7280';
  const scoreLetter = finalScore !== null ? scoreToLetter(finalScore) : null;

  // Calculer les totaux des statistiques (filtrées par période du rapport)
  const totals = useMemo(() => {
    // Filtrer les statistiques selon la période du rapport
    const filteredStats = filterStatsByReportPeriod(statsData);
    
    if (!filteredStats || filteredStats.length === 0) {
      return { valid: 0, infected: 0, spam: 0, banned: 0, spearphishing: 0, pending: 0, total: 0 };
    }
    return filteredStats.reduce((acc, stat) => ({
      valid: acc.valid + (stat.valid || 0),
      infected: acc.infected + (stat.infected || 0),
      spam: acc.spam + (stat.spam || 0),
      banned: acc.banned + (stat.banned || 0),
      spearphishing: acc.spearphishing + (stat.spearphishing || 0),
      pending: acc.pending + (stat.pending || 0),
      total: acc.total + (stat.total || 0)
    }), { valid: 0, infected: 0, spam: 0, banned: 0, spearphishing: 0, pending: 0, total: 0 });
  }, [statsData, config]);

  const threatRate = totals.total > 0 ? Math.round(((totals.infected + totals.spam + totals.banned + totals.spearphishing) / totals.total * 100) * 10) / 10 : 0;
  const validRate = totals.total > 0 ? Math.round((totals.valid / totals.total * 100) * 10) / 10 : 0;

  // Préparer les données pour l'affichage (graphique et table) selon le mode sélectionné
  const displayData = useMemo(() => {
    // Filtrer les statistiques selon la période du rapport
    const filteredStats = filterStatsByReportPeriod(statsData);
    
    if (!filteredStats || filteredStats.length === 0) return [];
    
    // Pour le mode semaine, utiliser groupStatsByWeek et inverser pour avoir du plus ancien au plus récent
    if (statsViewMode === 'week') {
      const weekData = groupStatsByWeek();
      return weekData.reverse();
    }
    
    // Pour le mode jour, trier du plus ancien au plus récent
    return [...filteredStats].sort((a, b) => {
      const dateA = new Date(a.period);
      const dateB = new Date(b.period);
      return dateA - dateB;
    });
  }, [statsData, statsViewMode, config]);

  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    if (displayData.length === 0) return [];
    
    return displayData.map(stat => ({
      period: statsViewMode === 'week' ? stat.period.replace('Semaine du ', '') : stat.period,
      Valides: stat.valid || 0,
      Infectés: stat.infected || 0,
      Spam: stat.spam || 0,
      Bannis: stat.banned || 0,
      Spearphishing: stat.spearphishing || 0,
      'En attente': stat.pending || 0,
      Total: stat.total || 0
    }));
  }, [displayData, statsViewMode]);

  return (
    <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.antispamGrid}>
        <div className={styles.antispamCard}>
          {/* En-tête avec titre et logo */}
          <div className={styles.cardHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.antispamInfo}>
                <h3 className={styles.antispamName}>
                  <img 
                    src={getIconPath('mailinblack.png')} 
                    alt="Mail in Black" 
                    style={{ width: '24px', height: '24px', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.75rem', borderRadius: '4px' }} 
                  />
                  <span>{staticData.logiciel || "Mail In Black"}</span>
                </h3>
              </div>
            </div>
          </div>

          {/* Métriques principales */}
          {statsData && statsData.length > 0 && (
            <div className={styles.metricsRow}>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Total emails</div>
                <div className={styles.metricValue}>
                  {totals.total.toLocaleString()}
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Emails valides</div>
                <div className={styles.metricValue} style={{ color: '#10b981' }}>
                  {totals.valid.toLocaleString()} ({validRate}%)
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Menaces bloquées</div>
                <div className={styles.metricValue} style={{ color: '#ef4444' }}>
                  {(totals.infected + totals.spam + totals.banned + totals.spearphishing).toLocaleString()} ({threatRate}%)
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Spam</div>
                <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                  {totals.spam.toLocaleString()}
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Infectés</div>
                <div className={styles.metricValue} style={{ color: '#ef4444' }}>
                  {totals.infected.toLocaleString()}
                </div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>Spearphishing</div>
                <div className={styles.metricValue} style={{ color: '#dc2626' }}>
                  {totals.spearphishing.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Statistiques des utilisateurs */}
          {usersData && usersData.length > 0 && (() => {
            const totalUsers = usersData.length;
            const protectedUsers = usersData.filter(user => {
              const cleanStatus = cleanString(user.protectionStatus || '');
              return cleanStatus === 'Protected';
            }).length;
            const protectionRate = totalUsers > 0 ? Math.round((protectedUsers / totalUsers * 100) * 10) / 10 : 0;
            const nonProtectedRate = totalUsers > 0 ? Math.round(((totalUsers - protectedUsers) / totalUsers * 100) * 10) / 10 : 0;
            const totalAliases = usersData.reduce((sum, user) => {
              return sum + (user.aliases && Array.isArray(user.aliases) ? user.aliases.length : 0);
            }, 0);
            
            return (
              <div className={styles.metricsRow} style={{ marginTop: '1.5rem' }}>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Total utilisateurs</div>
                  <div className={styles.metricValue}>
                    {totalUsers.toLocaleString()}
                  </div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Protégés</div>
                  <div className={styles.metricValue} style={{ color: '#10b981' }}>
                    {protectedUsers.toLocaleString()} ({protectionRate}%)
                  </div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Non protégés</div>
                  <div className={styles.metricValue} style={{ color: '#ef4444' }}>
                    {(totalUsers - protectedUsers).toLocaleString()} ({nonProtectedRate}%)
                  </div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabel}>Total alias</div>
                  <div className={styles.metricValue} style={{ color: '#3b82f6' }}>
                    {totalAliases.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Informations de licence */}
          {(() => {
            // Récupérer les données de licence depuis staticData
            const solutions = staticData?.solutions || [];
            const firstSolution = solutions.length > 0 ? solutions[0] : staticData;
            const licencesTotales = firstSolution?.licencesTotales || staticData?.licencesTotales || "";
            const licencesUtilisees = usersData && usersData.length > 0 
              ? usersData.length 
              : (firstSolution?.utilisateursProteges || staticData?.utilisateursProteges || 0);
            const expiration = firstSolution?.expiration || staticData?.expiration || "";

            if (!licencesTotales && !licencesUtilisees && !expiration) {
              return null;
            }

            return (
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
            );
          })()}

          {/* Graphique et tableau des statistiques */}
          {statsData && statsData.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              {/* En-tête avec filtre */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                <h4 className={styles.sectionTitle} style={{ margin: 0 }}>
                  Statistiques détaillées
                </h4>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  flexShrink: 0,
                  background: theme === 'dark' ? '#2d2d4f' : '#f3f4f6',
                  padding: '0.125rem',
                  borderRadius: '6px',
                  border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={() => {
                      setStatsViewMode('day');
                      setStatsPagination(1);
                    }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.7rem',
                      fontWeight: '500',
                      color: statsViewMode === 'day'
                        ? (theme === 'dark' ? '#f9fafb' : '#111827')
                        : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                      background: statsViewMode === 'day'
                        ? (theme === 'dark' ? '#1e1e3f' : '#ffffff')
                        : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: statsViewMode === 'day'
                        ? '0 1px 2px rgba(0,0,0,0.1)' 
                        : 'none'
                    }}
                  >
                    Par jour
                  </button>
                  <button
                    onClick={() => {
                      setStatsViewMode('week');
                      setStatsPagination(1);
                    }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.7rem',
                      fontWeight: '500',
                      color: statsViewMode === 'week'
                        ? (theme === 'dark' ? '#f9fafb' : '#111827')
                        : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                      background: statsViewMode === 'week'
                        ? (theme === 'dark' ? '#1e1e3f' : '#ffffff')
                        : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: statsViewMode === 'week'
                        ? '0 1px 2px rgba(0,0,0,0.1)' 
                        : 'none'
                    }}
                  >
                    Par semaine
                  </button>
                </div>
              </div>

              {/* Graphique */}
              {chartData.length > 0 && (
                <div className={styles.chartsContainer} style={{ marginBottom: '1.5rem' }}>
                  <div className={styles.chartCard}>
                    <h5 className={styles.chartTitle}>Statistiques détaillées par période</h5>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4a4a6a' : '#e5e7eb'} />
                        <XAxis 
                          dataKey="period" 
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
                            value: "Nombre d'emails", 
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
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px', color: theme === 'dark' ? '#d1d5db' : '#374151' }}
                          iconType="square"
                        />
                        <Bar dataKey="Valides" fill="#10b981" />
                        <Bar dataKey="Infectés" fill="#ef4444" />
                        <Bar dataKey="Spam" fill="#f59e0b" />
                        <Bar dataKey="Bannis" fill="#ef4444" />
                        <Bar dataKey="Spearphishing" fill="#dc2626" />
                        <Bar dataKey="En attente" fill="#6b7280" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tableau des statistiques */}
              {(() => {
                const STATS_PER_PAGE = 10;
                const currentPage = statsPagination;
                const totalPages = Math.ceil(displayData.length / STATS_PER_PAGE);
                const startIndex = (currentPage - 1) * STATS_PER_PAGE;
                const endIndex = startIndex + STATS_PER_PAGE;
                const paginatedDisplayData = displayData.slice(startIndex, endIndex);

                return (
                  <>
                    <div className={styles.endpointsTableContainer}>
                      <table className={styles.endpointsTable}>
                        <thead>
                          <tr>
                            <th>{statsViewMode === 'week' ? 'Semaine' : 'Période'}</th>
                            <th>Valides</th>
                            <th>Infectés</th>
                            <th>Spam</th>
                            <th>Bannis</th>
                            <th>Spearphishing</th>
                            <th>En attente</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedDisplayData.length > 0 ? (
                            paginatedDisplayData.map((stat, index) => (
                              <tr key={index}>
                                <td>{stat.period}</td>
                                <td style={{ textAlign: 'right', color: '#10b981' }}>{stat.valid.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', color: '#ef4444' }}>{stat.infected.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', color: '#f59e0b' }}>{stat.spam.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', color: '#ef4444' }}>{stat.banned.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', color: '#dc2626' }}>{stat.spearphishing.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', color: '#6b7280' }}>{stat.pending.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', fontWeight: '600' }}>{stat.total.toLocaleString()}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                                Aucune donnée à afficher
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          onClick={() => setStatsPagination(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          style={{
                            padding: '0.5rem 0.75rem',
                            border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                            borderRadius: '6px',
                            background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                            color: theme === 'dark' ? '#f9fafb' : '#111827',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1,
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (currentPage !== 1) {
                              e.currentTarget.style.borderColor = theme === 'dark' ? '#6a6a8a' : '#d1d5db';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = theme === 'dark' ? '#4a4a6a' : '#e5e7eb';
                          }}
                        >
                          ← Précédent
                        </button>
                        <span style={{ fontSize: '0.875rem', color: theme === 'dark' ? '#9ca3af' : '#6b7280', fontWeight: '500' }}>
                          Page {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setStatsPagination(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          style={{
                            padding: '0.5rem 0.75rem',
                            border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                            borderRadius: '6px',
                            background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                            color: theme === 'dark' ? '#f9fafb' : '#111827',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1,
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (currentPage !== totalPages) {
                              e.currentTarget.style.borderColor = theme === 'dark' ? '#6a6a8a' : '#d1d5db';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = theme === 'dark' ? '#4a4a6a' : '#e5e7eb';
                          }}
                        >
                          Suivant →
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Message si aucune donnée */}
          {(!statsData || statsData.length === 0) && (!usersData || usersData.length === 0) && (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
              fontSize: '0.875rem'
            }}>
              <p>Aucune donnée importée. Importez les fichiers CSV depuis le module Antispam pour voir les statistiques et utilisateurs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AntispamSummary;
