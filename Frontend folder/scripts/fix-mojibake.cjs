const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|jsx?|css|html|md)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const replacements = [
  ["Â·", "·"],
  ["â€”", "—"],
  ["â€“", "–"],
  ["â€¦", "…"],
  ["â†", "←"],
  ["âš—", "✂"],
  ["â€™", "'"],
  ["â€œ", '"'],
  ["â€", '"'],
];

let total = 0;
for (const file of walk(root)) {
  let text = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of replacements) {
    if (!text.includes(from)) continue;
    const count = text.split(from).length - 1;
    text = text.split(from).join(to);
    total += count;
    changed = true;
    console.log(`${path.relative(root, file)}: ${count}x ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
  }
  if (changed) fs.writeFileSync(file, text);
}

console.log(`Done. Total replacements: ${total}`);
