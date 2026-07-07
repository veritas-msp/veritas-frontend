import { Icon } from "@iconify/react";
import formStyles from "../EnterpriseFormModal.module.css";
import styles from "../../AdminPage/BitdefenderIntegrationModal.module.css";

const DEFAULT_API_URL = "https://cloudgz.gravityzone.bitdefender.com/api";
const GRAVITYZONE_ACCOUNT_URL = "https://cloudgz.gravityzone.bitdefender.com/#!/my-account";

export default function BitdefenderApiGuide({ dedicated = false }) {
  return (
    <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Obtenir vos identifiants API</h3>
        <p className={formStyles.sectionDesc}>
          {dedicated
            ? "Suivez ces étapes dans le Control Center GravityZone du client pour créer une clé API et récupérer l'URL à renseigner dans le tenant dédié Veritas."
            : "Suivez ces étapes dans le Control Center GravityZone pour créer une clé API et récupérer l'URL d'accès à renseigner dans Veritas."}
        </p>
      </div>

      <ol className={styles.guideSteps}>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>1</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Connectez-vous à GravityZone</p>
            <p className={styles.guideStepDesc}>
              Ouvrez le portail{" "}
              <a
                href={GRAVITYZONE_ACCOUNT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.guideExternalLink}
              >
                cloudgz.gravityzone.bitdefender.com
                <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
              </a>{" "}
              avec un compte disposant des droits d&apos;administration sur le tenant.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>2</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Accédez à la section API</p>
            <p className={styles.guideStepDesc}>
              Menu utilisateur (en haut à droite) → <strong>Mon compte</strong> → section{" "}
              <strong>API</strong> du Control Center.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>3</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Créez une clé API</p>
            <p className={styles.guideStepDesc}>
              Cliquez sur <strong>Ajouter</strong> pour générer une nouvelle clé. Activez les
              droits nécessaires (entreprises, comptes, licences, réseau) puis copiez la clé
              affichée · elle ne sera plus visible ensuite.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>4</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Récupérez l&apos;URL d&apos;accès</p>
            <p className={styles.guideStepDesc}>
              Sur la même page, copiez l&apos;<strong>URL d&apos;accès API</strong> (souvent{" "}
              <code className={styles.guideCode}>{DEFAULT_API_URL}</code>) et collez-la dans le
              champ URL API Veritas, avec la clé obtenue à l&apos;étape précédente.
            </p>
          </div>
        </li>
      </ol>
    </>
  );
}
