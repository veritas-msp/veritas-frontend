import fs from "fs";
import path from "path";

const root = "src/components/AdminPage";
const accent = /[àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/;

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

/** Extract top-level locale object body with string-aware brace counting */
function extractLocale(src, locale) {
  const re = new RegExp(`(?:^|[,\\n])\\s*["']${locale}["']\\s*:\\s*\\{|\\b${locale}\\s*:\\s*\\{`);
  let searchFrom = 0;
  while (searchFrom < src.length) {
    re.lastIndex = 0;
    const slice = src.slice(searchFrom);
    const m = re.exec(slice);
    if (!m) return null;
    const abs = searchFrom + m.index + m[0].lastIndexOf("{");
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
        if (depth === 0) return { start: abs, end: i + 1, text: src.slice(abs, i + 1) };
      }
    }
    searchFrom = abs + 1;
  }
  return null;
}

function frenchyLines(text, label) {
  const lines = text.split(/\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!accent.test(line)) continue;
    // skip pure German/Spanish/Italian markers? still report
    out.push({ label, line: i + 1, text: line.trim().slice(0, 160) });
  }
  return out;
}

const files = walk(root);

console.log("=== en locale blocks still containing French accents ===");
for (const f of files.filter((x) => /I18n/i.test(path.basename(x)))) {
  const t = fs.readFileSync(f, "utf8");
  const en = extractLocale(t, "en");
  if (!en) {
    console.log("NO EN:", f);
    continue;
  }
  const hits = frenchyLines(en.text, "en").filter((h) => {
    // English may legitimately have rare accents; filter obvious French words
    return /\b(le|la|les|des|une|pour|avec|dans|être|êtes|vous|nous|cette|ce |cet |aucun|supprim|enregistr|annul|paramètre|règle|libellé|désactiv|à |é|è|ê|ç)/i.test(
      h.text
    );
  });
  if (hits.length) {
    console.log("\n", f, "hits", hits.length);
    hits.slice(0, 15).forEach((h) => console.log("  ", h.line, h.text));
  }
}

console.log("\n=== Non-I18n files: accented lines (excl. console) ===");
for (const f of files.filter((x) => !/I18n/i.test(path.basename(x)))) {
  const t = fs.readFileSync(f, "utf8");
  const lines = t.split(/\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/console\.(log|warn|error|info|debug)/.test(line)) continue;
    if (!accent.test(line)) continue;
    // keep API key lines noted
    hits.push(`${i + 1}: ${line.trim().slice(0, 160)}`);
  }
  if (hits.length) {
    console.log("\n", f, hits.length);
    hits.forEach((h) => console.log("  ", h));
  }
}

// Also find French without accents in non-i18n UI strings
const frWords =
  /\b(Aucun|Aucune|Erreur lors|Succès|Chargement|Enregistrer|Supprimer|Annuler|Veuillez|Impossible de|Paramètres|Créer un|Échec|Fermer|Retour|Valider|Rechercher|Ajouter un|Modifier le|Aucun résultat|Non disponible|Bientôt|Actif|Inactif|Oui|Non)\b/;
console.log("\n=== Non-I18n French keyword hits ===");
for (const f of files.filter((x) => !/I18n/i.test(path.basename(x)))) {
  const t = fs.readFileSync(f, "utf8");
  const lines = t.split(/\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/console\./.test(line)) continue;
    if (frWords.test(line)) hits.push(`${i + 1}: ${line.trim().slice(0, 160)}`);
  }
  if (hits.length) {
    console.log("\n", f, hits.length);
    hits.slice(0, 20).forEach((h) => console.log("  ", h));
  }
}
