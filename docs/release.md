# First Release Guide

This repo is set up so local verification happens before the first release.
The package is open source under Apache 2.0 and can be installed with `pip`, `pipx`, `poetry`, or `uv`.

## Local Verification

Run the fast gate:

```bash
make verify
```

That checks:

- Python tests
- Python coverage
- Rust tests

Run the full pre-release check when you want the Rust coverage summary too:

```bash
make verify-full
```

That checks:

- Python tests
- Python coverage
- Rust tests
- Rust native coverage summary

## Editable Native Build

For a local editable build:

```bash
make develop
```

## Docs Preview

To preview the docs site locally:

```bash
make docs-serve
```

## Maintainer Demo Harness

This repo also includes an internal demo harness for maintainers to verify the
embedded app path end to end:

```bash
PYTHONPATH=python .venv/bin/python -m uvicorn examples.fastapi_demo.app:app --host 127.0.0.1 --port 8000
```

Then visit the local app endpoints:

- `/api/revenue/amazon/YTD`
- `/api/inventory/amazon`
- `/jin`

This harness is for repo verification and onboarding only. It is not part of
the end-user product story.

## Release And CI

The repo already includes:

- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`

Tag a release with `v*` to build wheels for the main desktop platforms plus an sdist, publish to PyPI, and attach the artifacts to a GitHub Release.

GitHub Release notes are generated automatically from the tag, and the same
notes are packaged into a `CHANGELOG.md` asset so the release history stays in
sync.

Final remote execution still depends on your GitHub and PyPI credentials.

## What I Need From You

To actually ship the first public release, I need:

- the version tag you want first, such as `v0.1.0`
- confirmation that the PyPI project name is `jin-monitor`
- either PyPI trusted publishing enabled for this GitHub repo, or a PyPI token if you prefer token-based publishing

## Recommended Publishing Setup

Use PyPI trusted publishing if possible. It avoids long-lived API tokens.

On PyPI, add a trusted publisher for:

- owner: your GitHub org or username
- repository: this repo
- workflow file: `.github/workflows/publish.yml`
- environment: `pypi`

After that, the release job can publish without any PyPI secret in GitHub.
If the project name does not exist yet, the first successful trusted publish
creates the PyPI project and turns the pending publisher into an active one.
If the project already exists, the same setup grants release access without an
API token.

## Security Hardening

To keep tag-driven publishing safe, apply these GitHub protections:

- Protect release tags like `v*` so only maintainers can create or move them.
- Keep the `pypi` environment protected with required reviewers if you want a
  manual approval gate before publish.
- Keep `id-token: write` limited to the publish job only, which this workflow
  already does.
- Avoid adding extra steps to the publish job that do not need release access.

That gives you the safer path: short-lived OIDC publish credentials, no stored
PyPI token, and a narrow release surface that is gated by tag protection and
environment policy.

## Windows Wheel Note

The Windows release job now relies on the crate-level build script to link the
Windows Restart Manager import library. That resolves the DuckDB linker errors
seen on `windows-latest` while keeping the Linux, macOS, and PyPI publish flow
unchanged.
