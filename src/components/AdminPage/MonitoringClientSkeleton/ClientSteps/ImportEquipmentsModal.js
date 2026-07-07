import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import adminStyles from "../../AdminPanel.module.css";
import { toast } from "react-toastify";

/**
 * Modal pour importer des équipements via copier-coller
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {Function} onClose - Fonction pour fermer le modal
 * @param {Function} onImport - Fonction appelée avec les équipements parsés
 * @param {string} equipmentType - 'switch' ou 'wifi'
 */
const ImportEquipmentsModal = ({ isOpen, onClose, onImport, equipmentType = 'switch' }) => {
  const [pastedText, setPastedText] = useState("");
  const [parsedDevices, setParsedDevices] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState(new Set()); // Set d'indices des équipements sélectionnés

  const parseSwitches = (text) => {
    const devices = [];
    const seenMacs = new Set();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Détecter le début d'un switch : ligne avec USW/UDM suivi d'une ligne avec un nom (qui n'est pas juste le modèle répété)
      // Début valide d'un switch (USW avec Pro/Aggregation/numéro, ou UDM/UDM Pro)
      if ((/^(USW\s+(Pro|Aggregation|\d+)[^]*)|(UDM(\s+Pro)?\b.*)/i.test(line))) {
        // Vérifier que c'est vraiment un nouveau switch et pas juste une répétition du modèle au milieu d'un bloc
        const modelParts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
        const currentModel = modelParts[0]?.trim() || '';
        
        // Le nom doit être sur la même ligne (après le modèle) OU sur la ligne suivante
        // Mais pas après plusieurs lignes (ce serait une répétition du modèle)
        let deviceName = '';
        let isNewSwitch = false;
        
        // Fonction pour valider qu'une ligne est un nom valide (pas un firmware, IP, MAC, etc.)
        const isValidName = (name) => {
          if (!name || name.length < 2 || name.length > 60) return false;
          
          // Ne doit pas être juste des chiffres et points (firmware comme "7.1.26")
          if (/^\d+\.\d+\.\d+$/.test(name)) return false;
          
          // Ne doit pas être juste des chiffres
          if (/^\d+$/.test(name)) return false;
          
          // Éviter de confondre un modèle répété avec un nom
          if (/^(USW|UDM)\b/i.test(name)) {
            // ressemble à un modèle si contient "Pro" ou des chiffres
            if (/(Pro|\d)/i.test(name)) return false;
          }
          
          // Ne doit pas être une IP
          if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(name)) return false;
          
          // Ne doit pas être une MAC
          if (/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(name)) return false;

          // Exclure les libellés techniques: ports, types de liens
          if (/^Port\s+\d+/i.test(name)) return false;
          if (/^SFP/i.test(name)) return false;
          if (/GbE/i.test(name)) return false;
          // ne pas exclure les noms contenant FIBRE (ex: Aggregation-FIBRE)
          
          // Ne doit pas être des mots-clés système
          if (/^Network$|^Click to Update$|^Up to date$|^Online$|^Offline$|^Locate$|^Restart$/i.test(name)) return false;
          
          // Doit contenir au moins une lettre ou avoir un pattern de nom (ex: "48-Nom", "16-Nom")
          // Pattern: commence par des chiffres optionnels, suivi d'un tiret ou d'espaces, puis des lettres
          const hasLetters = /[a-zA-Z]/.test(name);
          const hasNamePattern = /^\d+[-_]\w+/.test(name) || /^\d+\s+\w+/.test(name);
          
          return hasLetters || hasNamePattern;
        };
        
        // Cas 1: Nom sur la même ligne
        if (modelParts.length > 1) {
          const potentialName = modelParts[1].replace(/Network|Click to Update|Up to date|Online|Offline|Locate|Restart/gi, '').trim();
          if (isValidName(potentialName)) {
            deviceName = potentialName;
            isNewSwitch = true;
          }
        }
        
        // Cas 2: Nom sur la ligne suivante
        if (!isNewSwitch && i + 1 < lines.length) {
          const nextLine = lines[i + 1].replace(/Network|Click to Update|Up to date|Online|Offline|Locate|Restart/gi, '').trim();
          if (isValidName(nextLine)) {
            deviceName = nextLine;
            isNewSwitch = true;
          }
        }
        
        // Si c'est un nouveau switch, l'analyser
        if (isNewSwitch && currentModel) {
          let device = {
            nom: deviceName || currentModel,
            fabricant: 'Ubiquiti',
            modele: currentModel,
            ip: '',
            firmware: '',
            adresseMac: ''
          };

          // Extraire les informations depuis le bloc (jusqu'au prochain switch ou max 25 lignes)
          let blockEnd = i + 25;
          const looksLikeName = (s) => {
            if (!s) return false;
            const t = s.trim();
            if (t.length < 2 || t.length > 60) return false;
            if (/^USW|^UDM/i.test(t)) return false; // pas un modèle
            if (/^\d+\.\d+\.\d+$/.test(t)) return false; // version
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(t)) return false; // IP
            if (/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(t)) return false; // MAC
            return /[a-zA-Z]/.test(t);
          };

          for (let j = i + 2; j < Math.min(i + 25, lines.length); j++) {
            // On détecte un nouveau switch uniquement si la ligne USW/UDM est suivie d'un vrai nom
            if (/^USW|^UDM/i.test(lines[j])) {
              const maybeName = (j + 1 < lines.length) ? lines[j + 1] : '';
              if (looksLikeName(maybeName)) {
                blockEnd = j;
                break;
              }
            }
          }
          
          const block = lines.slice(i, blockEnd).join(' ');
          const blockLines = lines.slice(i, blockEnd);
          
          // Chercher la MAC dans le bloc
          const macMatch = block.match(/([0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2})/i);
          if (macMatch) {
            device.adresseMac = macMatch[1];
            
            // Format typique après la MAC: MAC -> Modèle répété -> Firmware -> IP
            // Chercher l'index de la ligne contenant la MAC
            const macIndex = blockLines.findIndex(l => l.includes(macMatch[1]));
            if (macIndex >= 0) {
              // Chercher le firmware et l'IP dans les lignes après la MAC
              // Ils apparaissent généralement dans l'ordre: MAC, Modèle, Firmware, IP
              for (let k = macIndex + 1; k < blockLines.length && k <= macIndex + 15; k++) {
                const currentLine = blockLines[k].trim();
                
                // Chercher le firmware (format X.X.X ou X.X.XX, peut avoir des espaces avant/après)
                if (!device.firmware) {
                  const firmwareMatch = currentLine.match(/(\d+\.\d+\.\d+)/);
                  // Vérifier que ce n'est pas une IP (les IPs ont 3 chiffres max par segment)
                  if (firmwareMatch && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(currentLine)) {
                    device.firmware = firmwareMatch[1];
                  }
                }
                
                // Chercher l'IP (format XXX.XXX.XXX.XXX, peut avoir des espaces avant/après)
                if (!device.ip) {
                  const ipMatch = currentLine.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                  if (ipMatch) {
                    device.ip = ipMatch[1];
                  }
                }
                
                // Si on a trouvé les deux, on peut arrêter
                if (device.firmware && device.ip) {
                  break;
                }
              }
            }
          }

          // Si firmware non trouvé avec la méthode contextuelle, chercher dans toutes les lignes
          if (!device.firmware) {
            for (let j = 0; j < blockLines.length; j++) {
              const line = blockLines[j].trim();
              const firmwareMatch = line.match(/(\d+\.\d+\.\d+)/);
              // Vérifier que ce n'est pas une IP
              if (firmwareMatch && !/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(line)) {
                device.firmware = firmwareMatch[1];
                break;
              }
            }
          }

          // Si IP non trouvée avec la méthode contextuelle, chercher dans toutes les lignes du bloc
          if (!device.ip) {
            // Chercher toutes les IPs dans le bloc et prendre la première valide
            const allIpMatches = block.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g);
            if (allIpMatches && allIpMatches.length > 0) {
              // Valider que c'est une IP valide (chaque segment <= 255)
              for (const ip of allIpMatches) {
                const segments = ip.split('.');
                if (segments.every(s => parseInt(s) <= 255)) {
                  device.ip = ip;
                  break;
                }
              }
            }
          }

          const macKey = device.adresseMac;
          if (!macKey || seenMacs.has(macKey)) {
            // skip duplicates or if no MAC
          } else {
            devices.push(device);
            seenMacs.add(macKey);
          }
        }
      }
      i++;
    }
    // PASS 2: format simplifié (Nom, MAC, Modèle, Firmware, IP)
    const macRegex = /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i;
    const versionRegex = /^\d+\.\d+\.\d+$/;
    const ipRegex = /^\d{1,3}(?:\.\d{1,3}){3}$/;
    for (let idx = 0; idx < lines.length; idx++) {
      const curr = lines[idx];
      if (macRegex.test(curr)) {
        const mac = curr.toLowerCase();
        if (seenMacs.has(mac)) continue;
        // Nom = ligne précédente non vide
        let name = '';
        for (let back = idx - 1; back >= 0 && back >= idx - 2; back--) {
          const candidate = lines[back];
          if (!candidate || macRegex.test(candidate) || versionRegex.test(candidate) || ipRegex.test(candidate)) continue;
          name = candidate; break;
        }
        // Suivants: modèle, version, IP
        let model = '';
        let firmware = '';
        let ip = '';
        let uptime = '';
        for (let fwd = idx + 1; fwd < Math.min(lines.length, idx + 10); fwd++) {
          const next = lines[fwd];
          if (!model && /^(USW|UDM)/i.test(next)) { model = next; continue; }
          if (!firmware && versionRegex.test(next)) { firmware = next; continue; }
          if (!ip && ipRegex.test(next)) { ip = next; continue; }
          // capter uptime sous forme durée ou date, s'arrêter après détection
          if (!uptime) {
            if (/^\d+d\s+\d+h\s+\d+m\s+\d+s$/i.test(next)) { uptime = next; continue; }
            if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}\s+(AM|PM)$/i.test(next)) { uptime = next; continue; }
          }
        }
        if (!model) continue; // ignorer si ce n'est pas un switch/UDM

        const device = {
          nom: name || model,
          fabricant: 'Ubiquiti',
          modele: model,
          ip,
          firmware,
          adresseMac: mac
        };
        devices.push(device);
        seenMacs.add(mac);
      }
    }

    return devices;
  };

  const parseWifiAccessPoints = (text) => {
    const devicesMap = new Map(); // key (MAC ou IP) -> device
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Détecter le début d'un access point (ligne avec U6, U7, UAP, etc.)
      if (/U\d+|UAP/i.test(line)) {
        let device = {
          nom: '',
          fabricant: 'Ubiquiti',
          modele: '',
          ip: '',
          firmware: '',
          numeroSerie: '',
          expirationGarantie: '',
          emplacement: '',
          supportsWifi6: false,
          bandes: { "2.4GHz": true, "5GHz": true, "6GHz": false },
          ssids: [],
          controleur: ''
        };

        // Extraire le modèle (première partie de la ligne)
        const modelParts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
        if (modelParts.length > 0) {
          const firstPart = modelParts[0].trim();
          
          // Si la première ligne contient déjà un nom complet avec emplacement
          // ex: "U6-LR (BAT B - RDC - DEBUT)"
          if (firstPart.includes('(')) {
            // Modèle = partie avant la parenthèse, Nom = ligne complète
            const baseModel = firstPart.split('(')[0].trim();
            device.modele = baseModel || firstPart;
            device.nom = firstPart;
          } else {
            // Sinon, on considère que c'est juste le modèle (ex: "U6 Lite")
            device.modele = firstPart;
          }
          
          // Détecter WiFi 6 (U6, U7)
          if (/U[67]|UAP-.*-6/i.test(device.modele)) {
            device.supportsWifi6 = true;
          }
          
          // Le nom peut être sur la même ligne après le modèle OU dans les lignes suivantes
          const sanitize = (s) => s.replace(/Network|Click to Update|Up to date|Online|Offline/gi, '').trim();
          const isUptime = (s) => {
            if (!s) return false;
            const t = s.trim();
            // Formats du type "8d 1h 46m 32s", "8d 20m 44s", "7d 23h", "59d 21h 31m 2s", etc.
            return /^\d+d(\s+\d+h)?(\s+\d+m)?(\s+\d+s)?$/i.test(t);
          };
          const isValidCandidate = (s) => {
            if (!s) return false;
            if (s === device.modele) return false; // éviter répétition du modèle
            if (/^\d+\.\d+\.\d+$/.test(s)) return false; // firmware
            if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) return false; // IP
            if (/^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i.test(s)) return false; // MAC
            if (/^Port\s+\d+/i.test(s)) return false;
            if (/^SFP/i.test(s)) return false;
            if (/GbE/i.test(s)) return false;
            // Exclure lignes de canal/bande passante (ex: "6 (40 MHz)", "11 (20 MHz)")
            if (/^\d+\s*\(\s*\d+\s*MHz\s*\)/i.test(s)) return false;
            // Exclure niveaux/états clients
            if (/^Excellent$|^No\s+Clients$|^Good$/i.test(s)) return false;
            // Exclure les uptimes (ex: "8d 1h 46m 32s")
            if (isUptime(s)) return false;
            return s.length >= 2 && s.length <= 60;
          };
          const isBoundary = (raw) => {
            const t = raw.trim();
            if (/^(Up to date|Click to Update|Online|Offline)$/i.test(t)) return true; // statut
            if (/^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i.test(t)) return true; // MAC
            if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(t)) return true; // IP
            if (/^\d+\.\d+\.\d+$/.test(t)) return true; // firmware
            if (isUptime(t)) return true; // ligne d'uptime -> frontière de bloc
            return false;
          };

          let candidate = modelParts.length > 1 ? sanitize(modelParts[1]) : '';
          // Heuristique renforcée: première ligne utile après le modèle, avant le statut (Up to date...),
          // en ignorant un éventuel modèle répété (U6/U7/UAP), les libellés techniques et mesures.
          if (!isValidCandidate(candidate)) {
            for (let lookahead = 1; lookahead <= 12; lookahead++) {
              if (i + lookahead >= lines.length) break;
              const raw = lines[i + lookahead].trim();
              if (isBoundary(raw)) break; // stop avant statut/MAC/IP/firmware
              // ignorer si c'est un modèle répété (U6/U7/UAP ...)
              if (/^(U\d+\b|UAP\b)/i.test(raw)) continue;
              const c = sanitize(raw);
              if (isValidCandidate(c)) { candidate = c; break; }
            }
          }
          if (isValidCandidate(candidate)) {
            device.nom = candidate;
          }
        }

        // Extraire les informations depuis le bloc
        const blockEnd = Math.min(i + 20, lines.length);
        const block = lines.slice(i, blockEnd).join(' ');
        const blockLines = lines.slice(i, blockEnd);
        
        // Chercher la MAC dans le bloc
        const macMatch = block.match(/([0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2})/i);
        if (macMatch) {
          device.numeroSerie = macMatch[1];
          device.adresseMac = macMatch[1];
          // Format typique après la MAC: MAC -> Modèle répété -> Firmware -> IP
          // Chercher l'index de la ligne contenant la MAC
          const macIndex = blockLines.findIndex(l => l.includes(macMatch[1]));
          if (macIndex >= 0) {
            // Chercher le firmware et l'IP dans les lignes après la MAC
            // Ils apparaissent généralement dans l'ordre: MAC, Modèle, Firmware, IP
            for (let k = macIndex + 1; k < blockLines.length && k <= macIndex + 15; k++) {
              const currentLine = blockLines[k].trim();
              
              // Chercher le firmware (format X.X.X ou X.X.XX, peut avoir des espaces avant/après)
              if (!device.firmware) {
                const firmwareMatch = currentLine.match(/(\d+\.\d+\.\d+)/);
                // Vérifier que ce n'est pas une IP (les IPs ont 3 chiffres max par segment)
                if (firmwareMatch && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(currentLine)) {
                  device.firmware = firmwareMatch[1];
                }
              }
              
              // Chercher l'IP (format XXX.XXX.XXX.XXX, peut avoir des espaces avant/après)
              if (!device.ip) {
                const ipMatch = currentLine.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                if (ipMatch) {
                  device.ip = ipMatch[1];
                }
              }
              
              // Si on a trouvé les deux, on peut arrêter
              if (device.firmware && device.ip) {
                break;
              }
            }
          }
        }

        // Si firmware non trouvé avec la méthode contextuelle, chercher dans toutes les lignes
        if (!device.firmware) {
          for (let j = 0; j < blockLines.length; j++) {
            const line = blockLines[j].trim();
            const firmwareMatch = line.match(/(\d+\.\d+\.\d+)/);
            // Vérifier que ce n'est pas une IP
            if (firmwareMatch && !/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(line)) {
              device.firmware = firmwareMatch[1];
              break;
            }
          }
        }

        // Si IP non trouvée avec la méthode contextuelle, chercher dans toutes les lignes du bloc
        if (!device.ip) {
          // Chercher toutes les IPs dans le bloc et prendre la première valide
          const allIpMatches = block.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g);
          if (allIpMatches && allIpMatches.length > 0) {
            // Valider que c'est une IP valide (chaque segment <= 255)
            for (const ip of allIpMatches) {
              const segments = ip.split('.');
              if (segments.every(s => parseInt(s) <= 255)) {
                device.ip = ip;
                break;
              }
            }
          }
        }

        // Détecter les bandes depuis le texte (ex: "6 (40 MHz)", "48 (160 MHz)")
        // Chercher les patterns de bandes
        const bandes24Match = block.match(/2\.4|24\s*GHz|\(20\s*MHz\)|\(40\s*MHz\)/i);
        const bandes5Match = block.match(/5\s*GHz|\(40\s*MHz\)|\(80\s*MHz\)|\(160\s*MHz\)|48\s*\(/i);
        const bandes6Match = block.match(/6\s*GHz|6E|\(6\s*\(/i);
        
        device.bandes = {
          "2.4GHz": !!bandes24Match || true, // Souvent présent par défaut
          "5GHz": !!bandes5Match || true, // Presque toujours présent
          "6GHz": !!bandes6Match || (device.supportsWifi6 && block.match(/160\s*MHz/))
        };

        // Utiliser le modèle comme nom si pas de nom spécifique
        if (!device.nom && device.modele) {
          device.nom = device.modele;
        }

        // Ajouter/merger UNIQUEMENT si la MAC est connue (évite doublons IP + MAC)
        if (device.modele && device.numeroSerie) {
          const key = device.numeroSerie;
          if (!devicesMap.has(key)) {
            devicesMap.set(key, device);
          } else {
            const existing = devicesMap.get(key);
            if (!existing.nom && device.nom) existing.nom = device.nom;
            if (!existing.ip && device.ip) existing.ip = device.ip;
            if (!existing.firmware && device.firmware) existing.firmware = device.firmware;
            if (!existing.modele && device.modele) existing.modele = device.modele;
            if (!existing.numeroSerie && device.numeroSerie) existing.numeroSerie = device.numeroSerie;
          }
        }
      }
      i++;
    }

    // Parcours simplifié (format: Nom, MAC, Modèle, Firmware, IP)
    const macRegex = /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i;
    const versionRegex = /^\d+\.\d+\.\d+$/;
    const ipRegex = /^\d{1,3}(?:\.\d{1,3}){3}$/;
    const isStatus = (s) => /^(Up to date|Click to Update|Online|Offline|Locate|Restart)$/i.test(s);
    const isModel = (s) => /^(U\d+\b|UAP\b|U7\s+Outdoor\b)/i.test(s);
    // Modèle "pur" = ligne qui ressemble à un modèle seul, sans emplacement entre parenthèses
    const isPureModel = (s) => isModel(s) && !/[()]/.test(s);
    const isUptime = (s) => {
      if (!s) return false;
      const t = s.trim();
      // Même logique que plus haut : "8d 1h 46m 32s", "8d 20m 44s", "7d 23h", etc.
      return /^\d+d(\s+\d+h)?(\s+\d+m)?(\s+\d+s)?$/i.test(t);
    };
    for (let idx = 0; idx < lines.length; idx++) {
      const curr = lines[idx];
      if (macRegex.test(curr)) {
        const mac = curr;
        // Chercher le nom en remontant jusqu'à 2 lignes avant
        let name = '';
        for (let back = idx - 1; back >= 0 && back >= idx - 3; back--) {
          const candidate = lines[back];
          // On ignore uniquement les modèles "purs" (ex: "U6 Lite"),
          // mais on garde les lignes de nom complètes qui contiennent un emplacement entre parenthèses
          if (!candidate || isStatus(candidate) || isPureModel(candidate) || versionRegex.test(candidate) || ipRegex.test(candidate) || macRegex.test(candidate) || isUptime(candidate)) continue;
          name = candidate; break;
        }
        // Chercher modèle, version et IP en avant
        let model = '';
        let firmware = '';
        let ip = '';
        for (let fwd = idx + 1; fwd < Math.min(lines.length, idx + 6); fwd++) {
          const next = lines[fwd];
          if (!model && isModel(next)) { model = next; continue; }
          if (!firmware && versionRegex.test(next)) { firmware = next; continue; }
          if (!ip && ipRegex.test(next)) { ip = next; continue; }
        }
        // Limiter aux bornes WiFi uniquement (modèle doit être U6/U7/UAP)
        if (!model) continue;
        const key = mac;
        const device = {
          nom: name,
          fabricant: 'Ubiquiti',
          modele: model,
          ip,
          firmware,
          numeroSerie: mac,
          adresseMac: mac,
          expirationGarantie: '',
          emplacement: '',
          supportsWifi6: /U[67]|UAP-.*-6/i.test(model),
          bandes: { '2.4GHz': true, '5GHz': true, '6GHz': false },
          ssids: [],
          controleur: ''
        };
        if (!devicesMap.has(key)) {
          devicesMap.set(key, device);
        } else {
          const existing = devicesMap.get(key);
          // Toujours privilégier le nom détecté le plus proche de la MAC
          if (device.nom) existing.nom = device.nom;
          if (device.modele) existing.modele = device.modele || existing.modele;
          if (device.firmware) existing.firmware = device.firmware || existing.firmware;
          if (device.ip) existing.ip = device.ip || existing.ip;
          if (device.adresseMac) existing.adresseMac = device.adresseMac;
          if (device.numeroSerie) existing.numeroSerie = device.numeroSerie;
        }
      }
    }

    return Array.from(devicesMap.values());
  };

  const handleParse = () => {
    if (!pastedText.trim()) {
      toast.error("Veuillez coller du texte à importer");
      return;
    }

    try {
      const devices = equipmentType === 'switch' 
        ? parseSwitches(pastedText)
        : parseWifiAccessPoints(pastedText);

      if (devices.length === 0) {
        toast.error("Aucun équipement détecté dans le texte. Vérifiez le format.");
        return;
      }

      setParsedDevices(devices);
      // Tous les équipements sont sélectionnés par défaut
      setSelectedDevices(new Set(devices.map((_, index) => index)));
      setPreviewMode(true);
      toast.success(`${devices.length} équipement(s) détecté(s)`);
    } catch (err) {
      console.error('Erreur parsing:', err);
      toast.error("Erreur lors de l'analyse du texte");
    }
  };

  const handleImport = () => {
    if (selectedDevices.size === 0) {
      toast.error("Veuillez sélectionner au moins un équipement à importer");
      return;
    }

    // Importer uniquement les équipements sélectionnés
    const devicesToImport = parsedDevices.filter((_, index) => selectedDevices.has(index));
    onImport(devicesToImport);
    toast.success(`${devicesToImport.length} équipement(s) importé(s) avec succès`);
    // Reset le modal pour revenir à l'état initial
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setPastedText("");
    setParsedDevices([]);
    setSelectedDevices(new Set());
    setPreviewMode(false);
  };

  // Reset le modal quand il s'ouvre
  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const toggleDeviceSelection = (index) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedDevices(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedDevices.size === parsedDevices.length) {
      // Tout désélectionner
      setSelectedDevices(new Set());
    } else {
      // Tout sélectionner
      setSelectedDevices(new Set(parsedDevices.map((_, index) => index)));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modalContent}
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: 860,
            width: '95%',
            borderRadius: 16,
            padding: 0,
            overflow: 'hidden',
            background: '#f9fafb',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)'
          }}
        >
          <div
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              background: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <Icon icon="mdi:database-import" style={{ fontSize: '24px', color: '#15d1a0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 650, color: '#111827', textAlign: 'left' }}>
                  Importer des {equipmentType === 'switch' ? 'switches' : 'bornes WiFi'}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'left' }}>
                  Collez les données UniFi, vérifiez, puis importez.
                </span>
              </div>
            </div>
            <button
              className={styles.closeButton}
              onClick={onClose}
              title="Fermer"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#4b5563',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <Icon icon="mdi:close" style={{ fontSize: '18px' }} />
            </button>
          </div>

          <div style={{ padding: '1.25rem 1.5rem 1.25rem 1.5rem', background: '#f9fafb' }}>
            {!previewMode ? (
              <>
                <div style={{ marginBottom: '0.85rem', color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  1) Dans UniFi Devices, filtrez les {equipmentType === 'switch' ? 'switches' : 'APs'} (Name, MAC, Model, Version, IP, Uptime).<br />
                  2) Copiez/collez ici le tableau obtenu. Nous détecterons automatiquement les équipements.
                </div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Collez ici le texte des ${equipmentType === 'switch' ? 'switches' : 'bornes WiFi'} depuis UniFi...`}
                  style={{
                    width: '100%',
                    minHeight: '260px',
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#1a1a1a',
                    fontSize: '0.875rem',
                    fontFamily: 'SFMono-Regular, Consolas, Menlo, monospace',
                    resize: 'vertical',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#15d1a0';
                    e.target.style.boxShadow = '0 0 0 3px rgba(21, 209, 160, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleParse}
                    disabled={!pastedText.trim()}
                    title="Analyser"
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#15d1a0',
                      color: 'white',
                      cursor: pastedText.trim() ? 'pointer' : 'not-allowed',
                      opacity: pastedText.trim() ? 1 : 0.5,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px'
                    }}
                    onMouseEnter={(e) => {
                      if (pastedText.trim()) {
                        e.currentTarget.style.background = '#13ba8e';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (pastedText.trim()) {
                        e.currentTarget.style.background = '#15d1a0';
                      }
                    }}
                  >
                    <Icon icon="mdi:magnify" style={{ fontSize: '18px' }} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{parsedDevices.length}</span>
                    <span style={{ color: '#6b7280' }}>équipement(s) détecté(s)</span>
                    <span style={{ color: '#d1d5db' }}>•</span>
                    <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{selectedDevices.size}</span>
                    <span style={{ color: '#6b7280' }}>sélectionné(s)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={handleReset}
                      style={{
                        padding: '0.5rem 0.9rem',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      Retour
                    </button>
                    <button
                      onClick={toggleAllSelection}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #15d1a0',
                        background: selectedDevices.size === parsedDevices.length ? '#15d1a0' : 'transparent',
                        color: selectedDevices.size === parsedDevices.length ? 'white' : '#15d1a0',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedDevices.size === parsedDevices.length) {
                          e.currentTarget.style.background = '#13ba8e';
                        } else {
                          e.currentTarget.style.background = '#f0fdfa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedDevices.size === parsedDevices.length) {
                          e.currentTarget.style.background = '#15d1a0';
                        } else {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {selectedDevices.size === parsedDevices.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>
                </div>

                <div className={styles.devicesScrollable} style={{ maxHeight: '420px', paddingRight: '0.25rem' }}>
                  {parsedDevices.map((device, index) => {
                    const isSelected = selectedDevices.has(index);
                    return (
                      <div 
                        key={index} 
                        onClick={() => toggleDeviceSelection(index)}
                        style={{ 
                          marginBottom: '0.5rem', 
                          cursor: 'pointer'
                        }}
                      >
                        <div className={styles.serverCard}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDeviceSelection(index)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ 
                                cursor: 'pointer', 
                                width: '18px', 
                                height: '18px',
                                marginTop: '2px',
                                flexShrink: 0
                              }}
                            />
                            <div className={styles.serverTitle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
                                  {device.nom || device.modele || `Équipement ${index + 1}`}
                                </span>
                                {device.modele && device.modele !== device.nom && (
                                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{device.modele}</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem' }}>
                                {device.ip && (
                                  <span style={{ color: '#374151' }}>
                                    <span style={{ color: '#9ca3af', marginRight: 4 }}>IP</span>
                                    {device.ip}
                                  </span>
                                )}
                                {device.adresseMac && (
                                  <span style={{ color: '#374151' }}>
                                    <span style={{ color: '#9ca3af', marginRight: 4 }}>MAC</span>
                                    {device.adresseMac}
                                  </span>
                                )}
                                {device.firmware && (
                                  <span style={{ color: '#374151' }}>
                                    <span style={{ color: '#9ca3af', marginRight: 4 }}>FW</span>
                                    {device.firmware}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleImport}
                    disabled={selectedDevices.size === 0}
                    style={{
                      padding: '0.55rem 1.2rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#15d1a0',
                      color: 'white',
                      fontWeight: 700,
                      cursor: selectedDevices.size === 0 ? 'not-allowed' : 'pointer',
                      opacity: selectedDevices.size === 0 ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedDevices.size > 0) {
                        e.currentTarget.style.background = '#13ba8e';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedDevices.size > 0) {
                        e.currentTarget.style.background = '#15d1a0';
                      }
                    }}
                  >
                    Importer ({selectedDevices.size})
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImportEquipmentsModal;

