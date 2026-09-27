import assert from "node:assert/strict";
import fs from "node:fs";
import { parse } from "@babel/parser";
import { messages, languages } from "../src/translations.js";

assert.deepEqual(
  languages.map((l) => l.code),
  ["ko", "en", "ja", "pt", "es"],
);
const placeholders = (s) =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
for (const [source, translations] of Object.entries(messages)) {
  assert.equal(translations.length, 4, `Four translations required: ${source}`);
  for (const target of translations) {
    assert.ok(
      typeof target === "string" && target.trim(),
      `Missing translation: ${source}`,
    );
    assert.deepEqual(
      placeholders(target),
      placeholders(source),
      `Placeholder mismatch: ${source}`,
    );
    assert.ok(!/[가-힣]/.test(target), `Untranslated Korean: ${source}`);
  }
}
let references = 0;
const source = fs.readFileSync(
  new URL("../src/main.jsx", import.meta.url),
  "utf8",
);
const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
function visit(n) {
  if (!n || typeof n !== "object") return;
  if (
    n.type === "CallExpression" &&
    n.callee?.name === "t" &&
    n.arguments[0]?.type === "StringLiteral"
  ) {
    assert.ok(
      messages[n.arguments[0].value],
      `Unknown translation key: ${n.arguments[0].value}`,
    );
    references++;
  }
  if (n.type === "JSXText")
    assert.ok(!/[가-힣]/.test(n.value), `Raw Korean JSX: ${n.value}`);
  for (const [key, v] of Object.entries(n)) {
    if (key === "loc") continue;
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") visit(v);
  }
}
visit(ast);
for (const file of [
  "public/favicon.svg",
  "public/assets/mountain.jpg",
  "index.html",
  "privacy.html",
])
  assert.ok(
    fs.existsSync(new URL(`../${file}`, import.meta.url)),
    `Missing ${file}`,
  );
const deployment = JSON.parse(fs.readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
assert.equal(deployment.installCommand, "npm ci --prefix landing");
assert.equal(deployment.buildCommand, "npm run build --prefix landing");
assert.equal(deployment.outputDirectory, "landing/dist");
console.log(
  `PASS: ${Object.keys(messages).length} messages × 4 translations; ${references} static references; 5 locales; placeholder parity; local assets.`,
);
