import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

function assert(value, message) {
  if (!value) throw new Error(message);
}

assert(manifest.manifest_version === 3, "manifest_version must be 3");
assert(manifest.version === "1.1", "manifest version must be 1.1");
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

const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const options = fs.readFileSync(path.join(root, "options/options.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(root, "options/options.html"), "utf8");

assert(background.includes('newTabPosition: "end"'),
  "background default new-tab position must preserve existing end-of-tabs behavior");
assert(background.includes('settings.newTabPosition === "after-current"'),
  "background must support opening after the current tab");
assert(background.includes('options.index = sender.tab.index + 1'),
  "after-current placement must target the slot immediately after the source tab");
assert(background.includes('browser.tabs.query({ windowId: sender.tab.windowId })'),
  "end placement must count tabs in the source window");
assert(background.includes('options.index = tabs.length'),
  "end placement must explicitly append after all tabs");
assert(options.includes('newTabPosition: "end"'),
  "options default new-tab position missing");
assert(optionsHtml.includes('name="newTabPosition" value="end"'),
  "end-of-tabs option missing from settings UI");
assert(optionsHtml.includes('name="newTabPosition" value="after-current"'),
  "after-current option missing from settings UI");

for (const locale of ["zh_CN", "en_US"]) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, `_locales/${locale}/messages.json`), "utf8"));
  for (const key of ["newTabPositionLabel", "newTabPositionEnd", "newTabPositionAfterCurrent"]) {
    assert(messages[key]?.message, `${locale}: missing localization key ${key}`);
  }
}

// Exercise the tab-placement helper in the real background script with mocked WebExtension APIs.
const noopListener = { addListener() {} };
const mockBrowser = {
  storage: { local: { get: async (defaults) => defaults }, onChanged: noopListener },
  runtime: { onMessage: noopListener, onInstalled: noopListener, onStartup: noopListener },
  permissions: { contains: async () => true },
  tabs: {
    query: async ({ windowId }) => Array.from({ length: 8 }, (_, index) => ({ index, windowId })),
    create: async (options) => ({ id: 1, ...options })
  },
  search: { query: async () => {} },
  sessions: { getRecentlyClosed: async () => [], restore: async () => {}, onChanged: noopListener },
  windows: { getLastFocused: async () => ({ id: 1 }), onFocusChanged: noopListener },
  menus: { removeAll: async () => {}, create: () => {}, onClicked: noopListener },
  action: { setTitle: async () => {}, onClicked: noopListener },
  i18n: { getMessage: (key) => key }
};
const context = vm.createContext({ browser: mockBrowser, console, URL });
vm.runInContext(background, context);

const sender = { tab: { windowId: 3, index: 5 } };
const endOptions = await context.createTabOptions(
  { openInBackground: false, newTabPosition: "end" },
  sender,
  { url: "https://example.com" }
);
assert(endOptions.index === 8 && endOptions.windowId === 3 && endOptions.active === true,
  "end placement behavior must append to the source window");

const afterCurrentOptions = await context.createTabOptions(
  { openInBackground: true, newTabPosition: "after-current" },
  sender,
  { url: "https://example.com" }
);
assert(afterCurrentOptions.index === 6 && afterCurrentOptions.windowId === 3 && afterCurrentOptions.active === false,
  "after-current placement behavior must open immediately after the source tab");

console.log("Smoke checks passed.");
