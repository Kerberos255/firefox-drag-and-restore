/* SPDX-License-Identifier: MIT */
"use strict";

const DEFAULTS = {
  dragEnabled: true,
  dragTextSearch: false,
  dragImage: true,
  openInBackground: false,
  newTabPosition: "end",
  minDistance: 8
};

function localize() {
  for (const node of document.querySelectorAll("[data-i18n]")) {
    const value = browser.i18n.getMessage(node.dataset.i18n);
    if (value) node.textContent = value;
  }
}

async function load() {
  const settings = await browser.storage.local.get(DEFAULTS);
  const searchConsent = await browser.permissions.contains({
    data_collection: ["searchTerms"]
  });

  for (const key of ["dragEnabled", "dragImage", "openInBackground"]) {
    document.getElementById(key).checked = Boolean(settings[key]);
  }

  document.getElementById("dragTextSearch").checked =
    Boolean(settings.dragTextSearch && searchConsent);
  document.getElementById("minDistance").value = settings.minDistance;

  const position = settings.newTabPosition === "after-current" ? "after-current" : "end";
  const positionInput = document.querySelector(
    `input[name="newTabPosition"][value="${position}"]`
  );
  if (positionInput) positionInput.checked = true;

  if (settings.dragTextSearch && !searchConsent) {
    await browser.storage.local.set({ dragTextSearch: false });
  }
}

let savedTimer;

function showStatus(messageKey) {
  const saved = document.getElementById("saved");
  saved.textContent = browser.i18n.getMessage(messageKey);
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => {
    saved.textContent = "";
  }, 1600);
}

async function saveOrdinarySettings() {
  const selectedPosition = document.querySelector(
    'input[name="newTabPosition"]:checked'
  )?.value;

  await browser.storage.local.set({
    dragEnabled: document.getElementById("dragEnabled").checked,
    dragImage: document.getElementById("dragImage").checked,
    openInBackground: document.getElementById("openInBackground").checked,
    newTabPosition: selectedPosition === "after-current" ? "after-current" : "end",
    minDistance: Math.min(
      64,
      Math.max(4, Number(document.getElementById("minDistance").value) || 8)
    )
  });
  showStatus("savedMessage");
}

async function handleTextSearchToggle(event) {
  const checkbox = event.currentTarget;

  if (!checkbox.checked) {
    await browser.storage.local.set({ dragTextSearch: false });
    showStatus("savedMessage");
    return;
  }

  // This request is deliberately made inside the user's change event.
  const granted = await browser.permissions.request({
    data_collection: ["searchTerms"]
  });

  if (!granted) {
    checkbox.checked = false;
    await browser.storage.local.set({ dragTextSearch: false });
    showStatus("searchPermissionDenied");
    return;
  }

  await browser.storage.local.set({ dragTextSearch: true });
  showStatus("savedMessage");
}

document.addEventListener("DOMContentLoaded", async () => {
  localize();
  await load();

  document.getElementById("dragTextSearch").addEventListener(
    "change",
    (event) => handleTextSearchToggle(event).catch(console.error)
  );

  for (const id of ["dragEnabled", "dragImage", "openInBackground", "minDistance"]) {
    document.getElementById(id).addEventListener(
      "change",
      () => saveOrdinarySettings().catch(console.error)
    );
  }

  for (const input of document.querySelectorAll('input[name="newTabPosition"]')) {
    input.addEventListener("change", () => saveOrdinarySettings().catch(console.error));
  }
});
