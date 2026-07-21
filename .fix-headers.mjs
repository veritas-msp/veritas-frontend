import fs from "fs";

const replacements = [
  // AdminTickets notification/webhook/cron tables
  {
    file: "src/components/AdminPage/AdminTickets.js",
    pairs: [
      ["<th>ELEMENT</th>", "<th>ITEM</th>"],
      ["<th>AVANT (J)</th>", "<th>LEAD (D)</th>"],
      ["<th>CIBLE</th>", "<th>TARGET</th>"],
      ["<th>CANAL</th>", "<th>CHANNEL</th>"],
      ["<th>ACTIF</th>", "<th>ACTIVE</th>"],
      ["<th>NOM</th>", "<th>NAME</th>"],
      ["}>ACTIF</th>", ">ACTIVE</th>"],
    ],
  },
  {
    file: "src/components/AdminPage/SalesFormsAdmin.js",
    pairs: [
      ["<th>NATURE</th>", "<th>TYPE</th>"],
      ["<th>CHAMPS</th>", "<th>FIELDS</th>"],
      ["<th>CIBLES TICKET</th>", "<th>TICKET TARGETS</th>"],
      ["<th>ACTIF</th>", "<th>ACTIVE</th>"],
    ],
  },
];

for (const { file, pairs } of replacements) {
  let t = fs.readFileSync(file, "utf8");
  let n = 0;
  for (const [a, b] of pairs) {
    const c = t.split(a).length - 1;
    if (c) {
      t = t.split(a).join(b);
      n += c;
      console.log(file, a, "→", b, "x", c);
    }
  }
  fs.writeFileSync(file, t);
  console.log(file, "total", n);
}
