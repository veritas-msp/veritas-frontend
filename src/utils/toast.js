import { toast } from "react-toastify";

// 🟪 Couleur et position centralisées
const defaultConfig = {
  position: "bottom-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnFocusLoss: false,
  pauseOnHover: false,
  theme: "light",
};

// ✅ Fonction de traduction interne
const translate = (msg) => {
  const map = {
    "User not found": "Utilisateur introuvable",
    "Invalid password": "Mot de passe incorrect",
  };
  return map[msg] || msg;
};

// ✅ Fonctions exportées
export const showSuccess = (msg) => toast.success(translate(msg), defaultConfig);
export const showError = (msg) => toast.error(translate(msg), defaultConfig);
export const showInfo = (msg) => toast.info(translate(msg), defaultConfig);
export const showWarning = (msg) => toast.warn(translate(msg), defaultConfig);
