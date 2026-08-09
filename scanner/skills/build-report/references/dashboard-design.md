# Dashboard design language

Modern, elegant, professional. Everything here sits on top of the three
non-negotiables in SKILL.md — one self-contained file, real scan data, masked
secrets — which no styling choice may compromise.

## Traceability

Every number carries `title="json.path"` pointing at the field it came from. A
reader who distrusts a figure can hover and then grep the JSON for it. This is
what separates a dashboard from a poster.

## Layout

- Fixed header: score dial, grade badge, scan metadata, light/dark toggle.
- Card grid below, generous whitespace.
- System font stack with tabular numerals. Numbers right-aligned.
- One restrained accent palette. Severity colors used consistently everywhere —
  no rainbow. Grade colors match the badge exactly.

## Charts

Inline SVG rendered by inline JS, animated on load, tooltips on hover:

- subscore radar
- severity donut
- LOC-by-language bars
- worst-files bar
- hotspot chart, with an honest text fallback when git history is absent
- trend sparkline when a previous report was supplied

Every mark carries data. Decoration that pretends to be data is still banned.

## Findings explorer

Client-side: text search, filter chips for severity/rule/debt, sortable
columns, chunked rendering so 1200+ findings stay smooth, a visible
"showing X of Y" count, row expand for long messages.

Finding text is inserted with `textContent`, never `innerHTML` — messages quote
scanned source, which means they are attacker-influenced input.

## Accessibility and export

- Print stylesheet so the page exports cleanly to PDF.
- `prefers-reduced-motion` disables animation.
- Empty states are designed, not blank: "No findings at error severity."

## Why self-contained matters

A dashboard that fetches a CDN font is a dashboard that renders differently on
an air-gapped machine, breaks when the CDN 404s, and leaks the reader's IP to a
third party when they open a security report. One file, no requests.
