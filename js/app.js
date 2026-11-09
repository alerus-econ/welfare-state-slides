/* Interactive logic for "Social Welfare: An Intergenerational Pact".
   Shared by index.html (English) and index_it.html (Italian): every text has both languages,
   chosen from <html lang>. Keep the two versions in sync when editing. */
(function () {
  const D = window.SLIDE_DATA || {};
  const IT = document.documentElement.lang === 'it';
  const t = (en, it) => (IT ? it : en);
  const SFX = IT ? '_it' : '';   // separate saved votes/words per language
  const C = { ink: '#14213d', muted: '#5b6475', line: '#e3e7ee', young: '#0f8b8d', old: '#e07a1f', accent: '#2346c7', bad: '#c0392b', good: '#1e8e3e' };
  const PALETTE = ['#2346c7', '#8e44ad', '#0f8b8d', '#c0392b', '#7f8c8d', '#b8860b', '#16a085', '#34495e'];
  const NAMES_IT = { Italy: 'Italia', Japan: 'Giappone', China: 'Cina', India: 'India', Nigeria: 'Nigeria', World: 'Mondo', France: 'Francia',
    'Republic of Korea': 'Corea del Sud', Spain: 'Spagna', Germany: 'Germania', Sweden: 'Svezia', Austria: 'Austria', Greece: 'Grecia',
    Ireland: 'Irlanda', 'EU average': 'Media UE', 'EU-27': 'UE-27' };
  const nm = n => (IT ? NAMES_IT[n] || n : n === 'Republic of Korea' ? 'South Korea' : n);
  const fmt = v => (IT ? String(v).replace('.', ',') : String(v));
  const eur = v => { const s = String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, IT ? '.' : ','); return IT ? s + ' €' : '€' + s; };
  const ageLab = a => { const y = Math.floor(a), m = Math.round((a - y) * 12); return m ? t(`${y} y ${m} m`, `${y} anni e ${m} mesi`) : t(`${y}`, `${y} anni`); };

  Chart.defaults.font.family = '"Inter","Segoe UI",system-ui,sans-serif';
  Chart.defaults.font.size = 15;
  Chart.defaults.color = C.ink;
  Chart.defaults.plugins.legend.labels.boxWidth = 14;
  Chart.defaults.maintainAspectRatio = false;
  const grid = { color: C.line };
  const PCT_GDP = t('% of GDP', '% del PIL');

  const store = {
    get(k, d) { try { const v = localStorage.getItem('pact_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pact_' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  // ------------------------------------------------------------------ charts
  const charts = {};
  // compact options for the small charts on the "four forces" slide
  const MINI = { plugins: { legend: { display: false } }, layout: { padding: { top: 22, right: 18 } } };
  // writes values on bars, or on selected line points (opts.points = indexes), after the animation
  const valueLabels = {
    id: 'valueLabels',
    afterDatasetsDraw(chart, args, opts) {
      const { ctx } = chart, meta = chart.getDatasetMeta(0), data = chart.data.datasets[0].data;
      const fmtV = opts.fmt || (v => fmt(v) + (opts.suffix || ''));
      ctx.save(); ctx.font = '700 12px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = C.ink;
      meta.data.forEach((el, i) => {
        if (opts.points && !opts.points.includes(i)) return;
        const p = el.tooltipPosition();
        if (chart.options.indexAxis === 'y') { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(fmtV(data[i]), p.x + 6, p.y); }
        else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fmtV(data[i]), p.x, p.y - 6); }
      });
      ctx.restore();
    }
  };
  const builders = {
    'ch-oadr': el => {
      const o = D.oadr;
      return new Chart(el, { type: 'line', data: { labels: o.years, datasets: Object.entries(o.series).map(([k, v], i) => ({
        label: nm(k), data: v, borderColor: k === 'Italy' ? C.old : PALETTE[i % PALETTE.length], borderWidth: k === 'Italy' ? 5 : 2.5,
        pointRadius: 0, tension: .3 })) },
        options: { scales: { y: { grid, title: { display: true, text: t('65+ per 100 people aged 15–64', 'over 65 ogni 100 persone 15–64 anni') } }, x: { grid: { display: false } } },
          plugins: { legend: { position: 'right' } } } });
    },
    'ch-tfr': el => {
      const d = D.tfr;
      const ds = Object.entries(d.series).map(([k, v], i) => ({ label: nm(k), data: v,
        borderColor: k === 'Italy' ? C.old : PALETTE[i % PALETTE.length], borderWidth: k === 'Italy' ? 4 : 2, pointRadius: 0 }));
      ds.push({ label: t('Replacement (2.1)', 'Sostituzione (2,1)'), data: d.years.map(() => 2.1), borderColor: C.muted, borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0 });
      return new Chart(el, { type: 'line', data: { labels: d.years, datasets: ds },
        options: { scales: { y: { grid, min: 0 }, x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } } } } });
    },
    'ch-births': el => {
      const b = D.italy_births;
      return new Chart(el, { type: 'line', data: { labels: b.years, datasets: [
        { label: t('Births', 'Nascite'), data: b.births, borderColor: C.young, borderWidth: 3, pointRadius: 0 },
        { label: t('Deaths', 'Decessi'), data: b.deaths, borderColor: C.old, borderWidth: 3, pointRadius: 0 }] },
        options: { scales: { y: { grid }, x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } } } } });
    },
    'ch-growth': el => {
      const g = D.growth_decades;
      return new Chart(el, { data: { labels: g.map(d => d.label), datasets: [
        { type: 'bar', label: t('Real GDP growth (≈ n + g), %/yr', 'Crescita PIL reale (≈ n + g), %/anno'), data: g.map(d => d.g), backgroundColor: g.map(d => d.label.includes('RGS') ? '#9fd3d4' : C.young) },
        { type: 'line', label: t('Real interest rate, %', 'Tasso di interesse reale, %'), data: g.map(d => d.r), borderColor: C.old, backgroundColor: C.old, borderWidth: 3, pointRadius: 6, spanGaps: false }] },
        options: { scales: { y: { grid, title: { display: true, text: t('% per year', '% annuo') } }, x: { grid: { display: false } } } } });
    },
    'ch-reforms': el => {
      const r = D.reforms_by_decade;
      return new Chart(el, { type: 'bar', data: { labels: r.decades.map(d => IT ? 'anni ' + d.slice(2, 4) : d), datasets: [
        { label: t('Expanding (more generous)', 'Espansive (più generose)'), data: r.expanding, backgroundColor: C.young },
        { label: t('Contracting (less generous)', 'Restrittive (meno generose)'), data: r.contracting, backgroundColor: C.old },
        { label: t('Unclear / neutral', 'Incerte / neutre'), data: r.unclear, backgroundColor: '#cfd5df' }] },
        options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid, title: { display: true, text: t('number of reform measures', 'numero di misure di riforma') } } } } });
    },
    'ch-eu': el => {
      const a = D.ar2024_spending, names = { IT: 'Italy', FR: 'France', ES: 'Spain', DE: 'Germany', SE: 'Sweden', EU: 'EU average', AT: 'Austria', EL: 'Greece', IE: 'Ireland' };
      const pick = ['IT', 'FR', 'ES', 'AT', 'DE', 'SE', 'IE', 'EU'];
      return new Chart(el, { type: 'line', data: { labels: a.years, datasets: pick.map((k, i) => ({ label: nm(names[k]), data: a.series[k],
        borderColor: k === 'IT' ? C.old : k === 'EU' ? C.ink : PALETTE[i % PALETTE.length], borderWidth: k === 'IT' || k === 'EU' ? 4 : 2,
        borderDash: k === 'EU' ? [6, 4] : [], pointRadius: 0 })) },
        options: { scales: { y: { grid, title: { display: true, text: PCT_GDP } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } }, plugins: { legend: { position: 'right' } } } });
    },
    'ch-rgs': el => {
      const p = D.rgs27.spending_points, a = D.ar2024_spending;
      return new Chart(el, { type: 'line', data: { datasets: [
        { label: t('RGS Rapporto n. 27 (2026): published values', 'RGS Rapporto n. 27 (2026): valori pubblicati'), data: p.map(([x, y]) => ({ x, y })), borderColor: C.old, backgroundColor: C.old, borderWidth: 4, pointRadius: 7, tension: .35 },
        { label: t('EC Ageing Report 2024 (annual)', 'CE Ageing Report 2024 (annuale)'), data: a.years.map((y, i) => ({ x: y, y: a.series.IT[i] })), borderColor: C.accent, borderDash: [6, 4], borderWidth: 2, pointRadius: 0 }] },
        options: { parsing: false, scales: { x: { type: 'linear', min: 2015, max: 2070, grid: { display: false }, ticks: { stepSize: 5, callback: v => v } },
          y: { min: 12, max: 18, grid, title: { display: true, text: PCT_GDP } } } } });
    },
    'ch-manovra': el => {
      // Art. 55 savings (technical report): 1.476 bn/yr 2027-29, 14.241 bn in total by 2036; the 2030-36 linear fall is
      // interpolated to match that total. GDP: Eurostat 2025 (2,265 bn) + 3% nominal a year (assumption).
      const p = D.rgs27.spending_points.filter(([x]) => x >= 2024), yrs = d3.range(2024, 2037);
      const base = y => { const i = p.findIndex(([x]) => x >= y), [x1, y1] = p[i], [x0, y0] = p[Math.max(i - 1, 0)]; return x1 === x0 ? y1 : y0 + (y1 - y0) * (y - x0) / (x1 - x0); };
      const saving = y => (y < 2027 ? 0 : y <= 2029 ? 1.476 : 1.476 - (y - 2029) * (10 * 1.476 - 14.241) / 28);
      const gdp = y => 2265 * 1.03 ** (y - 2025);
      const note = { id: 'manovraNote', afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        ctx.save(); ctx.font = '700 14px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = C.young; ctx.textAlign = 'center';
        ctx.fillText(t('with the budget: −0.06 points in 2027', 'con la manovra: −0,06 punti nel 2027'), x.getPixelForValue(2037), y.getPixelForValue(14.9));
        ctx.restore();
      } };
      return new Chart(el, { type: 'line', plugins: [note], data: { datasets: [
        { label: t('RGS baseline', 'Scenario base RGS'), data: p.map(([x, y]) => ({ x, y })), borderColor: C.old, backgroundColor: C.old, borderWidth: 4, pointRadius: 5, tension: 0 },
        { label: t('With the 2027 budget (to 2036)', 'Con la manovra 2027 (fino al 2036)'), data: yrs.map(y => ({ x: y, y: +(base(y) - saving(y) / gdp(y) * 100).toFixed(2) })), borderColor: C.young, backgroundColor: C.young, borderWidth: 2.5, pointRadius: 0, tension: 0 }] },
        options: { parsing: false, scales: { x: { type: 'linear', min: 2024, max: 2070, grid: { display: false }, ticks: { stepSize: 10, callback: v => v } },
          y: { min: 12, max: 18, grid, title: { display: true, text: PCT_GDP } } } } });
    },
    'ch-liab': el => {
      const v = Object.entries(D.entitlements.values).filter(([k]) => k.length === 2).sort((a, b) => b[1] - a[1]);
      return new Chart(el, { type: 'bar', data: { labels: v.map(x => x[0]), datasets: [{ label: t('Accrued pension entitlements, % GDP', 'Diritti pensionistici maturati, % PIL') + ` (${D.entitlements.year})`,
        data: v.map(x => x[1]), backgroundColor: v.map(x => x[0] === 'IT' ? C.old : '#b8c2d6') }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { grid, title: { display: true, text: PCT_GDP } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } } } });
    },
    'ch-neet': el => {
      const n = D.neet, names = { IT: 'Italy', EU27_2020: 'EU-27', DE: 'Germany', FR: 'France', ES: 'Spain', SE: 'Sweden' };
      const years = [...new Set(Object.values(n).flat().map(r => r[0]))].sort();
      return new Chart(el, { type: 'line', data: { labels: years, datasets: Object.entries(n).map(([k, rows], i) => {
        const m = Object.fromEntries(rows); return { label: nm(names[k]), data: years.map(y => m[y] ?? null),
          borderColor: k === 'IT' ? C.old : k === 'EU27_2020' ? C.ink : PALETTE[i % PALETTE.length], borderWidth: k === 'IT' ? 4 : 2, pointRadius: 0, spanGaps: true }; }) },
        options: { scales: { y: { grid, min: 0 }, x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } } } } });
    },
    // ---- "Four forces" slide: one mini chart per box
    'ch-f-demo': el => {
      // RGS Rapporto n. 27, Table A (same figures as the headline)
      const o = D.rgs27.oadr, yrs = Object.keys(o).map(Number), v = Object.values(o), hi = y => y === 2024 || y === 2050;
      return new Chart(el, { type: 'line', data: { labels: yrs, datasets: [{ data: yrs.map((y, i) => ({ x: y, y: v[i] })), borderColor: C.old,
        backgroundColor: 'rgba(224,122,31,.15)', fill: true, borderWidth: 3, tension: .3, pointRadius: yrs.map(y => hi(y) ? 6 : 3), pointBackgroundColor: C.old }] },
        options: { ...MINI, animation: { duration: 1600 }, plugins: { ...MINI.plugins, valueLabels: { points: yrs.map((y, i) => hi(y) ? i : -1), fmt: n => fmt(n.y) } },
          scales: { y: { grid, min: 0, max: 75, ticks: { font: { size: 11 } } }, x: { type: 'linear', min: 2010, max: 2070, grid: { display: false }, ticks: { font: { size: 11 }, stepSize: 20, callback: n => n } } } },
        plugins: [valueLabels] });
    },
    'ch-f-mig': el => new Chart(el, { type: 'bar', data: { labels: [t('Fewer', 'Meno'), t('Baseline', 'Base'), t('More', 'Più')],
      datasets: [{ data: [16.1, 15.5, 14.9], backgroundColor: [C.old, '#b8c2d6', C.young], borderRadius: 6 }] },
      options: { ...MINI, animation: { duration: 1400 }, plugins: { ...MINI.plugins, valueLabels: { suffix: '%' } },
        scales: { y: { grid, min: 14, max: 16.6, ticks: { font: { size: 11 } }, title: { display: true, text: t('pension spending 2050, % GDP', 'spesa pensioni 2050, % PIL'), font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 12 } }, title: { display: true, text: t('migrants (±33%)', 'migranti (±33%)'), font: { size: 11 } } } } },
      plugins: [valueLabels] }),
    'ch-f-work': el => {
      const yrs = [2010, 2020, 2030, 2040, 2050, 2060, 2070], age = [65 + 4 / 12, 67, 67.5, 68 + 2 / 12, 69, 69.75, 70.25];
      const lab = a => { const y = Math.floor(a), m = Math.round((a - y) * 12); return m ? `${y}+${m}${t('m', 'm')}` : `${y}`; };
      return new Chart(el, { type: 'line', data: { labels: yrs, datasets: [{ data: age, stepped: 'after', borderColor: C.accent, backgroundColor: 'rgba(35,70,199,.12)',
        fill: true, borderWidth: 3, pointRadius: 4, pointBackgroundColor: C.accent }] },
        options: { ...MINI, animation: { duration: 1600 }, plugins: { ...MINI.plugins, valueLabels: { points: [0, 6], fmt: lab },
          tooltip: { callbacks: { label: c => lab(c.raw) } } },
          layout: { padding: { top: 22, right: 34 } },
          scales: { y: { grid, min: 64, max: 71, ticks: { font: { size: 11 }, stepSize: 1 }, title: { display: true, text: t('age', 'età'), font: { size: 11 } } },
            x: { grid: { display: false }, ticks: { font: { size: 11 } } } } },
        plugins: [valueLabels] });
    },
    'ch-f-ai': el => new Chart(el, { type: 'bar', data: { labels: [t('Advanced', 'Avanzate'), t('World', 'Mondo'), t('Emerging', 'Emergenti'), t('Low income', 'Basso reddito')],
      datasets: [{ data: [60, 40, 40, 26], backgroundColor: [C.accent, '#7d8fd8', '#a9b6e6', '#cfd7f2'], borderRadius: 6 }] },
      options: { ...MINI, indexAxis: 'y', animation: { duration: 1400 }, plugins: { ...MINI.plugins, valueLabels: { suffix: '%' } },
        scales: { x: { grid, min: 0, max: 75, ticks: { font: { size: 11 } }, title: { display: true, text: t('% of jobs exposed to AI', '% di posti esposti all\'IA'), font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { font: { size: 12 } } } } },
      plugins: [valueLabels] }),
    'ch-pyramid': el => buildPyramid(el),
    'ch-aaron': el => buildAaron(el),
    'ch-scen': el => buildScenarios(el),
    'ch-pc': el => buildPensionCalc(el),
    'ch-gen': el => buildGenAccount(el)
  };

  function buildChartsIn(slide) {
    slide.querySelectorAll('canvas[id]').forEach(cv => {
      if (!charts[cv.id] && builders[cv.id]) {
        try { charts[cv.id] = builders[cv.id](cv); } catch (e) { console.error(cv.id, e); }
      }
    });
    // D3 visualisations from js/reform_viz.js
    slide.querySelectorAll('[data-viz]').forEach(el => {
      const build = (window.PACT_VIZ || {})[el.dataset.viz];
      if (!el.dataset.built && build) {
        el.dataset.built = '1';
        try { build(el); } catch (e) { console.error(el.dataset.viz, e); }
      }
    });
  }

  // ------------------------------------------------------------- pyramid
  function buildPyramid(el) {
    const P = D.pyramid, ages = P.ages.slice().reverse();
    const get = y => { const d = P.years[y]; return { m: d.m.slice().reverse().map(v => -v), f: d.f.slice().reverse() }; };
    const d0 = get(2025);
    const PLAY = t('▶ Play', '▶ Avvia'), PAUSE = t('⏸ Pause', '⏸ Pausa');
    const ch = new Chart(el, { type: 'bar', data: { labels: ages, datasets: [
      { label: t('Men', 'Uomini'), data: d0.m, backgroundColor: C.young, barPercentage: 1, categoryPercentage: .95 },
      { label: t('Women', 'Donne'), data: d0.f, backgroundColor: C.old, barPercentage: 1, categoryPercentage: .95 }] },
      options: { indexAxis: 'y', animation: { duration: 350 }, plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${Math.abs(c.raw).toLocaleString(IT ? 'it-IT' : 'en-US')}k` } } },
        scales: { x: { stacked: true, min: -2800, max: 2800, grid, ticks: { callback: v => Math.abs(v) } },
          y: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } } } } });
    const slider = document.getElementById('pyr-slider'), lab = document.getElementById('pyr-year');
    const update = () => { const d = get(slider.value); ch.data.datasets[0].data = d.m; ch.data.datasets[1].data = d.f; ch.update(); lab.textContent = slider.value; };
    slider.addEventListener('input', update);
    let timer = null;
    document.getElementById('pyr-play').addEventListener('click', e => {
      if (timer) { clearInterval(timer); timer = null; e.target.textContent = PLAY; return; }
      if (+slider.value >= 2100) slider.value = 1950;
      e.target.textContent = PAUSE;
      timer = setInterval(() => { slider.value = +slider.value + 5; update(); if (+slider.value >= 2100) { clearInterval(timer); timer = null; e.target.textContent = PLAY; } }, 450);
    });
    document.getElementById('pyr-hide').addEventListener('click', e => {
      lab.style.visibility = lab.style.visibility === 'hidden' ? 'visible' : 'hidden';
      e.target.textContent = lab.style.visibility === 'hidden' ? t('Show year', 'Mostra anno') : t('Hide year', 'Nascondi anno');
    });
    return ch;
  }

  // ------------------------------------------------------------- Aaron simulator
  function buildAaron(el) {
    const ids = ['n', 'g', 'r'], s = {};
    ids.forEach(k => s[k] = document.getElementById('ac-' + k));
    const ch = new Chart(el, { type: 'line', data: { labels: [], datasets: [
      { label: t('PAYG: grows at n + g', 'Ripartizione: cresce a n + g'), data: [], borderColor: C.young, backgroundColor: 'rgba(15,139,141,.12)', fill: true, borderWidth: 3, pointRadius: 0 },
      { label: t('Funded: grows at r', 'Capitalizzazione: cresce a r'), data: [], borderColor: C.old, borderWidth: 3, pointRadius: 0 }] },
      options: { animation: { duration: 250 }, scales: { y: { grid, title: { display: true, text: t('€ at retirement', '€ al pensionamento') } }, x: { grid: { display: false }, title: { display: true, text: t('years of career', 'anni di carriera') } } } } });
    const upd = () => {
      const n = +s.n.value / 100, g = +s.g.value / 100, r = +s.r.value / 100;
      ids.forEach(k => document.getElementById(`ac-${k}-v`).textContent = fmt((+s[k].value).toFixed(1)) + '%');
      const payg = [], fund = [], lab = []; let a = 0, b = 0;
      for (let y = 1; y <= 40; y++) { a = a * (1 + n) * (1 + g) + 1; b = b * (1 + r) + 1; payg.push(+a.toFixed(1)); fund.push(+b.toFixed(1)); lab.push(y); }
      ch.data.labels = lab; ch.data.datasets[0].data = payg; ch.data.datasets[1].data = fund; ch.update();
      const v = document.getElementById('ac-verdict'), ng = fmt((((1 + n) * (1 + g) - 1) * 100).toFixed(1)), rr = fmt((r * 100).toFixed(1));
      v.innerHTML = ((1 + n) * (1 + g) - 1) > r
        ? `<span style="color:${C.good}">n + g = ${ng}% &gt; r = ${rr}% → ${t('the pact makes all generations better off', 'il patto migliora la condizione di tutte le generazioni')}</span>`
        : `<span style="color:${C.bad}">n + g = ${ng}% &lt; r = ${rr}% → ${t('each new generation loses compared with saving', 'ogni nuova generazione perde rispetto al risparmio')}</span>`;
    };
    ids.forEach(k => s[k].addEventListener('input', upd));
    document.querySelectorAll('[data-ac]').forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.ac === '1965' ? { n: 0.7, g: 5.0, r: 1.1 } : { n: -0.6, g: 1.2, r: 1.5 };
      ids.forEach(k => s[k].value = p[k]); upd();
    }));
    upd();
    return ch;
  }

  // ------------------------------------------------------------- scenarios (Ageing Report 2024, Italy)
  function buildScenarios(el) {
    const years = [2022, 2030, 2040, 2050, 2070];
    // [label EN, label IT, values, explanation EN, explanation IT]
    const S = [
      ['Baseline', 'Scenario base', [15.6, 16.6, 17.1, 15.5, 13.7],
        el.closest('.scen-large') ? '' : 'Baseline projection of the 2024 Ageing Report for Italy.',
        el.closest('.scen-large') ? '' : 'Proiezione di base dell\'Ageing Report 2024 per l\'Italia.'],
      ['Migration +33%', 'Migrazione +33%', [15.6, 16.5, 16.7, 14.9, 13.1],
        'More (working-age) migrants: more contributors. The bill falls by about 0.6 points of GDP in 2050.',
        'Più migranti (in età lavorativa) = più contribuenti. La spesa scende di circa 0,6 punti di PIL nel 2050.'],
      ['Migration −33%', 'Migrazione −33%', [15.6, 16.8, 17.5, 16.1, 14.4],
        'Fewer migrants: the peak rises to 17.5% of GDP.',
        'Meno migranti: il picco sale al 17,5% del PIL.'],
      ['Fertility −20%', 'Fecondità −20%', [15.6, 16.6, 17.0, 15.6, 14.3],
        'Fewer babies barely matter before 2050 (they are not workers yet), but cost +0.6 points by 2070.',
        'Meno nascite contano poco prima del 2050 (non sono ancora lavoratori), ma costano +0,6 punti nel 2070.'],
      ['Older workers employed +10 pp', 'Occupazione anziani +10 pp', [15.6, 15.4, 16.4, 15.7, 13.9],
        'Working longer is the strongest lever in the short run: −1.2 points in 2030.',
        'Lavorare più a lungo è la leva più forte nel breve periodo: −1,2 punti nel 2030.'],
      ['Productivity +0.2 pp', 'Produttività +0,2 pp', [15.6, 16.6, 17.1, 15.4, 13.2],
        'Faster growth (g!) helps in the long run, partly because pensions are indexed to prices, not wages.',
        'Più crescita (g!) aiuta nel lungo periodo, anche perché le pensioni sono indicizzate ai prezzi e non ai salari.'],
      ['Productivity −0.2 pp', 'Produttività −0,2 pp', [15.6, 16.6, 17.2, 16.0, 14.3],
        'Slower growth pushes spending up in the long run.',
        'Meno crescita fa salire la spesa nel lungo periodo.'],
      ['Life expectancy +2 years', 'Speranza di vita +2 anni', [15.6, 16.6, 17.0, 15.5, 13.6],
        'Surprise: living longer barely changes spending, because the retirement age is automatically linked to life expectancy.',
        'Sorpresa: vivere più a lungo quasi non cambia la spesa, perché l\'età di pensionamento è agganciata automaticamente alla speranza di vita.'],
      // baseline minus the art. 55 savings of 'ch-manovra' as % of GDP, one-off cut; after 2036 the linear fall is extrapolated
      ['2027 budget: indexation cut', 'Manovra 2027: taglio rivalutazione', [15.6, 16.54, 17.06, 15.48, 13.69],
        'The cut hurts pensions above €2,447 a month, but moves spending by only about −0.06 points in 2030: some 20 times less than employing more older workers.',
        'Il taglio pesa sulle pensioni sopra 2.447 € al mese, ma sposta la spesa di circa −0,06 punti nel 2030: circa 20 volte meno della maggiore occupazione degli anziani.']
    ].map(([le, li, v, te, ti]) => ({ label: t(le, li), v, txt: t(te, ti) }));
    // Short Italian deck only. Gap between "normativa antecedente al DL 201/2011" and current law, read from the vector paths of
    // RGS Rapporto n. 27, Riquadro 2.1, Fig. A.1 (+0.45, +1.10, +0.24, +0.02 in 2022, 2030, 2040, 2050), added to the Ageing Report
    // baseline used on this chart. The RGS figure stops in 2060, so there is no 2070 value.
    if (el.closest('.scen-large')) S.push({ label: t('Without the Fornero reform', 'Senza riforma Fornero'), v: [16.05, 17.7, 17.34, 15.52, null],
      txt: t('Without the 2011 reform and the rules that followed, spending would be about 1.1 points of GDP higher in 2030. The effect fades by around 2050.', 'Senza la riforma del 2011 e le norme successive, la spesa sarebbe più alta di circa 1,1 punti di PIL nel 2030. L\'effetto si esaurisce verso il 2050.') });
    const f = el.closest('.scen-large') ? { font: { size: 19 } } : {};   // short Italian deck: larger chart text
    const ch = new Chart(el, { type: 'line', data: { labels: years, datasets: [
      { label: t('Baseline (reference)', 'Scenario base (riferimento)'), data: S[0].v, borderColor: C.muted, borderDash: [6, 4], borderWidth: 2, pointRadius: 4 },
      { label: S[0].label, data: S[0].v, borderColor: C.old, backgroundColor: C.old, borderWidth: 4, pointRadius: 6 }] },
      options: { animation: { duration: 500 }, plugins: { legend: { labels: f } },
        scales: { y: { min: 13, max: 18, grid, ticks: f, title: { display: true, text: PCT_GDP, ...f } }, x: { grid: { display: false }, ticks: f } } } });
    const box = document.getElementById('scen-buttons'), txt = document.getElementById('scen-text');
    S.forEach((sc, i) => {
      const b = document.createElement('button'); b.textContent = sc.label; b.style.display = 'block'; b.style.width = '100%';
      if (i === 0) b.classList.add('on');
      b.addEventListener('click', () => {
        box.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
        ch.data.datasets[1].data = sc.v; ch.data.datasets[1].label = sc.label; ch.update(); txt.textContent = sc.txt;
      });
      box.appendChild(b);
    });
    txt.textContent = S[0].txt;
    return ch;
  }

  // ------------------------------------------------------------- your pension (contributivo)
  // Everything in 2026 euros (real terms). Someone born in 2006 meets the old-age requirement at about 70 y 6 m
  // in 2076 (RGS Rapporto n. 27, Table A1.4); early exit is 3 years earlier. The coefficients at those ages are
  // calibrated on RGS Table 6.1 (2070). TFR (employees only): 6.91% of pay, revalued at 1.5% + 75% of inflation
  // (≈ 1% real with 2% inflation), kept by the employer and paid as a lump sum. Or it goes to a pension fund with
  // 1% from the worker + 1% from the employer, at a 1.6% real net return (RGS).
  const PC = { born: 2006, now: 2026, oldAge: 70 + 6 / 12, ct: { old: 0.0555, early: 0.0503 }, as: 546.24,
    tfrRate: 0.0691, tfrRet: 0.010, fundRate: 0.0891, fundRet: 0.016 };
  const PC_BASE = { start: 24, w0: 24000, gw: 1.5, gdp: 0.5, gaps: 0, rate: 0.33, exit: 'old', tfr: 'firm' };
  function pensionModel(p) {
    const R = p.exit === 'early' ? PC.oldAge - 3 : PC.oldAge, N = R - p.start, dens = Math.max(0, 1 - p.gaps / N);
    const gw = p.gw / 100, gdp = p.gdp / 100, emp = p.rate === 0.33, toFund = emp && p.tfr === 'fund';
    let M = 0, T = 0, w = p.w0;
    for (let k = 0; k < Math.ceil(N); k++) {
      const fr = Math.min(1, N - k), left = N - k - fr;   // fr: share of the year worked (last year is partial)
      w = p.w0 * Math.pow(1 + gw, k);
      M += p.rate * w * fr * dens * Math.pow(1 + gdp, left);   // notional account revalued with GDP
      if (emp) T += (toFund ? PC.fundRate : PC.tfrRate) * w * fr * dens * Math.pow(1 + (toFund ? PC.fundRet : PC.tfrRet), left);
    }
    const ct = PC.ct[p.exit], pub = M * ct / 13, side = T * ct * 0.99 / 13;   // TFR or fund as a monthly annuity
    const thr = 3.2 * PC.as * Math.pow(1 + gdp, PC.born + R - PC.now);   // early-exit threshold, revalued with GDP
    return { R, N, M, ct, pub, side, lump: T, emp, toFund, first: p.rate * p.w0, last: w, rr: pub * 13 / w * 100,
      rrAll: (pub + side) * 13 / w * 100, thr, ok: p.exit === 'old' || pub >= thr, year: Math.floor(PC.born + R) };
  }

  function initAlex() {
    const r = pensionModel(PC_BASE), e = pensionModel({ ...PC_BASE, exit: 'early' });
    const pct = v => fmt(v.toFixed(2)) + '%';
    const rows = [
      [t('Starts working at 24 on €24,000 gross a year', 'Inizia a lavorare a 24 anni con 24.000 € lordi l\'anno'), t(`33% → ${eur(r.first)} credited in year 1`, `33% → ${eur(r.first)} accreditati il primo anno`)],
      [t('Real pay grows 1.5% a year (productivity + career)', 'Lo stipendio reale cresce dell\'1,5% l\'anno (produttività + carriera)'), t(`last wage ${eur(r.last)} a year`, `ultimo stipendio ${eur(r.last)} l'anno`)],
      [t(`${Math.round(r.N)} years of contributions, each revalued with GDP (+0.5% real a year)`, `${Math.round(r.N)} anni di contributi, ciascuno rivalutato con il PIL (+0,5% reale l'anno)`), t(`account (<em>montante</em>) ${eur(r.M)}`, `montante ${eur(r.M)}`)],
      [t(`Retires at the old-age requirement: ${ageLab(r.R)}, in ${r.year}`, `Va in pensione al requisito di vecchiaia: ${ageLab(r.R)}, nel ${r.year}`), t(`× coefficient ${pct(r.ct * 100)} = ${eur(r.M * r.ct)} a year`, `× coefficiente ${pct(r.ct * 100)} = ${eur(r.M * r.ct)} l'anno`)],
      [t('Paid in 13 monthly instalments', 'Pagata in 13 mensilità'), t(`${eur(r.pub)} a month`, `${eur(r.pub)} al mese`)],
      [document.getElementById('alex-steps').classList.contains('big')
        ? t('Plus the TFR, 6.91% of pay each year, if Alex chooses to leave it with the employer (with no choice within 60 days it goes to a pension fund)', 'In più il TFR, il 6,91% dello stipendio ogni anno, se Alex sceglie di lasciarlo in azienda (senza una scelta entro 60 giorni va a un fondo pensione)')
        : t('Plus the TFR: 6.91% of pay a year, kept by the employer (1.5% + 75% of inflation)', 'In più il TFR: il 6,91% dello stipendio ogni anno, accantonato in azienda (1,5% + 75% dell\'inflazione)'),
        t(`lump sum ${eur(r.lump)} (≈ ${eur(r.side)} a month as an annuity)`, `liquidazione di ${eur(r.lump)} (≈ ${eur(r.side)} al mese come rendita)`)]
    ];
    document.getElementById('alex-steps').innerHTML = `<tr><th></th><th>${t('Step', 'Passo')}</th><th>${t('Result', 'Risultato')}</th></tr>` +
      rows.map(([a, b], i) => `<tr><td>${i + 1}</td><td>${a}</td><td><strong>${b}</strong></td></tr>`).join('');
    document.getElementById('alex-pension').textContent = eur(r.pub);
    document.getElementById('alex-rr').textContent = fmt(r.rr.toFixed(0)) + '%';
    document.getElementById('alex-why').innerHTML = t(
      `<strong>Why not more?</strong> Alex's pay grows faster (1.5%) than the return on contributions (0.5%), so the early, low-wage years weigh more. <strong>Retire at ${ageLab(e.R)} instead?</strong> The pension would be ${eur(e.pub)}, ` +
        (e.ok ? `above the early-exit threshold of ${eur(e.thr)}: allowed.` : `below the early-exit threshold of ${eur(e.thr)} (3.2 × <em>assegno sociale</em>): not allowed.`),
      `<strong>Perché non di più?</strong> Lo stipendio di Alex cresce più in fretta (1,5%) del rendimento dei contributi (0,5%), quindi pesano di più i primi anni, con stipendi bassi. <strong>E andare in pensione a ${ageLab(e.R)}?</strong> La pensione sarebbe di ${eur(e.pub)}, ` +
        (e.ok ? `sopra la soglia per l'anticipata di ${eur(e.thr)}: consentito.` : `sotto la soglia per l'anticipata di ${eur(e.thr)} (3,2 × assegno sociale): non consentito.`));
  }

  function buildPensionCalc(el) {
    // [label EN, label IT, changes from the baseline, explanation EN, explanation IT]
    const P = [
      ['Baseline', 'Base', {}, 'RGS baseline growth, start at 24, continuous career, TFR left with the employer.', 'Crescita dello scenario base RGS, inizio a 24 anni, carriera continua, TFR lasciato in azienda.'],
      ['Retire at ~67', 'Anticipata ~67', { exit: 'early' }, 'Three years earlier: fewer contributions, a lower coefficient, and the pension must exceed the threshold.',
        'Tre anni prima: meno contributi, coefficiente più basso, e la pensione deve superare la soglia.'],
      ['Late start + gaps', 'Inizio tardi + buchi', { start: 27, gaps: 6 }, 'Start at 27, then 6 years without contributions (unemployment, undeclared work, abroad).',
        'Inizio a 27 anni, poi 6 anni senza contributi (disoccupazione, lavoro nero, estero).'],
      ['Low growth', 'Bassa crescita', { gdp: 0, gw: 1 }, 'GDP stops growing: your contributions earn no real return.', 'Il PIL smette di crescere: i tuoi contributi non hanno rendimento reale.'],
      ['Higher growth', 'Più crescita', { gdp: 1.2, gw: 1.8 }, 'Faster growth (g!) raises the hidden return on your contributions.', 'Più crescita (g!) alza il rendimento nascosto dei tuoi contributi.'],
      ['Self-employed', 'Autonomo', { rate: 0.24 }, 'Artisans and traders pay 24% instead of 33%, and have no TFR: a much lower income in old age.', 'Artigiani e commercianti versano il 24% invece del 33% e non hanno il TFR: un reddito da anziani molto più basso.'],
      ['TFR → pension fund', 'TFR → fondo pensione', { tfr: 'fund' }, 'The TFR goes to a pension fund: you add 1%, your employer adds 1% (only if you join), invested at 1.6% real instead of 1%.',
        'Il TFR va a un fondo pensione: tu aggiungi l\'1%, il datore di lavoro l\'1% (solo se aderisci), investiti all\'1,6% reale invece dell\'1%.']
    ].map(([le, li, o, te, ti]) => ({ label: t(le, li), p: { ...PC_BASE, ...o }, txt: t(te, ti) }))
      // short Italian deck: no presets that repeat the employee / exit / TFR buttons
      .filter(s => !(document.getElementById('pc-presets').classList.contains('pc-large') && ['Anticipata ~67', 'Autonomo', 'TFR → fondo pensione', 'Retire at ~67', 'Self-employed', 'TFR → pension fund'].includes(s.label)));
    const res = P.map(s => pensionModel(s.p)), keys = ['start', 'w0', 'gw', 'gdp', 'gaps'], inp = {};
    keys.forEach(k => inp[k] = document.getElementById('pc-' + k));
    const out = document.getElementById('pc-out'), box = document.getElementById('pc-presets');
    let cur = { ...PC_BASE }, note = P[0].txt;
    const totals = { id: 'pcTotals', afterDatasetsDraw(c) {
      const { ctx } = c, d0 = c.data.datasets[0].data, d1 = c.data.datasets[1].data;
      ctx.save(); ctx.font = '700 12px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textBaseline = 'middle';
      c.getDatasetMeta(1).data.forEach((b, i) => ctx.fillText(eur(d0[i] + d1[i]), b.x + 6, b.y));
      ctx.restore();
    } };
    // no bar chart when its box is hidden (short Italian deck): the calculator still runs
    const ch = el.closest('[hidden]') ? null : new Chart(el, { type: 'bar', data: { labels: [...P.map(s => s.label), t('Your choices', 'Le tue scelte')], datasets: [
      { label: t('Public pension', 'Pensione pubblica'), data: [], backgroundColor: [], borderRadius: 4 },
      { label: t('TFR or pension fund (monthly)', 'TFR o fondo pensione (mensile)'), data: [], backgroundColor: [], borderRadius: 4 }] },
      options: { indexAxis: 'y', animation: { duration: 300 }, layout: { padding: { right: 64 } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${eur(c.raw)}` } } },
        scales: { x: { stacked: true, min: 0, grid, ticks: { font: { size: 11 }, callback: v => eur(v) } },
          y: { stacked: true, grid: { display: false }, ticks: { font: { size: 12 } } } } },
      plugins: [totals] });
    const setOn = (sel, test) => document.querySelectorAll(sel).forEach(b => b.classList.toggle('on', test(b)));
    const upd = () => {
      keys.forEach(k => cur[k] = +inp[k].value);
      document.getElementById('pc-start-v').textContent = t(cur.start, cur.start + ' anni');
      document.getElementById('pc-w0-v').textContent = eur(cur.w0);
      document.getElementById('pc-gw-v').textContent = fmt(cur.gw.toFixed(1)) + '%';
      document.getElementById('pc-gdp-v').textContent = fmt(cur.gdp.toFixed(1)) + '%';
      document.getElementById('pc-gaps-v').textContent = cur.gaps;
      const r = pensionModel(cur), all = [...res, r];
      if (ch) {
        ch.data.datasets[0].data = all.map(x => Math.round(x.pub));
        ch.data.datasets[1].data = all.map(x => Math.round(x.side));
        ch.data.datasets[0].backgroundColor = all.map((x, i) => !x.ok ? C.bad : i === all.length - 1 ? C.accent : C.young);
        ch.data.datasets[1].backgroundColor = all.map(x => x.toFund ? '#9fd3d4' : '#c9ced8');
        ch.update();
      }
      const side = !r.emp ? t('No TFR for the self-employed.', 'Niente TFR per gli autonomi.')
        : r.toFund && box.classList.contains('pc-large') ? t(`+ pension fund <strong>${eur(r.side)}</strong> a month (<strong>${fmt(r.rrAll.toFixed(0))}%</strong> in total, against ${fmt(pensionModel({ ...cur, tfr: 'firm' }).rrAll.toFixed(0))}% with the TFR left with the employer and turned into an annuity)`, `+ fondo pensione <strong>${eur(r.side)}</strong> al mese (<strong>${fmt(r.rrAll.toFixed(0))}%</strong> in totale, contro ${fmt(pensionModel({ ...cur, tfr: 'firm' }).rrAll.toFixed(0))}% con il TFR lasciato in azienda e trasformato in rendita)`)
        : r.toFund ? t(`+ pension fund <strong>${eur(r.side)}</strong> a month (${fmt(r.rrAll.toFixed(0))}% in total)`, `+ fondo pensione <strong>${eur(r.side)}</strong> al mese (${fmt(r.rrAll.toFixed(0))}% in totale)`)
        : t(`+ TFR lump sum <strong>${eur(r.lump)}</strong> (≈ ${eur(r.side)} a month as an annuity)`, `+ liquidazione TFR <strong>${eur(r.lump)}</strong> (≈ ${eur(r.side)} al mese come rendita)`);
      out.innerHTML = `<div class="pc-big">${eur(r.pub)} <small>${t('public pension, gross a month, in today\'s euros', 'pensione pubblica, lordi al mese, in euro di oggi')}</small></div>
        <p>${t('Replacement rate', 'Tasso di sostituzione')} <strong>${fmt(r.rr.toFixed(0))}%</strong> · ${t('retire at', 'in pensione a')} <strong>${ageLab(r.R)}</strong> (${r.year}) · ${t('account', 'montante')} <strong>${eur(r.M)}</strong></p><p>${side}</p>` +
        (r.ok ? `<p>${note}</p>` : `<p class="pc-warn">❌ ${t(`Early exit not allowed: ${eur(r.pub)} is below the threshold of ${eur(r.thr)}. You must wait until ${ageLab(PC.oldAge)}.`,
          `Anticipata non consentita: ${eur(r.pub)} è sotto la soglia di ${eur(r.thr)}. Bisogna aspettare ${ageLab(PC.oldAge)}.`)}</p>`);
    };
    const apply = (p, i) => {
      cur = { ...p }; keys.forEach(k => inp[k].value = p[k]); note = P[i].txt;
      setOn('[data-pc-rate]', b => +b.dataset.pcRate === p.rate); setOn('[data-pc-exit]', b => b.dataset.pcExit === p.exit);
      setOn('[data-pc-tfr]', b => b.dataset.pcTfr === p.tfr);
      box.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i));
      upd();
    };
    const custom = () => { note = t('Your own scenario: compare it with the presets.', 'Il tuo scenario: confrontalo con quelli predefiniti.'); box.querySelectorAll('button').forEach(b => b.classList.remove('on')); upd(); };
    P.forEach((s, i) => { const b = document.createElement('button'); b.textContent = s.label; b.addEventListener('click', () => apply(s.p, i)); box.appendChild(b); });
    keys.forEach(k => inp[k].addEventListener('input', custom));
    document.querySelectorAll('[data-pc-rate]').forEach(b => b.addEventListener('click', () => { cur.rate = +b.dataset.pcRate; setOn('[data-pc-rate]', x => x === b); custom(); }));
    document.querySelectorAll('[data-pc-exit]').forEach(b => b.addEventListener('click', () => { cur.exit = b.dataset.pcExit; setOn('[data-pc-exit]', x => x === b); custom(); }));
    document.querySelectorAll('[data-pc-tfr]').forEach(b => b.addEventListener('click', () => { cur.tfr = b.dataset.pcTfr; setOn('[data-pc-tfr]', x => x === b); custom(); }));
    apply(P[0].p, 0);
    return ch;
  }

  // ------------------------------------------------------------- generational account (simplified, illustrative)
  // Present value AT BIRTH, in 2026 euros, of the pension contributions a person pays and the pension they get back,
  // discounted at the real interest rate r. Not an official estimate: a teaching version of generational accounting.
  // Child born 2026, contributivo: 33% of pay; real pay = 24,000 € × (1+g)^age (productivity), + 0.6%/yr career;
  //   account revalued with g; retires at 71 (assumption: the requirement keeps rising after 2070);
  //   coefficient 5.6%, paid for as many years as it takes to return the account at the 1.5% technical rate (≈ 21).
  // Grandfather born 1946, retributivo: works 20–59, real pay +2.5%/yr, average contribution rate 25%,
  //   pension 80% of the last wage (2% × 40 years) from 60 for 24 years. Illustrative assumptions.
  const GA = { w0: 24000, car: 0.006, R: 71, ct: 0.056, tech: 0.015, rate: 0.33,
    n: { s: 20, R: 60, gw: 0.025, rate: 0.25, rr: 0.8, L: 24 } };
  function genAccount(g, r, s) {
    let M = 0, pvC = 0;
    for (let a = s; a < GA.R; a++) {
      const c = GA.rate * GA.w0 * Math.pow(1 + g, a) * Math.pow(1 + GA.car, a - s);
      M += c * Math.pow(1 + g, GA.R - a); pvC += c * Math.pow(1 + r, -a);
    }
    const P = M * GA.ct; let acc = 0, pvP = 0;
    for (let k = 0; acc < M && k < 60; k++) { acc += P * Math.pow(1 + GA.tech, -k); pvP += P * Math.pow(1 + r, -(GA.R + k)); }
    return { pvC, pvP, ratio: 100 * pvP / pvC, net: pvP - pvC, month: P / 13 };
  }
  function grandpaRatio(r) {
    const N = GA.n; let pvC = 0, pvP = 0;
    for (let a = N.s; a < N.R; a++) pvC += N.rate * Math.pow(1 + N.gw, a - N.s) * Math.pow(1 + r, -a);
    const last = Math.pow(1 + N.gw, N.R - 1 - N.s);
    for (let k = 0; k < N.L; k++) pvP += N.rr * last * Math.pow(1 + r, -(N.R + k));
    return 100 * pvP / pvC;
  }
  function buildGenAccount(el) {
    const inp = { g: document.getElementById('ga-g'), r: document.getElementById('ga-r'), s: document.getElementById('ga-s') };
    const out = document.getElementById('ga-out');
    const ch = new Chart(el, { type: 'bar',
      data: { labels: [t('Grandpa (born 1946, retributivo)', 'Nonno (nato 1946, retributivo)'), t('Child (born 2026, contributivo)', 'Bambino (nato 2026, contributivo)')],
        datasets: [{ label: t('Paid in', 'Versato'), data: [100, 100], backgroundColor: '#c9ced8', borderRadius: 4 },
          { label: t('Got back (present value)', 'Ricevuto (valore attuale)'), data: [], backgroundColor: [C.old, C.young], borderRadius: 4 }] },
      options: { animation: { duration: 300 },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${eur(c.raw)}` } } },
        scales: { y: { min: 0, suggestedMax: 200, grid, title: { display: true, text: t('€ for every €100 paid in', '€ per ogni 100 € versati') } }, x: { grid: { display: false } } } },
      plugins: [{ id: 'gaLabels', afterDatasetsDraw(c) {   // value on top of every bar, both series
        const { ctx } = c; ctx.save(); ctx.font = '700 16px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        c.data.datasets.forEach((d, di) => c.getDatasetMeta(di).data.forEach((b, i) => ctx.fillText(eur(d.data[i]), b.x, b.y - 6)));
        ctx.restore();
      } }] });
    const upd = () => {
      const g = +inp.g.value / 100, r = +inp.r.value / 100, s = +inp.s.value, k = genAccount(g, r, s), n = grandpaRatio(r);
      document.getElementById('ga-g-v').textContent = fmt((g * 100).toFixed(1)) + '%';
      document.getElementById('ga-r-v').textContent = fmt((r * 100).toFixed(1)) + '%';
      document.getElementById('ga-s-v').textContent = t(s, s + ' anni');
      ch.data.datasets[1].data = [Math.round(n), Math.round(k.ratio)];
      ch.update();
      const loss = k.net < 0;
      out.innerHTML = `<div class="pc-big" style="color:${loss ? C.bad : C.good}">${loss ? '−' : '+'}${eur(Math.abs(k.net))}</div>
        <p style="margin:2px 0 10px">${loss ? t('net loss of the child, valued today (at birth)', 'perdita netta del bambino, valutata oggi (alla nascita)')
          : t('net gain of the child, valued today (at birth)', 'guadagno netto del bambino, valutato oggi (alla nascita)')}</p>
        <p>${t(`Pays in <strong>${eur(k.pvC)}</strong>, gets back <strong>${eur(k.pvP)}</strong> (present values).`,
          `Versa <strong>${eur(k.pvC)}</strong>, riceve <strong>${eur(k.pvP)}</strong> (valori attuali).`)}</p>
        <p>${g < r ? t(`Here g (${fmt((g * 100).toFixed(1))}%) &lt; r (${fmt((r * 100).toFixed(1))}%): Aaron's condition fails, so the child gets back less than it pays. This gap is its share of the <strong>implicit debt</strong>.`,
            `Qui g (${fmt((g * 100).toFixed(1))}%) &lt; r (${fmt((r * 100).toFixed(1))}%): la condizione di Aaron non vale, e il bambino riceve meno di quanto versa. Questa differenza è la sua quota del <strong>debito implicito</strong>.`)
          : t('Here g ≥ r: the pay-as-you-go system pays at least as well as saving.', 'Qui g ≥ r: la ripartizione rende almeno quanto il risparmio.')}</p>`;
    };
    Object.values(inp).forEach(i => i.addEventListener('input', upd));
    document.querySelectorAll('[data-ga]').forEach(b => b.addEventListener('click', () => {
      const [g, r, s] = b.dataset.ga.split(',');
      inp.g.value = g; inp.r.value = r; inp.s.value = s;
      document.querySelectorAll('[data-ga]').forEach(x => x.classList.toggle('on', x === b)); upd();
    }));
    upd();
    return ch;
  }

  // ------------------------------------------------------------- polls
  function initPolls() {
    document.querySelectorAll('.poll').forEach(p => {
      const key = 'poll_' + p.dataset.poll + SFX, votes = store.get(key, {});
      const render = () => {
        const tot = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
        p.querySelectorAll('.poll-row').forEach(r => {
          const v = votes[r.dataset.opt] || 0;
          r.querySelector('.cnt').textContent = v;
          r.querySelector('.poll-bar > div').style.width = (100 * v / tot) + '%';
        });
      };
      p.querySelectorAll('.poll-row').forEach(r => r.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        votes[r.dataset.opt] = Math.max(0, (votes[r.dataset.opt] || 0) + +b.dataset.d); store.set(key, votes); render();
      })));
      render();
    });
  }
  function renderPollRecall() {
    const v = store.get('poll_retire' + SFX, {}), el = document.getElementById('poll-recall');
    const tot = Object.values(v).reduce((a, b) => a + b, 0);
    el.innerHTML = tot ? `<strong>${t('Your answers at the start:', 'Le vostre risposte all\'inizio:')}</strong> ` + Object.entries(v).map(([k, n]) => `${k}: ${n}`).join(' · ') + '<br>' +
      t('RGS: under current rules, a private employee retiring in 2070 meets the old-age requirement at <strong>about 70</strong> (or retires early at 67½ in the <em>contributivo</em> system).',
        'RGS: a normativa vigente, un dipendente privato che va in pensione nel 2070 matura il requisito di vecchiaia a <strong>circa 70 anni</strong> (oppure anticipa a 67 anni e mezzo nel sistema contributivo).') : '';
  }

  // ------------------------------------------------------------- quiz
  function initQuiz(root) {
    root.querySelectorAll('.quiz').forEach(q => {
      const right = +q.dataset.right, opts = q.querySelectorAll('.quiz-opt');
      opts.forEach(o => o.addEventListener('click', () => {
        opts.forEach((x, j) => x.classList.add(j === right ? 'right' : 'wrong'));
        q.querySelector('.quiz-explain').classList.add('show');
      }));
    });
  }

  function initBigThree() {
    const Q = IT ? [
      { q: '1. Hai 100 € su un conto di risparmio al 2% di interesse annuo. Dopo 5 anni, quanto avrai?', o: ['Più di 102 €', 'Esattamente 102 €', 'Meno di 102 €'], r: 0, e: 'Interesse composto: 100 × 1,02⁵ ≈ 110,4 €.' },
      { q: '2. Il tuo conto rende l\'1% e l\'inflazione è al 2% annuo. Dopo un anno, con il denaro sul conto potrai comprare…', o: ['Più di oggi', 'Esattamente lo stesso', 'Meno di oggi'], r: 2, e: 'Rendimento reale = 1% − 2% = −1%: l\'inflazione erode i risparmi.' },
      { q: '3. "Comprare le azioni di una sola società di solito garantisce un rendimento più sicuro di un fondo comune azionario."', o: ['Vero', 'Falso'], r: 1, e: 'Falso: la diversificazione riduce il rischio. È la domanda su cui si sbaglia di più.' }
    ] : [
      { q: '1. You have €100 in a savings account at 2% interest per year. After 5 years, how much will you have?', o: ['More than €102', 'Exactly €102', 'Less than €102'], r: 0, e: 'Compound interest: 100 × 1.02⁵ ≈ €110.4.' },
      { q: '2. Your account pays 1% interest and inflation is 2% per year. After 1 year, with the money in the account you can buy…', o: ['More than today', 'Exactly the same', 'Less than today'], r: 2, e: 'Real return = 1% − 2% = −1%: inflation eats your savings.' },
      { q: '3. "Buying a single company\'s stock usually provides a safer return than a stock mutual fund."', o: ['True', 'False'], r: 1, e: 'False: diversification reduces risk. This is the question people get wrong most often.' }
    ];
    const box = document.getElementById('bigthree');
    Q.forEach(item => {
      const d = document.createElement('div'); d.className = 'quiz'; d.dataset.right = item.r; d.style.marginBottom = '6px';
      d.innerHTML = `<p style="font-size:0.6em;margin:6px 0">${item.q}</p><div style="display:flex;gap:10px">` +
        item.o.map(o => `<div class="quiz-opt" style="flex:1;padding:8px 12px;font-size:0.55em">${o}</div>`).join('') +
        `</div><div class="quiz-explain" style="font-size:0.5em;margin-top:4px">✅ ${item.e}</div>`;
      box.appendChild(d);
    });
    initQuiz(box);
  }

  // ------------------------------------------------------------- timelines
  const TL_EN = {
    origins: [
      ['1889', 'Germany: Bismarck', 'The first compulsory old-age and disability insurance: contributory, for industrial workers, with retirement at 70 (when few lived that long). The <strong>Bismarckian</strong> model links benefits to work and contributions.'],
      ['1898', 'Italy: the Cassa Nazionale', 'Voluntary national fund for the disability and old age of workers. Insurance became compulsory in 1919; INFPS (later <strong>INPS</strong>) was founded in 1933.'],
      ['1935', 'USA: Social Security Act', "Roosevelt's New Deal response to the Great Depression: a PAYG, earnings-related old-age pension."],
      ['1942', 'UK: the Beveridge Report', 'Social insurance "from the cradle to the grave": universal, flat-rate benefits financed by taxes. The <strong>Beveridgean</strong> model aims at poverty prevention.'],
      ['1969', 'Italy: the Brodolini reform', 'Fully earnings-related (<em>retributivo</em>) pensions: up to 80% of final wages after 40 years. Also introduced the social pension and seniority pensions. Very generous, financed by the young and growing population of the boom.'],
      ['1973', 'Italy: "baby pensions"', 'Public employees could retire after 20 years of service, and married women with children after just <strong>14 years, 6 months and 1 day</strong>. Some of them have now received a pension for over 40 years.']
    ],
    world: [
      ['1981', 'Chile', 'Replaced PAYG with compulsory <strong>individual funded accounts</strong> (AFPs). Low coverage and low pensions led to a solidarity pillar in 2008 and a new reform in 2025 adding employer contributions.'],
      ['1994', 'World Bank', '"Averting the Old Age Crisis": the <strong>three-pillar model</strong> (public PAYG + mandatory funded + voluntary) inspired many reforms in Latin America and Eastern Europe.'],
      ['1999', 'Sweden', '<strong>Notional DC</strong> + a funded premium pension + an <strong>automatic balancing mechanism</strong> (the "brake") that cuts indexation if liabilities exceed assets.'],
      ['2004', 'Japan', 'The "macroeconomic slide" automatically adjusts benefits to the shrinking workforce and rising longevity.'],
      ['2007', 'Germany', 'After the Riester subsidised private pensions (2001), the retirement age was raised gradually from 65 to <strong>67 by 2031</strong>.'],
      ['2023', 'France', 'Retirement age raised from 62 to 64 despite months of mass protests. Its application was put on hold in 2025 amid a political crisis: an example of reform reversal.'],
      ['2024', 'China', 'First increase since the 1950s: men from 60 to 63, women from 50/55 to 55/58, phased in over 15 years starting in 2025.'],
      ['2025', 'USA', 'Social Security Trustees: the retirement trust fund will be <strong>depleted in 2033</strong>, after which only about 77% of benefits would be payable without reform.']
    ],
    italy: [
      ['1992', 'Amato', 'Retirement age raised from 55/60 to 60/65 (women/men); indexation to prices only; longer reference period for earnings. The first cut, made under the 1992 financial crisis.'],
      ['1995', 'Dini', 'The big switch to <strong>notional DC (contributivo)</strong>: pension = contributions × return linked to GDP growth × a conversion coefficient. Full application only for those who started working after 1995. A 40-year transition!'],
      ['2004–07', 'Maroni → Prodi', 'The "scalone" (an abrupt rise in the seniority requirement from 2008) was replaced in 2007 by gradual "quotas" (age + years of contributions).'],
      ['2010', 'Sacconi', 'Retirement ages <strong>automatically linked to life expectancy</strong> (DL 78/2010). According to RGS, removing this link would raise debt/GDP by about 38 points by 2070.'],
      ['2011', 'Fornero', 'Emergency reform during the sovereign debt crisis: <em>contributivo</em> pro rata for everyone from 2012; old-age retirement at 66, then 67 (2019).'],
      ['2019–25', 'Quota 100/102/103', 'Temporary early-exit windows (62+38, 64+38, 62+41): partial counter-reforms, costly and used less than expected.'],
      ['2026', 'Budget law 2026', 'The life-expectancy increase due in 2027 is reduced from 3 months to 1 month for that year only. Reforms keep going back and forth.']
    ]
  };
  const TL_IT = {
    origins: [
      ['1889', 'Germania: Bismarck', 'La prima assicurazione obbligatoria per vecchiaia e invalidità: contributiva, per gli operai dell\'industria, con pensione a 70 anni (quando pochi ci arrivavano). Il modello <strong>bismarckiano</strong> lega le prestazioni al lavoro e ai contributi.'],
      ['1898', 'Italia: la Cassa Nazionale', 'Cassa nazionale di previdenza per l\'invalidità e la vecchiaia degli operai, su base volontaria. L\'assicurazione diventa obbligatoria nel 1919; nel 1933 nasce l\'INFPS (poi <strong>INPS</strong>).'],
      ['1935', 'USA: Social Security Act', 'La risposta del New Deal di Roosevelt alla Grande Depressione: una pensione di vecchiaia a ripartizione, legata ai redditi.'],
      ['1942', 'Regno Unito: il Rapporto Beveridge', 'Protezione sociale "dalla culla alla tomba": prestazioni universali e uguali per tutti, finanziate dalle tasse. Il modello <strong>beveridgiano</strong> punta a prevenire la povertà.'],
      ['1969', 'Italia: la riforma Brodolini', 'Pensioni interamente <em>retributive</em>: fino all\'80% dell\'ultimo salario dopo 40 anni. Introdotte anche la pensione sociale e le pensioni di anzianità. Molto generose, finanziate da una popolazione giovane e in crescita (il boom).'],
      ['1973', 'Italia: le "baby pensioni"', 'I dipendenti pubblici potevano andare in pensione dopo 20 anni di servizio, e le donne sposate con figli dopo appena <strong>14 anni, 6 mesi e 1 giorno</strong>. Alcuni di loro ricevono la pensione da oltre 40 anni.']
    ],
    world: [
      ['1981', 'Cile', 'Sostituisce la ripartizione con <strong>conti individuali a capitalizzazione</strong> obbligatori (AFP). Bassa copertura e pensioni basse hanno portato a un pilastro solidale nel 2008 e a una nuova riforma nel 2025 con contributi a carico dei datori di lavoro.'],
      ['1994', 'Banca Mondiale', '"Averting the Old Age Crisis": il <strong>modello a tre pilastri</strong> (pubblico a ripartizione + capitalizzazione obbligatoria + volontario) ispira molte riforme in America Latina ed Europa orientale.'],
      ['1999', 'Svezia', '<strong>Contributivo nozionale</strong> + una pensione a capitalizzazione + un <strong>meccanismo di bilanciamento automatico</strong> (il "freno") che riduce l\'indicizzazione se le passività superano le attività.'],
      ['2004', 'Giappone', 'La "macroeconomic slide" adegua automaticamente le prestazioni al calo della forza lavoro e all\'aumento della longevità.'],
      ['2007', 'Germania', 'Dopo le pensioni private incentivate Riester (2001), l\'età di pensionamento sale gradualmente da 65 a <strong>67 anni entro il 2031</strong>.'],
      ['2023', 'Francia', 'Età di pensionamento da 62 a 64 anni nonostante mesi di proteste di massa. L\'applicazione è stata sospesa nel 2025 in piena crisi politica: un esempio di riforma rimessa in discussione.'],
      ['2024', 'Cina', 'Primo aumento dagli anni \'50: uomini da 60 a 63 anni, donne da 50/55 a 55/58, in modo graduale in 15 anni a partire dal 2025.'],
      ['2025', 'USA', 'Social Security Trustees: il fondo pensioni sarà <strong>esaurito nel 2033</strong>; senza riforme si potrebbe pagare solo circa il 77% delle prestazioni.']
    ],
    italy: [
      ['1992', 'Amato', 'Età di pensionamento da 55/60 a 60/65 anni (donne/uomini); indicizzazione ai soli prezzi; periodo di riferimento delle retribuzioni più lungo. Il primo taglio, nella crisi finanziaria del 1992.'],
      ['1995', 'Dini', 'La grande svolta verso il <strong>contributivo (nozionale)</strong>: pensione = contributi × rendimento legato alla crescita del PIL × coefficiente di trasformazione. Si applica in pieno solo a chi ha iniziato a lavorare dopo il 1995: una transizione di 40 anni!'],
      ['2004–07', 'Maroni → Prodi', 'Lo "scalone" (un brusco aumento del requisito di anzianità dal 2008) viene sostituito nel 2007 dalle "quote" graduali (età + anni di contributi).'],
      ['2010', 'Sacconi', 'Età di pensionamento <strong>agganciata automaticamente alla speranza di vita</strong> (DL 78/2010). Secondo la RGS, eliminare questo aggancio farebbe salire il rapporto debito/PIL di circa 38 punti al 2070.'],
      ['2011', 'Fornero', 'Riforma d\'emergenza durante la crisi del debito sovrano: contributivo pro rata per tutti dal 2012; pensione di vecchiaia a 66 anni, poi 67 (2019).'],
      ['2019–25', 'Quota 100/102/103', 'Finestre temporanee di uscita anticipata (62+38, 64+38, 62+41): controriforme parziali, costose e usate meno del previsto.'],
      ['2026', 'Legge di bilancio 2026', 'L\'aumento legato alla speranza di vita previsto per il 2027 viene ridotto da 3 mesi a 1 mese, solo per quell\'anno. Le riforme continuano ad andare avanti e indietro.']
    ]
  };
  function initTimelines() {
    const TL = IT ? TL_IT : TL_EN;
    document.querySelectorAll('[data-timeline]').forEach(bar => {
      const key = bar.dataset.timeline, items = TL[key], out = document.getElementById('tl-' + key);
      items.forEach(([y, title, txt], i) => {
        const b = document.createElement('button'); b.textContent = y;
        b.addEventListener('click', () => {
          bar.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
          out.innerHTML = `<h3>${y} · ${title}</h3><p>${txt}</p>`;
        });
        bar.appendChild(b);
        if (i === 0) b.click();
      });
    });
  }

  // ------------------------------------------------------------- candy chain
  function initChain() {
    const nS = document.getElementById('cc-n'), gS = document.getElementById('cc-g'), box = document.getElementById('chain');
    const tfr = box.classList.contains('chain-tfr'); // short IT deck: slider in children per woman, Gen 0 is one couple, fractional people drawn as smaller dots
    let path = null; // per-generation children-per-adult; null = constant from slider
    const render = () => {
      const g = +gS.value;
      document.getElementById('cc-n-v').textContent = path ? t('scenario', 'scenario') : fmt((+nS.value).toFixed(1));
      document.getElementById('cc-g-v').textContent = '+' + Math.round(g * 100) + '%';
      const N = 6, size = [tfr ? 2 : 4], candy = [1];
      for (let k = 1; k < N; k++) { const n = path ? path[k] : (tfr ? +nS.value / 2 : +nS.value); size.push(size[k - 1] * n); candy.push(candy[k - 1] * (1 + g)); }
      box.innerHTML = '';
      for (let k = 0; k < N; k++) {
        const whole = tfr ? Math.floor(size[k] + 1e-9) : Math.min(60, Math.round(size[k]));
        const frac = tfr ? size[k] - whole : 0;
        const dots = '<div class="p"></div>'.repeat(whole) + (frac >= 0.05 ? `<div class="p" style="transform:scale(${Math.sqrt(frac).toFixed(2)})"></div>` : '');
        let ret;
        if (k === 0) ret = `<span style="color:${C.good}">${t('free gift', 'regalo gratis')} 🎁</span>`;
        else if (k === N - 1) ret = `<span style="color:${C.muted}">${t('who pays them?', 'chi li paga?')} ❓</span>`;
        else { const rr = (size[k + 1] * candy[k + 1]) / (size[k] * candy[k]) - 1; ret = `<span style="color:${rr >= 0 ? C.good : C.bad}">${rr >= 0 ? '+' : ''}${Math.round(rr * 100)}%</span>`; }
        const recv = k < N - 1 ? fmt((size[k + 1] * candy[k + 1] / size[k]).toFixed(1)) : '?';
        box.insertAdjacentHTML('beforeend', `<div class="gen"><div class="people">${dots}</div>
          <div>${t('Gen', 'Gen')} ${k}<br>${fmt(size[k].toFixed(1))} ${t('people', 'persone')}</div><div class="candy">🍬 ${recv}</div><div>${t('each when old', 'a testa da anziani')}</div><div class="ret">${ret}</div></div>`);
      }
    };
    nS.addEventListener('input', () => { path = null; render(); });
    gS.addEventListener('input', render);
    document.getElementById('cc-boom').addEventListener('click', () => { path = [1, 2, 1.8, 0.9, 0.6, 0.6]; render(); });
    document.getElementById('cc-reset').addEventListener('click', () => { path = null; nS.value = nS.defaultValue; gS.value = 0; render(); });
    render();
  }

  // ------------------------------------------------------------- personas
  function initPersonas() {
    const R = D.rgs27, set = (id, v) => { document.getElementById(id).style.width = v + '%'; document.getElementById(id + '-t').textContent = fmt(v.toFixed(1)) + '%'; };
    const cap = document.getElementById('g-giulia-c');
    const opts = {
      emp: [R.replacement_private['2070'], t('Private employee, compulsory pension only', 'Dipendente privata, solo previdenza obbligatoria')],
      self: [R.replacement_selfemp['2070'], t('Self-employed: lower contribution rate, lower pension', 'Lavoratrice autonoma: aliquota contributiva più bassa, pensione più bassa')],
      comp: [R.replacement_2070_with_complementary.private, t('Employee + complementary pension fund', 'Dipendente + fondo pensione complementare')]
    };
    const go = k => { set('g-giulia', opts[k][0]); cap.textContent = opts[k][1] + t(' (gross replacement rate)', ' (tasso di sostituzione lordo)'); };
    document.querySelectorAll('[data-giulia]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-giulia]').forEach(x => x.classList.remove('on')); b.classList.add('on'); go(b.dataset.giulia);
    }));
    return () => { set('g-franco', R.replacement_private['2010']); go(document.querySelector('[data-giulia].on').dataset.giulia); };
  }

  // ------------------------------------------------------------- word cloud
  function initCloud() {
    const input = document.getElementById('cloud-in'), cloud = document.getElementById('cloud');
    let words = store.get('cloud' + SFX, {});
    const render = () => {
      const max = Math.max(1, ...Object.values(words));
      cloud.innerHTML = Object.entries(words).sort(() => Math.random() - .5).map(([w, n], i) =>
        `<span style="font-size:${0.6 + 1.6 * n / max}em;color:${PALETTE[i % PALETTE.length]}">${w.replace(/</g, '&lt;')}</span>`).join('');
    };
    input.addEventListener('keydown', e => {
      e.stopPropagation(); // keep Reveal from capturing keys while typing
      if (e.key === 'Enter' && input.value.trim()) { const w = input.value.trim().toLowerCase(); words[w] = (words[w] || 0) + 1; store.set('cloud' + SFX, words); input.value = ''; render(); }
    });
    document.getElementById('cloud-clear').addEventListener('click', () => { words = {}; store.set('cloud' + SFX, words); render(); });
    render();
  }

  // ------------------------------------------------------------- Mentimeter (students answer on their phones)
  // one link per question (Mentimeter); slides whose key has no link show no QR code
  const MENTI = {
    retire: { url: 'https://form.menti.com/s/al32t8ybhw9w',
      qr: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMyIgaGVpZ2h0PSIzMyIgY2xhc3M9InNlZ25vIj48cGF0aCBjbGFzcz0icXJsaW5lIiBzdHJva2U9IiMxNDIxM2QiIGQ9Ik0yIDIuNWg3bTIgMGgxbTQgMGgxbTEgMGg0bTIgMGg3bS0yOSAxaDFtNSAwaDFtNCAwaDFtMSAwaDVtMiAwaDFtMSAwaDFtNSAwaDFtLTI5IDFoMW0xIDBoM20xIDBoMW0xIDBoMW0zIDBoMW0xIDBoMm00IDBoMW0xIDBoMW0xIDBoM20xIDBoMW0tMjkgMWgxbTEgMGgzbTEgMGgxbTEgMGgxbTEgMGgybTQgMGgybTEgMGgxbTIgMGgxbTEgMGgzbTEgMGgxbS0yOSAxaDFtMSAwaDNtMSAwaDFtMSAwaDFtMiAwaDJtNiAwaDJtMSAwaDFtMSAwaDNtMSAwaDFtLTI5IDFoMW01IDBoMW0xIDBoMW0yIDBoMm0yIDBoNG0xIDBoMW0xIDBoMW01IDBoMW0tMjkgMWg3bTEgMGgxbTEgMGgxbTEgMGgxbTEgMGgxbTEgMGgxbTEgMGgxbTEgMGgxbTEgMGg3bS0yMSAxaDFtMSAwaDFtMSAwaDFtMyAwaDFtMiAwaDJtLTIxIDFoMW0xIDBoNW0yIDBoMm0xIDBoMW0yIDBoNW0yIDBoNW0tMjUgMWg0bTEgMGgybTEgMGgxbTEgMGgybTIgMGg3bTEgMGgxbTMgMGgxbS0yNiAxaDFtMiAwaDFtMiAwaDFtMSAwaDVtMSAwaDFtMiAwaDFtMSAwaDNtLTI0IDFoMW0xIDBoMm0yIDBoM20yIDBoMm0xIDBoMW0zIDBoMW0xIDBoM20xIDBoMW0xIDBoMW0tMjcgMWgxbTEgMGgybTEgMGgzbTIgMGgxbTIgMGgxbTIgMGgxbTcgMGgybS0yNiAxaDJtNSAwaDJtNiAwaDFtMSAwaDdtMyAwaDFtLTI5IDFoMW0zIDBoM20yIDBoMW0xIDBoMm0yIDBoMW0yIDBoMW0zIDBoMW0yIDBoMm0tMjcgMWgxbTEgMGgzbTIgMGgybTEgMGgxbTEgMGgxbTEgMGgxbTQgMGgybTMgMGgxbTIgMGgxbS0yNiAxaDFtMSAwaDFtMSAwaDFtMSAwaDJtMSAwaDFtMyAwaDFtMSAwaDFtMSAwaDFtMyAwaDFtMSAwaDJtLTI3IDFoMW0yIDBoMW00IDBoMW0xIDBoMW0xIDBoM20xIDBoNG0xIDBoNG0xIDBoMW0xIDBoMW0tMjkgMWgxbTEgMGgxbTEgMGgxM20zIDBoMW0yIDBoMW0yIDBoMW0tMjcgMWgxbTEgMGg0bTEgMGgxbTEgMGgxbTEgMGgzbTEgMGgxbTIgMGgxbTQgMGgxbTMgMGgxbS0yOCAxaDFtMSAwaDJtMiAwaDJtMiAwaDFtMyAwaDFtMSAwaDltMSAwaDNtLTIxIDFoM20xIDBoMW0zIDBoMW0zIDBoMW0zIDBoNW0tMjkgMWg3bTMgMGgybTMgMGgxbTEgMGg0bTEgMGgxbTEgMGgzbS0yNyAxaDFtNSAwaDFtMSAwaDFtMSAwaDFtMyAwaDJtMyAwaDJtMyAwaDFtLTI1IDFoMW0xIDBoM20xIDBoMW0xIDBoMm0xIDBoMm0zIDBoM20xIDBoNW0xIDBoMW0tMjcgMWgxbTEgMGgzbTEgMGgxbTEgMGgxbTEgMGgxbTEgMGgzbTEwIDBoNG0tMjkgMWgxbTEgMGgzbTEgMGgxbTEgMGgxbTIgMGgxbTIgMGgybTEgMGgzbTEgMGg3bS0yOCAxaDFtNSAwaDFtMiAwaDFtMSAwaDFtMSAwaDFtMSAwaDJtMSAwaDNtMSAwaDFtMiAwaDFtMSAwaDFtLTI4IDFoN20xIDBoMm0zIDBoMW0xIDBoM20xIDBoMW0xIDBoNG0xIDBoMSIvPjwvc3ZnPgo=' }
  };
  function initMenti() {
    document.querySelectorAll('[data-menti]').forEach(el => {
      const m = MENTI[el.dataset.menti];
      if (!m) return;
      el.innerHTML = `<img src="${m.qr}" alt="QR code"><strong>${t('Answer on your phone', 'Rispondi dal telefono')}</strong>` +
        `<a href="${m.url}" target="_blank" rel="noopener">${m.url.replace('https://', '')}</a>`;
      el.hidden = false;
    });
  }

  // ------------------------------------------------------------- footer tags: jump between sections (short decks only)
  function initSecNav() {
    const nav = document.querySelector('.sec-nav');
    if (!nav) return;
    const slides = Reveal.getSlides(), tags = [...nav.querySelectorAll('button')].map(b => ({ b, i: slides.indexOf(document.getElementById(b.dataset.sec)) }));
    const mark = () => { const h = Reveal.getState().indexh; let cur = tags[0]; tags.forEach(x => { if (x.i <= h) cur = x; }); tags.forEach(x => x.b.classList.toggle('on', x === cur)); };
    tags.forEach(({ b, i }) => b.addEventListener('click', () => { Reveal.slide(i); b.blur(); }));
    Reveal.on('slidechanged', mark); mark();
  }

  // ------------------------------------------------------------- reveal rows
  function initRows() {
    document.querySelectorAll('.reveal-row').forEach(r => r.addEventListener('click', () => r.classList.toggle('shown')));
  }

  // ------------------------------------------------------------- boot
  Reveal.initialize({ hash: true, slideNumber: 'c/t', width: 1280, height: 720, margin: 0.05, center: false,
    transition: 'slide', backgroundTransition: 'none', plugins: [RevealNotes] }).then(() => {
    // each init runs on its own, so a deck without some slides (index_it_short.html) still boots
    const safe = (f, name) => { try { return f(); } catch (e) { console.warn('skipped ' + name + ' (slide not in this deck?)', e); } };
    [[initPolls, 'polls'], [initTimelines, 'timelines'], [initChain, 'chain'], [() => initQuiz(document), 'quiz'], [initBigThree, 'bigthree'],
      [initCloud, 'cloud'], [initRows, 'rows'], [initAlex, 'alex'], [initMenti, 'menti'], [initSecNav, 'secnav']].forEach(([f, n]) => safe(f, n));
    const fillPersonas = safe(initPersonas, 'personas') || (() => {});
    const onShow = slide => {
      buildChartsIn(slide);
      if (slide.querySelector('#g-franco')) setTimeout(fillPersonas, 200);
      if (slide.querySelector('#poll-recall')) renderPollRecall();
    };
    onShow(Reveal.getCurrentSlide());
    Reveal.on('slidechanged', e => onShow(e.currentSlide));
  });
})();
