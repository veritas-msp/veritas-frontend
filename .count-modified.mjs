import { execSync } from "child_process";
import fs from "fs";

const out = execSync('git status --short -- "src/components/AdminPage"', {
  encoding: "utf8",
});
fs.writeFileSync(".admin-git.txt", out);
const lines = out
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);
const files = lines.map((l) => l.replace(/^...\s+/, "").replace(/ -> /, " "));
console.log("modified_or_untracked_count", files.length);
files.forEach((f) => console.log(f));
