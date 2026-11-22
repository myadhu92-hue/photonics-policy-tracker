/* Stand-in for Claude's dashboard runtime, so the tracker page runs as a plain static site.
   It offers the calls the page uses: dash.calc, dash.data, dash.draw, dash.onData,
   dash.params, dash.setParams, dash.resetParams, dash.setLink and dash.colors.
   It also lets the page's CSV button save a file, as the downloads capability does in Claude. */
window.dash = (() => {
  const SOURCES = {
    policies: 'data/policies.json',
    changelog: 'data/changelog.json',
  };
  const DEFAULTS = { compare: '', country: '', end: '', from: '', jurisdiction: '', lens: '', q: '', region: '',
    scope: '', start: '', status: '', tech: '', to: '', type: '' };
  const files = {};          // id -> {status, data}
  const calcs = {};          // id -> {inputs, fn}
  const draws = {};          // name -> function(el) or {mount, update, unmount}
  const mounted = new WeakMap();
  const onDatas = [];
  let params = { ...DEFAULTS };
  let memo = {};
  let started = false;

  function data(id) {
    if (SOURCES[id]) {
      const f = files[id] || { status: 'loading', data: [] };
      return { status: f.status, data: f.data, columns: f.data && f.data[0] ? Object.keys(f.data[0]) : [], message: f.message || null, refreshing: false, truncated: false, meta: f.meta || null };
    }
    const c = calcs[id];
    if (!c) return { status: 'missing', data: null };
    if (memo[id]) return memo[id];
    const ins = c.inputs.map((i) => data(i));
    const bad = ins.find((x) => x.status !== 'ok');
    let out;
    if (bad) out = { status: bad.status === 'error' ? 'error' : 'loading', data: null };
    else {
      try { out = { status: 'ok', data: c.fn(...ins.map((x) => x.data)) }; } catch (e) { console.error(`calc ${id}`, e); out = { status: 'error', data: null, message: String(e) }; }
    }
    memo[id] = out;
    return out;
  }

  function drawOne(name) {
    const d = draws[name];
    if (!d) return;
    document.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => {
      if (el.closest('[hidden]')) return;   // hidden parts draw when they are shown
      try {
        if (typeof d === 'function') d(el);
        else {
          if (!mounted.has(el)) mounted.set(el, d.mount ? d.mount(el) : undefined);
          if (d.update) d.update(el, mounted.get(el));
        }
      } catch (e) { console.error(`draw ${name}`, e); }
    });
  }
  function runAll() {
    memo = {};
    onDatas.forEach((f) => { try { f(); } catch (e) { console.error('onData', e); } });
    Object.keys(draws).forEach(drawOne);
  }
  let pending = null;
  function soon() { clearTimeout(pending); pending = setTimeout(runAll, 30); }

  async function start() {
    if (started) return;
    started = true;
    runAll();
    await Promise.all(Object.entries(SOURCES).map(async ([id, url]) => {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`${res.status}`);
        const j = await res.json();
        files[id] = { status: 'ok', data: Array.isArray(j) ? j : j.rows, meta: j.meta || null };
      } catch (e) {
        files[id] = { status: 'error', data: [], message: String(e) };
      }
    }));
    runAll();
    // redraw when a hidden part is shown, or the page width changes
    // (only a real change counts: setting hidden to what it already was must not redraw again)
    new MutationObserver((recs) => {
      if (recs.some((r) => (r.oldValue !== null) !== r.target.hasAttribute('hidden'))) soon();
    }).observe(document.getElementById('dash-root'), { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['hidden'] });
    let w = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth !== w) { w = window.innerWidth; soon(); } });
  }

  return {
    calc: (id, o) => { calcs[id] = o; },
    loader: () => {},
    data,
    draw: (name, fn) => { if (fn) draws[name] = fn; else drawOne(name); },
    onData: (f) => { onDatas.push(f); if (started) f(); },
    params: () => ({ ...params }),
    setParams: (o) => { params = { ...params, ...o }; runAll(); },
    resetParams: () => { params = { ...DEFAULTS }; runAll(); },
    setLink: (name) => { try { history.replaceState(null, '', `#${encodeURIComponent(name)}`); } catch (e) { /* ignore */ } },
    refresh: () => {},
    colors: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `var(--ppt-c${i})`),
    _start: start,
  };
})();

// The CSV button asks for the downloads capability; on a static site a plain file download does the job.
window.claude = {
  use: async (name) => {
    if (name !== 'downloads') throw new Error('not available');
    return {
      save: async ({ filename, data }) => {
        const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    };
  },
};
