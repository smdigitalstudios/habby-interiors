/**
 * build-content.js
 *
 * Decap CMS saves one JSON file per project inside /content/projects/.
 * A plain static site has no way to "list a folder" from the browser,
 * so this script runs at build time (see netlify.toml) and combines
 * every project file into a single /data/projects.json that the
 * homepage can fetch with one request.
 *
 * No dependencies — just Node's built-in fs/path modules, so this
 * doesn't pull in a framework or build tool.
 */

const fs = require("fs");
const path = require("path");

const PROJECTS_DIR = path.join(__dirname, "..", "content", "projects");
const OUTPUT_DIR = path.join(__dirname, "..", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "projects.json");

function buildProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.warn(`[build-content] No folder at ${PROJECTS_DIR} — writing empty projects.json`);
    writeOutput([]);
    return;
  }

  const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".json"));

  const projects = files
    .map((filename) => {
      const fullPath = path.join(PROJECTS_DIR, filename);
      try {
        const raw = fs.readFileSync(fullPath, "utf8");
        const data = JSON.parse(raw);
        return { ...data, _filename: filename };
      } catch (err) {
        console.error(`[build-content] Skipping ${filename} — invalid JSON: ${err.message}`);
        return null;
      }
    })
    .filter(Boolean)
    // Hide anything explicitly unpublished, but treat missing "published" as visible
    .filter((p) => p.published !== false)
    // Lowest "order" first; fall back to filename for stable sort
    .sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a._filename.localeCompare(b._filename);
    })
    // Don't leak the internal filename into the public JSON
    .map(({ _filename, ...rest }) => rest);

  writeOutput(projects);
}

function writeOutput(projects) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(projects, null, 2));
  console.log(`[build-content] Wrote ${projects.length} project(s) to ${OUTPUT_FILE}`);
}

buildProjects();
