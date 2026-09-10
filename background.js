/* Drag & Restore
 * SPDX-License-Identifier: MIT
 */
"use strict";

const DEFAULTS = Object.freeze({
  dragEnabled: true,
  dragTextSearch: false,
  dragImage: true,
  openInBackground: false,
  minDistance: 8
});

const MENU_PREFIX = "restore-session::";
const MENU_RESTORE_LATEST = "restore-latest";
const MENU_RESTORE_ALL = "restore-all";

async function getSettings() {
  return { ...DEFAULTS, ...(await browser.storage.local.get(DEFAULTS)) };
}

function validOpenableUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

async function openDragTarget(message, sender) {
  const settings = await getSettings();
  if (!settings.dragEnabled) return;

  const { kind, value } = message;
  if (typeof value !== "string" || !value.trim()) return;

  if (kind === "text") {
    if (!settings.dragTextSearch) return;

    const allowed = await browser.permissions.contains({
      data_collection: ["searchTerms"]
    });
    if (!allowed) return;

    const tab = await browser.tabs.create({
      active: !settings.openInBackground
    });
    await browser.search.query({
      text: value.trim(),
      tabId: tab.id
    });
    return;
  }

  if (kind === "image" && !settings.dragImage) return;

  if ((kind === "link" || kind === "image") && validOpenableUrl(value)) {
    await browser.tabs.create({
      url: value,
      active: !settings.openInBackground
    });
  }
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "drag-open") return undefined;
  return openDragTarget(message, sender).catch(console.error);
});

async function getClosedTabs(windowId, maxResults = 25) {
  const sessions = await browser.sessions.getRecentlyClosed({ maxResults });
  return sessions.filter((session) => {
    return session.tab && (windowId == null || session.tab.windowId === windowId);
  });
}

async function getFocusedWindowId() {
  try {
    const win = await browser.windows.getLastFocused();
    return win?.id;
  } catch {
    return undefined;
  }
}

async function restoreLatest(windowId) {
  const [session] = await getClosedTabs(windowId, 1);
  if (session?.tab?.sessionId) {
    await browser.sessions.restore(session.tab.sessionId);
  }
}

async function restoreAll(windowId) {
  const sessions = await getClosedTabs(windowId);
  for (const session of sessions.reverse()) {
    if (session?.tab?.sessionId) {
      await browser.sessions.restore(session.tab.sessionId);
    }
  }
}

async function rebuildActionMenu() {
  const windowId = await getFocusedWindowId();
  const sessions = await getClosedTabs(windowId, 8);

  await browser.menus.removeAll();

  browser.menus.create({
    id: MENU_RESTORE_LATEST,
    contexts: ["action"],
    title: browser.i18n.getMessage("restoreLatestMenu"),
    enabled: sessions.length > 0
  });

  if (sessions.length > 0) {
    browser.menus.create({
      id: "recent-tabs",
      contexts: ["action"],
      title: browser.i18n.getMessage("recentTabsMenu")
    });

    for (const session of sessions.slice(0, 8)) {
      const title = session.tab.title || session.tab.url || browser.i18n.getMessage("untitledTab");
      browser.menus.create({
        id: MENU_PREFIX + session.tab.sessionId,
        parentId: "recent-tabs",
        contexts: ["action"],
        title: title.length > 70 ? `${title.slice(0, 67)}…` : title
      });
    }
  }

  browser.menus.create({
    id: "separator",
    contexts: ["action"],
    type: "separator"
  });

  browser.menus.create({
    id: MENU_RESTORE_ALL,
    contexts: ["action"],
    title: browser.i18n.getMessage("restoreAllMenu"),
    enabled: sessions.length > 0
  });

  await browser.action.setTitle({
    title: sessions.length
      ? browser.i18n.getMessage("actionTitleWithCount", String(sessions.length))
      : browser.i18n.getMessage("actionTitle")
  });
}

browser.action.onClicked.addListener((tab) => {
  restoreLatest(tab?.windowId).catch(console.error);
});

browser.menus.onClicked.addListener((info, tab) => {
  const id = String(info.menuItemId);

  if (id === MENU_RESTORE_LATEST) {
    restoreLatest(tab?.windowId).catch(console.error);
    return;
  }

  if (id === MENU_RESTORE_ALL) {
    restoreAll(tab?.windowId).catch(console.error);
    return;
  }

  if (id.startsWith(MENU_PREFIX)) {
    const sessionId = id.slice(MENU_PREFIX.length);
    browser.sessions.restore(sessionId).catch(console.error);
  }
});

browser.sessions.onChanged.addListener(() => {
  rebuildActionMenu().catch(console.error);
});

browser.windows.onFocusChanged.addListener(() => {
  rebuildActionMenu().catch(console.error);
});

browser.runtime.onInstalled.addListener(() => {
  rebuildActionMenu().catch(console.error);
});

browser.runtime.onStartup.addListener(() => {
  rebuildActionMenu().catch(console.error);
});

// Also initialize when the background event page is first created.
rebuildActionMenu().catch(console.error);
