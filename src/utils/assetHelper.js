// Helper pour gérer les chemins des assets en production et développement
export const getAssetPath = (path) => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  // Chemin absolu depuis la racine du site (évite /enterprises/.../assets/... sur routes imbriquées)
  if (!publicUrl || publicUrl === '.') {
    return `/${cleanPath}`;
  }
  const prefix = publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`;
  return `${prefix}/${cleanPath}`;
};

// Raccourcis pour les différents types d'assets
export const getAvatarPath = (filename) => getAssetPath(`assets/avatars/${filename}`);
export const getIconPath = (filename) => getAssetPath(`assets/icons/${filename}`);
export const getLogoPath = (filename) => getAssetPath(`assets/logo/${filename}`);
