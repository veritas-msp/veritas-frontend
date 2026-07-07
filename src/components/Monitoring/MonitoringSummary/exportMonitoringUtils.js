import JSZip from "jszip";
import { saveAs } from "file-saver";
import { fallbackModulesByReport } from "./monitoringConstants";
import { getModuleCategory } from "./monitoringUtils";

// Fonction utilitaire pour obtenir l'ID de section à partir du titre du module
function getSectionIdFromTitle(title) {
  const sectionMap = {
    'Internet': 'internet-section',
    'Serveurs': 'serveurs-section',
    'Stockage': 'stockage-section',
    'Pare-feu': 'firewalls-section',
    'Switchs': 'switch-section',
    'Bornes WiFi': 'wifi-section',
    'Sauvegarde': 'sauvegarde-section',
    'Antivirus': 'antivirus-section',
    'Antispam': 'antispam-section',
    'Noms de domaine': 'ndd-section',
    'Office 365': 'office365-section'
  };
  
  return sectionMap[title] || null;
}

// Fonction utilitaire pour convertir une image en base64
async function convertImageToBase64(img) {
  return new Promise((resolve) => {
    if (!img.src || img.src.startsWith('data:')) {
      resolve(null);
      return;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    
    tempImg.onload = () => {
      try {
        canvas.width = tempImg.width;
        canvas.height = tempImg.height;
        ctx.drawImage(tempImg, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        console.warn('Erreur conversion image en base64:', error);
        resolve(null);
      }
    };
    
    tempImg.onerror = () => {
      resolve(null);
    };
    
    // Essayer avec le src original
    tempImg.src = img.src;
  });
}

// Fonction utilitaire pour convertir un SVG Recharts en image
async function convertSVGToImage(svgElement) {
  return new Promise((resolve) => {
    try {
      const svg = svgElement.cloneNode(true);
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // Forcer le style en mode light pour les graphiques
      const style = document.createElement('style');
      style.textContent = `
        * { color: #374151 !important; }
        .recharts-cartesian-axis-tick-value { fill: #374151 !important; }
        .recharts-legend-item-text { fill: #374151 !important; }
        .recharts-tooltip-label { color: #374151 !important; }
      `;
      svg.insertBefore(style, svg.firstChild);
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || svgElement.clientWidth || 800;
        canvas.height = img.height || svgElement.clientHeight || 400;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const dataURL = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataURL);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch (error) {
      console.warn('Erreur lors de la conversion SVG:', error);
      resolve(null);
    }
  });
}

// Fonction pour générer un HTML pour un rapport spécifique
async function generateReportHTML(ref, config, reportType) {
  const content = ref.current;
  if (!content) return "";

  // ✅ Attendre que les graphiques Chart.js et Recharts soient rendus
  await new Promise(resolve => setTimeout(resolve, 300));

  // ✅ Définir les labels et couleurs pour les rapports
  const reportLabels = {
    'infrastructure': 'INFRASTRUCTURE',
    'cybersecurite': 'CYBERSÉCURITÉ',
    'services': 'SERVICES'
  };
  const reportColors = {
    'infrastructure': '#3b82f6',
    'cybersecurite': '#ef4444',
    'services': '#8b5cf6'
  };
  const reportColorLight = reportType === 'infrastructure' ? '#60a5fa' : reportType === 'cybersecurite' ? '#f87171' : '#a78bfa';

  // ✅ Cloner le contenu du résumé
  const clone = content.cloneNode(true);

  // ✅ Supprimer la classe dark du clone pour forcer le mode light
  clone.classList.remove('dark');
  clone.querySelectorAll('[class*="dark"]').forEach(el => {
    const classes = Array.from(el.classList);
    const darkClasses = classes.filter(c => c.includes('dark'));
    darkClasses.forEach(dc => el.classList.remove(dc));
  });

  // ✅ Supprimer les éléments non désirés dans l'export
  const elementsToRemove = clone.querySelectorAll(".export-exclude, .toolbar, [class*='toolbar']");
  elementsToRemove.forEach((el) => el.remove());

  // ✅ Supprimer les boutons de navigation des rapports
  clone.querySelectorAll('[data-variant]').forEach(btn => btn.remove());

  // ✅ Remplacer le titre existant par le nouveau titre coloré
  const reportLabelForTitle = reportLabels[reportType] || 'MONITORING';
  const reportColorForTitle = reportColors[reportType] || '#000000';
  
  const existingTitle = clone.querySelector('[class*="reportHeroTitle"]');
  if (existingTitle) {
    existingTitle.innerHTML = reportLabelForTitle;
    existingTitle.style.cssText = `
      font-size: clamp(3.5rem, 5.5vw, 5.5rem) !important;
      font-weight: 800 !important;
      letter-spacing: -0.03em !important;
      line-height: 1.1 !important;
      margin: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif !important;
      color: ${reportColorForTitle} !important;
    `;
  }

  // ✅ Ajouter des IDs aux sections de modules pour la navigation
  const moduleSections = clone.querySelectorAll('[class*="scrollSection"]');
  moduleSections.forEach((section, index) => {
    const moduleTitle = section.querySelector('[class*="moduleTitle"], [class*="sectionTitle"], h2, h3');
    if (moduleTitle) {
      const titleText = moduleTitle.textContent.trim();
      // Créer un ID basé sur le titre
      const sectionId = `module-${titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      section.id = sectionId;
      section.setAttribute('data-module-section', sectionId);
    } else {
      // Fallback : utiliser l'index
      section.id = `module-section-${index}`;
    }
  });

  // ✅ Supprimer les boutons de modules (non fonctionnels dans l'export)
  clone.querySelectorAll('[class*="moduleBtn"], [class*="moduleNav"], [class*="moduleButtonsRow"], [class*="moduleButtonsWrapper"], [class*="moduleNavCluster"]').forEach(button => {
    button.remove();
  });

  // ✅ Afficher uniquement la section du rapport demandé et masquer les autres
  const infrastructureSection = clone.querySelector('[class*="internetPinned"]');
  const cybersecuriteSection = clone.querySelector('[class*="cybersecuritePinned"]');
  const servicesSection = clone.querySelector('[class*="servicesPinned"]');

  if (reportType === 'infrastructure') {
    if (cybersecuriteSection) cybersecuriteSection.remove();
    if (servicesSection) servicesSection.remove();
    if (infrastructureSection) {
      infrastructureSection.style.display = '';
      infrastructureSection.style.visibility = 'visible';
    }
  } else if (reportType === 'cybersecurite') {
    if (infrastructureSection) infrastructureSection.remove();
    if (servicesSection) servicesSection.remove();
    if (cybersecuriteSection) {
      cybersecuriteSection.style.display = '';
      cybersecuriteSection.style.visibility = 'visible';
    }
  } else if (reportType === 'services') {
    if (infrastructureSection) infrastructureSection.remove();
    if (cybersecuriteSection) cybersecuriteSection.remove();
    if (servicesSection) {
      servicesSection.style.display = '';
      servicesSection.style.visibility = 'visible';
    }
  }

  // ✅ Forcer l'ouverture de tous les volets de matériel
  clone.querySelectorAll('[class*="materialCard"]').forEach(card => {
    const content = card.querySelector('[class*="materialContent"]');
    if (content) {
      content.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important;';
    }
    
    // Supprimer les icônes de toggle et rendre les headers non-cliquables
    const toggleIcons = card.querySelectorAll('[class*="toggleIcon"]');
    toggleIcons.forEach(icon => icon.remove());
    
    const headers = card.querySelectorAll('[class*="materialHeader"]');
    headers.forEach(header => {
      header.style.cursor = 'default';
      header.onclick = null;
    });
  });

  // ✅ Convertir les modules cliquables en liens de navigation fonctionnels
  clone.querySelectorAll('[class*="clickableModule"]').forEach(moduleItem => {
    const moduleTitle = moduleItem.querySelector('[class*="moduleTitle"]');
    if (moduleTitle) {
      const title = moduleTitle.textContent;
      const sectionId = getSectionIdFromTitle(title);
      
      if (sectionId) {
        const link = document.createElement('a');
        link.href = `#${sectionId}`;
        link.className = moduleItem.className;
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
        link.style.display = 'block';
        link.style.cursor = 'pointer';
        
        link.innerHTML = moduleItem.innerHTML;
        moduleItem.parentNode.replaceChild(link, moduleItem);
      }
    }
  });

  // ✅ Convertir toutes les images (logos, icônes) en base64 pour l'export
  const allImages = clone.querySelectorAll('img');
  for (const img of allImages) {
    if (img.src && !img.src.startsWith('data:') && (img.src.includes('/assets/') || img.src.includes('assets/') || img.src.includes('icons/'))) {
      try {
        const base64 = await convertImageToBase64(img);
        if (base64) {
          img.src = base64;
        }
      } catch (error) {
        console.warn('Erreur lors de la conversion de l\'image:', img.src, error);
      }
    }
  }

  // ✅ Corriger les chemins des icônes des modules
  clone.querySelectorAll('[class*="moduleIcon"]').forEach(icon => {
    if (icon.src) {
      const currentSrc = icon.src;
      if (currentSrc.includes('/assets/')) {
        icon.src = currentSrc;
      } else if (currentSrc.includes('assets/')) {
        icon.src = '/' + currentSrc;
      }
      
      icon.style.display = 'block';
      icon.style.width = '32px';
      icon.style.height = '32px';
      icon.style.objectFit = 'contain';
    }
  });

  // ✅ Harmoniser les marges au-dessus des titres de sections (comme "VOS STOCKAGE")
  // Appliquer la même marge que storageTitleWrapper aux autres titres
  const internetTitleWrapper = clone.querySelector('[class*="internetTitleWrapper"]');
  if (internetTitleWrapper) {
    internetTitleWrapper.style.marginTop = 'calc(10rem - 5rem)'; // Même que storageTitleWrapper
  }

  const firewallTitleWrapper = clone.querySelector('[class*="firewallTitleWrapper"]');
  if (firewallTitleWrapper) {
    firewallTitleWrapper.style.marginTop = 'calc(10rem - 5rem)'; // Même que storageTitleWrapper
  }

  const serverTitleWrapper = clone.querySelector('[class*="serverTitleWrapper"]');
  if (serverTitleWrapper) {
    serverTitleWrapper.style.marginTop = 'calc(10rem - 5rem)'; // Même que storageTitleWrapper
  }

  // ✅ Convertir les graphiques Chart.js en images pour l'export
  const chartCanvases = clone.querySelectorAll('canvas');
  for (const canvas of chartCanvases) {
    try {
      // Vérifier que le canvas a du contenu
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some(pixel => pixel !== 0);
      
      if (hasContent) {
        // Convertir le canvas en image base64
        const dataURL = canvas.toDataURL('image/png');
        
        // Créer une image pour remplacer le canvas
        const img = document.createElement('img');
        img.src = dataURL;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxWidth = '400px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.alt = 'Graphique exporté';
        
        // Remplacer le canvas par l'image
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(img, canvas);
        }
      } else {
        // Canvas vide, remplacer par un message
        const fallback = document.createElement('div');
        fallback.textContent = '[Graphique en cours de chargement]';
        fallback.style.textAlign = 'center';
        fallback.style.padding = '20px';
        fallback.style.color = '#6b7280';
        fallback.style.fontStyle = 'italic';
        
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(fallback, canvas);
        }
      }
    } catch (error) {
      console.warn('Erreur lors de la conversion du graphique:', error);
      // En cas d'erreur, remplacer par un message
      const fallback = document.createElement('div');
      fallback.textContent = '[Graphique non disponible dans l\'export]';
      fallback.style.textAlign = 'center';
      fallback.style.padding = '20px';
      fallback.style.color = '#6b7280';
      fallback.style.fontStyle = 'italic';
      
      if (canvas.parentNode) {
        canvas.parentNode.replaceChild(fallback, canvas);
      }
    }
  }

  // ✅ Conversion des graphiques Recharts désactivée pour éviter de bloquer l'export
  // Les graphiques seront visibles en SVG dans l'export HTML

  // ✅ Récupérer tous les styles CSS
  let css = "";
  for (const sheet of document.styleSheets) {
    try {
      if (!sheet.cssRules) continue;
      for (const rule of sheet.cssRules) {
        css += rule.cssText + "\n";
      }
    } catch {
      // Ignorer les feuilles de style externes
    }
  }

  // ✅ Titre du document selon le type de rapport
  const clientName = config?.client?.name || 'CLIENT';
  const reportLabel = reportLabels[reportType] || 'MONITORING';
  const reportColor = reportColors[reportType] || '#000000';
  const documentTitle = `${clientName} - RAPPORT ${reportType === 'infrastructure' ? "D'" : reportType === 'cybersecurite' ? '' : 'DE '}${reportLabel}`;

  // ✅ Structure finale du HTML exporté avec styles forcés en mode light
  const html = `
  <!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${documentTitle}</title>
      <style>
        ${css}

        /* ===== STYLES FORCÉS POUR L'EXPORT EN MODE LIGHT ===== */
        
        /* Variables CSS forcées en mode light */
        :root {
          --bg-primary: #ffffff !important;
          --bg-secondary: #f9fafb !important;
          --bg-tertiary: #f3f4f6 !important;
          --text-primary: #000000 !important;
          --text-secondary: #000000 !important;
          --text-muted: #6b7280 !important;
          --border-primary: #e5e7eb !important;
          --border-secondary: #d1d5db !important;
          --shadow-color: rgba(0, 0, 0, 0.1) !important;
        }

        /* Reset global minimal */
        * {
          box-sizing: border-box !important;
        }

        body {
          background-color: #ffffff !important;
          color: #111827 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          line-height: 1.6 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }

        /* ===== SUPPRESSION DES STYLES DARK MODE ===== */
        
        /* Les classes dark ont été supprimées du DOM cloné, donc les styles dark ne s'appliqueront pas */
        /* Les styles du summary en mode light seront appliqués naturellement via les CSS modules inclus */

        /* ===== STYLES SPÉCIAUX POUR L'EXPORT ===== */
        
        /* Améliorer la lisibilité pour l'impression */
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          
          * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        /* Forcer l'affichage des graphiques */
        canvas, svg {
          max-width: 100% !important;
          height: auto !important;
        }
      </style>
    </head>
    <body>
      ${clone.outerHTML}
      
      <script>
        // Smooth scroll pour les ancres
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
          anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });
      </script>
    </body>
  </html>`;

  return html;
}

export async function exportMonitoringAsHTML(ref, config) {
  const content = ref.current;
  if (!content) return "";

  // ✅ Attendre que les graphiques Chart.js et Recharts soient rendus
  await new Promise(resolve => setTimeout(resolve, 300));

  // ✅ Ajouter des attributs data-report aux sections pour faciliter la navigation dans l'export
  const infrastructureSection = content.querySelector('[class*="internetPinned"]');
  if (infrastructureSection) {
    infrastructureSection.setAttribute('data-report-section', 'infrastructure');
  }
  const cybersecuriteSection = content.querySelector('[class*="cybersecuritePinned"]');
  if (cybersecuriteSection) {
    cybersecuriteSection.setAttribute('data-report-section', 'cybersecurite');
  }
  const servicesSection = content.querySelector('[class*="servicesPinned"]');
  if (servicesSection) {
    servicesSection.setAttribute('data-report-section', 'services');
  }

  // ✅ Cloner le contenu du résumé
  const clone = content.cloneNode(true);

  // ✅ Supprimer la classe dark du clone pour forcer le mode light
  clone.classList.remove('dark');
  clone.querySelectorAll('[class*="dark"]').forEach(el => {
    const classes = Array.from(el.classList);
    const darkClasses = classes.filter(c => c.includes('dark'));
    darkClasses.forEach(dc => el.classList.remove(dc));
  });

  // ✅ Supprimer les éléments non désirés dans l'export
  const elementsToRemove = clone.querySelectorAll(".export-exclude, .toolbar, [class*='toolbar']");
  elementsToRemove.forEach((el) => el.remove());

  // ✅ Supprimer les boutons de modules (non fonctionnels dans l'export)
  clone.querySelectorAll('[class*="moduleBtn"], [class*="moduleNav"], [class*="moduleButtonsRow"], [class*="moduleButtonsWrapper"], [class*="moduleNavCluster"]').forEach(button => {
    button.remove();
  });

  // ✅ Forcer l'ouverture de tous les volets de matériel
  clone.querySelectorAll('[class*="materialCard"]').forEach(card => {
    const content = card.querySelector('[class*="materialContent"]');
    if (content) {
      content.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important;';
    }
    
    // Supprimer les icônes de toggle et rendre les headers non-cliquables
    const toggleIcons = card.querySelectorAll('[class*="toggleIcon"]');
    toggleIcons.forEach(icon => icon.remove());
    
    const headers = card.querySelectorAll('[class*="materialHeader"]');
    headers.forEach(header => {
      header.style.cursor = 'default';
      header.onclick = null;
    });
  });

  // ✅ Convertir les modules cliquables en liens de navigation fonctionnels
  clone.querySelectorAll('[class*="clickableModule"]').forEach(moduleItem => {
    const moduleTitle = moduleItem.querySelector('[class*="moduleTitle"]');
    if (moduleTitle) {
      const title = moduleTitle.textContent;
      const sectionId = getSectionIdFromTitle(title);
      
      if (sectionId) {
        const link = document.createElement('a');
        link.href = `#${sectionId}`;
        link.className = moduleItem.className;
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
        link.style.display = 'block';
        link.style.cursor = 'pointer';
        
        link.innerHTML = moduleItem.innerHTML;
        moduleItem.parentNode.replaceChild(link, moduleItem);
      }
    }
  });

  // ✅ Convertir toutes les images (logos, icônes) en base64 pour l'export
  const allImages = clone.querySelectorAll('img');
  for (const img of allImages) {
    if (img.src && !img.src.startsWith('data:') && (img.src.includes('/assets/') || img.src.includes('assets/') || img.src.includes('icons/'))) {
      try {
        const base64 = await convertImageToBase64(img);
        if (base64) {
          img.src = base64;
        }
      } catch (error) {
        console.warn('Erreur lors de la conversion de l\'image:', img.src, error);
      }
    }
  }

  // ✅ Corriger les chemins des icônes des modules
  clone.querySelectorAll('[class*="moduleIcon"]').forEach(icon => {
    if (icon.src) {
      const currentSrc = icon.src;
      if (currentSrc.includes('/assets/')) {
        icon.src = currentSrc;
      } else if (currentSrc.includes('assets/')) {
        icon.src = '/' + currentSrc;
      }
      
      icon.style.display = 'block';
      icon.style.width = '32px';
      icon.style.height = '32px';
      icon.style.objectFit = 'contain';
    }
  });

  // ✅ Harmoniser les marges au-dessus des titres de sections (comme "VOS STOCKAGE")
  // Appliquer la même marge que storageTitleWrapper aux autres titres
  const internetTitleWrapper = clone.querySelector('[class*="internetTitleWrapper"]');
  if (internetTitleWrapper) {
    internetTitleWrapper.style.marginTop = 'calc(10rem - 5rem)'; // Même que storageTitleWrapper
  }

  const firewallTitleWrapper = clone.querySelector('[class*="firewallTitleWrapper"]');
  if (firewallTitleWrapper) {
    firewallTitleWrapper.style.marginTop = 'calc(10rem - 5rem)'; // Même que storageTitleWrapper
  }

  const serverTitleWrapper = clone.querySelector('[class*="serverTitleWrapper"]');
  if (serverTitleWrapper) {
    serverTitleWrapper.style.marginTop = 'calc(10rem - 5rem)'; // Même que storageTitleWrapper
  }

  // ✅ Convertir les graphiques Chart.js en images pour l'export
  const chartCanvases = clone.querySelectorAll('canvas');
  for (const canvas of chartCanvases) {
    try {
      // Vérifier que le canvas a du contenu
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some(pixel => pixel !== 0);
      
      if (hasContent) {
        // Convertir le canvas en image base64
        const dataURL = canvas.toDataURL('image/png');
        
        // Créer une image pour remplacer le canvas
        const img = document.createElement('img');
        img.src = dataURL;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxWidth = '400px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.alt = 'Graphique exporté';
        
        // Remplacer le canvas par l'image
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(img, canvas);
        }
      } else {
        // Canvas vide, remplacer par un message
        const fallback = document.createElement('div');
        fallback.textContent = '[Graphique en cours de chargement]';
        fallback.style.textAlign = 'center';
        fallback.style.padding = '20px';
        fallback.style.color = '#6b7280';
        fallback.style.fontStyle = 'italic';
        
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(fallback, canvas);
        }
      }
    } catch (error) {
      console.warn('Erreur lors de la conversion du graphique:', error);
      // En cas d'erreur, remplacer par un message
      const fallback = document.createElement('div');
      fallback.textContent = '[Graphique non disponible dans l\'export]';
      fallback.style.textAlign = 'center';
      fallback.style.padding = '20px';
      fallback.style.color = '#6b7280';
      fallback.style.fontStyle = 'italic';
      
      if (canvas.parentNode) {
        canvas.parentNode.replaceChild(fallback, canvas);
      }
    }
  }

  // ✅ Conversion des graphiques Recharts désactivée pour éviter de bloquer l'export
  // Les graphiques seront visibles en SVG dans l'export HTML

  // ✅ Récupérer tous les styles CSS
  let css = "";
  for (const sheet of document.styleSheets) {
    try {
      if (!sheet.cssRules) continue;
      for (const rule of sheet.cssRules) {
        css += rule.cssText + "\n";
      }
    } catch {
      // Ignorer les feuilles de style externes
    }
  }

  // ✅ Titre du document
  const documentTitle = `${config?.client?.name || 'CLIENT'} - Monitoring ${config?.client?.reportPeriod || 'XXXX'}`;

  // ✅ Structure finale du HTML exporté avec styles forcés en mode light
  const html = `
  <!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${documentTitle}</title>
      <style>
        ${css}

        /* ===== STYLES FORCÉS POUR L'EXPORT EN MODE LIGHT ===== */
        
        /* Variables CSS forcées en mode light */
        :root {
          --bg-primary: #ffffff !important;
          --bg-secondary: #f9fafb !important;
          --bg-tertiary: #f3f4f6 !important;
          --text-primary: #000000 !important;
          --text-secondary: #000000 !important;
          --text-muted: #6b7280 !important;
          --border-primary: #e5e7eb !important;
          --border-secondary: #d1d5db !important;
          --shadow-color: rgba(0, 0, 0, 0.1) !important;
        }

        /* Reset global minimal */
        * {
          box-sizing: border-box !important;
        }

        body {
          background-color: #ffffff !important;
          color: #111827 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          line-height: 1.6 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }

        /* ===== SUPPRESSION DES STYLES DARK MODE ===== */
        
        /* Les classes dark ont été supprimées du DOM cloné, donc les styles dark ne s'appliqueront pas */
        /* Les styles du summary en mode light seront appliqués naturellement via les CSS modules inclus */

        /* ===== STYLES SPÉCIAUX POUR L'EXPORT ===== */
        
        /* Améliorer la lisibilité pour l'impression */
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          
          * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        /* Forcer l'affichage des graphiques */
        canvas, svg {
          max-width: 100% !important;
          height: auto !important;
        }
      </style>
    </head>
    <body>
      ${clone.outerHTML}
    </body>
  </html>`;

  return html;
}

// Fonction pour générer le blob ZIP
export async function generateZIPBlob(ref, config, reportAvailability = {}) {
  try {
    if (!ref || !ref.current) {
      throw new Error('Référence du résumé non disponible');
    }
    if (!config) {
      throw new Error('Configuration non disponible');
    }

    const zip = new JSZip();

    // Définir les rapports à générer en fonction de la disponibilité du contenu
    const reports = [
      { 
        type: 'infrastructure', 
        label: 'INFRASTRUCTURE',
        hasContent: reportAvailability.hasInfraContent !== false // true par défaut si non spécifié
      },
      { 
        type: 'cybersecurite', 
        label: 'CYBERSÉCURITÉ',
        hasContent: reportAvailability.hasCyberContent !== false
      },
      { 
        type: 'services', 
        label: 'SERVICES',
        hasContent: reportAvailability.hasServicesContent !== false
      }
    ];

    // Générer chaque rapport HTML uniquement s'il a du contenu
    for (const report of reports) {
      // Sauter le rapport si pas de contenu disponible
      if (!report.hasContent) {
        continue;
      }

      try {
        const html = await generateReportHTML(ref, config, report.type);
        if (!html || html.trim() === '') {
          continue;
        }
        const clientName = (config?.client?.name || 'CLIENT').toUpperCase().replace(/\s+/g, '');
        const fileName = `${clientName} - RAPPORT ${report.type === 'infrastructure' ? "D'" : report.type === 'cybersecurite' ? '' : 'DE '}${report.label}.html`;
        zip.file(fileName, html);
      } catch (error) {
        // Continuer avec les autres rapports même si un échoue
      }
    }

    // Vérifier qu'au moins un fichier a été ajouté
    if (Object.keys(zip.files).length === 0) {
      throw new Error('Aucun rapport n\'a pu être généré');
    }

    // Générer le blob du ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });
    return zipBlob;
  } catch (error) {
    console.error('❌ Erreur lors de la génération du ZIP:', error);
    throw error;
  }
}

// Fonction principale pour exporter les rapports en ZIP (avec téléchargement)
export async function exportMonitoringAsZIP(ref, config, reportAvailability = {}) {
  try {
    const zipBlob = await generateZIPBlob(ref, config, reportAvailability);

    // Nommer le dossier ZIP avec les dates
    const formatDate = (dateStr) => {
      try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      } catch {
        return dateStr;
      }
    };

    let zipFileName = 'RAPPORTS MONITORING';

    // Priorité 1 : Utiliser checkmkPeriod si disponible
    if (config?.client?.checkmkPeriod?.start_time && config?.client?.checkmkPeriod?.end_time) {
      zipFileName = `DU ${formatDate(config.client.checkmkPeriod.start_time)} AU ${formatDate(config.client.checkmkPeriod.end_time)}`;
    } else {
      // Priorité 2 : Extraire les dates du reportPeriod
      const reportPeriod = config?.client?.reportPeriod || '';
      if (reportPeriod) {
        // Format attendu : "DU XX-XX-XX AU XX-XX-XX" ou similaire
        const dateMatch = reportPeriod.match(/DU\s+(\d{2}-\d{2}-\d{2,4})\s+AU\s+(\d{2}-\d{2}-\d{2,4})/i);
        if (dateMatch) {
          zipFileName = `DU ${dateMatch[1]} AU ${dateMatch[2]}`;
        } else {
          // Essayer d'autres formats de dates
          const datePattern = /(\d{2}-\d{2}-\d{2,4})/g;
          const dates = reportPeriod.match(datePattern);
          if (dates && dates.length >= 2) {
            zipFileName = `DU ${dates[0]} AU ${dates[1]}`;
          } else {
            // Fallback : utiliser le reportPeriod tel quel après nettoyage
            zipFileName = reportPeriod.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
            if (!zipFileName) {
              zipFileName = 'RAPPORTS MONITORING';
            }
          }
        }
      }
    }

    // Télécharger le ZIP
    console.log('💾 Téléchargement du ZIP:', `${zipFileName}.zip`);
    saveAs(zipBlob, `${zipFileName}.zip`);
    console.log('✅ Téléchargement déclenché');
  } catch (error) {
    console.error('❌ Erreur lors de l\'export ZIP:', error);
    throw error;
  }
}

