import React, { useMemo } from "react";
import { useTheme } from '../../../hooks/useTheme';
import styles from "./FirewallsSummary.module.css";
import { FaChevronDown, FaShieldVirus, FaNetworkWired, FaExclamationTriangle, FaLock, FaKey, FaShieldAlt } from "react-icons/fa";
import { SiGooglecloud, SiCloudflare, SiAkamai, SiFastly, SiOvh } from "react-icons/si";
import { VscAzure } from "react-icons/vsc";
import { FaAws } from "react-icons/fa";
import { scoreToLetter, scoreToColor, scoreToLabel } from "../../../utils/gradeUtils";
import { getIconPath } from "../../../utils/assetHelper";

const vendorIcons = {
    azure: VscAzure,
    aws: FaAws,
    google: SiGooglecloud,
    cloudflare: SiCloudflare,
    akamai: SiAkamai,
    fastly: SiFastly,
    ovh: SiOvh
};

const FirewallReglesSummary = ({ data, config }) => {
  const { theme } = useTheme();
  const rulesData = data?.rulesData || null;
  const objectsData = data?.objectsData || null;
  const alarmsData = data?.alarmsData || null;
  const webTrafficData = data?.webTrafficData || null;
  const topAlarmEntries = alarmsData?.entries ? alarmsData.entries.slice(0, 5) : [];
  const maxAlarmCount = topAlarmEntries.reduce((max, entry) => Math.max(max, entry.count || 0), 0);
  const totalAlarms = alarmsData?.total || alarmsData?.entries?.reduce((sum, entry) => sum + (entry.count || 0), 0) || 0;
  const topServiceEntries = webTrafficData?.entries ? webTrafficData.entries.slice(0, 5) : [];
  const maxServiceBytes = topServiceEntries.reduce((max, entry) => Math.max(max, entry.totalBytes || 0), 0);
  const totalTrafficBytes = webTrafficData?.entries?.reduce((sum, entry) => sum + (entry.totalBytes || 0), 0) || 0;

  const formatServiceName = (name) => {
    if (!name) return "Service inconnu";
    const firstSegment = name.split(',')[0].trim();
    if (!firstSegment) return "Service inconnu";
    return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
  };

  const getAlarmIcon = (label) => {
    if (!label) return FaExclamationTriangle;
    const lower = label.toLowerCase();
    if (lower.includes("password")) return FaKey;
    if (lower.includes("ssl") || lower.includes("tls")) return FaLock;
    if (lower.includes("icmp") || lower.includes("http") || lower.includes("protocol")) return FaShieldAlt;
    if (lower.includes("spoof") || lower.includes("ip")) return FaExclamationTriangle;
    return FaExclamationTriangle;
  };

  const alarmDescriptions = {
    "ip address spoofing": "Trafic suspect utilisant des adresses IP usurpées pour contourner les contrôles réseau.",
    "ip address spoofing on bridge": "Tentative d'usurpation IP détectée sur une interface bridge.",
    "invalid http protocol": "Requête HTTP malformée ou non conforme aux standards, potentiellement malveillante.",
    "invalid icmp message": "Trame ICMP incorrecte pouvant indiquer une reconnaissance ou une attaque.",
    "icmp echo payload modified": "Paquet ICMP Echo dont le payload a été modifié · signe d'interception.",
    "'link local' addresses (rfc 3330)": "Flux provenant/adressés à des IP Link-Local interdites sur ce segment.",
    "ssl version mismatch": "Négociation SSL/TLS échouée suite à incompatibilité de version.",
    "bad ldap protocol": "Requête LDAP non conforme pouvant révéler un scan ou une attaque.",
    "misplaced tcp option": "Option TCP placée hors contexte, signe potentiel de manipulation.",
    "admin password:": "Événement système relatif au mot de passe administrateur (changement, tentative, etc.)."
  };

  const getAlarmDescription = (label) => {
    if (!label) return null;
    const normalizedLabel = label.toLowerCase().trim();
    if (alarmDescriptions[normalizedLabel]) {
      return alarmDescriptions[normalizedLabel];
    }
    for (const [key, desc] of Object.entries(alarmDescriptions)) {
      if (normalizedLabel.includes(key) || key.includes(normalizedLabel)) {
        return desc;
      }
    }
    return null;
  };

  const securityScoreData = useMemo(() => {
    const breakdown = [];
    let earnedPoints = 0;
    let availablePoints = 0;

    const clampRatio = (value) => Math.max(0, Math.min(1, value));
    const registerCriterion = (applicable, weight, label, value, ratio, percentage = null) => {
      if (!applicable) return;
      availablePoints += weight;
      const normalizedRatio = clampRatio(ratio);
      earnedPoints += normalizedRatio * weight;
      const displayPercentage = percentage !== null ? percentage : Math.round(normalizedRatio * 100);
      breakdown.push({ label, value, percentage: displayPercentage, ratio: normalizedRatio, weight });
    };

    // Score basé uniquement sur les alarmes et le trafic
    if (totalAlarms > 0) {
      const minThreshold = 10;
      const optimalThreshold = 100;
      let alarmRatio = 1;
      if (totalAlarms < minThreshold) {
        alarmRatio = totalAlarms / minThreshold * 0.5;
      } else if (totalAlarms >= optimalThreshold) {
        alarmRatio = 1;
      } else {
        const range = optimalThreshold - minThreshold;
        alarmRatio = 0.5 + ((totalAlarms - minThreshold) / range) * 0.5;
      }
      registerCriterion(
        true,
        50,
        "Détection des menaces",
        `${totalAlarms.toLocaleString()} menaces détectées`,
        alarmRatio,
        Math.round(alarmRatio * 100)
      );
    }

    if (totalTrafficBytes > 0) {
      const trustedTrafficBytes = (webTrafficData?.entries || [])
        .filter(entry => entry.icon)
        .reduce((sum, entry) => sum + (entry.totalBytes || 0), 0);
      const trustedRatio = totalTrafficBytes > 0 ? trustedTrafficBytes / totalTrafficBytes : 0;
      registerCriterion(
        true,
        10,
        "Trafic identifié",
        `${Math.round(trustedRatio * 100)}% vers des services connus`,
        trustedRatio,
        Math.round(trustedRatio * 100)
      );
    }

    if (availablePoints === 0) {
      return null;
    }

    const rawScore = (earnedPoints / availablePoints) * 100;
    const score = Math.round(rawScore);
    const letter = scoreToLetter(score);
    const scoreColor = scoreToColor(score);
    const scoreLabel = scoreToLabel(score);

    return {
      score,
      color: scoreColor,
      label: scoreLabel,
      letter,
      breakdown
    };
  }, [totalAlarms, totalTrafficBytes, webTrafficData]);

  const parseMultipleValues = (value) => {
    if (!value || value === '-' || value === 'any') return [];
    return value.split(/[,;]/)
      .map(v => v.trim())
      .filter(v => v && v !== '-' && v !== 'any');
  };

  const getObjectTooltip = (value, objectLookup) => {
    if (!value || !objectLookup || !objectLookup[value]) return '';
    const obj = objectLookup[value];
    const parts = [obj.type];
    if (obj.ipv4) parts.push(`IPv4: ${obj.ipv4}`);
    if (obj.ipv6) parts.push(`IPv6: ${obj.ipv6}`);
    if (obj.mask) parts.push(`Masque: ${obj.mask}`);
    if (obj.prefix) parts.push(`Préfixe: ${obj.prefix}`);
    if (obj.begin && obj.end) parts.push(`Plage: ${obj.begin} - ${obj.end}`);
    if (obj.protocol) parts.push(`Proto: ${obj.protocol}`);
    if (obj.port) parts.push(`Port: ${obj.port}${obj.toPort ? `-${obj.toPort}` : ''}`);
    if (obj.comment) parts.push(obj.comment);
    return parts.filter(Boolean).join(' • ');
  };

  const MultiValueList = ({ values, icon, emptyText = '-', objectLookup = {} }) => {
    if (!values || values.length === 0) {
      return <span>{emptyText}</span>;
    }
    
    if (values.length === 1) {
    return (
        <div style={{ display: 'inline-block' }} title={getObjectTooltip(values[0], objectLookup) || undefined}>
          {icon && <span style={{ marginRight: '0.25rem' }}>{icon}</span>}
          <span>{values[0]}</span>
      </div>
    );
  }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
        {values.map((val, idx) => (
          <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            {icon && <span>{icon}</span>}
            <span title={getObjectTooltip(val, objectLookup) || undefined}>{val}</span>
        </div>
        ))}
      </div>
    );
  };

  const getSeparatorColorStyle = (colorHex) => {
    if (!colorHex || colorHex.length < 6) return {};
    const r = parseInt(colorHex.substring(0, 2), 16);
    const g = parseInt(colorHex.substring(2, 4), 16);
    const b = parseInt(colorHex.substring(4, 6), 16);
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
      borderLeft: `4px solid rgb(${r}, ${g}, ${b})`
    };
  };

  const shouldShowNA = !securityScoreData;
  const calculatedScore = shouldShowNA ? null : securityScoreData.score;
  const manualScore = data?.manualHealthScore;
  const healthScore = shouldShowNA ? null : (manualScore !== undefined ? manualScore : calculatedScore);
  const scoreColor = shouldShowNA ? '#6b7280' : (healthScore !== null ? (healthScore !== undefined ? securityScoreData.color : '#6b7280') : '#6b7280');
  const scoreLetter = shouldShowNA ? null : (healthScore !== null ? (scoreToLetter(healthScore) || null) : null);
  const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;

  const defaultBreakdown = [
    { label: "Détection des menaces", weight: 50 },
    { label: "Trafic identifié", weight: 50 }
  ];

  const breakdown = shouldShowNA ? defaultBreakdown : securityScoreData.breakdown;

  const getDescription = (label) => {
    const descriptions = {
      "Détection des menaces": "Volume d'alarmes et d'événements de sécurité détectés, indiquant l'activité de surveillance du firewall",
      "Trafic identifié": "Pourcentage du trafic routé vers des services et vendeurs connus et documentés (cloud, SaaS)"
    };
    return descriptions[label] || "";
  };

  const objectLookup = data?.objectLookup || {};

  return (
    <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.firewallRulesCard}>
        {/* En-tête avec titre et logo */}
        <div className={styles.cardHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.firewallInfo}>
              <h3 className={styles.firewallName}>
                <img 
                  src={getIconPath('stormshield.png')} 
                  alt="Stormshield" 
                  style={{ width: '24px', height: '24px', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.75rem', borderRadius: '4px' }} 
                />
                <span>Stormshield</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Métriques principales */}
        {(rulesData || objectsData || alarmsData) ? (
          <div className={styles.metricsRow}>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Objets</div>
              <div className={styles.metricValue}>{objectsData ? objectsData.total.toLocaleString() : '-'}</div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Règles de filtrage</div>
              <div className={styles.metricValue}>{rulesData ? rulesData.totalFilterRules.toLocaleString() : '-'}</div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Règles NAT</div>
              <div className={styles.metricValue}>{rulesData ? rulesData.totalNatRules.toLocaleString() : '-'}</div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Alarmes</div>
              <div className={styles.metricValue}>{totalAlarms ? totalAlarms.toLocaleString() : '0'}</div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
            fontSize: '0.875rem'
          }}>
            <p>Aucune donnée importée. Importez les fichiers CSV depuis le module Firewall Règles pour voir les statistiques.</p>
          </div>
        )}

        {/* Top alarmes et services */}
        {(topAlarmEntries.length > 0 || topServiceEntries.length > 0) && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: topAlarmEntries.length > 0 && topServiceEntries.length > 0 ? '1fr 1fr' : '1fr',
            gap: '1.5rem',
            marginTop: '1.5rem'
          }}>
            {topAlarmEntries.length > 0 && (
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <FaShieldVirus style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }} />
                  <h4 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#f9fafb' : '#111827'
                  }}>
                    Top alarmes de sécurité
                  </h4>
                </div>
                <p style={{
                  margin: '0 0 1rem 0',
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                }}>
                  Statistiques sur les 30 derniers jours
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {topAlarmEntries.map((entry, idx) => {
                    const desc = getAlarmDescription(entry.label);
                    const percentage = maxAlarmCount ? (entry.count / maxAlarmCount) * 100 : 0;
                    const alarmPercentage = totalAlarms > 0 ? (entry.count / totalAlarms) * 100 : 0;
                    const displayLabel = entry.label.replace(/\s*\(.*?\)\s*/g, '').trim();
                    const AlarmIcon = getAlarmIcon(entry.label);
                return (
                      <div
                        key={`alarm-${idx}`}
                    style={{ 
                          position: 'relative',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
                          border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.25rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flex: 1
                          }}>
                            <AlarmIcon style={{ 
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              fontSize: '0.875rem'
                            }} />
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: theme === 'dark' ? '#d1d5db' : '#374151'
                            }}>
                              {displayLabel}
                    </span>
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                            fontWeight: '500'
                          }}>
                            {entry.count.toLocaleString()} alertes ({alarmPercentage.toFixed(1)}%)
                          </div>
                        </div>
                        <div style={{
                          height: '4px',
                          borderRadius: '2px',
                          background: theme === 'dark' ? '#4a4a6a' : '#e5e7eb',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.max(8, percentage)}%`,
                            background: '#ef4444',
                            borderRadius: '2px'
                          }} />
                        </div>
                        {desc && (
                          <div style={{
                            marginTop: '0.25rem',
                            fontSize: '0.7rem',
                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            {desc}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                        </div>
                      )}

            {topServiceEntries.length > 0 && (
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <FaNetworkWired style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }} />
                  <h4 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#f9fafb' : '#111827'
                  }}>
                    Top services web utilisés
                  </h4>
                </div>
                <p style={{
                  margin: '0 0 1rem 0',
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                }}>
                  {webTrafficData?.sampleNote || "Statistiques sur 24h issues d'une journée prise au hasard dans la période monitorée."}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {topServiceEntries.map((entry, idx) => {
                    const IconComp = entry.icon ? vendorIcons[entry.icon] : null;
                    const percentage = maxServiceBytes ? (entry.totalBytes / maxServiceBytes) * 100 : 0;
                    const servicePercentage = totalTrafficBytes > 0 ? (entry.totalBytes / totalTrafficBytes) * 100 : 0;
                    const displayService = formatServiceName(entry.service);
                    return (
                      <div 
                        key={`traffic-${idx}`}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '6px',
                          background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
                          border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.25rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flex: 1
                          }}>
                            {IconComp ? (
                              <IconComp style={{ 
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                fontSize: '1rem'
                              }} />
                            ) : (
                              <div style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '4px',
                                background: theme === 'dark' ? '#4a4a6a' : '#e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.6rem',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                              }}>
                                L
                                </div>
                              )}
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: theme === 'dark' ? '#d1d5db' : '#374151'
                            }}>
                              {displayService}
                              </span>
                            </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                            fontWeight: '500'
                          }}>
                            {(entry.totalBytes / (1024 * 1024)).toFixed(1)} Mo ({servicePercentage.toFixed(1)}%)
                          </div>
                        </div>
                        <div style={{
                          height: '4px',
                          borderRadius: '2px',
                          background: theme === 'dark' ? '#4a4a6a' : '#e5e7eb',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.max(8, percentage)}%`,
                            background: '#3b82f6',
                            borderRadius: '2px'
                          }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
            )}
                        </div>
        )}

        {/* Tables objets supprimées du résumé */}

        {/* Tables règles de filtrage supprimées du résumé */}
      </div>
    </div>
  );
};

export default FirewallReglesSummary;

