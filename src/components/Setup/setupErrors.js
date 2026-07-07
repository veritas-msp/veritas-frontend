/** Maps legacy backend error text (FR/EN) to stable setup error codes. */
const LEGACY_MESSAGE_TO_CODE = {
  "Impossible de lire l'état d'installation.": "SETUP_STATUS_READ_FAILED",
  "Impossible d'écrire le fichier .env.": "SETUP_ENV_WRITE_FAILED",
  "Connexion à la base de données impossible.": "SETUP_DB_CONNECTION_FAILED",
  "Impossible de lire les migrations.": "SETUP_MIGRATIONS_LIST_FAILED",
  "Échec des migrations.": "SETUP_MIGRATION_FAILED",
  "Un administrateur existe déjà.": "SETUP_ADMIN_ALREADY_EXISTS",
  "Impossible de créer le compte administrateur.": "SETUP_ADMIN_CREATE_FAILED",
  "L'assistant d'installation est déjà terminé.": "SETUP_ALREADY_COMPLETE",
  "Erreur réseau": "NETWORK_ERROR",
  "Network error": "NETWORK_ERROR",
};

export function resolveSetupError(err, t) {
  const errors = t?.errors || {};
  const code =
    err?.code ||
    (err?.message ? LEGACY_MESSAGE_TO_CODE[err.message] : null) ||
    null;

  if (code && errors[code]) {
    if (
      code === "SETUP_MIGRATION_FAILED" &&
      err?.message &&
      err.message !== "Database preparation failed." &&
      err.message !== errors[code]
    ) {
      return err.message;
    }
    return errors[code];
  }

  if (errors.generic) {
    return errors.generic;
  }

  return err?.message || "Error";
}
