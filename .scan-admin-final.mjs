import fs from "fs";
import path from "path";

const root = "src/components/AdminPage";
const accent = /[àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/;
const frUi =
  /\b(Aucun|Aucune|Impossible|Enregistrer|Supprimer|Annuler|Chargement|Veuillez|Paramètres|Créer|Modifier|Ajouter|Fermer|Réinitialiser|Confirmer|Erreur lors|Succès|règle|collecteur|libellé|désactiv|Bientôt|sélectionn|prestations|Boîte|Événement|Renseigne|Indiquez|Clique|Largeur|invalide|requis|requise|destinataire|annonce|Relance|Valide|enregistrer|Actif|Inactif|Retour|Valeur|attend|Type d'|Noms de|Certificats|Borne|domaine\.com|Module monitoring (Serveurs|Stockage|Borne)|URL API)\b/i;

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function extractLocale(src, locale) {
  const re = new RegExp(`(?:^|[,\\n])\\s*["']?${locale}["']?\\s*:\\s*\\{`);
  const m = re.exec(src);
  if (!m) return null;
  const abs = m.index + m[0].lastIndexOf("{");
  let i = abs;
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(abs, i + 1);
    }
  }
  return null;
}

const keepLine = (line, isI18n) =>
  /console\.|COLLECTOR_VERIFICATION|Vérification effectuée|inspecté|entreprise\.(id|nom|siret)|key:\s*["']entreprise|COMMUNITY_ACCESS|sales-forms.: .prestations|Non-fixed|\{\{entreprise|\{\{now\.|modulesMonitoring\.(Serveurs|Stockage|BorneWifi|Sauvegarde|NDD)/.test(
    line
  ) ||
  (isI18n && false);

console.log("=== Non-I18n remaining ===");
let nonCount = 0;
for (const f of walk(root).filter((x) => !/I18n/i.test(path.basename(x)))) {
  const lines = fs.readFileSync(f, "utf8").split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (keepLine(line, false)) continue;
    if (accent.test(line) || frUi.test(line)) {
      console.log(`${f}:${i + 1}: ${line.trim().slice(0, 160)}`);
      nonCount++;
    }
  }
}
console.log("non-i18n hits:", nonCount);

console.log("\n=== I18n en blocks with French accents ===");
let enFr = 0;
for (const f of walk(root).filter((x) => /I18n/i.test(path.basename(x)))) {
  const t = fs.readFileSync(f, "utf8");
  const en = extractLocale(t, "en");
  if (!en) {
    console.log("NO EN BLOCK:", f);
    continue;
  }
  const lines = en.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    if (accent.test(lines[i]) && /\b(le|la|les|des|une|pour|avec|vous|nous|cette|aucun|supprim|enregistr|paramètre|règle|à |é)/i.test(lines[i])) {
      console.log(`${f} en~${i + 1}: ${lines[i].trim().slice(0, 140)}`);
      enFr++;
    }
  }
}
console.log("en French hits:", enFr);

// Count modified files via git
console.log("\n=== git modified under AdminPage ===");
