// Reads the plan's limit explanations (PLAN_SOURCES, BASIS) out of Classic's static/app.js and writes
// them as JSON for the new UI. Classic's file stays the one source; this runs before every dev/build.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const SRC = new URL("../../static/app.js", import.meta.url), OUT = new URL("../src/data/plan_sources.json", import.meta.url);
if (!existsSync(SRC)) {   // e.g. the ui/ Docker build: use the committed copy
  if (!existsSync(OUT)) throw new Error("static/app.js not found and no committed plan_sources.json");
  console.log("plan_sources.json: static/app.js not here, keeping the committed copy"); process.exit(0);
}
const js = readFileSync(SRC, "utf8");

function literal(name) {
  const start = js.indexOf(`const ${name}=`);
  if (start < 0) throw new Error(`${name} not found in static/app.js`);
  let i = js.indexOf("{", start), depth = 0, quote = null;
  for (let j = i; j < js.length; j++) {
    const c = js[j];
    if (quote) { if (c === "\\") j++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) // Classic formats a few numbers inline through its unit helper; the JSON is metric (the UI converts).
    return new Function("U", `return (${js.slice(i, j + 1)});`)({ d: (v) => v, mi: false, unit: "km", k: " km" });
  }
  throw new Error(`${name}: unbalanced braces`);
}
const out = { basis: literal("BASIS"), sources: literal("PLAN_SOURCES"), components: literal("COMPT") };
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`plan_sources.json: ${Object.keys(out.sources).length} limits, ${Object.keys(out.basis).length} bases`);
