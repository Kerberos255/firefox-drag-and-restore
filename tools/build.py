from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
version = manifest["version"]
dist = ROOT / "dist"
dist.mkdir(exist_ok=True)
output = dist / f"drag-and-restore-{version}.xpi"

include = [
    "manifest.json",
    "background.js",
    "LICENSE",
    "NOTICE.md",
    "_locales",
    "content",
    "icons",
    "options",
]

with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for item in include:
        p = ROOT / item
        if p.is_dir():
            for child in sorted(p.rglob("*")):
                if child.is_file():
                    zf.write(child, child.relative_to(ROOT))
        elif p.is_file():
            zf.write(p, p.relative_to(ROOT))

print(output)
