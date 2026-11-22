# Rebuilding the tracker on a Claude account

These instructions are for Claude, in a chat on the account that will own the tracker. Rebuild it **exactly**: don't change the data, the wording or the design.

## What the tracker is

An artifact made from the **Data** artifact type (dashboards). That type keeps all content in the artifact's database, not in files. The page code reads data and settings through the type's `dash` runtime (`dash.calc`, `dash.draw`, `dash.params`, `dash.setParams`, `dash.onData`, `dash.setLink`). Where each piece goes is in [`db-layout.md`](db-layout.md).

## Route A: a Data type is offered (preferred)

1. `list_types`, then `create_from_type` with the Data type, title `Photonics Policy Tracker: North America, Europe & Asia-Pacific`. Read the type instructions that come back; where they disagree with this file, follow them and tell the owner.
2. Write the database documents listed in `db-layout.md`:
   - `files/index.html`, `files/app.js`, `files/features.js`: each `{ "text": "<file contents>" }`, from the files of the same name in `page/`.
   - `dash/look` from `page/look.json`; `dash/meta` and `dash/params` from `setup/dash-meta.json` and `setup/dash-params.json`.
3. Upload `data/policies.json` and `data/changelog.json` as assets. Write `datasets/policies` and `datasets/changelog` from `setup/dataset-policies.json` and `setup/dataset-changelog.json`, replacing each `source.url` with the new asset's `/_blob/...` url and setting `updated.at` to now.
4. In `page/app.js`, change `ARTIFACT_URL` to the new artifact's link (it builds the links people copy to a single entry), write it, and commit the same change to the repository.
5. Size limit: one database write must stay under 64 KB. `page/app.js` is about 62 KB (nearly 64 KB once JSON-escaped). Write the first half followed by the line `/*__REST__*/`, then replace that line with the second half using `db_str_replace` on field `text`.
6. House rules for the page files: no double quotes or backslashes in `app.js` and `features.js`, and only in the meta and script tags of `index.html`. Data appears only inside `data-draw` elements.

## Route B: no Data type

Port the page to one self-contained HTML file and publish it as an artifact: inline `data/policies.json`, `data/changelog.json` and `page/look.json`, and replace the `dash` calls with plain JavaScript. `tools/site/runtime.js` (used for the public copy in `docs/`) is a working stand-in for those calls. Keep the look, wording, features and the change log, and tell the owner what, if anything, behaves differently.

## Checks after rebuilding

- Masthead: the number of developments shown matches the in-scope rows in `data/policies.json`; "Last updated" matches the newest change-log date; no "may be out of date" note unless the last update is more than 21 days old.
- Latest developments: 6 entries, newest first; the line under it counts what the latest update added and corrected.
- Next deadline: the soonest `watch_date` from today onward.
- Search, filters and the detail panel work; source links open.
- Change log (Method section) starts with the newest entry.
- No errors in the browser console; phone width works; dark mode works.

## Usual problems

- Page shows no entries: a dataset's `source.url` does not match an uploaded asset.
- Build refuses rows "in the future": set `TODAY` in `tools/build.py`.
- Next deadline or the update line stays blank: a drawing does not run while its element is hidden. `page/features.js` unhides them from `dash.onData`; keep that block.
