#!/usr/bin/env python3
"""Build Verbal N-back pre JATOS study assets without constructing JZIP metadata."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "build" / "study-assets"
ENTRY = "index.html"
FILES = ("index.html", "standalone.js", "style.css", "VERSION", "data/experiment.json", "src/jatos-storage.js")
DIRECTORIES = ("assets",)


def git_commit() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, check=False,
        capture_output=True, text=True,
    )
    return result.stdout.strip() if result.returncode == 0 else "uncommitted"


def transform_html(source: str) -> str:
    marker = "<script>window.NBACK_STORAGE_BACKEND = 'local';</script>"
    replacement = (
        '<script src="jatos.js"></script>\n'
        "  <script>window.NBACK_STORAGE_BACKEND = 'jatos';</script>\n"
        '  <script src="src/jatos-storage.js"></script>'
    )
    if marker not in source:
        raise RuntimeError(f"Expected HTML marker is missing: {marker}")
    return source.replace(marker, replacement, 1)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build(output: Path) -> None:
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for relative in FILES:
        source, target = ROOT / relative, output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if relative == ENTRY:
            target.write_text(transform_html(source.read_text(encoding="utf-8")), encoding="utf-8")
        else:
            shutil.copy2(source, target)
    for relative in DIRECTORIES:
        shutil.copytree(ROOT / relative, output / relative)
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    info = {
        "experiment_version":version,
        "git_commit":git_commit(),
        "built_at_utc":datetime.now(timezone.utc).isoformat(),
        "component_entry":ENTRY,
        "response_mode":"keyboard",
        "experiment_type":"VerbalNBackPre",
        "formal_trials":222,
        "debug_trials":5,
    }
    (output / "build-info.json").write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paths = sorted(path for path in output.rglob("*") if path.is_file())
    lines = [f"{sha256(path)}  {path.relative_to(output).as_posix()}" for path in paths]
    (output / "MANIFEST.sha256").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"output":str(output), "files":len(paths) + 1, "git_commit":info["git_commit"]}))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    output = parser.parse_args().output.resolve()
    protected = {ROOT, *(ROOT / name for name in ("src", "docs", "scripts", "assets", "data", "source"))}
    if output in protected:
        raise SystemExit("Refusing to overwrite a source directory")
    build(output)


if __name__ == "__main__":
    main()
