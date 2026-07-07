import { Icon } from "@iconify/react";
import formStyles from "../EnterpriseFormModal.module.css";
import styles from "../../AdminPage/BitdefenderIntegrationModal.module.css";

const DEFAULT_API_URL = "https://api.mailinblack.com";
const PARTNER_PORTAL_URL = "https://partner.mailinblack.com";

export default function MailinblackApiGuide({ dedicated = false }) {
  return (
    <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Obtenir votre clé API</h3>
        <p className={formStyles.sectionDesc}>
          {dedicated
            ? "Générez une clé API depuis le Control Center du client, puis collez-la dans Veritas · c'est tout."
            : "Générez une clé API depuis le portail partenaire, puis collez-la dans Veritas · c'est tout."}
        </p>
      </div>

      <ol className={styles.guideSteps}>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>1</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Connectez-vous au portail</p>
            <p className={styles.guideStepDesc}>
              Ouvrez{" "}
              <a
                href={PARTNER_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.guideExternalLink}
              >
                partner.mailinblack.com
                <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
              </a>{" "}
              {dedicated
                ? "ou le Control Center du client concerné."
                : "avec votre compte revendeur MSP."}
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>2</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Générez une clé API</p>
            <p className={styles.guideStepDesc}>
              Parcourez le menu : <strong>Espace manager</strong> → <strong>Intégration</strong> →{" "}
              <strong>Clés API</strong> → <strong>Générer une clé API</strong>. Choisissez le mode{" "}
              <strong>lecture seule</strong> et activez les produits <strong>Management</strong> et{" "}
              <strong>Protect</strong>, puis copiez la clé générée.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>3</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Collez la clé dans Veritas</p>
            <p className={styles.guideStepDesc}>
              URL API : racine de l&apos;instance (ex.{" "}
              <code className={styles.guideCode}>https://app.mailinblack.com/mibc-fr-06</code> ou{" "}
              <code className={styles.guideCode}>{DEFAULT_API_URL}</code>). Collez la{" "}
              <strong>clé API</strong>, testez puis enregistrez · Veritas s&apos;occupe du reste
              (token de session, client ID, synchronisation).
            </p>
          </div>
        </li>
      </ol>
    </>
  );
}
