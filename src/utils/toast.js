import { toast } from "react-toastify";
const defaultConfig = {
  position: "bottom-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnFocusLoss: false,
  pauseOnHover: false,
  theme: "light"
};
const translate = msg => {
  const map = {
    "Utilisateur introuvable": "User not found",
    "Mot de passe incorrect": "Incorrect password",
    "Invalid password": "Incorrect password"
  };
  return map[msg] || msg;
};
export const showSuccess = msg => toast.success(translate(msg), defaultConfig);
export const showError = msg => toast.error(translate(msg), defaultConfig);
export const showInfo = msg => toast.info(translate(msg), defaultConfig);
export const showWarning = msg => toast.warn(translate(msg), defaultConfig);
