/* Interactive reform map and reform timeline (D3 + TopoJSON).
   Shared by index.html and index_it.html; texts in both languages, chosen from <html lang>.
   Data: window.REFORMS (Romp 2024, Netspar) and window.WORLD_110M (Natural Earth 1:110m). */
(function () {
  const IT = document.documentElement.lang === 'it';
  const t = (en, it) => (IT ? it : en);
  const R = window.REFORMS, WORLD = window.WORLD_110M;
  const COL = { exp: '#0f8b8d', con: '#e07a1f', unc: '#8a94a6', on: '#dfe5ee', off: '#f1f3f6', stroke: '#ffffff', ink: '#14213d', muted: '#5b6475' };
  const KIND_COL = [COL.exp, COL.con, COL.unc];
  const KIND_TXT = [t('expanding', 'espansiva'), t('contracting', 'restrittiva'), t('unclear / mixed', 'incerta / mista')];
  const [Y0, Y1] = R.years;
  const YEARS = d3.range(Y0, Y1 + 1);
  const cname = iso => R.countries[iso][IT ? 'it' : 'en'];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ---- indexes ---------------------------------------------------------------
  const byYear = new Map(YEARS.map(y => [y, []]));
  const byCY = {};                           // iso -> year -> [reforms]
  Object.keys(R.countries).forEach(iso => { byCY[iso] = {}; });
  R.reforms.forEach(r => { byYear.get(r[1]).push(r); (byCY[r[0]][r[1]] = byCY[r[0]][r[1]] || []).push(r); });
  // dominant kind of a set of reforms: contracting-only, expanding-only, otherwise mixed
  const dominant = list => {
    const ks = new Set(list.map(r => r[2]));
    return ks.size === 1 ? [...ks][0] : (ks.has(0) && ks.has(1)) ? 2 : ks.has(1) ? 1 : ks.has(0) ? 0 : 2;
  };
  // cumulative net (contracting - expanding) by country and year
  const cumNet = {};
  Object.keys(R.countries).forEach(iso => {
    let c = 0; cumNet[iso] = {};
    YEARS.forEach(y => { (byCY[iso][y] || []).forEach(r => { if (r[2] === 1) c++; else if (r[2] === 0) c--; }); cumNet[iso][y] = c; });
  });
  const counts = y => { const c = [0, 0, 0]; byYear.get(y).forEach(r => c[r[2]]++); return c; };
  const cumCounts = y => { const c = [0, 0, 0]; YEARS.filter(v => v <= y).forEach(v => byYear.get(v).forEach(r => c[r[2]]++)); return c; };

  // ============================================================================ MAP
  function buildMap(root) {
    const W = 800, H = 430;
    root.innerHTML = `
      <div class="rm-wrap">
        <div class="rm-left">
          <div class="rm-mapbox"><svg class="rm-map" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
               aria-label="${t('World map of pension reforms by year', 'Mappa mondiale delle riforme pensionistiche per anno')}"></svg>
            <div class="viz-tip" hidden></div></div>
          <div class="rm-controls">
            <button class="rm-play" aria-label="Play">▶</button>
            <input type="range" class="rm-year" id="rm-year" min="${Y0}" max="${Y1}" step="1" value="1992" aria-label="${t('Year', 'Anno')}">
            <span class="rm-seg"><button data-mode="year" class="on">${t('This year', 'Anno singolo')}</button><button data-mode="cum">${t('Cumulative', 'Cumulato')}</button></span>
            <span class="rm-seg"><button data-view="eu" class="on">${t('Europe', 'Europa')}</button><button data-view="world">${t('World', 'Mondo')}</button></span>
          </div>
          <div class="rm-legend"></div>
        </div>
        <aside class="rm-panel">
          <div class="rm-year-big">1992</div>
          <div class="rm-counts"></div>
          <svg class="rm-spark" viewBox="0 0 440 130" width="440" height="130"></svg>
          <div class="rm-list-head"></div>
          <ul class="rm-list"></ul>
        </aside>
      </div>`;
    const svg = d3.select(root).select('.rm-map'), tip = root.querySelector('.viz-tip');
    const slider = root.querySelector('.rm-year'), playBtn = root.querySelector('.rm-play');
    let mode = 'year', view = 'eu', year = +slider.value, selected = null, timer = null;

    const feats = topojson.feature(WORLD, WORLD.objects.countries).features.filter(f => f.id !== '010');
    const proj = d3.geoEqualEarth().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'FeatureCollection', features: feats });
    const path = d3.geoPath(proj);
    const idToIso = {}; Object.entries(R.countries).forEach(([iso, c]) => { idToIso[c.id] = iso; });

    const zoomG = svg.append('g');
    const countries = zoomG.selectAll('path').data(feats).join('path')
      .attr('d', path).attr('vector-effect', 'non-scaling-stroke')
      .attr('class', d => idToIso[d.id] ? 'rm-c in' : 'rm-c')
      .attr('fill', d => idToIso[d.id] ? COL.on : COL.off).attr('stroke', COL.stroke).attr('stroke-width', 0.6);
    const ripples = svg.append('g').attr('pointer-events', 'none');

    // zoom transforms: world = identity, Europe = box around the European members
    const box = (lo0, la0, lo1, la1) => {
      const pts = [[lo0, la0], [lo1, la0], [lo0, la1], [lo1, la1], [(lo0 + lo1) / 2, la1]].map(proj);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const x0 = d3.min(xs), x1 = d3.max(xs), y0 = d3.min(ys), y1 = d3.max(ys);
      const k = Math.min(W / (x1 - x0), H / (y1 - y0));
      return { k, x: W / 2 - k * (x0 + x1) / 2, y: H / 2 - k * (y0 + y1) / 2 };
    };
    const VIEWS = { world: { k: 1, x: 0, y: 0 }, eu: box(-25, 35, 32, 72) };
    let cur = VIEWS.eu;
    const applyView = (animate) => {
      cur = VIEWS[view];
      (animate ? zoomG.transition().duration(700) : zoomG).attr('transform', `translate(${cur.x},${cur.y}) scale(${cur.k})`);
    };
    const screenPt = iso => { const p = proj(R.countries[iso].pt); return [cur.x + cur.k * p[0], cur.y + cur.k * p[1]]; };

    const netScale = d3.scaleDiverging([-25, 0, 25], d3.piecewise(d3.interpolateRgb, [COL.exp, '#f4f6f9', COL.con])).clamp(true);

    function fillFor(iso) {
      if (!iso) return COL.off;
      if (mode === 'cum') return netScale(cumNet[iso][year]);
      const list = byCY[iso][year];
      return list ? KIND_COL[dominant(list)] : COL.on;
    }

    function ripple(iso, kind) {
      const [x, y] = screenPt(iso);
      ripples.append('circle').attr('cx', x).attr('cy', y).attr('r', 3).attr('fill', 'none')
        .attr('stroke', KIND_COL[kind]).attr('stroke-width', 2.5).attr('opacity', 0.95)
        .transition().duration(1300).ease(d3.easeCubicOut).attr('r', 26).attr('opacity', 0).remove();
    }

    function legend() {
      const L = root.querySelector('.rm-legend');
      L.innerHTML = mode === 'year'
        ? `<span><i style="background:${COL.exp}"></i>${t('Expanding (more generous)', 'Espansiva (più generosa)')}</span>
           <span><i style="background:${COL.con}"></i>${t('Contracting (less generous)', 'Restrittiva (meno generosa)')}</span>
           <span><i style="background:${COL.unc}"></i>${t('Unclear / mixed', 'Incerta / mista')}</span>
           <span><i style="background:${COL.on}"></i>${t('No reform that year', 'Nessuna riforma quell\'anno')}</span>`
        : `<span class="rm-grad">${t('more expansions', 'più espansioni')}<b></b>${t('more cuts', 'più tagli')}</span>
           <span class="caption">${t('Net count since 1970: contracting minus expanding measures', 'Saldo dal 1970: misure restrittive meno espansive')}</span>`;
    }

    // ---- sparkline of reforms per year (click to jump) ------------------------
    const sp = d3.select(root).select('.rm-spark'), SW = 440, SH = 130;
    const x = d3.scaleBand(YEARS, [0, SW]).padding(0.15);
    const maxN = d3.max(YEARS, y => byYear.get(y).length);
    const yS = d3.scaleLinear([0, maxN], [0, SH - 14]);
    const stack = YEARS.map(y => { const c = counts(y); return { y, c }; });
    [0, 1, 2].forEach(k => {
      sp.append('g').selectAll('rect').data(stack).join('rect')
        .attr('x', d => x(d.y)).attr('width', x.bandwidth())
        .attr('y', d => SH - 12 - yS(d.c.slice(0, k + 1).reduce((a, b) => a + b, 0)))
        .attr('height', d => yS(d.c[k])).attr('fill', KIND_COL[k]);
    });
    const cursor = sp.append('rect').attr('y', 0).attr('height', SH - 12).attr('fill', 'none').attr('stroke', COL.ink).attr('stroke-width', 1.5);
    sp.append('text').attr('x', 0).attr('y', SH - 1).attr('class', 'rm-axis').text(Y0);
    sp.append('text').attr('x', SW).attr('y', SH - 1).attr('text-anchor', 'end').attr('class', 'rm-axis').text(Y1);
    sp.append('rect').attr('width', SW).attr('height', SH).attr('fill', 'transparent').style('cursor', 'pointer')
      .on('click', ev => { const [mx] = d3.pointer(ev); const i = Math.max(0, Math.min(YEARS.length - 1, Math.floor(mx / (SW / YEARS.length)))); setYear(YEARS[i]); });

    // ---- side panel -------------------------------------------------------------
    function panel(animateList) {
      root.querySelector('.rm-year-big').textContent = year;
      const c = mode === 'cum' ? cumCounts(year) : counts(year);
      root.querySelector('.rm-counts').innerHTML =
        `<span style="color:${COL.exp}"><b>${c[0]}</b> ${t('expanding', 'espansive')}</span>
         <span style="color:${COL.con}"><b>${c[1]}</b> ${t('contracting', 'restrittive')}</span>
         <span style="color:${COL.unc}"><b>${c[2]}</b> ${t('unclear', 'incerte')}</span>
         <span class="caption">${mode === 'cum' ? t(`total ${Y0}–${year}`, `totale ${Y0}–${year}`) : t('measures this year', 'misure nell\'anno')}</span>`;
      cursor.attr('x', x(year) - 1).attr('width', x.bandwidth() + 2);
      const head = root.querySelector('.rm-list-head'), ul = root.querySelector('.rm-list');
      let list;
      if (selected) {
        list = R.reforms.filter(r => r[0] === selected);
        head.innerHTML = `<b>${cname(selected)}</b>: ${list.length} ${t('reforms', 'riforme')} ${Y0}–${Y1} <button class="rm-clear">✕ ${t('all countries', 'tutti i paesi')}</button>`;
        head.querySelector('.rm-clear').onclick = () => { selected = null; render(false); };
      } else {
        list = byYear.get(year);
        head.innerHTML = `<b>${list.length}</b> ${t('reforms in', 'riforme nel')} ${year}${IT ? ' <span class="caption">(descrizioni in inglese, dalla fonte)</span>' : ''}`;
      }
      ul.innerHTML = list.length ? list.map(r => `<li class="${selected && r[1] === year ? 'now' : ''}"><i style="background:${KIND_COL[r[2]]}"></i>
          <span><b>${selected ? r[1] : cname(r[0])}</b> ${esc(r[4]) || '<em>' + KIND_TXT[r[2]] + '</em>'}</span></li>`).join('')
        : `<li class="empty">${t('No reforms recorded this year.', 'Nessuna riforma registrata in quest\'anno.')}</li>`;
      if (selected) { const now = ul.querySelector('.now'); if (now) now.scrollIntoView({ block: 'nearest' }); } else ul.scrollTop = 0;
      if (animateList) ul.classList.add('flash'), setTimeout(() => ul.classList.remove('flash'), 300);
    }

    function render(withRipples) {
      countries.transition().duration(280).attr('fill', d => fillFor(idToIso[d.id]))
        .attr('stroke', d => (idToIso[d.id] && idToIso[d.id] === selected) ? COL.ink : COL.stroke)
        .attr('stroke-width', d => (idToIso[d.id] && idToIso[d.id] === selected) ? 2 : 0.6);
      if (withRipples && mode === 'year') Object.keys(R.countries).forEach(iso => { const l = byCY[iso][year]; if (l) ripple(iso, dominant(l)); });
      panel(withRipples);
      legend();
    }
    function setYear(y, withRipples = true) { year = y; slider.value = y; render(withRipples); }

    // ---- interactions -----------------------------------------------------------
    slider.addEventListener('input', () => setYear(+slider.value));
    playBtn.addEventListener('click', () => {
      if (timer) { clearInterval(timer); timer = null; playBtn.textContent = '▶'; return; }
      if (year >= Y1) setYear(Y0);
      playBtn.textContent = '⏸';
      timer = setInterval(() => { if (year >= Y1) { clearInterval(timer); timer = null; playBtn.textContent = '▶'; return; } setYear(year + 1); }, 750);
    });
    root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode; root.querySelectorAll('[data-mode]').forEach(x2 => x2.classList.toggle('on', x2 === b)); render(false);
    }));
    root.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
      view = b.dataset.view; root.querySelectorAll('[data-view]').forEach(x2 => x2.classList.toggle('on', x2 === b)); applyView(true);
    }));
    countries.filter(d => idToIso[d.id])
      .on('mousemove', (ev, d) => {
        const iso = idToIso[d.id], [mx, my] = d3.pointer(ev, svg.node()), l = byCY[iso][year] || [];
        tip.hidden = false;
        tip.innerHTML = `<b>${cname(iso)}</b><br>${year}: ${l.length} ${t('reform(s)', 'riforma/e')}` +
          (mode === 'cum' ? `<br>${t('Net since 1970', 'Saldo dal 1970')}: ${cumNet[iso][year] > 0 ? '+' : ''}${cumNet[iso][year]}` : '') +
          `<br><span class="caption">${R.countries[iso].n} ${t('in total · click for history', 'in totale · clic per la storia')}</span>`;
        const w = svg.node().clientWidth || W, k = w / W; tip.style.left = Math.min(mx * k + 14, w - 210) + 'px'; tip.style.top = Math.max(my * k - 10, 0) + 'px';
      })
      .on('mouseleave', () => { tip.hidden = true; })
      .on('click', (ev, d) => { selected = idToIso[d.id] === selected ? null : idToIso[d.id]; render(false); });

    applyView(false);
    render(false);
    return { stop: () => { if (timer) { clearInterval(timer); timer = null; playBtn.textContent = '▶'; } } };
  }

  // ============================================================================ GRID
  function buildGrid(root) {
    const W = 1180, H = 500, M = { l: 132, r: 8, t: 30, b: 26 };
    root.innerHTML = `
      <div class="rg-controls"><span class="caption">${t('Sort countries:', 'Ordina i paesi:')}</span>
        <span class="rm-seg"><button data-sort="n" class="on">${t('Most reforms', 'Più riforme')}</button><button data-sort="alpha">${t('A–Z', 'A–Z')}</button><button data-sort="first">${t('First cut', 'Primo taglio')}</button></span>
        <span class="rm-legend inline"><span><i style="background:${COL.exp}"></i>${t('expanding', 'espansive')}</span><span><i style="background:${COL.con}"></i>${t('contracting', 'restrittive')}</span><span><i style="background:${COL.unc}"></i>${t('mixed / unclear', 'miste / incerte')}</span><span class="caption">${t('darker = more measures', 'più scuro = più misure')}</span></span>
      </div>
      <div class="rm-mapbox"><svg class="rg-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
         aria-label="${t('Grid of pension reforms by country and year', 'Griglia delle riforme pensionistiche per paese e anno')}"></svg><div class="viz-tip" hidden></div></div>`;
    const svg = d3.select(root).select('.rg-svg'), tip = root.querySelector('.viz-tip');
    const isos = Object.keys(R.countries);
    const firstCut = iso => { const y = YEARS.find(v => (byCY[iso][v] || []).some(r => r[2] === 1)); return y || 9999; };
    const orders = {
      n: isos.slice().sort((a, b) => R.countries[b].n - R.countries[a].n),
      alpha: isos.slice().sort((a, b) => cname(a).localeCompare(cname(b), IT ? 'it' : 'en')),
      first: isos.slice().sort((a, b) => firstCut(a) - firstCut(b))
    };
    const x = d3.scaleBand(YEARS, [M.l, W - M.r]).padding(0.12);
    const y = d3.scaleBand(orders.n, [M.t, H - M.b]).padding(0.14);

    // context bands
    const bands = [[1992, 1997, t('1990s: Maastricht era reforms', 'Anni \'90: riforme dell\'era Maastricht')], [2008, 2013, t('Great Recession & debt crisis', 'Grande Recessione e crisi del debito')]];
    svg.append('g').selectAll('g').data(bands).join(g2 => {
      const g = g2.append('g');
      g.append('rect').attr('x', d => x(d[0])).attr('width', d => x(d[1]) + x.bandwidth() - x(d[0])).attr('y', M.t - 4).attr('height', H - M.t - M.b + 8).attr('fill', '#eef2ff');
      g.append('text').attr('x', d => x(d[0]) + 2).attr('y', M.t - 10).attr('class', 'rg-band').text(d => d[2]);
      return g;
    });
    // axes
    svg.append('g').selectAll('text').data(YEARS.filter(v => v % 5 === 0)).join('text')
      .attr('x', v => x(v) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('class', 'rm-axis').text(v => v);
    const labels = svg.append('g').selectAll('text').data(isos).join('text')
      .attr('x', M.l - 8).attr('y', iso => y(iso) + y.bandwidth() / 2 + 4).attr('text-anchor', 'end')
      .attr('class', iso => iso === 'ITA' ? 'rg-lab ita' : 'rg-lab').text(iso => `${cname(iso)} (${R.countries[iso].n})`);

    const cells = [];
    isos.forEach(iso => YEARS.forEach(yr => { const l = byCY[iso][yr]; if (l) cells.push({ iso, yr, l, k: dominant(l) }); }));
    const op = n => (n >= 4 ? 1 : n === 3 ? 0.85 : n === 2 ? 0.68 : 0.5);
    const hl = svg.append('rect').attr('fill', 'none').attr('stroke', COL.ink).attr('stroke-width', 1.5).attr('visibility', 'hidden').attr('pointer-events', 'none');
    const rects = svg.append('g').selectAll('rect').data(cells).join('rect')
      .attr('x', d => x(d.yr)).attr('y', d => y(d.iso)).attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('rx', 2)
      .attr('fill', d => KIND_COL[d.k]).attr('opacity', d => op(d.l.length))
      .on('mousemove', (ev, d) => {
        const [mx, my] = d3.pointer(ev, svg.node());
        hl.attr('visibility', 'visible').attr('x', x(d.yr) - 1).attr('y', y(d.iso) - 1).attr('width', x.bandwidth() + 2).attr('height', y.bandwidth() + 2);
        const shown = d.l.slice(0, 3);
        tip.hidden = false;
        tip.innerHTML = `<b>${cname(d.iso)} · ${d.yr}</b> <span class="caption">${d.l.length} ${t('measure(s)', 'misura/e')}</span>` +
          shown.map(r => `<div class="tip-row"><i style="background:${KIND_COL[r[2]]}"></i>${esc(r[4]).slice(0, 140) || KIND_TXT[r[2]]}</div>`).join('') +
          (d.l.length > 3 ? `<div class="caption">+${d.l.length - 3} ${t('more', 'altre')}</div>` : '');
        tip.style.left = (mx > W - 330 ? mx - 320 : mx + 14) + 'px';
        tip.style.top = (my > H - 160 ? my - 150 : my + 10) + 'px';
      })
      .on('mouseleave', () => { tip.hidden = true; hl.attr('visibility', 'hidden'); });

    root.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('[data-sort]').forEach(x2 => x2.classList.toggle('on', x2 === b));
      y.domain(orders[b.dataset.sort]);
      rects.transition().duration(700).attr('y', d => y(d.iso));
      labels.transition().duration(700).attr('y', iso => y(iso) + y.bandwidth() / 2 + 4);
    }));
    return {};
  }

  window.PACT_VIZ = { 'reform-map': buildMap, 'reform-grid': buildGrid };
})();
