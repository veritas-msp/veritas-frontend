import fs from "fs";
import path from "path";

const root = "src/components/AdminPage";
const accent = /[àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/;
const frPhrase =
  /\b(Aucun|Aucune|Impossible de|Enregistrer|Supprimer|Annuler|Chargement|Veuillez|Paramètres|Renseigne|Indiquez|Clique d|Largeur|destinataire|annonce|Relance|Inactif\b|Valeur attend|Type d'|Noms de|Certificats SSL|Borne WiFi|domaine\.com|URL API|Webhook requis|Tu peux|Utilise |Mettre |Le token|ce collecteur|cette règle|sans nom|Bientôt|Réinitialiser|Confirmer|Erreur lors|Succès|ACTIF|CIBLE|CANAL|CHAMPS|CIBLES|AVANT \(J\)|ELEMENT)\b/;

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name) && !/I18n/i.test(e.name)) acc.push(p);
  }
  return acc;
}

function isKeep(line) {
  return (
    /console\.|COLLECTOR_VERIFICATION|Vérification effectuée|inspecté|statut:\s*["']actif["']|entreprise\.(id|nom|siret)|key:\s*["']entreprise|COMMUNITY_ACCESS|sales-forms.: .prestations|Non-fixed|\{\{|modulesMonitoring\.|optionsContrat\.|equipements|BorneWifi|checkmkMappings|cleanBorneData|\bborne\b|\bbornes\b|controleur|emplacement|portailCaptif/.test(
      line
    )
  );
}

let hits = 0;
for (const f of walk(root)) {
  const lines = fs.readFileSync(f, "utf8").split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isKeep(line)) continue;
    // accented chars in string literals only roughly
    const hasAccent = accent.test(line);
    const hasFr = frPhrase.test(line);
    if (!hasAccent && !hasFr) continue;
    // skip German/Italian leftover false positives unlikely in non-i18n
    console.log(`${f}:${i + 1}: ${line.trim().slice(0, 160)}`);
    hits++;
  }
}
console.log("TOTAL_UI_FR_HITS", hits);
