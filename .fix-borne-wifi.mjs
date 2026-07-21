import fs from "fs";

const p =
  "src/components/AdminPage/MonitoringClientSkeleton/ClientSteps/StepBorneWifi.js";
let t = fs.readFileSync(p, "utf8");

// Fix broken identifiers introduced by over-eager translation
t = t.replace(/\baccess points\b/g, "bornes");
t = t.replace(/\baccess pointIndex\b/g, "borneIndex");
t = t.replace(/\baccess point\b/g, "borne");

// Restore English UI strings that got mangled by identifier replacement
const fixes = [
  ["No bornes configured", "No access points configured"],
  [
    'Click "Add a WiFi borne" to get started',
    'Click "Add a WiFi access point" to get started',
  ],
  [
    "{siteAps.length} borne{siteAps.length > 1 ? 's' : ''}",
    "{siteAps.length} access point{siteAps.length > 1 ? 's' : ''}",
  ],
  [
    "No bornes in this site. Drag and drop an borne here to assign it.",
    "No access points in this site. Drag and drop an access point here to assign it.",
  ],
  ["Delete this borne", "Delete this access point"],
  ["SSIDs broadcast by this borne", "SSIDs broadcast by this access point"],
];
for (const [a, b] of fixes) {
  t = t.split(a).join(b);
}

fs.writeFileSync(p, t);

const bad = [];
const lines = t.split(/\n/);
for (let i = 0; i < lines.length; i++) {
  // Invalid JS: space in identifier would show as "access point" still
  if (/\baccess point\b/.test(lines[i]) && !/["'`].*access point/.test(lines[i])) {
    // allow in strings only - check if outside quotes roughly
  }
  if (/const access |access points|access pointIndex|access point\./.test(lines[i])) {
    bad.push(`${i + 1}: ${lines[i].trim().slice(0, 120)}`);
  }
}
console.log("has const bornes:", /const bornes = form/.test(t));
console.log("UI access point mentions:", (t.match(/access point/g) || []).length);
console.log("bad lines:", bad.length);
bad.forEach((b) => console.log(b));
