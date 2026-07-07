import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaWindows, FaLinux, FaSync, FaExclamationCircle, FaServer, FaCube, FaLink } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Serveurs.module.css";
import commonStyles from "./ModuleCommon.module.css";
import SmartTooltip from "../../SmartTooltip";
import API_BASE_URL from "../../../config";
import { getCheckMKReportPeriodData } from "../../../api/checkmkReportPeriod";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import CheckMKMappingModal from "../../AdminPage/MonitoringClientSkeleton/ClientSteps/CheckMKMappingModal";
import { SERVER_ROLE_OPTIONS } from "../../EquipementPage/constants/serverRoleOptions";

// Options par défaut pour les toasts (bas à droite)
const toastOptions = { position: "bottom-right", autoClose: 3000 };

const defaultServices = ["CPU", "RAM", "C:/", "UPTIME"];

// Composant MultiSelectDropdown pour les rôles
const MultiSelectDropdown = ({ options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleOptionClick = (option) => {
    const newSelected = selectedValues.includes(option)
      ? selectedValues.filter(val => val !== option)
      : [...selectedValues, option];
    onChange(newSelected);
  };

  const removeTag = (tagToRemove) => {
    const newSelected = selectedValues.filter(tag => tag !== tagToRemove);
    onChange(newSelected);
  };

  // Fermer le dropdown si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrer les options selon la recherche
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Zone des tags avec espace cliquable */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '0.35rem', 
          minHeight: '2.5rem',
          padding: '0.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          background: '#ffffff',
          cursor: 'text',
          alignItems: 'center'
        }}
        onClick={(e) => {
          // Si on clique sur l'espace vide (pas sur un tag ou un bouton), ouvrir le dropdown
          if (e.target === e.currentTarget || (e.target.tagName === 'INPUT' && e.target.type === 'text')) {
            const input = e.currentTarget.querySelector('input[type="text"]');
            if (input) {
              input.focus();
              setIsOpen(true);
            }
          }
        }}
      >
        {selectedValues.map((tag, index) => (
          <span 
            key={index} 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              padding: '0.25rem 0.5rem',
              background: '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              cursor: 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {tag}
            <button
              type="button"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
                lineHeight: '1',
                padding: '0.1rem 0.2rem',
                marginLeft: '0.2rem',
                borderRadius: '3px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '14px',
                minHeight: '14px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ×
            </button>
          </span>
        ))}
        
        {/* Champ de saisie intégré */}
        <input
          type="text"
          style={{
            flex: 1,
            minWidth: '120px',
            padding: '0.25rem 0.5rem',
            border: 'none',
            background: 'transparent',
            color: '#1a1a1a',
            fontSize: '0.9rem',
            outline: 'none',
            cursor: 'text'
          }}
          placeholder={selectedValues.length === 0 ? placeholder : "Ajouter un rôle..."}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        />
      </div>
      
      {/* Liste déroulante */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          marginTop: '0.25rem',
          maxHeight: '200px',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          {filteredOptions.map((option) => {
            const isSelected = selectedValues.includes(option);
            return (
              <div
                key={option}
                style={{
                  width: '100%',
                  minHeight: '36px',
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: isSelected ? '#3b82f6' : 'transparent',
                  color: isSelected ? 'white' : '#1a1a1a',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onClick={() => handleOptionClick(option)}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.target.style.background = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  style={{
                    margin: 0,
                    accentColor: isSelected ? 'white' : '#3b82f6',
                    cursor: 'pointer',
                    flexShrink: 0,
                    width: '16px',
                    height: '16px'
                  }}
                />
                <span style={{ 
                  cursor: 'pointer',
                  flex: 1,
                  textAlign: 'left',
                  fontSize: '0.9rem'
                }}>
                  {option}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Serveurs = ({ config, setConfig, data, setData, onSyncAllCheckMKReady }) => {
    const serveurs = config?.client?.equipements?.Serveurs || [];
    // Options de rôles disponibles
    const roleOptions = SERVER_ROLE_OPTIONS;
    const [checkmkMappings, setCheckmkMappings] = useState({});
    const [checkmkData, setCheckmkData] = useState({});
    const [loadingCheckMK, setLoadingCheckMK] = useState({});
    
    // Fonction helper pour obtenir le mapping CheckMK d'un serveur (par nom ou id)
    const getCheckMKMapping = useCallback((serverNameOrId) => {
        if (!serverNameOrId) return null;

        // Toujours normaliser en string, car equipment_id vient de la DB
        const idKey = String(serverNameOrId);
        if (checkmkMappings[idKey]) {
            return checkmkMappings[idKey];
        }

        // Sinon, chercher par nom dans la liste des serveurs
        const server = serveurs.find(srv => srv.nom === serverNameOrId);
        if (server?.id && checkmkMappings[String(server.id)]) {
            return checkmkMappings[String(server.id)];
        }

        return null;
    }, [checkmkMappings, serveurs]);
    const [openComments, setOpenComments] = useState({});
    const [syncMode, setSyncMode] = useState({}); // 'manual' ou 'checkmk' pour chaque serveur
    const [editingServer, setEditingServer] = useState(null); // Serveur en cours d'édition
    const [editForm, setEditForm] = useState(null); // Formulaire d'édition
    const [isSaving, setIsSaving] = useState(false); // État de sauvegarde
    const [checkmkMappingModal, setCheckmkMappingModal] = useState({ isOpen: false, serverId: null }); // Modal de mapping CheckMK
    const [eventsCount, setEventsCount] = useState({}); // Nombre d'événements sur la période par serveur
    const [totalEventsCount, setTotalEventsCount] = useState({}); // Nombre total d'événements par serveur
    const [lastEventDate, setLastEventDate] = useState({}); // Date du dernier événement par serveur
    const [eventsData, setEventsData] = useState({}); // Données détaillées des événements par serveur
    const [availabilityData, setAvailabilityData] = useState({}); // Données de disponibilité par serveur
    const [hoveredTooltip, setHoveredTooltip] = useState(null); // { type: 'services' | 'events', serverName, mouseX, mouseY }
    const [hoveredLabelsTooltip, setHoveredLabelsTooltip] = useState(null); // { serverName, mouseX, mouseY }
    const [animatedScore, setAnimatedScore] = useState({}); // Score animé pour chaque serveur
    const [animatedAvailability, setAnimatedAvailability] = useState({}); // Disponibilité animée pour chaque serveur
    const [animatedServices, setAnimatedServices] = useState({}); // Services animés pour chaque serveur
    const [animatedEvents, setAnimatedEvents] = useState({}); // Événements animés pour chaque serveur
    const [scoreAnimationComplete, setScoreAnimationComplete] = useState({}); // Indique si l'animation du score est terminée
    const [editingScore, setEditingScore] = useState({}); // { serverName: true/false } pour savoir quel score est en cours d'édition
    const [editingScoreValue, setEditingScoreValue] = useState({}); // Valeur temporaire pendant l'édition
    const [focusedInput, setFocusedInput] = useState(null); // { service, type } pour savoir quel input est focus
    const hasRestoredDataRef = useRef(false); // Pour éviter de restaurer plusieurs fois
    const dataRef = useRef(data); // Ref pour avoir la valeur à jour de data dans les fonctions async
    const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);

    // 🔁 Restaurer l'état d'ouverture des commentaires depuis les données du rapport
    useEffect(() => {
        if (!data) return;
        setOpenComments((prev) => {
            const next = { ...prev };
            Object.keys(data).forEach((serverName) => {
                const isOpen = data[serverName]?.isCommentOpen;
                if (typeof isOpen === 'boolean') {
                    next[serverName] = isOpen;
                }
            });
            return next;
        });
    }, [data]);
    const syncAllCheckMKRef = useRef(null);
    const lastNotifiedSyncInfoRef = useRef({ hasMappings: null, isLoading: null });

    // Fonction pour générer une couleur basée sur le rôle du serveur
    const getRoleColor = (role) => {
        if (!role) return { bg: "#9ca3af", text: "#ffffff" };
        
        // Si role est un tableau, prendre le premier rôle
        let roleString = role;
        if (Array.isArray(role)) {
            if (role.length === 0) return { bg: "#9ca3af", text: "#ffffff" };
            roleString = role[0]; // Prendre le premier rôle pour la couleur
        }
        
        // S'assurer que roleString est une string
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
            "base de données": { bg: "#10b981", text: "#ffffff" },
            "database": { bg: "#10b981", text: "#ffffff" },
            "db": { bg: "#10b981", text: "#ffffff" },
            "sql": { bg: "#10b981", text: "#ffffff" },
            
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

    const updateValue = (serverName, service, level, value) => {
        const updated = {
            ...data,
            [serverName]: {
                ...(data[serverName] || {}),
                [service]: {
                    ...(data[serverName]?.[service] || {}),
                    [level]: value
                }
            }
        };
        setData(updated);
    };

    const updateComment = (serverName, comment) => {
        const updated = {
            ...data,
            [serverName]: {
                ...(data[serverName] || {}),
                comment
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    const toggleCommentVisibility = (serverName) => {
        // 1) Met à jour l'état local d'ouverture
        setOpenComments((prev) => ({
            ...prev,
            [serverName]: !prev[serverName],
        }));

        // 2) Persiste l'état dans les données du rapport (contexte monitoring)
        setData((prevData) => {
            const currentData = prevData || {};
            const prevIsOpen = !!currentData[serverName]?.isCommentOpen;
            const nextIsOpen = !prevIsOpen;

            const updated = {
                ...currentData,
                [serverName]: {
                    ...(currentData[serverName] || {}),
                    isCommentOpen: nextIsOpen,
                },
            };

            // Maintenir aussi la ref à jour pour les fonctions asynchrones
            dataRef.current = updated;

            return updated;
        });
    };

    // Fonction pour appliquer une note manuelle
    const applyManualScore = (serverName, scoreValue) => {
        const updated = {
            ...data,
            [serverName]: {
                ...(data[serverName] || {}),
                manualHealthScore: scoreValue
            }
        };
        setData(updated);
        dataRef.current = updated;
    };

    // Fonction pour gérer la sélection manuelle d'une lettre
    const handleManualLetterSelect = (serverName, letter) => {
        const scoreValue = letterToScore(letter);
        if (scoreValue === null) return;
        applyManualScore(serverName, scoreValue);
    };

    // Fonctions pour gérer l'édition manuelle de la note
    const startEditScore = (serverName, currentScore) => {
        setEditingScore(prev => ({ ...prev, [serverName]: true }));
        setEditingScoreValue(prev => ({ ...prev, [serverName]: currentScore || '' }));
    };

    const saveEditScore = (serverName) => {
        const manualScore = editingScoreValue[serverName];
        if (manualScore !== undefined && manualScore !== null && manualScore !== '') {
            const scoreValue = Math.max(0, Math.min(100, parseInt(manualScore, 10) || 0));
            const updated = {
                ...data,
                [serverName]: {
                    ...(data[serverName] || {}),
                    manualHealthScore: scoreValue
                }
            };
            setData(updated);
            dataRef.current = updated;
        }
        setEditingScore(prev => ({ ...prev, [serverName]: false }));
        setEditingScoreValue(prev => {
            const newValue = { ...prev };
            delete newValue[serverName];
            return newValue;
        });
    };

    const cancelEditScore = (serverName) => {
        setEditingScore(prev => ({ ...prev, [serverName]: false }));
        setEditingScoreValue(prev => {
            const newValue = { ...prev };
            delete newValue[serverName];
            return newValue;
        });
    };

    // Fonction pour sélectionner tout le contenu du champ au focus
    const handleInputFocus = (e, service, type) => {
        e.target.select();
        setFocusedInput({ service, type });
    };

    const handleInputBlur = () => {
        setFocusedInput(null);
    };

    const getTotal = (serverName, service) => {
        const srvData = data?.[serverName]?.[service] || {};
        const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
        const ok = srvData.ok !== undefined ? parse(srvData.ok, 100) : 100;
        const warn = srvData.warn !== undefined ? parse(srvData.warn, 0) : 0;
        const crit = srvData.crit !== undefined ? parse(srvData.crit, 0) : 0;
        return ok + warn + crit;
    };

    const parsePercentageValue = (value) => {
        if (value === undefined || value === null || value === "") return null;
        const numericValue = typeof value === "string" ? value.replace(",", ".") : value;
        const parsed = parseFloat(numericValue);
        if (Number.isNaN(parsed)) return null;
        return Math.min(100, Math.max(0, parseFloat(parsed.toFixed(1))));
    };

    const hasInvalidLines = (serverName) => {
        return defaultServices.some(service => getTotal(serverName, service) !== 100);
    };

    // Fonction pour vérifier si un serveur a du WARN ou CRIT (pas OK à 100%)
    const hasWarningOrCritical = (serverName) => {
        const srvData = data?.[serverName];
        if (!srvData) return false;

        return defaultServices.some(service => {
            const serviceData = srvData[service] || {};
            const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
            const warn = serviceData.warn !== undefined ? parse(serviceData.warn, 0) : 0;
            const crit = serviceData.crit !== undefined ? parse(serviceData.crit, 0) : 0;
            return warn > 0 || crit > 0;
        });
    };

    // Fonction pour calculer le score global du serveur (0-100)
    // Fonction pour calculer la couleur progressive basée sur une valeur (0-100)
    const getProgressiveColor = (value) => {
        if (value < 50) {
            // Rouge pour les valeurs 0-50
            return '#ef4444';
        } else if (value < 85) {
            // Orange pour les valeurs 50-85
            return '#f59e0b';
        } else {
            // Vert pour les valeurs 85-100
            return '#10b981';
        }
    };

    // Prend en compte : disponibilité (40%), SLA (40%), événements (20%)
    const getGlobalScore = (serverName) => {
        // Utiliser dataRef pour avoir les données à jour pendant la synchronisation
        const sourceData = dataRef.current || data || {};
        const rawSrvData = sourceData?.[serverName];
        // Trouver le serveur correspondant pour obtenir son id
        const server = serveurs.find(srv => srv.nom === serverName);
        const isMapped = Boolean(server?.id && checkmkMappings[server.id]);
        const hasSyncData = Boolean(rawSrvData?.lastSyncDate);

        // Si mappé mais pas encore synchronisé, retourner null
        if (isMapped && !hasSyncData) {
            return null;
        }

        const srvData = rawSrvData || {};
        let hasSlaData = false; // Indique si on a des données SLA (toujours disponible via le tableau)

        // Score SLA basé sur le tableau (toujours calculable car elle vient du tableau)
        let slaScore = 0;
        let totalCritRatio = 0; // Pour calculer le ratio global de crit
        let serviceCount = 0; // Nombre de services pour le calcul du plafond
        if (srvData) {
            let totalCrit = 0;
            let totalWarn = 0;
            let totalOk = 0;

            defaultServices.forEach(service => {
                const serviceData = srvData[service] || {};
                const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
                
                const ok = parse(serviceData.ok, 100);
                const warn = parse(serviceData.warn, 0);
                const crit = parse(serviceData.crit, 0);
                
                const serviceTotal = ok + warn + crit;
                if (serviceTotal > 0) {
                    const critRatio = crit / serviceTotal;
                    totalCritRatio += critRatio;
                }
                
                totalCrit += crit;
                totalWarn += warn;
                totalOk += ok;
                serviceCount++;
            });

            if (serviceCount > 0) {
                // Calcul avec impact progressif du crit
                const avgOk = totalOk / serviceCount;
                const avgWarn = totalWarn / serviceCount;
                const avgCrit = totalCrit / serviceCount;
                totalCritRatio = totalCritRatio / serviceCount; // Ratio moyen de crit
                
                // Impact progressif du crit : pénalité proportionnelle mais moins sévère pour les faibles ratios
                let critScore = 0;
                if (avgCrit > 0.1) { // > 10% de crit
                    critScore = 0;
                } else if (avgCrit > 0.05) { // 5-10% de crit
                    critScore = avgCrit * 15; // Pénalité modérée
                } else { // < 5% de crit
                    critScore = avgCrit * 30; // Pénalité légère (5% crit = 1.5 point de pénalité)
                }
                
                slaScore = (avgOk * 1.0) + (avgWarn * 0.5) + critScore;
                hasSlaData = true; // On a toujours des données SLA si on a des services
            } else {
                slaScore = 100; // Pas de services = pas de pénalité
            }
        } else {
            slaScore = 100; // Pas de données = pas de pénalité
        }

        // Pour les périphériques non mappés, retourner uniquement le score de la table service
        if (!isMapped) {
            if (!hasSlaData) {
                return null; // Pas de données du tout
            }
            return Math.round(slaScore);
        }

        // Pour les périphériques mappés, calculer le score complet avec toutes les composantes
        let score = 0;
        let weightSum = 0;

        // Détection des problèmes critiques en premier
        let hasCriticalServices = false;
        let hasEvents = false;
        let hasLowAvailability = false;

        // 1. Vérification des services critiques
        if (srvData) {
            defaultServices.forEach(service => {
                const serviceData = srvData[service] || {};
                const critCount = parseInt(serviceData.crit, 10) || 0;
                if (critCount > 0) {
                    hasCriticalServices = true;
                }
            });
        }

        // 2. Vérification des événements
        const periodEventsCount = eventsCount[serverName];
        if (periodEventsCount !== undefined && periodEventsCount > 0) {
            hasEvents = true;
        }

        // 3. Vérification de la disponibilité
        let availabilityValue = 100;
        if (availabilityData[serverName] && availabilityData[serverName].up !== undefined) {
            availabilityValue = parseFloat(availabilityData[serverName].up || 0);
            if (availabilityValue < 95) {
                hasLowAvailability = true;
            }
        }

        const eventsWeight = isMapped ? 0.3 : 0;
        const availabilityWeight = isMapped ? 0.3 : 0;
        const serviceTableWeight = isMapped ? 0.4 : 1;

        // 1. Score événements
        let eventsScore = 100;
        if (eventsWeight > 0 && periodEventsCount !== undefined) {
            if (periodEventsCount === 0) {
                eventsScore = 100;
            } else if (periodEventsCount === 1) {
                eventsScore = 70;
            } else if (periodEventsCount <= 3) {
                eventsScore = 50;
            } else if (periodEventsCount <= 6) {
                eventsScore = 30;
            } else {
                eventsScore = 15;
            }
        }
        score += eventsScore * eventsWeight;
        weightSum += eventsWeight;

        // 2. Score de disponibilité
        let availabilityScore = availabilityValue;
        if (availabilityValue < 80) {
            availabilityScore = Math.min(availabilityValue, 50);
        } else if (availabilityValue < 95) {
            availabilityScore = Math.min(availabilityValue, 70);
        }
        score += availabilityScore * availabilityWeight;
        weightSum += availabilityWeight;

        // 3. Score table de disponibilité des services
        score += slaScore * serviceTableWeight;
        weightSum += serviceTableWeight;

        // Normalisation du score
        let finalScore = weightSum > 0 ? score / weightSum : 0;

        // APPLICATION DE PLAFONDS CRITIQUES
        // Si disponibilité < 80% : score maximum = 50 (rouge)
        if (availabilityValue < 80) {
            finalScore = Math.min(finalScore, 50);
        }
        // Si disponibilité < 95% : score maximum = 70 (orange)
        else if (availabilityValue < 95) {
            finalScore = Math.min(finalScore, 70);
        }
        
        // Si événements > 0 : score maximum = 70 (orange)
        if (hasEvents && finalScore > 70) {
            finalScore = Math.min(finalScore, 70);
        }
        // Si événements >= 4 : score maximum = 50 (rouge)
        if (periodEventsCount !== undefined && periodEventsCount >= 4 && finalScore > 50) {
            finalScore = Math.min(finalScore, 50);
        }

        // APPLICATION DE PLAFONDS CRITIQUES - Progressif selon le ratio de crit
        if (hasCriticalServices && serviceCount > 0) {
            // Plafond progressif selon le ratio de crit
            let critCeiling = 100;
            if (totalCritRatio >= 0.2) { // >= 20% de crit
                critCeiling = 30;
            } else if (totalCritRatio >= 0.1) { // >= 10% de crit
                critCeiling = 50;
            } else if (totalCritRatio >= 0.05) { // >= 5% de crit
                critCeiling = 70;
            } else if (totalCritRatio >= 0.02) { // >= 2% de crit
                critCeiling = 85;
            } else { // < 2% de crit
                critCeiling = 95;
            }
            if (finalScore > critCeiling) {
                finalScore = Math.min(finalScore, critCeiling);
            }
        }

        // Toujours retourner un score si on a des données SLA (toujours disponible)
        // Le score peut être calculé même sans synchronisation CheckMK
        if (!hasSlaData) {
            return null; // Pas de données du tout
        }

        // Arrondir à l'entier le plus proche
        return Math.round(finalScore);
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
        const line1Info = []; // OS - IP - VLAN
        const line2Info = []; // MARQUE MODELE SN - CPU RAM STOCKAGE
        let warrantyInfo = null;
        
        // Ligne 1 : OS - IP - VLAN
        if (srv.systeme) {
            // Ne plus inclure l'icône ici, juste le texte
            line1Info.push(srv.systeme);
        }
        if (srv.ip) line1Info.push(srv.ip);
        if (srv.vlan) line1Info.push(`VLAN ${srv.vlan}`);
        
        // Ligne 2 : MARQUE MODELE SN - CPU RAM STOCKAGE
        // Partie gauche : MARQUE MODELE SN (uniquement pour serveurs physiques)
        if (srv.type === "physique") {
            if (srv.marque && srv.modele) {
                line2Info.push({ type: 'left', content: `${srv.marque} ${srv.modele}` });
            } else if (srv.marque) {
                line2Info.push({ type: 'left', content: `${srv.marque} N/A` });
            } else if (srv.modele) {
                line2Info.push({ type: 'left', content: `N/A ${srv.modele}` });
            } else {
                line2Info.push({ type: 'left', content: "N/A N/A" });
            }
            if (srv.numeroSerie) {
                line2Info.push({ type: 'left', content: `S/N: ${srv.numeroSerie}` });
            } else {
                line2Info.push({ type: 'left', content: "S/N: N/A" });
            }
        }
        
        // Partie droite : CPU RAM STOCKAGE
        if (srv.type === "physique") {
            // Pour les serveurs physiques : CPU et RAM
            if (srv.processeur) {
                line2Info.push({ type: 'right', content: srv.processeur });
            } else {
                line2Info.push({ type: 'right', content: "N/A" });
            }
            // Afficher la RAM seulement si elle est renseignée et non vide
            if (srv.memoire && srv.memoire !== "" && srv.memoire !== null && srv.memoire !== undefined) {
                const memoireStr = String(srv.memoire).trim();
                const memoireValue = memoireStr.replace(/[^\d.,]/gi, '').replace(',', '.').trim();
                const memoireNum = parseFloat(memoireValue);
                if (!isNaN(memoireNum) && memoireNum > 0) {
                    line2Info.push({ type: 'right', content: `${Math.round(memoireNum)} Go RAM` });
                } else {
                    line2Info.push({ type: 'right', content: "N/A Go RAM" });
                }
            } else {
                line2Info.push({ type: 'right', content: "N/A Go RAM" });
            }
        } else {
            // Pour les serveurs virtuels : vCPU et vRAM
            if (srv.processeur) {
                line2Info.push({ type: 'right', content: `${srv.processeur} vCPU` });
            } else {
                line2Info.push({ type: 'right', content: "N/A vCPU" });
            }
            // Afficher la RAM seulement si elle est renseignée et non vide
            if (srv.memoire && srv.memoire !== "" && srv.memoire !== null && srv.memoire !== undefined) {
                const memoireStr = String(srv.memoire).trim();
                const memoireValue = memoireStr.replace(/[^\d.,]/gi, '').replace(',', '.').trim();
                const memoireNum = parseFloat(memoireValue);
                if (!isNaN(memoireNum) && memoireNum > 0) {
                    line2Info.push({ type: 'right', content: `${Math.round(memoireNum)} vRAM` });
                } else {
                    line2Info.push({ type: 'right', content: "N/A vRAM" });
                }
            } else {
                line2Info.push({ type: 'right', content: "N/A vRAM" });
            }
        }
        // Stockage pour tous les types de serveurs
        if (srv.stockage && srv.stockage !== "" && srv.stockage !== null && srv.stockage !== undefined) {
            const stockageStr = String(srv.stockage).trim();
            const stockageValue = stockageStr.replace(/[^\d.,]/gi, '').replace(',', '.').trim();
            const stockageNum = parseFloat(stockageValue);
            if (!isNaN(stockageNum) && stockageNum > 0) {
                line2Info.push({ type: 'right', content: `${Math.round(stockageNum)} Go` });
            } else {
                line2Info.push({ type: 'right', content: "N/A Go" });
            }
        } else {
            line2Info.push({ type: 'right', content: "N/A Go" });
        }
        
        // Informations de garantie (uniquement pour serveurs physiques)
        if (srv.type === "physique" && srv.expirationGarantie) {
            const expirationDate = new Date(srv.expirationGarantie);
            const today = new Date();
            const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

            warrantyInfo = {
                date: expirationDate.toLocaleDateString('fr-FR'),
                expired: daysUntilExpiration < 0,
                daysLeft: daysUntilExpiration >= 0 ? daysUntilExpiration : null,
            };
        }
        
        return { line1Info, line2Info, warrantyInfo };
    };

    // Fonction pour sauvegarder un serveur
    const saveServer = async (serverId, serverData) => {
        const clientId = config?.client?.id;
        if (!clientId) {
            throw new Error("ID client manquant");
        }

        // Préparer les données pour la base (sans les métadonnées internes)
        const { id, __fromDb, __index, ...dataForDb } = serverData;

        // PUT si on a un ID, POST sinon
        const method = serverId ? "PUT" : "POST";
        const url = serverId
            ? `${API_BASE_URL}/clients/modules/${clientId}/server/${serverId}`
            : `${API_BASE_URL}/clients/modules/${clientId}/server`;

        const body = {
            item_key: serverData.nom || `server-${serverId}`,
            name: serverData.nom || `Serveur`,
            famille: "Serveurs",
            data: dataForDb,
            is_active: true
        };

        const res = await fetch(url, {
            method,
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            throw new Error(`Erreur lors de la sauvegarde (${res.status})`);
        }

        const savedRow = await res.json();
        return savedRow;
    };

    // Fonction pour gérer la sauvegarde après édition
    const handleSaveServer = async () => {
        if (!editingServer || !editForm) return;

        setIsSaving(true);
        try {
            // Préparer les données du serveur mis à jour
            const updatedServer = {
                ...editingServer,
                nom: editForm.nom,
                ip: editForm.ip || '',
                systeme: editForm.systeme || '',
                type: editForm.type || 'physique',
                site: editForm.site || '',
                vlan: editForm.vlan || '',
                marque: editForm.marque || '',
                modele: editForm.modele || '',
                numeroSerie: editForm.numeroSerie || '',
                processeur: editForm.processeur || '',
                memoire: editForm.memoire || '',
                stockage: editForm.stockage || '',
                expirationGarantie: editForm.expirationGarantie || '',
                role: editForm.role || [],
                modeHA: editForm.modeHA || false,
                roleHA: editForm.roleHA || '',
                serverHA: editForm.serverHA || 0,
                serverHAName: editForm.serverHAName || '',
                checkmk_site: editForm.checkmk_site || null,
                checkmk_host_name: editForm.checkmk_host_name || ''
            };

            // Sauvegarder l'ancien nom pour mettre à jour le mapping si nécessaire
            const oldName = editingServer.nom;
            const newName = editForm.nom;

            // Sauvegarder dans v_b_clients_m_servers
            const savedRow = await saveServer(editingServer.id, updatedServer);

            // Mettre à jour la config locale avec la réponse de l'API
            setConfig((prev) => {
                if (!prev?.client?.equipements?.Serveurs) return prev;
                
                const updatedList = prev.client.equipements.Serveurs.map((srv) => {
                    // Utiliser l'ID pour trouver le bon serveur
                    if (srv.id === editingServer.id) {
                        // Reconstruire depuis la réponse de l'API
                        const { id: dataId, ...dataWithoutId } = savedRow.data || {};
                        return {
                            id: savedRow.id,
                            ...dataWithoutId,
                            nom: savedRow.data?.nom || savedRow.name || savedRow.item_key || "",
                            __fromDb: true
                        };
                    }
                    return srv;
                });

                return {
                    ...prev,
                    client: {
                        ...prev.client,
                        equipements: {
                            ...prev.client.equipements,
                            Serveurs: updatedList
                        }
                    }
                };
            });

            // Mettre à jour les mappings CheckMK si le nom a changé
            if (oldName !== newName && checkmkMappings[oldName]) {
                setCheckmkMappings((prev) => {
                    const newMappings = { ...prev };
                    newMappings[newName] = newMappings[oldName];
                    delete newMappings[oldName];
                    return newMappings;
                });
            }

            toast.success("Serveur mis à jour", toastOptions);
            setEditingServer(null);
            setEditForm(null);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde:", error);
            toast.error("Erreur lors de la sauvegarde", toastOptions);
        } finally {
            setIsSaving(false);
        }
    };

    // Mettre à jour la ref de data à chaque changement
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Mettre à jour la ref de onSyncAllCheckMKReady
    useEffect(() => {
        onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
    }, [onSyncAllCheckMKReady]);

    // Réinitialiser le ref de restauration au montage du composant
    useEffect(() => {
        hasRestoredDataRef.current = null;
    }, []); // S'exécute uniquement au montage

    // Restaurer les données CheckMK depuis data quand elles sont disponibles
    useEffect(() => {
        if (!data || Object.keys(data).length === 0 || serveurs.length === 0) return;

        // Vérifier si data contient des données CheckMK à restaurer
        let hasCheckMKData = false;
        const checkMKDataByServer = {};
        serveurs.forEach(srv => {
            const serverData = data[srv.nom];
            if (serverData) {
                const hasData = serverData.checkmkData || 
                               serverData.eventsCount !== undefined || 
                               serverData.availabilityData;
                if (hasData) {
                    hasCheckMKData = true;
                    checkMKDataByServer[srv.nom] = {
                        checkmkData: serverData.checkmkData,
                        eventsCount: serverData.eventsCount,
                        totalEventsCount: serverData.totalEventsCount,
                        lastEventDate: serverData.lastEventDate,
                        eventsData: serverData.eventsData,
                        availabilityData: serverData.availabilityData
                    };
                }
            }
        });

        // Si pas de données CheckMK dans data, ne rien faire
        if (!hasCheckMKData) return;

        // Vérifier si on a déjà restauré ces données (évite les restaurations multiples)
        const dataKey = JSON.stringify(Object.keys(checkMKDataByServer).sort());
        if (hasRestoredDataRef.current === dataKey) return;

        const restoredCheckmkData = {};
        const restoredEventsCount = {};
        const restoredTotalEventsCount = {};
        const restoredLastEventDate = {};
        const restoredEventsData = {};
        const restoredAvailabilityData = {};

        serveurs.forEach(srv => {
            const serverData = data[srv.nom];
            if (serverData) {
                // Restaurer les données CheckMK si elles existent dans data
                if (serverData.checkmkData) {
                    restoredCheckmkData[srv.nom] = serverData.checkmkData;
                }
                if (serverData.eventsCount !== undefined) {
                    restoredEventsCount[srv.nom] = serverData.eventsCount;
                }
                if (serverData.totalEventsCount !== undefined) {
                    restoredTotalEventsCount[srv.nom] = serverData.totalEventsCount;
                }
                if (serverData.lastEventDate) {
                    restoredLastEventDate[srv.nom] = new Date(serverData.lastEventDate);
                }
                if (serverData.eventsData) {
                    restoredEventsData[srv.nom] = serverData.eventsData;
                }
                if (serverData.availabilityData) {
                    restoredAvailabilityData[srv.nom] = serverData.availabilityData;
                }
            }
        });

        // Mettre à jour les états seulement si on a des données à restaurer
        if (Object.keys(restoredCheckmkData).length > 0) {
            setCheckmkData(restoredCheckmkData);
        }
        if (Object.keys(restoredEventsCount).length > 0) {
            setEventsCount(restoredEventsCount);
        }
        if (Object.keys(restoredTotalEventsCount).length > 0) {
            setTotalEventsCount(restoredTotalEventsCount);
        }
        if (Object.keys(restoredLastEventDate).length > 0) {
            setLastEventDate(restoredLastEventDate);
        }
        if (Object.keys(restoredEventsData).length > 0) {
            setEventsData(restoredEventsData);
        }
        if (Object.keys(restoredAvailabilityData).length > 0) {
            setAvailabilityData(restoredAvailabilityData);
        }

        hasRestoredDataRef.current = dataKey;
    }, [data, serveurs]);

    // Charger les mappings Check MK
    useEffect(() => {
        if (!config?.client?.id) return;

        const loadMappings = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${config.client.id}`, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const mappings = await response.json();
                    const mappingsMap = {};
                    mappings.forEach(m => {
                        const type = (m.equipment_type || "").toLowerCase();
                        const isServerType = ['serveurs', 'serveur', 'server', 'servers'].includes(type);
                        if (isServerType && m.is_active !== false && m.equipment_id) {
                            // Utiliser equipment_id comme clé principale
                            mappingsMap[m.equipment_id] = m;
                        }
                    });
                    setCheckmkMappings(mappingsMap);
                } else {
                    // Si la requête échoue, initialiser avec un objet vide pour éviter les erreurs
                    setCheckmkMappings({});
                }
            } catch (error) {
                console.error('Erreur chargement mappings Check MK:', error);
                // En cas d'erreur, initialiser avec un objet vide
                setCheckmkMappings({});
            }
        };

        loadMappings();
    }, [config?.client?.id]);

    // Récupérer la période du rapport depuis la config (si disponible)
    const getReportPeriod = () => {
        // Si la période Check MK est définie dans la config, l'utiliser
        if (config?.client?.checkmkPeriod) {
            return {
                start_time: config.client.checkmkPeriod.start_time,
                end_time: config.client.checkmkPeriod.end_time
            };
        }
        
        // Sinon, utiliser la période par défaut (dernier mois)
        const now = new Date();
        const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const startTime = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0);
        
        return {
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
        };
    };

    // Fonction pour mapper les services Check MK vers les services par défaut
    const mapCheckMKServicesToDefaults = (checkmkServices, serviceName) => {
        if (!checkmkServices || !Array.isArray(checkmkServices)) return null;
        
        // Patterns de recherche pour chaque service
        const patterns = {
            'CPU': ['cpu', 'utilization', 'processor', 'load'],
            'C:/': ['c:', 'c:/', 'filesystem c:', 'filesystem c:/', 'disk c:', 'disk c:/'],
            'RAM': ['memory', 'ram', 'mem', 'swap'],
            'UPTIME': ['uptime', 'up time', 'system uptime']
        };

        const patternsForService = patterns[serviceName] || [];
        
        // Chercher un service qui correspond
        for (const service of checkmkServices) {
            const serviceTitle = (service.title || service.id || '').toLowerCase();
            const serviceId = (service.id || '').toLowerCase();
            
            // Vérifier si le service correspond à un pattern
            for (const pattern of patternsForService) {
                if (serviceTitle.includes(pattern) || serviceId.includes(pattern)) {
                    // Calculer les pourcentages basés sur l'état du service
                    // Si le service est OK, on met 100% OK, sinon on distribue selon l'état
                    const state = service.state;
                    let ok = 100, warn = 0, crit = 0;
                    
                    if (state === 0) {
                        ok = 100;
                        warn = 0;
                        crit = 0;
                    } else if (state === 1) {
                        ok = 0;
                        warn = 100;
                        crit = 0;
                    } else if (state === 2) {
                        ok = 0;
                        warn = 0;
                        crit = 100;
                    } else {
                        // Unknown - on garde les valeurs par défaut
                        ok = 50;
                        warn = 30;
                        crit = 20;
                    }
                    
                    return { ok, warn, crit };
                }
            }
        }
        
        return null;
    };

    // Récupérer le nombre d'événements pour un serveur sur la période du rapport
    const loadEventsCount = async (serverName, checkmkHostName) => {
        if (!checkmkHostName) {
            return;
        }

        // Récupérer la période du rapport
        const period = getReportPeriod();
        if (!period.start_time || !period.end_time) {
            console.warn(`⚠️ [Événements] ${serverName}: Période non définie, impossible de récupérer les événements`);
            setEventsCount(prev => ({ ...prev, [serverName]: 0 }));
            setTotalEventsCount(prev => ({ ...prev, [serverName]: 0 }));
            setLastEventDate(prev => ({ ...prev, [serverName]: null }));
            return;
        }

        try {
            // Utiliser le nouvel endpoint avec la période
            const url = new URL(`${API_BASE_URL}/checkmk/events-period/${encodeURIComponent(checkmkHostName)}`);
            url.searchParams.append('start_time', period.start_time);
            url.searchParams.append('end_time', period.end_time);
            
            // Ajouter le site si disponible dans le mapping
            const mapping = getCheckMKMapping(serverName);
            if (mapping?.checkmk_site) {
                url.searchParams.append('site', mapping.checkmk_site);
            }
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();

                const eventsCountValue = result.events_count || 0;
                const totalEventsCountValue = result.total_events_count || 0;
                const eventsDataValue = result.events || [];

                setEventsCount(prev => ({
                    ...prev,
                    [serverName]: eventsCountValue
                }));
                
                // Stocker également le nombre total d'événements
                setTotalEventsCount(prev => ({
                    ...prev,
                    [serverName]: totalEventsCountValue
                }));
                
                // Stocker les données détaillées des événements pour le tooltip
                setEventsData(prev => ({
                    ...prev,
                    [serverName]: eventsDataValue
                }));

                // Sauvegarder dans data
                // Utiliser dataRef pour avoir la valeur à jour dans les fonctions async
                if (typeof setData === 'function') {
                    const currentData = dataRef.current || {};
                    const updatedServers = {
                        ...currentData,
                        [serverName]: {
                            ...(currentData[serverName] || {}),
                            eventsCount: eventsCountValue,
                            totalEventsCount: totalEventsCountValue,
                            eventsData: eventsDataValue
                        }
                    };
                    setData(updatedServers);
                    // Mettre à jour la ref immédiatement
                    dataRef.current = updatedServers;
                }

                // Extraire la date du dernier événement
                let lastDate = null;
                if (result.events && Array.isArray(result.events) && result.events.length > 0) {
                    // Trier les événements par date (plus récent en premier)
                    const sortedEvents = [...result.events].sort((a, b) => {
                        let dateA, dateB;
                        
                        // Format CheckMK : tableau [log_icon, log_time, ...]
                        if (Array.isArray(a)) {
                            dateA = a[1]; // log_time à l'index 1
                        } else {
                            dateA = a.time || a.first_occurrence || a.last_occurrence || a.date || a.timestamp || a.log_time || 0;
                        }
                        
                        if (Array.isArray(b)) {
                            dateB = b[1]; // log_time à l'index 1
                        } else {
                            dateB = b.time || b.first_occurrence || b.last_occurrence || b.date || b.timestamp || b.log_time || 0;
                        }
                        
                        let timeA, timeB;
                        if (typeof dateA === 'number') {
                            timeA = dateA < 10000000000 ? dateA * 1000 : dateA;
                        } else if (typeof dateA === 'string') {
                            timeA = new Date(dateA.replace(' ', 'T')).getTime();
                        } else {
                            timeA = 0;
                        }
                        
                        if (typeof dateB === 'number') {
                            timeB = dateB < 10000000000 ? dateB * 1000 : dateB;
                        } else if (typeof dateB === 'string') {
                            timeB = new Date(dateB.replace(' ', 'T')).getTime();
                        } else {
                            timeB = 0;
                        }
                        
                        return timeB - timeA; // Ordre décroissant
                    });
                    
                    const lastEvent = sortedEvents[0];
                    let eventDate;
                    
                    // Format CheckMK : tableau [log_icon, log_time, ...]
                    if (Array.isArray(lastEvent)) {
                        eventDate = lastEvent[1]; // log_time à l'index 1
                    } else {
                        eventDate = lastEvent.time || lastEvent.first_occurrence || lastEvent.last_occurrence || lastEvent.date || lastEvent.timestamp || lastEvent.log_time;
                    }
                    
                    if (eventDate) {
                        // Convertir en Date
                        if (typeof eventDate === 'number') {
                            lastDate = new Date(eventDate < 10000000000 ? eventDate * 1000 : eventDate);
                        } else if (typeof eventDate === 'string') {
                            lastDate = new Date(eventDate.replace(' ', 'T'));
                        }
                    }
                }

                setLastEventDate(prev => ({
                    ...prev,
                    [serverName]: lastDate
                }));

                // Sauvegarder la date du dernier événement dans data
                if (lastDate) {
                    const currentData = dataRef.current || {};
                    const updatedServers = {
                        ...currentData,
                        [serverName]: {
                            ...(currentData[serverName] || {}),
                            lastEventDate: lastDate.toISOString()
                        }
                    };
                    setData(updatedServers);
                    dataRef.current = updatedServers;
                }

            } else {
                const errorText = await response.text().catch(() => 'Erreur inconnue');
                console.error(`❌ [Événements] Synchronisation échouée pour ${serverName} (${response.status})`);
                
                // En cas d'erreur, mettre 0 événements et pas de date
                setEventsCount(prev => ({
                    ...prev,
                    [serverName]: 0
                }));
                setTotalEventsCount(prev => ({
                    ...prev,
                    [serverName]: 0
                }));
                setLastEventDate(prev => ({
                    ...prev,
                    [serverName]: null
                }));

                // Sauvegarder dans data
                const currentData = dataRef.current || {};
                const updatedServers = {
                    ...currentData,
                    [serverName]: {
                        ...(currentData[serverName] || {}),
                        eventsCount: 0,
                        totalEventsCount: 0,
                        lastEventDate: null,
                        eventsData: []
                    }
                };
                setData(updatedServers);
                dataRef.current = updatedServers;
            }
        } catch (error) {
            console.error(`❌ [Événements] Synchronisation échouée pour ${serverName}:`, error.message);
            
            // En cas d'erreur, mettre 0 événements et pas de date
            setEventsCount(prev => ({
                ...prev,
                [serverName]: 0
            }));
            setTotalEventsCount(prev => ({
                ...prev,
                [serverName]: 0
            }));
            setLastEventDate(prev => ({
                ...prev,
                [serverName]: null
            }));

            // Sauvegarder dans data
            const updatedServers = {
                ...data,
                [serverName]: {
                    ...(data[serverName] || {}),
                    eventsCount: 0,
                    totalEventsCount: 0,
                    lastEventDate: null,
                    eventsData: []
                }
            };
            setData(updatedServers);
        }
    };

    // Récupérer le tableau de disponibilité d'un serveur
    const loadAvailabilityData = async (serverName, checkmkHostName) => {
        if (!checkmkHostName) {
            return;
        }

        try {
            const url = new URL(`${API_BASE_URL}/checkmk/availability-table/${encodeURIComponent(checkmkHostName)}`);
            
            // Ajouter le site si disponible dans le mapping
            const mapping = getCheckMKMapping(serverName);
            if (mapping?.checkmk_site) {
                url.searchParams.append('site', mapping.checkmk_site);
            }
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                const availabilityValue = result.availability;
                setAvailabilityData(prev => ({
                    ...prev,
                    [serverName]: availabilityValue
                }));

                // Sauvegarder dans data
                const currentData = dataRef.current || {};
                const updatedServers = {
                    ...currentData,
                    [serverName]: {
                        ...(currentData[serverName] || {}),
                        availabilityData: availabilityValue
                    }
                };
                setData(updatedServers);
                dataRef.current = updatedServers;
            } else {
                console.warn(`⚠️ [Disponibilité] Erreur pour ${serverName}: ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ [Disponibilité] Erreur récupération disponibilité pour ${serverName}:`, error);
        }
    };

    // Récupérer les données Check MK pour un serveur (uniquement les services monitorés)
    const loadCheckMKData = async (serverName, checkmkHostName, showToasts = true) => {
        if (!checkmkHostName || loadingCheckMK[serverName]) return;

        // Réinitialiser le switch à 'manual' (Stats avancée) au début de la synchronisation
        setSyncMode(prev => ({ ...prev, [serverName]: 'manual' }));
        
        // Supprimer la note manuelle pour que la note calculée reprenne le dessus
        const currentDataBeforeSync = dataRef.current || {};
        const updatedBeforeSync = {
            ...currentDataBeforeSync,
            [serverName]: {
                ...(currentDataBeforeSync[serverName] || {}),
                manualHealthScore: undefined // Supprimer la note manuelle lors de la synchronisation
            }
        };
        setData(updatedBeforeSync);
        dataRef.current = updatedBeforeSync;
        
        // Initialiser l'animation à 0 immédiatement pour éviter l'affichage de la valeur par défaut
        setAnimatedScore(prev => ({ ...prev, [serverName]: 0 }));
        setScoreAnimationComplete(prev => ({ ...prev, [serverName]: false }));
        
        setLoadingCheckMK(prev => ({ ...prev, [serverName]: true }));

        try {
            // Récupérer la période de monitoring
            const period = getReportPeriod();
            
            // Récupérer uniquement les services monitorés avec la période pour l'historique des états
            const url = new URL(`${API_BASE_URL}/checkmk/services/${encodeURIComponent(checkmkHostName)}`);
            if (period.start_time && period.end_time) {
                url.searchParams.append('start_time', period.start_time);
                url.searchParams.append('end_time', period.end_time);
            }
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                const services = result.services || [];
                
                // Stocker les données Check MK pour affichage (format simplifié)
                const checkmkDataValue = {
                    services: services,
                    serviceInfo: {
                        total: services.length
                    }
                };
                
                setCheckmkData(prev => ({
                    ...prev,
                    [serverName]: checkmkDataValue
                }));

                // Sauvegarder dans data
                const currentData = dataRef.current || {};
                const updatedServers = {
                    ...currentData,
                    [serverName]: {
                        ...(currentData[serverName] || {}),
                        checkmkData: checkmkDataValue
                    }
                };
                setData(updatedServers);
                dataRef.current = updatedServers;

                // Sauvegarder la date de dernière synchronisation
                const syncDate = new Date().toISOString();
                const updatedServersWithSyncDate = {
                    ...updatedServers,
                    [serverName]: {
                        ...updatedServers[serverName],
                        lastSyncDate: syncDate
                    }
                };
                setData(updatedServersWithSyncDate);
                dataRef.current = updatedServersWithSyncDate;

                // Événements et disponibilité : période du rapport si disponible
                const period = getReportPeriod();
                const mapping = getCheckMKMapping(serverName);
                if (period?.start_time && period?.end_time) {
                    try {
                        const reportData = await getCheckMKReportPeriodData(
                            checkmkHostName,
                            period.start_time,
                            period.end_time,
                            mapping?.checkmk_site || null
                        );
                        const ev = reportData?.events || {};
                        const av = reportData?.availability || {};
                        setEventsCount(prev => ({ ...prev, [serverName]: ev.events_count || 0 }));
                        setEventsData(prev => ({ ...prev, [serverName]: ev.events || [] }));
                        if (av.availability) {
                            setAvailabilityData(prev => ({ ...prev, [serverName]: av.availability }));
                        } else {
                            await loadAvailabilityData(serverName, checkmkHostName);
                        }
                    } catch (e) {
                        await Promise.all([
                            loadEventsCount(serverName, checkmkHostName),
                            loadAvailabilityData(serverName, checkmkHostName)
                        ]);
                    }
                } else {
                    await Promise.all([
                        loadEventsCount(serverName, checkmkHostName),
                        loadAvailabilityData(serverName, checkmkHostName)
                    ]);
                }
            } else {
                const errorText = await response.text().catch(() => 'Erreur inconnue');
                console.error('Erreur récupération services Check MK:', response.status, errorText);
                // Ne pas afficher de notification individuelle
            }
        } catch (error) {
            console.error('Erreur récupération services Check MK:', error);
            // Ne pas afficher de notification individuelle
        } finally {
            setLoadingCheckMK(prev => ({ ...prev, [serverName]: false }));
            
            // Démarrer toutes les animations après la synchronisation
            setTimeout(() => {
                // Animation de la note globale (plus lente, avec changement de couleur)
                const finalScore = getGlobalScore(serverName);
                if (finalScore !== null) {
                    // Initialiser immédiatement à 0 pour éviter l'affichage de la valeur par défaut
                    setAnimatedScore(prev => ({ ...prev, [serverName]: 0 }));
                    setScoreAnimationComplete(prev => ({ ...prev, [serverName]: false }));
                    const duration = 3000; // 3 secondes (plus lent)
                    const steps = 120;
                    const increment = finalScore / steps;
                    let currentStep = 0;
                    
                    const scoreTimer = setInterval(() => {
                        currentStep++;
                        const newValue = Math.min(increment * currentStep, finalScore);
                        setAnimatedScore(prev => ({ ...prev, [serverName]: Math.round(newValue) }));
                        
                        if (currentStep >= steps) {
                            clearInterval(scoreTimer);
                            setAnimatedScore(prev => ({ ...prev, [serverName]: finalScore }));
                            // Faire apparaître l'étiquette en fade in après la fin de l'animation
                            setTimeout(() => {
                                setScoreAnimationComplete(prev => ({ ...prev, [serverName]: true }));
                            }, 100);
                        }
                    }, duration / steps);
                }

                // Animation de la disponibilité (avec changement de couleur, similaire à la note globale mais plus courte)
                const availability = availabilityData[serverName];
                if (availability && availability.up !== undefined) {
                    const finalAvailability = parseFloat(availability.up || 0);
                    setAnimatedAvailability(prev => ({ ...prev, [serverName]: 0 }));
                    const duration = 2000; // 2 secondes (plus court que la note globale qui est à 3 secondes)
                    const steps = 100;
                    const increment = finalAvailability / steps;
                    let currentStep = 0;
                    
                    const availabilityTimer = setInterval(() => {
                        currentStep++;
                        const newValue = Math.min(increment * currentStep, finalAvailability);
                        setAnimatedAvailability(prev => ({ ...prev, [serverName]: Math.round(newValue) }));
                        
                        if (currentStep >= steps) {
                            clearInterval(availabilityTimer);
                            setAnimatedAvailability(prev => ({ ...prev, [serverName]: finalAvailability }));
                        }
                    }, duration / steps);
                }

                // Animation des services monitorés (sans changement de couleur)
                const servicesData = checkmkData[serverName];
                if (servicesData) {
                    const finalServices = servicesData.statistics?.totalServices || 
                                         servicesData.serviceInfo?.total || 
                                         (servicesData.services?.length || 0);
                    setAnimatedServices(prev => ({ ...prev, [serverName]: 0 }));
                    const duration = 2000; // 2 secondes
                    const steps = 100;
                    const increment = finalServices / steps;
                    let currentStep = 0;
                    
                    const servicesTimer = setInterval(() => {
                        currentStep++;
                        const newValue = Math.min(increment * currentStep, finalServices);
                        setAnimatedServices(prev => ({ ...prev, [serverName]: Math.round(newValue) }));
                        
                        if (currentStep >= steps) {
                            clearInterval(servicesTimer);
                            setAnimatedServices(prev => ({ ...prev, [serverName]: finalServices }));
                        }
                    }, duration / steps);
                }

                // Animation des événements (sans changement de couleur)
                const finalEvents = eventsCount[serverName];
                if (finalEvents !== undefined) {
                    setAnimatedEvents(prev => ({ ...prev, [serverName]: 0 }));
                    const duration = 2000; // 2 secondes
                    const steps = 100;
                    const increment = finalEvents / steps;
                    let currentStep = 0;
                    
                    const eventsTimer = setInterval(() => {
                        currentStep++;
                        const newValue = Math.min(increment * currentStep, finalEvents);
                        setAnimatedEvents(prev => ({ ...prev, [serverName]: Math.round(newValue) }));
                        
                        if (currentStep >= steps) {
                            clearInterval(eventsTimer);
                            setAnimatedEvents(prev => ({ ...prev, [serverName]: finalEvents }));
                        }
                    }, duration / steps);
                }
            }, 100); // Petit délai pour s'assurer que les données sont bien mises à jour
        }
    };

    // Synchroniser tous les serveurs mappés avec Check MK (en parallèle pour plus de rapidité)
    const syncAllCheckMK = useCallback(async () => {
        const mappedServers = serveurs.filter(srv => srv.id && checkmkMappings[srv.id]);
        
        if (mappedServers.length === 0) {
            toast.warning('Aucun serveur mappé avec Check MK', toastOptions);
            return;
        }
        
        // Lancer toutes les synchronisations en parallèle pour réduire le temps total
        // Passer showToasts=false pour ne pas afficher les notifications individuelles
        const syncPromises = mappedServers.map(srv => 
            loadCheckMKData(srv.nom, checkmkMappings[srv.id].checkmk_host_name, false)
        );
        
        try {
            await Promise.all(syncPromises);
            toast.success(`Synchronisation terminée`, toastOptions);
        } catch (error) {
            toast.error(`Erreur lors de la synchronisation`, toastOptions);
        }
    }, [serveurs, checkmkMappings]);

    // Mettre à jour la ref de syncAllCheckMK
    useEffect(() => {
        syncAllCheckMKRef.current = syncAllCheckMK;
    }, [syncAllCheckMK]);

    // Exposer la fonction syncAllCheckMK et les états nécessaires au parent
    useEffect(() => {
        if (onSyncAllCheckMKReadyRef.current && syncAllCheckMKRef.current) {
            const hasMappings = serveurs.some(srv => srv.id && checkmkMappings[srv.id]);
            const isLoading = Object.values(loadingCheckMK).some(loading => loading);

            // Stabiliser le bouton de synchro global : ne notifier que si quelque chose change réellement
            if (
                lastNotifiedSyncInfoRef.current.hasMappings === hasMappings &&
                lastNotifiedSyncInfoRef.current.isLoading === isLoading
            ) {
                return;
            }

            onSyncAllCheckMKReadyRef.current({
                syncAllCheckMK: syncAllCheckMKRef.current,
                hasCheckMKMappings: hasMappings,
                isLoading
            });

            lastNotifiedSyncInfoRef.current = { hasMappings, isLoading };
        }
    }, [checkmkMappings, loadingCheckMK, serveurs, syncAllCheckMK]);

    useEffect(() => {
        if (!serveurs.length) return;
        
        // Ne s'exécuter que si data est complètement vide (première initialisation)
        // Vérifier si data contient déjà des données pour au moins un serveur
        // Si oui, ne pas initialiser pour éviter d'écraser les données existantes
        if (data && Object.keys(data).length > 0) {
            // Vérifier si data contient des données réelles (pas juste des objets vides)
            let hasRealData = false;
            serveurs.forEach(srv => {
                const serverData = data[srv.nom];
                if (serverData && Object.keys(serverData).length > 0) {
                    hasRealData = true;
                }
            });
            if (hasRealData) return;
        }

        const initializedData = {};
        serveurs.forEach(srv => {
            const existingData = data[srv.nom] || {};
            const services = {};
            defaultServices.forEach(service => {
                // Préserver les valeurs existantes si elles existent, sinon utiliser les valeurs par défaut
                const existingService = existingData[service];
                services[service] = existingService || {
                    ok: 100,
                    warn: 0,
                    crit: 0
                };
            });
            initializedData[srv.nom] = {
                ...services,
                comment: existingData.comment || "",
                // Préserver toutes les autres données (CheckMK, etc.)
                ...Object.keys(existingData).reduce((acc, key) => {
                    if (!defaultServices.includes(key) && key !== 'comment') {
                        acc[key] = existingData[key];
                    }
                    return acc;
                }, {})
            };
        });

        setData(initializedData);
    }, [serveurs, data, setData]);

    // Pas de chargement automatique - uniquement manuel via le bouton

    // Grouper les serveurs par site (toujours calculé avant tout return)
    const groupedBySite = serveurs.reduce((acc, srv) => {
        const siteName = srv.site || "Sans site";
        if (!acc[siteName]) {
            acc[siteName] = [];
        }
        acc[siteName].push(srv);
        return acc;
    }, {});

    // Trier les sites (Sans site en dernier)
    const sortedSites = Object.keys(groupedBySite).sort((a, b) => {
        if (a === "Sans site") return 1;
        if (b === "Sans site") return -1;
        return a.localeCompare(b);
    });

    // Charger les serveurs depuis la base (v_b_clients_m_servers) au montage
    useEffect(() => {
        if (!config?.client?.id || !setConfig) return;
        const controller = new AbortController();

        const loadServeursFromDb = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/servers`, {
                    credentials: "include",
                    signal: controller.signal
                });
                if (!res.ok) return;
                const rows = await res.json();
                const serveursList = (rows || []).map((row) => {
                    const { id: dataId, ...dataWithoutId } = row.data || {};
                    return {
                        id: row.id, // ID de la table pour PUT
                        ...dataWithoutId,
                        nom: row.data?.nom || row.name || row.item_key || "",
                        __fromDb: true
                    };
                });

                setConfig((prev) => {
                    if (!prev?.client) return prev;
                    return {
                        ...prev,
                        client: {
                            ...prev.client,
                            equipements: {
                                ...(prev.client.equipements || {}),
                                Serveurs: serveursList
                            }
                        }
                    };
                });
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error("Erreur chargement serveurs:", err);
            }
        };

        loadServeursFromDb();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config?.client?.id]);

    // Initialiser le mode à 'manual' par défaut pour tous les serveurs
    // IMPORTANT: Ce hook doit être appelé avant tout return conditionnel
    useEffect(() => {
        if (serveurs.length > 0) {
            setSyncMode(prev => {
                const updated = { ...prev };
                let hasChanges = false;
                serveurs.forEach(srv => {
                    if (updated[srv.nom] === undefined) {
                        updated[srv.nom] = 'manual';
                        hasChanges = true;
                    }
                });
                return hasChanges ? updated : prev;
            });
        }
    }, [serveurs]);

    if (serveurs.length === 0) {
        return (
            <div className={commonStyles.container}>
                <div className={commonStyles.emptyState}>
                    <p>Aucun serveur configuré pour ce client.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {sortedSites.map((siteName) => {
                const siteServers = groupedBySite[siteName];
                const physicalServers = siteServers.filter(s => s.type === "physique");
                const virtualServers = siteServers.filter(s => s.type !== "physique");
                const physicalCount = physicalServers.length;
                const virtualCount = virtualServers.length;

                let hasRenderedPhysical = false;
                let hasRenderedVirtual = false;

                return (
                <div
                  key={siteName}
                  className={styles.siteGroup}
                  id={`site-${siteName}`}
                  data-site-label={siteName}
                >
                    <div className={styles.siteSeparator}>
                        <h2 className={styles.siteTitle}>
                            <IconifyIcon
                                icon="mingcute:building-4-fill"
                                width={24}
                                height={24}
                                className={styles.siteIcon}
                            />
                            <span>{siteName}</span>
                            {siteServers.length > 0 && (
                                <span className={styles.siteCount}>
                                    {siteServers.length} serveur{siteServers.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className={styles.serverGrid}>
                        {groupedBySite[siteName]
                            .sort((a, b) => {
                                // Tri: physiques d'abord, puis virtuels
                                // Considérer comme physique par défaut si pas explicitement virtuel
                                const aIsPhysical = a.type !== "virtuel";
                                const bIsPhysical = b.type !== "virtuel";

                                if (aIsPhysical && !bIsPhysical) return -1;
                                if (!aIsPhysical && bIsPhysical) return 1;
                                // Si même type, tri par nom
                                return a.nom.localeCompare(b.nom);
                            })
                            .map((srv, i) => {
                                // Considérer comme physique par défaut si pas explicitement virtuel
                                const isPhysical = srv.type !== "virtuel";
                                const shouldShowCategoryTitle = (isPhysical && !hasRenderedPhysical) ||
                                    (!isPhysical && !hasRenderedVirtual);

                                if (isPhysical) {
                                    hasRenderedPhysical = true;
                                } else {
                                    hasRenderedVirtual = true;
                                }

                                const serverStatus = getServerStatus(srv.nom);
                                const { line1Info, line2Info, warrantyInfo } = getServerInfo(srv);
                                const roleColor = getRoleColor(srv.role);
                                const needsSyncAttention = Boolean(
                                    srv.id && checkmkMappings[srv.id] &&
                                    !data?.[srv.nom]?.lastSyncDate &&
                                    !loadingCheckMK[srv.nom]
                                );

                                return (
                                <React.Fragment key={`${srv.nom}-${i}`}>
                                    {shouldShowCategoryTitle && (
                                        <div className={styles.categorySeparator}>
                                            <h3 className={styles.categoryTitle}>{isPhysical ? "Physique" : "Virtuel"}</h3>
                                        </div>
                                    )}
                                    <div className={`${styles.serverCard} ${styles.withComment}`}>
                                {/* En-tête de la carte */}
                                <div className={styles.cardHeader}>
                                    <div className={styles.headerLeft}>
                                        <div className={styles.serverInfo}>
                                            <h3 className={styles.serverName}>
                                                <span className={styles.serverNameSection}>
                                                    <span className={styles.iconWrapper}>
                                                        {isPhysical ? (
                                                            <FaServer className={`${styles.osIcon} ${styles.serverIconPhysical}`} />
                                                        ) : (
                                                            <FaCube className={`${styles.osIcon} ${styles.serverIconVirtual}`} />
                                                        )}
                                                    </span>
                                                    {getOSIcon(srv.systeme) && (
                                                        <span className={styles.osIconWrapper}>
                                                            {getOSIcon(srv.systeme)}
                                                        </span>
                                                    )}
                                                    <span className={styles.serverNameText}>
                                                        {srv.nom}
                                                    </span>
                                                    {/* Rôles près du titre */}
                                                    {(() => {
                                                        const roles = Array.isArray(srv.role) ? srv.role : (srv.role ? [srv.role] : []);
                                                        return roles.map((role, roleIndex) => (
                                                            <span 
                                                                key={roleIndex}
                                                                className={`${styles.roleLabel} ${styles.roleLabelInline}`}
                                                            >
                                                                {role}
                                                            </span>
                                                        ));
                                                    })()}
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                    <div className={styles.serverType}>
                                        {/* Boutons SYNC et GLPI */}
                                        <div className={styles.buttonGroup}>
                                            {srv.id && checkmkMappings[srv.id] && (
                                                <button
                                                    type="button"
                                                    className={`${styles.syncButton} ${needsSyncAttention ? styles.syncButtonAttention : ''}`}
                                                    onClick={() => {
                                                        if (!loadingCheckMK[srv.nom]) {
                                                            loadCheckMKData(srv.nom, checkmkMappings[srv.id].checkmk_host_name);
                                                        }
                                                    }}
                                                    title={`Mappé vers Check MK: ${checkmkMappings[srv.id].checkmk_host_name}. Cliquer pour synchroniser.`}
                                                    disabled={loadingCheckMK[srv.nom]}
                                                >
                                                    <IconifyIcon
                                                        icon="material-symbols:sync"
                                                        width={14}
                                                        height={14}
                                                        className={loadingCheckMK[srv.nom] ? styles.loadingIcon : ''}
                                                    />
                                                </button>
                                            )}
                                            <div className={styles.flexAuto}>
                                            </div>
                                            <button
                                                type="button"
                                                className={commonStyles.editButton}
                                                onClick={() => {
                                                    console.log('[Serveurs] Server object when editing:', { nom: srv.nom, id: srv.id, allKeys: Object.keys(srv) });
                                                    setEditingServer(srv);
                                                    setEditForm({
                                                        nom: srv.nom || '',
                                                        ip: srv.ip || '',
                                                        systeme: srv.systeme || '',
                                                        type: srv.type || 'physique',
                                                        site: srv.site || '',
                                                        vlan: srv.vlan || '',
                                                        marque: srv.marque || '',
                                                        modele: srv.modele || '',
                                                        numeroSerie: srv.numeroSerie || '',
                                                        processeur: srv.processeur || '',
                                                        memoire: srv.memoire || '',
                                                        stockage: srv.stockage || '',
                                                        expirationGarantie: srv.expirationGarantie || '',
                                                        role: Array.isArray(srv.role) ? [...srv.role] : (srv.role ? [srv.role] : []),
                                                        modeHA: srv.modeHA || false,
                                                        roleHA: srv.roleHA || '',
                                                        serverHA: srv.serverHA || 0,
                                                        serverHAName: srv.serverHAName || '',
                                                        checkmk_site: srv.checkmk_site || null,
                                                        checkmk_host_name: srv.checkmk_host_name || ''
                                                    });
                                                }}
                                                title="Éditer le serveur"
                                            >
                                                <IconifyIcon
                                                    icon="material-symbols:edit"
                                                    width={14}
                                                    height={14}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {(line1Info.length > 0 || line2Info.length > 0 || warrantyInfo) && (
                                    <div className={`${commonStyles.moduleMeta} ${styles.serverMetaFlex}`}>
                                        {/* Gauche : Informations serveur */}
                                        <span className={styles.flexOne}>
                                            <div className={styles.serverMetaLines}>
                                                {/* Ligne 1 : OS - IP - VLAN */}
                                                {line1Info.length > 0 && (
                                                    <div className={styles.serverMetaLine}>
                                                        {line1Info.map((item, index) => (
                                                            <React.Fragment key={index}>
                                                                <span>{item}</span>
                                                                {index < line1Info.length - 1 && <span>•</span>}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                )}
                                                {/* Ligne 2 : MARQUE MODELE SN - CPU RAM STOCKAGE */}
                                                {line2Info.length > 0 && (
                                                    <div className={styles.serverMetaLine}>
                                                        {/* MARQUE MODELE SN */}
                                                        {line2Info
                                                            .filter(item => item.type === 'left')
                                                            .map((item, index, array) => (
                                                                <React.Fragment key={index}>
                                                                    <span>{item.content}</span>
                                                                    {index < array.length - 1 && <span>•</span>}
                                                                </React.Fragment>
                                                            ))}
                                                        {/* Séparateur entre gauche et droite */}
                                                        {line2Info.some(item => item.type === 'left') && line2Info.some(item => item.type === 'right') && <span>•</span>}
                                                        {/* CPU RAM STOCKAGE */}
                                                        {line2Info
                                                            .filter(item => item.type === 'right')
                                                            .map((item, index, array) => (
                                                                <React.Fragment key={index}>
                                                                    <span>{item.content}</span>
                                                                    {index < array.length - 1 && <span>•</span>}
                                                                </React.Fragment>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        </span>
                                        {/* Droite : Garantie */}
                                        {warrantyInfo && (
                                            <div className={styles.licenseInfoRow}>
                                                <span className={styles.iconTextRow}>
                                                    <IconifyIcon
                                                        icon="streamline-flex:warranty-badge-highlight-solid"
                                                        width={12}
                                                        height={12}
                                                        className={styles.iconGray}
                                                    />
                                                    {warrantyInfo.date}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={`${styles.serverScrollable} ${styles.serverScrollableDynamic} ${syncMode[srv.nom] === 'checkmk' ? styles.serverScrollableHidden : styles.serverScrollableAuto}`}>
                                <div className={styles.serverCardContent}>
                                    {/* Wrapper fixe pour les 2 vues (Dashboard / Stats avancées) */}
                                    <div className={styles.metricsWrapper}>
                                    {/* Cartes statistiques - Vue Stats (Dashboard) */}
                                    {(syncMode[srv.nom] === 'manual' || !syncMode[srv.nom]) && (
                                        <div className={styles.statsWrapper}>
                                        {loadingCheckMK[srv.nom] ? (
                                            <div className={styles.loadingWrapper}>
                                                <IconifyIcon
                                                    icon="material-symbols:sync"
                                                    width={32}
                                                    height={32}
                                                    className={styles.loadingIcon}
                                                />
                                                <span className={styles.loadingText}>
                                                    Synchronisation en cours
                                                </span>
                                            </div>
                                        ) : (
                                        <>
                                        {/* Carte: Santé du serveur */}
                                        {(() => {
                                            const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                            const isMapped = Boolean(mapping);
                                            const hasSyncData = Boolean(data?.[srv.nom]?.lastSyncDate);
                                            const shouldShowNA = isMapped && !hasSyncData;
                                            const calculatedScore = shouldShowNA ? null : getGlobalScore(srv.nom);
                                            const manualScore = data?.[srv.nom]?.manualHealthScore;
                                            const healthScore = shouldShowNA ? null : (manualScore !== undefined ? manualScore : calculatedScore);
                                            const isLoading = false;
                                            const isAnimating = animatedScore[srv.nom] !== undefined && !scoreAnimationComplete[srv.nom];
                                            const isEditing = editingScore[srv.nom];
                                            const serviceAvailabilityWeightPercent = isMapped ? 30 : 50;

                                            const scoreBreakdown = mapping
                                                ? [
                                                    {
                                                        label: "Événements",
                                                        description: "Alertes détectées sur la période",
                                                        weight: "30 pts"
                                                    },
                                                    {
                                                        label: "Disponibilité",
                                                        description: "Taux de disponibilité remonté par CheckMK",
                                                        weight: "30 pts"
                                                    },
                                                    {
                                                        label: "Disponibilité des services",
                                                        description: "OK / WARN / CRIT pour chaque service monitoré",
                                                        weight: "40 pts"
                                                    }
                                                ]
                                                : [
                                                    {
                                                        label: "Disponibilité des services",
                                                        description: "OK / WARN / CRIT sur la période monitorée",
                                                        weight: "100 pts"
                                                    }
                                                ];
                                            
                                            // Score affiché : si non synchronisé, on garde une carte affichée (lettre par défaut) mais tout en gris
                                            const placeholderScore = 95;
                                            let displayScore = null;
                                            if (!isLoading) {
                                                if (shouldShowNA) {
                                                    displayScore = placeholderScore;
                                                } else {
                                                    displayScore = isAnimating ? animatedScore[srv.nom] : healthScore;
                                                }
                                            }
                                            
                                            // Convertir le score en lettre (A, B, C, D, E, F)
                                            const displayLetter = displayScore !== null ? scoreToLetter(displayScore) : null;
                                            const scoreLetter = healthScore !== null ? scoreToLetter(healthScore) : null;
                                            
                                            // Déterminer la couleur selon la lettre
                                            const scoreColor = scoreLetter ? scoreToColor(healthScore) : '#9ca3af';
                                            const displayColor = shouldShowNA
                                                ? '#9ca3af'
                                                : (displayScore !== null ? scoreToColor(displayScore) : scoreColor);
                                            const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;
                                            
                                            return (
                                                <>
                                                <div
                                                    className={styles.scoreCardWrapper}
                                                    onMouseLeave={() => {
                                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.serverName === srv.nom) {
                                                            setHoveredTooltip(null);
                                                        }
                                                    }}
                                                >
                                                <div className={`${styles.scoreCardLeft} ${isLoading ? styles.statCardDisabled : ''}`}>
                                                    {isLoading && (
                                                        <div className={styles.loadingCenter}>
                                                            <FaSync className={styles.loadingSyncIcon} />
                                                            Synchronisation...
                                                        </div>
                                                    )}
                                                    {!isLoading && (
                                                        <div className={styles.scoreInfoIcon}>
                                                            <div className={commonStyles.scoreTooltipContainer}>
                                                                <IconifyIcon
                                                                    icon="material-symbols:info"
                                                                    width={16}
                                                                    height={16}
                                                                    className={commonStyles.scoreTooltipIcon}
                                                                    onMouseEnter={(e) => {
                                                                        setHoveredTooltip({
                                                                            type: 'score',
                                                                            serverName: srv.nom,
                                                                            mouseX: e.clientX,
                                                                            mouseY: e.clientY,
                                                                            scoreBreakdown
                                                                        });
                                                                    }}
                                                                    onMouseMove={(e) => {
                                                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.serverName === srv.nom) {
                                                                            setHoveredTooltip(prev => ({
                                                                                ...prev,
                                                                                mouseX: e.clientX,
                                                                                mouseY: e.clientY
                                                                            }));
                                                                        }
                                                                    }}
                                                                    onMouseLeave={() => {
                                                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.serverName === srv.nom) {
                                                                            setHoveredTooltip(null);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!isLoading && (
                                                        <div className={styles.scoreDisplayWrapper}>
                                                            <div className={styles.scoreInputWrapper}>
                                                                {isEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        value={editingScoreValue[srv.nom] !== undefined ? editingScoreValue[srv.nom] : displayScore}
                                                                        onChange={(e) => setEditingScoreValue(prev => ({ ...prev, [srv.nom]: e.target.value }))}
                                                                        onBlur={() => saveEditScore(srv.nom)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                saveEditScore(srv.nom);
                                                                            } else if (e.key === 'Escape') {
                                                                                cancelEditScore(srv.nom);
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                        className={styles.scoreInput}
                                                                        style={{
                                                                            color: displayColor,
                                                                            borderColor: displayColor
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        role="button"
                                                                        tabIndex={displayScore !== null ? 0 : -1}
                                                                        onKeyDown={(e) => {
                                                                            if (displayScore !== null && !isLoading && (e.key === 'Enter' || e.key === ' ')) {
                                                                                e.preventDefault();
                                                                                startEditScore(srv.nom, displayScore);
                                                                            }
                                                                        }}
                                                                        title={displayScore !== null ? "Cliquer pour sélectionner une note, double-cliquer pour éditer précisément" : ""}
                                                                        className={`${displayScore !== null ? styles.scoreLetterWrapper : styles.scoreLetterWrapperDisabled} ${shouldShowNA ? styles.scoreLetterWrapperGrayscale : ''}`}
                                                                    >
                                                                        <LetterScale 
                                                                            activeLetter={displayLetter} 
                                                                            letters={["F", "E", "D", "C", "B", "A"]}
                                                                            size="normal"
                                                                            onSelect={!isLoading ? (letter) => handleManualLetterSelect(srv.nom, letter) : undefined}
                                                                            highlightLetter={!shouldShowNA && manualScoreChanged && calculatedScore !== null && !isEditing ? scoreToLetter(calculatedScore) : null}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {calculatedScore !== null && manualScore !== undefined && isEditing && (
                                                                <div className={styles.scoreNoteHint}>
                                                                    Note calculée: {calculatedScore} ({scoreToLetter(calculatedScore)})
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Ligne : Services, Événements et Disponibilité (vue compacte, condensée) */}
                                                <div className={styles.statsGrid}>
                                            {/* Carte: Nombre de services monitorés */}
                                            <div 
                                                className={`${styles.statCard} ${loadingCheckMK[srv.nom] ? styles.statCardDisabled : (checkmkData[srv.nom] ? styles.statCardEnabled : styles.statCardDefault)}`}
                                                onMouseEnter={(e) => {
                                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                                    if (mapping && checkmkData[srv.nom]) {
                                                        setHoveredTooltip({
                                                            type: 'services',
                                                            serverName: srv.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseMove={(e) => {
                                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                                    if (mapping && checkmkData[srv.nom] && hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.serverName === srv.nom) {
                                                        setHoveredTooltip({
                                                            type: 'services',
                                                            serverName: srv.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    if (hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.serverName === srv.nom) {
                                                        setHoveredTooltip(null);
                                                    }
                                                }}
                                            >
                                                <IconifyIcon
                                                    icon="material-symbols-light:view-module"
                                                    width={22}
                                                    height={22}
                                                    className={styles.statIcon}
                                                />
                                                {!(srv.id && getCheckMKMapping(srv.id)) ? (
                                                    <div className={styles.statCardNotMapped}>
                                                        <div className={styles.statValueNotMapped}>
                                                            N/A
                                                        </div>
                                                        <div className={styles.statLabelNotMapped}>
                                                            Non mappé
                                                        </div>
                                                    </div>
                                                ) : loadingCheckMK[srv.nom] ? (
                                                    <div className={styles.loadingRow}>
                                                        <FaSync className={styles.loadingIconSmall} />
                                                        Chargement...
                                                    </div>
                                                ) : (
                                                    <div className={`${styles.statValue} ${checkmkData[srv.nom] ? styles.statValuePrimary : styles.statValueSecondary}`}>
                                                        {checkmkData[srv.nom] 
                                                            ? (animatedServices[srv.nom] !== undefined ? animatedServices[srv.nom] : (checkmkData[srv.nom]?.services?.length || 0))
                                                            : 'N/A'}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Carte: Nombre d'événements */}
                                            <div 
                                                className={`${styles.statCard} ${loadingCheckMK[srv.nom] ? styles.statCardDisabled : (eventsCount[srv.nom] !== undefined ? styles.statCardEnabled : styles.statCardDefault)}`}
                                                onMouseEnter={(e) => {
                                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                                    if (mapping && eventsData[srv.nom] && eventsData[srv.nom].length > 0) {
                                                        setHoveredTooltip({
                                                            type: 'events',
                                                            serverName: srv.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseMove={(e) => {
                                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                                    if (mapping && eventsData[srv.nom] && eventsData[srv.nom].length > 0 && hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.serverName === srv.nom) {
                                                        setHoveredTooltip({
                                                            type: 'events',
                                                            serverName: srv.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    if (hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.serverName === srv.nom) {
                                                        setHoveredTooltip(null);
                                                    }
                                                }}
                                            >
                                                <IconifyIcon
                                                    icon="mingcute:alert-fill"
                                                    width={22}
                                                    height={22}
                                                    className={styles.statIcon}
                                                />
                                                {!(srv.id && getCheckMKMapping(srv.id)) ? (
                                                    <div className={styles.statCardNotMapped}>
                                                        <div className={styles.statValueNotMapped}>
                                                            N/A
                                                        </div>
                                                        <div className={styles.statLabelNotMapped}>
                                                            Non mappé
                                                        </div>
                                                    </div>
                                                ) : loadingCheckMK[srv.nom] ? (
                                                    <div className={styles.loadingRow}>
                                                        <FaSync className={styles.loadingIconSmall} />
                                                        Chargement...
                                                    </div>
                                                ) : (
                                                    <div className={`${styles.statValue} ${eventsCount[srv.nom] !== undefined ? (eventsCount[srv.nom] > 0 ? styles.statValueEventsWarning : styles.statValueEventsNormal) : styles.statValueSecondary}`}>
                                                        {eventsCount[srv.nom] !== undefined 
                                                            ? (animatedEvents[srv.nom] !== undefined ? animatedEvents[srv.nom] : eventsCount[srv.nom])
                                                            : 'N/A'}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Carte: Disponibilité */}
                                            <div 
                                                className={`${styles.statCard} ${loadingCheckMK[srv.nom] ? styles.statCardDisabled : (availabilityData[srv.nom] ? styles.statCardEnabled : styles.statCardDefault)}`}
                                                onMouseEnter={(e) => {
                                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                                    if (mapping && availabilityData[srv.nom]) {
                                                        setHoveredTooltip({
                                                            type: 'availability',
                                                            serverName: srv.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseMove={(e) => {
                                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                                    if (mapping && availabilityData[srv.nom] && hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.serverName === srv.nom) {
                                                        setHoveredTooltip({
                                                            type: 'availability',
                                                            serverName: srv.nom,
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY
                                                        });
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    if (hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.serverName === srv.nom) {
                                                        setHoveredTooltip(null);
                                                    }
                                                }}
                                            >
                                            <IconifyIcon
                                                icon="tabler:gauge"
                                                width={22}
                                                height={22}
                                                className={styles.statIcon}
                                            />
                                            {!(srv.id && getCheckMKMapping(srv.id)) ? (
                                                <div className={styles.statCardNotMapped}>
                                                    <div className={styles.statValueNotMapped}>
                                                        N/A
                                                    </div>
                                                    <div className={styles.statLabelNotMapped}>
                                                        Non mappé
                                                    </div>
                                                </div>
                                            ) : loadingCheckMK[srv.nom] ? (
                                                <div className={styles.loadingRow}>
                                                    <FaSync className={styles.loadingIconSmall} />
                                                    Chargement...
                                                </div>
                                            ) : (
                                                <div 
                                                    className={styles.statValueAvailability}
                                                    style={{ 
                                                        color: availabilityData[srv.nom] && availabilityData[srv.nom].up !== undefined
                                                            ? (() => {
                                                                const displayValue = animatedAvailability[srv.nom] !== undefined 
                                                                    ? animatedAvailability[srv.nom] 
                                                                    : parseFloat(availabilityData[srv.nom].up || 0);
                                                                return getProgressiveColor(displayValue);
                                                            })()
                                                            : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    {availabilityData[srv.nom] && availabilityData[srv.nom].up !== undefined 
                                                        ? `${animatedAvailability[srv.nom] !== undefined 
                                                            ? animatedAvailability[srv.nom] 
                                                            : Math.round(parseFloat(availabilityData[srv.nom].up || 0))}%`
                                                        : 'N/A'
                                                    }
                                                </div>
                                            )}
                                            </div>
                                        </div>
                                                </div>
                                                </>
                                            );
                                        })()}
                                        </>
                                        )}
                                    </div>
                                    )}

                                    {/* Tableau des métriques - Uniquement en mode Stats avancée */}
                                    {syncMode[srv.nom] === 'checkmk' && (
                                    <div className={styles.metricsTable}>
                                        {hasInvalidLines(srv.nom) && (
                                            <div className={styles.metricsTableWarningIcon}>
                                                <IconifyIcon
                                                    icon="material-symbols:warning"
                                                    width={20}
                                                    height={20}
                                                />
                                            </div>
                                        )}
                                        <div className={styles.metricsGrid}>
                                            {defaultServices.map((service, index) => {
                                                    const srvData = data?.[srv.nom]?.[service] || {};
                                                    const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
                                                    const ok = srvData.ok !== undefined ? parse(srvData.ok, 100) : 100;
                                                    const warn = srvData.warn !== undefined ? parse(srvData.warn, 0) : 0;
                                                    const crit = srvData.crit !== undefined ? parse(srvData.crit, 0) : 0;
                                                    
                                                    // Obtenir l'icône correspondant au service
                                                    const getServiceIcon = (serviceName) => {
                                                        switch(serviceName) {
                                                            case 'CPU':
                                                                return 'lucide:cpu';
                                                            case 'RAM':
                                                                return 'fa-solid:memory';
                                                            case 'C:/':
                                                                return 'ph:hard-drive';
                                                            case 'UPTIME':
                                                                return 'mdi:tool-time';
                                                            default:
                                                                return null;
                                                        }
                                                    };
                                                    
                                                    const serviceIcon = getServiceIcon(service);
                                                    const isOkFocused = focusedInput?.service === service && focusedInput?.type === 'ok';
                                                    const isWarnFocused = focusedInput?.service === service && focusedInput?.type === 'warn';
                                                    const isCritFocused = focusedInput?.service === service && focusedInput?.type === 'crit';
                                                    
                                                    return (
                                                        <div 
                                                            key={service} 
                                                            className={styles.metricServiceCard}
                                                        >
                                                            <div className={styles.metricInputsRow}>
                                                                {serviceIcon && (
                                                                    <IconifyIcon
                                                                        icon={serviceIcon}
                                                                        width={26}
                                                                        height={26}
                                                                        className={styles.metricServiceIcon}
                                                                    />
                                                                )}
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={ok}
                                                                    onChange={(e) => updateValue(srv.nom, service, "ok", e.target.value)}
                                                                    className={`${commonStyles.metricInput} ${ok !== 0 ? commonStyles.okInput : ''} ${isOkFocused ? styles.metricInputFocusedOk : ''}`}
                                                                    aria-label={`OK pour ${service}`}
                                                                    onFocus={(e) => handleInputFocus(e, service, 'ok')}
                                                                    onBlur={handleInputBlur}
                                                                />
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={warn}
                                                                    onChange={(e) => updateValue(srv.nom, service, "warn", e.target.value)}
                                                                    className={`${commonStyles.metricInput} ${warn !== 0 ? commonStyles.warnInput : ''} ${isWarnFocused ? styles.metricInputFocusedWarn : ''}`}
                                                                    aria-label={`WARN pour ${service}`}
                                                                    onFocus={(e) => handleInputFocus(e, service, 'warn')}
                                                                    onBlur={handleInputBlur}
                                                                />
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={crit}
                                                                    onChange={(e) => updateValue(srv.nom, service, "crit", e.target.value)}
                                                                    className={`${commonStyles.metricInput} ${crit !== 0 ? commonStyles.critInput : ''} ${isCritFocused ? styles.metricInputFocusedCrit : ''}`}
                                                                    aria-label={`CRIT pour ${service}`}
                                                                    onFocus={(e) => handleInputFocus(e, service, 'crit')}
                                                                    onBlur={handleInputBlur}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                    )}
                                    </div>
                                </div>
                                </div>

                                {/* Zone de commentaire ou d'erreur - Footer en dehors de serverScrollable */}
                                <div className={styles.serverCardFooter}>
                                    <div className={styles.footerButtonsContainer}>
                                        {/* Onglets pour basculer entre les deux vues : Stats, Stats avancée */}
                                        <div className={styles.viewTabsContainer}>
                                            {hasWarningOrCritical(srv.nom) && (
                                                <FaExclamationCircle className={styles.problemIcon} />
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (!loadingCheckMK[srv.nom]) {
                                                        const newMode = 'manual';
                                                        setSyncMode(prev => ({ ...prev, [srv.nom]: newMode }));
                                                        const currentData = dataRef.current || {};
                                                        const updated = {
                                                            ...currentData,
                                                            [srv.nom]: {
                                                                ...(currentData[srv.nom] || {}),
                                                                syncMode: newMode
                                                            }
                                                        };
                                                        setData(updated);
                                                        dataRef.current = updated;
                                                    }
                                                }}
                                                disabled={loadingCheckMK[srv.nom]}
                                                className={`${styles.viewTabButton} ${(syncMode[srv.nom] === 'manual' || !syncMode[srv.nom]) ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}
                                            >
                                                <IconifyIcon
                                                    icon="material-symbols:dashboard-rounded"
                                                    width={16}
                                                    height={16}
                                                />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!loadingCheckMK[srv.nom]) {
                                                        const newMode = 'checkmk';
                                                        setSyncMode(prev => ({ ...prev, [srv.nom]: newMode }));
                                                        const currentData = dataRef.current || {};
                                                        const updated = {
                                                            ...currentData,
                                                            [srv.nom]: {
                                                                ...(currentData[srv.nom] || {}),
                                                                syncMode: newMode
                                                            }
                                                        };
                                                        setData(updated);
                                                        dataRef.current = updated;
                                                    }
                                                }}
                                                disabled={loadingCheckMK[srv.nom]}
                                                className={`${styles.viewTabButton} ${syncMode[srv.nom] === 'checkmk' ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}
                                            >
                                                <IconifyIcon
                                                    icon="material-symbols:query-stats-rounded"
                                                    width={16}
                                                    height={16}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                {/* Zone de commentaire - toujours visible */}
                                <textarea
                                  id={`comment-${srv.nom}`}
                                  className={styles.commentTextarea}
                                  value={data?.[srv.nom]?.comment || ""}
                                  onChange={(e) => updateComment(srv.nom, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  placeholder="Commentaire..."
                                  rows="2"
                                />
                                    </div>
                                </React.Fragment>
                                );
                            })}
                    </div>
                </div>
                );
            })}

            {/* Tooltip global qui suit la souris */}
            {hoveredTooltip && (
                <div
                    className={`${styles.tooltipContainer} ${hoveredTooltip.type === 'score' ? styles.tooltipScore : styles.tooltipOther}`}
                    style={{
                        left: `${hoveredTooltip.mouseX + 10}px`,
                        top: `${hoveredTooltip.mouseY + 10}px`,
                        maxWidth: hoveredTooltip.type === 'services'
                            ? '500px'
                            : hoveredTooltip.type === 'events'
                                ? '600px'
                                : hoveredTooltip.type === 'availability'
                                    ? '400px'
                                    : hoveredTooltip.type === 'score'
                                        ? '700px'
                                        : '400px'
                    }}
                >
                    {hoveredTooltip.type === 'score' && (
                        <div>
                            <div className={styles.tooltipTitle}>
                                Calcul de la note
                            </div>
                            <div className={styles.tooltipGrid}>
                                {(hoveredTooltip.scoreBreakdown || []).map((item, idx) => (
                                    <div
                                        key={`score-breakdown-${idx}`}
                                        className={styles.tooltipGridItem}
                                    >
                                        <div className={styles.tooltipGridItemContent}>
                                            <div className={styles.tooltipGridLabel}>
                                                {item.label}
                                            </div>
                                            <div className={styles.tooltipGridDescription}>
                                                {item.description}
                                            </div>
                                        </div>
                                        <div className={styles.tooltipGridWeight}>
                                            {item.weight}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {hoveredTooltip.type === 'availability' && availabilityData[hoveredTooltip.serverName] && (
                        <div className={styles.tooltipSection}>
                            <div className={styles.tooltipSectionTitle}>
                                Disponibilité
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Temps UP / DOWN / UNREACH sur la période.
                            </div>
                            {availabilityData[hoveredTooltip.serverName].up !== undefined && (
                                <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>UP:</span>
                                    <span className={`${styles.tooltipValue} ${styles.tooltipValueGreen}`}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].up || 0))} %
                                    </span>
                                </div>
                            )}
                            {availabilityData[hoveredTooltip.serverName].down !== undefined && (
                                <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>DOWN:</span>
                                    <span className={`${styles.tooltipValue} ${styles.tooltipValueRed}`}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].down || 0))} %
                                    </span>
                                </div>
                            )}
                            {availabilityData[hoveredTooltip.serverName].unreach !== undefined && (
                                <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>UNREACH:</span>
                                    <span className={`${styles.tooltipValue} ${styles.tooltipValueRedDark}`}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].unreach || 0))} %
                                    </span>
                                </div>
                            )}
                            {availabilityData[hoveredTooltip.serverName].flapping !== undefined && (
                                <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>Flapping:</span>
                                    <span className={`${styles.tooltipValue} ${styles.tooltipValueOrange}`}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].flapping || 0))} %
                                    </span>
                                </div>
                            )}
                            {availabilityData[hoveredTooltip.serverName].downtime !== undefined && (
                                <div className={styles.tooltipDowntimeRow}>
                                    <span className={styles.tooltipLabel}>Downtime:</span>
                                    <span className={styles.tooltipValue}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].downtime || 0))} %
                                    </span>
                                </div>
                            )}
                            {availabilityData[hoveredTooltip.serverName].n_a !== undefined && (
                                <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>N/A:</span>
                                    <span className={styles.tooltipValue}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].n_a || 0))} %
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    {hoveredTooltip.type === 'services' && checkmkData[hoveredTooltip.serverName] && (
                        <div className={styles.tooltipServicesContainer}>
                            <div className={styles.tooltipServicesTitle}>
                                Services monitorés
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Services supervisés par Check MK pour cet équipement.
                            </div>
                            <div className={styles.tooltipServicesList}>
                                {(() => {
                                    const services = checkmkData[hoveredTooltip.serverName].serviceInfo?.services || 
                                                   checkmkData[hoveredTooltip.serverName].services || 
                                                   [];
                                    
                                    if (services.length === 0) {
                                        return (
                                            <div className={styles.tooltipEmpty}>
                                                Aucun service
                                            </div>
                                        );
                                    }
                                    
                                    const checkmkHostName = checkmkData[hoveredTooltip.serverName]?.checkmk_host_name;
                                    
                                    return services.map((service, idx) => {
                                        let serviceName = service.title || service.id || service.name || 'Service';
                                        
                                        if (checkmkHostName && serviceName.includes(checkmkHostName)) {
                                            serviceName = serviceName.replace(new RegExp(checkmkHostName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
                                        }
                                        serviceName = serviceName
                                            .replace(/\s*on\s+host\s*[^\s]*/gi, '')
                                            .replace(/\s+on\s+/gi, ' ')
                                            .replace(/^on\s+/gi, '')
                                            .replace(/\s+on$/gi, '')
                                            .trim();
                                        
                                        return (
                                            <div 
                                                key={service.id || service.title || idx}
                                                className={styles.tooltipServiceItem}
                                            >
                                                {serviceName}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}
                    {hoveredTooltip.type === 'events' && eventsData[hoveredTooltip.serverName] && eventsData[hoveredTooltip.serverName].length > 0 && (
                        <div className={styles.tooltipSection}>
                            <div className={styles.tooltipSectionTitle}>
                                Événements et notifications
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                {eventsCount[hoveredTooltip.serverName] || 0} événement(s) sur la période.
                            </div>
                            <div className={styles.tooltipEventsContainer}>
                                {eventsData[hoveredTooltip.serverName].map((event, idx) => {
                                    let eventTime, eventType, host, service, state, message;
                                    
                                    if (Array.isArray(event)) {
                                        eventTime = event[1];
                                        eventType = event[2];
                                        host = event[3];
                                        service = event[4];
                                        state = event[5];
                                        message = event[6];
                                    } else if (typeof event === 'object') {
                                        eventTime = event.log_time || event.time || event.timestamp;
                                        eventType = event.log_type || event.type;
                                        host = event.host || event.host_name;
                                        service = event.service_description || event.service;
                                        state = event.log_state_info || event.state;
                                        message = event.log_plugin_output || event.message || event.plugin_output;
                                    }
                                    
                                    let formattedDate = eventTime;
                                    if (eventTime && typeof eventTime === 'string') {
                                        try {
                                            const date = new Date(eventTime.replace(' ', 'T'));
                                            if (!isNaN(date.getTime())) {
                                                formattedDate = date.toLocaleString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                });
                                            }
                                        } catch (e) {
                                            // Garder la date originale si le parsing échoue
                                        }
                                    }
                                    
                                    let stateColor = 'var(--text-primary)';
                                    if (state) {
                                        const stateLower = state.toLowerCase();
                                        if (stateLower.includes('critical') || stateLower.includes('crit')) {
                                            stateColor = '#ef4444';
                                        } else if (stateLower.includes('warning') || stateLower.includes('warn')) {
                                            stateColor = '#f59e0b';
                                        } else if (stateLower.includes('down') || stateLower.includes('unreachable')) {
                                            stateColor = '#dc2626';
                                        }
                                    }
                                    
                                    return (
                                        <div 
                                            key={idx}
                                            className={styles.tooltipEventItem}
                                        >
                                            <div className={styles.tooltipEventHeader}>
                                                <div className={styles.tooltipEventDate}>
                                                    {formattedDate}
                                                </div>
                                                {state && (
                                                    <div style={{ color: stateColor, fontWeight: '600', fontSize: '0.7rem' }}>
                                                        {state}
                                                    </div>
                                                )}
                                            </div>
                                            {eventType && (
                                                <div className={styles.tooltipEventType}>
                                                    {eventType}
                                                </div>
                                            )}
                                            {service && (
                                                <div className={styles.tooltipEventService}>
                                                    {service}
                                                </div>
                                            )}
                                            {message && (
                                                <div className={styles.tooltipEventMessage}>
                                                    {message}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tooltip pour les étiquettes */}
            {hoveredLabelsTooltip && (() => {
                const server = serveurs?.find(s => s.nom === hoveredLabelsTooltip.serverName);
                if (!server) return null;
                
                const roles = Array.isArray(server.role) ? server.role : (server.role ? [server.role] : []);
                const allLabels = [...roles, ...(server.vlan ? [`VLAN ${server.vlan}`] : [])];
                
                return (
                    <div
                        className={styles.tooltipContainer}
                        style={{
                            left: `${hoveredLabelsTooltip.mouseX}px`,
                            top: `${hoveredLabelsTooltip.mouseY}px`,
                            transform: 'translateX(-50%)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <div className={styles.tooltipLabelsTitle}>
                            Étiquettes
                        </div>
                        <div className={styles.tooltipLabelsContainer}>
                            {allLabels.map((label, idx) => (
                                <div key={idx} className={styles.tooltipLabelItem}>
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Modal d'édition pour un serveur */}
            {editingServer && editForm && (
            <div className={styles.editModalOverlay}>
                <div
                    className={`${styles.editModalContent} ${styles.editModalContentLarge}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles.editModalHeader}>
                        <h3 className={styles.editModalTitle}>
                            <IconifyIcon
                                icon="material-symbols:edit"
                                width={18}
                                height={18}
                                style={{ color: '#6b7280' }}
                            />
                            Éditer le serveur
                        </h3>
                        <button
                            type="button"
                            className={styles.editModalCloseButton}
                            onClick={() => {
                                setEditingServer(null);
                                setEditForm(null);
                            }}
                            title="Fermer"
                            disabled={isSaving}
                        >
                            <IconifyIcon
                                icon="material-symbols:cancel-rounded"
                                width={20}
                                height={20}
                            />
                        </button>
                    </div>

                    <div className={styles.editModalBody}>
                        {isSaving ? (
                            <div className={styles.editModalLoading}>
                                <IconifyIcon
                                    icon="svg-spinners:3-dots-fade"
                                    width={48}
                                    height={48}
                                    style={{ color: '#6b7280' }}
                                />
                            </div>
                        ) : (
                            <div className={styles.editModalForm}>
                                {/* Ligne 1 : Nom + IP */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Nom du serveur *
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.nom}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    nom: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: SRV-01"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Adresse IP
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.ip}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    ip: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 192.168.1.10"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 2 : Système + Type */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Système d'exploitation
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.systeme}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    systeme: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: Windows Server 2019"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Type
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.type === "physique" ? "Physique" : "Virtuel"}
                                            disabled
                                            style={{ 
                                                backgroundColor: '#f3f4f6',
                                                cursor: 'not-allowed',
                                                color: '#6b7280'
                                            }}
                                        />
                                    </label>
                                </div>

                                {/* Ligne 3 : Site + VLAN */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Site
                                        <select
                                            className={styles.editModalSelect}
                                            value={editForm.site || ""}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    site: e.target.value
                                                }))
                                            }
                                        >
                                            <option value="">Sans site</option>
                                            {(() => {
                                                // Récupérer tous les sites uniques depuis les équipements
                                                const allSites = new Set();
                                                if (config?.client?.equipements) {
                                                    Object.values(config.client.equipements).forEach(equipmentList => {
                                                        if (Array.isArray(equipmentList)) {
                                                            equipmentList.forEach(equipment => {
                                                                if (equipment.site && equipment.site !== "Sans site") {
                                                                    allSites.add(equipment.site);
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                                return Array.from(allSites).sort().map((site) => (
                                                    <option key={site} value={site}>
                                                        {site}
                                                    </option>
                                                ));
                                            })()}
                                        </select>
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        VLAN
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.vlan}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    vlan: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 10"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 4 : Marque + Modèle (uniquement pour serveurs physiques) */}
                                {editForm.type === "physique" && (
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Marque
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.marque}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    marque: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: Dell, HP"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Modèle
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.modele}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    modele: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: PowerEdge R740"
                                        />
                                    </label>
                                </div>
                                )}

                                {/* Ligne 5 : Processeur + Mémoire */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Processeur
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.processeur}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    processeur: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: Intel Xeon E5-2620"
                                        />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Mémoire
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.memoire}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    memoire: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 32 Go"
                                        />
                                    </label>
                                </div>

                                {/* Ligne 6 : Stockage + Numéro de série (numéro de série uniquement pour serveurs physiques) */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Stockage
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.stockage}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    stockage: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: 500 Go"
                                        />
                                    </label>
                                    {editForm.type === "physique" && (
                                    <label className={styles.editModalLabel}>
                                        Numéro de série
                                        <input
                                            type="text"
                                            className={styles.editModalInput}
                                            value={editForm.numeroSerie}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    numeroSerie: e.target.value
                                                }))
                                            }
                                            placeholder="Ex: ABC123456"
                                        />
                                    </label>
                                    )}
                                </div>

                                {/* Ligne 7 : Expiration garantie (uniquement pour serveurs physiques) */}
                                {editForm.type === "physique" && (
                                <label className={styles.editModalLabel}>
                                    Expiration garantie
                                    <input
                                        type="date"
                                        className={styles.editModalInput}
                                        value={editForm.expirationGarantie}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                expirationGarantie: e.target.value
                                            }))
                                        }
                                    />
                                </label>
                                )}

                                {/* Rôles */}
                                <label className={styles.editModalLabel}>
                                    Rôles
                                    <MultiSelectDropdown
                                        options={roleOptions}
                                        selectedValues={Array.isArray(editForm.role) ? editForm.role : (editForm.role ? [editForm.role] : [])}
                                        onChange={(selected) => {
                                            setEditForm((prev) => ({
                                                ...prev,
                                                role: selected
                                            }));
                                        }}
                                        placeholder="Sélectionnez les rôles"
                                    />
                                </label>

                                {/* CheckMK Mapping */}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel} style={{ flex: '1 1 100%' }}>
                                        Mapping CheckMK
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCheckmkMappingModal({ isOpen: true, serverId: editingServer.id });
                                            }}
                                            style={{
                                                width: '100%',
                                                marginTop: '0.25rem',
                                                padding: '0.5rem 0.75rem',
                                                border: '1px solid var(--border-secondary)',
                                                borderRadius: '6px',
                                                background: (editingServer.id && getCheckMKMapping(editingServer.id)) ? '#10b981' : '#ffffff',
                                                color: (editingServer.id && getCheckMKMapping(editingServer.id)) ? 'white' : '#4b5563',
                                                fontSize: '0.85rem',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                const mapping = editingServer.id ? getCheckMKMapping(editingServer.id) : null;
                                                if (!mapping) {
                                                    e.currentTarget.style.background = '#f3f4f6';
                                                    e.currentTarget.style.borderColor = '#d1d5db';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                const mapping = editingServer.id ? getCheckMKMapping(editingServer.id) : null;
                                                if (!mapping) {
                                                    e.currentTarget.style.background = '#ffffff';
                                                    e.currentTarget.style.borderColor = 'var(--border-secondary)';
                                                }
                                            }}
                                        >
                                            <FaLink size={14} />
                                            {(() => {
                                                const mapping = editingServer.id ? getCheckMKMapping(editingServer.id) : null;
                                                return mapping 
                                                    ? `Mappé: ${mapping.checkmk_host_name}`
                                                    : 'Mapper avec CheckMK';
                                            })()}
                                        </button>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isSaving && (
                        <div className={styles.editModalFooter}>
                            <button
                                type="button"
                                className={styles.editModalSaveButton}
                                onClick={handleSaveServer}
                                disabled={isSaving}
                            >
                                <IconifyIcon
                                    icon="material-symbols:save"
                                    width={16}
                                    height={16}
                                />
                                Enregistrer
                            </button>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Modal de mapping CheckMK */}
            {checkmkMappingModal.isOpen && checkmkMappingModal.serverId !== null && editingServer && (
                <CheckMKMappingModal
                    isOpen={checkmkMappingModal.isOpen}
                    onClose={() => setCheckmkMappingModal({ isOpen: false, serverId: null })}
                    equipmentName={editingServer.nom}
                    equipmentType="Serveurs"
                    equipmentId={editingServer.id}
                    equipmentIndex={editingServer.id}
                    clientId={config?.client?.id}
                    requireService={false}
                    onMappingSaved={(mapping) => {
                        if (mapping) {
                            // Mettre à jour le mapping local
                            setCheckmkMappings(prev => ({
                                ...prev,
                                [editingServer.nom]: mapping
                            }));
                            // Mettre à jour le formulaire d'édition avec les nouvelles valeurs
                            setEditForm((prev) => ({
                                ...prev,
                                checkmk_site: mapping.checkmk_site || null,
                                checkmk_host_name: mapping.checkmk_host_name || ''
                            }));
                            toast.success("Mapping mis à jour", toastOptions);
                        } else {
                            // Supprimer le mapping
                            setCheckmkMappings(prev => {
                                const newMappings = { ...prev };
                                delete newMappings[editingServer.nom];
                                return newMappings;
                            });
                            // Mettre à jour le formulaire d'édition
                            setEditForm((prev) => ({
                                ...prev,
                                checkmk_site: null,
                                checkmk_host_name: ''
                            }));
                            toast.success("Mapping supprimé", toastOptions);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default Serveurs;
