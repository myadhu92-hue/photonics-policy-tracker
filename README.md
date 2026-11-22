# Photonics Policy Tracker: North America, Europe & Asia-Pacific

This is a record of what governments, and the groups advising them, have done about photonics since January 2020. It covers strategies, laws and bills, public funding, trade and supply-chain controls, public programmes and infrastructure, and published advice, at national and EU level. Every entry links to its source and was checked against it on the date shown with it.

- **Live page:** https://myadhu92-hue.github.io/photonics-policy-tracker/
- **Data:** [`data/policies.json`](data/policies.json), one row per development, also available as [CSV](docs/data/policies.csv). What each update added, changed or corrected is in [`data/changelog.json`](data/changelog.json).
- **Updated:** roughly every two weeks, and on the day a tracked measure is due to start, end or lapse. Each update is checked against its sources and approved before it's published. The log of updates is in [`runs/`](runs/).

## What counts

**Included:**
- measures aimed at photonics: strategies, laws, funding, controls and programmes
- broader semiconductor, quantum or critical-materials measures, but only if their official text names photonics, optics, lasers or LiDAR, photonic chips (PICs), indium phosphide, gallium or germanium
- published advice: a specific ask on photonics policy at national or EU level from an industry association, professional body, research or innovation centre, expert network convened for government, advisory council or think tank. The same rule applies to every group.

**Left out:**
- regional (sub-national) measures and reports
- the Middle East, Latin America, Africa and multilateral bodies
- consultation responses and evidence to inquiries, which are not tracked separately from the published paper
- measures that fail the scope test above. They stay in the data with `in_scope: false` and an `excluded_reason`, but are left off the page, the charts and the download.

**Status** is the status on the date the entry was last checked (`last_verified`): in force, awarded or under way, announced but not final, proposed and awaiting a decision, reported but not confirmed, paused or temporary, advice, or withdrawn. An entry found to be wrong is never deleted: it is marked withdrawn and the change log says why. Every open item carries the next date or event to watch.

**Amounts** are in millions of the original currency. For ranking only, the page converts them to US dollars at fixed rates, listed under "Method" on the page.

**Coverage:** this is a selective record, not a census. It is thinner for smaller European countries and China's provincial plans.

The full method is under "Method" at the foot of the page.

## What's in this repository

| Folder | What it holds |
|---|---|
| `data/` | `policies_raw.json` and `changelog_raw.json`, the source of truth, and the files built from them that the page reads |
| `page/` | The tracker page: markup, scripts and its colour scheme |
| `docs/` | The static copy served by GitHub Pages, built from `page/` and `data/` by `tools/build_site.py` |
| `tools/` | `build.py` (checks every row against the rules and builds the data files) and `build_site.py` |
| `update/` | The update routine: rules for every row, the order of checks and the fixed search list |
| `setup/` | How the tracker is rebuilt on a Claude account |
| `runs/` | A log of each update: what was searched, found, added and left out |

## Reuse

The compilation and its summaries may be reused under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), credited to the Photonics Policy Tracker. The linked sources keep their own terms. Third-party code is listed in [THIRD-PARTY.md](THIRD-PARTY.md).

Not legal, trade-compliance or investment advice: check the official source before relying on a status, especially for export controls.

An independent personal project, not affiliated with or endorsed by any organisation.
