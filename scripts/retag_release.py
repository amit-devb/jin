#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, check=check)


def git(*args: str) -> None:
    subprocess.run(["git", *args], cwd=ROOT, check=True)


def normalize_tag(tag_or_version: str, *, prefix: str) -> str:
    raw = tag_or_version.strip()
    if not raw:
        raise ValueError("tag/version cannot be empty")
    if raw.startswith(prefix):
        return raw
    # Allow "1.2.3" to become "v1.2.3"
    if re.fullmatch(r"\d+\.\d+\.\d+(?:[.-][0-9A-Za-z.-]+)?", raw):
        return f"{prefix}{raw}"
    # Otherwise treat it as an explicit tag name.
    return raw


def git_status_clean() -> bool:
    result = run(["git", "status", "--porcelain"])
    return not result.stdout.strip()


def resolve_ref(ref: str) -> str:
    result = run(["git", "rev-parse", ref])
    return result.stdout.strip()


def local_tag_exists(tag: str) -> bool:
    result = run(["git", "tag", "--list", tag])
    return bool(result.stdout.strip())


def remote_tag_exists(remote: str, tag: str) -> bool:
    # `git ls-remote --tags origin refs/tags/v1.2.3`
    result = run(["git", "ls-remote", "--tags", remote, f"refs/tags/{tag}"], check=False)
    return bool(result.stdout.strip())


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Re-trigger the release workflow by deleting + recreating an existing tag at a ref. "
        "Does not modify pyproject.toml."
    )
    parser.add_argument(
        "--tag",
        required=True,
        help="Tag name or version (e.g. v1.0.0 or 1.0.0).",
    )
    parser.add_argument("--ref", default="HEAD", help="Git ref/sha to tag. Default: HEAD")
    parser.add_argument("--remote", default="origin", help="Remote name. Default: origin")
    parser.add_argument("--tag-prefix", default="v", help="Tag prefix used for versions. Default: v")
    parser.add_argument("--message", help="Override the tag message.")
    parser.add_argument("--no-push", action="store_true", help="Do not push; only update local tag.")
    parser.add_argument(
        "--allow-dirty",
        action="store_true",
        help="Skip clean working tree check (not recommended).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Actually delete/recreate the remote tag if it exists.",
    )
    args = parser.parse_args()

    try:
        tag = normalize_tag(args.tag, prefix=args.tag_prefix)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if not args.allow_dirty and not git_status_clean():
        print("error: working tree is not clean. Commit/stash changes before retagging.", file=sys.stderr)
        return 1

    commit = resolve_ref(args.ref)
    message = args.message or f"chore(release): {tag}"

    remote_has = remote_tag_exists(args.remote, tag)
    if remote_has and not args.force and not args.no_push:
        print(
            f"error: remote tag {tag} exists on {args.remote}. "
            "Re-tagging will delete and recreate it. Re-run with --force to proceed.",
            file=sys.stderr,
        )
        return 1

    # Delete local tag if present (safe).
    if local_tag_exists(tag):
        git("tag", "-d", tag)

    # Recreate tag at the requested commit.
    git("tag", "-a", tag, "-m", message, commit)

    if args.no_push:
        print(f"Retagged locally: {tag} -> {commit}")
        return 0

    # If remote tag exists, delete it first (only when --force).
    if remote_has:
        if not args.force:
            print(f"error: refusing to delete remote tag {tag} without --force", file=sys.stderr)
            return 1
        git("push", args.remote, f":refs/tags/{tag}")

    # Push recreated tag.
    git("push", args.remote, tag)
    print(f"Retagged and pushed: {tag} -> {commit}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

