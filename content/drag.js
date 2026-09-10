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

let settings = { ...DEFAULTS };
let dragState = null;

browser.storage.local.get(DEFAULTS).then((stored) => {
  settings = { ...DEFAULTS, ...stored };
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  for (const key of Object.keys(DEFAULTS)) {
    if (changes[key]) settings[key] = changes[key].newValue;
  }
});

function elementFromEvent(event) {
  const node = event.composedPath?.()[0] ?? event.target;
  if (node instanceof Element) return node;
  return node?.parentElement ?? null;
}

function isEditableTarget(event) {
  const element = elementFromEvent(event);
  return Boolean(element?.closest("input, textarea, [contenteditable]"));
}

function firstUriLine(value) {
  if (!value) return "";
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#")) || "";
}

function dragPayload(event) {
  const element = elementFromEvent(event);
  if (!element) return null;

  const image = element.closest("img");
  if (image?.src) {
    return { kind: "image", value: image.src };
  }

  const link = element.closest("a[href]");
  if (link?.href) {
    return { kind: "link", value: link.href };
  }

  const transfer = event.dataTransfer;
  const uri =
    firstUriLine(transfer?.getData("text/uri-list")) ||
    firstUriLine(transfer?.getData("text/x-moz-url"));

  if (uri) {
    return { kind: "link", value: uri };
  }

  const selection = window.getSelection()?.toString().trim();
  const text = selection || transfer?.getData("text/plain")?.trim();
  if (text) {
    return { kind: "text", value: text };
  }

  return null;
}

document.addEventListener(
  "dragstart",
  (event) => {
    if (!settings.dragEnabled || !event.isTrusted) {
      dragState = null;
      return;
    }

    const payload = dragPayload(event);
    if (!payload) {
      dragState = null;
      return;
    }

    dragState = {
      ...payload,
      startX: event.screenX,
      startY: event.screenY
    };
  },
  true
);

document.addEventListener(
  "dragover",
  (event) => {
    if (!settings.dragEnabled || !dragState || isEditableTarget(event)) return;

    if (dragState.kind === "text" && !settings.dragTextSearch) return;
    if (dragState.kind === "image" && !settings.dragImage) return;

    event.preventDefault();
  },
  true
);

document.addEventListener(
  "drop",
  (event) => {
    const state = dragState;
    dragState = null;

    if (!settings.dragEnabled || !state || isEditableTarget(event)) return;

    if (state.kind === "text" && !settings.dragTextSearch) return;
    if (state.kind === "image" && !settings.dragImage) return;

    const dx = event.screenX - state.startX;
    const dy = event.screenY - state.startY;
    const minDistance = Math.max(4, Number(settings.minDistance) || 8);

    if (dx * dx + dy * dy < minDistance * minDistance) return;

    event.preventDefault();
    event.stopPropagation();

    browser.runtime.sendMessage({
      type: "drag-open",
      kind: state.kind,
      value: state.value
    }).catch(() => {});
  },
  true
);

document.addEventListener(
  "dragend",
  () => {
    dragState = null;
  },
  true
);
