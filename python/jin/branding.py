from __future__ import annotations

from urllib.parse import quote


JIN_MARK_SVG = """<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jin mark">
  <defs>
    <linearGradient id="jin-ring" x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6EE7D8"/>
      <stop offset="1" stop-color="#0F766E"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="22" stroke="url(#jin-ring)" stroke-width="5"/>
  <path d="M38 20V34.5C38 42.5081 31.5081 49 23.5 49C17.9386 49 13.1007 45.9051 10.6465 41.3659L15.7333 38.7724C17.1369 41.3631 19.8706 43 23 43C27.4183 43 31 39.4183 31 35V20H38Z" fill="#0F172A"/>
  <path d="M45 26H49V30H45V26ZM45 34H49V38H45V34ZM45 42H49V46H45V42Z" fill="#6EE7D8"/>
</svg>"""


def jin_favicon_href() -> str:
    return "data:image/svg+xml;charset=utf-8," + quote(JIN_MARK_SVG)
