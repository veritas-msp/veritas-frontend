import fs from "fs";
import path from "path";

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.js$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const root = "src/components/AdminPage";
for (const f of walk(root)) {
  const lines = fs.readFileSync(f, "utf8").split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    // Invalid JS: identifier with space after const/let/var
    if (/\b(const|let|var)\s+[a-zA-Z]+\s+[a-zA-Z]+/.test(L) && !/\/\//.test(L) && !/[,;=]/.test(L.split(/\b(const|let|var)\s+/)[2] || "")) {
      // more precise: const foo bar =
      if (/\b(const|let|var)\s+[A-Za-z_$][\w$]*\s+[A-Za-z_$]/.test(L)) {
        console.log(`BROKEN ${f}:${i + 1}: ${L.trim().slice(0, 140)}`);
      }
    }
  }
}

console.log("--- French table headers / ACTIF ---");
for (const f of walk(root)) {
  if (/I18n/i.test(path.basename(f))) continue;
  const lines = fs.readFileSync(f, "utf8").split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (/>(NOM|ACTIF|CANAL|ELEMENT|CIBLE|CHAMPS|NATURE|CIBLES|AVANT|ACTIONS)</.test(L) || />\s*(NOM|ACTIF|CANAL)\s*</.test(L)) {
      console.log(`${f}:${i + 1}: ${L.trim().slice(0, 140)}`);
    }
  }
}
