"""Build the standalone copy of the tracker for GitHub Pages (or any static host).

Same page, same calculations and charts as the Claude tracker; a small runtime in
docs/runtime.js stands in for Claude's dashboard runtime, and the "Photon" colours
from page/look.json become CSS variables. The data files are copied into docs/data/
(plus a CSV of every row) so visitors can download them.

Usage (from the repository root):  python3 tools/build_site.py
Reads page/ and data/, writes docs/. Safe to run again: docs/ is rebuilt each time.
"""
import csv, json, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE, DATA, DOCS, SITE = (os.path.join(ROOT, d) for d in ("page", "data", "docs", os.path.join("tools", "site")))
FILES = ["policies.json", "changelog.json"]

TITLE = "Photonics Policy Tracker: North America, Europe & Asia-Pacific"
DESC = ("What governments, and the groups advising them, have done about photonics since 2020: strategies, laws, "
        "funding, trade controls, programmes and published advice. Each entry links to its source.")
SITE_URL = "https://myadhu92-hue.github.io/photonics-policy-tracker/"
REPO_URL = "https://github.com/myadhu92-hue/photonics-policy-tracker"

# The page's own text says where to find the data in Claude; on this copy it is a download link.
TEXT_SWAPS = [
    ("Open Sources beside the page to download the full data instead.",
     "Download the full data instead: <a href='data/policies.csv'>CSV</a> or <a href='data/policies.json'>JSON</a>."),
]

FOOTER = f"""
  <footer class='ppt-site-foot'>
    <p>Download the data: <a href='data/policies.csv'>all developments (CSV)</a> · <a href='data/policies.json'>all developments (JSON)</a> · <a href='data/changelog.json'>change log (JSON)</a></p>
    <p>Method, data and update routine: <a href='{REPO_URL}'>GitHub repository</a></p>
  </footer>
"""

CSV_COLS = ["id", "date", "date_precision", "jurisdiction", "region", "title", "type", "status", "last_verified",
            "technology", "scope", "amount_local_m", "currency", "amount_note", "photonics_amount_local_m",
            "photonics_amount_note", "summary", "source", "url", "archive_url", "watch_date", "watch_note",
            "in_scope", "excluded_reason", "added_on", "changed_on", "change_note"]


def theme_css(look):
    def block(t):
        v = {"--color-bg": t["ground"], "--color-panel": t["card"], "--color-fg": t["text"],
             "--color-fg-muted": t["muted"], "--color-border-line": t["border"], "--color-ok": t["good"],
             "--color-warn": t["warning"], "--color-bad": t["bad"], "--cds-text-secondary": t["muted"],
             "--cds-chart-muted": t["muted"], "--cds-border": t["border"], "--cds-surface-popover": t["card"]}
        v.update({f"--ppt-c{i}": c for i, c in enumerate(t["charts"])})
        return "".join(f"{k}:{val};" for k, val in v.items())
    return (f":root{{color-scheme:light dark;{block(look['light'])}"
            "--cds-chart-grid:color-mix(in srgb,var(--color-fg) 9%,transparent);"
            "--cds-shadow-popover:0 6px 20px rgba(0,0,0,.14);}\n"
            f"@media (prefers-color-scheme: dark){{:root{{{block(look['dark'])}"
            "--cds-shadow-popover:0 6px 20px rgba(0,0,0,.5);}}}\n")


SITE_CSS = """
:root { --font-anthropic-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; --font-anthropic-serif: Georgia, "Times New Roman", serif;
  --cds-font-size-caption:12.5px; --cds-font-size-body:15px; --cds-font-weight-medium:600; }
html, body { margin: 0; background: var(--color-bg); color: var(--color-fg); }
#dash-root { max-width: 1240px; margin: 0 auto; padding: clamp(12px, 3vw, 32px); box-sizing: border-box; }
.dash-select { font: inherit; font-size: var(--cds-font-size-body); color: var(--color-fg); background-color: var(--color-panel);
  border: 1px solid var(--color-border-line); border-radius: 8px; height: 2.1rem; padding: 0 28px 0 10px;
  appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--color-fg-muted) 50%), linear-gradient(135deg, var(--color-fg-muted) 50%, transparent 50%);
  background-position: calc(100% - 15px) 55%, calc(100% - 10px) 55%; background-size: 5px 5px; background-repeat: no-repeat; }
.dash-skeleton { position: relative; color: transparent !important; }
.dash-skeleton::after { content: ""; position: absolute; inset: 2px 0; border-radius: 4px; background: color-mix(in srgb, var(--color-fg) 8%, transparent); }
.ppt-site-foot { font-size: 12.5px; color: var(--color-fg-muted); line-height: 1.6; border-top: 1px solid var(--color-border-line); padding-top: 14px; margin-top: -24px; }
.ppt-site-foot p { margin: 0 0 4px; }
.ppt-site-foot a, .ppt-msgline a { color: var(--color-fg); }
"""


def main():
    if os.path.isdir(DOCS):
        shutil.rmtree(DOCS)
    os.makedirs(os.path.join(DOCS, "data"))

    # data, and a CSV of every row for people who want a spreadsheet
    for f in FILES:
        shutil.copy(os.path.join(DATA, f), os.path.join(DOCS, "data", f))
    rows = json.load(open(os.path.join(DATA, "policies.json"), encoding="utf-8"))["rows"]
    with open(os.path.join(DOCS, "data", "policies.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=CSV_COLS, extrasaction="ignore")
        w.writeheader()
        for r in sorted(rows, key=lambda r: (r["date"], r["id"])):
            w.writerow(r)

    # page scripts; links copied from this copy point to this copy
    app = open(os.path.join(PAGE, "app.js"), encoding="utf-8").read()
    app, n = re.subn(r"const ARTIFACT_URL = '[^']*';", f"const ARTIFACT_URL = '{SITE_URL}';", app)
    assert n == 1, "page/app.js has no ARTIFACT_URL line"
    # in Claude each script runs in its own scope; on a plain page they would share one
    scoped = lambda src: "(() => {\n" + src + "\n})();\n"
    open(os.path.join(DOCS, "app.js"), "w", encoding="utf-8").write(scoped(app))
    features = open(os.path.join(PAGE, "features.js"), encoding="utf-8").read()
    open(os.path.join(DOCS, "features.js"), "w", encoding="utf-8").write(scoped(features))
    shutil.copy(os.path.join(SITE, "runtime.js"), os.path.join(DOCS, "runtime.js"))
    shutil.copy(os.path.join(SITE, "d3.min.js"), os.path.join(DOCS, "d3.min.js"))

    look = json.load(open(os.path.join(PAGE, "look.json"), encoding="utf-8"))
    body = open(os.path.join(PAGE, "index.html"), encoding="utf-8").read()
    body = body.replace('<meta name="dash-one-writer">', "")
    body = re.sub(r'<script src="(app|features)\.js"></script>\s*', "", body)
    for a, b in TEXT_SWAPS:
        assert a in body, "text to swap not found: " + a
        body = body.replace(a, b)
    # the footer goes inside the page's own wrapper, after its own footer line
    i = body.rindex("</div>")
    body = body[:i] + FOOTER + body[i:]

    html = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE.replace('&', '&amp;')}</title>
<meta name="description" content="{DESC}">
<meta property="og:title" content="{TITLE.replace('&', '&amp;')}">
<meta property="og:description" content="{DESC}">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE_URL}">
<meta name="twitter:card" content="summary">
<style>{theme_css(look)}{SITE_CSS}</style>
<script src="d3.min.js"></script>
<script src="runtime.js"></script>
</head>
<body>
<div id="dash-root" lang="en">
{body}
</div>
<script src="app.js"></script>
<script src="features.js"></script>
<script>dash._start();</script>
</body>
</html>
"""
    open(os.path.join(DOCS, "index.html"), "w", encoding="utf-8").write(html)
    open(os.path.join(DOCS, ".nojekyll"), "w").write("")
    print("docs/ built:", len(rows), "rows")


if __name__ == "__main__":
    main()
