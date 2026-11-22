# Tracker database layout (Data artifact type)

Every piece of the tracker lives as a document in the artifact's database. In a new artifact every document starts at version 1.

| Document | Contents | Source in this repo |
| --- | --- | --- |
| `files/index.html` | `{ "text": "<file>" }`: page structure, styles, glossary, Method section | `page/index.html` |
| `files/app.js` | `{ "text": "<file>" }`: data shaping, charts, filters, detail panel, owner settings (`ARTIFACT_URL`, `CONTACT_EMAIL`, `ARCHIVED`, `STALE_DAYS`) | `page/app.js` |
| `files/features.js` | `{ "text": "<file>" }`: abbreviations, next deadline, since-your-last-visit, phone fold | `page/features.js` |
| `dash/look` | The "Photon" colours: `system`, `light`, `dark` | `page/look.json` |
| `dash/meta` | `{ lang, title }` | `setup/dash-meta.json` |
| `dash/params` | Filter state the page reads and writes; every key starts empty | `setup/dash-params.json` |
| `datasets/policies` | Dataset record pointing at the uploaded `policies.json` asset | `setup/dataset-policies.json` |
| `datasets/changelog` | Dataset record pointing at the uploaded `changelog.json` asset | `setup/dataset-changelog.json` |

## Assets
- `data/policies.json` (about 193 KB) and `data/changelog.json` (about 3 KB), built by `tools/build.py`, uploaded as assets.
- Each dataset record's `source.url` must be the asset's `/_blob/<id>` url. When rebuilding on a new account, replace `REPLACE-WITH-NEW-ASSET-ID` with the new asset's id after uploading.
- On each update: upload the new files, update the two dataset records (current `ifVersion` needed), then delete the old assets.

## Field notes
- Page-file documents use the field `text` (not `content`).
- One write must stay under 64 KB. `page/app.js` is close to that: write the first half followed by the line `/*__REST__*/`, then replace that line with the second half using `db_str_replace` on `text`.
- `staleAfterHours` is 504 (21 days), matching `STALE_DAYS` in `page/app.js`.
