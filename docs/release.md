# First Release Guide

This repo is set up so local verification happens before the first release.
    The package is open source under Apache 2.0 and can be installed with `pip`, `pipx`, `poetry`, or `uv`.

## Local Verification

Run:

```bash
make verify
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
