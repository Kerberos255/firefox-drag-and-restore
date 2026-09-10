import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

function assert(value, message) {
  if (!value) throw new Error(message);
}

assert(manifest.manifest_version === 3, "manifest_version must be 3");
assert(Number.parseFloat(manifest.browser_specific_settings.gecko.strict_min_version) >= 140,
  "strict_min_version must support data_collection_permissions");
const dataPermissions = manifest.browser_specific_settings.gecko.data_collection_permissions;
assert(dataPermissions.required.includes("none"),
  "extension must explicitly declare no required data collection");
assert(dataPermissions.optional.includes("searchTerms"),
  "optional dragged-text search must declare searchTerms");

const serialized = JSON.stringify(manifest);
for (const forbidden of ["mozillaAddons", "experiment_apis", "update_url", "nativeMessaging"]) {
  assert(!serialized.includes(forbidden), `forbidden privileged/legacy key found: ${forbidden}`);
}

const allowedPermissions = new Set(["menus", "search", "sessions", "storage"]);
for (const permission of manifest.permissions ?? []) {
  assert(allowedPermissions.has(permission), `unexpected API permission: ${permission}`);
}

const jsFiles = [
  "background.js",
  "content/drag.js",
  "options/options.js"
];

for (const relative of jsFiles) {
  const text = fs.readFileSync(path.join(root, relative), "utf8");
  for (const forbidden of [
    /\beval\s*\(/,
    /\bFunction\s*\(/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\bimportScripts\s*\(/
  ]) {
    assert(!forbidden.test(text), `${relative}: forbidden remote/dynamic-code pattern ${forbidden}`);
  }
}

console.log("Smoke checks passed.");
