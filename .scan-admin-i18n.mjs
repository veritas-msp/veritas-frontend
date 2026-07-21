import fs from "fs";
import path from "path";

const root = "src/components/AdminPage";
const accent = /[àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/;
const frHints =
  /\b(Aucun|Aucune|Erreur|Succès|Chargement|Enregistrer|Supprimer|Annuler|Modifier|Ajouter|Rechercher|Veuillez|Impossible|Paramètres|Configuration|Créer|Échec|Boîtes|Règles|Alertes|Formulaires|Carnets|Événements|Connexions|Planifications|Créditez|Connecteurs|prestations|installations|entreprise|collecteur|règle|libellé|désactivé|activé|sauvegard|confirmer|attention)\b/i;

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function extractLocaleBlock(src, locale) {
  const re = new RegExp(`["']?${locale}["']?\\s*:\\s*\\{`);
  const m = re.exec(src);
  if (!m) return null;
  let i = m.index + m[0].length - 1;
  let depth = 0;
  const start = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{" ) depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

function countFrenchy(text) {
  if (!text) return { accent: 0, hints: 0, samples: [] };
  const lines = text.split(/\n/);
  let accentN = 0;
  let hintsN = 0;
  const samples = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const a = accent.test(line);
    const h = frHints.test(line);
    if (a || h) {
      if (a) accentN++;
      if (h) hintsN++;
      if (samples.length < 5) samples.push(`${i + 1}: ${line.trim().slice(0, 140)}`);
    }
  }
  return { accent: accentN, hints: hintsN, samples };
}

const files = walk(root);
const i18n = files.filter((f) => /I18n/i.test(path.basename(f)));
console.log("=== I18n en-block Frenchy check ===");
for (const f of i18n) {
  const t = fs.readFileSync(f, "utf8");
  const en = extractLocaleBlock(t, "en");
  const fr = extractLocaleBlock(t, "fr");
  const enStats = countFrenchy(en || "");
  // French outside fr/en/de/it/es/pt/nl blocks
  let rest = t;
  for (const loc of ["fr", "en", "de", "it", "es", "pt", "nl"]) {
    const block = extractLocaleBlock(t, loc);
    if (block) {
      // remove first occurrence of locale key + block
      const re = new RegExp(`["']?${loc}["']?\\s*:\\s*` + block.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      rest = rest.replace(re, "");
    }
  }
  const restStats = countFrenchy(rest);
  if (enStats.accent || enStats.hints || restStats.accent || restStats.hints) {
    console.log("\n" + f);
    console.log("  en accent/hints:", enStats.accent, enStats.hints);
    if (enStats.samples.length) console.log("  en samples:\n   ", enStats.samples.join("\n    "));
    console.log("  outside locales accent/hints:", restStats.accent, restStats.hints);
    if (restStats.samples.length) console.log("  outside samples:\n   ", restStats.samples.join("\n    "));
  } else {
    console.log("OK", path.basename(f), "en clean, outside clean; fr block present:", !!fr);
  }
}

console.log("\n=== Non-I18n remaining accents ===");
const nonI18n = files.filter((f) => !/I18n/i.test(path.basename(f)));
const hits = [];
for (const f of nonI18n) {
  const t = fs.readFileSync(f, "utf8");
  const lines = t.split(/\n/);
  let n = 0;
  const samples = [];
  for (let i = 0; i < lines.length; i++) {
    // skip console.* lines
    if (/console\.(log|warn|error|info|debug)/.test(lines[i])) continue;
    if (accent.test(lines[i]) || frHints.test(lines[i])) {
      n++;
      if (samples.length < 3) samples.push(`${i + 1}: ${lines[i].trim().slice(0, 140)}`);
    }
  }
  if (n) hits.push({ f, n, samples });
}
hits.sort((a, b) => b.n - a.n);
console.log("files:", hits.length, "lines:", hits.reduce((s, h) => s + h.n, 0));
for (const h of hits) {
  console.log(String(h.n).padStart(4), h.f);
  for (const s of h.samples) console.log("     ", s);
}
