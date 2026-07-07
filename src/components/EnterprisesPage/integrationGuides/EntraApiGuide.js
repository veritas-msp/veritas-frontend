import { Icon } from "@iconify/react";
import formStyles from "../EnterpriseFormModal.module.css";
import styles from "../../AdminPage/BitdefenderIntegrationModal.module.css";
import msStyles from "../MicrosoftTenantConfigModal.module.css";
import { GRAPH_API_PERMISSIONS } from "../microsoftTenantFormConfig";

const ENTRA_PORTAL_URL = "https://entra.microsoft.com";
const APP_REGISTRATIONS_URL =
  "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade";

export default function EntraApiGuide() {
  return (
    <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Créer une application sur Entra ID</h3>
        <p className={formStyles.sectionDesc}>
          Enregistrez une application avec authentification par secret client, accordez les
          permissions Microsoft Graph en mode application, puis copiez les identifiants dans
          Veritas pour ce client.
        </p>
      </div>

      <ol className={styles.guideSteps}>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            1
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Ouvrez le centre d&apos;administration Entra</p>
            <p className={styles.guideStepDesc}>
              Connectez-vous sur{" "}
              <a
                href={ENTRA_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.guideExternalLink}
              >
                entra.microsoft.com
                <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
              </a>{" "}
              avec un compte disposant du rôle <strong>Administrateur d&apos;applications cloud</strong>{" "}
              ou <strong>Administrateur global</strong> sur le tenant du client.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            2
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Enregistrez une nouvelle application</p>
            <p className={styles.guideStepDesc}>
              Allez dans <strong>Identité</strong> → <strong>Applications</strong> →{" "}
              <strong>Inscriptions d&apos;applications</strong> → <strong>Nouvelle inscription</strong>.
              Donnez un nom explicite (ex. « Veritas · Nom du client »), laissez le type de comptes
              sur « Comptes dans cet annuaire uniquement », sans URI de redirection.
            </p>
            <p className={styles.guideStepDesc}>
              Raccourci direct :{" "}
              <a
                href={APP_REGISTRATIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.guideExternalLink}
              >
                Inscriptions d&apos;applications Azure
                <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
              </a>
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            3
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Copiez Tenant ID et Client ID</p>
            <p className={styles.guideStepDesc}>
              Sur la page <strong>Vue d&apos;ensemble</strong> de l&apos;application, copiez
              l&apos;<strong>ID d&apos;annuaire (tenant)</strong> et l&apos;
              <strong>ID d&apos;application (client)</strong>. Collez-les dans Veritas (Tenant ID
              et Client ID).
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            4
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Créez un secret client</p>
            <p className={styles.guideStepDesc}>
              Menu <strong>Certificats et secrets</strong> → <strong>Nouveau secret client</strong>.
              Choisissez une durée (12 ou 24 mois recommandé), copiez immédiatement la{" "}
              <strong>valeur du secret</strong> · elle ne sera plus affichée ensuite · puis
              collez-la dans Veritas. Notez l&apos;identifiant du secret (Key ID) si vous le
              souhaitez pour le suivi d&apos;expiration.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            5
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Accordez les permissions Microsoft Graph</p>
            <p className={styles.guideStepDesc}>
              Menu <strong>Autorisations API</strong> → <strong>Ajouter une autorisation</strong> →{" "}
              <strong>Microsoft Graph</strong> → <strong>Autorisations d&apos;application</strong>.
              Ajoutez les permissions ci-dessous, puis cliquez sur{" "}
              <strong>Accorder le consentement administrateur</strong> pour le tenant.
            </p>
            <ul className={msStyles.permissionsList}>
              {GRAPH_API_PERMISSIONS.map((perm) => (
                <li key={perm}>
                  <code className={styles.guideCode}>{perm}</code>
                </li>
              ))}
            </ul>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            6
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Testez et enregistrez dans Veritas</p>
            <p className={styles.guideStepDesc}>
              Revenez dans Veritas, renseignez Tenant ID, Client ID et Client Secret, cliquez sur{" "}
              <strong>Tester la connexion</strong> puis <strong>Enregistrer</strong>. Les
              statistiques Microsoft 365 seront disponibles dans un nouvel onglet après
              synchronisation.
            </p>
          </div>
        </li>
      </ol>
    </>
  );
}
