#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PYPROJECT = ROOT / "pyproject.toml"


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, check=check)


def normalize_version(raw: str) -> str:
    version = raw.strip()
    if version.startswith("v"):
        version = version[1:]
    if not version:
        raise ValueError("version cannot be empty")
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:[.-][0-9A-Za-z.-]+)?", version):
        raise ValueError(f"invalid version: {raw}")
    return version


def git_status_clean() -> bool:
    result = run(["git", "status", "--porcelain"])
    return not result.stdout.strip()


def current_branch() -> str:
    result = run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    branch = result.stdout.strip()
    if branch == "HEAD":
        raise RuntimeError("cannot release from detached HEAD")
    return branch


def update_pyproject_version(version: str) -> None:
    text = PYPROJECT.read_text(encoding="utf-8")
    pattern = re.compile(r'(?m)^version = "([^"]+)"$')
    new_text, count = pattern.subn(f'version = "{version}"', text, count=1)
    if count != 1:
        raise RuntimeError("could not find a single version line in pyproject.toml")
    PYPROJECT.write_text(new_text, encoding="utf-8")


def git(*args: str) -> None:
    subprocess.run(["git", *args], cwd=ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare a Jin release.")
    parser.add_argument("--version", required=True, help="Release version, for example 0.1.1 or v0.1.1")
    parser.add_argument("--tag-prefix", default="v", help="Tag prefix to use. Default: v")
    parser.add_argument("--message", help="Override the commit and tag message.")
    parser.add_argument("--no-push", action="store_true", help="Create the commit and tag locally, but do not push.")
    parser.add_argument("--allow-dirty", action="store_true", help="Skip the clean working tree check.")
    args = parser.parse_args()

    try:
        version = normalize_version(args.version)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    tag = f"{args.tag_prefix}{version}"
    message = args.message or f"chore(release): {tag}"

    if not args.allow_dirty and not git_status_clean():
        print("error: working tree is not clean. Commit or stash changes before releasing.", file=sys.stderr)
        return 1

    update_pyproject_version(version)

    git("add", "pyproject.toml")
    git("commit", "-m", message)
    git("tag", "-a", tag, "-m", message)

    if not args.no_push:
        branch = current_branch()
        git("push", "origin", branch, "--tags")

    print(f"Prepared release {tag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
