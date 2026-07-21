import fs from "fs";
import path from "path";

const root = "src/components/AdminPage";
const accent = /[àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/;

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/I18n/i.test(e.name) && /\.js$/.test(e.name)) acc.push(p);
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
      if (depth === 0) return { start: abs, end: i + 1, text: src.slice(abs, i + 1) };
    }
  }
  return null;
}

for (const f of walk(root)) {
  let t = fs.readFileSync(f, "utf8");
  const locales = ["fr", "en", "de", "it", "es", "pt", "nl"];
  const ranges = [];
  for (const loc of locales) {
    const block = extractLocale(t, loc);
    if (block) ranges.push(block);
  }
  // mask locale blocks
  let masked = t;
  for (const r of ranges.sort((a, b) => b.start - a.start)) {
    masked = masked.slice(0, r.start) + " ".repeat(r.end - r.start) + masked.slice(r.end);
  }
  const lines = masked.split(/\n/);
  const orig = t.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    if (accent.test(lines[i]) || /\b(Aucun|Enregistrer|Supprimer|Annuler|Chargement|Veuillez|Paramètres|Impossible)\b/.test(lines[i])) {
      console.log(`${f}:${i + 1}: ${orig[i].trim().slice(0, 140)}`);
    }
  }
  const en = ranges.find((_, idx) => locales[idx] === "en") || extractLocale(t, "en");
  // already extracted
}
console.log("done checking outside-locale French in I18n");
