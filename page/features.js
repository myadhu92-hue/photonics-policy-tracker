// Photonics Policy Tracker: country briefs and comparison, shortcuts, filter chips,
// empty-state suggestions, search hints, the period strip and keyboard stepping.

const P = window.ppt;
const { LENSES, searchTerms, mk, mark, rowsOf, placeholder, loadingClass, colorOf, fmtDate, fmtUsd, plain, parseDate,
  selectEntry, stepEntry, placeTip, fillTip, typePill, statusPill, whereId, reduceMotion, TYPES, FX } = P;
const TYPE_SHORT = { 'Strategy & roadmap': 'Strategy', 'Legislation & regulation': 'Legislation', 'Funding & incentives': 'Funding',
  'Trade & supply-chain controls': 'Trade controls', 'Programmes & infrastructure': 'Programmes', 'Recommendations & advocacy': 'Advice' };
const isoDay = d3.utcFormat('%Y-%m-%d');

// ---------- calculations ----------

dash.calc('countries', {
  inputs: ['in_scope'],
  title: 'Developments per country or the EU, all entries',
  description: 'For each country or the EU: developments tracked, how many await a decision, and the latest date. Ignores the filters.',
  fn: (inScope) => d3.rollups(inScope, (v) => ({
    region: v[0].region,
    count: v.length,
    open: v.filter((r) => r.status === 'Proposed / pending' || r.status === 'Reported').length,
    latest: d3.max(v, (r) => r.date),
  }), (r) => r.jurisdiction)
    .map(([country, s]) => ({ country, region: s.region, count: s.count, open: s.open, latest: s.latest }))
    .sort((a, b) => d3.descending(a.count, b.count) || d3.ascending(a.country, b.country)),
});

dash.calc('profiles', {
  inputs: ['in_scope'],
  title: 'Country briefs',
  description: 'For the country picked in Country briefs, and the one it is compared with: developments, items awaiting a decision, and the first and latest dates. Ignores the filters.',
  fn: (inScope) => {
    const p = dash.params();
    return [p.country, p.compare].filter((c, i, a) => c && a.indexOf(c) === i).map((country) => {
      const v = inScope.filter((r) => r.jurisdiction === country);
      return {
        country,
        region: v.length ? v[0].region : null,
        count: v.length,
        open: v.filter((r) => r.status === 'Proposed / pending' || r.status === 'Reported').length,
        first: d3.min(v, (r) => r.date) || null,
        latest: d3.max(v, (r) => r.date) || null,
      };
    });
  },
});

dash.calc('profile_types', {
  inputs: ['in_scope'],
  title: 'Country briefs by type of measure',
  description: 'For each country in Country briefs, developments of each type of measure. Ignores the filters.',
  fn: (inScope) => {
    const p = dash.params();
    const types = ['Strategy & roadmap', 'Legislation & regulation', 'Funding & incentives',
      'Trade & supply-chain controls', 'Programmes & infrastructure', 'Recommendations & advocacy'];
    return [p.country, p.compare].filter((c, i, a) => c && a.indexOf(c) === i).flatMap((country) =>
      types.map((type) => ({ country, type, count: inScope.filter((r) => r.jurisdiction === country && r.type === type).length })));
  },
});

// ---------- helpers ----------

const enc = encodeURIComponent;
const isOn = (v) => v != null && v !== '';
const periodText = (p) => {
  const a = p.start ? fmtDate(p.start, 'month') : 'Jan 2020';
  const b = p.end ? fmtDate(p.end, 'month') : 'today';
  return `${a} to ${b}`;
};
function chipText(key, p) {
  if (key === 'q') return `Search: ${p.q}`;
  if (key === 'lens') return `Shortcut: ${LENSES[p.lens] ? LENSES[p.lens].label : p.lens}`;
  if (key === 'region') return `Region: ${p.region}`;
  if (key === 'jurisdiction') return `Country: ${p.jurisdiction}`;
  if (key === 'type') return `Type: ${TYPE_SHORT[p.type] || p.type}`;
  if (key === 'tech') return `Technology: ${p.tech}`;
  if (key === 'status') return `Status: ${plain(p.status)}`;
  if (key === 'scope') return p.scope === 'Photonics-specific' ? 'Photonics-specific only' : 'Broader measures only';
  if (key === 'from+to') return `Years: ${p.from || '2020'} to ${p.to || 'today'}`;
  if (key === 'start+end') return `Period: ${periodText(p)}`;
  return key;
}
const CHIP_KEYS = ['q', 'lens', 'region', 'jurisdiction', 'type', 'tech', 'status', 'scope', 'from+to', 'start+end'];
const clearKeys = (key) => Object.fromEntries(key.split('+').map((k) => [k, null]));
function activeKeys(p) { return CHIP_KEYS.filter((k) => k.split('+').some((x) => isOn(p[x]))); }
function jumpTo(id) {
  document.querySelectorAll('#' + id).forEach((t) => t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }));
}
function lastMonths(n) {
  const start = d3.utcMonth.offset(d3.utcMonth.floor(new Date()), -(n - 1));
  return { start: isoDay(start), end: null, from: null, to: null };
}

// ---------- listeners ----------

document.querySelectorAll('.ppt-lens[data-lens]').forEach((b) => b.addEventListener('click', () => {
  const v = b.getAttribute('data-lens');
  dash.setParams({ lens: dash.params().lens === v ? null : v });
}));
document.querySelectorAll('.ppt-period[data-period]').forEach((b) => b.addEventListener('click', () => {
  const v = b.getAttribute('data-period');
  dash.setParams(v === '12m' ? lastMonths(12) : { start: null, end: null, from: null, to: null });
}));
document.addEventListener('keydown', (e) => {
  if (!P.sel || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const t = e.target;
  if (t && t.closest && t.closest('input, select, textarea, [contenteditable]')) return;
  e.preventDefault();
  stepEntry(e.key === 'ArrowLeft' ? 1 : -1);
});

dash.onData(() => {
  const p = dash.params();
  document.querySelectorAll('#ppt-q').forEach((i) => { if (document.activeElement !== i) i.value = p.q || ''; });
  document.querySelectorAll('.ppt-lens[data-lens]').forEach((b) => b.setAttribute('aria-pressed', p.lens === b.getAttribute('data-lens') ? 'true' : 'false'));
  const yr = isOn(p.start) && !isOn(p.end) && p.start === lastMonths(12).start;
  const all = !isOn(p.start) && !isOn(p.end) && !isOn(p.from) && !isOn(p.to);
  document.querySelectorAll('.ppt-period[data-period]').forEach((b) => {
    const v = b.getAttribute('data-period');
    b.setAttribute('aria-pressed', (v === '12m' ? yr : all) ? 'true' : 'false');
  });
});

// ---------- filter chips, empty state and search hint ----------

dash.draw('chips', (el) => {
  const p = dash.params();
  const keys = activeKeys(p);
  el.replaceChildren();
  if (!keys.length) { el.append(mk('span', 'ppt-chips-none', 'No filters on: showing everything.')); return; }
  el.append(mk('span', 'ppt-chips-k', 'Filters on:'));
  keys.forEach((k) => {
    const b = mk('button', 'ppt-chip');
    b.type = 'button';
    b.setAttribute('aria-label', `Remove filter ${chipText(k, p)}`);
    b.append(mk('span', null, chipText(k, p)), mk('span', 'ppt-chip-x', '×'));
    b.addEventListener('click', () => dash.setParams(clearKeys(k)));
    el.append(b);
  });
  if (keys.length > 1) {
    const c = mk('button', 'ppt-linkbtn ppt-chips-clear', 'Clear all');
    c.type = 'button';
    c.addEventListener('click', () => document.querySelectorAll('#ppt-reset').forEach((r) => r.click()));
    el.append(c);
  }
});

dash.draw('empty', (el) => {
  const rows = rowsOf('filtered');
  const relax = rowsOf('relax');
  el.replaceChildren();
  if (!rows || rows.length || !relax) return;
  const p = dash.params();
  el.append(mk('p', 'ppt-empty-t', 'Nothing matches all of these filters.'));
  const list = mk('div', 'ppt-empty-list');
  relax.filter((r) => Number(r.count) > 0).sort((a, b) => d3.descending(Number(a.count), Number(b.count))).slice(0, 3).forEach((r, i) => {
    const b = mk('button', 'ppt-btn');
    b.type = 'button';
    const n = mark(mk('b', null, String(r.count)), 'relax', 'count', 'filter=' + enc(r.filter));
    b.append(document.createTextNode(`Remove “${chipText(r.filter, p)}” to see `), n);
    b.addEventListener('click', () => dash.setParams(clearKeys(r.filter)));
    list.append(b);
  });
  if (!list.childNodes.length) list.append(mk('span', 'ppt-note', 'Try a shorter search or fewer filters.'));
  el.append(list);
});

dash.draw('search-hint', (el) => {
  const terms = searchTerms(dash.params().q);
  const extra = terms.filter((g) => g.length > 1).map((g) => g.join(', '));
  el.textContent = extra.length ? `Also finds: ${extra.join('; ')}.` : '';
});

// ---------- the period strip at the top: one line per development, drag to pick a period ----------

dash.draw('spectrum', {
  mount(el) {
    const svg = d3.select(el).append('svg').attr('class', 'ppt-svg').attr('role', 'img');
    const tip = mk('div', 'ppt-tip');
    tip.hidden = true;
    el.append(tip);
    return { svg, tip, played: false };
  },
  update(el, m) {
    loadingClass(el, 'unperiod');
    const rows = rowsOf('unperiod');
    const all = rowsOf('in_scope');
    m.tip.hidden = true;
    if (!rows || !all) { m.svg.selectAll('*').remove(); m.svg.attr('height', 0); return; }
    const p = dash.params();
    const W = Math.max(280, el.clientWidth);
    const bandH = W < 600 ? 44 : 58;
    const H = bandH + 22;
    const maxD = d3.max([...all.map((r) => parseDate(r.date)).filter(Boolean), new Date()]);
    const x = d3.scaleUtc([new Date(Date.UTC(2020, 0, 1)), d3.utcMonth.offset(maxD, 1)], [1, W - 1]);
    const lo = (isOn(p.start) && p.start) || (isOn(p.from) && `${p.from}-01-01`) || null;
    const hi = (isOn(p.end) && p.end) || (isOn(p.to) && `${p.to}-12-31`) || null;
    const inside = (r) => (!lo || r.date >= lo) && (!hi || r.date <= hi);
    const pts = rows.map((r) => ({ r, x: x(parseDate(r.date)) })).filter((q) => Number.isFinite(q.x)).sort((a, b) => a.x - b.x);
    const svg = m.svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', H)
      .attr('aria-label', `Strip of ${rows.length} developments since January 2020; each line is one development placed by date. Drag across it to pick a period. Recent years are covered more densely.`);
    svg.selectAll('*').remove();
    svg.append('rect').attr('class', 'ppt-spectrum-band').attr('x', 0).attr('y', 0).attr('width', W).attr('height', bandH).attr('rx', 4);
    const lines = svg.append('g').selectAll('line').data(pts, (q) => q.r.id).join('line')
      .attr('class', (q) => 'ppt-spectrum-line' + (q.r.date_precision === 'month' ? ' is-month' : '') +
        (q.r.id === P.sel ? ' is-sel' : '') + (inside(q.r) ? '' : ' is-out'))
      .attr('x1', (q) => q.x).attr('x2', (q) => q.x).attr('y1', 7).attr('y2', bandH - 7);
    const years = d3.utcYear.range(new Date(Date.UTC(2020, 0, 1)), maxD);
    svg.append('g').selectAll('line').data(years).join('line').attr('class', 'ppt-spectrum-tick')
      .attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', bandH + 2).attr('y2', bandH + 7);
    svg.append('g').selectAll('text').data(years).join('text').attr('class', 'ppt-axis-label')
      .attr('x', (d) => x(d) + 3).attr('y', bandH + 18)
      .text((d) => (W < 520 ? '’' + String(d.getUTCFullYear()).slice(2) : String(d.getUTCFullYear())));
    const sel = pts.find((q) => q.r.id === P.sel);
    if (sel) svg.append('path').attr('class', 'ppt-spectrum-sel').attr('d', `M${sel.x - 5},${bandH + 9}L${sel.x + 5},${bandH + 9}L${sel.x},${bandH + 2}Z`);
    if (!m.played && pts.length) {
      m.played = true;
      if (!reduceMotion()) lines.attr('y2', 7).transition().delay((q) => (q.x / W) * 900).duration(380).ease(d3.easeCubicOut).attr('y2', bandH - 7);
    }
    const xs = pts.map((q) => q.x);
    const near = (ev) => {
      if (!pts.length) return null;
      const [mx] = d3.pointer(ev, svg.node());
      const q = pts[d3.bisectCenter(xs, mx)];
      return q && Math.abs(q.x - mx) <= 8 ? q : null;
    };
    const off = () => { m.tip.hidden = true; lines.classed('is-hot', false); };
    const brush = d3.brushX().extent([[0, 0], [W, bandH]]).on('end', (ev) => {
      if (!ev.sourceEvent) return;
      if (!ev.selection) {
        if (lo || hi) { dash.setParams({ start: null, end: null, from: null, to: null }); return; }
        const q = near(ev.sourceEvent);
        if (q) selectEntry(q.r.id, true);
        return;
      }
      const [a, b] = ev.selection.map((v) => x.invert(v));
      dash.setParams({ start: isoDay(d3.utcMonth.floor(a)), end: isoDay(d3.utcDay.offset(d3.utcMonth.ceil(b), -1)), from: null, to: null });
    });
    const gb = svg.append('g').attr('class', 'ppt-brush').call(brush);
    if (lo || hi) {
      const a = Math.max(0, x(parseDate(lo || '2020-01-01')));
      const b = Math.min(W, hi ? x(d3.utcDay.offset(parseDate(hi), 1)) : W);
      if (b - a > 1) gb.call(brush.move, [a, b]);
    }
    gb.on('pointermove.tip', (ev) => {
      const q = near(ev);
      if (!q) { off(); return; }
      lines.classed('is-hot', (o) => o === q);
      fillTip(m.tip, [['ppt-tip-k', `${fmtDate(q.r.date, q.r.date_precision)} · ${q.r.jurisdiction}`], ['ppt-tip-t', q.r.title],
        ['ppt-tip-k', `${TYPE_SHORT[q.r.type] || q.r.type} · ${plain(q.r.status)}`]]);
      placeTip(el, m.tip, q.x * (el.clientWidth / W), bandH);
    }).on('pointerleave.tip', off);
  },
});

// ---------- country briefs ----------

dash.draw('country-tiles', (el) => {
  const rows = rowsOf('countries');
  el.replaceChildren();
  if (!rows) { el.append(mk('li', 'ppt-msg', placeholder('countries'))); return; }
  const p = dash.params();
  rows.forEach((c) => {
    const w = 'country=' + enc(c.country);
    const li = mk('li');
    const b = mk('button', 'ppt-tile');
    b.type = 'button';
    const on = c.country === p.country || c.country === p.compare;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    const name = mark(mk('span', 'ppt-tile-name', c.country), 'countries', 'country', w);
    const n = mark(mk('span', 'ppt-tile-n', String(c.count)), 'countries', 'count', w);
    const sub = mk('span', 'ppt-tile-sub');
    sub.append(document.createTextNode('latest '), mark(mk('span', null, fmtDate(c.latest, 'month')), 'countries', 'latest', w));
    b.append(name, n, sub);
    if (Number(c.open) > 0) {
      const o = mk('span', 'ppt-tile-sub');
      o.append(mark(mk('span', null, String(c.open)), 'countries', 'open', w), document.createTextNode(' awaiting a decision'));
      b.append(o);
    }
    b.addEventListener('click', () => {
      if (c.country === p.country) dash.setParams({ country: p.compare || null, compare: null });
      else if (c.country === p.compare) dash.setParams({ compare: null });
      else dash.setParams({ country: c.country });
    });
    li.append(b);
    el.append(li);
  });
});

function miniStrip(rows, W) {
  const ns = 'http://www.w3.org/2000/svg';
  const H = 30;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ppt-svg ppt-mini');
  svg.setAttribute('viewBox', `0 0 ${W} ${H + 14}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', String(H + 14));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${rows.length} developments placed by date since 2020, coloured by type of measure`);
  const all = rowsOf('in_scope') || rows;
  const maxD = d3.max([...all.map((r) => parseDate(r.date)).filter(Boolean), new Date()]);
  const x = d3.scaleUtc([new Date(Date.UTC(2020, 0, 1)), d3.utcMonth.offset(maxD, 1)], [1, W - 1]);
  const s = d3.select(svg);
  s.append('rect').attr('class', 'ppt-mini-band').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H).attr('rx', 3);
  s.append('g').selectAll('line').data(rows).join('line').attr('class', 'ppt-mini-line ppt-clickable')
    .attr('x1', (r) => x(parseDate(r.date))).attr('x2', (r) => x(parseDate(r.date))).attr('y1', 5).attr('y2', H - 5)
    .style('stroke', (r) => colorOf(r.type))
    .on('click', (ev, r) => selectEntry(r.id, true))
    .append('title').text((r) => `${fmtDate(r.date, r.date_precision)}: ${r.title}`);
  const years = d3.utcYear.range(new Date(Date.UTC(2020, 0, 1)), maxD);
  s.append('g').selectAll('text').data(years).join('text').attr('class', 'ppt-axis-label')
    .attr('x', (d) => x(d) + 2).attr('y', H + 12).text((d) => '’' + String(d.getUTCFullYear()).slice(2));
  return svg;
}

function entryButton(r) {
  const b = mk('button', 'ppt-prof-item');
  b.type = 'button';
  const w = whereId(r.id);
  b.append(mark(mk('span', 'ppt-prof-date', fmtDate(r.date, r.date_precision)), 'in_scope', 'date', w),
    mark(mk('span', 'ppt-prof-title', r.title), 'in_scope', 'title', w));
  b.addEventListener('click', () => selectEntry(r.id, true));
  return b;
}

function briefColumn(pr, types, all, W) {
  const w = 'country=' + enc(pr.country);
  const col = mk('article', 'ppt-prof');
  const head = mk('header', 'ppt-prof-head');
  head.append(mark(mk('h3', 'ppt-prof-name', pr.country), 'profiles', 'country', w), mk('span', 'ppt-prof-region', pr.region || ''));
  const stats = mk('dl', 'ppt-prof-stats');
  const stat = (label, field, text) => {
    const d = mk('div');
    d.append(mk('dt', null, label), mark(mk('dd', null, text), 'profiles', field, w));
    stats.append(d);
  };
  stat('developments', 'count', String(pr.count));
  stat('awaiting a decision', 'open', String(pr.open));
  stat('first', 'first', fmtDate(pr.first, 'month'));
  stat('latest', 'latest', fmtDate(pr.latest, 'month'));

  const mix = mk('div', 'ppt-prof-mix');
  const bar = mk('div', 'ppt-mixbar');
  bar.setAttribute('role', 'img');
  const tot = d3.sum(types, (t) => Number(t.count)) || 1;
  bar.setAttribute('aria-label', 'Mix of measures: ' + types.filter((t) => Number(t.count) > 0).map((t) => `${TYPE_SHORT[t.type]} ${t.count}`).join(', '));
  const key = mk('ul', 'ppt-mixkey');
  types.forEach((t) => {
    const n = Number(t.count);
    if (!n) return;
    const seg = mk('span', 'ppt-mixseg');
    seg.style.width = (100 * n / tot) + '%';
    seg.style.background = colorOf(t.type);
    bar.append(seg);
    const li = mk('li');
    const sw = mk('span', 'ppt-mixsw');
    sw.style.background = colorOf(t.type);
    li.append(sw, document.createTextNode(TYPE_SHORT[t.type] + ' '),
      mark(mk('b', null, String(n)), 'profile_types', 'count', w + '&type=' + enc(t.type)));
    key.append(li);
  });
  mix.append(bar, key);

  const rows = all.filter((r) => r.jurisdiction === pr.country).sort((a, b) => d3.descending(a.date, b.date) || d3.ascending(a.id, b.id));
  const block = (title, items) => {
    if (!items.length) return null;
    const d = mk('div', 'ppt-prof-block');
    const ul = mk('ul', 'ppt-prof-list');
    items.forEach((node) => { const li = mk('li'); li.append(node); ul.append(li); });
    d.append(mk('h4', 'ppt-prof-h', title), ul);
    return d;
  };
  const latest = block('Latest', rows.slice(0, 4).map(entryButton));
  const open = block('Awaiting a decision', rows.filter((r) => r.status === 'Proposed / pending' || r.status === 'Reported').map(entryButton));
  const usd = (r) => {
    const v = r.scope === 'Photonics-specific' && r.amount_local_m != null ? r.amount_local_m : r.photonics_amount_local_m;
    return v == null || FX[r.currency] == null ? null : Number(v) * FX[r.currency];
  };
  const money = rows.filter((r) => usd(r) != null).sort((a, b) => d3.descending(usd(a), usd(b))).slice(0, 3).map((r) => {
    const b = entryButton(r);
    const note = r.scope === 'Photonics-specific' ? r.amount_note : r.photonics_amount_note;
    b.append(mark(mk('span', 'ppt-prof-amt', note || ''), 'in_scope', r.scope === 'Photonics-specific' ? 'amount_note' : 'photonics_amount_note', whereId(r.id)));
    return b;
  });
  const amounts = block('Largest amounts for photonics', money);

  const act = mk('div', 'ppt-prof-actions');
  const show = mk('button', 'ppt-btn', `Show ${pr.country} in the timeline and list`);
  show.type = 'button';
  show.addEventListener('click', () => { dash.setParams({ jurisdiction: pr.country, region: null }); jumpTo('explorer'); });
  act.append(show);

  col.append(head, stats, mix, miniStrip(rows, W));
  [latest, open, amounts].forEach((b) => { if (b) col.append(b); });
  col.append(act);
  return col;
}

dash.draw('profile', (el) => {
  const p = dash.params();
  const prof = rowsOf('profiles');
  const types = rowsOf('profile_types');
  const all = rowsOf('in_scope');
  el.replaceChildren();
  if (!isOn(p.country)) {
    el.append(mk('p', 'ppt-note ppt-prof-hint', 'Pick a country above to open its brief.'));
    return;
  }
  if (!prof || !types || !all) { el.append(mk('p', 'ppt-msg', placeholder('profiles'))); return; }
  const bar = mk('div', 'ppt-prof-bar');
  const lab = mk('label', 'ppt-prof-cmp');
  const sel = document.createElement('select');
  sel.className = 'dash-select';
  sel.setAttribute('aria-label', 'Compare with');
  const names = [...new Set(all.map((r) => r.jurisdiction))].sort(d3.ascending).filter((n) => n !== p.country);
  sel.replaceChildren(new Option('Compare with…', ''), ...names.map((n) => new Option(n, n)));
  sel.value = isOn(p.compare) ? p.compare : '';
  sel.onchange = () => dash.setParams({ compare: sel.value || null });
  lab.append(sel);
  const close = mk('button', 'ppt-linkbtn', isOn(p.compare) ? 'Close both briefs' : 'Close brief');
  close.type = 'button';
  close.addEventListener('click', () => dash.setParams({ country: null, compare: null }));
  bar.append(lab, close);
  const cols = mk('div', 'ppt-prof-cols' + (prof.length > 1 ? ' is-compare' : ''));
  const W = Math.max(240, Math.floor((el.clientWidth || 800) / (prof.length > 1 && el.clientWidth > 760 ? 2 : 1)) - 8);
  prof.forEach((pr) => cols.append(briefColumn(pr, types.filter((t) => t.country === pr.country), all, W)));
  el.append(bar, cols);
});

// ---------- abbreviations: hover definitions, first use in each text only ----------

const ABBR = {
  '1260H': `The Pentagon's list of Chinese military companies (section 1260H of the FY2021 NDAA)`,
  'A*STAR': `Singapore's Agency for Science, Technology and Research`,
  'AFRL': 'US Air Force Research Laboratory',
  'BIS': `US Bureau of Industry and Security, which runs export controls`,
  'BMFTR': `Germany's federal research ministry (formerly BMBF)`,
  'CEA': `France's Alternative Energies and Atomic Energy Commission`,
  'CHIPS': 'The US CHIPS and Science Act of 2022 and its funding programmes',
  'Chips JU': 'Chips Joint Undertaking, the EU body that funds chip pilot lines',
  'CPFC': `Canadian Photonics Fabrication Centre, run by the National Research Council`,
  'CPO': 'Co-packaged optics: optical links built into the same package as a processor or switch chip',
  'CST': `UK Council for Science and Technology, which advises the Prime Minister`,
  'DoD': 'US Department of Defense',
  'DSIT': 'UK Department for Science, Innovation and Technology',
  'DUV': 'Deep-ultraviolet lithography',
  'EPIC': 'European Photonics Industry Consortium',
  'EUV': 'Extreme-ultraviolet lithography',
  'FCC': 'US Federal Communications Commission',
  'FP10': `The EU's next research programme, 2028 to 2034`,
  'InP': 'Indium phosphide, the main material for lasers on optical-network chips',
  'IPCEI': 'Important Project of Common European Interest: EU-approved state aid for cross-border projects',
  'ISM': 'India Semiconductor Mission',
  'ITRE': `The European Parliament's industry, research and energy committee`,
  'LOI': 'Letter of intent: a preliminary award, not yet final',
  'LSTC': `Japan's Leading-edge Semiconductor Technology Center`,
  'METI': `Japan's Ministry of Economy, Trade and Industry`,
  'MIC': `Japan's Ministry of Internal Affairs and Communications`,
  'MIIT': `China's Ministry of Industry and Information Technology`,
  'MOFCOM': `China's Ministry of Commerce`,
  'MSIT': `South Korea's Ministry of Science and ICT`,
  'NAPMP': 'National Advanced Packaging Manufacturing Program, part of CHIPS',
  'NDAA': 'National Defense Authorization Act, the annual US defence law',
  'NDC': `Taiwan's National Development Council`,
  'NDRC': `China's National Development and Reform Commission`,
  'NEDO': `Japan's New Energy and Industrial Technology Development Organization`,
  'NIST': 'US National Institute of Standards and Technology, which runs CHIPS awards',
  'NQI': 'US National Quantum Initiative',
  'NRC': 'National Research Council Canada',
  'NSTIC': `Singapore's National Semiconductor Translation and Innovation Centre`,
  'OSTP': 'White House Office of Science and Technology Policy',
  'PERTE': `Spain's strategic projects for economic recovery and transformation`,
  'PIC': 'Photonic integrated circuit: a chip that routes and processes light',
  'PICs': 'Photonic integrated circuits: chips that route and process light',
  'PLG': 'UK Photonics Leadership Group',
  'PMT': 'Preliminary memorandum of terms: a CHIPS award that is not yet final',
  'PPP': 'Public-private partnership',
  'RIE': `Singapore's Research, Innovation and Enterprise plan`,
  'SiPhIA': 'Silicon Photonics Industry Alliance (Taiwan)',
  'SPIE': 'The international society for optics and photonics',
  'SRIA': 'Strategic research and innovation agenda',
};
const ABBR_KEYS = Object.keys(ABBR).sort((a, b) => b.length - a.length);
const wordCh = (ch) => !!ch && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9'));
function textFrag(text, q) {
  const s = String(text ?? '');
  const hits = [];
  ABBR_KEYS.forEach((k) => {
    let i = s.indexOf(k);
    while (i >= 0) {
      if (!wordCh(s[i - 1]) && !wordCh(s[i + k.length])) { hits.push([i, i + k.length, k]); break; }
      i = s.indexOf(k, i + 1);
    }
  });
  hits.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const frag = document.createDocumentFragment();
  let pos = 0;
  hits.forEach(([a, b, k]) => {
    if (a < pos) return;
    if (a > pos) frag.append(P.hlFrag(s.slice(pos, a), q));
    const ab = document.createElement('abbr');
    ab.title = ABBR[k];
    ab.append(P.hlFrag(s.slice(a, b), q));
    frag.append(ab);
    pos = b;
  });
  if (pos < s.length) frag.append(P.hlFrag(s.slice(pos), q));
  return frag;
}
P.textFrag = textFrag;

// ---------- masthead: next deadline, the 'awaiting a decision' link, the phone fold ----------

const goTo = (sel) => document.querySelectorAll(sel).forEach((t) => {
  if (t.tagName === 'DETAILS') t.open = true;
  t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
});

dash.calc('next_deadline', {
  inputs: ['in_scope'],
  title: 'Next deadline',
  description: 'The soonest scheduled date from today onward across all developments, whatever the filters.',
  fn: (inScope) => {
    const today = isoDay(new Date());
    return inScope.filter((r) => r.watch_date && r.watch_date >= today)
      .sort((a, b) => d3.ascending(a.watch_date, b.watch_date) || d3.ascending(a.id, b.id))
      .slice(0, 1)
      .map((r) => ({ id: r.id, date: r.watch_date, note: r.watch_note, jurisdiction: r.jurisdiction }));
  },
});

dash.draw('next-deadline', (el) => {
  const rows = rowsOf('next_deadline');
  el.replaceChildren();
  const i = rows && rows.length ? 0 : -1;
  if (i < 0) { el.hidden = true; return; }
  el.hidden = false;
  const w = rows[i];
  const days = Math.round((parseDate(String(w.date)) - parseDate(isoDay(new Date()))) / 864e5);
  const when = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  const head = mk('div', 'ppt-next-h');
  const d = mark(mk('span', 'ppt-next-d', fmtDate(w.date, 'day')), 'next_deadline', 'date');
  d.setAttribute('data-row', String(i));
  head.append(mk('span', 'ppt-next-k', 'Next deadline'), d, mk('span', 'ppt-next-w', when));
  const body = mk('div', 'ppt-next-b');
  const t = mark(mk('button', 'ppt-next-t', w.note), 'next_deadline', 'note');
  t.type = 'button';
  t.setAttribute('data-row', String(i));
  t.addEventListener('click', () => selectEntry(w.id, true));
  const j = mark(mk('span', 'ppt-next-j', w.jurisdiction), 'next_deadline', 'jurisdiction');
  j.setAttribute('data-row', String(i));
  body.append(t, j);
  const all = mk('button', 'ppt-linkbtn ppt-next-all', 'Everything coming up');
  all.type = 'button';
  all.addEventListener('click', () => goTo('#watch'));
  el.append(head, body, all);
});

document.querySelectorAll('#kpi-open').forEach((s) => s.addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  goTo('#watch');
}));

document.querySelectorAll('#ppt-mast-more').forEach((b) => b.addEventListener('click', () => {
  const m = document.querySelector('.ppt-mast');
  const open = !(m && m.classList.contains('is-open'));
  document.querySelectorAll('.ppt-mast').forEach((n) => n.classList.toggle('is-open', open));
  b.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.querySelectorAll('#mast-more-l').forEach((n) => { n.hidden = open; });
  document.querySelectorAll('#mast-less-l').forEach((n) => { n.hidden = !open; });
}));

// ---------- latest: what the last update added or corrected ----------

function openLog() {
  document.querySelectorAll('#about').forEach((d) => { d.open = true; });
  goTo('#log-h');
}

dash.draw('new-foot', (el) => {
  const wn = rowsOf('whats_new');
  const log = rowsOf('changelog');
  el.replaceChildren();
  if (!wn || !wn.length || !log || !log[0]) { el.hidden = true; return; }
  el.hidden = false;
  const added = wn.filter((r) => r.kind === 'New');
  const fixed = wn.length - added.length;
  const parts = [];
  if (added.length) parts.push(`${added.length} ${added.length === 1 ? 'entry' : 'entries'} added`);
  if (fixed) parts.push(`${fixed} corrected or updated`);
  el.append(document.createTextNode(`The ${fmtDate(log[0].date, 'day')} update: ${parts.join(', ')}. `));
  if (added.length && added.length <= 3) {
    el.append(document.createTextNode('Added: '));
    added.forEach((r, k) => {
      const a = mark(mk('a', null, `${r.title} (${fmtDate(r.date, r.date_precision)})`), 'whats_new', 'title');
      a.href = '#row-' + encodeURIComponent(r.id);
      a.setAttribute('data-row', String(wn.indexOf(r)));
      a.addEventListener('click', (e) => { e.preventDefault(); selectEntry(r.id, true); });
      el.append(a, document.createTextNode(k < added.length - 1 ? '; ' : '. '));
    });
  }
  const log2 = mk('a', null, 'See what changed');
  log2.href = '#log-h';
  log2.addEventListener('click', (e) => { e.preventDefault(); openLog(); });
  el.append(log2);
});

// ---------- since your last visit (remembered in this browser only) ----------

const VISIT_KEY = 'ppt-visit-v1';
function readVisit() {
  try { const v = window.localStorage ? window.localStorage.getItem(VISIT_KEY) : null; return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function writeVisit(v) {
  try { if (window.localStorage) window.localStorage.setItem(VISIT_KEY, JSON.stringify(v)); } catch (e) { /* storage not available here */ }
}
const redrawNew = () => ['since', 'new-list', 'cards', 'rows', 'detail'].forEach((n) => dash.draw(n));

dash.onData(() => {
  if (P.visitDone) return;
  const log = rowsOf('changelog');
  if (!log || !log[0]) return;
  P.visitDone = true;
  const last = String(log[0].date);
  let v = readVisit();
  if (!v || typeof v.seen !== 'string') v = { seen: last, base: last };
  else if (v.seen !== last) v = { seen: last, base: v.seen };
  writeVisit(v);
  P.sinceBase = typeof v.base === 'string' && v.base < last ? v.base : null;
  if (P.sinceBase) redrawNew();
});

dash.draw('since', (el) => {
  el.replaceChildren();
  const all = rowsOf('in_scope');
  const log = rowsOf('changelog');
  const base = P.sinceBase;
  if (!all || !base || !log || !log[0]) { el.hidden = true; return; }
  const isNew = (r) => String(r.added_on || '') > base;
  const added = all.filter(isNew).length;
  const fixed = all.filter((r) => !isNew(r) && String(r.changed_on || '') > base).length;
  if (!added && !fixed) { el.hidden = true; return; }
  el.hidden = false;
  const parts = [];
  if (added) parts.push(`${added} new ${added === 1 ? 'entry' : 'entries'}`);
  if (fixed) parts.push(`${fixed} corrected or updated`);
  const msg = mk('span', 'ppt-since-m');
  msg.append(mk('b', null, 'Since your last visit: '),
    document.createTextNode(`${parts.join(' and ')} since the ${fmtDate(base, 'day')} update.`));
  const acts = mk('span', 'ppt-since-a');
  const btn = (label, cls, fn) => { const b = mk('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); acts.append(b); };
  if (added) {
    btn(added === 1 ? 'Show the new entry' : `Show the ${added} new entries`, 'ppt-btn ppt-btn--primary', () => {
      dash.setParams({ lens: 'new' });
      goTo('#explore');
    });
  }
  if (fixed) btn('See what changed', 'ppt-btn', openLog);
  btn('Mark as seen', 'ppt-linkbtn', () => {
    const last = String(log[0].date);
    writeVisit({ seen: last, base: last });
    P.sinceBase = null;
    if (dash.params().lens === 'new') dash.setParams({ lens: null });
    redrawNew();
  });
  el.append(msg, acts);
});

// ---------- unhide the deadline, update line and since-your-last-visit strip ----------
// A drawing does not run while its element is hidden, so these are shown here, before the drawings run.

dash.onData(() => {
  const nd = rowsOf('next_deadline');
  if (nd && nd.length) document.querySelectorAll('.ppt-next').forEach((n) => { n.hidden = false; });
  const wn = rowsOf('whats_new');
  const log = rowsOf('changelog');
  if (wn && wn.length && log && log[0]) document.querySelectorAll('.ppt-new-foot').forEach((n) => { n.hidden = false; });
  if (P.sinceBase) document.querySelectorAll('.ppt-since').forEach((n) => { n.hidden = false; });
});
