from __future__ import annotations

from pathlib import Path
from jin.branding import jin_favicon_href

from jin.dashboard_markup import DASHBOARD_BODY


_STATIC_DIR = Path(__file__).resolve().parent / "static" / "generated"


def _asset_version(asset_name: str) -> str:
    try:
        return str((_STATIC_DIR / asset_name).stat().st_mtime_ns)
    except OSError:
        return "dev"


def _render_head(css_version: str) -> str:
    return (
        "<head>\n"
        '  <meta charset="utf-8" />\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
        "  <title>Jin</title>\n"
        f'  <link rel="icon" href="{jin_favicon_href()}" />\n'
        f'  <link rel="stylesheet" href="/jin/assets/dashboard.css?v={css_version}" />\n'
        "</head>"
    )


def _render_script(js_version: str) -> str:
    return f'  <script src="/jin/assets/dashboard.js?v={js_version}" defer></script>'


def _render_document() -> str:
    css_version = _asset_version("dashboard.css")
    js_version = _asset_version("dashboard.js")
    return "\n".join(
        [
            "<!DOCTYPE html>",
            '<html lang="en">',
            _render_head(css_version),
            DASHBOARD_BODY,
            _render_script(js_version),
            "</html>",
        ]
    )


def render_dashboard() -> str:
    return _render_document()
