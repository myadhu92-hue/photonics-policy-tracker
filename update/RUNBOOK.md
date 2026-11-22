# Photonics Policy Tracker: update runbook

The tracker: https://claude.ai/artifact/AydPey2ExxPmyrKB7hm4Rp, with a public copy at https://myadhu92-hue.github.io/photonics-policy-tracker/ (built from this repository's `docs/`).
Data lives in two files the page reads: `data/policies.json` (one row per development) and `data/changelog.json` (one entry per public update). Both are built from `data/policies_raw.json` and `data/changelog_raw.json` by `tools/build.py`, which refuses to build if a rule below is broken.

## Cadence

- Roughly every two weeks. The page says "updated roughly every two weeks" and never names the next date.
- Date-triggered checks happen on the date itself, whatever the fortnightly schedule: any `watch_date` that falls due (for example 27 Nov 2026, China's Ga/Ge/Sb pause; 1 Jan 2027, DoD waivers end; 3 Jan 2027, end of the 119th Congress; 10 Jan 2027, China's pause on its October-2025 controls).
- Trade and export-control rows (Ga/Ge/Sb, 1260H, FCC, Section 232) must have been checked within 7 days before the page is shared with anyone new.
- No automatic switch to weekly. The February 2027 review asks two questions: did each update land on time, and how many corrections were needed?

## The rules every row must meet

**Scope (the Broader test).** A photonics-specific measure is in. A broader semiconductor, quantum or critical-materials measure is in only if its official text names photonics, optics, lasers or LiDAR, photonic chips (PICs), indium phosphide, gallium or germanium. A row that fails stays in the data with `in_scope: false` and an `excluded_reason`; it is left off the page, the charts and the CSV.

**Status = status as of `last_verified`.**

| Data value | Shown as | Use for |
|---|---|---|
| In force / adopted | In force | Adopted strategies, laws in effect, controls being applied |
| Awarded / implemented | Awarded or under way | Final awards; programmes or facilities that have started |
| Announced | Announced, not final | Letters of intent, preliminary terms, budget announcements |
| Proposed / pending | Proposed, awaiting decision | Bills and formal proposals that have been tabled |
| Reported | Reported, not confirmed | Plans known only from press reports or leaked drafts |
| Temporary / suspended | Paused or temporary | Measures suspended or in force only until a set date |
| Recommended | Advice or advocacy | Asks from outside government |
| Withdrawn / corrected | Withdrawn | A row found to be wrong. Never delete a row: mark it and log why. |

**Source rule.** Laws and strategies cite the official text where it exists; funding cites the funder; a row naming a company cites an official source or is marked Reported. Summaries are paraphrased, with at most one short quoted phrase.

**Open items.** Every Proposed / pending or Reported row has a `watch_date` or a `watch_note` saying what to watch for.

**Amounts.** `amount` and `photonics_amount` in millions of the original currency. `contained_in` names a row whose headline amount already includes this one. `photonics_amount_final` says whether the photonics share itself is final. Notes give no dollar conversions (the page converts at the fixed rates in `app.js`).

**Advocacy.** Included when an industry association, professional body, research or innovation centre (for example CORNERSTONE), expert network convened for government (for example UKTIN), advisory council or think tank publishes a specific ask on photonics policy at national or EU level. Same rule for every group, including any the owner is connected to. Track the published report or paper; consultation responses and evidence to inquiries are not tracked separately. Regional (sub-national) reports are left out. (Research and innovation centres and expert networks were added to this rule on 22 Nov 2026.)

## Each update, in this order

1. **Watch dates** that have passed or fall before the next update: check each against the official source and update status and note.
2. **All open rows** (Proposed / pending, Reported, Announced, Temporary / suspended): has anything moved?
3. **The 10 rows with the oldest `last_verified`**: re-open the source; fix anything that differs.
4. **New developments** from the fixed search list below, since the last update. Apply the scope test and the source rule before adding.
5. **One deep dive** in rotation: (a) Germany and France, (b) China's provincial optical-chip plans, (c) South Korea; then repeat.
6. Set `last_verified` on every row checked, `added_on` on new rows, and `changed_on` plus a short `change_note` on changed rows (these feed the "New or changed in the latest update" strip).
7. Add one entry to `data/changelog_raw.json` for the update date: what was added, changed, corrected or withdrawn.
8. Run `python3 tools/build.py`. Fix anything it refuses.
9. **Owner approval.** Send the owner the proposed change list and the draft change-log entry. Publish only after approval.
10. **Owner hand-check.** The owner picks 5 random rows and checks them against their sources. Log errors found in `runs/LOG.md` (not on the page), with candidates found versus added.
11. **Publish**: upload the new `data/policies.json` and `data/changelog.json` as assets; update `datasets/policies` and `datasets/changelog` with the new `/_blob/` URLs and `updated.at` (each write needs the document's current version); delete the old assets. Then run `python3 tools/build_site.py` and commit `data/` and `docs/` together, so the public copy matches.
12. **After publishing**: open the page in a private window and on a phone, and the public copy too; confirm "Last updated" shows the new date and the stale notice is gone.

### Fixed search list

- US: NIST CHIPS news; Federal Register (gallium, germanium, LiDAR, optical transceiver, photonics); congress.gov bill actions for S.3597, H.R.8462 and the SAFE LiDAR Act; FCC news; BIS press releases; House Select Committee on the CCP.
- EU: Chips JU news; Council and Parliament (Chips Act 2.0, Quantum Act); Photonics21; EPIC.
- UK: DSIT and CST publications; Photonics Leadership Group news (national photonics roadmap).
- China: MOFCOM announcements (export controls); MIIT and NDRC plans; State Council.
- Japan: METI and NEDO news (photonics-electronics convergence, LSTC); MIC (All-Photonics Network).
- Korea: MSIT. Taiwan: NDC, MOEA. India: PIB (MeitY, ISM). Singapore: EDB, A*STAR. Australia: industry.gov.au, Queensland statements. Canada: ISED, NRC.
- Netherlands and Spain: Rijksoverheid / PhotonDelta; Ministry for Digital Transformation (PERTE Chip).
- Advice and advocacy (added 22 Nov 2026): CORNERSTONE policy outputs (cornerstone.sotonfab.co.uk/policy-outputs) and news; techUK; UKTIN; SPECTARIS photonics positions; PhotonDelta downloads; Photonics France news (Photoniques partner pages); EPIC and Photonics21 position papers; QuIC; NPI, SPIE and Optica policy pages; think tanks (CSIS, CFR, CNAS, Wilson Center, FDD, ITIF); Chinese Academy of Sciences Academic Divisions strategic research; Korea Photonics Industry Association. Also search "photonics white paper" and "photonics position paper" for the period since the last update.
- Trade press as leads only (optics.org, Photonics.com, Semiconductor Today); cite the official source.

## Corrections and withdrawal

- A wrong row: fix it at the next update (or at once if it is a trade-control status), set `changed_on`/`change_note`, and log the correction in the change log. A row that should not exist: status `Withdrawn / corrected`, kept visible.
- To take the whole page down: the owner unshares it on claude.ai. Copies already forwarded or screenshotted cannot be recalled, which is why corrections are logged publicly.
- To stop updating: set `ARCHIVED` in `page/app.js` to the date updates stopped; the page then shows a "no longer updated" notice instead of the stale warning.

## Owner settings in `page/app.js`

- `CONTACT_EMAIL`: an address for problem reports. Empty means "Report a problem" copies a report for the reader to send to whoever shared the page.
- `ARCHIVED`: see above. `STALE_DAYS` (21): after this many days without an update the page shows a neutral "may be out of date" note.

## Look

The page uses its own look, "Photon" (`page/look.json`, stored in the dashboard as `dash/look`): cool paper and ink in light mode, near-black in dark mode, and a validated colour-blind-safe palette for the five government measure types. Advice and advocacy entries are drawn in muted grey on purpose, because they are not government action. Delete `dash/look` to return to the standard look; the page itself names no colours, so nothing else changes.

## Page features that depend on the data (added 21 Nov 2026)
- **Latest developments** shows the six newest entries by date. The line under it counts what the latest change-log date added (`added_on`) and corrected (`changed_on`), so set both fields on every update and add a change-log entry dated the same day.
- **Next deadline** (top of the page) is the soonest `watch_date` from today onward, across all entries. Keep each `watch_note` specific enough to read on its own (name the measure, not just "the bill lapses").
- **Since your last visit** is remembered in each reader's browser only. It compares `added_on` and `changed_on` with the last update date that reader saw, so it only works if those dates are right.
- **Abbreviations** in titles and summaries get hover definitions from the list at the end of `page/features.js`. Add new ones there and to the Glossary in `page/index.html`.

## Scripts
- `tools/build.py` checks `data/policies_raw.json` and `data/changelog_raw.json` against the rules above and writes `data/policies.json` and `data/changelog.json`. Set `TODAY` in it to the update date first, or rows added that day are refused as "in the future".
- `tools/build_site.py` rebuilds the public copy in `docs/` from `page/` and `data/`. Run it after every published update.
- Updates edit `data/policies_raw.json` and `data/changelog_raw.json` directly, then run both scripts.
