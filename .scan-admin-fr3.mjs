import fs from "fs";
import path from "path";

const root = "src/components/AdminPage";
const accent = /[àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/;
const words =
  /\b(Impossible de|l'image|Enregistrer|Supprimer|Annuler|Chargement|Veuillez|Aucun|Aucune|Paramètres|Créer un|Modifier le|Ajouter un|Fermer|Réinitialiser|Confirmer|Erreur lors|Succès|règle|collecteur|libellé|désactiv|Bientôt|sélectionn|prestations|Boîte|Événement|enregistrer|supprim|Actif|Inactif|Retour|Valider)\b/;

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name) && !/I18n/i.test(e.name)) acc.push(p);
  }
  return acc;
}

function keep(line) {
  return (
    /COLLECTOR_VERIFICATION|Vérification effectuée|inspecté|entreprise\.(id|nom|siret)|key:\s*["']entreprise|COMMUNITY_ACCESS|sales-forms.: .prestations|Non-fixed|console\./.test(
      line
    ) ||
    (/Configuration/.test(line) && !accent.test(line) && !/\b(Actif|Inactif|Impossible)\b/.test(line))
  );
}

for (const f of walk(root)) {
  const lines = fs.readFileSync(f, "utf8").split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (keep(line)) continue;
    if (words.test(line) || accent.test(line)) {
      console.log(`${f}:${i + 1}: ${line.trim().slice(0, 160)}`);
    }
  }
}
