from __future__ import annotations

from urllib.parse import quote


JIN_MARK_SVG = """<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jin mark">
  <defs>
    <linearGradient id="jin-mark-frame" x1="12" y1="11" x2="52" y2="53" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#D9FDEB"/>
      <stop offset="1" stop-color="#A7F3D0"/>
    </linearGradient>
    <linearGradient id="jin-mark-accent" x1="40.5" y1="18" x2="40.5" y2="42" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#14B8A6"/>
      <stop offset="1" stop-color="#0F766E"/>
    </linearGradient>
  </defs>
  <rect x="10.5" y="10.5" width="43" height="43" rx="14" fill="#FFFFFF" stroke="url(#jin-mark-frame)" stroke-width="1.5"/>
  <path d="M37.5 18v14.8c0 8.7-6.8 15.7-15.2 15.7-4.9 0-9.3-2.2-12.3-5.7" stroke="#0F172A" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M41.7 22h2.6v14.5h-2.6z" fill="url(#jin-mark-accent)"/>
</svg>"""


def jin_favicon_href() -> str:
    return "data:image/svg+xml;charset=utf-8," + quote(JIN_MARK_SVG)
