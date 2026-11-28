"""Validate policies_raw.json and write the two files the tracker page reads.

policies.json  -> {rows, meta}: one row per development (in-scope and out-of-scope).
changelog.json -> {rows, meta}: one row per public update, newest first.
"""
import json, re, sys
from datetime import date
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent.parent / "data"
RAW = HERE / "policies_raw.json"
LOG = HERE / "changelog_raw.json"
TODAY = date(2026, 11, 28)

TYPES = {"Strategy & roadmap", "Legislation & regulation", "Funding & incentives",
         "Trade & supply-chain controls", "Programmes & infrastructure",
         "Recommendations & advocacy"}
STATUSES = {"In force / adopted", "Awarded / implemented", "Announced", "Proposed / pending",
            "Reported", "Temporary / suspended", "Recommended", "Withdrawn / corrected"}
REGIONS = {"North America", "Europe", "Asia-Pacific"}
TECH = {"Integrated photonics / PICs", "Silicon photonics", "Compound semis / InP",
        "Optical comms & interconnects", "Quantum photonics", "Lasers, LiDAR & sensing",
        "Lithography & precision optics", "Critical materials",
        "Semiconductors (incl. photonics)", "Photonics (broad)"}
CURRENCIES = {"USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "SGD", "KRW"}
ISO = re.compile(r"\d{4}-\d{2}-\d{2}")

raw = json.loads(RAW.read_text(encoding="utf-8"))
ids = {r["id"] for r in raw}
if len(ids) != len(raw):
    sys.exit("duplicate ids")
groups = {}
for r in raw:
    if r.get("instrument_id"):
        groups.setdefault(r["instrument_id"], []).append(r["id"])

rows = []
for r in raw:
    e = []
    for k in ("date", "added_on", "last_verified"):
        if not ISO.fullmatch(r.get(k) or ""):
            e.append(k)
        elif date.fromisoformat(r[k]) > TODAY:
            e.append(k + " in the future")
    if r.get("watch_date") and not ISO.fullmatch(r["watch_date"]):
        e.append("watch_date")
    if r["date"] < "2020-01-01":
        e.append("date before 2020")
    if r["precision"] not in ("day", "month"):
        e.append("precision")
    if r["type"] not in TYPES: e.append("type " + r["type"])
    if r["status"] not in STATUSES: e.append("status " + r["status"])
    if r["region"] not in REGIONS: e.append("region")
    bad = [t for t in r["tech"] if t not in TECH]
    if bad: e.append("tech " + ", ".join(bad))
    if not re.match(r"https?://", r["url"]): e.append("url")
    if (r.get("amount") is None) != (r.get("currency") is None): e.append("amount/currency")
    if r.get("currency") and r["currency"] not in CURRENCIES: e.append("currency")
    if r.get("photonics_amount") is not None and (not r.get("currency") or r.get("photonics_amount_final") is None): e.append("photonics_amount needs currency and photonics_amount_final")
    if r.get("contained_in") and r["contained_in"] not in ids: e.append("contained_in")
    if r.get("in_scope", True) and r["status"] in ("Proposed / pending", "Reported") and not (r.get("watch_date") or r.get("watch_note")):
        e.append("open item without next milestone")
    if not r.get("in_scope", True) and not r.get("excluded_reason"):
        e.append("out of scope without reason")
    if e:
        sys.exit(f"{r['id']}: {'; '.join(e)}")
    rel = [i for i in groups.get(r.get("instrument_id"), []) if i != r["id"]]
    rows.append({
        "id": r["id"], "date": r["date"], "date_precision": r["precision"], "year": int(r["date"][:4]),
        "jurisdiction": r["jurisdiction"], "region": r["region"], "title": r["title"],
        "type": r["type"], "actor": r["actor"], "technology": "; ".join(r["tech"]),
        "status": r["status"], "scope": r["scope"],
        "amount_local_m": r.get("amount"), "currency": r.get("currency"), "amount_note": r.get("amount_note"),
        "photonics_amount_local_m": r.get("photonics_amount"), "photonics_amount_note": r.get("photonics_amount_note"),
        "photonics_amount_final": r.get("photonics_amount_final"),
        "contained_in": r.get("contained_in"), "instrument_id": r.get("instrument_id"),
        "related_ids": "; ".join(rel) or None,
        "summary": r["summary"], "source": r["source"], "url": r["url"],
        "archive_url": "https://web.archive.org/web/*/" + quote(r["url"], safe=":/?=&%.-_~"),
        "short": r.get("short"), "watch_date": r.get("watch_date"), "watch_note": r.get("watch_note"),
        "added_on": r["added_on"], "last_verified": r["last_verified"],
        "changed_on": r.get("changed_on"), "change_note": r.get("change_note"),
        "in_scope": bool(r.get("in_scope", True)), "excluded_reason": r.get("excluded_reason"),
    })

rows.sort(key=lambda x: (x["date"], x["id"]))
n_in = sum(r["in_scope"] for r in rows)
meta = [
    {"label": "What this is", "value": "A hand-compiled list of photonics policy developments since January 2020. Each row links to its source and was checked against it on the date in last_verified."},
    {"label": "Coverage", "value": f"{n_in} developments in scope, national and EU level, in North America, Europe and Asia-Pacific; selective, not exhaustive. {len(rows) - n_in} rows are kept but marked out of scope (in_scope = false) because their official text does not name photonics, optics, lasers or LiDAR, photonic chips, indium phosphide, gallium or germanium."},
    {"label": "Status", "value": "Status as of last_verified: a final award is 'Awarded / implemented'; a letter of intent or budget announcement is 'Announced'; a formally tabled bill or proposal is 'Proposed / pending'; a press report or leak is 'Reported'."},
    {"label": "Amounts", "value": "amount_local_m and photonics_amount_local_m are millions in the original currency. contained_in names a row whose headline amount already includes this one."},
    {"label": "Dates", "value": "Rows with date_precision = month carry the 1st of the month."},
]
(HERE / "policies.json").write_text(json.dumps({"rows": rows, "meta": meta}, ensure_ascii=False, indent=1), encoding="utf-8")

log = json.loads(LOG.read_text(encoding="utf-8"))
for c in log:
    if not ISO.fullmatch(c["date"]) or not c.get("change"):
        sys.exit("changelog entry " + json.dumps(c))
log.sort(key=lambda c: c["date"], reverse=True)
(HERE / "changelog.json").write_text(json.dumps({"rows": log, "meta": [
    {"label": "What this is", "value": "One entry per public update of the tracker: what was added, changed, corrected or withdrawn."}]},
    ensure_ascii=False, indent=1), encoding="utf-8")
print(len(rows), "rows,", n_in, "in scope ->", (HERE / "policies.json").stat().st_size, "bytes;", len(log), "changelog entries")
