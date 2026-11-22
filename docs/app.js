(() => {
// Photonics Policy Tracker — calculations, drawings and controls.

const TYPES = ['Strategy & roadmap', 'Legislation & regulation', 'Funding & incentives',
  'Trade & supply-chain controls', 'Programmes & infrastructure', 'Recommendations & advocacy'];
const REGIONS = ['North America', 'Europe', 'Asia-Pacific'];
const STATUS_ORDER = ['In force / adopted', 'Awarded / implemented', 'Announced', 'Proposed / pending',
  'Reported', 'Temporary / suspended', 'Recommended', 'Withdrawn / corrected'];
// Plain words shown to readers; each maps to exactly one status in the data.
const STATUS_PLAIN = {
  'In force / adopted': 'In force',
  'Awarded / implemented': 'Awarded or under way',
  'Announced': 'Announced, not final',
  'Proposed / pending': 'Proposed, awaiting decision',
  'Reported': 'Reported, not confirmed',
  'Temporary / suspended': 'Paused or temporary',
  'Recommended': 'Advice or advocacy',
  'Withdrawn / corrected': 'Withdrawn',
};
// Fixed conversion rates (US dollars per unit), used only to rank amounts.
const FX = { USD: 1, EUR: 1.10, GBP: 1.27, CAD: 0.74, AUD: 0.66, JPY: 0.0068, INR: 0.0115, SGD: 0.75, KRW: 0.00072 };
// Owner settings. CONTACT_EMAIL: an address for problem reports ('' = copy the report instead).
// ARCHIVED: set to the date updates stopped (e.g. '2027-06-30') to show the 'no longer updated' notice.
const ARTIFACT_URL = 'https://myadhu92-hue.github.io/photonics-policy-tracker/';
const CONTACT_EMAIL = '';
const ARCHIVED = '';
const STALE_DAYS = 21;
const TITLE = 'Photonics Policy Tracker: North America, Europe & Asia-Pacific';
const FILTER_KEYS = ['q', 'lens', 'region', 'jurisdiction', 'type', 'tech', 'status', 'scope', 'from', 'to', 'start', 'end'];

window.ppt = window.ppt || { sel: null, sort: { key: 'date', dir: -1 }, cardLimit: 20, rowLimit: 25, watchAll: false, sinceBase: null, hashPending: false };
const S = window.ppt;
{
  const m = /^#row[-=](.+)$/.exec(String(location.hash || ''));
  if (m) { try { S.sel = decodeURIComponent(m[1]); S.hashPending = true; } catch (e) { S.sel = null; } }
}

// ---------- calculations (readers see these in Sources) ----------

dash.calc('in_scope', {
  inputs: ['policies'],
  title: 'Developments in scope',
  description: 'Tracker rows whose official text names photonics or one of its core technologies or materials; rows marked out of scope are left out.',
  fn: (policies) => policies.filter((r) => r.in_scope !== false && r.in_scope !== 'false'),
});

// ---------- shared filter logic: shortcuts, search with related terms, periods ----------

const LENSES = {
  controls: { label: 'Export controls & materials', test: (r) => r.type === 'Trade & supply-chain controls' || String(r.technology || '').includes('Critical materials') },
  funding: { label: 'Public funding', test: (r) => r.type === 'Funding & incentives' },
  chips: { label: 'Photonic chips', test: (r) => ['Integrated photonics / PICs', 'Silicon photonics', 'Compound semis / InP'].some((t) => String(r.technology || '').includes(t)) },
  quantum: { label: 'Quantum', test: (r) => String(r.technology || '').includes('Quantum photonics') },
  uschina: { label: 'US and China', test: (r) => r.jurisdiction === 'United States' || r.jurisdiction === 'China' },
  open: { label: 'Still open', test: (r) => ['Announced', 'Proposed / pending', 'Reported', 'Temporary / suspended'].includes(r.status) },
  new: { label: 'New since your last visit', test: (r) => !!S.sinceBase && String(r.added_on || '') > S.sinceBase },
};
const isNewForYou = (r) => !!S.sinceBase && String(r.added_on || '') > S.sinceBase;
// Search terms that find each other: typing any one also finds the rest.
const SYNONYMS = [
  ['lidar', 'laser radar', 'light detection and ranging'],
  ['inp', 'indium phosphide'],
  ['pic', 'pics', 'photonic integrated circuit', 'photonic chip', 'integrated photonics'],
  ['cpo', 'co-packaged optics', 'copackaged optics'],
  ['siph', 'silicon photonics'],
  ['gallium', 'ga'], ['germanium', 'ge'], ['antimony', 'sb'],
  ['transceiver', 'transceivers', 'optical module'],
  ['us', 'usa', 'united states', 'america'],
  ['uk', 'britain', 'united kingdom'],
  ['eu', 'european union', 'european commission'],
  ['china', 'chinese', 'prc'],
  ['korea', 'korean', 'south korea'],
  ['quantum', 'qubit', 'qubits'],
  ['export control', 'export controls', 'export ban', 'export restrictions'],
  ['pilot line', 'pilot lines', 'foundry', 'fab'],
  ['chips act', 'chips and science act'],
];
const isAlnum = (ch) => !!ch && ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9'));
function findTerm(hay, term) {
  let i = hay.indexOf(term);
  if (term.length > 3) return i;
  while (i >= 0) {
    if (!isAlnum(hay[i - 1]) && !isAlnum(hay[i + term.length])) return i;
    i = hay.indexOf(term, i + 1);
  }
  return -1;
}
function searchTerms(q) {
  const s = String(q || '').toLowerCase().trim();
  if (!s) return [];
  const group = (t) => SYNONYMS.find((g) => g.includes(t));
  if (group(s)) return [group(s)];
  return s.split(' ').map((t) => t.trim()).filter(Boolean).map((t) => group(t) || [t]);
}
function matches(r, p) {
  if (p.region && r.region !== p.region) return false;
  if (p.jurisdiction && r.jurisdiction !== p.jurisdiction) return false;
  if (p.type && r.type !== p.type) return false;
  if (p.tech && !String(r.technology || '').split('; ').includes(p.tech)) return false;
  if (p.status && r.status !== p.status) return false;
  if (p.scope && r.scope !== p.scope) return false;
  if (p.from && Number(r.year) < Number(p.from)) return false;
  if (p.to && Number(r.year) > Number(p.to)) return false;
  if (p.start && String(r.date) < String(p.start)) return false;
  if (p.end && String(r.date) > String(p.end)) return false;
  if (p.lens && LENSES[p.lens] && !LENSES[p.lens].test(r)) return false;
  const terms = searchTerms(p.q);
  if (!terms.length) return true;
  const hay = [r.title, r.summary, r.jurisdiction, r.source, r.technology, r.type, r.actor, r.amount_note, r.id].join(' ').toLowerCase();
  return terms.every((alts) => alts.some((t) => findTerm(hay, t) >= 0));
}
function hlFrag(text, q) {
  const s = String(text ?? '');
  const frag = document.createDocumentFragment();
  const terms = searchTerms(q).flat();
  const low = s.toLowerCase();
  const spans = [];
  terms.forEach((t) => {
    let i = low.indexOf(t);
    while (i >= 0) {
      if (t.length > 3 || (!isAlnum(low[i - 1]) && !isAlnum(low[i + t.length]))) spans.push([i, i + t.length]);
      i = low.indexOf(t, i + 1);
    }
  });
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  spans.forEach(([a, b]) => {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b); else merged.push([a, b]);
  });
  let pos = 0;
  merged.forEach(([a, b]) => {
    if (a > pos) frag.append(s.slice(pos, a));
    const m = document.createElement('mark');
    m.className = 'ppt-hl';
    m.textContent = s.slice(a, b);
    frag.append(m);
    pos = b;
  });
  if (pos < s.length) frag.append(s.slice(pos));
  return frag;
}
function fillHl(el, text) { el.replaceChildren(S.textFrag ? S.textFrag(text, dash.params().q) : hlFrag(text, dash.params().q)); return el; }

dash.calc('filtered', {
  inputs: ['in_scope'],
  title: 'Developments matching the filters',
  description: 'In-scope rows that pass the search box (which also finds related terms, such as InP for indium phosphide), the shortcut, the period and the region, country, type, technology, status, scope and year filters.',
  fn: (inScope) => inScope.filter((r) => matches(r, dash.params())),
});

dash.calc('unperiod', {
  inputs: ['in_scope'],
  title: 'Developments matching the filters, any period',
  description: 'As the filtered list, but ignoring the year and period filters; the strip at the top draws these so that a period can be picked.',
  fn: (inScope) => {
    const q = Object.assign({}, dash.params(), { from: '', to: '', start: '', end: '' });
    return inScope.filter((r) => matches(r, q));
  },
});

dash.calc('relax', {
  inputs: ['in_scope'],
  title: 'What each filter is hiding',
  description: 'For each filter in use, how many developments would show if only that filter were removed.',
  fn: (inScope) => {
    const p = dash.params();
    const groups = [['q'], ['lens'], ['region'], ['jurisdiction'], ['type'], ['tech'], ['status'], ['scope'], ['from', 'to'], ['start', 'end']];
    return groups.filter((g) => g.some((k) => p[k] != null && p[k] !== '')).map((g) => {
      const q = Object.assign({}, p);
      g.forEach((k) => { q[k] = ''; });
      return { filter: g.join('+'), count: inScope.filter((r) => matches(r, q)).length };
    });
  },
});

dash.calc('summary', {
  inputs: ['filtered', 'in_scope', 'policies'],
  title: 'Headline counts',
  description: 'Developments in view, all in-scope developments, countries in view, items awaiting a decision, and rows kept but out of scope.',
  fn: (filtered, inScope, policies) => [{
    entries: filtered.length,
    total: inScope.length,
    jurisdictions: new Set(filtered.map((r) => r.jurisdiction)).size,
    open: filtered.filter((r) => r.status === 'Proposed / pending' || r.status === 'Reported').length,
    excluded: policies.length - inScope.length,
  }],
});

dash.calc('whats_new', {
  inputs: ['in_scope', 'changelog'],
  title: 'New or changed in the latest update',
  description: 'In-scope rows added or changed on the date of the latest change-log entry.',
  fn: (inScope, changelog) => {
    const last = changelog.length ? String(changelog[0].date) : null;
    if (!last) return [];
    return inScope
      .filter((r) => r.added_on === last || r.changed_on === last)
      .sort((a, b) => d3.descending(a.date, b.date))
      .map((r) => ({ id: r.id, date: r.date, date_precision: r.date_precision, jurisdiction: r.jurisdiction,
        title: r.title, kind: r.added_on === last ? 'New' : 'Updated', note: r.change_note || null }));
  },
});

dash.calc('recent', {
  inputs: ['in_scope'],
  title: 'Most recent developments',
  description: 'The six most recent in-scope developments by date.',
  fn: (inScope) => inScope.slice()
    .sort((a, b) => d3.descending(a.date, b.date) || d3.ascending(a.id, b.id))
    .slice(0, 6)
    .map((r) => ({ id: r.id, date: r.date, date_precision: r.date_precision, jurisdiction: r.jurisdiction,
      title: r.title, added_on: r.added_on, kind: 'Recent', note: null })),
});

dash.calc('by_year_type', {
  inputs: ['filtered', 'in_scope'],
  title: 'Developments per year and type',
  description: 'Count of developments in view for each year since 2020 and each type of measure.',
  fn: (filtered, inScope) => {
    const types = ['Strategy & roadmap', 'Legislation & regulation', 'Funding & incentives',
      'Trade & supply-chain controls', 'Programmes & infrastructure', 'Recommendations & advocacy'];
    const last = d3.max(inScope, (r) => Number(r.year)) || 2020;
    const counts = d3.rollup(filtered, (v) => v.length, (r) => Number(r.year), (r) => r.type);
    return d3.range(2020, last + 1).flatMap((year) =>
      types.map((type) => ({ year, type, count: counts.get(year)?.get(type) ?? 0 })));
  },
});

dash.calc('by_jurisdiction', {
  inputs: ['filtered'],
  title: 'Developments per country or the EU',
  description: 'Count of developments in view for each country or the EU, largest first.',
  fn: (filtered) => d3.rollups(filtered, (v) => v.length, (r) => r.jurisdiction)
    .map(([jurisdiction, count]) => ({ jurisdiction, count }))
    .sort((a, b) => d3.descending(a.count, b.count) || d3.ascending(a.jurisdiction, b.jurisdiction)),
});

dash.calc('by_tech', {
  inputs: ['filtered'],
  title: 'Developments per technology',
  description: 'Count of developments in view that touch each technology tag; one development can carry several tags.',
  fn: (filtered) => d3.rollups(
    filtered.flatMap((r) => String(r.technology || '').split('; ').filter(Boolean)),
    (v) => v.length, (t) => t)
    .map(([technology, count]) => ({ technology, count }))
    .sort((a, b) => d3.descending(a.count, b.count) || d3.ascending(a.technology, b.technology)),
});

dash.calc('top_funding', {
  inputs: ['filtered'],
  title: 'Largest amounts earmarked for photonics',
  description: 'The ten largest amounts in view: the headline amount of photonics-specific measures, or the stated photonics share of broader ones, in US dollars at fixed rates. An amount already inside a larger one shown here is left out.',
  fn: (filtered) => {
    const fx = { USD: 1, EUR: 1.10, GBP: 1.27, CAD: 0.74, AUD: 0.66, JPY: 0.0068, INR: 0.0115, SGD: 0.75, KRW: 0.00072 };
    const cand = filtered.map((r) => {
      if (r.scope === 'Photonics-specific' && r.amount_local_m != null) {
        return { r, local: Number(r.amount_local_m), note: r.amount_note, share: false };
      }
      if (r.photonics_amount_local_m != null) {
        return { r, local: Number(r.photonics_amount_local_m), note: r.photonics_amount_note, share: true };
      }
      return null;
    }).filter((c) => c && fx[c.r.currency] != null);
    const whole = new Set(cand.filter((c) => !c.share).map((c) => c.r.id));
    return cand
      .filter((c) => !(c.r.contained_in && whole.has(c.r.contained_in)))
      .map((c) => ({ id: c.r.id, label: c.r.short || c.r.title, title: c.r.title, jurisdiction: c.r.jurisdiction,
        date: c.r.date, status: c.r.status, share: c.share, note: c.note,
        final: c.share ? c.r.photonics_amount_final === true || c.r.photonics_amount_final === 'true'
          : c.r.status === 'Awarded / implemented' || c.r.status === 'In force / adopted',
        usd_m: Math.round(c.local * fx[c.r.currency] * 10) / 10 }))
      .sort((a, b) => d3.descending(a.usd_m, b.usd_m))
      .slice(0, 10);
  },
});

dash.calc('watch', {
  inputs: ['filtered'],
  title: 'Coming up',
  description: 'Scheduled dates from today onward, soonest first, then proposals and reported plans still awaiting a decision, newest first.',
  fn: (filtered) => {
    const today = new Date().toISOString().slice(0, 10);
    const dated = filtered
      .filter((r) => r.watch_date && r.watch_date >= today)
      .sort((a, b) => d3.ascending(a.watch_date, b.watch_date))
      .map((r) => ({ id: r.id, kind: 'Scheduled', date: r.watch_date, jurisdiction: r.jurisdiction, note: r.watch_note, detail: r.title }));
    const open = filtered
      .filter((r) => (r.status === 'Proposed / pending' || r.status === 'Reported') && !dated.some((d) => d.id === r.id))
      .sort((a, b) => d3.descending(a.date, b.date))
      .map((r) => ({ id: r.id, kind: 'Awaiting decision', date: null, jurisdiction: r.jurisdiction, note: r.title, detail: r.watch_note || null }));
    return dated.concat(open);
  },
});

// ---------- helpers ----------

const parseDate = d3.utcParse('%Y-%m-%d');
const fmtDay = d3.utcFormat('%-d %b %Y');
const fmtMonth = d3.utcFormat('%b %Y');
const fmtInt = d3.format(',');
const fmtDate = (iso, precision) => {
  const d = parseDate(String(iso || ''));
  if (!d) return '—';
  return precision === 'month' ? fmtMonth(d) : fmtDay(d);
};
const fmtUsd = (m) => (m >= 1000 ? '$' + d3.format(',.1f')(m / 1000) + 'bn' : '$' + d3.format(m < 10 ? ',.1f' : ',.0f')(m) + 'M');
const plain = (s) => STATUS_PLAIN[s] || s || '—';
const colorOf = (t) => {
  if (t === 'Recommendations & advocacy') return 'var(--color-fg-muted)';
  const c = dash.colors || [];
  const i = Math.max(0, TYPES.indexOf(t));
  return c.length ? c[i % c.length] : 'var(--cds-chart-muted)';
};
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const linkTo = (id) => ARTIFACT_URL + '#row-' + encodeURIComponent(id);
const safeUrl = (u) => { const s = String(u || ''); return /^https?:/i.test(s) ? s : null; };
const DQ = String.fromCharCode(34);
const NL = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const BOM = String.fromCharCode(0xfeff);

// One shape per type, so the timeline does not rely on colour alone.
const SHAPES = [
  null,
  [[1.5, 1.5], [10.5, 1.5], [10.5, 10.5], [1.5, 10.5]],
  [[6, 0.3], [11.7, 6], [6, 11.7], [0.3, 6]],
  [[6, 0.6], [11.6, 10.8], [0.4, 10.8]],
  [[0.4, 1.2], [11.6, 1.2], [6, 11.4]],
  [[4, 0.5], [8, 0.5], [8, 4], [11.5, 4], [11.5, 8], [8, 8], [8, 11.5], [4, 11.5], [4, 8], [0.5, 8], [0.5, 4], [4, 4]],
];
function shapeD(type, x, y, r) {
  const pts = SHAPES[Math.max(0, TYPES.indexOf(type))];
  if (!pts) return `M${x - r},${y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  const k = r / 5.5;
  return 'M' + pts.map(([a, b]) => `${(x + (a - 6) * k).toFixed(2)},${(y + (b - 6) * k).toFixed(2)}`).join('L') + 'Z';
}

function rowsOf(id) {
  const d = dash.data(id);
  return d.status === 'ok' && Array.isArray(d.data) ? d.data : null;
}
function statusOf(id) { return dash.data(id).status; }
function loadingClass(el, id) { el.classList.toggle('dash-skeleton', statusOf(id) === 'loading'); }
function placeholder(id) { return statusOf(id) === 'error' ? 'Failed to load' : '—'; }

function mk(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function mark(n, source, field, where) {
  n.setAttribute('data-source', source);
  if (field) n.setAttribute('data-field', field);
  if (where) n.setAttribute('data-where', where);
  return n;
}
const whereId = (id) => 'id=' + encodeURIComponent(id);

function statusDotClass(s) {
  if (s === 'Proposed / pending') return 'ppt-dot ppt-dot--pending';
  if (s === 'Reported' || s === 'Announced') return 'ppt-dot ppt-dot--open';
  if (s === 'Temporary / suspended' || s === 'Withdrawn / corrected') return 'ppt-dot ppt-dot--temp';
  if (s === 'In force / adopted' || s === 'Awarded / implemented') return 'ppt-dot ppt-dot--done';
  return 'ppt-dot';
}
function statusPill(s) {
  const p = mk('span', 'ppt-pill');
  p.append(mk('span', statusDotClass(s)), document.createTextNode(plain(s)));
  return p;
}
function symbol(type, hollow) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ppt-sym');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', shapeD(type, 6, 6, 5.2));
  p.style.fill = hollow ? 'none' : colorOf(type);
  if (hollow) { p.style.stroke = colorOf(type); p.style.strokeWidth = '1.6'; }
  svg.append(p);
  return svg;
}
const TYPE_TABLE = { 'Strategy & roadmap': 'Strategy', 'Legislation & regulation': 'Legislation', 'Funding & incentives': 'Funding',
  'Trade & supply-chain controls': 'Trade controls', 'Programmes & infrastructure': 'Programmes', 'Recommendations & advocacy': 'Advice' };
function typePill(t, short) {
  const p = mk('span', 'ppt-pill');
  p.append(symbol(t), document.createTextNode(short && TYPE_TABLE[t] ? TYPE_TABLE[t] : t === 'Recommendations & advocacy' ? 'Advice & advocacy' : (t || '—')));
  if (short) p.title = t;
  return p;
}
function extLink(text, url, cls) {
  const u = safeUrl(url);
  if (!u) return mk('span', cls, text);
  const a = mk('a', cls || 'ppt-link', text);
  a.href = u;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}
async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through */ }
  return false;
}

function selectEntry(id, scroll) {
  S.sel = id;
  try { if (typeof dash.setLink === 'function') dash.setLink('row-' + id); } catch (e) { /* links unavailable */ }
  dash.draw('detail');
  dash.draw('timeline');
  dash.draw('rows');
  dash.draw('spectrum');
  const beside = window.matchMedia && window.matchMedia('(min-width: 1100px)').matches;
  if (scroll && !(scroll === 'auto' && beside)) {
    document.querySelectorAll('#detail').forEach((d) =>
      d.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }));
  }
}
// Step through the developments in view, newest first: dir 1 is older, -1 is newer.
function stepEntry(dir) {
  const rows = rowsOf('filtered');
  if (!rows || !rows.length) return;
  const order = rows.slice().sort((a, b) => d3.descending(a.date, b.date) || d3.ascending(a.id, b.id));
  const i = Math.max(0, order.findIndex((x) => x.id === S.sel));
  const j = i + dir;
  if (j >= 0 && j < order.length) selectEntry(order[j].id, 'auto');
}
function toggleParam(name, value) {
  const cur = dash.params()[name];
  dash.setParams({ [name]: String(cur ?? '') === String(value) ? null : String(value) });
}

function placeTip(el, tipNode, x, y) {
  const w = el.clientWidth;
  tipNode.hidden = false;
  const tw = tipNode.offsetWidth;
  const th = tipNode.offsetHeight;
  let left = x + 14;
  if (left + tw > w) left = Math.max(0, x - tw - 14);
  let top = y - th - 10;
  if (top < 0) top = y + 14;
  tipNode.style.left = left + 'px';
  tipNode.style.top = top + 'px';
}
function fillTip(tipNode, lines) {
  tipNode.replaceChildren(...lines.map(([cls, text]) => mk('div', cls, text)));
}

function csvOf(rows) {
  const cols = ['id', 'date', 'date_precision', 'country_or_eu', 'region', 'title', 'type', 'status', 'status_as_of',
    'technology', 'scope', 'headline_amount', 'photonics_share', 'summary', 'source', 'source_url', 'archived_copies',
    'tracker_link', 'reuse'];
  const q = (v) => DQ + String(v ?? '').split(DQ).join(DQ + DQ) + DQ;
  const lines = rows.map((r) => [r.id, r.date, r.date_precision, r.jurisdiction, r.region, r.title, r.type, plain(r.status),
    r.last_verified, r.technology, r.scope, r.amount_note, r.photonics_amount_note, r.summary, r.source, r.url, r.archive_url,
    linkTo(r.id), 'Summary CC BY 4.0, credit ' + TITLE + '; the source keeps its own terms'].map(q).join(','));
  return BOM + cols.join(',') + CRLF + lines.join(CRLF) + CRLF;
}

// ---------- listeners (outside drawings: listen and set allowed attributes only) ----------

document.querySelectorAll('.ppt-leg[data-type]').forEach((b) => {
  const t = b.getAttribute('data-type');
  b.querySelectorAll('.ppt-sym *').forEach((s) => { s.style.fill = colorOf(t); });
  b.addEventListener('click', () => toggleParam('type', t));
});

document.querySelectorAll('#filters').forEach((f) => f.addEventListener('submit', (e) => e.preventDefault()));

document.querySelectorAll('#ppt-q').forEach((inp) => {
  let timer;
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => dash.setParams({ q: inp.value.trim() || null }), 250);
  });
});

document.querySelectorAll('#ppt-reset').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#ppt-q').forEach((i) => { i.value = ''; });
  S.sel = null;
  S.cardLimit = 20;
  S.rowLimit = 25;
  const keep = { country: dash.params().country || null, compare: dash.params().compare || null };
  dash.resetParams();
  if (keep.country) dash.setParams(keep);
}));

document.querySelectorAll('#ppt-to-about').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#about').forEach((d) => {
    d.open = true;
    d.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  });
}));

document.querySelectorAll('#ppt-more-cards').forEach((b) => b.addEventListener('click', () => {
  S.cardLimit += 20;
  dash.draw('cards');
}));
document.querySelectorAll('#ppt-more-rows').forEach((b) => b.addEventListener('click', () => {
  const collapsing = S.rowLimit > 1000;
  S.rowLimit = collapsing ? 25 : 100000;
  dash.draw('rows');
  if (collapsing) document.querySelectorAll('#all-developments').forEach((t) => t.scrollIntoView({ block: 'start' }));
}));
document.querySelectorAll('#ppt-more-watch').forEach((b) => b.addEventListener('click', () => {
  S.watchAll = !S.watchAll;
  dash.draw('watch');
  if (!S.watchAll) document.querySelectorAll('#watch').forEach((t) => t.scrollIntoView({ block: 'start' }));
}));

const CSV_MSGS = ['#csv-ok', '#csv-copied', '#csv-declined', '#csv-fail'];
function csvMsg(which) {
  CSV_MSGS.forEach((s) => document.querySelectorAll(s).forEach((n) => { n.hidden = s !== which; }));
}
document.querySelectorAll('#ppt-csv').forEach((b) => b.addEventListener('click', async () => {
  csvMsg(null);
  const rows = rowsOf('filtered');
  if (!rows || !rows.length) return;
  b.disabled = true;
  const csv = csvOf(rows);
  const name = 'photonics-policy-tracker-' + new Date().toISOString().slice(0, 10) + '.csv';
  let dl = null;
  try { dl = globalThis.claude && typeof globalThis.claude.use === 'function' ? await globalThis.claude.use('downloads') : null; } catch (e) { dl = null; }
  try {
    if (dl) {
      try { await dl.save({ filename: name, data: csv }); csvMsg('#csv-ok'); return; } catch (e) {
        if (e && (e.code === 'declined' || e.code === 'rate_limited')) { csvMsg('#csv-declined'); return; }
      }
    }
    csvMsg((await copyText(csv)) ? '#csv-copied' : '#csv-fail');
  } finally { b.disabled = false; }
}));

document.querySelectorAll('.ppt-table th[data-sort]').forEach((th) => {
  const go = () => {
    const k = th.getAttribute('data-sort');
    const dir = S.sort.key === k ? -S.sort.dir : (k === 'date' || k === 'amount' ? -1 : 1);
    S.sort = { key: k, dir };
    document.querySelectorAll('.ppt-table th[data-sort]').forEach((h) =>
      h.setAttribute('aria-sort', h === th ? (dir < 0 ? 'descending' : 'ascending') : 'none'));
    dash.draw('rows');
  };
  th.addEventListener('click', go);
  th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});

dash.onData(() => {
  if (dash.colors && dash.colors[0]) document.querySelectorAll('.ppt').forEach((n) => n.style.setProperty('--ppt-accent', dash.colors[0]));
  const p = dash.params();
  const t = p.type || '';
  document.querySelectorAll('.ppt-leg[data-type]').forEach((b) => {
    const on = b.getAttribute('data-type') === t;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.classList.toggle('is-dim', !!t && !on);
  });
  const any = FILTER_KEYS.some((k) => p[k] != null && p[k] !== '');
  document.querySelectorAll('#ppt-reset').forEach((b) => { b.disabled = !any; });
  const moreOn = ['jurisdiction', 'tech', 'status', 'scope', 'from', 'to'].some((k) => p[k] != null && p[k] !== '');
  if (moreOn) document.querySelectorAll('#more-filters').forEach((d) => { d.open = true; });

  const log = rowsOf('changelog');
  const last = log && log[0] ? parseDate(String(log[0].date)) : null;
  const archived = !!ARCHIVED;
  const stale = !archived && last && (Date.now() - last.getTime()) / 864e5 > STALE_DAYS;
  document.querySelectorAll('#ppt-archived').forEach((n) => { n.hidden = !archived; });
  document.querySelectorAll('#ppt-stale').forEach((n) => { n.hidden = !stale; });

  if (S.hashPending) {
    const all = rowsOf('in_scope');
    if (all) {
      S.hashPending = false;
      if (all.some((r) => r.id === S.sel)) {
        setTimeout(() => document.querySelectorAll('#detail').forEach((d) => d.scrollIntoView({ block: 'start' })), 60);
      } else {
        S.sel = null;
      }
    }
  }
});

// ---------- text drawings ----------

function summaryText(name, field, fmt) {
  dash.draw(name, (el) => {
    loadingClass(el, 'summary');
    const r = rowsOf('summary');
    const v = r && r[0] ? r[0][field] : null;
    el.textContent = v == null ? placeholder('summary') : (fmt ? fmt(v) : String(v));
  });
}
summaryText('k-entries', 'entries', fmtInt);
summaryText('k-juris', 'jurisdictions', fmtInt);
summaryText('k-open', 'open', fmtInt);
summaryText('excluded', 'excluded', fmtInt);

function logDate(name) {
  dash.draw(name, (el) => {
    loadingClass(el, 'changelog');
    const r = rowsOf('changelog');
    el.textContent = r && r[0] ? fmtDate(r[0].date, 'day') : placeholder('changelog');
  });
}
logDate('updated');
logDate('cite-date');

dash.draw('showing', (el) => {
  const r = rowsOf('summary');
  if (!r || !r[0]) { el.textContent = '—'; return; }
  const a = mark(mk('b', null, fmtInt(r[0].entries)), 'summary', 'entries');
  const b = mark(mk('b', null, fmtInt(r[0].total)), 'summary', 'total');
  a.setAttribute('data-row', '0');
  b.setAttribute('data-row', '0');
  el.replaceChildren(document.createTextNode('Showing '), a, document.createTextNode(' of '), b);
});

dash.draw('new-list', (el) => {
  const id = 'recent';
  const rows = rowsOf('recent');
  el.replaceChildren();
  if (!rows) { el.append(mk('li', 'ppt-msg', placeholder(id))); return; }
  rows.forEach((r, i) => {
    const li = mk('li');
    const btn = mk('button', 'ppt-new-btn');
    btn.type = 'button';
    const d = mark(mk('span', 'ppt-new-d', fmtDate(r.date, r.date_precision)), id, 'date');
    d.setAttribute('data-row', String(i));
    const body = mk('span', 'ppt-new-b');
    const j = mark(mk('span', 'ppt-new-j', r.jurisdiction), id, 'jurisdiction');
    j.setAttribute('data-row', String(i));
    const t = mark(fillHl(mk('span', 'ppt-new-t'), r.title), id, 'title');
    t.setAttribute('data-row', String(i));
    body.append(j, t);
    if (r.note) body.append(mk('span', 'ppt-new-j', r.note));
    btn.append(d, body);
    btn.addEventListener('click', () => selectEntry(r.id, true));
    li.append(btn);
    el.append(li);
  });
});

dash.draw('changelog', (el) => {
  const r = rowsOf('changelog');
  el.replaceChildren();
  if (!r) { el.append(mk('li', 'ppt-msg', placeholder('changelog'))); return; }
  r.forEach((c, i) => {
    const li = mk('li');
    const d = mark(mk('b', null, fmtDate(c.date, 'day')), 'changelog', 'date');
    d.setAttribute('data-row', String(i));
    const t = mark(mk('span', null, c.change), 'changelog', 'change');
    t.setAttribute('data-row', String(i));
    li.append(d, document.createTextNode(': '), t);
    el.append(li);
  });
});

dash.draw('fx', (el) => {
  el.replaceChildren(...Object.entries(FX).map(([cur, rate]) => {
    const tr = mk('tr');
    tr.append(mk('td', null, cur), mk('td', null, String(rate)));
    return tr;
  }));
});

// ---------- filter controls ----------

function selectDraw(name, param, allLabel, optionsFn) {
  dash.draw(name, (sel) => {
    const rows = rowsOf('in_scope') || [];
    const opts = optionsFn(rows).map((o) => (typeof o === 'object' ? o : { value: String(o), label: String(o) }));
    const cur = String(dash.params()[param] ?? '');
    sel.replaceChildren(new Option(allLabel, ''), ...opts.map((o) => new Option(o.label, o.value)));
    sel.value = opts.some((o) => o.value === cur) ? cur : '';
    sel.onchange = () => dash.setParams({ [param]: sel.value || null });
  });
}
const yearsOf = (rows) => [...new Set(rows.map((r) => Number(r.year)))].filter(Boolean).sort(d3.ascending);
selectDraw('f-region', 'region', 'All regions', (rows) => REGIONS.filter((g) => rows.some((r) => r.region === g)));
selectDraw('f-type', 'type', 'All types of measure',
  () => TYPES.map((t) => ({ value: t, label: t === 'Recommendations & advocacy' ? 'Advice & advocacy' : t })));
selectDraw('f-jurisdiction', 'jurisdiction', 'All countries and the EU',
  (rows) => [...new Set(rows.map((r) => r.jurisdiction))].sort(d3.ascending));
selectDraw('f-tech', 'tech', 'All technologies',
  (rows) => [...new Set(rows.flatMap((r) => String(r.technology || '').split('; ').filter(Boolean)))].sort(d3.ascending));
selectDraw('f-status', 'status', 'Any status',
  (rows) => STATUS_ORDER.filter((s) => rows.some((r) => r.status === s)).map((s) => ({ value: s, label: plain(s) })));
selectDraw('f-scope', 'scope', 'Photonics-specific or broader',
  () => [{ value: 'Photonics-specific', label: 'Photonics-specific only' }, { value: 'Broader (photonics included)', label: 'Broader measures that name photonics' }]);
selectDraw('f-from', 'from', 'From any year', (rows) => yearsOf(rows).map((y) => ({ value: String(y), label: 'From ' + y })));
selectDraw('f-to', 'to', 'To any year', (rows) => yearsOf(rows).map((y) => ({ value: String(y), label: 'To ' + y })));

// ---------- timeline ----------

dash.draw('timeline', {
  mount(el) {
    const svg = d3.select(el).append('svg').attr('class', 'ppt-svg').attr('role', 'img');
    const msg = mk('div', 'ppt-msg');
    const tip = mk('div', 'ppt-tip');
    tip.hidden = true;
    el.append(msg, tip);
    return { svg, msg, tip };
  },
  update(el, m) {
    loadingClass(el, 'filtered');
    const rows = rowsOf('filtered');
    m.tip.hidden = true;
    if (!rows) { m.svg.selectAll('*').remove(); m.svg.attr('height', 0); m.msg.textContent = placeholder('filtered'); return; }
    m.msg.textContent = rows.length ? '' : 'No developments match the filters.';
    const all = rowsOf('in_scope') || rows;
    const W = Math.max(280, el.clientWidth);
    const narrow = W < 560;
    const laneH = narrow ? 96 : 112;
    const mg = { top: 6, right: 16, bottom: 24, left: 16 };
    const H = mg.top + REGIONS.length * laneH + mg.bottom;
    const now = new Date();
    const maxD = d3.max([...all.map((r) => parseDate(r.date)).filter(Boolean), now]);
    const pp = dash.params();
    const d0 = (pp.start && parseDate(String(pp.start))) || (pp.from ? new Date(Date.UTC(Number(pp.from), 0, 1)) : new Date(Date.UTC(2020, 0, 1)));
    const d1 = (pp.end && d3.utcDay.offset(parseDate(String(pp.end)), 1)) || (pp.to ? new Date(Date.UTC(Number(pp.to) + 1, 0, 1)) : d3.utcMonth.offset(maxD, 2));
    const x = d3.scaleUtc([d0, d1], [mg.left, W - mg.right]);
    const spanDays = (d1 - d0) / 864e5;
    const rad = narrow ? 4.8 : 5.8;
    const step = 2 * rad + 1.5;

    const pts = [];
    REGIONS.forEach((region, li) => {
      const top = mg.top + li * laneH;
      const cy0 = top + laneH / 2 + 8;
      const maxOff = laneH / 2 - 15;
      const placed = [];
      rows.filter((r) => r.region === region)
        .sort((a, b) => d3.ascending(a.date, b.date) || d3.ascending(a.id, b.id))
        .forEach((r) => {
          const d = parseDate(r.date);
          if (!d) return;
          const cx = x(d);
          let cy = null;
          for (let k = 0; k < 40; k++) {
            const off = Math.ceil(k / 2) * step * 0.92 * (k % 2 ? -1 : 1);
            if (Math.abs(off) > maxOff) break;
            const c = cy0 + off;
            if (!placed.some((p) => (p.cx - cx) ** 2 + (p.cy - c) ** 2 < step * step)) { cy = c; break; }
          }
          if (cy == null) cy = cy0 + ((placed.length % 5) - 2) * 3;
          const p = { r, cx, cy };
          placed.push(p);
          pts.push(p);
        });
    });

    const svg = m.svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', H)
      .attr('aria-label', `Timeline of ${rows.length} photonics policy developments by region since 2020; shape and colour show the type of measure. The list and table on this page give the same entries as text.`);
    svg.selectAll('*').remove();

    const lanes = svg.append('g');
    REGIONS.forEach((region, li) => {
      const top = mg.top + li * laneH;
      lanes.append('rect').attr('class', li % 2 ? 'ppt-lane-band is-alt' : 'ppt-lane-band').attr('x', 0).attr('y', top)
        .attr('width', W).attr('height', laneH).attr('rx', 4);
      const n = rows.filter((r) => r.region === region).length;
      lanes.append('text').attr('class', 'ppt-lane-label').attr('x', mg.left + 4).attr('y', top + 21).text(region)
        .append('tspan').attr('class', 'ppt-axis-label').attr('dx', 8).text(String(n));
    });

    const axis = svg.append('g').attr('transform', `translate(0,${H - mg.bottom})`)
      .call(d3.axisBottom(x).ticks(spanDays > 900 ? d3.utcYear.every(1) : d3.utcMonth.every(spanDays > 400 ? 3 : 1))
        .tickFormat((d) => (d.getUTCMonth() === 0 ? d3.utcFormat('%Y')(d) : d3.utcFormat('%b')(d)))
        .tickSize(-(H - mg.top - mg.bottom)).tickPadding(6));
    axis.selectAll('.tick line').style('stroke', 'var(--cds-chart-grid)').style('stroke-dasharray', '2 3');

    const tx = x(now);
    const showToday = tx >= mg.left && tx <= W - mg.right;
    if (showToday) svg.append('line').attr('x1', tx).attr('x2', tx).attr('y1', mg.top).attr('y2', H - mg.bottom)
      .attr('class', 'ppt-today');
    if (showToday) svg.append('text').attr('class', 'ppt-today-label').attr('x', tx - 4).attr('y', mg.top + 12)
      .attr('text-anchor', 'end').text('Today');

    const tipFor = (p) => {
      const r = p.r;
      fillTip(m.tip, [
        ['ppt-tip-k', `${fmtDate(r.date, r.date_precision)} · ${r.jurisdiction}`],
        ['ppt-tip-t', r.title],
        ['ppt-tip-k', `${r.type === 'Recommendations & advocacy' ? 'Advice & advocacy' : r.type} · ${plain(r.status)}`],
      ]);
      placeTip(el, m.tip, p.cx * (el.clientWidth / W), p.cy);
    };
    const month = (p) => p.r.date_precision === 'month';
    const marks = svg.append('g').selectAll('path').data(pts, (p) => p.r.id).join('path')
      .attr('class', 'ppt-mark')
      .attr('d', (p) => shapeD(p.r.type, p.cx, p.cy, p.r.id === S.sel ? rad + 2.5 : rad))
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (p) => `${fmtDate(p.r.date, p.r.date_precision)}, ${p.r.jurisdiction}: ${p.r.title}. ${p.r.type}, ${plain(p.r.status)}.`)
      .style('fill', (p) => (month(p) ? 'var(--color-bg)' : colorOf(p.r.type)))
      .style('stroke', (p) => (p.r.id === S.sel ? 'var(--color-fg)' : (month(p) ? colorOf(p.r.type) : 'var(--color-bg)')))
      .style('stroke-width', (p) => (p.r.id === S.sel ? 2.5 : (month(p) ? 1.8 : 1.2)))
      .on('focus', (ev, p) => tipFor(p))
      .on('blur', () => { m.tip.hidden = true; })
      .on('keydown', (ev, p) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectEntry(p.r.id, 'auto'); } });

    if (!pts.length) return;
    const delaunay = d3.Delaunay.from(pts, (p) => p.cx, (p) => p.cy);
    const nearest = (ev) => {
      const [mx, my] = d3.pointer(ev, svg.node());
      const i = delaunay.find(mx, my);
      const p = pts[i];
      return p && Math.hypot(p.cx - mx, p.cy - my) <= 22 ? p : null;
    };
    const hide = () => { m.tip.hidden = true; marks.style('opacity', 1); };
    svg.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H)
      .style('fill', 'transparent').attr('class', 'ppt-clickable')
      .on('pointermove', (ev) => {
        const p = nearest(ev);
        if (!p) { hide(); return; }
        marks.style('opacity', (q) => (q === p ? 1 : 0.55));
        tipFor(p);
      })
      .on('pointerleave', hide)
      .on('click', (ev) => { const p = nearest(ev); if (p) selectEntry(p.r.id, 'auto'); });
  },
});

// ---------- card list (narrow screens) ----------

dash.draw('cards', (el) => {
  const rows = rowsOf('filtered');
  el.replaceChildren();
  const moreBtns = document.querySelectorAll('#ppt-more-cards');
  if (!rows) { el.append(mk('li', 'ppt-msg', placeholder('filtered'))); moreBtns.forEach((b) => { b.hidden = true; }); return; }
  if (!rows.length) { el.append(mk('li', 'ppt-msg', 'No developments match the filters.')); moreBtns.forEach((b) => { b.hidden = true; }); return; }
  const sorted = rows.slice().sort((a, b) => d3.descending(a.date, b.date) || d3.ascending(a.id, b.id));
  sorted.slice(0, S.cardLimit).forEach((r) => {
    const w = whereId(r.id);
    const li = mk('li', 'ppt-c');
    li.setAttribute('data-key', encodeURIComponent(r.id));
    const k = mk('div', 'ppt-c-k');
    k.append(mark(mk('span', null, fmtDate(r.date, r.date_precision)), 'filtered', 'date', w), document.createTextNode(' '),
      mark(mk('span', null, r.jurisdiction), 'filtered', 'jurisdiction', w), mark(typePill(r.type), 'filtered', 'type', w),
      mark(statusPill(r.status), 'filtered', 'status', w));
    const t = mark(fillHl(mk('h3', 'ppt-c-t'), r.title), 'filtered', 'title', w);
    const s = mark(fillHl(mk('p', 'ppt-c-s'), r.summary), 'filtered', 'summary', w);
    const a = mk('div', 'ppt-c-a');
    a.append(extLink(`${r.source} ↗`, r.url));
    const more = mk('button', 'ppt-btn', 'Details');
    more.type = 'button';
    more.addEventListener('click', () => selectEntry(r.id, true));
    a.append(more);
    li.append(k, t, s, a);
    el.append(li);
  });
  const left = sorted.length - S.cardLimit;
  moreBtns.forEach((b) => { b.hidden = left <= 0; b.setAttribute('aria-label', left > 0 ? `Show ${Math.min(20, left)} more of ${left} remaining` : 'Show more'); });
});

// ---------- detail card ----------

dash.draw('detail', (el) => {
  loadingClass(el, 'in_scope');
  const all = rowsOf('in_scope');
  if (!all || !all.length) { el.textContent = all ? 'No developments yet.' : placeholder('in_scope'); return; }
  const inView = rowsOf('filtered');
  let r = S.sel ? all.find((x) => x.id === S.sel) : null;
  const isSel = !!r;
  const order = (inView && inView.length ? inView : all).slice()
    .sort((a, b) => d3.descending(a.date, b.date) || d3.ascending(a.id, b.id));
  if (!r) r = order[0];
  const pos = order.findIndex((x) => x.id === r.id);
  document.querySelectorAll('#detail').forEach((d) => d.classList.toggle('is-idle', !isSel));
  document.querySelectorAll('#detail-latest-label').forEach((n) => { n.hidden = isSel; });
  document.querySelectorAll('#detail-sel-label').forEach((n) => { n.hidden = !isSel; });
  const w = whereId(r.id);
  const f = (tag, cls, text, field) => mark(mk(tag, cls, text), 'in_scope', field, w);
  document.querySelectorAll('#detail').forEach((d) => d.style.setProperty('--ppt-type', colorOf(r.type)));

  const meta = mk('div', 'ppt-d-meta');
  meta.append(f('span', null, fmtDate(r.date, r.date_precision), 'date'), document.createTextNode(' '),
    f('span', null, r.jurisdiction, 'jurisdiction'), document.createTextNode(' '), f('span', null, r.region, 'region'));
  const title = fillHl(f('h3', 'ppt-d-title', r.title, 'title'), r.title);
  const tags = mk('div', 'ppt-d-tags');
  tags.append(mark(typePill(r.type), 'in_scope', 'type', w), mark(statusPill(r.status), 'in_scope', 'status', w),
    f('span', 'ppt-pill', r.scope, 'scope'));
  const summary = fillHl(f('p', 'ppt-d-summary', r.summary, 'summary'), r.summary);

  const dl = mk('dl', 'ppt-d-dl');
  const item = (label, ...nodes) => { dl.append(mk('dt', null, label)); const dd = mk('dd'); dd.append(...nodes); dl.append(dd); };
  item('Status', document.createTextNode(plain(r.status) + ', as of '), f('span', null, fmtDate(r.last_verified, 'day'), 'last_verified'));
  const src = mark(extLink(`${r.source} ↗`, r.url), 'in_scope', 'source', w);
  const arch = extLink('saved copies', r.archive_url);
  item('Source', src, document.createTextNode(' '), arch);
  item('Source checked', f('span', null, fmtDate(r.last_verified, 'day'), 'last_verified'));
  item('Technology', f('span', null, r.technology, 'technology'));
  item('Who acted', f('span', null, r.actor, 'actor'));
  if (r.amount_note) item('Headline amount', f('span', null, r.amount_note, 'amount_note'));
  if (r.photonics_amount_note) item('For photonics', f('span', null, r.photonics_amount_note, 'photonics_amount_note'));
  const byId = new Map(all.map((x) => [x.id, x]));
  const jump = (x) => {
    const b = mk('button', 'ppt-linkbtn', `${fmtDate(x.date, x.date_precision)} · ${x.jurisdiction}: ${x.title}`);
    b.type = 'button';
    b.addEventListener('click', () => selectEntry(x.id, true));
    return b;
  };
  if (r.contained_in && byId.has(r.contained_in)) item('Part of', jump(byId.get(r.contained_in)));
  if (r.watch_date || r.watch_note) {
    item('Coming up', f('span', null, (r.watch_date ? fmtDate(r.watch_date, 'day') + ': ' : '') + (r.watch_note || ''), 'watch_note'));
  }
  const rel = String(r.related_ids || '').split('; ').filter((i) => i && byId.has(i)).map((i) => byId.get(i))
    .sort((a, b) => d3.ascending(a.date, b.date));
  if (rel.length) {
    const ul = mk('ul', 'ppt-d-related');
    rel.forEach((x) => { const li = mk('li'); li.append(jump(x)); ul.append(li); });
    item('Related developments', ul);
  }

  const actions = mk('div', 'ppt-d-actions');
  const done = mk('span', 'ppt-d-done');
  done.setAttribute('role', 'status');
  const area = mk('textarea', 'ppt-d-copy');
  area.readOnly = true;
  area.hidden = true;
  area.setAttribute('aria-label', 'Text to copy');
  const offer = async (text, okMsg) => {
    if (await copyText(text)) { area.hidden = true; done.textContent = okMsg; return; }
    area.value = text;
    area.hidden = false;
    area.focus();
    area.select();
    done.textContent = 'Copy the selected text below.';
  };
  const link = linkTo(r.id);
  const btn = (label, fn) => { const b = mk('button', 'ppt-btn', label); b.type = 'button'; b.addEventListener('click', fn); actions.append(b); };
  btn('Copy link', () => offer(link, 'Link copied.'));
  btn('Copy citation', () => offer(
    `${r.title}. ${r.jurisdiction}, ${fmtDate(r.date, r.date_precision)}. Source: ${r.source}, ${r.url}. ` +
    `Listed in ${TITLE} (independent personal project), entry ${r.id}, checked ${fmtDate(r.last_verified, 'day')}. ${link}`,
    'Citation copied.'));
  const report = `Problem report: ${TITLE}${NL}Entry: ${r.id}, “${r.title}” (${fmtDate(r.date, r.date_precision)})${NL}Link: ${link}${NL}` +
    'What is wrong, and a source if you have one:' + NL;
  if (CONTACT_EMAIL) {
    const a = mk('a', 'ppt-btn', 'Report a problem');
    a.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Tracker problem: ' + r.id) + '&body=' + encodeURIComponent(report);
    actions.append(a);
  } else {
    btn('Report a problem', () => offer(report, 'Problem report copied: add what is wrong and send it to whoever shared this page with you.'));
  }
  actions.append(done);
  const nav = mk('div', 'ppt-d-nav');
  const navBtn = (label, dir, off, hint) => {
    const b = mk('button', 'ppt-btn', label);
    b.type = 'button';
    b.disabled = off;
    b.setAttribute('aria-label', hint);
    b.addEventListener('click', () => stepEntry(dir));
    return b;
  };
  nav.append(navBtn('‹ Older', 1, pos < 0 || pos >= order.length - 1, 'Older development (left arrow key)'),
    mk('span', 'ppt-d-pos', pos >= 0 ? `${pos + 1} of ${order.length}` : 'Not in view'),
    navBtn('Newer ›', -1, pos <= 0, 'Newer development (right arrow key)'));
  if (isSel) {
    const c = mk('button', 'ppt-linkbtn ppt-d-close');
    c.append(mk('span', 'ppt-wide-only', 'Back to the latest'), mk('span', 'ppt-phone-only', 'Close and return to the list'));
    c.type = 'button';
    c.addEventListener('click', () => {
      const was = S.sel;
      S.sel = null;
      ['detail', 'timeline', 'rows', 'spectrum'].forEach((n) => dash.draw(n));
      const phone = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
      if (phone) {
        const card = [...document.querySelectorAll('#cards .ppt-c')].find((n) => n.getAttribute('data-key') === encodeURIComponent(was));
        (card || document.querySelector('#cards'))?.scrollIntoView({ block: 'start' });
      }
    });
    nav.append(c);
  }
  el.replaceChildren(nav, meta, title, tags, summary, dl, actions, area);
});

// ---------- coming up ----------

dash.draw('watch', (el) => {
  const rows = rowsOf('watch');
  el.replaceChildren();
  if (!rows) { el.append(mk('li', 'ppt-msg', placeholder('watch'))); return; }
  const moreW = document.querySelectorAll('#ppt-more-watch');
  moreW.forEach((b) => { b.hidden = rows.length <= 6; b.setAttribute('aria-expanded', S.watchAll ? 'true' : 'false'); b.setAttribute('aria-label', S.watchAll ? 'Show only the first six' : `Show all ${rows.length} items coming up`); });
  document.querySelectorAll('#watch-more-l').forEach((n) => { n.hidden = S.watchAll; });
  document.querySelectorAll('#watch-less-l').forEach((n) => { n.hidden = !S.watchAll; });
  if (!rows.length) { el.append(mk('li', 'ppt-msg', 'Nothing scheduled or awaiting a decision matches the filters.')); return; }
  rows.forEach((wr, i) => {
    if (!S.watchAll && i >= 6) return;
    const li = mk('li');
    const btn = mk('button', 'ppt-w-btn');
    btn.type = 'button';
    const dateEl = mk('div', 'ppt-w-date' + (wr.date ? '' : ' is-pending'), wr.date ? fmtDate(wr.date, 'day') : 'Awaiting decision');
    if (wr.date) { mark(dateEl, 'watch', 'date'); dateEl.setAttribute('data-row', String(i)); }
    const body = mk('div');
    const note = mark(mk('div', 'ppt-w-note', wr.note), 'watch', 'note');
    note.setAttribute('data-row', String(i));
    const sub = mark(mk('div', 'ppt-w-sub', wr.jurisdiction), 'watch', 'jurisdiction');
    sub.setAttribute('data-row', String(i));
    body.append(note, sub);
    if (wr.detail) {
      const dt = mark(mk('div', 'ppt-w-sub', wr.detail), 'watch', 'detail');
      dt.setAttribute('data-row', String(i));
      body.append(dt);
    }
    btn.append(dateEl, body);
    btn.addEventListener('click', () => selectEntry(wr.id, true));
    li.append(btn);
    el.append(li);
  });
});

// ---------- stacked bars per year ----------

dash.draw('by-year', {
  mount(el) {
    const svg = d3.select(el).append('svg').attr('class', 'ppt-svg').attr('role', 'img');
    const msg = mk('div', 'ppt-msg');
    const tip = mk('div', 'ppt-tip');
    tip.hidden = true;
    el.append(msg, tip);
    return { svg, msg, tip };
  },
  update(el, m) {
    loadingClass(el, 'by_year_type');
    const rows = rowsOf('by_year_type');
    m.tip.hidden = true;
    if (!rows) { m.svg.selectAll('*').remove(); m.msg.textContent = placeholder('by_year_type'); return; }
    m.msg.textContent = '';
    const W = Math.max(260, el.clientWidth);
    const twoLines = W < 640;
    const capH = twoLines ? 36 : 20;
    const H = 230 + capH;
    const mg = { top: 18, right: 6, bottom: 24 + capH, left: 26 };
    const years = [...new Set(rows.map((r) => Number(r.year)))].sort(d3.ascending);
    const totals = d3.rollup(rows, (v) => d3.sum(v, (d) => Number(d.count)), (d) => Number(d.year));
    const x = d3.scaleBand(years, [mg.left, W - mg.right]).padding(0.3);
    const y = d3.scaleLinear([0, Math.max(1, d3.max(totals.values()) || 1)], [H - mg.bottom, mg.top]).nice();
    const segs = [];
    years.forEach((yr) => {
      let acc = 0;
      TYPES.forEach((t) => {
        const c = rows.find((r) => Number(r.year) === yr && r.type === t);
        const n = c ? Number(c.count) : 0;
        if (n > 0) segs.push({ year: yr, type: t, count: n, y0: acc, y1: acc + n });
        acc += n;
      });
    });
    const p = dash.params();
    const focus = p.from && p.to && p.from === p.to ? Number(p.from) : null;
    const svg = m.svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', H)
      .attr('aria-label', 'Stacked bar chart of developments found per year since 2020, by type of measure. Counts show what this tracker found, not all activity; recent years are covered more densely.');
    svg.selectAll('*').remove();
    const yAxis = svg.append('g').attr('transform', `translate(${mg.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')).tickSize(-(W - mg.left - mg.right)).tickPadding(6));
    yAxis.selectAll('.tick line').style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').attr('transform', `translate(0,${H - mg.bottom})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(8).tickFormat((d) => (x.bandwidth() < 30 ? '’' + String(d).slice(2) : String(d))));
    svg.append('g').selectAll('rect').data(segs).join('rect')
      .attr('class', 'ppt-clickable')
      .attr('x', (d) => x(d.year)).attr('width', x.bandwidth())
      .attr('y', (d) => y(d.y1)).attr('height', (d) => Math.max(0, y(d.y0) - y(d.y1)))
      .style('fill', (d) => colorOf(d.type))
      .style('stroke', 'var(--color-bg)').style('stroke-width', 2)
      .style('opacity', (d) => (focus == null || focus === d.year ? 1 : 0.35))
      .on('pointermove', (ev, d) => {
        const [mx, my] = d3.pointer(ev, el);
        fillTip(m.tip, [['ppt-tip-k', String(d.year)], ['ppt-tip-t', `${d.type === 'Recommendations & advocacy' ? 'Advice & advocacy' : d.type}: ${d.count}`],
          ['ppt-tip-k', `${totals.get(d.year)} developments found that year`]]);
        placeTip(el, m.tip, mx, my);
      })
      .on('pointerleave', () => { m.tip.hidden = true; })
      .on('click', (ev, d) => {
        const same = focus === d.year;
        dash.setParams({ from: same ? null : String(d.year), to: same ? null : String(d.year) });
      });
    svg.append('g').selectAll('text').data(years).join('text').attr('class', 'ppt-bar-value')
      .attr('x', (yr) => x(yr) + x.bandwidth() / 2).attr('y', (yr) => y(totals.get(yr) || 0) - 5)
      .attr('text-anchor', 'middle').text((yr) => (totals.get(yr) ? totals.get(yr) : ''));
    const cap = svg.append('text').attr('class', 'ppt-caveat').attr('x', mg.left).attr('y', H - capH + 12);
    const lines = twoLines
      ? ['Counts show what this tracker found, not all activity;', 'recent years are covered more densely.']
      : ['Counts show what this tracker found, not all activity; recent years are covered more densely.'];
    lines.forEach((t, i) => cap.append('tspan').attr('x', mg.left).attr('dy', i ? 15 : 0).text(t));
  },
});

// ---------- horizontal bar charts ----------

function hbar(name, sourceId, o) {
  dash.draw(name, {
    mount(el) {
      const svg = d3.select(el).append('svg').attr('class', 'ppt-svg').attr('role', 'img');
      const msg = mk('div', 'ppt-msg');
      const tip = mk('div', 'ppt-tip');
      tip.hidden = true;
      el.append(msg, tip);
      return { svg, msg, tip };
    },
    update(el, m) {
      loadingClass(el, sourceId);
      const rows = rowsOf(sourceId);
      m.tip.hidden = true;
      if (!rows) { m.svg.selectAll('*').remove(); m.svg.attr('height', 0); m.msg.textContent = placeholder(sourceId); return; }
      m.msg.textContent = rows.length ? '' : o.empty;
      const W = Math.max(260, el.clientWidth);
      const rowH = 26;
      const H = rows.length * rowH + 4;
      const svg = m.svg.attr('viewBox', `0 0 ${W} ${Math.max(H, 1)}`).attr('width', '100%').attr('height', H)
        .attr('aria-label', o.aria);
      svg.selectAll('*').remove();
      if (!rows.length) return;
      if (o.defs) o.defs(svg);
      const probe = svg.append('g');
      const lw = d3.max(rows, (r) => probe.append('text').attr('class', 'ppt-bar-label').text(o.label(r)).node().getComputedTextLength()) || 0;
      const vw = d3.max(rows, (r) => probe.append('text').attr('class', 'ppt-bar-value').text(o.valueText(r)).node().getComputedTextLength()) || 0;
      probe.remove();
      const labelW = Math.min(lw, W * 0.42);
      const x0 = labelW + 10;
      const x = d3.scaleLinear([0, d3.max(rows, o.value) || 1], [x0, Math.max(x0 + 20, W - vw - 8)]);
      const active = o.active ? o.active() : null;
      const g = svg.append('g').selectAll('g').data(rows).join('g')
        .attr('transform', (r, i) => `translate(0,${i * rowH})`)
        .attr('class', o.onClick ? 'ppt-clickable' : null);
      g.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', rowH).style('fill', 'transparent');
      g.append('text').attr('class', 'ppt-bar-label').attr('x', 0).attr('y', rowH / 2).attr('dy', '0.35em')
        .text((r) => o.label(r))
        .each(function () {
          const t = d3.select(this);
          let s = t.text();
          while (this.getComputedTextLength() > labelW && s.length > 4) { s = s.slice(0, -2); t.text(s + '…'); }
        });
      g.append('rect').attr('x', x0).attr('y', 5).attr('height', rowH - 10).attr('rx', 3)
        .attr('width', (r) => Math.max(2, x(o.value(r)) - x0))
        .style('fill', (r) => (o.fill ? o.fill(r) : (dash.colors && dash.colors[0]) || 'var(--cds-chart-muted)'))
        .style('stroke', (r) => (o.stroke ? o.stroke(r) : null))
        .style('opacity', (r) => (active == null || active === o.key(r) ? 1 : 0.35));
      g.append('text').attr('class', 'ppt-bar-value').attr('x', (r) => x(o.value(r)) + 6).attr('y', rowH / 2).attr('dy', '0.35em')
        .text((r) => o.valueText(r));
      g.on('pointermove', (ev, r) => {
        const [mx, my] = d3.pointer(ev, el);
        fillTip(m.tip, o.tip(r));
        placeTip(el, m.tip, mx, my);
      }).on('pointerleave', () => { m.tip.hidden = true; });
      if (o.onClick) g.on('click', (ev, r) => o.onClick(r));
    },
  });
}

hbar('by-juris', 'by_jurisdiction', {
  label: (r) => r.jurisdiction, value: (r) => Number(r.count), valueText: (r) => fmtInt(Number(r.count)), key: (r) => r.jurisdiction,
  fill: () => 'color-mix(in srgb, var(--color-fg) 74%, transparent)',
  active: () => dash.params().jurisdiction || null,
  tip: (r) => [['ppt-tip-t', r.jurisdiction], ['ppt-tip-k', `${r.count} development${Number(r.count) === 1 ? '' : 's'} in view`]],
  onClick: (r) => toggleParam('jurisdiction', r.jurisdiction),
  empty: 'No developments match the filters.', aria: 'Bar chart of developments per country or the EU',
});

hbar('by-tech', 'by_tech', {
  label: (r) => r.technology, value: (r) => Number(r.count), valueText: (r) => fmtInt(Number(r.count)), key: (r) => r.technology,
  fill: () => 'color-mix(in srgb, var(--color-fg) 74%, transparent)',
  active: () => dash.params().tech || null,
  tip: (r) => [['ppt-tip-t', r.technology], ['ppt-tip-k', `${r.count} development${Number(r.count) === 1 ? '' : 's'} in view`]],
  onClick: (r) => toggleParam('tech', r.technology),
  empty: 'No developments match the filters.', aria: 'Bar chart of developments per technology area',
});

const HATCH = 'ppt-hatch-funding';
hbar('funding', 'top_funding', {
  label: (r) => r.label, value: (r) => Number(r.usd_m), key: (r) => r.id,
  valueText: (r) => fmtUsd(Number(r.usd_m)) + (r.final ? '' : ' · not final'),
  defs: (svg) => {
    const pat = svg.append('defs').append('pattern').attr('id', HATCH).attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 6).attr('height', 6).attr('patternTransform', 'rotate(45)');
    pat.append('rect').attr('width', 6).attr('height', 6).style('fill', colorOf('Funding & incentives')).style('opacity', 0.35);
    pat.append('rect').attr('width', 3).attr('height', 6).style('fill', colorOf('Funding & incentives'));
  },
  fill: (r) => (r.final ? colorOf('Funding & incentives') : `url(#${HATCH})`),
  stroke: (r) => (r.final ? null : colorOf('Funding & incentives')),
  tip: (r) => [['ppt-tip-k', `${fmtDate(r.date, 'day')} · ${r.jurisdiction} · ${plain(r.status)}`], ['ppt-tip-t', r.title],
    ['ppt-tip-k', `${r.note || ''} (≈ ${fmtUsd(Number(r.usd_m))}${r.share ? ', photonics share of a broader programme' : ''})`]],
  onClick: (r) => selectEntry(r.id, true),
  empty: 'No amounts earmarked for photonics match the filters.',
  aria: 'Bar chart of the largest amounts earmarked for photonics, in US dollars at fixed rates; hatched bars are not yet final',
});

// ---------- table ----------

dash.draw('rows', (tb) => {
  const rows = rowsOf('filtered');
  tb.replaceChildren();
  const one = (text) => { const tr = mk('tr'); const td = mk('td', 'ppt-msg', text); td.colSpan = 7; tr.append(td); tb.append(tr); };
  if (!rows) { one(placeholder('filtered')); return; }
  if (!rows.length) { one('No developments match the filters.'); return; }
  const k = S.sort.key;
  const dir = S.sort.dir;
  const usd = (r) => (r.amount_local_m == null || FX[r.currency] == null ? null : Number(r.amount_local_m) * FX[r.currency]);
  const val = (r) => (k === 'type' ? TYPES.indexOf(r.type) : k === 'status' ? STATUS_ORDER.indexOf(r.status)
    : k === 'amount' ? usd(r) : String(r[k] ?? ''));
  const sorted = rows.slice().sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (va == null && vb == null) return d3.descending(a.date, b.date);
    if (va == null) return 1;
    if (vb == null) return -1;
    return (dir < 0 ? d3.descending(va, vb) : d3.ascending(va, vb)) || d3.descending(a.date, b.date);
  });
  const moreR = document.querySelectorAll('#ppt-more-rows');
  const allOn = S.rowLimit > 1000;
  moreR.forEach((b) => { b.hidden = sorted.length <= 25; b.setAttribute('aria-expanded', allOn ? 'true' : 'false'); b.setAttribute('aria-label', allOn ? 'Show only the first 25 rows' : `Show all ${sorted.length} developments`); });
  document.querySelectorAll('#rows-more-l').forEach((n) => { n.hidden = allOn; });
  document.querySelectorAll('#rows-less-l').forEach((n) => { n.hidden = !allOn; });
  sorted.slice(0, S.rowLimit).forEach((r) => {
    const tr = mk('tr');
    tr.setAttribute('data-key', encodeURIComponent(r.id));
    tr.tabIndex = 0;
    if (r.id === S.sel) tr.classList.add('is-selected');
    const tdDate = mk('td', 'ppt-td-date', fmtDate(r.date, r.date_precision));
    const tdJ = mk('td', null, r.jurisdiction);
    const tdT = mk('td', 'ppt-td-title');
    const a = fillHl(extLink(r.title, r.url), r.title);
    a.addEventListener('click', (e) => e.stopPropagation());
    tdT.append(a);
    const tdType = mk('td', 'ppt-td-type');
    tdType.append(typePill(r.type, true));
    const tdS = mk('td', 'ppt-td-type');
    tdS.append(statusPill(r.status));
    const tdA = mk('td', null, r.amount_note || '—');
    const tdSum = mk('td', 'ppt-td-sum');
    tdSum.append(fillHl(mk('div', 'ppt-clamp'), r.summary));
    tr.append(tdDate, tdJ, tdT, tdType, tdS, tdA, tdSum);
    tr.addEventListener('click', () => selectEntry(r.id, true));
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectEntry(r.id, true); });
    tb.append(tr);
  });
});

// ---------- section jumps ----------

document.querySelectorAll('button[data-jump]').forEach((b) => b.addEventListener('click', () => {
  const id = b.getAttribute('data-jump');
  document.querySelectorAll('#' + id).forEach((t) => {
    if (t.tagName === 'DETAILS') t.open = true;
    t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  });
}));

// ---------- shared with the second script ----------

Object.assign(window.ppt, { LENSES, searchTerms, fillHl, hlFrag, isNewForYou, stepEntry, mk, mark, rowsOf, statusOf, placeholder, loadingClass,
  colorOf, fmtDate, fmtUsd, plain, parseDate, selectEntry, toggleParam, placeTip, fillTip, shapeD, symbol, typePill,
  statusPill, extLink, whereId, reduceMotion, TYPES, STATUS_PLAIN, FX, REGIONS });

})();
