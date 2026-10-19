// Fails if any page's JSON-LD block is not valid JSON or lacks @context/@type.
// A typo there breaks search-engine parsing silently, so it is checked on every push.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name.startsWith(".") || name === "node_modules") return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

let failures = 0;
for (const file of htmlFiles(".")) {
  const html = readFileSync(file, "utf8");
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (blocks.length === 0) {
    console.error(`${file}: no JSON-LD block`);
    failures++;
  }
  for (const [, json] of blocks) {
    try {
      const data = JSON.parse(json);
      if (!data["@context"] || !(data["@type"] || data["@graph"])) throw new Error("missing @context or @type/@graph");
    } catch (error) {
      console.error(`${file}: ${error.message}`);
      failures++;
    }
  }
}
console.log(failures ? `${failures} problem(s)` : "structured data OK");
process.exitCode = failures ? 1 : 0;
