# Drag & Restore

A small Firefox extension that brings back two convenient browsing behaviors:

- Super drag: drag a link or image and release it to open it in a new tab; drag selected text to search with Firefox's default search engine.
- Restore closed tabs: click the toolbar button to restore the most recently closed tab; right-click it to pick from recent tabs or restore all.

## Privacy

The extension has no analytics, telemetry, remote code, advertising, or network backend.

Core link/image dragging and tab restoration declare no required data transmission. Text search is disabled by default. If the user enables it, Firefox asks for the optional `searchTerms` data-transmission permission before any dragged text can be sent to the user's configured default search engine:

```json
"data_collection_permissions": {
  "required": ["none"],
  "optional": ["searchTerms"]
}
```

## Firefox support

- Manifest V3
- Firefox 140+
- Intended for current Firefox Release, including Firefox 155.x

The minimum is intentionally Firefox 140 because new AMO submissions must declare Firefox's built-in data-collection consent metadata.

## Permissions

- `sessions`: read and restore recently closed tabs.
- `search`: search text through Firefox's configured search engine.
- `storage`: store local extension settings.
- `menus`: show recent closed tabs in the toolbar button context menu.

The content script runs only on normal `http` and `https` web pages as declared by `content_scripts.matches`.

No `tabs` permission, privileged Mozilla API, native messaging, or remote-code permission is requested.

## Local testing

On Firefox:

1. Open `about:debugging`.
2. Choose **This Firefox**.
3. Choose **Load Temporary Add-on**.
4. Select this project's `manifest.json`.

The `.xpi` produced by the included build script is unsigned. Normal Firefox Release requires AMO signing for permanent installation.

## Build

Requires Python 3 only:

```bash
python tools/build.py
```

Output: `dist/drag-and-restore-1.0.xpi`.

## AMO preparation

Before public submission:

1. Replace the provisional extension ID if desired, then keep it stable forever.
2. Add final project/support/homepage URLs.
3. Create final AMO listing text and screenshots.
4. Run Mozilla's current `web-ext lint`.
5. Test temporary installation on current Firefox Release and ESR.
6. Submit the XPI/source to AMO for signing and review.

## License

MIT. See `LICENSE`.
