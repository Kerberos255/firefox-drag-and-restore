# Drag & Restore

A small Firefox extension that adds two convenient browsing behaviors:

- Super drag: drag a link or image and release it to open it in a new tab; optionally drag selected text to search with Firefox's configured search engine. New dragged-content tabs can be placed either after all tabs or immediately after the current tab.
- Restore closed tabs: click the toolbar button to restore the most recently closed tab; right-click it to pick from recent tabs or restore all.

## Privacy

The extension has no analytics, telemetry, remote code, advertising, tracking, or developer-operated network backend.

Core link/image dragging and tab restoration declare no required data transmission. Text search is disabled by default. If the user enables it, Firefox asks for the optional `searchTerms` data-transmission permission before dragged text can be sent to the user's configured search engine.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Firefox support

- Manifest V3
- Firefox 140+
- Intended for current Firefox Release and ESR

Firefox 140 is the minimum supported version because the extension uses Firefox's built-in data-collection permission metadata.

## Permissions

- `sessions`: read and restore recently closed tabs.
- `search`: search text through Firefox's configured search engine when the optional text-search feature is enabled.
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

Output: `dist/drag-and-restore-1.1.xpi`.

## Test

```bash
npm test
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
